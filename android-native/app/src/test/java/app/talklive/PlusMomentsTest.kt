package app.talklive

import app.talklive.billing.PlayBilling
import app.talklive.billing.PlusPass
import app.talklive.billing.PlusPlan
import app.talklive.billing.PlusPricing
import app.talklive.engage.MomentContext
import app.talklive.engage.MomentState
import app.talklive.engage.PlusMoment
import app.talklive.engage.PlusMoments
import com.android.billingclient.api.BillingClient
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertNotNull
import org.junit.Assert.assertNull
import org.junit.Assert.assertTrue
import org.junit.Test
import java.util.Locale

/** The same cases as scripts/test-plus-moments.js: the policy must behave the same on the website and in the app. */
class PlusMomentsTest {
    private val day = PlusMoments.DAY
    private val h = 3_600_000L
    private val t0 = 1_793_000_000_000L
    private val good = MomentContext(goodCall = true, likedCount = 2, contended = true, waitedSec = 30)

    private fun veteran(now: Long): MomentState {
        var s = PlusMoments.touch(MomentState(), now - 3 * day)
        s = PlusMoments.touch(s, now - day)
        repeat(3) { s = PlusMoments.finishedCall(s, 120) }
        return s
    }

    @Test fun sessionsAndCalls() {
        var s = PlusMoments.touch(MomentState(), t0)
        assertEquals(1, s.sessions)
        s = PlusMoments.touch(s, t0 + 10 * 60_000)
        assertEquals(1, s.sessions)
        s = PlusMoments.touch(s, t0 + 2 * h)
        assertEquals(2, s.sessions)
        assertEquals(0, PlusMoments.finishedCall(MomentState(), 5).calls)
        assertEquals(1, PlusMoments.finishedCall(MomentState(), 15).calls)
    }

    @Test fun restrictions() {
        val first = PlusMoments.touch(MomentState(), t0)
        assertTrue(PlusMoments.decide(first, PlusMoment.Restrict, MomentContext(key = "gender"), t0).ok)
        var v = veteran(t0)
        repeat(5) { v = PlusMoments.shown(v, PlusMoment.Good, t0 - it * 1000L) }
        assertTrue(PlusMoments.decide(v, PlusMoment.Restrict, MomentContext(key = "gender"), t0).ok)
        assertFalse(PlusMoments.decide(veteran(t0), PlusMoment.Restrict, MomentContext(key = "gender", dismissed = setOf("restrict:gender")), t0).ok)
        assertTrue(PlusMoments.decide(veteran(t0), PlusMoment.Restrict, MomentContext(key = "countries", dismissed = setOf("restrict:gender")), t0).ok)
    }

    @Test fun neverOverACallOrToMembers() {
        for (m in PlusMoment.values()) {
            assertFalse(m.key, PlusMoments.decide(veteran(t0), m, good.copy(inCall = true, key = "x"), t0).ok)
            assertFalse(m.key, PlusMoments.decide(veteran(t0), m, good.copy(premium = true, key = "x"), t0).ok)
        }
    }

    @Test fun proactiveGating() {
        val threeCalls = PlusMoments.finishedCall(PlusMoments.finishedCall(PlusMoments.finishedCall(PlusMoments.touch(MomentState(), t0), 60), 60), 60)
        assertEquals("first-session", PlusMoments.decide(threeCalls, PlusMoment.Good, good, t0).why)
        var v = PlusMoments.touch(PlusMoments.touch(MomentState(), t0 - 2 * day), t0)
        v = PlusMoments.finishedCall(PlusMoments.finishedCall(v, 60), 60)
        assertEquals("few-calls", PlusMoments.decide(v, PlusMoment.Good, good, t0).why)
        v = PlusMoments.finishedCall(v, 60)
        assertTrue(PlusMoments.decide(v, PlusMoment.Good, good, t0).ok)
        assertEquals("not-a-good-call", PlusMoments.decide(veteran(t0), PlusMoment.Good, MomentContext(goodCall = false), t0).why)
        assertEquals("nobody-liked", PlusMoments.decide(veteran(t0), PlusMoment.Liked, MomentContext(likedCount = 0), t0).why)
        assertTrue(PlusMoments.decide(veteran(t0), PlusMoment.Liked, MomentContext(likedCount = 3), t0).ok)
        assertFalse(PlusMoments.decide(veteran(t0), PlusMoment.Search, MomentContext(contended = false, waitedSec = 60), t0).ok)
        assertFalse(PlusMoments.decide(veteran(t0), PlusMoment.Search, MomentContext(contended = true, waitedSec = 10), t0).ok)
        assertTrue(PlusMoments.decide(veteran(t0), PlusMoment.Search, MomentContext(contended = true, waitedSec = 20), t0).ok)
    }

    @Test fun frequencyCaps() {
        var v = PlusMoments.shown(veteran(t0), PlusMoment.Good, t0)
        assertEquals("day-cap", PlusMoments.decide(v, PlusMoment.Liked, good, t0 + 23 * h).why)
        assertTrue(PlusMoments.decide(v, PlusMoment.Liked, good, t0 + 25 * h).ok)
        v = PlusMoments.shown(v, PlusMoment.Liked, t0 + 25 * h)
        v = PlusMoments.shown(v, PlusMoment.Good, t0 + 50 * h)
        assertEquals("week-cap", PlusMoments.decide(v, PlusMoment.Liked, good, t0 + 75 * h).why)
        assertTrue(PlusMoments.decide(v, PlusMoment.Liked, good, t0 + 8 * day).ok)
    }

    @Test fun dismissedMomentIsNotRepeatedInTheSession() {
        assertEquals("dismissed-this-session", PlusMoments.decide(veteran(t0), PlusMoment.Liked, good.copy(dismissed = setOf("liked")), t0).why)
    }

    @Test fun passOfferNeedsTwoDismissalsThenCoolsDown() {
        var v = veteran(t0)
        assertEquals("subscription-not-dismissed-twice", PlusMoments.decide(v, PlusMoment.Pass, MomentContext(), t0).why)
        v = PlusMoments.dismissed(v, PlusMoment.Good)
        assertFalse(PlusMoments.decide(v, PlusMoment.Pass, MomentContext(), t0).ok)
        v = PlusMoments.dismissed(v, PlusMoment.Restrict)
        assertTrue(PlusMoments.decide(v, PlusMoment.Pass, MomentContext(), t0).ok)
        v = PlusMoments.shown(v, PlusMoment.Pass, t0)
        assertEquals(0, v.subDismiss)
        assertEquals(t0, v.lastPassAt)
        v = PlusMoments.dismissed(PlusMoments.dismissed(v, PlusMoment.Liked), PlusMoment.Liked)
        assertFalse(PlusMoments.decide(v, PlusMoment.Pass, MomentContext(), t0 + 3 * day + 2 * h).ok)
        assertEquals(0, PlusMoments.dismissed(MomentState(), PlusMoment.Pass).subDismiss)
        assertTrue(PlusMoments.decide(v, PlusMoment.Pass, MomentContext(), t0 + 15 * day).ok)
    }

    @Test fun bestPrefersGoodThenLikedThenPass() {
        assertEquals(PlusMoment.Good, PlusMoments.best(veteran(t0), { good }, t0))
        assertEquals(PlusMoment.Liked, PlusMoments.best(veteran(t0), { good.copy(goodCall = false) }, t0, listOf(PlusMoment.Good, PlusMoment.Liked, PlusMoment.Pass)))
        assertNull(PlusMoments.best(veteran(t0), { MomentContext() }, t0))
    }

    @Test fun stateSurvivesStorage() {
        val s = PlusMoments.shown(PlusMoments.dismissed(veteran(t0), PlusMoment.Good), PlusMoment.Good, t0)
        assertEquals(s, MomentState.decode(s.encode()))
        assertEquals(MomentState(), MomentState.decode(null))
        assertEquals(MomentState(), MomentState.decode("junk"))
    }

    @Test fun eventNamesMatchTheServer() {
        // server/plus-moments.js: plus_app_<moment>_<view|dismiss|tap>
        assertEquals("plus_app_restrict_view", PlusMoments.eventName(PlusMoment.Restrict, "view"))
        assertEquals("plus_app_pass_tap", PlusMoments.eventName(PlusMoment.Pass, "tap"))
    }

    // ---- honest price anchors (same rules as server/pricing.js compareAt) ----
    private fun plan(id: String, period: String, micros: Long, cur: String = "USD") = PlusPlan(id, "", period, "", null, micros, cur)
    private fun pass(days: Int, micros: Long, cur: String = "USD") = PlusPass("pass_${days}d", days, "", micros, cur)

    @Test fun yearlyAnchorIsTwelveMonths() {
        val monthly = plan("m", "P1M", 9_990_000)
        val yearly = plan("y", "P1Y", 69_990_000)
        val a = PlusPricing.yearlyAnchor(listOf(monthly, yearly), yearly)!!
        assertEquals(119_880_000L, a.compareMicros)
        assertEquals(42, a.savePercent)
        assertNull("no anchor without a monthly plan in the same currency", PlusPricing.yearlyAnchor(listOf(yearly), yearly))
        assertNull(PlusPricing.yearlyAnchor(listOf(plan("m", "P1M", 9_990_000, "EUR"), yearly), yearly))
        assertNull("no anchor on the monthly plan", PlusPricing.yearlyAnchor(listOf(monthly, yearly), monthly))
    }

    @Test fun anchorOnlyWhenReallyHigher() {
        val monthly = plan("m", "P1M", 5_000_000)
        val yearly = plan("y", "P1Y", 70_000_000) // dearer than twelve months: nothing to strike through
        assertNull(PlusPricing.yearlyAnchor(listOf(monthly, yearly), yearly))
        val passes = listOf(pass(1, 1_990_000), pass(7, 13_990_000))
        assertNull("a 7-day pass dearer than seven 1-day passes has no anchor", PlusPricing.passAnchor(passes, passes[1]))
    }

    @Test fun passAnchorsAreOneDayPasses() {
        val passes = listOf(pass(1, 1_990_000), pass(7, 4_990_000), pass(15, 6_990_000))
        assertNull("no anchor on the 1-day pass", PlusPricing.passAnchor(passes, passes[0]))
        val seven = PlusPricing.passAnchor(passes, passes[1])!!
        assertEquals(13_930_000L, seven.compareMicros)
        assertEquals(64, seven.savePercent)
        assertEquals(77, PlusPricing.passAnchor(passes, passes[2])!!.savePercent)
        assertNull("different currency", PlusPricing.passAnchor(listOf(pass(1, 1_990_000, "EUR"), passes[1]), passes[1]))
    }

    @Test fun moneyIsFormattedForTheCurrency() {
        assertEquals("¥19,200", PlusPricing.format(19_200_000_000L, "JPY", Locale.JAPAN).replace('￥', '¥'))
        assertTrue(PlusPricing.format(119_880_000L, "USD", Locale.US) == "$119.88")
        assertEquals("$120", PlusPricing.format(120_000_000L, "USD", Locale.US))
    }

    @Test fun introOfferIsShownOnlyWhenPlayGivesOne() {
        val regular = PlusPricing.Phase("$9.99", 9_990_000, "P1M", 0, true)
        assertNull(PlusPricing.intro(listOf(regular)))
        val trial = PlusPricing.intro(listOf(PlusPricing.Phase("Free", 0, "P7D", 1, false), regular))!!
        assertTrue(trial.free)
        assertEquals(7, PlayBilling.periodDays(trial.period) * trial.cycles)
        val intro = PlusPricing.intro(listOf(PlusPricing.Phase("$0.99", 990_000, "P1M", 1, false), regular))!!
        assertFalse(intro.free)
        assertEquals("$0.99", intro.price)
        assertNotNull(PlusPricing.intro(listOf(PlusPricing.Phase("$0.99", 990_000, "P1M", 3, false), regular)))
    }

    @Test fun billingResponsesGetHonestMessages() {
        val c = BillingClient.BillingResponseCode
        assertEquals(app.talklive.billing.PlayMessage.BillingUnavailable, PlayBilling.messageFor(c.BILLING_UNAVAILABLE))
        assertEquals(app.talklive.billing.PlayMessage.BillingUnavailable, PlayBilling.messageFor(c.SERVICE_DISCONNECTED))
        assertEquals(app.talklive.billing.PlayMessage.BillingUnavailable, PlayBilling.messageFor(c.NETWORK_ERROR))
        assertEquals(app.talklive.billing.PlayMessage.AlreadyOwned, PlayBilling.messageFor(c.ITEM_ALREADY_OWNED))
        assertEquals(app.talklive.billing.PlayMessage.ItemUnavailable, PlayBilling.messageFor(c.ITEM_UNAVAILABLE))
        assertEquals(app.talklive.billing.PlayMessage.Failed, PlayBilling.messageFor(c.DEVELOPER_ERROR))
        assertEquals(app.talklive.billing.PlayMessage.Failed, PlayBilling.messageFor(c.ERROR))
    }
}

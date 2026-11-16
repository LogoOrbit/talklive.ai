package app.talklive.billing

import java.text.NumberFormat
import java.util.Currency
import java.util.Locale

/** A struck-through "compare at" amount and the saving it stands for. */
data class Anchor(val compareMicros: Long, val currency: String, val savePercent: Int)

/**
 * Honest price anchors, computed from real prices in one currency (Google Play's
 * [PlusPlan] / [PlusPass] micros, or the fallback table), never invented:
 *  - yearly plan: twelve months at the monthly price
 *  - 7 and 15 day passes: the same days bought as 1-day passes
 *  - the 1-day pass and the monthly plan have none
 * An anchor exists only when it is really higher than the price.
 * Same rules as server/pricing.js compareAt.
 */
object PlusPricing {
    fun anchor(priceMicros: Long, compareMicros: Long, currency: String): Anchor? {
        if (priceMicros <= 0 || compareMicros <= priceMicros || currency.isBlank()) return null
        val save = Math.round(100.0 - priceMicros * 100.0 / compareMicros).toInt()
        return if (save in 1..99) Anchor(compareMicros, currency, save) else null
    }

    /** The yearly plan against twelve of the monthly plan, when Play lists both in one currency. */
    fun yearlyAnchor(plans: List<PlusPlan>, yearly: PlusPlan): Anchor? {
        if (PlayBilling.periodDays(yearly.period) < 360) return null
        val monthly = plans.firstOrNull { PlayBilling.periodDays(it.period) in 28..31 && it.currency == yearly.currency } ?: return null
        return anchor(yearly.priceMicros, monthly.priceMicros * 12, yearly.currency)
    }

    /** A 7 or 15 day pass against the same days as 1-day passes, in the same currency. */
    fun passAnchor(passes: List<PlusPass>, pass: PlusPass): Anchor? {
        if (pass.days <= 1) return null
        val one = passes.firstOrNull { it.days == 1 && it.currency == pass.currency } ?: return null
        return anchor(pass.priceMicros, one.priceMicros * pass.days, pass.currency)
    }

    /** Money in the device's own locale and the price's currency: symbol, grouping and decimals right (yen has none). */
    fun format(micros: Long, currency: String, locale: Locale = Locale.getDefault()): String {
        val amount = micros / 1_000_000.0
        return try {
            NumberFormat.getCurrencyInstance(locale).apply {
                this.currency = Currency.getInstance(currency)
                if (amount % 1.0 == 0.0) { minimumFractionDigits = 0; maximumFractionDigits = 0 }
            }.format(amount)
        } catch (_: IllegalArgumentException) {
            "$currency ${"%.2f".format(Locale.ROOT, amount)}"
        }
    }

    /** One pricing phase of a Google Play offer, simplified. */
    data class Phase(val formatted: String, val micros: Long, val period: String, val cycles: Int, val recurring: Boolean)

    /**
     * The introductory part of an offer, if Play gave one: any non-recurring phase before the
     * regular price (a free trial is micros == 0). Null when the offer is just the base price.
     */
    fun intro(phases: List<Phase>): PlusIntro? {
        val first = phases.firstOrNull { !it.recurring } ?: return null
        val regular = phases.lastOrNull { it.recurring } ?: return null
        if (first.micros >= regular.micros && first.micros != 0L) return null
        return PlusIntro(first.formatted, first.micros, first.period, first.cycles.coerceAtLeast(1))
    }
}

/** An introductory price (or free trial) that applies for [cycles] periods of [period], then the regular price. */
data class PlusIntro(val price: String, val priceMicros: Long, val period: String, val cycles: Int) {
    val free: Boolean get() = priceMicros == 0L
}

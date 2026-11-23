package app.talklive

import app.talklive.ui.badges.hoursLeftText
import app.talklive.ui.badges.hoursText
import org.junit.Assert.assertEquals
import org.junit.Test

/** Spec 10: whole hours rounded down ("12h"), minutes under an hour ("40m"), never "1.0h". */
class HoursTextTest {
    @Test fun wholeHoursFloor() {
        assertEquals("12h", hoursText(12.9))
        assertEquals("1h", hoursText(1.0))
        assertEquals("1h", hoursText(1.99))
    }

    @Test fun underAnHourShowsMinutes() {
        assertEquals("40m", hoursText(40.0 / 60))
        assertEquals("0m", hoursText(0.0))
        assertEquals("59m", hoursText(59.5 / 60))
    }

    @Test fun leftToEarn() {
        assertEquals("3h", hoursLeftText(10, 7.2))
        assertEquals("30m", hoursLeftText(10, 9.5))
    }
}

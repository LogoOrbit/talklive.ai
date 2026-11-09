package app.talklive.data

import android.content.Context
import java.util.Calendar

/**
 * The date of birth asked once on this phone, before anything else. Under 18
 * is refused and remembered, so trying another date does not get round it.
 */
object AgeGate {
    private const val PREFS = "consent"

    fun dob(context: Context): String? = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString("dob", null)

    fun blocked(context: Context): Boolean = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getBoolean("underage", false)

    /** Saves the date and returns true when the person is 18 or over. */
    /** The server said this person is under 18 (Google sign-up). */
    fun block(context: Context) = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit().putBoolean("underage", true).apply()

    fun submit(context: Context, year: Int, month: Int, day: Int): Boolean {
        val ok = age(year, month, day) >= 18
        val p = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit()
        if (ok) p.putString("dob", "%04d-%02d-%02d".format(year, month, day)).putBoolean("adult_terms", true)
        else p.putBoolean("underage", true)
        p.apply()
        return ok
    }

    fun age(year: Int, month: Int, day: Int): Int {
        val now = Calendar.getInstance()
        var a = now.get(Calendar.YEAR) - year
        val m = now.get(Calendar.MONTH) + 1
        if (m < month || (m == month && now.get(Calendar.DAY_OF_MONTH) < day)) a--
        return a
    }

    /** The audience age band the server uses, from the saved date. */
    fun ageGroup(context: Context): String {
        val d = dob(context)?.split("-")?.mapNotNull { it.toIntOrNull() } ?: return "unspecified"
        if (d.size != 3) return "unspecified"
        val a = age(d[0], d[1], d[2])
        return when {
            a < 18 -> "unspecified"
            a <= 24 -> "18-24"
            a <= 34 -> "25-34"
            a <= 44 -> "35-44"
            a <= 54 -> "45-54"
            else -> "55+"
        }
    }
}

package app.talklive.billing

import android.content.Context
import android.telephony.TelephonyManager
import java.text.NumberFormat
import java.util.Currency
import java.util.Locale
import kotlin.math.ceil
import kotlin.math.log10
import kotlin.math.pow

/**
 * Prices in the person's own currency while Google Play cannot show its own
 * (Play's prices are already local when it can). The country comes from the
 * SIM or network, then the phone's region; amounts are approximate conversions
 * of the US price, rounded to a natural price point (PKR 2,799, ₹839, €9.99).
 */
object LocalPrice {
    // US dollar -> local, approximate. Currencies not listed stay in dollars.
    private val RATES = mapOf(
        "PKR" to 280.0, "INR" to 84.0, "BDT" to 120.0, "NPR" to 134.0, "LKR" to 300.0,
        "IDR" to 16000.0, "PHP" to 58.0, "VND" to 25000.0, "THB" to 35.0, "MYR" to 4.5,
        "SGD" to 1.34, "HKD" to 7.8, "TWD" to 32.0, "JPY" to 152.0, "KRW" to 1380.0, "CNY" to 7.2,
        "EUR" to 0.92, "GBP" to 0.78, "CHF" to 0.88, "SEK" to 10.5, "NOK" to 10.8, "DKK" to 6.9,
        "PLN" to 4.0, "CZK" to 23.0, "HUF" to 365.0, "RON" to 4.6, "TRY" to 34.0, "UAH" to 41.0, "RUB" to 95.0,
        "CAD" to 1.38, "AUD" to 1.52, "NZD" to 1.66, "MXN" to 19.0, "BRL" to 5.6, "COP" to 4200.0,
        "CLP" to 950.0, "PEN" to 3.75, "NGN" to 1600.0, "KES" to 129.0, "ZAR" to 18.0, "GHS" to 15.5,
        "EGP" to 49.0, "MAD" to 10.0, "DZD" to 134.0, "SAR" to 3.75, "AED" to 3.67, "QAR" to 3.64,
        "KWD" to 0.31, "JOD" to 0.71, "IQD" to 1310.0, "ILS" to 3.7,
    )

    @Volatile private var cachedCountry: String? = null

    private fun country(context: Context?): String {
        cachedCountry?.let { return it }
        val tm = context?.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
        val c = listOf(runCatching { tm?.simCountryIso }.getOrNull(), runCatching { tm?.networkCountryIso }.getOrNull(), Locale.getDefault().country)
            .firstOrNull { !it.isNullOrBlank() }?.uppercase().orEmpty()
        cachedCountry = c
        return c
    }

    /** The currency people in this phone's country pay in, if we convert to it. */
    fun currency(context: Context?): String {
        val code = runCatching { Currency.getInstance(Locale("", country(context))).currencyCode }.getOrNull()
        return if (code != null && code in RATES) code else "USD"
    }

    /** A US-dollar price in local money: (amount, currency). */
    fun amount(context: Context?, usd: Double): Pair<Double, String> {
        val cur = currency(context)
        return if (cur == "USD") usd to "USD" else nice(usd * (RATES[cur] ?: 1.0), cur) to cur
    }

    /** A US-dollar price shown in local money, e.g. 10.0 -> "PKR 2,799". */
    fun of(context: Context?, usd: Double): String = amount(context, usd).let { (a, c) -> format(a, c) }

    /** A pass priced locally, for when Play cannot list its own. */
    fun pass(context: Context?, id: String, days: Int, usd: Double): PlusPass =
        amount(context, usd).let { (a, c) -> PlusPass(id, days, format(a, c), (a * 1_000_000).toLong(), c) }

    /** Rounds up to a natural price point: 9.2 -> 9.99, 2800 -> 2,799, 839.4 -> 839. */
    private fun nice(amount: Double, cur: String): Double {
        val decimals = runCatching { Currency.getInstance(cur).defaultFractionDigits }.getOrDefault(2)
        if (decimals > 0 && amount < 100) return ceil(amount) - 0.01
        val step = 10.0.pow(maxOf(0.0, ceil(log10(amount)) - 2))
        val up = ceil(amount / step) * step
        return if (up >= 100) up - 1 else up
    }

    /** "$10", "PKR 2,799", "€9.99": the code in front for anything but dollars. */
    fun format(amount: Double, cur: String, decimals: Int? = null): String {
        val fd = decimals ?: if (amount % 1.0 == 0.0) 0 else 2
        val nf = NumberFormat.getNumberInstance(Locale.getDefault()).apply {
            minimumFractionDigits = fd; maximumFractionDigits = fd
        }
        return if (cur == "USD") "$" + nf.format(amount) else "$cur ${nf.format(amount)}"
    }
}

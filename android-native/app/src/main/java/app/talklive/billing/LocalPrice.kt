package app.talklive.billing

import android.content.Context
import android.telephony.TelephonyManager
import java.text.NumberFormat
import java.util.Locale

/**
 * Plus prices for the person's country, shown while Google Play cannot list
 * its own (Play's prices are already local when it can). The same table the
 * website and Stripe use: server/pricing-table.json. Prices are set for each
 * market, not converted from dollars. The country comes from the SIM or
 * network, then the phone's region.
 */
object LocalPrice {
    private class P(val currency: String, val monthly: Double, val d1: Double, val d7: Double, val d15: Double, val yearly: Double)

    // Generated from server/pricing-table.json - edit there, then copy the row here by hand. The last
    // number is the yearly price, server/pricing.js yearlyPrice() (12 months for the price of 7).
    private val TABLE = mapOf(
        "AE" to P("AED", 35.0, 7.0, 18.0, 25.0, 250.0),
        "AF" to P("AFN", 149.0, 25.0, 69.0, 99.0, 1049.0),
        "AT" to P("EUR", 9.99, 1.99, 4.99, 6.99, 69.99),
        "AU" to P("AUD", 14.99, 2.99, 7.49, 10.49, 104.99),
        "BD" to P("BDT", 299.0, 49.0, 119.0, 179.0, 2099.0),
        "BE" to P("EUR", 9.99, 1.99, 4.99, 6.99, 69.99),
        "BR" to P("BRL", 19.9, 3.9, 9.9, 14.9, 139.9),
        "CA" to P("CAD", 12.99, 2.49, 6.49, 8.99, 90.99),
        "CH" to P("CHF", 9.9, 1.9, 4.9, 6.9, 69.9),
        "CL" to P("CLP", 4490.0, 890.0, 2290.0, 3290.0, 31490.0),
        "CN" to P("CNY", 35.0, 6.0, 18.0, 25.0, 250.0),
        "CO" to P("COP", 19900.0, 3900.0, 9900.0, 14900.0, 139900.0),
        "CY" to P("EUR", 9.99, 1.99, 4.99, 6.99, 69.99),
        "CZ" to P("CZK", 119.0, 25.0, 59.0, 85.0, 839.0),
        "DE" to P("EUR", 9.99, 1.99, 4.99, 6.99, 69.99),
        "DK" to P("DKK", 69.0, 13.0, 35.0, 49.0, 489.0),
        "DZ" to P("DZD", 399.0, 59.0, 179.0, 269.0, 2799.0),
        "EE" to P("EUR", 9.99, 1.99, 4.99, 6.99, 69.99),
        "EG" to P("EGP", 99.0, 15.0, 45.0, 69.0, 699.0),
        "ES" to P("EUR", 9.99, 1.99, 4.99, 6.99, 69.99),
        "FI" to P("EUR", 9.99, 1.99, 4.99, 6.99, 69.99),
        "FR" to P("EUR", 9.99, 1.99, 4.99, 6.99, 69.99),
        "GB" to P("GBP", 7.99, 1.49, 3.99, 5.49, 55.99),
        "GH" to P("GHS", 35.0, 5.0, 15.0, 25.0, 250.0),
        "GR" to P("EUR", 9.99, 1.99, 4.99, 6.99, 69.99),
        "HK" to P("HKD", 78.0, 15.0, 38.0, 55.0, 550.0),
        "HR" to P("EUR", 9.99, 1.99, 4.99, 6.99, 69.99),
        "HU" to P("HUF", 1790.0, 350.0, 890.0, 1290.0, 12590.0),
        "ID" to P("IDR", 35000.0, 5000.0, 15000.0, 25000.0, 245000.0),
        "IE" to P("EUR", 9.99, 1.99, 4.99, 6.99, 69.99),
        "IL" to P("ILS", 35.0, 7.0, 18.0, 25.0, 250.0),
        "IN" to P("INR", 199.0, 39.0, 99.0, 139.0, 1399.0),
        "IQ" to P("IQD", 3500.0, 500.0, 1500.0, 2500.0, 24500.0),
        "IT" to P("EUR", 9.99, 1.99, 4.99, 6.99, 69.99),
        "JP" to P("JPY", 1480.0, 300.0, 750.0, 1050.0, 10400.0),
        "KE" to P("KES", 299.0, 49.0, 129.0, 199.0, 2099.0),
        "KR" to P("KRW", 12900.0, 2500.0, 6500.0, 8900.0, 90900.0),
        "KW" to P("KWD", 2.9, 0.6, 1.5, 2.1, 20.9),
        "LK" to P("LKR", 699.0, 99.0, 299.0, 449.0, 4899.0),
        "LT" to P("EUR", 9.99, 1.99, 4.99, 6.99, 69.99),
        "LU" to P("EUR", 9.99, 1.99, 4.99, 6.99, 69.99),
        "LV" to P("EUR", 9.99, 1.99, 4.99, 6.99, 69.99),
        "MA" to P("MAD", 29.0, 5.0, 13.0, 19.0, 209.0),
        "MT" to P("EUR", 9.99, 1.99, 4.99, 6.99, 69.99),
        "MX" to P("MXN", 89.0, 19.0, 45.0, 65.0, 629.0),
        "MY" to P("MYR", 19.9, 3.9, 9.9, 14.9, 139.9),
        "NG" to P("NGN", 2900.0, 450.0, 1300.0, 1900.0, 20900.0),
        "NL" to P("EUR", 9.99, 1.99, 4.99, 6.99, 69.99),
        "NO" to P("NOK", 99.0, 19.0, 49.0, 69.0, 699.0),
        "NP" to P("NPR", 299.0, 39.0, 129.0, 199.0, 2099.0),
        "NZ" to P("NZD", 15.99, 2.99, 7.99, 10.99, 111.99),
        "PE" to P("PEN", 17.9, 3.5, 8.9, 12.9, 125.9),
        "PH" to P("PHP", 129.0, 19.0, 59.0, 89.0, 909.0),
        "PK" to P("PKR", 599.0, 100.0, 249.0, 399.0, 4199.0),
        "PL" to P("PLN", 19.99, 3.99, 9.99, 14.99, 139.99),
        "PT" to P("EUR", 9.99, 1.99, 4.99, 6.99, 69.99),
        "QA" to P("QAR", 35.0, 7.0, 18.0, 25.0, 250.0),
        "RO" to P("RON", 22.99, 4.49, 11.99, 16.99, 160.99),
        "RU" to P("RUB", 449.0, 89.0, 229.0, 329.0, 3149.0),
        "SA" to P("SAR", 35.0, 7.0, 18.0, 25.0, 250.0),
        "SE" to P("SEK", 99.0, 19.0, 49.0, 69.0, 699.0),
        "SG" to P("SGD", 12.9, 2.5, 6.5, 8.9, 90.9),
        "SI" to P("EUR", 9.99, 1.99, 4.99, 6.99, 69.99),
        "SK" to P("EUR", 9.99, 1.99, 4.99, 6.99, 69.99),
        "TH" to P("THB", 159.0, 29.0, 79.0, 119.0, 1119.0),
        "TR" to P("TRY", 149.0, 29.0, 79.0, 109.0, 1049.0),
        "TW" to P("TWD", 290.0, 59.0, 149.0, 209.0, 2090.0),
        "UA" to P("UAH", 199.0, 39.0, 99.0, 149.0, 1399.0),
        "UG" to P("UGX", 7900.0, 1200.0, 3500.0, 5500.0, 55900.0),
        "US" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "VN" to P("VND", 59000.0, 9000.0, 25000.0, 39000.0, 419000.0),
        "ZA" to P("ZAR", 89.0, 17.0, 45.0, 65.0, 629.0),
    )
    private val LOW = setOf("IR", "ET", "TZ", "SD", "YE", "SY", "MM", "KH", "LA", "ZM", "ZW", "MW", "RW", "CM", "SN", "CI", "ML", "BF", "NE", "TD", "SO", "MZ", "MG", "BJ", "TG", "HT", "BO", "HN", "NI", "VE", "UZ", "KG", "TJ", "TM", "AZ", "GE", "AM", "MD", "BY", "TN", "LY", "LB", "JO", "PS", "CU")
    private val DEFAULT = P("USD", 9.99, 1.99, 4.99, 6.99, 69.99)
    private val LOW_PRICE = P("USD", 1.99, 0.29, 0.99, 1.49, 13.99)

    @Volatile private var cachedCountry: String? = null

    private fun country(context: Context?): String {
        cachedCountry?.let { return it }
        val tm = context?.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
        val c = listOf(runCatching { tm?.simCountryIso }.getOrNull(), runCatching { tm?.networkCountryIso }.getOrNull(), Locale.getDefault().country)
            .firstOrNull { !it.isNullOrBlank() }?.uppercase().orEmpty()
        cachedCountry = c
        return c
    }

    private fun row(context: Context?): P = country(context).let { TABLE[it] ?: if (it in LOW) LOW_PRICE else DEFAULT }

    /** The currency prices are shown in for this phone's country. */
    fun currency(context: Context?): String = row(context).currency

    /**
     * The local price for one of the US list prices: 10 is the monthly plan,
     * and 2, 5 and 7 are the 1, 7 and 15-day passes.
     */
    fun amount(context: Context?, usd: Double): Pair<Double, String> {
        val r = row(context)
        val a = when {
            usd >= 8.0 -> r.monthly
            usd >= 6.0 -> r.d15
            usd >= 4.0 -> r.d7
            else -> r.d1
        }
        return a to r.currency
    }

    /** The yearly Plus price for this phone's country, with its currency. */
    fun yearly(context: Context?): Pair<Double, String> = row(context).let { it.yearly to it.currency }

    /** The yearly price in local money, e.g. "PKR 4,199". */
    fun yearlyLabel(context: Context?): String = yearly(context).let { (a, c) -> format(a, c) }

    /** What a year costs per month, e.g. "$5.83": whole units once large, as the website shows it. */
    fun perMonth(yearly: Double, cur: String): String {
        val m = yearly / 12
        return format(if (m >= 100) Math.round(m).toDouble() else Math.round(m * 100) / 100.0, cur)
    }

    /**
     * What [total] comes to for each of [days] days, from the real amount: "$0.33", or whole
     * units once it is large ("IDR 1,167"). Yearly is 365 days, monthly 30, a pass its days.
     */
    fun perDay(total: Double, days: Int, cur: String): String {
        val d = total / days.coerceAtLeast(1)
        return if (d >= 100) format(Math.round(d).toDouble(), cur, 0) else format(Math.round(d * 100) / 100.0, cur, 2)
    }

    /** Days a plan's billing period is priced over for the per-day figure. */
    fun planDays(periodDays: Int): Int = if (periodDays >= 360) 365 else 30

    /** Percent saved by the yearly plan against twelve months, e.g. 42. */
    fun yearlySavePercent(context: Context?): Int = row(context).let { Math.round(100 - it.yearly * 100 / (it.monthly * 12)).toInt() }

    /** A list price shown in local money, e.g. 10.0 -> "PKR 599". */
    fun of(context: Context?, usd: Double): String = amount(context, usd).let { (a, c) -> format(a, c) }

    /** A pass priced locally, for when Play cannot list its own. */
    fun pass(context: Context?, id: String, days: Int, usd: Double): PlusPass =
        amount(context, usd).let { (a, c) -> PlusPass(id, days, format(a, c), (a * 1_000_000).toLong(), c) }

    /** "$9.99", "PKR 599", "EUR 9.99": the code in front for anything but dollars. */
    fun format(amount: Double, cur: String, decimals: Int? = null): String {
        val fd = decimals ?: if (amount % 1.0 == 0.0) 0 else 2
        val nf = NumberFormat.getNumberInstance(Locale.getDefault()).apply {
            minimumFractionDigits = fd; maximumFractionDigits = fd
        }
        return if (cur == "USD") "$" + nf.format(amount) else "$cur ${nf.format(amount)}"
    }
}

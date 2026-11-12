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
        "AE" to P("AED", 35.0, 7.29, 17.99, 25.99, 250.0),
        "AG" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "AL" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "AM" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "AO" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "AR" to P("ARS", 7700.0, 3050.0, 7700.0, 10800.0, 54100.0),
        "AT" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "AU" to P("AUD", 14.99, 2.89, 7.49, 9.99, 104.99),
        "AW" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "AZ" to P("AZN", 16.99, 3.39, 8.49, 11.99, 119.99),
        "BA" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "BD" to P("BDT", 299.0, 250.0, 600.0, 850.0, 2099.0),
        "BE" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "BF" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "BG" to P("EUR", 4.49, 1.79, 4.49, 6.49, 31.99),
        "BH" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "BJ" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "BM" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "BO" to P("BOB", 114.99, 22.99, 57.99, 81.99, 819.99),
        "BR" to P("BRL", 27.99, 10.99, 27.99, 38.99, 194.99),
        "BS" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "BW" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "BY" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "BZ" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "CA" to P("CAD", 13.99, 2.79, 6.99, 9.99, 99.99),
        "CD" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "CF" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "CG" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "CH" to P("CHF", 8.3, 1.7, 4.1, 5.8, 60.0),
        "CI" to P("XOF", 5900.0, 1200.0, 3000.0, 4100.0, 41400.0),
        "CL" to P("CLP", 4900.0, 2000.0, 4900.0, 6900.0, 34400.0),
        "CM" to P("XAF", 5900.0, 1200.0, 3000.0, 4100.0, 41400.0),
        "CO" to P("COP", 16500.0, 6500.0, 16500.0, 23000.0, 115000.0),
        "CR" to P("CRC", 4500.0, 890.0, 2200.0, 3100.0, 31400.0),
        "CV" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "CY" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "CZ" to P("CZK", 109.99, 43.99, 109.99, 149.99, 749.99),
        "DE" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "DJ" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "DK" to P("DKK", 69.0, 13.0, 34.0, 47.0, 469.0),
        "DM" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "DO" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "DZ" to P("DZD", 350.0, 275.0, 675.0, 950.0, 2400.0),
        "EC" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "EE" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "EG" to P("EGP", 129.99, 109.99, 269.99, 369.99, 939.99),
        "ER" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "ES" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "ET" to P("ETB", 400.0, 300.0, 800.0, 1150.0, 2800.0),
        "FI" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "FJ" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "FM" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "FR" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "GA" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "GB" to P("GBP", 7.99, 1.49, 3.79, 5.49, 55.99),
        "GD" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "GE" to P("GEL", 24.0, 5.0, 14.0, 19.0, 174.0),
        "GH" to P("GHS", 30.0, 25.0, 60.0, 80.0, 200.0),
        "GI" to P("GBP", 7.49, 1.49, 3.79, 5.49, 52.99),
        "GM" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "GN" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "GR" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "GT" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "GW" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "HK" to P("HKD", 78.0, 15.0, 39.9, 55.9, 549.0),
        "HN" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "HR" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "HT" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "HU" to P("HUF", 1599.0, 690.0, 1599.0, 2299.0, 11499.0),
        "ID" to P("IDR", 45000.0, 36000.0, 91000.0, 129000.0, 319000.0),
        "IE" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "IL" to P("ILS", 31.9, 6.3, 15.9, 22.0, 225.0),
        "IN" to P("INR", 199.0, 190.0, 470.0, 650.0, 1399.0),
        "IQ" to P("IQD", 3750.0, 3000.0, 7550.0, 10550.0, 26400.0),
        "IS" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "IT" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "JM" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "JO" to P("JOD", 7.1, 1.4, 3.55, 4.95, 49.6),
        "JP" to P("JPY", 1600.0, 320.0, 800.0, 1120.0, 11200.0),
        "KE" to P("KES", 300.0, 300.0, 600.0, 900.0, 2300.0),
        "KG" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "KH" to P("USD", 2.49, 1.99, 4.99, 6.99, 17.99),
        "KM" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "KN" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "KR" to P("KRW", 13000.0, 2700.0, 6500.0, 9500.0, 95000.0),
        "KW" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "KY" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "KZ" to P("KZT", 2190.0, 890.0, 2190.0, 3090.0, 15990.0),
        "LA" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "LB" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "LC" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "LI" to P("CHF", 8.3, 1.7, 4.1, 5.8, 60.0),
        "LK" to P("LKR", 825.0, 650.0, 1650.0, 2325.0, 5825.0),
        "LR" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "LT" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "LU" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "LV" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "LY" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "MA" to P("MAD", 24.99, 19.99, 48.99, 68.99, 169.99),
        "MC" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "MD" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "MK" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "ML" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "MM" to P("MMK", 5000.0, 4000.0, 10000.0, 15000.0, 37000.0),
        "MN" to P("MNT", 36000.0, 7170.0, 18000.0, 25200.0, 252000.0),
        "MO" to P("MOP", 80.88, 15.99, 39.99, 56.88, 568.0),
        "MT" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "MU" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "MV" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "MX" to P("MXN", 95.0, 37.0, 95.0, 129.0, 649.0),
        "MY" to P("MYR", 19.99, 7.99, 19.99, 27.99, 144.99),
        "MZ" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "NA" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "NE" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "NG" to P("NGN", 3370.0, 2690.0, 6740.0, 9430.0, 23500.0),
        "NI" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "NL" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "NO" to P("NOK", 95.0, 19.0, 48.0, 65.0, 669.0),
        "NP" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "NZ" to P("NZD", 17.99, 3.59, 8.99, 12.99, 124.99),
        "OM" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "PA" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "PE" to P("PEN", 16.99, 6.99, 16.99, 23.99, 119.99),
        "PG" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "PH" to P("PHP", 159.0, 125.0, 315.0, 440.0, 1100.0),
        "PK" to P("PKR", 599.0, 100.0, 249.0, 399.0, 4199.0),
        "PL" to P("PLN", 19.99, 7.89, 19.99, 27.99, 139.99),
        "PT" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "PY" to P("PYG", 60000.0, 10000.0, 30000.0, 40000.0, 425000.0),
        "QA" to P("QAR", 36.0, 7.0, 18.0, 25.0, 255.0),
        "RO" to P("RON", 23.99, 9.49, 23.99, 33.99, 169.99),
        "RS" to P("RSD", 549.0, 199.0, 549.0, 749.0, 3699.0),
        "RU" to P("RUB", 799.0, 169.0, 419.0, 590.0, 5799.0),
        "RW" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "SA" to P("SAR", 36.99, 7.49, 18.99, 25.99, 264.99),
        "SB" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "SC" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "SE" to P("SEK", 99.0, 20.0, 49.0, 69.0, 699.0),
        "SG" to P("SGD", 12.98, 2.49, 6.48, 8.98, 89.98),
        "SI" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "SK" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "SL" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "SM" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "SN" to P("XOF", 5900.0, 1200.0, 3000.0, 4100.0, 41400.0),
        "SO" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "SR" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "SV" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "TC" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "TD" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "TG" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "TH" to P("THB", 175.0, 67.0, 175.0, 225.0, 1175.0),
        "TJ" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "TM" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "TN" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "TO" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "TR" to P("TRY", 249.99, 99.99, 249.99, 349.99, 1759.99),
        "TT" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "TW" to P("TWD", 330.0, 65.0, 160.0, 230.0, 2300.0),
        "TZ" to P("TZS", 6500.0, 5500.0, 13000.0, 18000.0, 46000.0),
        "UA" to P("UAH", 224.99, 89.99, 224.99, 314.99, 1599.99),
        "UG" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "US" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "UY" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "UZ" to P("UZS", 29880.0, 23810.0, 59700.0, 83630.0, 209400.0),
        "VA" to P("EUR", 9.99, 1.79, 4.49, 6.49, 69.99),
        "VE" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "VG" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "VN" to P("VND", 64000.0, 51000.0, 128000.0, 179000.0, 449000.0),
        "VU" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "WS" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "YE" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "ZA" to P("ZAR", 82.99, 32.99, 82.99, 114.99, 579.99),
        "ZM" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
        "ZW" to P("USD", 9.99, 1.99, 4.99, 6.99, 69.99),
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

package app.talklive.billing

import android.app.Activity
import android.content.Context
import app.talklive.data.IdentityStore
import app.talklive.net.ServerConfig
import com.android.billingclient.api.AcknowledgePurchaseParams
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.android.billingclient.api.queryProductDetails
import com.android.billingclient.api.queryPurchasesAsync
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CompletableDeferred
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import kotlinx.coroutines.withTimeoutOrNull
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.security.MessageDigest
import java.util.concurrent.TimeUnit
import javax.inject.Inject
import javax.inject.Singleton

/** One subscription plan as Play prices it for this person. */
data class PlusPlan(
    val basePlanId: String, val price: String, val period: String, val offerToken: String, val trial: String?,
    val priceMicros: Long = 0, val currency: String = "",
)

/** A one-time pass: Plus for [days] days, no renewal. */
data class PlusPass(val productId: String, val days: Int, val price: String, val priceMicros: Long, val currency: String = "")

sealed interface BillingState {
    data object Loading : BillingState
    /** Play is missing, signed out, or the product is not set up yet. */
    data object Unavailable : BillingState
    data class Ready(val plans: List<PlusPlan>, val passes: List<PlusPass> = emptyList()) : BillingState
}

/**
 * TalkLive Plus through Google Play Billing. The app only starts the purchase;
 * the server checks every purchase token with Google (POST /billing/play/verify)
 * and then announces Plus with the usual premium-status event. Purchases are
 * re-sent on every start, so a missed verify or a new install restores Plus.
 */
@Singleton
class PlayBilling @Inject constructor(
    @ApplicationContext private val context: Context,
    private val identity: IdentityStore,
) {
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.IO)
    private val http = app.talklive.net.Http.withTimeout(20)
    private val connectLock = Mutex()

    private val _state = MutableStateFlow<BillingState>(BillingState.Loading)
    val state: StateFlow<BillingState> = _state

    /** A short message for the last purchase: null, or something to show. */
    private val _message = MutableStateFlow<PlayMessage?>(null)
    val message: StateFlow<PlayMessage?> = _message
    fun clearMessage() { _message.value = null }

    private val _busy = MutableStateFlow(false)
    val busy: StateFlow<Boolean> = _busy

    private var details: ProductDetails? = null
    private var passDetails: Map<String, ProductDetails> = emptyMap()

    private val client: BillingClient = BillingClient.newBuilder(context)
        .setListener { result, purchases -> onPurchases(result, purchases) }
        .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
        .enableAutoServiceReconnection()
        .build()

    private suspend fun connected(): Boolean = connectLock.withLock {
        if (client.isReady) return true
        val done = CompletableDeferred<Boolean>()
        runCatching {
            client.startConnection(object : BillingClientStateListener {
                override fun onBillingSetupFinished(r: BillingResult) { done.complete(r.responseCode == BillingClient.BillingResponseCode.OK) }
                override fun onBillingServiceDisconnected() { done.complete(false) }
            })
        }.onFailure { return false }
        withTimeoutOrNull(10_000) { done.await() } ?: false
    }

    /** Loads plan prices and re-verifies anything already bought. */
    fun refresh() = scope.launch {
        if (!connected()) { _state.value = BillingState.Unavailable; return@launch }
        val params = QueryProductDetailsParams.newBuilder().setProductList(listOf(
            QueryProductDetailsParams.Product.newBuilder().setProductId(PRODUCT_ID).setProductType(BillingClient.ProductType.SUBS).build(),
        )).build()
        val result = runCatching { client.queryProductDetails(params) }.getOrNull()
        val product = result?.productDetailsList?.firstOrNull()
        details = product
        val plans = product?.subscriptionOfferDetails.orEmpty()
            .groupBy { it.basePlanId }
            .mapNotNull { (base, offers) ->
                // Prefer an offer (free trial / intro) when Play gives one to this person.
                val offer = offers.firstOrNull { it.offerId != null } ?: offers.first()
                val phases = offer.pricingPhases.pricingPhaseList
                val full = phases.lastOrNull() ?: return@mapNotNull null
                val trial = phases.firstOrNull { it.priceAmountMicros == 0L }?.billingPeriod
                PlusPlan(base, full.formattedPrice, full.billingPeriod, offer.offerToken, trial, full.priceAmountMicros, full.priceCurrencyCode)
            }
            .sortedBy { periodDays(it.period) }
        // The one-time passes (in-app products), cheapest first.
        val passParams = QueryProductDetailsParams.newBuilder().setProductList(PASS_DAYS.keys.map {
            QueryProductDetailsParams.Product.newBuilder().setProductId(it).setProductType(BillingClient.ProductType.INAPP).build()
        }).build()
        val passList = runCatching { client.queryProductDetails(passParams) }.getOrNull()?.productDetailsList.orEmpty()
        passDetails = passList.associateBy { it.productId }
        val passes = passList.mapNotNull { d ->
            @Suppress("DEPRECATION") val offer = d.oneTimePurchaseOfferDetails ?: return@mapNotNull null
            PlusPass(d.productId, PASS_DAYS[d.productId] ?: return@mapNotNull null, offer.formattedPrice, offer.priceAmountMicros, offer.priceCurrencyCode)
        }.sortedBy { it.days }
        _state.value = if (plans.isEmpty() && passes.isEmpty()) BillingState.Unavailable else BillingState.Ready(plans, passes)
        restore(quiet = true)
    }

    /** Opens Google Play's purchase sheet for a plan. */
    fun buy(activity: Activity, plan: PlusPlan) {
        val product = details ?: return
        val params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(
                BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product).setOfferToken(plan.offerToken).build(),
            ))
            .setObfuscatedAccountId(accountId(identity.clientId))
            .build()
        val r = client.launchBillingFlow(activity, params)
        if (r.responseCode != BillingClient.BillingResponseCode.OK) _message.value = PlayMessage.Failed
    }

    /** Opens Google Play's purchase sheet for a one-time pass. */
    fun buyPass(activity: Activity, pass: PlusPass) {
        val product = passDetails[pass.productId] ?: return
        val params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(listOf(BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(product).build()))
            .setObfuscatedAccountId(accountId(identity.clientId))
            .build()
        val r = client.launchBillingFlow(activity, params)
        if (r.responseCode != BillingClient.BillingResponseCode.OK) _message.value = PlayMessage.Failed
    }

    /** Sends every active Plus purchase on this Google account to the server. */
    fun restore(quiet: Boolean = false) = scope.launch {
        if (!connected()) { if (!quiet) _message.value = PlayMessage.Failed; return@launch }
        val owned = runCatching {
            client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.SUBS).build()).purchasesList
        }.getOrDefault(emptyList()).filter { PRODUCT_ID in it.products && it.purchaseState == Purchase.PurchaseState.PURCHASED }
        // Passes not yet used up (bought while the server could not be reached).
        val passes = runCatching {
            client.queryPurchasesAsync(QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()).purchasesList
        }.getOrDefault(emptyList()).filter { p -> p.products.any { it in PASS_DAYS } && p.purchaseState == Purchase.PurchaseState.PURCHASED }
        if (owned.isEmpty() && passes.isEmpty()) { if (!quiet) _message.value = PlayMessage.NothingToRestore; return@launch }
        owned.forEach { verify(it, quiet) }
        passes.forEach { verify(it, quiet) }
    }

    private fun onPurchases(result: BillingResult, purchases: List<Purchase>?) {
        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> purchases.orEmpty().forEach { p ->
                when (p.purchaseState) {
                    Purchase.PurchaseState.PURCHASED -> scope.launch { verify(p, quiet = false) }
                    Purchase.PurchaseState.PENDING -> _message.value = PlayMessage.Pending
                }
            }
            BillingClient.BillingResponseCode.ITEM_ALREADY_OWNED -> restore()
            BillingClient.BillingResponseCode.USER_CANCELED -> Unit
            else -> _message.value = PlayMessage.Failed
        }
    }

    private suspend fun verify(p: Purchase, quiet: Boolean) {
        _busy.value = true
        try {
            val body = JSONObject()
                .put("clientId", identity.clientId)
                .put("identityToken", identity.identityToken ?: "")
                .put("purchaseToken", p.purchaseToken)
                .put("productId", p.products.firstOrNull { it in PASS_DAYS } ?: PRODUCT_ID)
                .toString().toRequestBody("application/json".toMediaType())
            val (code, json) = withContext(Dispatchers.IO) {
                runCatching {
                    http.newCall(Request.Builder().url("${ServerConfig.url}/billing/play/verify").post(body).build()).execute().use {
                        it.code to runCatching { JSONObject(it.body?.string().orEmpty()) }.getOrNull()
                    }
                }.getOrDefault(0 to null)
            }
            when {
                code == 200 && json?.optBoolean("premium") == true -> if (!quiet) _message.value = PlayMessage.Welcome
                code == 200 -> if (!quiet) _message.value = PlayMessage.Failed
                code == 403 -> if (!quiet) _message.value = PlayMessage.Error(json?.optString("error").orEmpty())
                else -> {
                    // Server not reachable or Play billing not set up there yet. Acknowledge
                    // on the device so Play does not refund it; the next start verifies again.
                    // (A pass stays unconsumed until the server has granted its days.)
                    acknowledgeLocally(p)
                    if (!quiet) _message.value = PlayMessage.Later
                }
            }
        } finally {
            _busy.value = false
        }
    }

    private suspend fun acknowledgeLocally(p: Purchase) {
        if (p.isAcknowledged) return
        val done = CompletableDeferred<Unit>()
        runCatching {
            client.acknowledgePurchase(AcknowledgePurchaseParams.newBuilder().setPurchaseToken(p.purchaseToken).build()) { done.complete(Unit) }
        }.onFailure { return }
        withTimeoutOrNull(10_000) { done.await() }
    }

    companion object {
        /**
         * One subscription product with two base plans, picked by their billing period:
         * `plus-monthly` (P1M) and `plus-yearly` (P1Y). The code sorts by period, so the
         * base plan ids are free to differ, but these are the ones to create in Play Console.
         */
        const val PRODUCT_ID = "talklive_plus"
        /** One-time passes (Play Console > In-app products), as server/play-billing.js PASS_DAYS. */
        val PASS_DAYS = mapOf("pass_1d" to 1, "pass_7d" to 7, "pass_15d" to 15)
        const val MANAGE_URL = "https://play.google.com/store/account/subscriptions?sku=$PRODUCT_ID&package="

        /** The server ties a purchase to its buyer with the same hash (server/play-billing.js accountIdFor). */
        fun accountId(clientId: String): String =
            MessageDigest.getInstance("SHA-256").digest(clientId.toByteArray()).joinToString("") { "%02x".format(it) }

        /** Rough length of an ISO 8601 billing period, for sorting and per-month maths. */
        fun periodDays(p: String): Int {
            val m = Regex("P(\\d+)([DWMY])").find(p) ?: return 0
            val n = m.groupValues[1].toInt()
            return n * when (m.groupValues[2]) { "D" -> 1; "W" -> 7; "M" -> 30; else -> 360 }
        }
    }
}

sealed interface PlayMessage {
    data object Welcome : PlayMessage
    data object Pending : PlayMessage
    data object Later : PlayMessage
    data object Failed : PlayMessage
    data object NothingToRestore : PlayMessage
    data class Error(val text: String) : PlayMessage
}

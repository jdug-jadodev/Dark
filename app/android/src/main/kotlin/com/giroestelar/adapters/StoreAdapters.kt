package com.giroestelar.adapters

import android.app.Activity
import android.content.Context
import android.os.Build
import android.util.Log
import com.android.billingclient.api.BillingClient
import com.android.billingclient.api.BillingClientStateListener
import com.android.billingclient.api.BillingFlowParams
import com.android.billingclient.api.BillingResult
import com.android.billingclient.api.PendingPurchasesParams
import com.android.billingclient.api.ProductDetails
import com.android.billingclient.api.Purchase
import com.android.billingclient.api.QueryProductDetailsParams
import com.android.billingclient.api.QueryPurchasesParams
import com.giroestelar.application.Store
import org.json.JSONArray
import org.json.JSONObject

/**
 * Lo que el puente necesita de la tienda. Todo contesta después, por `window.__giroStore(tipo, json)`:
 *   products  → { "prices": { "coins_s": "$ 1.000", … } }
 *   purchases → { "list": [ { "productId", "token", "state": "paid" | "pending" } ], "cancel"?, "error"? }
 *   pending   → igual que purchases: las compras que siguen abiertas en Google
 */
interface StoreControl {
    /** ¿Esta instalación puede cobrar con Google Play? (solo si se instaló desde la tienda) */
    fun ready(): Boolean

    fun products(ids: String)

    /** uid = identificador anónimo de la instalación: la compra queda a su nombre (ver Store.buyerTag) */
    fun buy(id: String, uid: String)

    fun pending()
}

/** ¿La app se instaló desde Google Play? Fuera de la tienda, Google no deja cobrar. */
fun installedFromPlay(context: Context): Boolean = try {
    val pm = context.packageManager
    val installer = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        pm.getInstallSourceInfo(context.packageName).installingPackageName
    } else {
        @Suppress("DEPRECATION")
        pm.getInstallerPackageName(context.packageName)
    }
    installer == "com.android.vending"
} catch (e: Exception) {
    false
}

/**
 * Cobros con la facturación de Google Play. El jugador paga en la ventana de Google (la app
 * nunca ve su tarjeta) y Google entrega un comprobante de compra. Aquí no se decide nada:
 * el comprobante se le pasa al juego, que se lo manda al servidor para que lo verifique.
 *
 * Todos los métodos se llaman en el hilo principal. [reply] recibe (tipo, json).
 */
class PlayStore(private val activity: Activity, private val reply: (String, String) -> Unit) {
    private val details = HashMap<String, ProductDetails>()
    private var connected = false
    private var connecting = false
    private val queue = ArrayList<Pair<() -> Unit, () -> Unit>>() // lo que espera a que haya conexión: (hacer, si falla)

    private val client: BillingClient by lazy {
        BillingClient.newBuilder(activity)
            .setListener { result, purchases -> bought(result, purchases) }
            .enablePendingPurchases(PendingPurchasesParams.newBuilder().enableOneTimeProducts().build())
            .enableAutoServiceReconnection()
            .build()
    }

    fun ready(): Boolean = installedFromPlay(activity)

    /** Los precios, como los muestra Google en la moneda del jugador. */
    fun products(ids: String) {
        val list = Store.productList(ids)
        val none = { reply("products", JSONObject().put("prices", JSONObject()).toString()) }
        if (list.isEmpty()) return none()
        connect({
            val params = QueryProductDetailsParams.newBuilder()
                .setProductList(
                    list.map {
                        QueryProductDetailsParams.Product.newBuilder()
                            .setProductId(it)
                            .setProductType(BillingClient.ProductType.INAPP)
                            .build()
                    },
                )
                .build()
            client.queryProductDetailsAsync(params) { result, found ->
                val prices = JSONObject()
                if (result.responseCode == BillingClient.BillingResponseCode.OK) {
                    for (d in found.productDetailsList) {
                        details[d.productId] = d
                        offerOf(d)?.let { prices.put(d.productId, it.formattedPrice) }
                    }
                } else {
                    note("precios", result)
                }
                onMain { reply("products", JSONObject().put("prices", prices).toString()) }
            }
        }, none)
    }

    /**
     * Abre la ventana de pago de Google para un producto. El resultado llega como "purchases".
     * [buyer] es la huella de la instalación que compra (Store.buyerTag): Google la guarda con la
     * compra y el servidor la comprueba antes de entregar.
     */
    fun buy(id: String, buyer: String) {
        val fail = { why: String -> reply("purchases", JSONObject().put("list", JSONArray()).put("error", why).toString()) }
        val d = details[id] ?: return fail("unknown")
        connect({
            val one = BillingFlowParams.ProductDetailsParams.newBuilder().setProductDetails(d)
            offerOf(d)?.offerToken?.takeIf { it.isNotEmpty() }?.let { one.setOfferToken(it) }
            val flow = BillingFlowParams.newBuilder()
                .setProductDetailsParamsList(listOf(one.build()))
                .setObfuscatedAccountId(buyer)
                .build()
            val result = client.launchBillingFlow(activity, flow)
            if (result.responseCode != BillingClient.BillingResponseCode.OK) {
                note("abrir el pago", result)
                fail("launch")
            }
        }, { fail("offline") })
    }

    /** Lo que pidió el juego no se puede cobrar (producto o identificador con una forma rara): se le contesta que no. */
    fun refuse() = reply("purchases", JSONObject().put("list", JSONArray()).put("error", "unknown").toString())

    /** Las compras que siguen abiertas en Google: pagadas sin entregar, pendientes, y lo que es para siempre. */
    fun pending() {
        val none = { reply("pending", JSONObject().put("list", JSONArray()).toString()) }
        connect({
            val params = QueryPurchasesParams.newBuilder().setProductType(BillingClient.ProductType.INAPP).build()
            client.queryPurchasesAsync(params) { result, purchases ->
                val ok = result.responseCode == BillingClient.BillingResponseCode.OK
                if (!ok) note("compras abiertas", result)
                onMain { reply("pending", JSONObject().put("list", listOf(if (ok) purchases else emptyList())).toString()) }
            }
        }, none)
    }

    /* lo que Google avisa al terminar (o cancelar) un pago */
    private fun bought(result: BillingResult, purchases: List<Purchase>?) {
        val out = JSONObject()
        when (result.responseCode) {
            BillingClient.BillingResponseCode.OK -> out.put("list", listOf(purchases ?: emptyList()))
            BillingClient.BillingResponseCode.USER_CANCELED -> out.put("list", JSONArray()).put("cancel", true)
            else -> {
                note("pago", result)
                out.put("list", JSONArray()).put("error", "pay")
            }
        }
        onMain { reply("purchases", out.toString()) }
    }

    private fun listOf(purchases: List<Purchase>): JSONArray {
        val list = JSONArray()
        for (p in purchases) {
            for (product in p.products) {
                list.put(
                    JSONObject()
                        .put("productId", product)
                        .put("token", p.purchaseToken)
                        .put("state", Store.stateName(p.purchaseState)),
                )
            }
        }
        return list
    }

    private fun offerOf(d: ProductDetails): ProductDetails.OneTimePurchaseOfferDetails? =
        d.oneTimePurchaseOfferDetailsList?.firstOrNull() ?: d.oneTimePurchaseOfferDetails

    /* Conectar con Google Play (una sola vez; la librería se reconecta sola si se cae). */
    private fun connect(task: () -> Unit, fail: () -> Unit) {
        if (connected) return task()
        queue.add(task to fail)
        if (connecting) return
        connecting = true
        try {
            client.startConnection(object : BillingClientStateListener {
                override fun onBillingSetupFinished(result: BillingResult) = onMain {
                    connecting = false
                    connected = result.responseCode == BillingClient.BillingResponseCode.OK
                    if (!connected) note("conectar", result)
                    val waiting = ArrayList(queue)
                    queue.clear()
                    for ((run, giveUp) in waiting) if (connected) run() else giveUp()
                }

                override fun onBillingServiceDisconnected() {
                    connected = false
                }
            })
        } catch (e: Exception) {
            connecting = false
            val waiting = ArrayList(queue)
            queue.clear()
            for ((_, giveUp) in waiting) giveUp()
        }
    }

    private fun onMain(task: () -> Unit) = activity.runOnUiThread(task)

    /* por qué falló algo de la tienda: al registro, para diagnosticar (sin datos del jugador) */
    private fun note(what: String, result: BillingResult) {
        Log.w(TAG, "Tienda, $what: código ${result.responseCode} · ${result.debugMessage}")
    }

    private companion object { const val TAG = "GiroEstelar" }
}

package com.giroestelar

import android.Manifest
import android.annotation.SuppressLint
import android.content.Intent
import android.app.Activity
import android.content.pm.ApplicationInfo
import android.graphics.Color
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.view.View
import android.view.WindowInsets
import android.view.WindowManager
import android.webkit.ConsoleMessage
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.widget.LinearLayout
import android.window.OnBackInvokedDispatcher
import androidx.webkit.WebViewAssetLoader
import com.giroestelar.adapters.AccountControl
import com.giroestelar.adapters.AdMobAds
import com.giroestelar.adapters.AdsControl
import com.giroestelar.adapters.AndroidThermal
import com.giroestelar.adapters.GoogleSignIn
import com.giroestelar.adapters.PlayStore
import com.giroestelar.adapters.SessionVault
import com.giroestelar.adapters.StoreControl
import com.giroestelar.adapters.GameBridge
import com.giroestelar.adapters.ReminderControl
import com.giroestelar.adapters.canNotify
import com.giroestelar.adapters.reminders
import com.giroestelar.adapters.testApiOf
import com.giroestelar.adapters.SharedPrefsGameStateStore
import com.giroestelar.adapters.VibratorHaptics
import com.giroestelar.application.Account
import com.giroestelar.application.Ads
import com.giroestelar.application.GameHost
import com.giroestelar.application.Page
import com.giroestelar.application.Store
import java.time.LocalDateTime
import org.json.JSONObject

/**
 * Punto de armado de la app: crea los adaptadores, los conecta con [GameHost] y abre el juego
 * (el mismo demo-juego.html con Three.js) en un WebView a pantalla completa.
 */
class MainActivity : Activity() {
    private lateinit var web: WebView
    private val reminders by lazy { reminders(this) }
    private lateinit var ads: AdMobAds

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val debuggable = (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
        WebView.setWebContentsDebuggingEnabled(debuggable)

        /* ---- adaptadores + aplicación ---- */
        val host = GameHost(SharedPrefsGameStateStore(this), VibratorHaptics(this), AndroidThermal(this))

        val testApi = testApiOf(this, debuggable)

        /* ---- anuncios: la franja va debajo del juego, en su propio espacio ---- */
        val strip = FrameLayout(this).apply { setBackgroundColor(Color.parseColor("#070b18")) }
        val column = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            addView(strip, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0))
        }
        ads = AdMobAds(this, strip, debuggable) { result ->
            web.evaluateJavascript("window.__giroAd && window.__giroAd('${Ads.result(result != "none", result == "earned")}')", null)
        }

        /* ---- WebView del juego ---- */
        // Los archivos de la app se sirven como si fueran una página https local (sin internet)
        val assets = WebViewAssetLoader.Builder()
            .addPathHandler("/assets/", WebViewAssetLoader.AssetsPathHandler(this))
            .build()
        web = WebView(this).apply {
            setBackgroundColor(Color.parseColor("#070b18"))
            overScrollMode = View.OVER_SCROLL_NEVER
            isVerticalScrollBarEnabled = false
            isHorizontalScrollBarEnabled = false
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            settings.mediaPlaybackRequiresUserGesture = false
            settings.allowFileAccess = false
            settings.allowContentAccess = false
            settings.setSupportZoom(false)
            settings.textZoom = 100 // el tamaño de letra del sistema no desarma el HUD
            // solo con un servidor de pruebas configurado: ese servidor no tiene candado (https)
            if (testApi.isNotEmpty()) settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? {
                    /* solo en la app de pruebas con un servidor de pruebas: la página se sirve
                       con ese servidor permitido en su política de contenido */
                    if (testApi.isNotEmpty() && request.url.path == Page.GAME_PATH) {
                        val html = this@MainActivity.assets.open("game/index.html").bufferedReader().use { it.readText() }
                        return WebResourceResponse("text/html", "utf-8", Page.allowServer(html, testApi).byteInputStream())
                    }
                    return assets.shouldInterceptRequest(request.url)
                }

                /* La ventana del juego no sale de la página del juego: el puente con Android queda
                   pegado a lo que esté cargado aquí, así que cualquier otra dirección se bloquea
                   (no se abre aquí ni en el navegador). */
                override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean =
                    !Page.inside(request.url.toString())
            }
            webChromeClient = object : WebChromeClient() {
                /* lo que el juego escribe en su consola va al registro del teléfono solo en la app de pruebas */
                override fun onConsoleMessage(m: ConsoleMessage): Boolean {
                    if (debuggable) Log.i(TAG, "${m.message()} (${m.sourceId()?.substringAfterLast('/')}:${m.lineNumber()})")
                    return true
                }
            }
            addJavascriptInterface(
                GameBridge(host, debuggable, reminderControl(), testApi, ::shareText, accountControl(), storeControl(), adsControl(), ::openPolicy),
                "GiroNative",
            )
        }

        // Fondo negro y margen para la cámara frontal / barras, así el marcador no queda tapado
        val root = FrameLayout(this).apply {
            setBackgroundColor(Color.BLACK)
            column.addView(web, 0, LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1f))
            addView(column, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
            setOnApplyWindowInsetsListener { v, insets ->
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                    val i = insets.getInsets(WindowInsets.Type.displayCutout() or WindowInsets.Type.systemBars())
                    v.setPadding(i.left, i.top, i.right, i.bottom)
                }
                insets
            }
        }
        setContentView(root)
        window.addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON)
        // El juego dibuja a 60 cuadros por segundo: se le pide a la pantalla ese ritmo. En una de
        // 120 Hz, ir al doble solo calienta el teléfono y gasta batería sin que se note.
        window.attributes = window.attributes.apply { preferredRefreshRate = 60f }
        hideSystemBars()

        // "Atrás" del sistema: primero se le pregunta al juego (pausar, cerrar ventana); si no lo usa, se sale
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            onBackInvokedDispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT) { askGameBack() }
        }

        web.loadUrl(Page.GAME)
        ads.start()
    }

    /* ---- anuncios: el video con premio y la franja (el juego llama desde otro hilo) ---- */
    private fun adsControl() = object : AdsControl {
        override fun ready(): Boolean = true
        override fun show() = runOnUiThread { ads.show() }
        override fun banner(on: Boolean) = runOnUiThread { ads.banner(on) }
        override fun privacyNeeded(): Boolean = ads.privacyNeeded()
        override fun openPrivacy() = runOnUiThread { ads.openPrivacy() }
    }

    /* ---- cuenta: entrar con Google y guardar la llave de sesión ---- */
    private fun accountControl() = object : AccountControl {
        private val google = GoogleSignIn(this@MainActivity, BuildConfig.GOOGLE_CLIENT_ID)
        private val vault = SessionVault(this@MainActivity)
        override fun ready(): Boolean = google.ready()

        /* el juego llama desde otro hilo: la ventana de Google se abre en el principal, y el
           comprobante (ya revisado: solo letras, números, puntos y guiones) vuelve al juego */
        override fun signIn(nonce: String) = runOnUiThread {
            google.start(nonce) { token ->
                val safe = Account.safeToken(token)
                web.evaluateJavascript("window.__giroGoogle && window.__giroGoogle('$safe')", null)
            }
        }

        override fun secret(): String = vault.get()

        override fun setSecret(value: String) = vault.set(value)
    }

    /* ---- tienda: cobros con Google Play ---- */
    private fun storeControl() = object : StoreControl {
        /* el juego recibe (tipo, texto JSON); el tipo es fijo y el texto va entre comillas, escapado */
        private val play = PlayStore(this@MainActivity) { kind, json ->
            web.evaluateJavascript("window.__giroStore && window.__giroStore('$kind', ${JSONObject.quote(json)})", null)
        }
        override fun ready(): Boolean = play.ready()

        /* el juego llama desde otro hilo: todo lo de la tienda corre en el principal */
        override fun products(ids: String) = runOnUiThread { play.products(ids) }

        /* sin un identificador válido no se abre el pago: la compra no quedaría a nombre de nadie */
        override fun buy(id: String, uid: String) = runOnUiThread {
            val buyer = Store.buyerTag(uid)
            if (Store.validProduct(id) && buyer != null) play.buy(id, buyer) else play.refuse()
        }

        override fun pending() = runOnUiThread { play.pending() }
    }

    /* ---- recordatorio diario ---- */
    private fun reminderControl() = object : ReminderControl {
        /* el juego llama desde otro hilo: lo que toca la pantalla o pide permiso va al hilo principal */
        override fun set(on: Boolean) = runOnUiThread {
            if (on && !canNotify(this@MainActivity) && Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                requestPermissions(arrayOf(Manifest.permission.POST_NOTIFICATIONS), ASK_NOTIFY)
            } else {
                reminders.setEnabled(on, LocalDateTime.now())
                tellGame()
            }
        }
        override fun isOn(): Boolean = reminders.enabled && canNotify(this@MainActivity)
        override fun noteStreak(days: Int) = reminders.noteStreak(days)
        override fun noteCup(rank: Int) = reminders.noteCup(rank)
        override fun noteLang(code: String) = reminders.noteLang(code)
    }

    /** Abre el menú de compartir de Android con el reto (WhatsApp, etc.). */
    private fun shareText(text: String) = runOnUiThread {
        val send = Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text)
        startActivity(Intent.createChooser(send, reminders.texts.share))
    }

    /** Abre la política de privacidad (una página del servidor del juego) en el navegador del teléfono. */
    private fun openPolicy(lang: String) = runOnUiThread {
        val url = Page.policyUrl(BuildConfig.API_URL, lang) ?: return@runOnUiThread
        try {
            startActivity(Intent(Intent.ACTION_VIEW, Uri.parse(url)))
        } catch (e: Exception) {
            Log.w(TAG, "No se pudo abrir la política de privacidad: ${e.message}")
        }
    }

    /** El jugador respondió si deja mostrar avisos: solo si dijo que sí queda encendido. */
    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        if (requestCode != ASK_NOTIFY) return
        reminders.setEnabled(canNotify(this), LocalDateTime.now())
        tellGame()
    }

    private fun tellGame() {
        val on = reminders.enabled && canNotify(this)
        web.evaluateJavascript("window.__giroReminder && window.__giroReminder($on)", null)
    }

    private fun askGameBack() {
        web.evaluateJavascript("(window.__giroBack ? window.__giroBack() : false)") { used ->
            if (used != "true") finish()
        }
    }

    @Deprecated("Solo para Android 12 o anterior")
    override fun onBackPressed() = askGameBack()

    private fun hideSystemBars() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.insetsController?.let {
                it.hide(WindowInsets.Type.systemBars())
                it.systemBarsBehavior = android.view.WindowInsetsController.BEHAVIOR_SHOW_TRANSIENT_BARS_BY_SWIPE
            }
        } else {
            @Suppress("DEPRECATION")
            window.decorView.systemUiVisibility = (View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY or View.SYSTEM_UI_FLAG_FULLSCREEN
                or View.SYSTEM_UI_FLAG_HIDE_NAVIGATION or View.SYSTEM_UI_FLAG_LAYOUT_STABLE)
        }
    }

    override fun onWindowFocusChanged(hasFocus: Boolean) {
        super.onWindowFocusChanged(hasFocus)
        if (hasFocus) hideSystemBars()
    }

    /** La app sale de pantalla (llamada, otra app): el juego se pausa solo. */
    override fun onPause() {
        web.evaluateJavascript("window.__giroPause && window.__giroPause()", null)
        web.onPause()
        ads.pause()
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
        ads.resume()
        reminders.gameOpened(LocalDateTime.now()) // hoy ya jugó: el próximo aviso posible es mañana
    }

    override fun onDestroy() {
        ads.destroy()
        web.destroy()
        super.onDestroy()
    }

    private companion object {
        const val TAG = "GiroEstelar"
        const val ASK_NOTIFY = 7
    }
}

package com.giroestelar

import android.annotation.SuppressLint
import android.app.Activity
import android.content.pm.ApplicationInfo
import android.graphics.Color
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
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.FrameLayout
import android.window.OnBackInvokedDispatcher
import androidx.webkit.WebViewAssetLoader
import com.giroestelar.adapters.GameBridge
import com.giroestelar.adapters.SharedPrefsGameStateStore
import com.giroestelar.adapters.VibratorHaptics
import com.giroestelar.application.GameHost

/**
 * Punto de armado de la app: crea los adaptadores, los conecta con [GameHost] y abre el juego
 * (el mismo demo-juego.html con Three.js) en un WebView a pantalla completa.
 */
class MainActivity : Activity() {
    private lateinit var web: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val debuggable = (applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE) != 0
        WebView.setWebContentsDebuggingEnabled(debuggable)

        /* ---- adaptadores + aplicación ---- */
        val host = GameHost(SharedPrefsGameStateStore(this), VibratorHaptics(this))

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
            webViewClient = object : WebViewClient() {
                override fun shouldInterceptRequest(view: WebView, request: WebResourceRequest): WebResourceResponse? =
                    assets.shouldInterceptRequest(request.url)
            }
            webChromeClient = object : WebChromeClient() {
                override fun onConsoleMessage(m: ConsoleMessage): Boolean {
                    Log.i(TAG, "${m.message()} (${m.sourceId()?.substringAfterLast('/')}:${m.lineNumber()})")
                    return true
                }
            }
            addJavascriptInterface(GameBridge(host, debuggable), "GiroNative")
        }

        // Fondo negro y margen para la cámara frontal / barras, así el marcador no queda tapado
        val root = FrameLayout(this).apply {
            setBackgroundColor(Color.BLACK)
            addView(web, FrameLayout.LayoutParams(FrameLayout.LayoutParams.MATCH_PARENT, FrameLayout.LayoutParams.MATCH_PARENT))
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
        hideSystemBars()

        // "Atrás" del sistema: primero se le pregunta al juego (pausar, cerrar ventana); si no lo usa, se sale
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            onBackInvokedDispatcher.registerOnBackInvokedCallback(OnBackInvokedDispatcher.PRIORITY_DEFAULT) { askGameBack() }
        }

        web.loadUrl("https://appassets.androidplatform.net/assets/game/index.html")
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
        super.onPause()
    }

    override fun onResume() {
        super.onResume()
        web.onResume()
    }

    override fun onDestroy() {
        web.destroy()
        super.onDestroy()
    }

    private companion object { const val TAG = "GiroEstelar" }
}

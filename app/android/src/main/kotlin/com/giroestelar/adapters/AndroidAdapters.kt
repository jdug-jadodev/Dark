package com.giroestelar.adapters

import android.content.Context
import android.os.VibrationEffect
import android.os.Vibrator
import android.webkit.JavascriptInterface
import com.giroestelar.application.GameHost
import com.giroestelar.application.GameStateStore
import com.giroestelar.application.Haptics

/** Guardado nativo con SharedPreferences (no se borra al limpiar el caché del navegador). */
class SharedPrefsGameStateStore(context: Context) : GameStateStore {
    private val prefs = context.getSharedPreferences("giro_estelar", Context.MODE_PRIVATE)
    override fun load(): String? = prefs.getString(KEY, null)
    override fun save(json: String) = prefs.edit().putString(KEY, json).apply()

    private companion object { const val KEY = "state" }
}

class VibratorHaptics(context: Context) : Haptics {
    @Suppress("DEPRECATION")
    private val vibrator = context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator

    override fun vibrate(milliseconds: Long) {
        vibrator?.vibrate(VibrationEffect.createOneShot(milliseconds, VibrationEffect.DEFAULT_AMPLITUDE))
    }
}

/**
 * Puente con el juego: en JavaScript aparece como `window.GiroNative`.
 * Es un adaptador de entrada: solo traduce las llamadas del juego a [GameHost].
 */
class GameBridge(private val host: GameHost, private val debuggable: Boolean) {
    @JavascriptInterface fun loadState(): String = host.loadState() ?: ""
    @JavascriptInterface fun saveState(json: String) { host.saveState(json) }
    @JavascriptInterface fun haptic(milliseconds: Int) = host.vibrate(milliseconds.toLong())
    @JavascriptInterface fun isDebug(): Boolean = debuggable
}

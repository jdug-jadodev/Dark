package com.giroestelar.adapters

import android.content.Context
import android.os.Build
import android.os.PowerManager
import android.os.VibrationEffect
import android.os.Vibrator
import android.webkit.JavascriptInterface
import com.giroestelar.application.GameHost
import com.giroestelar.application.GameStateStore
import com.giroestelar.application.Haptics
import com.giroestelar.application.Thermal

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
 * Calor según Android (desde la versión 10). El ahorro de batería cuenta como "tibio": si el
 * dueño del teléfono pidió gastar menos, el juego dibuja con menos nitidez.
 */
class AndroidThermal(context: Context) : Thermal {
    private val power = context.getSystemService(Context.POWER_SERVICE) as? PowerManager

    override fun level(): Int {
        val pm = power ?: return 0
        val status = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) pm.currentThermalStatus else 0
        return maxOf(status, if (pm.isPowerSaveMode) 1 else 0)
    }
}

/**
 * Puente con el juego: en JavaScript aparece como `window.GiroNative`.
 * Es un adaptador de entrada: solo traduce las llamadas del juego a [GameHost].
 */
class GameBridge(
    private val host: GameHost,
    private val debuggable: Boolean,
    private val reminder: ReminderControl,
    private val testApi: String = "",
    private val share: (String) -> Unit = {},
    private val account: AccountControl? = null,
) {
    @JavascriptInterface fun loadState(): String = host.loadState() ?: ""
    @JavascriptInterface fun saveState(json: String) { host.saveState(json) }
    @JavascriptInterface fun haptic(milliseconds: Int) = host.vibrate(milliseconds.toLong())
    @JavascriptInterface fun heat(): Int = host.heat()
    @JavascriptInterface fun isDebug(): Boolean = debuggable

    /** Servidor de pruebas (vacío casi siempre): ver [testApiOf]. */
    @JavascriptInterface fun testApi(): String = testApi

    /* recordatorio diario: el juego lo enciende o apaga, pregunta cómo está y cuenta la racha */
    @JavascriptInterface fun setReminder(on: Boolean) = reminder.set(on)
    @JavascriptInterface fun reminderOn(): Boolean = reminder.isOn()
    @JavascriptInterface fun noteStreak(days: Int) = reminder.noteStreak(days)
    @JavascriptInterface fun noteCup(rank: Int) = reminder.noteCup(rank)

    /** Compartir un texto (retar a los amigos) con la app que el jugador elija. */
    @JavascriptInterface fun share(text: String) = share.invoke(text.take(MAX_SHARE_CHARS))

    /* cuenta: entrar con Google y guardar (cifrada) la llave de sesión. Ver AccountAdapters.kt */
    @JavascriptInterface fun googleReady(): Boolean = account?.ready() ?: false
    @JavascriptInterface fun googleSignIn(nonce: String) { account?.signIn(nonce) }
    @JavascriptInterface fun secretGet(): String = account?.secret() ?: ""
    @JavascriptInterface fun secretSet(value: String) { account?.setSecret(value) }

    private companion object { const val MAX_SHARE_CHARS = 500 }
}

/** Lo que el puente necesita del recordatorio. Encenderlo puede requerir pedirle permiso al jugador. */
interface ReminderControl {
    fun set(on: Boolean)
    fun isOn(): Boolean
    fun noteStreak(days: Int)
    fun noteCup(rank: Int)
}

/**
 * Para probar la copa sin publicar el servidor: en una app de pruebas (nunca en la de la tienda)
 * se puede dejar escrita la dirección de un servidor de pruebas, y el juego usa esa.
 * Se escribe desde el computador:  shared_prefs/giro_estelar_pruebas.xml, clave "api".
 */
fun testApiOf(context: Context, debuggable: Boolean): String =
    if (!debuggable) ""
    else context.getSharedPreferences("giro_estelar_pruebas", Context.MODE_PRIVATE).getString("api", "") ?: ""

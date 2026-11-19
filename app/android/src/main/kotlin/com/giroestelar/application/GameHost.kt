package com.giroestelar.application

/*
 * Arquitectura hexagonal del lado nativo.
 *   application → reglas de la app nativa + puertos (interfaces). Kotlin puro, con pruebas.
 *   adapters    → Android real: SharedPreferences, vibrador, WebView y su puente.
 *   MainActivity → punto de armado.
 * Las reglas del JUEGO viven en demo-juego.html (Three.js); aquí está lo que el juego le pide al teléfono.
 */

/** Puerto: dónde se guarda el progreso del jugador. */
interface GameStateStore {
    fun load(): String?
    fun save(json: String)
}

/** Puerto: vibración del teléfono. */
interface Haptics {
    fun vibrate(milliseconds: Long)
}

/** Puerto: qué tan caliente está el teléfono (0 normal · 1 tibio · 2 caliente · 3 o más, muy caliente). */
fun interface Thermal {
    fun level(): Int
}

/** Lo que el juego puede pedirle a la app. No conoce Android: solo usa los puertos. */
class GameHost(
    private val store: GameStateStore,
    private val haptics: Haptics,
    private val thermal: Thermal = Thermal { 0 },
) {

    /** Progreso guardado, o null si no hay (o si está dañado). */
    fun loadState(): String? = store.load()?.takeIf(::looksLikeState)

    /** Guarda el progreso. Rechaza datos que no parezcan el estado del juego. */
    fun saveState(json: String): Boolean {
        if (!looksLikeState(json)) return false
        store.save(json)
        return true
    }

    /** Vibración corta; se limita para que una falla del juego no deje el teléfono vibrando. */
    fun vibrate(milliseconds: Long) {
        if (milliseconds > 0) haptics.vibrate(milliseconds.coerceAtMost(MAX_VIBRATION_MS))
    }

    /** Calor del teléfono, para que el juego baje la calidad antes de que el sistema lo frene. */
    fun heat(): Int = thermal.level().coerceIn(0, MAX_HEAT)

    private fun looksLikeState(json: String): Boolean {
        val t = json.trim()
        return t.length in 2..MAX_STATE_CHARS && t.startsWith("{") && t.endsWith("}")
    }

    companion object {
        const val MAX_STATE_CHARS = 100_000
        const val MAX_VIBRATION_MS = 400L
        const val MAX_HEAT = 6
    }
}

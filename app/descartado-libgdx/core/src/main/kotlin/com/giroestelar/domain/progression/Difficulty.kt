package com.giroestelar.domain.progression

import kotlin.math.floor
import kotlin.math.max
import kotlin.math.min

/** Curvas de dificultad (mismos números que el prototipo). */
object Difficulty {
    /**
     * Progreso en % (0–100 en Aventura; en Supervivencia sigue subiendo sin tope).
     * Aventura avanza por puntos; Supervivencia por tiempo.
     */
    fun progressOf(mode: GameMode, points: Float, seconds: Float): Float =
        if (mode == GameMode.SURVIVAL) seconds * Balance.SURVIVAL_RATE
        else points / Balance.ADVENTURE_GOAL * 100f

    /** Nivel de Supervivencia (empieza en 1). */
    fun levelOf(progress: Float): Int = 1 + floor(progress / Balance.LEVEL_SIZE).toInt()

    /** Velocidad de avance; pasado el 100 % sigue subiendo con un tope jugable. */
    fun speedAt(progress: Float): Float =
        min(680f, 235f + min(100f, progress) * 2.45f + max(0f, progress - 100f) * 1f)

    /** Segundos entre rocas. */
    fun rockIntervalAt(progress: Float): Float =
        max(0.2f, 0.72f - 0.42f * min(1f, progress / 85f) - max(0f, progress - 100f) * 0.0012f)

    /**
     * Máximo de naves enemigas vivas a la vez: difícil pero con espacio para
     * maniobrar. Desde el nivel 30 no hay tope. Con la pantalla girada baja la presión.
     * Devuelve [Int.MAX_VALUE] cuando no hay tope.
     */
    fun enemyCap(mode: GameMode, level: Int, flipping: Boolean): Int {
        val uncapped = mode == GameMode.SURVIVAL && level >= Balance.UNCAPPED_LEVEL
        val cap = when {
            mode != GameMode.SURVIVAL -> 6
            uncapped -> Int.MAX_VALUE
            level < 4 -> 2
            level < 10 -> 3
            level < 20 -> 4
            else -> 5
        }
        if (!flipping) return cap
        return min(cap, if (uncapped) 4 else 2)
    }

    /** Multiplicador de combo por ¡CASI! seguidos (1 a 4). */
    fun comboMultiplier(combo: Int): Int = 1 + min(3, combo / 3)
}

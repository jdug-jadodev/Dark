package com.giroestelar.domain.shared

/**
 * Todo lo aleatorio del juego pasa por aquí, nunca por el azar del sistema.
 * Con la misma semilla se obtiene exactamente la misma secuencia: es la base
 * de los retos por enlace y del multijugador (misma semilla = misma pista).
 */
interface RandomSource {
    /** Número en [0, 1). */
    fun next(): Double
    /** Número en [min, max). */
    fun range(min: Double, max: Double): Double = min + next() * (max - min)
    /** true con probabilidad p. */
    fun chance(p: Double): Boolean = next() < p
    /** Elemento al azar de una lista no vacía. */
    fun <T> pick(items: List<T>): T {
        require(items.isNotEmpty()) { "pick() necesita al menos un elemento" }
        return items[(next() * items.size).toInt()]
    }
}

/** Generador mulberry32: rápido, pequeño y determinista (igual en Android y en PC). */
class SeededRandom(seed: Int) : RandomSource {
    private var state: Int = seed

    override fun next(): Double {
        state += 0x6D2B79F5
        var t = state
        t = (t xor (t ushr 15)) * (t or 1)
        t = t xor (t + (t xor (t ushr 7)) * (t or 61))
        val r = (t xor (t ushr 14)).toLong() and 0xFFFFFFFFL
        return r / 4294967296.0
    }
}

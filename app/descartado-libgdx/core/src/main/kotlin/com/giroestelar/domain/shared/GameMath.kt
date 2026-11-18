package com.giroestelar.domain.shared

import kotlin.math.pow

/** Utilidades matemáticas puras (portadas de demo-juego.html). */
object GameMath {
    fun clamp(v: Float, min: Float, max: Float): Float = v.coerceIn(min, max)

    fun lerp(a: Float, b: Float, t: Float): Float = a + (b - a) * t

    /** Suavizado entrada/salida (el mismo `ease` del prototipo). */
    fun easeInOut(x: Float): Float = if (x < 0.5f) 2f * x * x else 1f - (-2f * x + 2f).pow(2) / 2f
}

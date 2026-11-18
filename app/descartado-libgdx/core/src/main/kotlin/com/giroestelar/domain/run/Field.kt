package com.giroestelar.domain.run

/**
 * El "plano de juego", igual que en el prototipo: 360 de ancho × 640 de alto.
 * x crece a la derecha; y crece hacia el jugador (y negativa = lejos, en la profundidad).
 * La pantalla 3D solo traduce estas coordenadas; los choques se calculan aquí.
 */
object Field {
    const val W = 360f
    const val H = 640f
    /** Fila "de reposo" de la nave. */
    const val SHIP_Y = H * 0.78f
    /** Distancia a la que nacen los obstáculos (en la profundidad). */
    const val SPAWN = 450f
    const val SHIP_RADIUS = 10f
    const val MIN_X = 14f
    const val MAX_X = W - 14f
    const val MIN_Y = H * 0.42f
    const val MAX_Y = SHIP_Y + 15f
    /** Velocidad de la nave con las flechas (unidades por segundo). */
    const val BUTTON_SPEED = 270f
    /** Qué tan rápido la nave alcanza al dedo. */
    const val SHIP_FOLLOW = 27f

    /** Lo lejano se acerca más rápido; cerca de la nave recupera su velocidad normal. */
    fun approach(y: Float): Float = 1f + 1.4f * (-y / SPAWN).coerceIn(0f, 1f)
}

/** Roca. [variant] elige una de las formas 3D (no afecta los choques). */
class Rock(
    val id: Int,
    var x: Float,
    var y: Float,
    val r: Float,
    var vx: Float,
    val vy: Float,
    var rot: Float,
    val spin: Float,
    val wall: Boolean,
    val variant: Int,
) {
    internal var close = false
    internal var nearMissed = false
}

class Coin(val id: Int, var x: Float, var y: Float, val vy: Float)

/** Fase de Aventura (desde qué % empieza, título y consejo). */
data class Phase(val at: Float, val name: String, val tip: String)

object Phases {
    val ADVENTURE = listOf(
        Phase(0f, "Calentamiento", "Desliza el dedo para esquivar"),
        Phase(4f, "Naves y armas", "Recoge armas y derriba naves"),
        Phase(18f, "Se acelera", "Escuadrones enemigos a la vista"),
        Phase(30f, "Turbulencia", "La pantalla se moverá sola"),
        Phase(50f, "Zona roja", "Naves más pesadas"),
        Phase(62f, "¡Pantalla girada!", "Los controles siguen igual"),
        Phase(75f, "Caos total", "Turbulencias cada vez más seguidas"),
    )

    val SURVIVAL_TIPS = listOf(
        "Sobrevive el mayor tiempo posible", "Llegan las naves enemigas", "Se acelera", "Turbulencias a la vista",
        "Naves más pesadas", "¡Prepárate para girar!", "Caos total", "Cada vez más rápido…", "¿Hasta dónde llegas?",
    )

    /** % de progreso donde llegan las paredes de rocas con un hueco. */
    val WALLS = listOf(14f, 26f, 38f, 56f, 70f, 84f, 92f)
}

package com.giroestelar.domain.progression

/**
 * Números de balance del juego, portados de demo-juego.html.
 * Si se cambian en el HTML después de probarlos, se actualizan aquí.
 */

enum class GameMode { ADVENTURE, SURVIVAL, SPACE, BOSS }

object Balance {
    /* ---------- Aventura ---------- */
    /** Puntos para llegar al jefe final. */
    const val ADVENTURE_GOAL = 320
    /** % de progreso donde aparece el jefe intermedio. */
    const val MINI_BOSS_AT = 45f
    /** % donde se gira la pantalla (una sola vez en Aventura). */
    const val FLIP_AT = 62f
    /** % desde donde hay turbulencias. */
    const val WOBBLE_AT = 30f

    /* ---------- Supervivencia ---------- */
    /** % de progreso por segundo (100 % ≈ 2:23). */
    const val SURVIVAL_RATE = 0.7f
    /** % de progreso por nivel (≈ 17 s por nivel). */
    const val LEVEL_SIZE = 12f
    /** Desde este nivel ya no hay tope de naves enemigas. */
    const val UNCAPPED_LEVEL = 30

    /* ---------- Casco (Supervivencia) ---------- */
    const val HULL_DAMAGE_SHOT = 10
    const val HULL_DAMAGE_ROCK = 18
    const val HULL_DAMAGE_SHIP = 22
    const val HULL_REPAIR_PER_LEVEL = 15
    const val HULL_AFTER_REVIVE = 50

    /* ---------- Nitro (Aventura) ---------- */
    const val NITRO_COST = 50
    const val NITRO_GAIN_PER_NEAR_MISS = 20
    const val NITRO_GAIN_GRAVITY_ESCAPE = 15
    const val NITRO_DURATION = 1.4f
}

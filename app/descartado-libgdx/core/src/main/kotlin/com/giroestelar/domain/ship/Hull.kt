package com.giroestelar.domain.ship

import com.giroestelar.domain.progression.Balance

/** Casco de la nave en Supervivencia: cada golpe baja un %, en vez de matar de una. */
class Hull {
    var percent: Int = 100
        private set

    val destroyed: Boolean get() = percent <= 0

    /** Aplica un golpe. Devuelve true si la nave aguantó. */
    fun hit(damage: Int): Boolean {
        percent = (percent - damage).coerceAtLeast(0)
        return !destroyed
    }

    /** Reparación al superar un nivel. Devuelve cuánto reparó. */
    fun repairForLevel(): Int {
        val gained = minOf(Balance.HULL_REPAIR_PER_LEVEL, 100 - percent)
        percent += gained
        return gained
    }

    /** Al revivir con anuncio se vuelve con al menos la mitad. */
    fun restoreAfterRevive() {
        percent = maxOf(percent, Balance.HULL_AFTER_REVIVE)
    }
}

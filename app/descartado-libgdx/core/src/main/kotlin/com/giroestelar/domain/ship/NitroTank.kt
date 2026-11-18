package com.giroestelar.domain.ship

import com.giroestelar.domain.progression.Balance

/** Barra de nitro (Aventura): se llena con cada ¡CASI!; cada uso gasta la mitad. */
class NitroTank {
    var percent: Int = 0
        private set

    val ready: Boolean get() = percent >= Balance.NITRO_COST

    fun fill(amount: Int) {
        percent = (percent + amount).coerceAtMost(100)
    }

    /** Gasta una carga. Devuelve false si no alcanzaba. */
    fun use(): Boolean {
        if (!ready) return false
        percent -= Balance.NITRO_COST
        return true
    }
}

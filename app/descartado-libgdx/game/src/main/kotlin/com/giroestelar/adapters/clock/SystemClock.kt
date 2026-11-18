package com.giroestelar.adapters.clock

import com.giroestelar.application.ports.Clock
import java.time.LocalDate

/** Fecha local del dispositivo: el cofre se renueva a la medianoche del jugador. */
class SystemClock : Clock {
    override fun today(): LocalDate = LocalDate.now()
}

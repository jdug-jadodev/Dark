package com.giroestelar.application

import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime

/*
 * Recordatorio diario: el juego "llama" a quien no lo abrió hoy. Reglas, en Kotlin puro:
 *
 *   - Un aviso al día como máximo, a las 7 de la noche.
 *   - Solo si ese día no se abrió el juego.
 *   - Después de 3 avisos seguidos sin que el jugador entre, se deja de avisar: no se insiste
 *     con quien ya no quiere jugar. Al volver a entrar, se retoma.
 *   - El jugador lo enciende y lo apaga cuando quiera.
 */

/** Puerto: lo que se recuerda entre un día y otro. */
interface ReminderStore {
    var enabled: Boolean
    /** Último día en que se abrió el juego (día del calendario, como número). */
    var lastOpenDay: Long
    /** Avisos seguidos que se mostraron sin que el jugador entrara. */
    var unanswered: Int
    /** Racha de días del jugador, para nombrarla en el aviso. */
    var streak: Int
}

/** Puerto: poner o quitar la alarma que despierta a la app para avisar. */
interface ReminderAlarm {
    fun setAt(time: LocalDateTime)
    fun cancel()
}

class Reminders(private val store: ReminderStore, private val alarm: ReminderAlarm) {

    val enabled: Boolean get() = store.enabled

    /** El jugador lo enciende o lo apaga. */
    fun setEnabled(on: Boolean, now: LocalDateTime) {
        store.enabled = on
        store.unanswered = 0
        if (on) alarm.setAt(nextAfter(now)) else alarm.cancel()
    }

    /** Se abrió el juego: hoy ya no hace falta avisar; el próximo aviso posible es mañana. */
    fun gameOpened(now: LocalDateTime) {
        store.lastOpenDay = now.toLocalDate().toEpochDay()
        store.unanswered = 0
        if (store.enabled) alarm.setAt(tomorrow(now))
    }

    /** El juego cuenta la racha, para que el aviso la nombre. */
    fun noteStreak(days: Int) {
        store.streak = days.coerceIn(0, MAX_STREAK)
    }

    /**
     * Sonó la alarma. Devuelve el texto del aviso, o null si no hay que avisar. Deja puesta la
     * alarma del día siguiente mientras tenga sentido seguir avisando.
     */
    fun alarmFired(now: LocalDateTime): String? {
        if (!store.enabled) return null
        val playedToday = store.lastOpenDay == now.toLocalDate().toEpochDay()
        if (playedToday) {
            alarm.setAt(tomorrow(now))
            return null
        }
        store.unanswered += 1
        if (store.unanswered < MAX_UNANSWERED) alarm.setAt(tomorrow(now))
        return message()
    }

    /** El teléfono se reinició (las alarmas se pierden): se vuelve a poner si corresponde. */
    fun restore(now: LocalDateTime) {
        if (store.enabled && store.unanswered < MAX_UNANSWERED) alarm.setAt(nextAfter(now))
    }

    private fun message(): String =
        if (store.streak >= 2) "Tu racha de ${store.streak} días te espera: abre el cofre de hoy."
        else "Tu cofre de hoy está listo y hay 3 misiones nuevas."

    /** La próxima vez que sean las 7 de la noche (hoy mismo si todavía no han pasado). */
    private fun nextAfter(now: LocalDateTime): LocalDateTime {
        val today = LocalDateTime.of(now.toLocalDate(), HOUR)
        val playedToday = store.lastOpenDay == now.toLocalDate().toEpochDay()
        return if (now.isBefore(today) && !playedToday) today else tomorrow(now)
    }

    private fun tomorrow(now: LocalDateTime): LocalDateTime =
        LocalDateTime.of(now.toLocalDate().plusDays(1), HOUR)

    companion object {
        val HOUR: LocalTime = LocalTime.of(19, 0)
        const val MAX_UNANSWERED = 3
        const val MAX_STREAK = 9999
        fun day(date: LocalDate): Long = date.toEpochDay()
    }
}

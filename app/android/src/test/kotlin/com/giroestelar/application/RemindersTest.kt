package com.giroestelar.application

import java.time.LocalDateTime
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue

private class FakeReminderStore : ReminderStore {
    override var enabled = false
    override var lastOpenDay = -1L
    override var unanswered = 0
    override var streak = 0
}

private class FakeAlarm : ReminderAlarm {
    var next: LocalDateTime? = null
    override fun setAt(time: LocalDateTime) { next = time }
    override fun cancel() { next = null }
}

class RemindersTest {
    private val store = FakeReminderStore()
    private val alarm = FakeAlarm()
    private val reminders = Reminders(store, alarm)
    private fun day(d: Int, hour: Int, minute: Int = 0) = LocalDateTime.of(2026, 11, d, hour, minute)

    @Test
    fun `apagado no pone alarma ni avisa`() {
        reminders.gameOpened(day(20, 10))
        assertNull(alarm.next)
        assertNull(reminders.alarmFired(day(21, 19)))
    }

    @Test
    fun `al encenderlo despues de jugar, el aviso queda para manana a las 7 de la noche`() {
        reminders.gameOpened(day(20, 10))
        reminders.setEnabled(true, day(20, 10, 5))
        assertEquals(day(21, 19), alarm.next)
    }

    @Test
    fun `si ese dia ya jugo no avisa, y deja la alarma para el dia siguiente`() {
        reminders.setEnabled(true, day(20, 9))
        reminders.gameOpened(day(21, 8))
        assertNull(reminders.alarmFired(day(21, 19)))
        assertEquals(day(22, 19), alarm.next)
    }

    @Test
    fun `si no jugo avisa una vez y programa el siguiente`() {
        reminders.gameOpened(day(20, 10))
        reminders.setEnabled(true, day(20, 10))
        assertEquals("Tu cofre de hoy está listo y hay 3 misiones nuevas.", reminders.alarmFired(day(21, 19)))
        assertEquals(day(22, 19), alarm.next)
    }

    @Test
    fun `el aviso nombra la racha cuando la hay`() {
        reminders.setEnabled(true, day(20, 10))
        reminders.noteStreak(5)
        assertEquals("Tu racha de 5 días te espera: abre el cofre de hoy.", reminders.alarmFired(day(21, 19)))
    }

    @Test
    fun `tras tres avisos sin respuesta deja de insistir, y al volver a jugar se retoma`() {
        reminders.gameOpened(day(20, 10))
        reminders.setEnabled(true, day(20, 10))
        assertNotNull(reminders.alarmFired(day(21, 19)))
        assertNotNull(reminders.alarmFired(day(22, 19)))
        alarm.next = null
        assertNotNull(reminders.alarmFired(day(23, 19)))
        assertNull(alarm.next, "después del tercero no queda alarma puesta")
        reminders.gameOpened(day(27, 15))
        assertEquals(day(28, 19), alarm.next)
        assertEquals(0, store.unanswered)
    }

    @Test
    fun `apagarlo quita la alarma`() {
        reminders.setEnabled(true, day(20, 10))
        assertTrue(reminders.enabled)
        reminders.setEnabled(false, day(20, 11))
        assertFalse(reminders.enabled)
        assertNull(alarm.next)
    }

    @Test
    fun `tras reiniciar el telefono la alarma se vuelve a poner`() {
        reminders.gameOpened(day(20, 10))
        reminders.setEnabled(true, day(20, 10))
        alarm.next = null
        reminders.restore(day(21, 7))
        assertEquals(day(21, 19), alarm.next, "aún no son las 7 y hoy no ha jugado: avisa hoy")
        alarm.next = null
        reminders.restore(day(21, 20))
        assertEquals(day(22, 19), alarm.next, "ya pasaron las 7: queda para mañana")
    }
}

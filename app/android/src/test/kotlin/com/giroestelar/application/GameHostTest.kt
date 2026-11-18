package com.giroestelar.application

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

private class FakeStore(var data: String? = null) : GameStateStore {
    override fun load() = data
    override fun save(json: String) { data = json }
}

private class FakeHaptics : Haptics {
    val calls = mutableListOf<Long>()
    override fun vibrate(milliseconds: Long) { calls += milliseconds }
}

class GameHostTest {
    @Test
    fun `guarda y devuelve el progreso del juego`() {
        val store = FakeStore()
        val host = GameHost(store, FakeHaptics())
        assertNull(host.loadState())
        assertTrue(host.saveState("""{"coins":160,"topTimes":[95]}"""))
        assertEquals("""{"coins":160,"topTimes":[95]}""", host.loadState())
    }

    @Test
    fun `no guarda datos que no son el estado del juego`() {
        val store = FakeStore("""{"coins":100}""")
        val host = GameHost(store, FakeHaptics())
        assertFalse(host.saveState("hola"))
        assertFalse(host.saveState(""))
        assertFalse(host.saveState("{" + "x".repeat(GameHost.MAX_STATE_CHARS) + "}"))
        assertEquals("""{"coins":100}""", store.data, "lo guardado antes no se pisa")
    }

    @Test
    fun `si lo guardado esta danado se trata como partida nueva`() {
        assertNull(GameHost(FakeStore("basura"), FakeHaptics()).loadState())
    }

    @Test
    fun `la vibracion se limita y se ignoran valores invalidos`() {
        val haptics = FakeHaptics()
        val host = GameHost(FakeStore(), haptics)
        host.vibrate(60)
        host.vibrate(999_999)
        host.vibrate(0)
        host.vibrate(-5)
        assertEquals(listOf(60L, GameHost.MAX_VIBRATION_MS), haptics.calls)
    }
}

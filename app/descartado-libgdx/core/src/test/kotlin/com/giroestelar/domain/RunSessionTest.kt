package com.giroestelar.domain

import com.giroestelar.domain.progression.Balance
import com.giroestelar.domain.progression.GameMode
import com.giroestelar.domain.run.Field
import com.giroestelar.domain.run.Rock
import com.giroestelar.domain.run.RunEvent
import com.giroestelar.domain.run.RunSession
import com.giroestelar.domain.run.RunStatus
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

private fun rockAt(x: Float, y: Float, r: Float = 15f, vy: Float = 0f) =
    Rock(id = 9999, x = x, y = y, r = r, vx = 0f, vy = vy, rot = 0f, spin = 0f, wall = false, variant = 0)

/** Simula una partida con un jugador que se mueve en zigzag. */
private fun play(seed: Int, mode: GameMode, seconds: Float): RunSession {
    val s = RunSession(mode, seed, demo = true)
    var t = 0f
    while (t < seconds) {
        s.moveBy(if ((t * 2).toInt() % 2 == 0) 3f else -3f, 0f)
        s.tick(1 / 60f)
        t += 1 / 60f
    }
    return s
}

class RunSessionTest {
    @Test
    fun `misma semilla y mismas acciones dan la misma partida`() {
        val a = play(123, GameMode.SURVIVAL, 40f)
        val b = play(123, GameMode.SURVIVAL, 40f)
        assertEquals(a.points, b.points)
        assertEquals(a.dodged, b.dodged)
        assertEquals(a.rocks.map { it.x to it.y }, b.rocks.map { it.x to it.y })
        assertTrue(a.dodged > 20, "debería haber esquivado varias rocas")
    }

    @Test
    fun `una roca encima de la nave la hace chocar`() {
        val s = RunSession(GameMode.ADVENTURE, 1)
        s.rocks += rockAt(s.shipX, s.shipY)
        s.tick(0.016f)
        assertEquals(RunStatus.CRASHED, s.status)
        assertTrue(s.drainEvents().any { it is RunEvent.Crashed })
        s.tick(1f)
        assertEquals(RunStatus.CRASHED, s.status, "una partida chocada no sigue avanzando")
    }

    @Test
    fun `pasar rozando da CASI, combo, puntos y monedas`() {
        val s = RunSession(GameMode.ADVENTURE, 1)
        // roca justo al lado, ya un poco detrás de la nave
        s.rocks += rockAt(s.shipX + Field.SHIP_RADIUS + 15f + 10f, s.shipY + 12f)
        s.tick(0.016f)
        assertEquals(1, s.nearMisses)
        assertEquals(1, s.combo)
        assertTrue(s.drainEvents().any { it is RunEvent.NearMiss })
        assertEquals(1, s.coins)
    }

    @Test
    fun `en modo demo no se muere`() {
        val s = RunSession(GameMode.ADVENTURE, 1, demo = true)
        s.rocks += rockAt(s.shipX, s.shipY)
        s.tick(0.016f)
        assertEquals(RunStatus.PLAYING, s.status)
        assertTrue(s.drainEvents().any { it is RunEvent.Smashed })
    }

    @Test
    fun `en Supervivencia el casco aguanta el golpe`() {
        val s = RunSession(GameMode.SURVIVAL, 1)
        s.rocks += rockAt(s.shipX, s.shipY)
        s.tick(0.016f)
        assertEquals(RunStatus.PLAYING, s.status)
        assertEquals(100 - Balance.HULL_DAMAGE_ROCK, assertNotNull(s.hull).percent)
        assertTrue(s.rocks.none { it.id == 9999 })
    }

    @Test
    fun `revivir funciona una sola vez y despeja alrededor`() {
        val s = RunSession(GameMode.ADVENTURE, 1)
        s.rocks += rockAt(s.shipX, s.shipY)
        s.tick(0.016f)
        assertTrue(s.revive())
        assertEquals(RunStatus.PLAYING, s.status)
        assertTrue(s.rocks.isEmpty())
        s.rocks += rockAt(s.shipX, s.shipY)
        s.tick(0.016f)
        assertEquals(RunStatus.PLAYING, s.status, "recién revivido es invulnerable")
        s.tick(3f)
        s.rocks += rockAt(s.shipX, s.shipY)
        s.tick(0.016f)
        assertEquals(RunStatus.CRASHED, s.status)
        assertFalse(s.revive())
    }

    @Test
    fun `la nave no sale de la pista`() {
        val s = RunSession(GameMode.ADVENTURE, 1)
        s.moveBy(-10_000f, 10_000f)
        repeat(60) { s.tick(1 / 60f) }
        assertEquals(Field.MIN_X, s.targetX)
        assertEquals(Field.MAX_Y, s.targetY)
        s.hold(1f, -1f)
        repeat(300) { s.tick(1 / 60f) }
        assertEquals(Field.MAX_X, s.targetX)
        assertEquals(Field.MIN_Y, s.targetY)
    }

    @Test
    fun `Aventura termina al llegar a la meta y anuncia las fases`() {
        val s = play(7, GameMode.ADVENTURE, 600f)
        assertEquals(RunStatus.FINISHED, s.status)
        val events = s.drainEvents()
        assertTrue(events.any { it is RunEvent.GoalReached })
        assertTrue(events.any { it is RunEvent.WallIncoming })
    }

    @Test
    fun `Supervivencia avanza de nivel con el tiempo`() {
        val s = play(7, GameMode.SURVIVAL, 40f)
        assertEquals(3, s.level)
        val titles = s.drainEvents().filterIsInstance<RunEvent.PhaseChanged>().map { it.title }
        assertEquals(listOf("Nivel 1", "Nivel 2", "Nivel 3"), titles)
    }
}

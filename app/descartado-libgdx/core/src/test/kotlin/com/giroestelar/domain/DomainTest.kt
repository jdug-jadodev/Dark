package com.giroestelar.domain

import com.giroestelar.domain.profile.ControlScheme
import com.giroestelar.domain.profile.Profile
import com.giroestelar.domain.profile.ProfileData
import com.giroestelar.domain.profile.ProfileException
import com.giroestelar.domain.progression.Difficulty
import com.giroestelar.domain.progression.GameMode
import com.giroestelar.domain.shared.SeededRandom
import com.giroestelar.domain.shared.TopResult
import com.giroestelar.domain.shared.insertTop
import com.giroestelar.domain.ship.Hull
import com.giroestelar.domain.ship.NitroTank
import java.time.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertTrue

private fun day(s: String) = LocalDate.parse(s)

class SeededRandomTest {
    @Test
    fun `misma semilla, misma secuencia (base del multijugador)`() {
        val a = SeededRandom(42)
        val b = SeededRandom(42)
        repeat(50) { assertEquals(a.next(), b.next()) }
    }

    @Test
    fun `da los mismos numeros que el prototipo en JavaScript`() {
        val r = SeededRandom(42)
        assertEquals(0.6011037519201636, r.next(), 1e-15)
        assertEquals(0.44829055899754167, r.next(), 1e-15)
        assertEquals(0.8524657934904099, r.next(), 1e-15)
    }

    @Test
    fun `semillas distintas, secuencias distintas`() {
        assertNotEquals(SeededRandom(1).next(), SeededRandom(2).next())
        val r = SeededRandom(7)
        repeat(1000) { val v = r.next(); assertTrue(v >= 0.0 && v < 1.0) }
    }
}

class RankingTest {
    @Test
    fun `ordena, recorta a 5 y marca record solo si supera al primero`() {
        assertEquals(TopResult(listOf(30), 0, true), insertTop(emptyList(), 30))
        assertEquals(TopResult(listOf(50, 45, 40), 1, false), insertTop(listOf(50, 40), 45))
        assertFalse(insertTop(listOf(50), 50).isRecord)
        val r = insertTop(listOf(90, 80, 70, 60, 50), 10)
        assertEquals(-1, r.rank)
        assertEquals(listOf(90, 80, 70, 60, 50), r.list)
    }
}

class DifficultyTest {
    @Test
    fun `progreso por puntos en Aventura y por tiempo en Supervivencia`() {
        assertEquals(50f, Difficulty.progressOf(GameMode.ADVENTURE, 160f, 999f))
        assertEquals(70f, Difficulty.progressOf(GameMode.SURVIVAL, 0f, 100f), 1e-4f)
    }

    @Test
    fun `niveles cada 12 por ciento`() {
        assertEquals(1, Difficulty.levelOf(0f))
        assertEquals(1, Difficulty.levelOf(11.9f))
        assertEquals(2, Difficulty.levelOf(12f))
    }

    @Test
    fun `velocidad y frecuencia de rocas con topes`() {
        assertEquals(235f, Difficulty.speedAt(0f))
        assertEquals(680f, Difficulty.speedAt(10_000f))
        assertEquals(0.72f, Difficulty.rockIntervalAt(0f), 1e-5f)
        assertEquals(0.2f, Difficulty.rockIntervalAt(10_000f))
    }

    @Test
    fun `tope de naves por nivel y mas suave con la pantalla girada`() {
        assertEquals(2, Difficulty.enemyCap(GameMode.SURVIVAL, 1, false))
        assertEquals(4, Difficulty.enemyCap(GameMode.SURVIVAL, 10, false))
        assertEquals(5, Difficulty.enemyCap(GameMode.SURVIVAL, 24, false))
        assertEquals(Int.MAX_VALUE, Difficulty.enemyCap(GameMode.SURVIVAL, 30, false))
        assertEquals(2, Difficulty.enemyCap(GameMode.SURVIVAL, 24, true))
        assertEquals(4, Difficulty.enemyCap(GameMode.SURVIVAL, 35, true))
        assertEquals(6, Difficulty.enemyCap(GameMode.ADVENTURE, 1, false))
    }

    @Test
    fun `combo de 1 a 4`() {
        assertEquals(1, Difficulty.comboMultiplier(0))
        assertEquals(2, Difficulty.comboMultiplier(3))
        assertEquals(4, Difficulty.comboMultiplier(50))
    }
}

class ShipTest {
    @Test
    fun `el casco aguanta hasta 0 y repara por nivel sin pasar de 100`() {
        val h = Hull()
        assertTrue(h.hit(18))
        assertEquals(82, h.percent)
        assertEquals(15, h.repairForLevel())
        assertEquals(3, h.repairForLevel())
        assertEquals(100, h.percent)
        repeat(9) { h.hit(10) }
        assertFalse(h.hit(10))
        assertTrue(h.destroyed)
        h.restoreAfterRevive()
        assertEquals(50, h.percent)
    }

    @Test
    fun `el nitro se llena con CASI y cada uso gasta la mitad`() {
        val n = NitroTank()
        assertFalse(n.use())
        n.fill(20); n.fill(20)
        assertFalse(n.ready)
        n.fill(20)
        assertTrue(n.use())
        assertEquals(10, n.percent)
        n.fill(500)
        assertEquals(100, n.percent)
    }
}

class ProfileTest {
    @Test
    fun `empieza con 100 monedas y control deslizar`() {
        val p = Profile.create()
        assertEquals(Profile.START_COINS, p.coins)
        assertEquals(ControlScheme.SWIPE, p.control)
    }

    @Test
    fun `cofre - la racha sube en dias seguidos y se reinicia si se salta un dia`() {
        val p = Profile.create()
        assertEquals(30, p.openChest(day("2026-11-16")))
        assertFalse(p.canOpenChest(day("2026-11-16")))
        assertFailsWith<ProfileException> { p.openChest(day("2026-11-16")) }
        assertEquals(40, p.openChest(day("2026-11-17")))
        assertEquals(50, p.openChest(day("2026-11-18")))
        assertEquals(3, p.streak)
        assertEquals(30, p.openChest(day("2026-11-21")))
        assertEquals(1, p.streak)
    }

    @Test
    fun `cofre - la racha cruza cambio de mes y de ano`() {
        val p = Profile.create()
        p.openChest(day("2026-12-31"))
        assertEquals(40, p.openChest(day("2027-01-01")))
    }

    @Test
    fun `cofre - se duplica una sola vez y solo el mismo dia`() {
        val p = Profile.create()
        val today = day("2026-11-18")
        assertFalse(p.canDoubleChest(today))
        p.openChest(today)
        val before = p.coins
        assertEquals(30, p.doubleChest(today))
        assertEquals(before + 30, p.coins)
        assertFalse(p.canDoubleChest(today))
        assertFalse(p.canDoubleChest(day("2026-11-19")))
    }

    @Test
    fun `mision de 50 esquivados paga una sola vez`() {
        val p = Profile.create()
        assertFalse(p.addDodges(30))
        assertTrue(p.addDodges(Profile.MISSION_GOAL))
        assertEquals(Profile.START_COINS + Profile.MISSION_REWARD, p.coins)
        assertFalse(p.addDodges(100))
    }

    @Test
    fun `records de cada modo`() {
        val p = Profile.create()
        assertTrue(p.recordAdventure(120))
        assertFalse(p.recordAdventure(80))
        assertTrue(p.recordSurvival(95).isRecord)
        assertEquals(1, p.recordSurvival(60).rank)
        assertEquals(listOf(841), p.recordSpace(841).list)
    }

    @Test
    fun `se restaura igual y corrige datos danados`() {
        val p = Profile.create()
        p.addCoins(50); p.setControl(ControlScheme.BUTTONS); p.recordSurvival(100)
        assertEquals(p.toData(), Profile.restore(p.toData()).toData())

        val broken = Profile.restore(ProfileData(coins = -5, streak = -2, survivalTop = listOf(3, -1, 9, 8, 7, 6, 5)))
        assertEquals(Profile.START_COINS, broken.coins)
        assertEquals(0, broken.streak)
        assertEquals(listOf(9, 8, 7, 6, 5), broken.survivalTop)
    }

    @Test
    fun `no acepta monedas negativas`() {
        assertFailsWith<ProfileException> { Profile.create().addCoins(-1) }
    }
}

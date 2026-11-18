package com.giroestelar.domain.run

import com.giroestelar.domain.progression.Balance
import com.giroestelar.domain.progression.Difficulty
import com.giroestelar.domain.progression.GameMode
import com.giroestelar.domain.shared.SeededRandom
import com.giroestelar.domain.ship.Hull
import kotlin.math.floor
import kotlin.math.hypot
import kotlin.math.max
import kotlin.math.min

/** Lo que pasó durante un paso de la partida (la pantalla lo usa para efectos y avisos). */
sealed interface RunEvent {
    data class NearMiss(val x: Float, val y: Float, val bonus: Int) : RunEvent
    data class CoinPicked(val x: Float, val y: Float) : RunEvent
    data class HullHit(val x: Float, val y: Float, val damage: Int) : RunEvent
    /** Modo demo: la roca se rompe en vez de matar. */
    data class Smashed(val x: Float, val y: Float) : RunEvent
    data class Crashed(val x: Float, val y: Float) : RunEvent
    data class PhaseChanged(val title: String, val tip: String) : RunEvent
    data class LevelUp(val level: Int, val repaired: Int) : RunEvent
    data object WallIncoming : RunEvent
    data object GoalReached : RunEvent
}

enum class RunStatus { PLAYING, CRASHED, FINISHED }

/**
 * Una partida de Aventura o Supervivencia (motor base: rocas, paredes, monedas,
 * ¡CASI!, combo, casco). Pura y determinista: misma semilla + mismas acciones
 * = misma partida. No sabe nada de pantallas ni de tiempo real: avanza con [tick].
 */
class RunSession(
    val mode: GameMode,
    seed: Int,
    /** Modo demo: no se muere (para ver todo el flujo). */
    val demo: Boolean = false,
) {
    init {
        require(mode == GameMode.ADVENTURE || mode == GameMode.SURVIVAL) { "Modo no soportado todavía: $mode" }
    }

    private val rng = SeededRandom(seed)
    private val events = ArrayList<RunEvent>()

    var status = RunStatus.PLAYING; private set
    var time = 0f; private set
    var points = 0f; private set
    var coins = 0; private set
    var combo = 0; private set
    var bestCombo = 0; private set
    var nearMisses = 0; private set
    var dodged = 0; private set
    var revived = false; private set
    var speed = Difficulty.speedAt(0f); private set

    /** Casco: solo en Supervivencia. */
    val hull: Hull? = if (mode == GameMode.SURVIVAL) Hull() else null

    var shipX = Field.W / 2; private set
    var shipY = Field.SHIP_Y; private set
    var targetX = shipX; private set
    var targetY = shipY; private set
    /** Segundos de invulnerabilidad (después de un golpe o de revivir). */
    var invulnerable = 0f; private set

    val rocks = ArrayList<Rock>()
    val coinItems = ArrayList<Coin>()

    private var nextId = 0
    private var rockTimer = 0.6f
    private var coinTimer = 3f
    private var wallIndex = 0
    private var nextWallAt = 0f
    private var phase = -1
    private var comboTimer = 0f
    private var holdX = 0f
    private var holdY = 0f

    val progress: Float get() = Difficulty.progressOf(mode, points, time)
    val level: Int get() = Difficulty.levelOf(progress)
    val multiplier: Int get() = Difficulty.comboMultiplier(combo)

    /** Entrega y limpia los eventos acumulados. */
    fun drainEvents(): List<RunEvent> = events.toList().also { events.clear() }

    /* ---------- control de la nave ---------- */

    /** Deslizar: mueve el objetivo de la nave (en unidades del plano). */
    fun moveBy(dx: Float, dy: Float) {
        targetX = (targetX + dx).coerceIn(Field.MIN_X, Field.MAX_X)
        targetY = (targetY + dy).coerceIn(Field.MIN_Y, Field.MAX_Y)
    }

    /** Flechas: dirección mantenida (-1, 0 o 1 en cada eje; y positiva = hacia atrás). */
    fun hold(dirX: Float, dirY: Float) {
        holdX = dirX.coerceIn(-1f, 1f)
        holdY = dirY.coerceIn(-1f, 1f)
    }

    /* ---------- paso de la partida ---------- */

    fun tick(dt: Float) {
        if (status != RunStatus.PLAYING) return
        time += dt
        val x = progress
        updatePhase(x)

        if (holdX != 0f || holdY != 0f) moveBy(holdX * Field.BUTTON_SPEED * dt, holdY * Field.BUTTON_SPEED * dt)
        val k = min(1f, dt * Field.SHIP_FOLLOW)
        shipX += (targetX - shipX) * k
        shipY += (targetY - shipY) * k
        invulnerable = max(0f, invulnerable - dt)

        speed = Difficulty.speedAt(x)
        spawn(dt, x)
        if (combo > 0) {
            comboTimer -= dt
            if (comboTimer <= 0f) combo = 0
        }
        if (moveRocksAndCollide(dt)) return
        moveCoins(dt)

        if (mode == GameMode.ADVENTURE && points >= Balance.ADVENTURE_GOAL) {
            status = RunStatus.FINISHED
            events += RunEvent.GoalReached
        }
    }

    /** Revivir (una vez por partida, después de ver un anuncio). */
    fun revive(): Boolean {
        if (status != RunStatus.CRASHED || revived) return false
        revived = true
        status = RunStatus.PLAYING
        invulnerable = 2.5f
        rocks.removeAll { hypot(it.x - shipX, it.y - shipY) < 150f }
        hull?.restoreAfterRevive()
        return true
    }

    private fun updatePhase(x: Float) {
        if (mode == GameMode.SURVIVAL) {
            val lv = level
            if (lv != phase) {
                val repaired = if (phase != -1) hull?.repairForLevel() ?: 0 else 0
                phase = lv
                val tip = if (lv == Balance.UNCAPPED_LEVEL) "¡Sin límite de naves! A ver cuánto aguantas"
                else Phases.SURVIVAL_TIPS[min(lv - 1, Phases.SURVIVAL_TIPS.size - 1)]
                events += RunEvent.PhaseChanged("Nivel $lv", tip)
                if (repaired > 0) events += RunEvent.LevelUp(lv, repaired)
            }
        } else {
            val idx = Phases.ADVENTURE.indexOfLast { x >= it.at }
            if (idx != phase) {
                phase = idx
                val p = Phases.ADVENTURE[idx]
                events += RunEvent.PhaseChanged(p.name, p.tip)
            }
        }
    }

    private fun spawn(dt: Float, x: Float) {
        rockTimer -= dt
        if (rockTimer <= 0f) {
            rockTimer = Difficulty.rockIntervalAt(x) * rng.range(0.8, 1.2).toFloat()
            spawnRock()
            if (x >= 35f && rng.chance(0.3)) spawnRock()
        }
        coinTimer -= dt
        if (coinTimer <= 0f) {
            coinTimer = rng.range(4.5, 7.0).toFloat()
            spawnCoins()
        }
        if (wallIndex < Phases.WALLS.size && x >= Phases.WALLS[wallIndex]) {
            spawnWall(); wallIndex++
            nextWallAt = x + rng.range(9.0, 13.0).toFloat()
        } else if (mode == GameMode.SURVIVAL && wallIndex >= Phases.WALLS.size && x >= nextWallAt) {
            spawnWall()
            nextWallAt = x + rng.range(9.0, 13.0).toFloat()
        }
    }

    private fun spawnRock() {
        val r = rng.range(12.0, 26.0).toFloat()
        val vx = if (time > 5f && rng.chance(0.5)) rng.range(-95.0, 95.0).toFloat() else 0f
        rocks += Rock(
            id = nextId++, x = rng.range((r + 4).toDouble(), (Field.W - r - 4).toDouble()).toFloat(),
            y = -Field.SPAWN - r, r = r, vx = vx, vy = speed * rng.range(0.85, 1.2).toFloat(),
            rot = rng.range(0.0, 6.28).toFloat(), spin = rng.range(-2.0, 2.0).toFloat(), wall = false,
            variant = (rng.next() * 6).toInt(),
        )
    }

    /** Pared de 7 rocas con un hueco de 2 por donde pasar. */
    private fun spawnWall() {
        val gap = floor(rng.range(0.0, 6.0)).toInt()
        for (i in 0 until 7) {
            if (i == gap || i == gap + 1) continue
            rocks += Rock(
                id = nextId++, x = 26f + i * 51.3f, y = -Field.SPAWN - 25f, r = 25f, vx = 0f, vy = speed * 0.9f,
                rot = rng.range(0.0, 6.0).toFloat(), spin = rng.range(-0.6, 0.6).toFloat(), wall = true,
                variant = (rng.next() * 6).toInt(),
            )
        }
        events += RunEvent.WallIncoming
    }

    /** Monedas: grupos de 1 a 3, bien separadas. */
    private fun spawnCoins() {
        val x = rng.range(30.0, (Field.W - 30).toDouble()).toFloat()
        val n = 1 + (rng.next() * 3).toInt()
        for (i in 0 until n) coinItems += Coin(nextId++, x, -Field.SPAWN - i * 48f, speed * 0.6f)
    }

    /** Devuelve true si la nave chocó (fin del paso). */
    private fun moveRocksAndCollide(dt: Float): Boolean {
        for (o in rocks) {
            o.x += o.vx * dt
            o.y += o.vy * dt * Field.approach(o.y)
            o.rot += o.spin * dt
            if ((o.x < o.r && o.vx < 0) || (o.x > Field.W - o.r && o.vx > 0)) o.vx = -o.vx
        }
        var i = rocks.size - 1
        while (i >= 0) {
            val o = rocks[i]
            val d = hypot(o.x - shipX, o.y - shipY) - o.r - Field.SHIP_RADIUS
            if (d <= 0f) {
                when {
                    invulnerable > 0f -> Unit
                    demo -> { events += RunEvent.Smashed(o.x, o.y); rocks.removeAt(i); i--; continue }
                    hull != null && hull.hit(Balance.HULL_DAMAGE_ROCK) -> {
                        invulnerable = 0.9f
                        events += RunEvent.HullHit(o.x, o.y, Balance.HULL_DAMAGE_ROCK)
                        rocks.removeAt(i); i--; continue
                    }
                    else -> {
                        status = RunStatus.CRASHED
                        events += RunEvent.Crashed(shipX, shipY)
                        return true
                    }
                }
            } else {
                if (d < 16f && !o.nearMissed) o.close = true
                if (o.close && !o.nearMissed && o.y > shipY + o.r * 0.6f) {
                    o.nearMissed = true
                    nearMisses++
                    combo++
                    bestCombo = max(bestCombo, combo)
                    comboTimer = 5f
                    val bonus = multiplier
                    coins += bonus
                    points += bonus
                    events += RunEvent.NearMiss(shipX, shipY, bonus)
                }
            }
            if (o.y > Field.H + 50f) {
                rocks.removeAt(i)
                dodged++
                points += 0.5f
            }
            i--
        }
        return false
    }

    private fun moveCoins(dt: Float) {
        var i = coinItems.size - 1
        while (i >= 0) {
            val c = coinItems[i]
            c.y += c.vy * dt * Field.approach(c.y)
            if (hypot(c.x - shipX, c.y - shipY) < 20f) {
                coins += multiplier
                points += 0.25f
                events += RunEvent.CoinPicked(c.x, c.y)
                coinItems.removeAt(i)
            } else if (c.y > Field.H + 20f) {
                coinItems.removeAt(i)
            }
            i--
        }
    }
}

package com.giroestelar.application.usecases

import com.giroestelar.application.ports.AdsService
import com.giroestelar.application.ports.ProfileRepository
import com.giroestelar.domain.profile.Profile
import com.giroestelar.domain.progression.GameMode
import com.giroestelar.domain.run.RunSession
import com.giroestelar.domain.run.RunStatus

/** Resumen de una partida terminada, para la pantalla final. */
data class RunSummary(
    val mode: GameMode,
    val points: Int,
    val seconds: Int,
    val level: Int,
    val coinsGained: Int,
    val dodged: Int,
    val nearMisses: Int,
    val bestCombo: Int,
    /** Llegó a la meta de Aventura. */
    val won: Boolean,
    val isRecord: Boolean,
    /** Puesto en el top 5 de Supervivencia (0 = primero, -1 = no entró). */
    val rank: Int,
    /** Top 5 de Supervivencia, en segundos (vacío en Aventura). */
    val top: List<Int>,
    /** Mejor puntaje de Aventura (después de esta partida). */
    val best: Int,
    val missionCompleted: Boolean,
    val missionProgress: Int,
)

/** Empieza una partida nueva. La semilla viene de afuera (reloj, o un reto/multijugador). */
class StartRun {
    operator fun invoke(mode: GameMode, demo: Boolean, seed: Int): RunSession = RunSession(mode, seed, demo)
}

/** Cierra la partida: suma monedas, misión y récords al perfil. */
class FinishRun(private val repo: ProfileRepository) {
    operator fun invoke(run: RunSession): RunSummary {
        val p = repo.load()
        p.addCoins(run.coins)
        val missionDone = p.addDodges(run.dodged)
        val seconds = run.time.toInt()
        val points = run.points.toInt()
        val won = run.status == RunStatus.FINISHED
        var record = false
        var rank = -1
        var top = emptyList<Int>()
        if (run.mode == GameMode.SURVIVAL) {
            val r = p.recordSurvival(seconds)
            record = r.isRecord; rank = r.rank; top = r.list
        } else {
            record = p.recordAdventure(points)
        }
        repo.save(p)
        return RunSummary(
            mode = run.mode, points = points, seconds = seconds, level = run.level, coinsGained = run.coins,
            dodged = run.dodged, nearMisses = run.nearMisses, bestCombo = run.bestCombo, won = won,
            isRecord = record, rank = rank, top = top, best = p.adventureBest,
            missionCompleted = missionDone, missionProgress = p.missionProgress,
        )
    }
}

/** Salir a mitad de partida: se conservan las monedas, pero no cuenta para récords ni misión. */
class QuitRun(private val repo: ProfileRepository) {
    operator fun invoke(run: RunSession) {
        val p = repo.load()
        p.addCoins(run.coins)
        repo.save(p)
    }
}

/** Revivir una vez por partida viendo un anuncio. */
class ReviveRun(private val ads: AdsService) {
    fun canRevive(run: RunSession) = run.status == RunStatus.CRASHED && !run.revived

    operator fun invoke(run: RunSession, onDone: (revived: Boolean) -> Unit) {
        if (!canRevive(run)) return onDone(false)
        ads.showRewarded("Recompensa: revivir y seguir la partida") { watched ->
            onDone(watched && run.revive())
        }
    }
}

/** Duplicar las monedas de la partida viendo un anuncio. */
class DoubleRunCoins(private val repo: ProfileRepository, private val ads: AdsService) {
    operator fun invoke(amount: Int, onDone: (gained: Int?) -> Unit) {
        if (amount <= 0) return onDone(null)
        ads.showRewarded("Recompensa: duplicar las monedas de esta partida (+$amount monedas)") { watched ->
            if (!watched) return@showRewarded onDone(null)
            val p: Profile = repo.load()
            p.addCoins(amount)
            repo.save(p)
            onDone(amount)
        }
    }
}

package com.giroestelar.application.usecases

import com.giroestelar.application.ports.AdsService
import com.giroestelar.application.ports.Clock
import com.giroestelar.application.ports.ProfileRepository
import com.giroestelar.domain.profile.ControlScheme
import com.giroestelar.domain.profile.Profile

/* Casos de uso del perfil y del menú. Solo hablan con puertos, nunca con pantallas. */

class GetProfile(private val repo: ProfileRepository) {
    operator fun invoke(): Profile = repo.load()
}

class ChangeControlScheme(private val repo: ProfileRepository) {
    operator fun invoke(control: ControlScheme): Profile =
        repo.load().also { it.setControl(control); repo.save(it) }
}

sealed interface ChestState {
    val reward: Int
    val streak: Int

    data class Available(override val reward: Int, override val streak: Int) : ChestState
    data class Opened(val canDouble: Boolean, override val reward: Int, override val streak: Int) : ChestState
}

class GetChestState(private val repo: ProfileRepository, private val clock: Clock) {
    operator fun invoke(): ChestState {
        val p = repo.load()
        val today = clock.today()
        return if (p.canOpenChest(today)) ChestState.Available(p.chestRewardFor(today), p.streak)
        else ChestState.Opened(p.canDoubleChest(today), p.chestRewardFor(today), p.streak)
    }
}

class OpenDailyChest(private val repo: ProfileRepository, private val clock: Clock) {
    operator fun invoke(): Int {
        val p = repo.load()
        val reward = p.openChest(clock.today())
        repo.save(p)
        return reward
    }
}

/** Duplica el cofre de hoy, solo si el jugador ve el anuncio completo. */
class DoubleDailyChest(
    private val repo: ProfileRepository,
    private val clock: Clock,
    private val ads: AdsService,
) {
    /** @param onDone premio recibido, o null si no se pudo o no vio el anuncio */
    operator fun invoke(onDone: (Int?) -> Unit) {
        val today = clock.today()
        val before = repo.load()
        if (!before.canDoubleChest(today)) return onDone(null)
        ads.showRewarded("Recompensa: duplicar el cofre diario (+${before.chestRewardFor(today)} monedas)") { watched ->
            if (!watched) return@showRewarded onDone(null)
            val p = repo.load()
            if (!p.canDoubleChest(today)) return@showRewarded onDone(null)
            val reward = p.doubleChest(today)
            repo.save(p)
            onDone(reward)
        }
    }
}

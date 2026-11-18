package com.giroestelar.domain.profile

import com.giroestelar.domain.shared.TopResult
import com.giroestelar.domain.shared.insertTop
import java.time.LocalDate
import java.time.temporal.ChronoUnit

enum class ControlScheme { SWIPE, BUTTONS }

/** Datos del perfil tal como se guardan (el adaptador de guardado decide el formato). */
data class ProfileData(
    val coins: Int = Profile.START_COINS,
    /** Días seguidos abriendo el cofre. */
    val streak: Int = 0,
    val lastChestDay: LocalDate? = null,
    val chestDoubledDay: LocalDate? = null,
    val missionProgress: Int = 0,
    val missionPaid: Boolean = false,
    val adventureBest: Int = 0,
    val bossWins: Int = 0,
    /** Top 5 de Supervivencia, en segundos. */
    val survivalTop: List<Int> = emptyList(),
    /** Top 5 de Viaje espacial, en km. */
    val spaceTop: List<Int> = emptyList(),
    val control: ControlScheme = ControlScheme.SWIPE,
)

class ProfileException(message: String) : IllegalStateException(message)

/** Perfil del jugador: monedas, récords, racha del cofre, misión y preferencias. */
class Profile private constructor(private var d: ProfileData) {

    companion object {
        const val START_COINS = 100
        const val MISSION_GOAL = 50
        const val MISSION_REWARD = 20

        fun create(): Profile = Profile(ProfileData())

        /** Reconstruye desde datos guardados; corrige valores dañados en vez de fallar. */
        fun restore(raw: ProfileData): Profile = Profile(
            raw.copy(
                coins = raw.coins.takeIf { it >= 0 } ?: START_COINS,
                streak = raw.streak.coerceAtLeast(0),
                missionProgress = raw.missionProgress.coerceAtLeast(0),
                adventureBest = raw.adventureBest.coerceAtLeast(0),
                bossWins = raw.bossWins.coerceAtLeast(0),
                survivalTop = raw.survivalTop.filter { it >= 0 }.sortedDescending().take(5),
                spaceTop = raw.spaceTop.filter { it >= 0 }.sortedDescending().take(5),
            ),
        )
    }

    fun toData(): ProfileData = d

    /* ---------- lectura ---------- */
    val coins get() = d.coins
    val streak get() = d.streak
    val control get() = d.control
    val adventureBest get() = d.adventureBest
    val bossWins get() = d.bossWins
    val survivalTop: List<Int> get() = d.survivalTop
    val spaceTop: List<Int> get() = d.spaceTop
    val missionProgress get() = minOf(d.missionProgress, MISSION_GOAL)
    val missionPaid get() = d.missionPaid

    /* ---------- monedas y preferencias ---------- */
    fun addCoins(amount: Int) {
        if (amount < 0) throw ProfileException("Cantidad de monedas inválida")
        d = d.copy(coins = d.coins + amount)
    }

    fun setControl(control: ControlScheme) {
        d = d.copy(control = control)
    }

    /* ---------- récords ---------- */
    /** Devuelve true si es un nuevo récord de Aventura. */
    fun recordAdventure(points: Int): Boolean {
        if (points <= d.adventureBest) return false
        d = d.copy(adventureBest = points)
        return true
    }

    fun recordBossWin() {
        d = d.copy(bossWins = d.bossWins + 1)
    }

    fun recordSurvival(seconds: Int): TopResult =
        insertTop(d.survivalTop, seconds).also { d = d.copy(survivalTop = it.list) }

    fun recordSpace(km: Int): TopResult =
        insertTop(d.spaceTop, km).also { d = d.copy(spaceTop = it.list) }

    /* ---------- misión: esquivar 50 obstáculos ---------- */
    /** Suma esquivados. Devuelve true si con esto se completó la misión (y pagó la recompensa). */
    fun addDodges(count: Int): Boolean {
        d = d.copy(missionProgress = d.missionProgress + count.coerceAtLeast(0))
        if (d.missionPaid || d.missionProgress < MISSION_GOAL) return false
        d = d.copy(missionPaid = true, coins = d.coins + MISSION_REWARD)
        return true
    }

    /* ---------- cofre diario con racha ---------- */
    fun canOpenChest(today: LocalDate): Boolean = d.lastChestDay != today

    /** Premio que daría el cofre hoy (sube con la racha). */
    fun chestRewardFor(today: LocalDate): Int = rewardFor(streakIfOpened(today))

    /** Abre el cofre: actualiza la racha, suma monedas y devuelve el premio. */
    fun openChest(today: LocalDate): Int {
        if (!canOpenChest(today)) throw ProfileException("El cofre de hoy ya se abrió")
        val streak = streakIfOpened(today)
        val reward = rewardFor(streak)
        d = d.copy(streak = streak, lastChestDay = today, coins = d.coins + reward)
        return reward
    }

    fun canDoubleChest(today: LocalDate): Boolean = d.lastChestDay == today && d.chestDoubledDay != today

    /** Duplica el premio de hoy (después de ver un anuncio). */
    fun doubleChest(today: LocalDate): Int {
        if (!canDoubleChest(today)) throw ProfileException("No hay cofre para duplicar hoy")
        val reward = rewardFor(d.streak)
        d = d.copy(chestDoubledDay = today, coins = d.coins + reward)
        return reward
    }

    private fun rewardFor(streak: Int) = 20 + streak * 10

    /** Racha que quedaría si se abre hoy: sigue si ayer se abrió, si no vuelve a 1. */
    private fun streakIfOpened(today: LocalDate): Int {
        val last = d.lastChestDay ?: return 1
        if (last == today) return d.streak
        return if (ChronoUnit.DAYS.between(last, today) == 1L) d.streak + 1 else 1
    }
}

package com.giroestelar.adapters.storage

import com.badlogic.gdx.Gdx
import com.badlogic.gdx.Preferences
import com.giroestelar.application.ports.ProfileRepository
import com.giroestelar.domain.profile.ControlScheme
import com.giroestelar.domain.profile.Profile
import com.giroestelar.domain.profile.ProfileData
import java.time.LocalDate

/**
 * Guardado del perfil con Preferences de libGDX:
 * en Android usa SharedPreferences (guardado nativo), en PC un archivo en la carpeta del usuario.
 */
class GdxPreferencesProfileRepository(private val name: String = "giro_estelar_profile") : ProfileRepository {
    private val prefs: Preferences by lazy { Gdx.app.getPreferences(name) }

    override fun load(): Profile {
        val p = prefs
        if (!p.contains("coins")) return Profile.create()
        return Profile.restore(
            ProfileData(
                coins = p.getInteger("coins", Profile.START_COINS),
                streak = p.getInteger("streak", 0),
                lastChestDay = day(p.getString("lastChestDay", "")),
                chestDoubledDay = day(p.getString("chestDoubledDay", "")),
                missionProgress = p.getInteger("missionProgress", 0),
                missionPaid = p.getBoolean("missionPaid", false),
                adventureBest = p.getInteger("adventureBest", 0),
                bossWins = p.getInteger("bossWins", 0),
                survivalTop = ints(p.getString("survivalTop", "")),
                spaceTop = ints(p.getString("spaceTop", "")),
                control = runCatching { ControlScheme.valueOf(p.getString("control", "")) }.getOrDefault(ControlScheme.SWIPE),
            ),
        )
    }

    override fun save(profile: Profile) {
        val d = profile.toData()
        prefs.apply {
            putInteger("coins", d.coins)
            putInteger("streak", d.streak)
            putString("lastChestDay", d.lastChestDay?.toString() ?: "")
            putString("chestDoubledDay", d.chestDoubledDay?.toString() ?: "")
            putInteger("missionProgress", d.missionProgress)
            putBoolean("missionPaid", d.missionPaid)
            putInteger("adventureBest", d.adventureBest)
            putInteger("bossWins", d.bossWins)
            putString("survivalTop", d.survivalTop.joinToString(","))
            putString("spaceTop", d.spaceTop.joinToString(","))
            putString("control", d.control.name)
            flush()
        }
    }

    private fun day(s: String): LocalDate? = runCatching { LocalDate.parse(s) }.getOrNull()

    private fun ints(s: String): List<Int> = s.split(',').mapNotNull { it.trim().toIntOrNull() }
}

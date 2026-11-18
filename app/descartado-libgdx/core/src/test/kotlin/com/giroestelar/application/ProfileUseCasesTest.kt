package com.giroestelar.application

import com.giroestelar.application.ports.AdsService
import com.giroestelar.application.ports.Clock
import com.giroestelar.application.ports.ProfileRepository
import com.giroestelar.application.usecases.ChangeControlScheme
import com.giroestelar.application.usecases.ChestState
import com.giroestelar.application.usecases.DoubleDailyChest
import com.giroestelar.application.usecases.GetChestState
import com.giroestelar.application.usecases.GetProfile
import com.giroestelar.application.usecases.OpenDailyChest
import com.giroestelar.domain.profile.ControlScheme
import com.giroestelar.domain.profile.Profile
import com.giroestelar.domain.profile.ProfileData
import java.time.LocalDate
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

/** Guardado en memoria para pruebas. */
class InMemoryProfileRepository : ProfileRepository {
    private var data: ProfileData? = null
    override fun load(): Profile = data?.let { Profile.restore(it) } ?: Profile.create()
    override fun save(profile: Profile) { data = profile.toData() }
}

private fun clockAt(day: String) = object : Clock { override fun today(): LocalDate = LocalDate.parse(day) }

private class FakeAds(private val watches: Boolean) : AdsService {
    val shown = mutableListOf<String>()
    override fun showRewarded(reward: String, onResult: (Boolean) -> Unit) {
        shown += reward
        onResult(watches)
    }
}

class ProfileUseCasesTest {
    @Test
    fun `cambiar el control queda guardado`() {
        val repo = InMemoryProfileRepository()
        ChangeControlScheme(repo)(ControlScheme.BUTTONS)
        assertEquals(ControlScheme.BUTTONS, GetProfile(repo)().control)
    }

    @Test
    fun `abrir el cofre suma monedas y cambia el estado`() {
        val repo = InMemoryProfileRepository()
        val clock = clockAt("2026-11-18")
        assertTrue(GetChestState(repo, clock)() is ChestState.Available)
        assertEquals(30, OpenDailyChest(repo, clock)())
        assertEquals(ChestState.Opened(canDouble = true, reward = 30, streak = 1), GetChestState(repo, clock)())
        assertEquals(130, GetProfile(repo)().coins)
    }

    @Test
    fun `duplicar solo paga si se vio el anuncio completo y muestra que se gana`() {
        val repo = InMemoryProfileRepository()
        val clock = clockAt("2026-11-18")
        OpenDailyChest(repo, clock)()

        val skipped = FakeAds(watches = false)
        var got: Int? = -1
        DoubleDailyChest(repo, clock, skipped).invoke { got = it }
        assertNull(got)
        assertTrue(skipped.shown.single().contains("+30"))
        assertEquals(130, GetProfile(repo)().coins)

        DoubleDailyChest(repo, clock, FakeAds(true)).invoke { got = it }
        assertEquals(30, got)
        assertEquals(160, GetProfile(repo)().coins)

        DoubleDailyChest(repo, clock, FakeAds(true)).invoke { got = it }
        assertNull(got)
    }
}

package com.giroestelar.application.ports

import com.giroestelar.domain.profile.Profile
import java.time.LocalDate

/*
 * Puertos de salida: lo que la aplicación necesita del mundo exterior.
 * Cada uno tiene un adaptador concreto en el módulo `game` o `android`.
 */

/** Dónde se guarda el perfil (Preferences de libGDX: archivo en PC, SharedPreferences en Android). */
interface ProfileRepository {
    fun load(): Profile
    fun save(profile: Profile)
}

/** Anuncios (simulados hoy, AdMob más adelante). */
interface AdsService {
    /**
     * Muestra un anuncio con recompensa.
     * @param reward texto que explica qué gana, siempre visible antes de aceptar
     * @param onResult true solo si el jugador lo vio completo y se le debe dar el premio
     */
    fun showRewarded(reward: String, onResult: (watched: Boolean) -> Unit)
}

/** Fecha actual (en las pruebas se reemplaza por una fija). */
interface Clock {
    fun today(): LocalDate
}

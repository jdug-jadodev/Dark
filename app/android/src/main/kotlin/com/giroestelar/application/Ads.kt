package com.giroestelar.application

/**
 * Anuncios (AdMob): las reglas que no dependen de Android.
 *
 * La app muestra dos cosas: un video con premio, que el jugador pide, y una franja abajo.
 * Aquí se decide con qué identificadores se piden y cómo se le cuenta al juego en qué terminó
 * un video. Mostrar los anuncios es trabajo de AdsAdapters.kt.
 */
object Ads {
    /* Identificadores de prueba de Google: muestran anuncios de mentira, que se pueden ver y tocar
       sin riesgo. (Tocar anuncios de verdad en la app propia hace que Google cierre la cuenta.) */
    const val TEST_APP = "ca-app-pub-3940256099942544~3347511713"
    const val TEST_VIDEO = "ca-app-pub-3940256099942544/5224354917"
    const val TEST_BANNER = "ca-app-pub-3940256099942544/9214589741"

    /** Un video cargado hace más de este tiempo ya no sirve (Google los vence a la hora). */
    const val FRESH_MS = 50 * 60 * 1000L

    /** Cuánto se espera a que cargue un video que el jugador pidió y todavía no estaba listo. */
    const val WAIT_MS = 8000L

    private val UNIT = Regex("^ca-app-pub-\\d{16}/\\d{10}$")

    /** ¿Tiene la forma de un identificador de anuncio de AdMob? */
    fun validUnit(id: String): Boolean = UNIT.matches(id)

    /**
     * El identificador con el que se pide un anuncio. La app de pruebas usa siempre el de prueba;
     * la de publicación usa el configurado (app/anuncios.properties), y si no hay ninguno o está
     * mal escrito, también el de prueba: nunca se queda sin identificador.
     */
    fun unit(configured: String, test: String, debuggable: Boolean): String =
        if (!debuggable && validUnit(configured)) configured else test

    /**
     * En qué terminó un video, como lo entiende el juego: "earned" = lo vio y se ganó el premio,
     * "closed" = se mostró pero lo cerró antes, "none" = no se llegó a mostrar.
     */
    fun result(shown: Boolean, earned: Boolean): String = when {
        earned -> "earned"
        shown -> "closed"
        else -> "none"
    }

    /** ¿Sigue sirviendo un video que se cargó en [loadedAt]? */
    fun fresh(loadedAt: Long, now: Long): Boolean = now - loadedAt in 0 until FRESH_MS
}

package com.giroestelar.application

/**
 * La página del juego dentro de la app: de dónde se sirve y a dónde puede ir.
 *
 * El puente con Android (GiroNative) queda pegado a lo que sea que esté cargado en la ventana del
 * juego. Por eso esa ventana solo puede mostrar la página del juego, que va dentro de la app:
 * cualquier intento de llevarla a otra dirección se bloquea.
 */
object Page {
    /** La dirección local (sin internet) con la que se sirven los archivos de la app. */
    const val HOME = "https://appassets.androidplatform.net/assets/"
    const val GAME = HOME + "game/index.html"
    const val GAME_PATH = "/assets/game/index.html"

    /** ¿Esa dirección es parte del juego? Solo ahí puede navegar la ventana. */
    fun inside(url: String?): Boolean = url != null && url.startsWith(HOME)

    private val SERVER = Regex("^(https?://[A-Za-z0-9.-]{1,200}(:[0-9]{1,5})?)(/.*)?$")

    /** "http://192.168.1.5:8787/algo" → "http://192.168.1.5:8787"; null si no parece una dirección. */
    fun origin(server: String): String? = SERVER.find(server.trim())?.groupValues?.get(1)

    /**
     * Solo para la app de pruebas con un servidor de pruebas configurado: la página trae una
     * política de contenido que únicamente deja conectar con el servidor del juego; aquí se le
     * agrega ese servidor de pruebas. Si la dirección no sirve, la página queda como estaba.
     */
    fun allowServer(html: String, server: String): String {
        val extra = origin(server) ?: return html
        return html.replaceFirst("connect-src ", "connect-src $extra ")
    }
}

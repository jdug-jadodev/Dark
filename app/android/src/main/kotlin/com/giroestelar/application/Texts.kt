package com.giroestelar.application

/*
 * Lo poco que la app escribe por su cuenta: el aviso diario y el título del menú de compartir.
 * Todo lo demás lo escribe el juego (juego/src/core/i18n.js). Para que el aviso salga en el
 * mismo idioma que el juego, el juego le cuenta a la app cuál eligió el jugador.
 * Agregar un idioma al juego = agregar aquí su bloque.
 */

/** Los textos de la app en un idioma. */
class AppTexts(
    /** Nombre y explicación del tipo de aviso, como salen en los ajustes del teléfono. */
    val channel: String,
    val channelNote: String,
    /** Título del menú de compartir un reto. */
    val share: String,
    /** Avisos: la copa termina hoy (con el puesto), fin de semana, racha (con los días) y cofre. */
    val cupEnds: (Int) -> String,
    val weekend: String,
    val streak: (Int) -> String,
    val chest: String,
)

object Texts {
    private val all = mapOf(
        "es" to AppTexts(
            channel = "Recordatorio diario",
            channelNote = "Un aviso al día, solo si no has jugado",
            share = "Retar a mis amigos",
            cupEnds = { "La copa termina esta noche y vas $it.º. Una partida más para defender tu puesto." },
            weekend = "Hoy las monedas valen el doble. Y tu cofre te está esperando.",
            streak = { "Tu racha de $it días te espera: abre el cofre de hoy." },
            chest = "Tu cofre de hoy está listo y hay 3 misiones nuevas.",
        ),
        "en" to AppTexts(
            channel = "Daily reminder",
            channelNote = "One reminder a day, only if you haven't played",
            share = "Challenge my friends",
            cupEnds = { "The cup ends tonight and you're #$it. One more run to defend your spot." },
            weekend = "Coins are worth double today. And your chest is waiting.",
            streak = { "Your $it-day streak is waiting: open today's chest." },
            chest = "Today's chest is ready and there are 3 new missions.",
        ),
        "pt" to AppTexts(
            channel = "Lembrete diário",
            channelNote = "Um aviso por dia, só se você não tiver jogado",
            share = "Desafiar meus amigos",
            cupEnds = { "A copa termina hoje à noite e você está em $it.º. Mais uma partida para defender sua posição." },
            weekend = "Hoje as moedas valem o dobro. E seu baú está esperando.",
            streak = { "Sua sequência de $it dias está esperando: abra o baú de hoje." },
            chest = "Seu baú de hoje está pronto e há 3 missões novas.",
        ),
    )

    /** ¿Es uno de los idiomas del juego? (lo que llega del juego se revisa antes de guardarlo) */
    fun known(code: String?): Boolean = code != null && all.containsKey(code)

    /**
     * El idioma a usar: el que eligió el jugador; si el juego todavía no lo ha contado, el del
     * teléfono; y si el del teléfono no está entre los que hay, inglés (igual que hace el juego).
     */
    fun code(chosen: String?, device: String?): String = when {
        known(chosen) -> chosen!!
        known(device) -> device!!
        else -> "en"
    }

    fun of(code: String): AppTexts = all[code] ?: all.getValue("en")
}

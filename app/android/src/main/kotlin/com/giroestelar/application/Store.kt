package com.giroestelar.application

import java.security.MessageDigest

/**
 * Tienda (cobros con Google Play): las reglas que no dependen de Android.
 *
 * El teléfono solo cobra y entrega al juego el comprobante que da Google. Decidir si esa compra
 * vale y qué se recibe por ella es trabajo del servidor: aquí no se entrega nada.
 */
object Store {
    private val PRODUCT = Regex("^[a-z0-9_]{1,40}$")
    private const val MAX_PRODUCTS = 20
    private val UID = Regex("^[a-z0-9]{16,40}$")

    /** ¿Es un nombre de producto como los del juego? (lo que llega desde la página se revisa antes de usarlo) */
    fun validProduct(id: String): Boolean = PRODUCT.matches(id)

    /** "coins_s,coins_m" → la lista de productos válidos, sin repetidos. */
    fun productList(ids: String): List<String> =
        ids.split(",").map { it.trim() }.filter { validProduct(it) }.distinct().take(MAX_PRODUCTS)

    /**
     * A quién pertenece una compra: la huella (SHA-256, en letras y números) del identificador
     * anónimo de esta instalación. Se le pasa a Google al abrir el pago y Google la devuelve con
     * la compra; así el servidor solo se la entrega a quien la hizo. Si el identificador no tiene
     * la forma que usa el juego, devuelve null (y entonces no se abre el pago).
     */
    fun buyerTag(uid: String): String? {
        if (!UID.matches(uid)) return null
        val digest = MessageDigest.getInstance("SHA-256").digest(uid.toByteArray(Charsets.UTF_8))
        return digest.joinToString("") { "%02x".format(it) }
    }

    /** El estado de una compra según Google (1 pagada, 2 pendiente), como lo entiende el juego. */
    fun stateName(playState: Int): String = when (playState) {
        1 -> "paid"
        2 -> "pending"
        else -> "other"
    }
}

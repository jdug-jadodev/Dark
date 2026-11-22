package com.giroestelar.application

/**
 * Cuenta (guardar el progreso en la nube): las reglas que no dependen de Android.
 *
 * El juego le pasa a Android un número de un solo uso que le dio el servidor, Android se lo pasa
 * a Google, y Google devuelve un comprobante firmado que Android le entrega al juego. Aquí se
 * revisa que lo que va y lo que vuelve tenga la forma esperada antes de tocarlo: el comprobante
 * termina escrito dentro de una instrucción de JavaScript, así que no puede traer nada raro.
 */
object Account {
    private val NONCE = Regex("^[A-Za-z0-9_-]{16,128}$")
    private val TOKEN = Regex("^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$")
    private const val MAX_TOKEN = 4096

    /** ¿Es un número de un solo uso como los que da el servidor? */
    fun validNonce(nonce: String): Boolean = NONCE.matches(nonce)

    /** El comprobante si tiene la forma de uno (tres partes en base64url); si no, vacío. */
    fun safeToken(token: String?): String =
        if (token != null && token.length <= MAX_TOKEN && TOKEN.matches(token)) token else ""

    /** La llave de sesión solo se guarda si tiene la forma de una llave. */
    fun validSecret(secret: String): Boolean =
        secret.length in 20..200 && secret.all { it in 'a'..'z' || it in 'A'..'Z' || it in '0'..'9' || it == '_' || it == '-' }
}

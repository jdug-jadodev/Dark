package com.giroestelar.application

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AccountTest {
    @Test
    fun `el comprobante solo pasa si tiene forma de comprobante`() {
        val good = "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiIxMjMifQ.c2lnbmF0dXJl_-AZ09"
        assertEquals(good, Account.safeToken(good))
        assertEquals("", Account.safeToken(null))
        assertEquals("", Account.safeToken(""))
        assertEquals("", Account.safeToken("solo.dos"))
        assertEquals("", Account.safeToken("a.b.c.d"))
        /* nada que pueda salirse de las comillas de la instrucción de JavaScript donde se escribe */
        val bad = listOf("a.b.c');alert(1);('", "a.b.c\"", "a.b.c\\", "a.b.c\n", "a.b.c d", "a.b.c</script>", "a.b.c+", "a.b.c=")
        for (token in bad) assertEquals("", Account.safeToken(token), token)
        assertEquals("", Account.safeToken("a.b." + "c".repeat(5000)), "demasiado largo")
    }

    @Test
    fun `el numero de un solo uso debe parecerse a los del servidor`() {
        assertTrue(Account.validNonce("AbC123_-AbC123_-AbC123_-"))
        assertFalse(Account.validNonce("corto"))
        assertFalse(Account.validNonce("con espacios dentro del numero"))
        assertFalse(Account.validNonce("comillas'en_el_numero_1234"))
        assertFalse(Account.validNonce("x".repeat(200)))
    }

    @Test
    fun `la llave de sesion solo se guarda si parece una llave`() {
        assertTrue(Account.validSecret("k9_-" + "A".repeat(39)))
        assertFalse(Account.validSecret(""))
        assertFalse(Account.validSecret("corta"))
        assertFalse(Account.validSecret("con espacio " + "A".repeat(30)))
        assertFalse(Account.validSecret("A".repeat(300)))
    }
}

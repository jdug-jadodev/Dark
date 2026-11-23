package com.giroestelar.application

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class PageTest {
    @Test
    fun `la ventana del juego solo puede estar en la pagina de la app`() {
        assertTrue(Page.inside(Page.GAME))
        assertTrue(Page.inside("https://appassets.androidplatform.net/assets/game/index.html?x=1"))
        assertFalse(Page.inside(null))
        assertFalse(Page.inside("https://example.com/"))
        assertFalse(Page.inside("http://appassets.androidplatform.net/assets/game/index.html"))
        assertFalse(Page.inside("https://appassets.androidplatform.net.example.com/assets/"))
        assertFalse(Page.inside("javascript:alert(1)"))
        assertFalse(Page.inside("intent://algo#Intent;end"))
        assertFalse(Page.inside("file:///data/data/com.giroestelar/shared_prefs/giro_cuenta.xml"))
    }

    @Test
    fun `del servidor de pruebas solo se toma el origen`() {
        assertEquals("http://192.168.1.5:8787", Page.origin("http://192.168.1.5:8787/"))
        assertEquals("https://pruebas.ejemplo.dev", Page.origin(" https://pruebas.ejemplo.dev/v1 "))
        assertNull(Page.origin(""))
        assertNull(Page.origin("off"))
        assertNull(Page.origin("ftp://x"))
        assertNull(Page.origin("http://x; script-src *"))
        assertNull(Page.origin("http://x' 'unsafe-inline"))
    }

    @Test
    fun `el servidor de pruebas se agrega a la politica de la pagina y nada mas`() {
        val html = """<meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src https://juego.ejemplo; frame-src 'none'">"""
        assertEquals(
            """<meta http-equiv="Content-Security-Policy" content="default-src 'none'; connect-src http://10.0.2.2:8787 https://juego.ejemplo; frame-src 'none'">""",
            Page.allowServer(html, "http://10.0.2.2:8787/"),
        )
        assertEquals(html, Page.allowServer(html, "http://x; script-src *"))
    }
}

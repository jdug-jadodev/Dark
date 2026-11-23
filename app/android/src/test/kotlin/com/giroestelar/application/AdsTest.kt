package com.giroestelar.application

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class AdsTest {
    private val mine = "ca-app-pub-1234567890123456/1234567890"

    @Test
    fun `la app de pruebas nunca pide anuncios de verdad`() {
        assertEquals(Ads.TEST_VIDEO, Ads.unit(mine, Ads.TEST_VIDEO, debuggable = true))
        assertEquals(Ads.TEST_BANNER, Ads.unit(mine, Ads.TEST_BANNER, debuggable = true))
    }

    @Test
    fun `la de publicacion usa el identificador configurado`() {
        assertEquals(mine, Ads.unit(mine, Ads.TEST_VIDEO, debuggable = false))
    }

    @Test
    fun `sin identificador o con uno mal escrito se usa el de prueba`() {
        for (bad in listOf("", " ", "ca-app-pub-123/456", "ca-app-pub-1234567890123456~1234567890", mine + " ", "<script>")) {
            assertEquals(Ads.TEST_VIDEO, Ads.unit(bad, Ads.TEST_VIDEO, debuggable = false), bad)
        }
    }

    @Test
    fun `los identificadores de prueba tienen la forma correcta`() {
        assertTrue(Ads.validUnit(Ads.TEST_VIDEO))
        assertTrue(Ads.validUnit(Ads.TEST_BANNER))
        assertFalse(Ads.validUnit(Ads.TEST_APP)) // el de la app lleva ~ y no es un anuncio
    }

    @Test
    fun `el premio solo se cuenta si el video se vio entero`() {
        assertEquals("earned", Ads.result(shown = true, earned = true))
        assertEquals("closed", Ads.result(shown = true, earned = false))
        assertEquals("none", Ads.result(shown = false, earned = false))
    }

    @Test
    fun `un video viejo ya no sirve`() {
        assertTrue(Ads.fresh(loadedAt = 1000, now = 1000))
        assertTrue(Ads.fresh(loadedAt = 1000, now = 1000 + Ads.FRESH_MS - 1))
        assertFalse(Ads.fresh(loadedAt = 1000, now = 1000 + Ads.FRESH_MS))
        assertFalse(Ads.fresh(loadedAt = 5000, now = 1000)) // el reloj del teléfono se movió hacia atrás
    }
}

package com.giroestelar.application

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class StoreTest {
    @Test
    fun `solo pasan nombres de producto como los del juego`() {
        assertTrue(Store.validProduct("coins_s"))
        assertTrue(Store.validProduct("no_ads_30"))
        assertFalse(Store.validProduct(""))
        assertFalse(Store.validProduct("Coins"))
        assertFalse(Store.validProduct("coins s"))
        assertFalse(Store.validProduct("coins';drop"))
        assertFalse(Store.validProduct("x".repeat(41)))
    }

    @Test
    fun `la lista de productos descarta lo raro y lo repetido`() {
        assertEquals(listOf("coins_s", "no_ads"), Store.productList("coins_s, no_ads,coins_s,,MALO,<script>"))
        assertEquals(emptyList(), Store.productList(""))
        assertEquals(20, Store.productList((1..50).joinToString(",") { "p$it" }).size)
    }

    @Test
    fun `el estado de la compra se traduce para el juego`() {
        assertEquals("paid", Store.stateName(1))
        assertEquals("pending", Store.stateName(2))
        assertEquals("other", Store.stateName(0))
        assertEquals("other", Store.stateName(7))
    }

    @Test
    fun `la huella del comprador es el sha256 del identificador, en minusculas`() {
        /* el mismo valor que calcula el servidor para ese identificador */
        assertEquals(
            "8865fea8edb697169ac2b4f5e6339e16439381033640eeb4f55edbad9bdc2d3d",
            Store.buyerTag("0123456789abcdef01234567"),
        )
    }

    @Test
    fun `un identificador raro no da huella y no se abre el pago`() {
        assertNull(Store.buyerTag(""))
        assertNull(Store.buyerTag("corto"))
        assertNull(Store.buyerTag("MAYUSCULAS0123456789"))
        assertNull(Store.buyerTag("0123456789abcdef';drop"))
        assertNull(Store.buyerTag("a".repeat(41)))
    }
}

package com.giroestelar.adapters.render

import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.graphics.Pixmap
import com.badlogic.gdx.graphics.Texture
import com.badlogic.gdx.math.MathUtils
import kotlin.math.cos
import kotlin.math.sin

/** Texturas del espacio generadas por código (como en el prototipo): planetas, anillos y galaxias. */
object SpaceTextures {
    enum class PlanetKind { GAS, EARTH, ICE, LAVA, ROCK }

    private fun tex(pm: Pixmap): Texture =
        Texture(pm).also { it.setFilter(Texture.TextureFilter.Linear, Texture.TextureFilter.Linear); pm.dispose() }

    private fun hsv(h: Float, s: Float, v: Float, a: Float = 1f): Color =
        Color().fromHsv(((h % 360f) + 360f) % 360f, s.coerceIn(0f, 1f), v.coerceIn(0f, 1f)).also { it.a = a }

    fun planet(kind: PlanetKind): Texture {
        val w = 256
        val h = 128
        val pm = Pixmap(w, h, Pixmap.Format.RGBA8888)
        val hue = MathUtils.random(360f)
        when (kind) {
            PlanetKind.GAS -> {
                for (y in 0 until h) {
                    val v = 0.62f + sin(y * 0.18f) * 0.14f + sin(y * 0.62f) * 0.06f + MathUtils.random(-0.03f, 0.03f)
                    pm.setColor(hsv(hue + sin(y * 0.1f) * 22f, 0.5f, v)); pm.drawLine(0, y, w, y)
                }
                pm.setColor(hsv(hue + 25f, 0.6f, 0.9f, 0.8f)); pm.fillCircle(MathUtils.random(60, 200), MathUtils.random(45, 85), 9)
            }
            PlanetKind.EARTH -> {
                pm.setColor(Color.valueOf("1d4f9a")); pm.fill()
                val greens = listOf("3f8f4a", "5a9a3c", "8a7a4a", "2f7a3f").map { Color.valueOf(it) }
                repeat(26) {
                    pm.setColor(greens.random())
                    val cx = MathUtils.random(w); val cy = MathUtils.random(15, h - 15); val r = MathUtils.random(6, 20)
                    repeat(6) { pm.fillCircle(cx + MathUtils.random(-r, r), cy + MathUtils.random(-r / 2, r / 2), MathUtils.random(r / 2, r)) }
                }
                pm.setColor(1f, 1f, 1f, 0.5f)
                repeat(40) { val cx = MathUtils.random(w); val cy = MathUtils.random(h); repeat(5) { k -> pm.fillCircle(cx + k * 5, cy, MathUtils.random(2, 4)) } }
                pm.setColor(Color.valueOf("eef6ff")); pm.fillRectangle(0, 0, w, 6); pm.fillRectangle(0, h - 6, w, 6)
            }
            PlanetKind.ICE -> {
                pm.setColor(hsv(195f + MathUtils.random(-15f, 15f), 0.35f, 0.88f)); pm.fill()
                repeat(70) { pm.setColor(1f, 1f, 1f, MathUtils.random(0.2f, 0.6f)); val y = MathUtils.random(h); pm.drawLine(0, y, w, y + MathUtils.random(-6, 6)) }
            }
            PlanetKind.LAVA -> {
                pm.setColor(Color.valueOf("2a1410")); pm.fill()
                repeat(80) {
                    pm.setColor(1f, MathUtils.random(0.3f, 0.65f), 0.15f, MathUtils.random(0.5f, 1f))
                    var x = MathUtils.random(w); var y = MathUtils.random(h)
                    repeat(5) { val nx = x + MathUtils.random(-20, 20); val ny = y + MathUtils.random(-12, 12); pm.drawLine(x, y, nx, ny); x = nx; y = ny }
                }
            }
            PlanetKind.ROCK -> {
                pm.setColor(hsv(hue, 0.18f, 0.5f)); pm.fill()
                repeat(200) { pm.setColor(hsv(hue, 0.15f, MathUtils.random(0.25f, 0.65f), 0.55f)); pm.fillCircle(MathUtils.random(w), MathUtils.random(h), MathUtils.random(1, 8)) }
            }
        }
        return tex(pm)
    }

    fun ring(): Texture {
        val s = 256
        val pm = Pixmap(s, s, Pixmap.Format.RGBA8888)
        val hue = MathUtils.random(20f, 50f)
        for (r in 75 until 128) { pm.setColor(hsv(hue, 0.4f, MathUtils.random(0.6f, 0.85f), MathUtils.random(0.1f, 0.7f))); pm.drawCircle(s / 2, s / 2, r) }
        return tex(pm)
    }

    /** Galaxia espiral vista de frente (2 o 3 brazos con estrellas de colores y núcleo brillante). */
    fun galaxy(hue: Float): Texture {
        val s = 256
        val pm = Pixmap(s, s, Pixmap.Format.RGBA8888).apply { blending = Pixmap.Blending.SourceOver }
        val arms = if (MathUtils.randomBoolean(0.6f)) 2 else 3
        for (a in 0 until arms) for (i in 0 until 900) {
            val q = i / 900f
            val ang = a * MathUtils.PI2 / arms + q * 4.6f + MathUtils.random(-0.25f, 0.25f)
            val rad = q * 112f + MathUtils.random(-6f, 6f)
            pm.setColor(hsv(hue + q * 70f, 0.55f, 1f - q * 0.25f, 0.55f * (1f - q) + 0.08f))
            val sz = MathUtils.random(1, 3)
            pm.fillRectangle((128 + cos(ang) * rad).toInt(), (128 + sin(ang) * rad).toInt(), sz, sz)
        }
        for (r in 34 downTo 1) { pm.setColor(1f, 0.95f, 0.85f, 0.06f + (1f - r / 34f) * 0.12f); pm.fillCircle(128, 128, r) }
        return tex(pm)
    }
}

package com.giroestelar.adapters.render

import com.badlogic.gdx.Gdx
import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.graphics.GL20
import com.badlogic.gdx.graphics.OrthographicCamera
import com.badlogic.gdx.graphics.Texture
import com.badlogic.gdx.graphics.g2d.SpriteBatch
import com.badlogic.gdx.graphics.g2d.TextureRegion
import com.badlogic.gdx.math.MathUtils
import com.badlogic.gdx.utils.Disposable
import com.giroestelar.adapters.ui.UiKit
import kotlin.math.abs
import kotlin.math.sin

/**
 * Fondo lejano en 2D, detrás de todo el 3D: color del espacio, nebulosas,
 * galaxias espirales y estrellas que titilan. Se desplaza un poco con las
 * curvas de la pista (paralaje) para que se sienta profundo.
 */
class SkyLayer(private val ui: UiKit) : Disposable {
    private val batch = SpriteBatch()
    private val cam = OrthographicCamera()
    private var w = 1f
    private var h = 1f

    private class Nebula(val u: Float, val v: Float, val size: Float, val color: Color)
    private class Galaxy(val u: Float, val v: Float, val size: Float, val tex: Texture, val region: TextureRegion, var angle: Float, val spin: Float, val squash: Float)

    private val nebulas = List(8) {
        val c = Color().fromHsv(MathUtils.random(360f), 0.65f, 1f)
        Nebula(MathUtils.random(-0.1f, 1.1f), MathUtils.random(-0.1f, 1.1f), MathUtils.random(0.7f, 1.4f), c.also { it.a = MathUtils.random(0.12f, 0.22f) })
    }
    private val galaxies = List(3) {
        val t = SpaceTextures.galaxy(MathUtils.random(360f))
        Galaxy(
            u = listOf(0.2f, 0.82f, 0.45f)[it], v = listOf(0.86f, 0.7f, 0.2f)[it], size = MathUtils.random(0.28f, 0.45f),
            tex = t, region = TextureRegion(t), angle = MathUtils.random(360f), spin = MathUtils.random(-3f, 3f), squash = MathUtils.random(0.45f, 0.8f),
        )
    }
    private val starCount = 260
    private val sx = FloatArray(starCount) { MathUtils.random() }
    private val sy = FloatArray(starCount) { MathUtils.random() }
    private val ss = FloatArray(starCount) { MathUtils.random(0.6f, 2.2f) }
    private val sp = FloatArray(starCount) { MathUtils.random(0f, 6.28f) }
    private val sd = FloatArray(starCount) { MathUtils.random(0.3f, 1f) }
    private var t = 0f

    fun resize(width: Int, height: Int) {
        w = width.toFloat(); h = height.toFloat()
        cam.setToOrtho(false, w, h)
    }

    /**
     * @param speed velocidad de la partida (las estrellas se mueven más rápido al acelerar)
     * @param shiftX desplazamiento horizontal por las curvas (paralaje), en fracción de pantalla
     */
    fun draw(dt: Float, speed: Float, bg: Color, shiftX: Float, shiftY: Float) {
        t += dt
        Gdx.gl.glClearColor(bg.r, bg.g, bg.b, 1f)
        Gdx.gl.glClear(GL20.GL_COLOR_BUFFER_BIT or GL20.GL_DEPTH_BUFFER_BIT)
        batch.projectionMatrix = cam.combined
        batch.begin()
        batch.setBlendFunction(GL20.GL_SRC_ALPHA, GL20.GL_ONE)
        val dim = maxOf(w, h)
        for (n in nebulas) {
            batch.color = n.color
            val s = dim * n.size
            batch.draw(ui.glow, (n.u + shiftX * 0.3f) * w - s / 2, (n.v + shiftY * 0.3f) * h - s / 2, s, s)
        }
        for (g in galaxies) {
            g.angle += g.spin * dt
            val s = w * g.size
            batch.setColor(1f, 1f, 1f, 0.85f)
            batch.draw(g.region, (g.u + shiftX * 0.5f) * w - s / 2, (g.v + shiftY * 0.5f) * h - s / 2, s / 2, s / 2, s, s, 1f, g.squash, g.angle)
        }
        val drift = speed * 0.00004f
        for (i in 0 until starCount) {
            sy[i] -= drift * sd[i] * dt * 60f
            if (sy[i] < 0f) { sy[i] += 1f; sx[i] = MathUtils.random() }
            val a = (0.35f + 0.65f * abs(sin(t * (0.8f + sd[i]) + sp[i]))) * sd[i]
            batch.setColor(0.85f, 0.9f, 1f, a)
            val size = ss[i] * ui.px
            val x = ((sx[i] + shiftX * sd[i]) % 1f + 1f) % 1f
            batch.draw(ui.white, x * w, sy[i] * h, size, size)
        }
        batch.setBlendFunction(GL20.GL_SRC_ALPHA, GL20.GL_ONE_MINUS_SRC_ALPHA)
        batch.color = Color.WHITE
        batch.end()
    }

    override fun dispose() {
        batch.dispose()
        galaxies.forEach { it.tex.dispose() }
    }
}

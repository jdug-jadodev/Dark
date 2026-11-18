package com.giroestelar.adapters.ui

import com.badlogic.gdx.Gdx
import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.graphics.Pixmap
import com.badlogic.gdx.graphics.Texture
import com.badlogic.gdx.graphics.g2d.BitmapFont
import com.badlogic.gdx.graphics.g2d.NinePatch
import com.badlogic.gdx.graphics.g2d.TextureRegion
import com.badlogic.gdx.graphics.g2d.freetype.FreeTypeFontGenerator
import com.badlogic.gdx.scenes.scene2d.ui.CheckBox.CheckBoxStyle
import com.badlogic.gdx.scenes.scene2d.ui.Label.LabelStyle
import com.badlogic.gdx.scenes.scene2d.ui.ProgressBar.ProgressBarStyle
import com.badlogic.gdx.scenes.scene2d.ui.TextButton.TextButtonStyle
import com.badlogic.gdx.scenes.scene2d.utils.Drawable
import com.badlogic.gdx.scenes.scene2d.utils.NinePatchDrawable
import com.badlogic.gdx.scenes.scene2d.utils.TextureRegionDrawable
import com.badlogic.gdx.utils.Disposable
import kotlin.math.abs
import kotlin.math.ceil
import kotlin.math.max
import kotlin.math.min
import kotlin.math.roundToInt
import kotlin.math.sqrt

/** Colores del prototipo (variables CSS de demo-juego.html). */
object Palette {
    val BG: Color = Color.valueOf("070b18")
    val PANEL: Color = Color.valueOf("101733")
    val PANEL2: Color = Color.valueOf("18204a")
    val LINE: Color = Color.valueOf("2a3570")
    val INK: Color = Color.valueOf("eaf1ff")
    val MUTE: Color = Color.valueOf("8fa0cc")
    val ACC: Color = Color.valueOf("5ee0ff")
    val ACC2: Color = Color.valueOf("ffb454")
    val OK: Color = Color.valueOf("6ef2a5")
    val BAD: Color = Color.valueOf("ff6b8a")
    val DARK: Color = Color.valueOf("06101e")
}

/**
 * Kit visual generado por código (sin archivos de imagen): fuentes, paneles
 * redondeados, degradados y estilos de Scene2D. Todo se genera a la
 * resolución real de la pantalla para que se vea nítido.
 */
class UiKit : Disposable {
    /** Píxeles reales por unidad de diseño (el diseño es de 390×780). */
    val px: Float = max(1f, Gdx.graphics.backBufferHeight / DESIGN_H)

    private val owned = mutableListOf<Disposable>()
    private fun <T : Disposable> own(d: T): T = d.also { owned += it }

    val white: TextureRegion
    val glow: TextureRegion

    val fontTitle: BitmapFont
    val fontBig: BitmapFont
    val fontBody: BitmapFont
    val fontSmall: BitmapFont

    init {
        Pixmap(1, 1, Pixmap.Format.RGBA8888).also {
            it.setColor(Color.WHITE); it.fill()
            white = TextureRegion(own(Texture(it)))
            it.dispose()
        }
        glow = TextureRegion(own(radialTexture(128)))

        val bold = FreeTypeFontGenerator(Gdx.files.internal("fonts/TitilliumWeb-Bold.ttf"))
        val semi = FreeTypeFontGenerator(Gdx.files.internal("fonts/TitilliumWeb-SemiBold.ttf"))
        fontTitle = font(bold, 34)
        fontBig = font(bold, 20)
        fontBody = font(bold, 17)
        fontSmall = font(semi, 14)
        bold.dispose(); semi.dispose()
    }

    private fun font(gen: FreeTypeFontGenerator, size: Int): BitmapFont {
        val p = FreeTypeFontGenerator.FreeTypeFontParameter().apply {
            this.size = (size * px).roundToInt()
            characters = FreeTypeFontGenerator.DEFAULT_CHARS + "…–—•"
            minFilter = Texture.TextureFilter.Linear
            magFilter = Texture.TextureFilter.Linear
        }
        return own(gen.generateFont(p)).apply {
            data.setScale(1f / px)
            setUseIntegerPositions(false)
        }
    }

    /* ---------- dibujables ---------- */

    /** Panel redondeado de un color, con borde opcional. */
    fun panel(fill: Color, border: Color? = null, radius: Float = 12f, borderWidth: Float = 1f): NinePatchDrawable =
        rounded(fill, fill, border, radius, borderWidth)

    /** Panel redondeado con degradado horizontal (como los botones del prototipo). */
    fun rounded(from: Color, to: Color, border: Color? = null, radius: Float = 12f, borderWidth: Float = 1f): NinePatchDrawable {
        val r = ceil(radius * px).toInt().coerceAtLeast(2)
        val b = if (border != null) max(1, (borderWidth * px).roundToInt()) else 0
        val w = 2 * r + 64
        val h = 2 * r + 2
        val pm = Pixmap(w, h, Pixmap.Format.RGBA8888).apply { blending = Pixmap.Blending.None }
        val c = Color()
        for (y in 0 until h) for (x in 0 until w) {
            val fx = x + 0.5f
            val fy = y + 0.5f
            val dOut = roundBox(fx, fy, w / 2f, h / 2f, w / 2f, h / 2f, r.toFloat())
            val alpha = (0.5f - dOut).coerceIn(0f, 1f)
            if (alpha <= 0f) { pm.drawPixel(x, y, 0); continue }
            c.set(from).lerp(to, x / (w - 1f))
            if (border != null) {
                val dIn = roundBox(fx, fy, w / 2f, h / 2f, w / 2f - b, h / 2f - b, max(0f, r - b.toFloat()))
                val inner = (0.5f - dIn).coerceIn(0f, 1f)
                c.set(border.r + (c.r - border.r) * inner, border.g + (c.g - border.g) * inner, border.b + (c.b - border.b) * inner, border.a + (c.a - border.a) * inner)
            }
            c.a *= alpha
            pm.drawPixel(x, y, Color.rgba8888(c))
        }
        val tex = own(Texture(pm).apply { setFilter(Texture.TextureFilter.Linear, Texture.TextureFilter.Linear) })
        pm.dispose()
        val patch = NinePatch(tex, r, r, r, r).apply { scale(1f / px, 1f / px) }
        return NinePatchDrawable(patch)
    }

    /** Distancia con signo a una caja redondeada (negativa = adentro). */
    private fun roundBox(x: Float, y: Float, cx: Float, cy: Float, hw: Float, hh: Float, r: Float): Float {
        val qx = abs(x - cx) - (hw - r)
        val qy = abs(y - cy) - (hh - r)
        val ox = max(qx, 0f)
        val oy = max(qy, 0f)
        return sqrt(ox * ox + oy * oy) + min(max(qx, qy), 0f) - r
    }

    private fun radialTexture(size: Int): Texture {
        val pm = Pixmap(size, size, Pixmap.Format.RGBA8888).apply { blending = Pixmap.Blending.None }
        val h = size / 2f
        for (y in 0 until size) for (x in 0 until size) {
            val d = sqrt((x + .5f - h) * (x + .5f - h) + (y + .5f - h) * (y + .5f - h)) / h
            val a = (1f - d).coerceIn(0f, 1f)
            pm.drawPixel(x, y, Color.rgba8888(1f, 1f, 1f, a * a))
        }
        return Texture(pm).also { it.setFilter(Texture.TextureFilter.Linear, Texture.TextureFilter.Linear); pm.dispose() }
    }

    /** Fondo oscuro semitransparente para ventanas encima del menú. */
    val dim: Drawable = TextureRegionDrawable(white).tint(Color(0.02f, 0.03f, 0.08f, 0.82f))
    val card: Drawable = panel(Palette.PANEL, Palette.LINE, 18f)
    val box: Drawable = panel(Palette.PANEL2, Palette.LINE, 12f)
    val coin: Drawable = rounded(Color.valueOf("ffe27a"), Color.valueOf("ffb02e"), Color.valueOf("c98a1c"), 10f, 1.5f)
        .also { it.minWidth = 18f; it.minHeight = 18f }
    val coinBig: Drawable = rounded(Color.valueOf("ffe27a"), Color.valueOf("ffb02e"), Color.valueOf("c98a1c"), 28f, 3f)

    /* ---------- estilos ---------- */

    fun label(font: BitmapFont = fontBody, color: Color = Palette.INK) = LabelStyle(font, color)

    private fun button(up: NinePatchDrawable, text: Color, font: BitmapFont = fontBody) =
        TextButtonStyle(up, up.tint(Color(0.8f, 0.8f, 0.85f, 1f)), null, font).apply {
            fontColor = text
            disabled = up.tint(Color(1f, 1f, 1f, 0.45f))
            disabledFontColor = Color(text).apply { a = 0.5f }
        }

    val btnPrimary = button(rounded(Palette.ACC, Color.valueOf("8af0ff")), Palette.DARK)
    val btnSurvival = button(rounded(Color.valueOf("c792ff"), Color.valueOf("ff6bd0")), Color.valueOf("14061e"))
    val btnSpace = button(rounded(Color.valueOf("4fc3ff"), Palette.OK), Color.valueOf("04161e"))
    val btnAd = button(rounded(Palette.ACC2, Color.valueOf("ffd08a")), Palette.DARK)
    val btnAlt = button(panel(Palette.PANEL2, Palette.LINE), Palette.INK)

    /** Botón de opción (Deslizar / Flechas): marcado = borde de color. */
    val option = TextButtonStyle(
        panel(Palette.PANEL2, Palette.LINE, 10f),
        panel(Palette.PANEL2, Palette.LINE, 10f).tint(Color(0.8f, 0.8f, 0.85f, 1f)),
        panel(Palette.PANEL2, Palette.ACC, 10f, 2f),
        fontSmall,
    ).apply { fontColor = Palette.INK }

    val checkBox = CheckBoxStyle(
        panel(Palette.PANEL2, Palette.MUTE, 5f, 1.5f).also { it.minWidth = 20f; it.minHeight = 20f },
        panel(Palette.ACC, Color.valueOf("b8f3ff"), 5f, 3f).also { it.minWidth = 20f; it.minHeight = 20f },
        fontSmall,
        Palette.MUTE,
    )

    val progress = ProgressBarStyle(panel(Palette.PANEL2, null, 4f).also { it.minHeight = 8f }, null).apply {
        knobBefore = rounded(Palette.ACC, Palette.OK, null, 4f).also { it.minHeight = 8f; it.minWidth = 0f }
    }

    /* ---------- partida ---------- */

    /** Círculo con borde, dibujado a la resolución real (no se deforma como un panel estirado). */
    private fun circle(fill: Color, border: Color, diameter: Float, borderWidth: Float): Drawable {
        val s = (diameter * px).roundToInt()
        val b = borderWidth * px
        val pm = Pixmap(s, s, Pixmap.Format.RGBA8888).apply { blending = Pixmap.Blending.None }
        val r = s / 2f
        val c = Color()
        for (y in 0 until s) for (x in 0 until s) {
            val d = sqrt((x + .5f - r) * (x + .5f - r) + (y + .5f - r) * (y + .5f - r))
            val outer = (r - d + 0.5f).coerceIn(0f, 1f)
            val inner = (r - b - d + 0.5f).coerceIn(0f, 1f)
            c.set(border).lerp(fill, inner)
            c.a *= outer
            pm.drawPixel(x, y, Color.rgba8888(c))
        }
        val tex = own(Texture(pm).apply { setFilter(Texture.TextureFilter.Linear, Texture.TextureFilter.Linear) })
        pm.dispose()
        return TextureRegionDrawable(TextureRegion(tex)).also { it.setMinSize(diameter, diameter) }
    }

    /** Botón redondo semitransparente (flechas y pausa). */
    val roundButton: Drawable = circle(Color(0.06f, 0.09f, 0.2f, 0.55f), Color(0.37f, 0.88f, 1f, 0.7f), 62f, 2f)
    val roundButtonDown: Drawable = circle(Color(0.37f, 0.88f, 1f, 0.42f), Palette.ACC, 62f, 2f)

    /** Ícono dibujado con un polígono blanco (para no depender de emojis). */
    private fun icon(size: Int, draw: (Pixmap, Int) -> Unit): Drawable {
        val s = (size * px).roundToInt()
        val pm = Pixmap(s, s, Pixmap.Format.RGBA8888).apply { setColor(Color.WHITE) }
        draw(pm, s)
        val tex = own(Texture(pm).apply { setFilter(Texture.TextureFilter.Linear, Texture.TextureFilter.Linear) })
        pm.dispose()
        return TextureRegionDrawable(TextureRegion(tex)).also { it.setMinSize(size.toFloat(), size.toFloat()) }
    }

    /** Flecha: 0 arriba, 1 abajo, 2 izquierda, 3 derecha. */
    fun arrow(dir: Int): Drawable = icon(22) { pm, s ->
        val a = s * 0.12f
        val b = s * 0.88f
        val m = s / 2f
        when (dir) {
            0 -> pm.fillTriangle(m.toInt(), a.toInt(), a.toInt(), b.toInt(), b.toInt(), b.toInt())
            1 -> pm.fillTriangle(m.toInt(), b.toInt(), a.toInt(), a.toInt(), b.toInt(), a.toInt())
            2 -> pm.fillTriangle(a.toInt(), m.toInt(), b.toInt(), a.toInt(), b.toInt(), b.toInt())
            else -> pm.fillTriangle(b.toInt(), m.toInt(), a.toInt(), a.toInt(), a.toInt(), b.toInt())
        }
    }

    val pauseIcon: Drawable = icon(16) { pm, s ->
        val w = (s * 0.28f).toInt()
        pm.fillRectangle((s * 0.14f).toInt(), (s * 0.1f).toInt(), w, (s * 0.8f).toInt())
        pm.fillRectangle((s * 0.58f).toInt(), (s * 0.1f).toInt(), w, (s * 0.8f).toInt())
    }

    private fun bar(from: Color, to: Color) = ProgressBarStyle(panel(Color(1f, 1f, 1f, 0.14f), null, 5f).also { it.minHeight = 10f }, null).apply {
        knobBefore = rounded(from, to, null, 5f).also { it.minHeight = 10f; it.minWidth = 0f }
    }
    val progressRun = bar(Palette.ACC, Palette.ACC2)
    val hullGood = bar(Palette.OK, Color.valueOf("9dffc4"))
    val hullMid = bar(Palette.ACC2, Color.valueOf("ffd08a"))
    val hullLow = bar(Palette.BAD, Color.valueOf("ff9db0"))

    override fun dispose() {
        owned.forEach { it.dispose() }
        owned.clear()
    }

    companion object {
        const val DESIGN_W = 390f
        const val DESIGN_H = 780f
    }
}

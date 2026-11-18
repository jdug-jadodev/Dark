package com.giroestelar.adapters.ui

import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.graphics.g2d.Batch
import com.badlogic.gdx.math.MathUtils
import com.badlogic.gdx.scenes.scene2d.Actor
import com.badlogic.gdx.scenes.scene2d.Touchable
import com.badlogic.gdx.scenes.scene2d.actions.Actions
import com.badlogic.gdx.scenes.scene2d.ui.Label
import com.badlogic.gdx.scenes.scene2d.ui.Table
import com.badlogic.gdx.scenes.scene2d.utils.ChangeListener
import com.badlogic.gdx.utils.Align
import kotlin.math.abs
import kotlin.math.sin

/** Ejecuta [block] cuando el botón (o control) cambia: clic, toque o tecla. */
fun Actor.onChange(block: () -> Unit) {
    addListener(object : ChangeListener() {
        override fun changed(event: ChangeEvent, actor: Actor) = block()
    })
}

/** Pantalla que reacciona al botón "atrás" del sistema. Devuelve false si no lo usó. */
interface BackHandler {
    fun onBack(): Boolean
}

/** Segundos → 'm:ss'. */
fun formatTime(seconds: Int): String = "${seconds / 60}:${(seconds % 60).toString().padStart(2, '0')}"

/** Ventana encima de todo, con fondo oscuro que bloquea los toques de atrás. */
class Overlay(ui: UiKit, width: Float = 340f) : Table() {
    val card = Table().apply { background = ui.card; pad(18f) }

    init {
        setFillParent(true)
        background = ui.dim
        touchable = Touchable.enabled
        add(card).width(width)
    }

    fun close() = remove()
}

/** Aviso grande que aparece y se desvanece (igual que en el prototipo). */
class Toast(ui: UiKit) : Table() {
    private val title = Label("", ui.label(ui.fontBig))
    private val detail = Label("", ui.label(ui.fontSmall, Palette.MUTE)).apply { wrap = true; setAlignment(Align.center) }

    init {
        setFillParent(true)
        touchable = Touchable.disabled
        top().padTop(250f)
        add(title).row()
        add(detail).width(320f)
        color.a = 0f
    }

    fun show(title: String, detail: String = "") {
        this.title.setText(title)
        this.detail.setText(detail)
        toFront()
        clearActions()
        color.a = 0f
        addAction(Actions.sequence(Actions.fadeIn(0.25f), Actions.delay(1.8f), Actions.fadeOut(0.5f)))
    }
}

/** Fondo animado: estrellas que titilan y bajan despacio, con dos resplandores de nebulosa. */
class Starfield(private val ui: UiKit, count: Int = 170) : Actor() {
    private val xs = FloatArray(count) { MathUtils.random() }
    private val ys = FloatArray(count) { MathUtils.random() }
    private val size = FloatArray(count) { MathUtils.random(0.8f, 2.4f) }
    private val speed = FloatArray(count) { MathUtils.random(0.004f, 0.02f) }
    private val phase = FloatArray(count) { MathUtils.random(0f, 6.28f) }
    private var t = 0f

    override fun act(delta: Float) {
        super.act(delta)
        stage?.let { setSize(it.width, it.height) }
        t += delta
        for (i in ys.indices) {
            ys[i] -= speed[i] * delta
            if (ys[i] < 0f) { ys[i] += 1f; xs[i] = MathUtils.random() }
        }
    }

    override fun draw(batch: Batch, parentAlpha: Float) {
        val w = width
        val h = height
        batch.setColor(0.45f, 0.25f, 0.9f, 0.30f * parentAlpha)
        batch.draw(ui.glow, x - w * 0.45f, y + h * 0.42f, w * 1.6f, w * 1.6f)
        batch.setColor(0.15f, 0.55f, 1f, 0.16f * parentAlpha)
        batch.draw(ui.glow, x + w * 0.15f, y - h * 0.12f, w * 1.4f, w * 1.4f)
        for (i in xs.indices) {
            val a = 0.3f + 0.7f * abs(sin(t * (0.6f + speed[i] * 40f) + phase[i]))
            batch.setColor(0.82f, 0.88f, 1f, a * parentAlpha)
            batch.draw(ui.white, x + xs[i] * w, y + ys[i] * h, size[i], size[i])
        }
        batch.color = Color.WHITE
    }
}

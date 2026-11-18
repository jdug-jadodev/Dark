package com.giroestelar.adapters.ui

import com.badlogic.gdx.Gdx
import com.badlogic.gdx.ScreenAdapter
import com.badlogic.gdx.scenes.scene2d.Stage
import com.badlogic.gdx.scenes.scene2d.ui.CheckBox
import com.badlogic.gdx.scenes.scene2d.ui.Image
import com.badlogic.gdx.scenes.scene2d.ui.Label
import com.badlogic.gdx.scenes.scene2d.ui.Table
import com.badlogic.gdx.scenes.scene2d.ui.TextButton
import com.badlogic.gdx.utils.Align
import com.badlogic.gdx.utils.ScreenUtils
import com.badlogic.gdx.utils.viewport.ExtendViewport
import com.giroestelar.application.usecases.ChangeControlScheme
import com.giroestelar.application.usecases.ChestState
import com.giroestelar.application.usecases.DoubleDailyChest
import com.giroestelar.application.usecases.GetChestState
import com.giroestelar.application.usecases.GetProfile
import com.giroestelar.application.usecases.OpenDailyChest
import com.giroestelar.domain.profile.ControlScheme
import com.giroestelar.domain.profile.Profile
import com.giroestelar.domain.progression.Balance
import com.giroestelar.domain.progression.GameMode

/** Lo que el menú necesita: casos de uso + qué hacer al elegir un modo. */
class MenuDeps(
    val getProfile: GetProfile,
    val changeControl: ChangeControlScheme,
    val getChest: GetChestState,
    val openChest: OpenDailyChest,
    val doubleChest: DoubleDailyChest,
    val onPlay: (mode: GameMode, demo: Boolean) -> Unit,
)

/** Adaptador de entrada: menú principal. Solo llama a casos de uso; no tiene reglas del juego. */
class MenuScreen(private val ui: UiKit, private val deps: MenuDeps) : ScreenAdapter(), BackHandler {
    val stage = Stage(ExtendViewport(UiKit.DESIGN_W, UiKit.DESIGN_H))
    val toast = Toast(ui)

    private val coins = Label("", ui.label(ui.fontBig))
    private val best = Label("", ui.label(ui.fontSmall, Palette.ACC2)).apply { wrap = true; setAlignment(Align.center) }
    private val optSwipe = TextButton("Deslizar", ui.option).apply { setProgrammaticChangeEvents(false) }
    private val optButtons = TextButton("Flechas", ui.option).apply { setProgrammaticChangeEvents(false) }
    private val demo = CheckBox("  Modo demo: no morir (para ver todo el flujo)", ui.checkBox)

    init {
        stage.addActor(Starfield(ui))

        val card = Table().apply {
            background = ui.card
            pad(18f)
            defaults().growX()
            add(Label("Giro Estelar", ui.label(ui.fontTitle)).apply { setAlignment(Align.center) }).row()
            add(Label("Esquiva, sobrevive y viaja entre planetas", ui.label(ui.fontSmall, Palette.MUTE)).apply { setAlignment(Align.center) }).row()
            add(Table().apply { add(Image(ui.coin)).size(18f).padRight(8f); add(coins) }).center().padTop(8f).row()
            add(best).padTop(2f).padBottom(6f).row()
            add(Table().apply {
                add(Label("Control:", ui.label(ui.fontSmall, Palette.MUTE))).padRight(8f)
                add(optSwipe).growX().height(38f).padRight(6f)
                add(optButtons).growX().height(38f)
            }).padBottom(4f).row()
            add(mode("Jugar · Aventura", ui.btnPrimary, GameMode.ADVENTURE)).height(50f).padTop(8f).row()
            add(mode("Supervivencia · ¿cuánto aguantas?", ui.btnSurvival, GameMode.SURVIVAL)).height(50f).padTop(8f).row()
            add(mode("Viaje espacial · vuelo libre 3D", ui.btnSpace, GameMode.SPACE)).height(50f).padTop(8f).row()
            add(TextButton("Cofre diario", ui.btnAlt).apply { onChange { openChestDialog() } }).height(50f).padTop(8f).row()
            add(mode("Practicar jefe final", ui.btnAlt, GameMode.BOSS)).height(50f).padTop(8f).row()
            add(demo).center().padTop(12f)
        }

        val banner = Table().apply {
            background = ui.panel(com.badlogic.gdx.graphics.Color.valueOf("141a38"), Palette.LINE, 0.5f)
            add(Label("Banner pequeño de anuncio · aquí iría AdMob (320×50)", ui.label(ui.fontSmall, Palette.MUTE)))
        }

        stage.addActor(Table().apply {
            setFillParent(true)
            add(card).width(358f).expand().center().row()
            add(banner).growX().height(50f)
        })
        stage.addActor(toast)

        optSwipe.onChange { render(deps.changeControl(ControlScheme.SWIPE)) }
        optButtons.onChange { render(deps.changeControl(ControlScheme.BUTTONS)) }
        refresh()
    }

    private fun mode(text: String, style: TextButton.TextButtonStyle, mode: GameMode) =
        TextButton(text, style).apply { onChange { deps.onPlay(mode, demo.isChecked) } }

    fun refresh() = render(deps.getProfile())

    private fun render(p: Profile) {
        coins.setText("${p.coins}   ·   Racha ${p.streak} ${if (p.streak == 1) "día" else "días"}")
        val parts = buildList {
            if (p.adventureBest > 0) add("Aventura ${p.adventureBest}/${Balance.ADVENTURE_GOAL}")
            p.survivalTop.firstOrNull()?.let { add("Supervivencia ${formatTime(it)}") }
            p.spaceTop.firstOrNull()?.let { add("Espacial $it km") }
            if (p.bossWins > 0) add("Jefes ${p.bossWins}")
        }
        best.setText(if (parts.isEmpty()) "Aún sin récord: ¡juega tu primera partida!" else "Récords: " + parts.joinToString(" · "))
        optSwipe.isChecked = p.control == ControlScheme.SWIPE
        optButtons.isChecked = p.control == ControlScheme.BUTTONS
    }

    /** Cofre diario: abrir y luego duplicar con anuncio. */
    fun openChestDialog() {
        val overlay = Overlay(ui)

        fun draw() {
            val st = deps.getChest()
            overlay.card.clearChildren()
            overlay.card.defaults().growX()
            overlay.card.add(Image(ui.coinBig)).size(56f).center().row()
            overlay.card.add(Label("Cofre diario", ui.label(ui.fontBig)).apply { setAlignment(Align.center) }).padTop(6f).row()
            when (st) {
                is ChestState.Available -> {
                    val hint = if (st.streak > 0) "Racha actual: ${st.streak} días" else "Ábrelo cada día para subir la racha"
                    overlay.card.add(Label(hint, ui.label(ui.fontSmall, Palette.MUTE)).apply { setAlignment(Align.center) }).row()
                    overlay.card.add(TextButton("Abrir cofre · +${st.reward} monedas", ui.btnPrimary).apply {
                        onChange { deps.openChest(); draw() }
                    }).height(50f).padTop(10f).row()
                }
                is ChestState.Opened -> {
                    overlay.card.add(Label("Racha: día ${st.streak}", ui.label(ui.fontSmall, Palette.MUTE)).apply { setAlignment(Align.center) }).row()
                    overlay.card.add(Label("+${st.reward} monedas", ui.label(ui.fontBig, Palette.ACC2)).apply { setAlignment(Align.center) }).padTop(4f).row()
                    if (st.canDouble) {
                        overlay.card.add(TextButton("Duplicar con anuncio · +${st.reward}", ui.btnAd).apply {
                            onChange { deps.doubleChest { draw() } }
                        }).height(50f).padTop(10f).row()
                    } else {
                        overlay.card.add(Label("Listo por hoy", ui.label(ui.fontSmall, Palette.OK)).apply { setAlignment(Align.center) }).padTop(6f).row()
                    }
                    overlay.card.add(Label("Vuelve mañana: día ${st.streak + 1} con premio mayor.", ui.label(ui.fontSmall, Palette.MUTE))
                        .apply { wrap = true; setAlignment(Align.center) }).padTop(6f).row()
                }
            }
            overlay.card.add(TextButton("Cerrar", ui.btnAlt).apply { onChange { overlay.close(); refresh() } }).height(46f).padTop(8f)
        }

        draw()
        stage.addActor(overlay)
    }

    /** Atrás en el menú: cierra la ventana que esté abierta; si no hay, deja salir de la app. */
    override fun onBack(): Boolean {
        val open = stage.actors.lastOrNull { it is Overlay } ?: return false
        open.remove()
        refresh()
        return true
    }

    override fun show() {
        Gdx.input.inputProcessor = stage
        refresh()
    }

    override fun render(delta: Float) {
        ScreenUtils.clear(Palette.BG)
        stage.act(minOf(delta, 1f / 30f))
        stage.draw()
    }

    override fun resize(width: Int, height: Int) {
        stage.viewport.update(width, height, true)
    }

    override fun dispose() {
        stage.dispose()
    }
}

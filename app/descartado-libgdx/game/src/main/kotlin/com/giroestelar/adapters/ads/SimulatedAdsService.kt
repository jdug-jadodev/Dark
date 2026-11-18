package com.giroestelar.adapters.ads

import com.badlogic.gdx.scenes.scene2d.Stage
import com.badlogic.gdx.scenes.scene2d.actions.Actions
import com.badlogic.gdx.scenes.scene2d.ui.Label
import com.badlogic.gdx.scenes.scene2d.ui.ProgressBar
import com.badlogic.gdx.scenes.scene2d.ui.Table
import com.badlogic.gdx.scenes.scene2d.ui.TextButton
import com.badlogic.gdx.utils.Align
import com.giroestelar.adapters.ui.Overlay
import com.giroestelar.adapters.ui.Palette
import com.giroestelar.adapters.ui.UiKit
import com.giroestelar.adapters.ui.onChange
import com.giroestelar.application.ports.AdsService

/**
 * Anuncio simulado (igual que en el prototipo): cuenta 3 segundos y luego deja
 * recibir la recompensa. En Android se reemplazará por un adaptador de AdMob.
 */
class SimulatedAdsService(
    private val ui: UiKit,
    private val currentStage: () -> Stage,
    private val seconds: Int = 3,
) : AdsService {

    override fun showRewarded(reward: String, onResult: (watched: Boolean) -> Unit) {
        val overlay = Overlay(ui)
        val count = Label(seconds.toString(), ui.label(ui.fontTitle))
        val bar = ProgressBar(0f, seconds.toFloat(), 0.01f, false, ui.progress).apply { setAnimateDuration(0.9f) }
        val claim = TextButton("Espera…", ui.btnAd).apply { isDisabled = true }
        val close = TextButton("Cerrar sin recompensa", ui.btnAlt)

        val video = Table().apply {
            background = ui.box
            add(count).row()
            add(Label("aquí iría un video de 15-30 s", ui.label(ui.fontSmall, Palette.MUTE)))
        }
        overlay.card.apply {
            add(Label("Anuncio (simulado)", ui.label(ui.fontBig))).row()
            add(Label(reward, ui.label(ui.fontSmall, Palette.MUTE)).apply { wrap = true; setAlignment(Align.center) })
                .growX().padTop(4f).row()
            add(video).growX().height(130f).padTop(10f).row()
            add(bar).growX().padTop(10f).row()
            add(claim).growX().height(50f).padTop(10f).row()
            add(close).growX().height(46f).padTop(8f)
        }

        var left = seconds
        overlay.addAction(
            Actions.repeat(
                seconds,
                Actions.sequence(
                    Actions.delay(1f),
                    Actions.run {
                        left--
                        count.setText(left.coerceAtLeast(0).toString())
                        bar.value = (seconds - left).toFloat()
                        if (left <= 0) {
                            claim.isDisabled = false
                            claim.setText("Recibir recompensa")
                        }
                    },
                ),
            ),
        )

        claim.onChange { if (!claim.isDisabled) { overlay.close(); onResult(true) } }
        close.onChange { overlay.close(); onResult(false) }
        currentStage().addActor(overlay)
    }
}

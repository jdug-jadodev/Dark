package com.giroestelar.adapters.ui

import com.badlogic.gdx.Gdx
import com.badlogic.gdx.Input
import com.badlogic.gdx.InputAdapter
import com.badlogic.gdx.InputMultiplexer
import com.badlogic.gdx.ScreenAdapter
import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.math.Vector2
import com.badlogic.gdx.scenes.scene2d.InputEvent
import com.badlogic.gdx.scenes.scene2d.InputListener
import com.badlogic.gdx.scenes.scene2d.Stage
import com.badlogic.gdx.scenes.scene2d.Touchable
import com.badlogic.gdx.scenes.scene2d.actions.Actions
import com.badlogic.gdx.scenes.scene2d.ui.Button
import com.badlogic.gdx.scenes.scene2d.ui.Image
import com.badlogic.gdx.scenes.scene2d.ui.Label
import com.badlogic.gdx.scenes.scene2d.ui.ProgressBar
import com.badlogic.gdx.scenes.scene2d.ui.Table
import com.badlogic.gdx.scenes.scene2d.ui.TextButton
import com.badlogic.gdx.utils.Align
import com.badlogic.gdx.utils.viewport.ExtendViewport
import com.giroestelar.adapters.render.Models3D
import com.giroestelar.adapters.render.SkyLayer
import com.giroestelar.adapters.render.WorldRenderer
import com.giroestelar.application.usecases.DoubleRunCoins
import com.giroestelar.application.usecases.FinishRun
import com.giroestelar.application.usecases.QuitRun
import com.giroestelar.application.usecases.ReviveRun
import com.giroestelar.application.usecases.RunSummary
import com.giroestelar.application.usecases.StartRun
import com.giroestelar.domain.profile.ControlScheme
import com.giroestelar.domain.progression.Balance
import com.giroestelar.domain.progression.GameMode
import com.giroestelar.domain.run.Field
import com.giroestelar.domain.run.RunEvent
import com.giroestelar.domain.run.RunSession
import com.giroestelar.domain.run.RunStatus

/** Casos de uso que necesita la pantalla de juego. */
class GameDeps(
    val startRun: StartRun,
    val finishRun: FinishRun,
    val quitRun: QuitRun,
    val reviveRun: ReviveRun,
    val doubleCoins: DoubleRunCoins,
)

/**
 * Adaptador de entrada y salida de una partida: lee el dedo/flechas, hace
 * avanzar la sesión del dominio, la dibuja (3D + HUD) y muestra pausa, choque y final.
 */
class GameScreen(
    private val ui: UiKit,
    models: Models3D,
    private val deps: GameDeps,
    private val mode: GameMode,
    demo: Boolean,
    private val control: ControlScheme,
    private val onExit: () -> Unit,
) : ScreenAdapter(), BackHandler {

    private enum class State { COUNTDOWN, PLAYING, PAUSED, CRASHED, ENDED }

    private val run: RunSession = deps.startRun(mode, demo, System.nanoTime().toInt())
    private val world = WorldRenderer(ui, models)
    private val sky = SkyLayer(ui)
    val stage = Stage(ExtendViewport(UiKit.DESIGN_W, UiKit.DESIGN_H))
    private val toast = Toast(ui)

    private var state = State.COUNTDOWN
    private var countdown = 3.2f
    private var summary: RunSummary? = null

    /* ---------- colores por fase / nivel (del prototipo) ---------- */
    private val bg = Color(Color.valueOf("0a1030"))
    private val accent = Color(Palette.ACC)
    private val adventurePalette = listOf(
        0f to ("0a1030" to "5ee0ff"), 18f to ("110f3e" to "7f9dff"), 30f to ("1c0e42" to "c792ff"),
        50f to ("2a0c32" to "ff6bd0"), 62f to ("06282c" to "6ef2a5"), 75f to ("330b1c" to "ff6b8a"),
    ).map { (at, c) -> at to (Color.valueOf(c.first) to Color.valueOf(c.second)) }
    private val survivalPalette = listOf(
        "0a1030" to "5ee0ff", "110f3e" to "7f9dff", "1c0e42" to "c792ff", "2a0c32" to "ff6bd0", "06282c" to "6ef2a5",
        "330b1c" to "ff6b8a", "2a1a04" to "ffd54a", "041e34" to "4fc3ff", "1a0630" to "ff8a3c",
    ).map { Color.valueOf(it.first) to Color.valueOf(it.second) }

    /* ---------- HUD ---------- */
    private val coinsLabel = Label("0", ui.label(ui.fontBody))
    private val comboLabel = Label("", ui.label(ui.fontBody, Palette.ACC2))
    private val rightLabel = Label("", ui.label(ui.fontBody))
    private val progressBar = ProgressBar(0f, 100f, 0.1f, false, ui.progressRun)
    private val phaseLabel = Label("", ui.label(ui.fontSmall, Palette.MUTE))
    private val hullBar = ProgressBar(0f, 100f, 1f, false, ui.hullGood).apply { value = 100f }
    private val hullLabel = Label("CASCO 100%", ui.label(ui.fontSmall))
    private val countLabel = Label("", ui.label(ui.fontTitle)).apply { setAlignment(Align.center); setFontScale(2.4f) }
    private val hintLabel = Label(
        if (control == ControlScheme.BUTTONS) "Flechas: arriba/abajo a la izquierda · lados a la derecha" else "Desliza el dedo en cualquier parte para mover la nave",
        ui.label(ui.fontSmall, Palette.MUTE),
    ).apply { setAlignment(Align.center); wrap = true }
    private val pops = Table().apply { setFillParent(true); touchable = Touchable.disabled }

    /* ---------- entrada ---------- */
    private var dragPointer = -1
    private var lastX = 0f
    private var lastY = 0f
    private val held = BooleanArray(4) // arriba, abajo, izquierda, derecha (botones)
    private val keys = BooleanArray(4) // teclado

    init {
        buildHud()
        stage.addActor(pops)
        stage.addActor(toast)
        Gdx.input.setCatchKey(Input.Keys.BACK, true)
    }

    private fun buildHud() {
        val top = Table().apply {
            setFillParent(true); top().pad(10f, 12f, 0f, 12f)
            defaults().left()
            add(Table().apply {
                add(Image(ui.coin)).size(16f).padRight(6f); add(coinsLabel)
                add(comboLabel).expandX().center()
                add(rightLabel).right()
            }).growX().row()
            add(progressBar).growX().padTop(6f).row()
            add(phaseLabel).padTop(2f).row()
            if (mode == GameMode.SURVIVAL) {
                add(com.badlogic.gdx.scenes.scene2d.ui.Stack(hullBar, Table().apply { add(hullLabel).left().padLeft(8f).expandX() }))
                    .width(230f).height(16f).padTop(4f).row()
            }
        }
        top.touchable = Touchable.childrenOnly
        stage.addActor(top)

        val pause = Button(Button.ButtonStyle(ui.roundButton, ui.roundButtonDown, null)).apply {
            add(Image(ui.pauseIcon)).size(14f)
            onChange { pauseGame() }
        }
        stage.addActor(Table().apply {
            setFillParent(true); top().right().padTop(66f).padRight(10f)
            touchable = Touchable.childrenOnly
            add(pause).size(42f)
        })

        stage.addActor(Table().apply {
            setFillParent(true); touchable = Touchable.disabled
            add(countLabel).expand().center()
        })
        stage.addActor(Table().apply {
            setFillParent(true); touchable = Touchable.disabled
            bottom().padBottom(if (control == ControlScheme.BUTTONS) 160f else 24f)
            add(hintLabel).width(320f)
        })
        hintLabel.addAction(Actions.sequence(Actions.delay(6.5f), Actions.fadeOut(0.6f)))

        if (control == ControlScheme.BUTTONS) {
            fun pad(dir: Int) = Button(Button.ButtonStyle(ui.roundButton, ui.roundButtonDown, null)).apply {
                add(Image(ui.arrow(dir))).size(22f)
                addListener(object : InputListener() {
                    override fun touchDown(e: InputEvent, x: Float, y: Float, p: Int, b: Int): Boolean { held[dir] = true; return true }
                    override fun touchUp(e: InputEvent, x: Float, y: Float, p: Int, b: Int) { held[dir] = false }
                })
            }
            stage.addActor(Table().apply {
                setFillParent(true); bottom().padBottom(14f).padLeft(12f).padRight(12f)
                touchable = Touchable.childrenOnly
                add(Table().apply { add(pad(0)).size(62f).padBottom(10f).row(); add(pad(1)).size(62f) }).left().expandX()
                add(Table().apply { add(pad(2)).size(62f).padRight(10f); add(pad(3)).size(62f) }).right().bottom()
            })
        }
    }

    /* ---------- ciclo de pantalla ---------- */

    override fun show() {
        Gdx.input.inputProcessor = InputMultiplexer(stage, input)
    }

    override fun resize(width: Int, height: Int) {
        stage.viewport.update(width, height, true)
        world.resize(width, height)
        sky.resize(width, height)
    }

    /** La app pasó a segundo plano (llamada, cambio de app): se pausa sola. */
    override fun pause() = pauseGame()

    /** Solo en versiones de prueba: escribe los cuadros por segundo en el registro. */
    var logFps = false
    private var fpsTimer = 0f

    override fun render(delta: Float) {
        if (logFps) {
            fpsTimer += delta
            if (fpsTimer >= 3f) { fpsTimer = 0f; Gdx.app.log("GiroEstelar", "FPS=${Gdx.graphics.framesPerSecond} rocas=${run.rocks.size}") }
        }
        val dt = minOf(delta, 1f / 30f)
        when (state) {
            State.COUNTDOWN -> tickCountdown(dt)
            State.PLAYING -> tickPlaying(dt)
            else -> Unit
        }
        updateColors(dt)
        val moving = state == State.PLAYING || state == State.COUNTDOWN
        val speed = if (moving) run.speed * (if (state == State.COUNTDOWN) 0.25f else 1f) else 0f
        sky.draw(if (state == State.PAUSED) 0f else dt, speed, bg, world.skyShiftX, world.skyShiftY)
        world.render(run, if (state == State.PAUSED) 0f else dt, speed, state == State.PLAYING, bg, accent)
        updateHud()
        updatePops()
        stage.act(dt)
        stage.draw()
    }

    private fun tickCountdown(dt: Float) {
        applyHeld()
        // en la cuenta regresiva la nave ya se puede mover, pero el mundo no avanza
        countdown -= dt
        val n = kotlin.math.ceil(countdown - 0.2f).toInt()
        countLabel.setText(if (n >= 1) n.toString() else "¡YA!")
        if (countdown <= 0f) {
            state = State.PLAYING
            countLabel.addAction(Actions.sequence(Actions.delay(0.3f), Actions.fadeOut(0.3f), Actions.run { countLabel.setText("") }, Actions.alpha(1f)))
        }
    }

    private fun tickPlaying(dt: Float) {
        applyHeld()
        run.tick(dt)
        for (e in run.drainEvents()) onEvent(e)
        when (run.status) {
            RunStatus.CRASHED -> showCrash()
            RunStatus.FINISHED -> finish()
            RunStatus.PLAYING -> Unit
        }
    }

    private fun applyHeld() {
        val up = held[0] || keys[0]
        val down = held[1] || keys[1]
        val left = held[2] || keys[2]
        val right = held[3] || keys[3]
        run.hold((if (right) 1f else 0f) - (if (left) 1f else 0f), (if (down) 1f else 0f) - (if (up) 1f else 0f))
    }

    /* ---------- eventos del dominio → efectos ---------- */

    private fun onEvent(e: RunEvent) {
        when (e) {
            is RunEvent.NearMiss -> { pop(e.x, e.y - 28f, "¡CASI! +${e.bonus}", Palette.OK); world.burst(e.x, e.y - 10f, Palette.OK, 6, 140f, 6f) }
            is RunEvent.CoinPicked -> world.burst(e.x, e.y, Color.valueOf("ffd54a"), 6, 160f, 7f)
            is RunEvent.HullHit -> { pop(run.shipX, run.shipY - 30f, "-${e.damage}% casco", Palette.BAD); world.burst(e.x, e.y, Palette.BAD, 14); world.shake = 0.3f }
            is RunEvent.Smashed -> { world.burst(e.x, e.y, Palette.BAD, 12); world.shake = 0.25f }
            is RunEvent.Crashed -> {
                world.burst(e.x, e.y, Palette.BAD, 40, 260f, 12f); world.burst(e.x, e.y, Color.valueOf("ffd54a"), 24, 200f, 10f)
                world.shake = 0.6f; world.shipVisible = false
            }
            is RunEvent.PhaseChanged -> toast.show(e.title, e.tip)
            is RunEvent.LevelUp -> pop(run.shipX, run.shipY - 46f, "+${e.repaired}% casco", Palette.OK)
            RunEvent.WallIncoming -> pop(Field.W / 2, 60f, "¡Sigue el camino!", Palette.ACC2)
            RunEvent.GoalReached -> world.burst(run.shipX, run.shipY, Palette.ACC, 40, 260f, 10f)
        }
    }

    /* ---------- textos flotantes (siguen al punto 3D) ---------- */

    private class Pop(val label: Label, val x: Float, val y: Float, var life: Float)
    private val popList = ArrayList<Pop>()
    private val v2 = Vector2()

    private fun pop(x: Float, y: Float, text: String, color: Color) {
        val l = Label(text, ui.label(ui.fontBig, color))
        pops.addActor(l)
        popList += Pop(l, x, y, 1.1f)
    }

    private fun updatePops() {
        val it = popList.iterator()
        while (it.hasNext()) {
            val p = it.next()
            if (state != State.PAUSED) p.life -= Gdx.graphics.deltaTime
            if (p.life <= 0f) { p.label.remove(); it.remove(); continue }
            val s = world.project(p.x, 20f, p.y)
            v2.set(s.x, Gdx.graphics.height - s.y)
            stage.screenToStageCoordinates(v2)
            p.label.pack()
            p.label.setPosition(v2.x - p.label.width / 2, v2.y + (1.1f - p.life) * 30f)
            p.label.color.a = minOf(1f, p.life * 1.5f)
        }
    }

    /* ---------- HUD y colores ---------- */

    private fun updateHud() {
        coinsLabel.setText(run.coins.toString())
        comboLabel.setText(if (run.combo > 0) "x${run.multiplier} · ${run.combo}" else "")
        if (mode == GameMode.SURVIVAL) {
            val p = run.progress
            rightLabel.setText(formatTime(run.time.toInt()))
            progressBar.value = (p % Balance.LEVEL_SIZE) / Balance.LEVEL_SIZE * 100f
            phaseLabel.setText("SUPERVIVENCIA · Nivel ${run.level}" + if (run.demo) " · modo demo" else "")
            val hp = run.hull?.percent ?: 100
            hullBar.value = hp.toFloat()
            hullBar.style = when { hp > 60 -> ui.hullGood; hp > 30 -> ui.hullMid; else -> ui.hullLow }
            hullLabel.setText("CASCO $hp%")
        } else {
            rightLabel.setText("${minOf(Balance.ADVENTURE_GOAL, run.points.toInt())}/${Balance.ADVENTURE_GOAL}")
            progressBar.value = minOf(100f, run.progress)
            val name = com.giroestelar.domain.run.Phases.ADVENTURE.last { run.progress >= it.at }.name
            phaseLabel.setText(name + if (run.demo) " · modo demo (no mueres)" else "")
        }
    }

    private fun updateColors(dt: Float) {
        val target = if (mode == GameMode.SURVIVAL) survivalPalette[(run.level - 1) % survivalPalette.size]
        else adventurePalette.last { run.progress >= it.first }.second
        val k = minOf(1f, dt * 0.8f)
        bg.lerp(target.first, k)
        accent.lerp(target.second, k)
    }

    /* ---------- pausa ---------- */

    private var pauseOverlay: Overlay? = null

    /** Atrás: pausa la partida, o la reanuda si ya estaba en pausa. */
    override fun onBack(): Boolean {
        when (state) {
            State.PAUSED -> resumeGame()
            State.PLAYING, State.COUNTDOWN -> pauseGame()
            else -> Unit
        }
        return true
    }

    private var resumeTo = State.PLAYING

    private fun resumeGame() {
        pauseOverlay?.close()
        pauseOverlay = null
        state = resumeTo
    }

    private fun pauseGame() {
        if (state != State.PLAYING && state != State.COUNTDOWN) return
        resumeTo = state
        state = State.PAUSED
        held.fill(false); keys.fill(false); dragPointer = -1
        val o = Overlay(ui)
        val info = if (mode == GameMode.SURVIVAL) "Supervivencia · ${formatTime(run.time.toInt())} · Nivel ${run.level}"
        else "Aventura · ${run.points.toInt()} de ${Balance.ADVENTURE_GOAL} puntos"
        o.card.apply {
            defaults().growX()
            add(Label("Pausa", ui.label(ui.fontBig)).apply { setAlignment(Align.center) }).row()
            add(Label(info, ui.label(ui.fontSmall, Palette.MUTE)).apply { setAlignment(Align.center) }).padTop(4f).row()
            add(TextButton("Continuar", ui.btnPrimary).apply { onChange { resumeGame() } }).height(50f).padTop(12f).row()
            add(TextButton("Salir al menú", ui.btnAlt).apply { onChange { deps.quitRun(run); onExit() } }).height(48f).padTop(8f).row()
            add(Label("Si sales, la partida termina y conservas las monedas que juntaste.", ui.label(ui.fontSmall, Palette.MUTE))
                .apply { wrap = true; setAlignment(Align.center) }).padTop(10f)
        }
        pauseOverlay = o
        stage.addActor(o)
    }

    /* ---------- choque y revivir ---------- */

    private fun showCrash() {
        state = State.CRASHED
        held.fill(false); keys.fill(false)
        if (!deps.reviveRun.canRevive(run)) {
            stage.addAction(Actions.sequence(Actions.delay(0.7f), Actions.run { finish() }))
            return
        }
        val o = Overlay(ui)
        val info = if (mode == GameMode.SURVIVAL) "Aguantaste ${formatTime(run.time.toInt())} · Nivel ${run.level}"
        else "Llevabas ${run.points.toInt()} de ${Balance.ADVENTURE_GOAL} puntos y ${run.coins} monedas"
        o.card.apply {
            defaults().growX()
            add(Label("¡Chocaste!", ui.label(ui.fontBig)).apply { setAlignment(Align.center) }).row()
            add(Label(info, ui.label(ui.fontSmall, Palette.MUTE)).apply { wrap = true; setAlignment(Align.center) }).padTop(4f).row()
            add(TextButton("Revivir viendo un anuncio", ui.btnAd).apply {
                onChange {
                    o.close()
                    deps.reviveRun(run) { ok ->
                        if (ok) {
                            world.shipVisible = true
                            if (mode == GameMode.SURVIVAL) pop(run.shipX, run.shipY - 40f, "Casco ${run.hull?.percent}%", Palette.OK)
                            state = State.PLAYING
                        } else finish()
                    }
                }
            }).height(50f).padTop(12f).row()
            add(TextButton("No, gracias", ui.btnAlt).apply { onChange { o.close(); finish() } }).height(46f).padTop(8f).row()
            add(Label("Una vez por partida, voluntario. Siempre ves qué ganas antes de aceptar.", ui.label(ui.fontSmall, Palette.MUTE))
                .apply { wrap = true; setAlignment(Align.center) }).padTop(10f)
        }
        stage.addAction(Actions.sequence(Actions.delay(0.45f), Actions.run { stage.addActor(o) }))
    }

    /* ---------- final ---------- */

    private fun finish() {
        if (state == State.ENDED) return
        state = State.ENDED
        val s = deps.finishRun(run)
        summary = s
        val o = Overlay(ui, 350f)
        val c = o.card
        c.defaults().growX()

        fun line(text: String, color: Color = Palette.MUTE, big: Boolean = false) =
            c.add(Label(text, ui.label(if (big) ui.fontBig else ui.fontSmall, color)).apply { wrap = true; setAlignment(Align.center) }).padTop(4f).row()

        fun stats(vararg items: Pair<String, String>) {
            c.add(Table().apply {
                for ((value, name) in items) add(Table().apply {
                    background = ui.box; pad(8f, 2f, 8f, 2f)
                    add(Label(value, ui.label(ui.fontBig))).row()
                    add(Label(name, ui.label(ui.fontSmall, Palette.MUTE)))
                }).growX().uniformX().pad(3f)
            }).padTop(8f).row()
        }

        if (s.mode == GameMode.SURVIVAL) {
            line("Aguantaste ${formatTime(s.seconds)}", Palette.INK, big = true)
            when {
                s.isRecord -> line("¡Nuevo récord!", Palette.OK)
                s.rank > 0 -> line("Te faltaron ${s.top[s.rank - 1] - s.seconds} s para subir al puesto ${s.rank}")
                s.rank < 0 && s.top.isNotEmpty() -> line("Récord: ${formatTime(s.top[0])}")
            }
            stats(s.level.toString() to "Nivel", s.dodged.toString() to "Esquivados", s.nearMisses.toString() to "Casi", "x${1 + minOf(3, s.bestCombo / 3)}" to "Combo")
            c.add(Table().apply {
                defaults().growX().padTop(3f)
                add(Label("Tus mejores tiempos", ui.label(ui.fontSmall))).left().row()
                s.top.forEachIndexed { i, v ->
                    val me = i == s.rank
                    add(Table().apply {
                        background = if (me) ui.panel(Palette.PANEL2, Palette.OK, 8f) else ui.box
                        pad(5f, 10f, 5f, 10f)
                        add(Label("${i + 1}.  ${if (me) "Esta partida" else ""}", ui.label(ui.fontSmall, if (me) Palette.OK else Palette.MUTE))).left().expandX()
                        add(Label(formatTime(v), ui.label(ui.fontSmall, if (me) Palette.OK else Palette.INK))).right()
                    }).row()
                }
            }).padTop(8f).row()
        } else {
            line(if (s.won) "¡Llegaste a la meta!" else "Partida terminada", Palette.INK, big = true)
            if (s.won) line("El jefe final llega en una próxima versión de la app.")
            line(if (s.isRecord) "¡Nuevo récord! ${s.points} puntos" else "Récord: ${s.best} puntos", if (s.isRecord) Palette.OK else Palette.MUTE)
            stats("${s.points}" to "Puntos", s.dodged.toString() to "Esquivados", s.nearMisses.toString() to "Casi", "x${1 + minOf(3, s.bestCombo / 3)}" to "Combo")
            if (!s.won) line("Te faltaron ${maxOf(0, Balance.ADVENTURE_GOAL - s.points)} puntos para la meta.")
        }
        line("+${s.coinsGained} monedas", Palette.ACC2, big = true)
        line(if (s.missionCompleted) "¡Misión diaria completada! +20 monedas" else "Misión diaria: esquiva 50 obstáculos · ${s.missionProgress}/50",
            if (s.missionCompleted) Palette.OK else Palette.MUTE)

        if (s.coinsGained > 0) {
            val dbl = TextButton("Duplicar monedas con anuncio · +${s.coinsGained}", ui.btnAd)
            dbl.onChange {
                if (dbl.isDisabled) return@onChange
                deps.doubleCoins(s.coinsGained) { got -> if (got != null) { dbl.setText("Monedas duplicadas"); dbl.isDisabled = true } }
            }
            c.add(dbl).height(48f).padTop(10f).row()
        }
        val again = if (s.mode == GameMode.SURVIVAL) ui.btnSurvival else ui.btnPrimary
        c.add(TextButton("Jugar otra vez", again).apply { onChange { restart() } }).height(50f).padTop(8f).row()
        c.add(TextButton("Menú", ui.btnAlt).apply { onChange { onExit() } }).height(46f).padTop(8f)
        stage.addAction(Actions.sequence(Actions.delay(if (run.status == RunStatus.FINISHED) 1.2f else 0.2f), Actions.run { stage.addActor(o) }))
    }

    /** Lo pone el punto de armado: cómo empezar otra partida igual. */
    var onRestart: (() -> Unit)? = null
    private fun restart() = onRestart?.invoke()

    /* ---------- dedo y teclado ---------- */

    private val input = object : InputAdapter() {
        private fun canMove() = state == State.PLAYING || state == State.COUNTDOWN

        override fun touchDown(x: Int, y: Int, pointer: Int, button: Int): Boolean {
            if (control != ControlScheme.SWIPE || dragPointer != -1 || !canMove()) return false
            dragPointer = pointer; lastX = x.toFloat(); lastY = y.toFloat()
            return true
        }

        override fun touchDragged(x: Int, y: Int, pointer: Int): Boolean {
            if (pointer != dragPointer) return false
            // la nave se mueve lo mismo que el dedo (sensibilidad del prototipo)
            val u = Field.W / Gdx.graphics.width * 0.85f
            if (canMove()) run.moveBy((x - lastX) * u, (y - lastY) * u)
            lastX = x.toFloat(); lastY = y.toFloat()
            return true
        }

        override fun touchUp(x: Int, y: Int, pointer: Int, button: Int): Boolean {
            if (pointer == dragPointer) dragPointer = -1
            return false
        }

        private fun keyIndex(k: Int) = when (k) {
            Input.Keys.UP, Input.Keys.W -> 0
            Input.Keys.DOWN, Input.Keys.S -> 1
            Input.Keys.LEFT, Input.Keys.A -> 2
            Input.Keys.RIGHT, Input.Keys.D -> 3
            else -> -1
        }

        override fun keyDown(keycode: Int): Boolean {
            if (logFps) Gdx.app.log("GiroEstelar", "keyDown $keycode")
            if (keycode == Input.Keys.BACK || keycode == Input.Keys.ESCAPE || keycode == Input.Keys.P) return onBack()
            val i = keyIndex(keycode)
            if (i >= 0) keys[i] = true
            return i >= 0
        }

        override fun keyUp(keycode: Int): Boolean {
            val i = keyIndex(keycode)
            if (i >= 0) keys[i] = false
            return i >= 0
        }
    }

    override fun dispose() {
        stage.dispose()
        world.dispose()
        sky.dispose()
    }
}

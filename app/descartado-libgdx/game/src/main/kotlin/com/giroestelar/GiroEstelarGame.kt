package com.giroestelar

import com.badlogic.gdx.Game
import com.badlogic.gdx.Gdx
import com.badlogic.gdx.Screen
import com.badlogic.gdx.graphics.Color
import com.badlogic.gdx.graphics.Pixmap
import com.badlogic.gdx.graphics.PixmapIO
import com.badlogic.gdx.scenes.scene2d.Stage
import com.giroestelar.adapters.ads.SimulatedAdsService
import com.giroestelar.adapters.clock.SystemClock
import com.giroestelar.adapters.render.Models3D
import com.giroestelar.adapters.ui.BackHandler
import com.giroestelar.adapters.storage.GdxPreferencesProfileRepository
import com.giroestelar.adapters.ui.GameDeps
import com.giroestelar.adapters.ui.GameScreen
import com.giroestelar.adapters.ui.MenuDeps
import com.giroestelar.adapters.ui.MenuScreen
import com.giroestelar.adapters.ui.UiKit
import com.giroestelar.application.ports.AdsService
import com.giroestelar.application.usecases.ChangeControlScheme
import com.giroestelar.application.usecases.DoubleDailyChest
import com.giroestelar.application.usecases.DoubleRunCoins
import com.giroestelar.application.usecases.FinishRun
import com.giroestelar.application.usecases.GetChestState
import com.giroestelar.application.usecases.GetProfile
import com.giroestelar.application.usecases.OpenDailyChest
import com.giroestelar.application.usecases.QuitRun
import com.giroestelar.application.usecases.ReviveRun
import com.giroestelar.application.usecases.StartRun
import com.giroestelar.domain.progression.GameMode

/**
 * Opciones solo para pruebas automáticas.
 * @property screenshot guarda una captura en ese archivo y cierra
 * @property screenshotAfter cuántos cuadros esperar antes de la captura
 * @property openChest abre el cofre diario al arrancar
 * @property play empieza directo una partida de ese modo (en modo demo)
 */
data class DebugOptions(
    val screenshot: String? = null,
    val screenshotAfter: Int = 45,
    val openChest: Boolean = false,
    val play: GameMode? = null,
    /** Escribe los cuadros por segundo en el registro durante la partida. */
    val logFps: Boolean = false,
)

/**
 * Punto de armado (composition root): el único lugar que conoce todas las
 * piezas concretas. Cada plataforma puede pasar sus propios adaptadores
 * (por ejemplo AdMob en Android); si no, se usan los simulados.
 */
class GiroEstelarGame(
    private val adsFactory: ((UiKit, () -> Stage) -> AdsService)? = null,
    private val debug: DebugOptions = DebugOptions(),
) : Game() {

    private lateinit var ui: UiKit
    private lateinit var models: Models3D
    private lateinit var menu: MenuScreen
    private lateinit var gameDeps: GameDeps
    private lateinit var getProfile: GetProfile
    private var currentStage: () -> Stage = { menu.stage }
    private var frames = 0

    override fun create() {
        ui = UiKit()
        models = Models3D(Color.valueOf("5ee0ff"))

        /* ---- adaptadores ---- */
        val repo = GdxPreferencesProfileRepository()
        val clock = SystemClock()
        val ads = adsFactory?.invoke(ui) { currentStage() } ?: SimulatedAdsService(ui, { currentStage() })

        /* ---- casos de uso ---- */
        getProfile = GetProfile(repo)
        gameDeps = GameDeps(
            startRun = StartRun(),
            finishRun = FinishRun(repo),
            quitRun = QuitRun(repo),
            reviveRun = ReviveRun(ads),
            doubleCoins = DoubleRunCoins(repo, ads),
        )
        menu = MenuScreen(
            ui,
            MenuDeps(
                getProfile = getProfile,
                changeControl = ChangeControlScheme(repo),
                getChest = GetChestState(repo, clock),
                openChest = OpenDailyChest(repo, clock),
                doubleChest = DoubleDailyChest(repo, clock, ads),
                onPlay = ::play,
            ),
        )
        showMenu()
        if (debug.openChest) menu.openChestDialog()
        debug.play?.let { play(it, demo = true) }
    }

    /* ---------- navegación ---------- */

    private fun play(mode: GameMode, demo: Boolean) {
        if (mode != GameMode.ADVENTURE && mode != GameMode.SURVIVAL) {
            menu.toast.show("Próximamente en la app", if (mode == GameMode.SPACE) "Viaje espacial llega en la fase 5" else "El jefe final llega en la fase 4")
            return
        }
        val screen = GameScreen(ui, models, gameDeps, mode, demo, getProfile().control, onExit = ::showMenu)
        screen.onRestart = { play(mode, demo) }
        screen.logFps = debug.logFps
        currentStage = { screen.stage }
        switchTo(screen)
    }

    private fun showMenu() {
        currentStage = { menu.stage }
        switchTo(menu)
    }

    /** Cambia de pantalla y libera la partida anterior (el menú se reutiliza). */
    private fun switchTo(next: Screen) {
        val previous = screen
        setScreen(next)
        if (previous != null && previous !== menu && previous !== next) {
            Gdx.app.postRunnable { previous.dispose() }
        }
    }

    /**
     * Botón/gesto "atrás" del sistema (lo llama la plataforma). En una partida
     * pausa o reanuda; en el menú cierra la ventana abierta o sale de la app.
     */
    fun onSystemBack() {
        Gdx.app.postRunnable {
            val handled = (screen as? BackHandler)?.onBack() ?: false
            if (!handled) Gdx.app.exit()
        }
    }

    override fun render() {
        super.render()
        val shot = debug.screenshot ?: return
        if (++frames == debug.screenshotAfter) {
            val w = Gdx.graphics.backBufferWidth
            val h = Gdx.graphics.backBufferHeight
            val pm = Pixmap.createFromFrameBuffer(0, 0, w, h)
            PixmapIO.writePNG(Gdx.files.absolute(shot), pm, -1, true)
            pm.dispose()
            Gdx.app.exit()
        }
    }

    override fun dispose() {
        val s = screen
        super.dispose()
        if (s != null && s !== menu) s.dispose()
        menu.dispose()
        models.dispose()
        ui.dispose()
    }
}

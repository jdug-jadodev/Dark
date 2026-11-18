package com.giroestelar.desktop

import com.badlogic.gdx.backends.lwjgl3.Lwjgl3Application
import com.badlogic.gdx.backends.lwjgl3.Lwjgl3ApplicationConfiguration
import com.giroestelar.DebugOptions
import com.giroestelar.GiroEstelarGame
import com.giroestelar.domain.progression.GameMode

/** Lanzador de PC: ventana con proporción de celular para probar rápido. */
fun main() {
    val config = Lwjgl3ApplicationConfiguration().apply {
        setTitle("Giro Estelar")
        setWindowedMode(390, 780)
        // posición fija: si no, GLFW pregunta por el monitor y falla en sesiones remotas (SSH)
        setWindowPosition(60, 60)
        setResizable(true)
        useVsync(true)
        setForegroundFPS(60)
        setBackBufferConfig(8, 8, 8, 8, 16, 0, 4)
    }
    val debug = DebugOptions(
        screenshot = System.getProperty("giro.screenshot"),
        screenshotAfter = System.getProperty("giro.frames")?.toIntOrNull() ?: 45,
        openChest = System.getProperty("giro.openChest") == "true",
        play = System.getProperty("giro.play")?.let { runCatching { GameMode.valueOf(it.uppercase()) }.getOrNull() },
    )
    Lwjgl3Application(GiroEstelarGame(debug = debug), config)
}

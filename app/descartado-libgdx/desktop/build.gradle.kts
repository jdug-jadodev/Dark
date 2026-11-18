import org.jetbrains.kotlin.gradle.dsl.JvmTarget

/* Lanzador de PC: para probar rápido sin pasar el APK al celular. */
plugins {
    kotlin("jvm")
    application
}

val gdxVersion: String by project

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

kotlin {
    compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
}

sourceSets["main"].resources.srcDir("../assets")

dependencies {
    implementation(project(":game"))
    implementation("com.badlogicgames.gdx:gdx-backend-lwjgl3:$gdxVersion")
    implementation("com.badlogicgames.gdx:gdx-platform:$gdxVersion:natives-desktop")
    implementation("com.badlogicgames.gdx:gdx-freetype-platform:$gdxVersion:natives-desktop")
}

application {
    mainClass.set("com.giroestelar.desktop.DesktopLauncherKt")
}

tasks.named<JavaExec>("run") {
    workingDir = rootProject.file("assets")
    // Pasa -Pscreenshot=archivo.png para guardar una captura y cerrar (pruebas automáticas)
    if (project.hasProperty("openChest")) systemProperty("giro.openChest", "true")
    project.findProperty("play")?.let { systemProperty("giro.play", it.toString()) }
    project.findProperty("frames")?.let { systemProperty("giro.frames", it.toString()) }
    project.findProperty("screenshot")?.let { systemProperty("giro.screenshot", it.toString()) }
}

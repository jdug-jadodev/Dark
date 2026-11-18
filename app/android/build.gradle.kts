import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    kotlin("android")
}

android {
    namespace = "com.giroestelar"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.giroestelar"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.2.0"
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildTypes {
        release { isMinifyEnabled = false }
    }
}

kotlin {
    compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
    testImplementation(kotlin("test"))
}

tasks.withType<Test>().configureEach { useJUnitPlatform() }

/*
 * El juego vive en ../demo-juego.html (el laboratorio). En cada compilación se copia a la app,
 * cambiando solo de dónde carga Three.js: de internet (CDN) al archivo incluido en la app.
 * Así lo que se prueba en el HTML es exactamente lo que corre en el celular.
 */
val syncGame by tasks.registering {
    val source = rootProject.file("../demo-juego.html")
    val target = layout.projectDirectory.file("src/main/assets/game/index.html").asFile
    inputs.file(source)
    outputs.file(target)
    doLast {
        val cdn = Regex("""<script src="https://[^"]*three[^"]*"></script>""")
        val html = source.readText()
        check(cdn.containsMatchIn(html)) { "No encontré la etiqueta de Three.js en demo-juego.html" }
        target.parentFile.mkdirs()
        target.writeText(html.replace(cdn, """<script src="three.min.js"></script>"""))
    }
}
tasks.named("preBuild") { dependsOn(syncGame) }

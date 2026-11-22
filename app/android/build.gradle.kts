import java.util.Properties
import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
    id("com.android.application")
    kotlin("android")
}

/* cuenta.properties: el identificador de Google para iniciar sesión (vacío = sin cuentas) */
val cuenta = Properties().apply {
    val file = rootProject.file("cuenta.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}
val googleClientId: String = cuenta.getProperty("googleClientId", "").trim()

android {
    namespace = "com.giroestelar"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.giroestelar"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.2.0"
        buildConfigField("String", "GOOGLE_CLIENT_ID", "\"" + googleClientId + "\"")
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures { buildConfig = true }

    buildTypes {
        release { isMinifyEnabled = false }
    }
}

kotlin {
    compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
}

dependencies {
    implementation("androidx.webkit:webkit:1.12.1")
    /* entrar con Google por el sistema de Android (Credential Manager) */
    implementation("androidx.credentials:credentials:1.5.0")
    implementation("androidx.credentials:credentials-play-services-auth:1.5.0")
    implementation("com.google.android.libraries.identity.googleid:googleid:1.1.1")
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

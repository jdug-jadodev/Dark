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

/* la dirección del servidor del juego: una sola, la que está escrita en el juego */
val apiUrl: String = Regex("""API_URL = '(https://[^']+)'""")
    .find(rootProject.file("../juego/src/core/config.js").readText())?.groupValues?.get(1)
    ?: error("No encontré API_URL en juego/src/core/config.js")

/* anuncios.properties: los identificadores de AdMob. Vacíos = los anuncios de prueba de Google.
   La app de pruebas usa siempre los de prueba (ver application/Ads.kt). */
val anuncios = Properties().apply {
    val file = rootProject.file("anuncios.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}
/* -PanunciosDePrueba: el paquete de publicación sale con los anuncios de prueba de Google aunque haya
   identificadores. Es el que se le da a los probadores: pueden tocar los anuncios sin poner en
   riesgo la cuenta de AdMob. El de producción se genera sin esa opción. */
val adsTestOnly: Boolean = providers.gradleProperty("anunciosDePrueba").isPresent
val adsApp: String = if (adsTestOnly) "" else anuncios.getProperty("appId", "").trim()
val adsVideo: String = if (adsTestOnly) "" else anuncios.getProperty("videoId", "").trim()
val adsBanner: String = if (adsTestOnly) "" else anuncios.getProperty("bannerId", "").trim()
val adsTestApp = "ca-app-pub-3940256099942544~3347511713"
check(
    listOf(adsApp, adsVideo, adsBanner).all { it.isEmpty() } ||
        (Regex("""^ca-app-pub-\d{16}~\d{10}$""").matches(adsApp) &&
            listOf(adsVideo, adsBanner).all { Regex("""^ca-app-pub-\d{16}/\d{10}$""").matches(it) }),
) { "anuncios.properties: van los tres identificadores de AdMob bien escritos, o ninguno" }

/* firma.properties (no se sube al repositorio): dónde está la llave con la que se firma lo que
   se sube a Google Play, y sus claves. Sin ese archivo, la versión de publicación no se firma. */
val firma = Properties().apply {
    val file = rootProject.file("firma.properties")
    if (file.exists()) file.inputStream().use { load(it) }
}

android {
    namespace = "com.giroestelar"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.giroestelar"
        minSdk = 26
        targetSdk = 36
        versionCode = 4
        versionName = "0.2.0"
        buildConfigField("String", "GOOGLE_CLIENT_ID", "\"" + googleClientId + "\"")
        buildConfigField("String", "API_URL", "\"" + apiUrl + "\"")
        buildConfigField("String", "ADS_VIDEO", "\"" + adsVideo + "\"")
        buildConfigField("String", "ADS_BANNER", "\"" + adsBanner + "\"")
        manifestPlaceholders["adsAppId"] = adsTestApp
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    buildFeatures { buildConfig = true }

    signingConfigs {
        if (firma.getProperty("storeFile") != null) {
            create("publicacion") {
                storeFile = file(firma.getProperty("storeFile"))
                storePassword = firma.getProperty("storePassword")
                keyAlias = firma.getProperty("keyAlias")
                keyPassword = firma.getProperty("keyPassword")
            }
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            signingConfig = signingConfigs.findByName("publicacion")
            manifestPlaceholders["adsAppId"] = adsApp.ifEmpty { adsTestApp }
        }
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
    /* cobros con Google Play (la tienda obliga a usar una versión vigente de esta librería) */
    implementation("com.android.billingclient:billing:9.1.0")
    /* anuncios (AdMob) y la ventana con la que Google pide permiso donde la ley lo exige */
    implementation("com.google.android.gms:play-services-ads:25.5.0")
    implementation("com.google.android.ump:user-messaging-platform:4.0.0")
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
        val cdn = Regex("""<script src="https://[^"]*three[^"]*"[^>]*></script>""")
        var html = source.readText()
        check(cdn.containsMatchIn(html)) { "No encontré la etiqueta de Three.js en demo-juego.html" }
        html = html.replace(cdn, """<script src="three.min.js"></script>""")
        /* La política de contenido de la página (juego/build.mjs) se aprieta para la app: aquí no
           hay CDN ni pruebas en el computador, así que el código solo sale de la app misma y las
           conexiones solo van al servidor del juego. (La app de pruebas con un servidor de pruebas
           configurado le agrega ese servidor al abrir la página: ver MainActivity.) */
        for (extra in listOf(" https://cdnjs.cloudflare.com", " http://localhost:* http://127.0.0.1:*")) {
            check(html.contains(extra)) { "La política de contenido de demo-juego.html no trae '$extra': revisa juego/build.mjs" }
            html = html.replace(extra, "")
        }
        check(html.contains("""http-equiv="Content-Security-Policy"""")) { "demo-juego.html no trae política de contenido" }
        /* nada de código traído de internet dentro de la app: todo va incluido */
        check(!Regex("""src\s*=\s*["']?(https?:)?//""").containsMatchIn(html)) {
            "El juego todavía carga algo de internet (src=\"http…\"): en la app todo debe ir incluido"
        }
        target.parentFile.mkdirs()
        target.writeText(html)
    }
}
tasks.named("preBuild") { dependsOn(syncGame) }

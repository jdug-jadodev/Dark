pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}

dependencyResolutionManagement {
    repositories {
        google()
        mavenCentral()
    }
}

rootProject.name = "giro-estelar"

/* App Android en Kotlin. El juego es el mismo de demo-juego.html (Three.js) dentro de un WebView. */
include(":android")

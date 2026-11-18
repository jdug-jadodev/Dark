import org.jetbrains.kotlin.gradle.dsl.JvmTarget

/* Núcleo del juego: dominio + aplicación. Kotlin puro: NO depende de libGDX ni de Android. */
plugins {
    kotlin("jvm")
}

java {
    sourceCompatibility = JavaVersion.VERSION_17
    targetCompatibility = JavaVersion.VERSION_17
}

kotlin {
    compilerOptions { jvmTarget.set(JvmTarget.JVM_17) }
}

dependencies {
    testImplementation(kotlin("test"))
}

tasks.test {
    useJUnitPlatform()
    testLogging { events("failed"); showStandardStreams = false }
}

package com.giroestelar

import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals

/**
 * Guardián de la arquitectura hexagonal. El módulo `core` ni siquiera tiene
 * libGDX ni Android como dependencia; además se revisa que:
 *   domain       → no importa de application ni usa azar del sistema
 *   application  → solo importa del dominio y de sus propios puertos
 */
class ArchitectureTest {
    private val root = File("src/main/kotlin/com/giroestelar")

    private fun sources(dir: String) = File(root, dir).walkTopDown().filter { it.extension == "kt" }.toList()

    private fun code(f: File) = f.readText()
        .replace(Regex("/\\*[\\s\\S]*?\\*/"), "")
        .replace(Regex("//.*"), "")

    private val imports = Regex("^import\\s+([\\w.]+)", RegexOption.MULTILINE)

    @Test
    fun `el dominio no depende de nada externo`() {
        val bad = sources("domain").flatMap { f ->
            val src = code(f)
            val badImports = imports.findAll(src).map { it.groupValues[1] }
                .filter { !it.startsWith("com.giroestelar.domain") && !it.startsWith("kotlin.") && !it.startsWith("java.time") }
                .map { "${f.name} → $it" }
            val randomUse = if (Regex("\\b(Math\\.random|kotlin\\.random|Random\\()").containsMatchIn(src))
                listOf("${f.name} usa azar del sistema") else emptyList()
            badImports.toList() + randomUse
        }
        assertEquals(emptyList(), bad)
    }

    @Test
    fun `la aplicacion solo depende del dominio`() {
        val bad = sources("application").flatMap { f ->
            imports.findAll(code(f)).map { it.groupValues[1] }
                .filter { !it.startsWith("com.giroestelar.domain") && !it.startsWith("com.giroestelar.application") && !it.startsWith("kotlin.") && !it.startsWith("java.time") }
                .map { "${f.name} → $it" }.toList()
        }
        assertEquals(emptyList(), bad)
    }
}

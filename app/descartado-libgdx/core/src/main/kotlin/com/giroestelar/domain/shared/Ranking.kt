package com.giroestelar.domain.shared

/**
 * Resultado de meter un puntaje en una tabla de mejores.
 * @property list la tabla nueva, de mayor a menor
 * @property rank puesto de este resultado (0 = primero), o -1 si no entró
 * @property isRecord true si superó al primero anterior (o si es el primer resultado)
 */
data class TopResult(val list: List<Int>, val rank: Int, val isRecord: Boolean)

/** Inserta un resultado en una tabla de mejores (mayor es mejor). */
fun insertTop(previous: List<Int>, value: Int, max: Int = 5): TopResult {
    val list = (previous + value).sortedDescending().take(max)
    val rank = list.indexOf(value)
    val best = previous.firstOrNull()
    val isRecord = rank == 0 && (best == null || value > best)
    return TopResult(list, rank, isRecord)
}

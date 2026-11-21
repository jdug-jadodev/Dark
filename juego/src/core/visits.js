/**
 * Medición de retorno: en qué días se abrió el juego. Con eso se sabe cuánta gente vuelve al día
 * siguiente, a la semana y al mes (lo calcula el servidor con los datos de todos; aquí solo se anota).
 *
 *   S.first = primer día en que se abrió · S.seen = días abiertos, contados desde S.first (0, 1, 4…)
 *   S.seenSent = cuántos de esos días ya se le contaron al servidor
 */
import { dayNo, today } from './daily.js';
import { S, save } from './profile.js';

const KEEP = 400; // días que se recuerdan (más de un año)

/* se abrió el juego: anota el día de hoy. Devuelve true si es un día nuevo */
export function noteVisit() {
  if (!S.first) S.first = today();
  const n = dayNo(today()) - dayNo(S.first),
    seen = S.seen || [];
  if (n < 0 || seen.includes(n)) return false; // n < 0: le atrasaron el reloj al teléfono
  seen.push(n);
  while (seen.length > KEEP) {
    seen.shift();
    S.seenSent = Math.max(0, (S.seenSent || 0) - 1);
  }
  S.seen = seen;
  save();
  return true;
}
/* cuántos días distintos ha jugado */
export const daysPlayed = () => (S.seen || []).length;
/* lo que falta por contarle al servidor, y cómo marcarlo como contado */
export const unsentVisits = () => (S.seen || []).slice(S.seenSent || 0);
export function visitsSent(count) {
  S.seenSent = Math.min((S.seen || []).length, (S.seenSent || 0) + count);
  save();
}

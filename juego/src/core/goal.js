/**
 * La meta del jugador: la pieza que quiere comprar. Se marca en el taller y el lobby y el fin de
 * partida muestran cuánto falta, para que cada partida se sienta como un paso hacia algo.
 *   S.goal = id de la pieza (se borra sola al comprarla)
 */
import { owns } from './garage.js';
import { PARTS } from './parts.js';
import { S, save } from './profile.js';
import { priceNow } from './season.js';

/* la pieza marcada como meta, o null (si ya se compró, deja de ser meta) */
export function goal() {
  const p = S.goal && PARTS[S.goal];
  return p && !owns(p.id) ? p : null;
}
export const isGoal = (id) => S.goal === id && !owns(id);
/* marcar o desmarcar */
export function toggleGoal(id) {
  if (S.goal === id) delete S.goal;
  else S.goal = id;
  save();
  return S.goal === id;
}
/* monedas que faltan (0 = ya alcanza) y avance de 0 a 100 */
export function goalLeft() {
  const g = goal();
  return g ? Math.max(0, priceNow(g) - S.coins) : 0;
}
export function goalPct() {
  const g = goal();
  return g ? Math.min(100, Math.round((S.coins / priceNow(g)) * 100)) : 0;
}

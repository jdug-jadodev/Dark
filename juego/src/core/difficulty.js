/** Curvas de dificultad: progreso, nivel, velocidad, frecuencia de rocas, tope de naves. */
import { G } from './state.js';
import { CHAOS_LVL, FRENZY_LVL, GOAL, LVL, RAINBOW_LVL, SPAWN, SURV_RATE, UNCAP_LVL } from './config.js';
import { clamp } from './util.js';
/* En Supervivencia el progreso es el tiempo. `head` es una ventaja de salida que solo se usa
   para probar niveles altos sin tener que jugar varios minutos (modo demo). */
export const prog = () => (G.run.mode === 'endless' ? G.t * SURV_RATE + (G.run.head || 0) : (G.run.pts / GOAL) * 100);
export const level = () => 1 + Math.floor(prog() / LVL);
/* Ritmo de la dificultad "de fondo" (velocidad, cantidad de rocas, naves). En Aventura es el
   progreso tal cual. En Supervivencia, del nivel 5 al 20 avanza a la mitad: en esos niveles lo
   nuevo son los giros y los cometas, y no hace falta que además todo vaya cada vez más rápido.
   Del 20 en adelante vuelve a apretar. */
export const pace = () => {
  const x = prog();
  if (G.run.mode !== 'endless' || x <= 48) return x;
  return x <= 228 ? 48 + (x - 48) * 0.5 : 138 + (x - 228) * 0.9;
};
export const ap = (y) => 1 + 1.4 * clamp(-y / SPAWN, 0, 1);
/* Dificultad: velocidad y frecuencia de rocas según el progreso (0–100) */
/* Pasado el 100% (solo en Supervivencia) sigue subiendo, con un tope jugable */
export const speedAt = (x) => Math.min(680, 235 + Math.min(100, x) * 2.45 + Math.max(0, x - 100) * 1);
/* pasado el 100 % (niveles 9 a 15 de Supervivencia) las rocas aumentan despacio; del 15 en adelante, más rápido */
export const intervalAt = (x) =>
  Math.max(0.2, 0.72 - 0.42 * Math.min(1, x / 85) - clamp(x - 100, 0, 68) * 0.0006 - Math.max(0, x - 168) * 0.0014);
export const mult = () => 1 + Math.min(3, Math.floor(G.run.combo / 3));
/* la pantalla está girada (o girando): se baja la presión */
export const flipping = () =>
  (G.run.rot.st >= 1 && G.run.rot.st <= 4) || (G.run.mode === 'boss' && G.run.flipStart !== null);
export function enemyCap() {
  let cap;
  if (G.run.mode === 'endless') {
    const lv = level();
    cap = lv >= UNCAP_LVL ? Infinity : lv < 4 ? 2 : 3;
  } else cap = 6;
  return flipping() ? Math.min(cap, lv30() ? 4 : 2) : cap;
}
const lv30 = () => G.run.mode === 'endless' && level() >= UNCAP_LVL;

/* ---------- Supervivencia: menos disparos y más asteroides a medida que sube el nivel ---------- */
/* nivel de Supervivencia (0 en los demás modos) */
export const survLv = () => (G.run && G.run.mode === 'endless' ? level() : 0);
/* cuánto más tardan las naves entre disparo y disparo: 1 hasta el nivel 4, el doble desde el 13 */
export const shotRest = () => 1 + clamp((survLv() - 4) * 0.12, 0, 1);
/* tope de naves pesadas (las que disparan de a tres): en Supervivencia son menos */
export const heavyMax = () => (survLv() ? 0.35 : 0.7);
/* probabilidad de que caiga una roca extra junto a otra: igual que siempre hasta el nivel 12,
   y de ahí sube de a poco */
export const extraRock = () => 0.3 + clamp((survLv() - 12) * 0.02, 0, 0.25);
/* desde el nivel 18, a veces cae una tercera; desde el 22 y el 28, más seguido */
export const thirdRock = () => {
  const lv = survLv();
  return lv >= 28 ? 0.3 : lv >= 22 ? 0.2 : lv >= 18 ? 0.12 : 0;
};

/* ---------- Supervivencia: la "locura" por niveles ---------- */
/* tramo: 0 normal · 1 desde el nivel 5 · 2 desde el 10 · 3 desde el 15 · 4 desde el 20 */
export function chaos() {
  const lv = survLv();
  return lv < CHAOS_LVL ? 0 : lv < 10 ? 1 : lv < RAINBOW_LVL ? 2 : lv < FRENZY_LVL ? 3 : 4;
}

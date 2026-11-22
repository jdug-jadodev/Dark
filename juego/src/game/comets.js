/**
 * Cometas (Supervivencia, desde el nivel 5): cruzan la pista en cualquier dirección. Al principio
 * van lentos, casi como una roca; con cada nivel van más rápido y salen más seguido.
 * Antes de pasar avisan: durante un momento se marca el carril por donde van a cruzar y desde
 * qué lado vienen, para que la nave se salga de ahí. No se pueden destruir, solo esquivar.
 *
 * Cada cometa recorre una recta: pasa por el punto (ax, ay) en la dirección (dx, dy), y `s`
 * dice en qué parte de la recta va (0 = el punto al que apuntó, negativo = todavía no llega).
 */
import { emit } from '../core/events.js';
import { G } from '../core/state.js';
import {
  CHAOS_LVL,
  COMET_FAST,
  COMET_R,
  COMET_SLOW,
  COMET_WARN,
  FRENZY_LVL,
  H,
  HULL_COMET,
  SPAWN,
  SY,
  W,
} from '../core/config.js';
import { chaos, flipping, level } from '../core/difficulty.js';
import { clamp, roll, rollIn } from '../core/util.js';
import { takeHit } from './adventure.js';
import { explode, mark } from './run.js';

/* zona de la que el cometa entra y sale: la pista más un margen */
const X0 = -40,
  X1 = W + 40,
  Y0 = -SPAWN - 60,
  Y1 = H + 140;
/* cuánto hay que avanzar desde (x, y) en la dirección (dx, dy) para salir de la zona */
function exitDist(x, y, dx, dy) {
  const tx = dx > 0 ? (X1 - x) / dx : dx < 0 ? (X0 - x) / dx : Infinity,
    ty = dy > 0 ? (Y1 - y) / dy : dy < 0 ? (Y0 - y) / dy : Infinity;
  return Math.min(tx, ty);
}
function spawnComet(warn, v) {
  const a = rollIn('comet', 0, Math.PI * 2);
  mark('comet', a);
  const dx = Math.cos(a),
    dy = Math.sin(a);
  /* apunta a donde está la nave (con un poco de error): hay que moverse para que no pegue */
  const ax = clamp(G.ship.x + rollIn('comet', -28, 28), 20, W - 20),
    ay = clamp(G.ship.y + rollIn('comet', -28, 28), H * 0.42, SY + 15);
  G.run.comets.push({
    ax,
    ay,
    dx,
    dy,
    s: -Math.max(exitDist(ax, ay, -dx, -dy), 420),
    end: exitDist(ax, ay, dx, dy) + 120,
    warn,
    warn0: warn,
    v,
    r: COMET_R,
    hit: false,
  });
  emit('cometWarn');
}
/* cada cuántos segundos sale uno, por tramos de 5 niveles: 5–9, 10–14, 15–19, 20–24, 25–29, 30+ */
const EVERY = [
  [14, 20],
  [9, 13],
  [6, 9],
  [4, 6],
  [3, 4.5],
  [2.2, 3.5],
];
/* Avanza los cometas. Devuelve true si la nave chocó y la partida se detuvo. */
export function updateComets(dt) {
  const R = G.run;
  const wc = R.world && R.world.comets; // en un mundo, el ritmo lo pone el mundo
  if ((wc || chaos() >= 1) && !flipping() && !R.bossDue) {
    R.cometT -= dt;
    if (R.cometT <= 0 && wc) {
      R.cometT = rollIn('comet', wc.every[0], wc.every[1]);
      spawnComet(wc.warn, COMET_SLOW + (COMET_FAST - COMET_SLOW) * wc.v);
    } else if (R.cometT <= 0) {
      const lv = level(),
        warn = Math.max(1, Math.max(1.3, COMET_WARN - (lv - CHAOS_LVL) * 0.04) - Math.max(0, lv - FRENZY_LVL) * 0.02),
        /* velocidad: sube parejo del nivel 5 al 20 */
        v = COMET_SLOW + (COMET_FAST - COMET_SLOW) * clamp((lv - CHAOS_LVL) / (FRENZY_LVL - CHAOS_LVL), 0, 1),
        every = EVERY[Math.min(EVERY.length - 1, Math.floor((lv - CHAOS_LVL) / 5))];
      R.cometT = rollIn('comet', every[0], every[1]);
      spawnComet(warn, v);
      if (lv >= 25 && roll('comet') < 0.3) spawnComet(warn, v); // desde el 25, a veces dos que se cruzan
    }
  }
  for (let i = R.comets.length - 1; i >= 0; i--) {
    const c = R.comets[i];
    if (c.warn > 0) {
      c.warn -= dt;
      if (c.warn <= 0) emit('comet');
      continue;
    }
    const from = c.s;
    c.s += c.v * dt;
    /* va tan rápido que en un cuadro avanza más que su tamaño: se revisa todo el tramo recorrido */
    const along = (G.ship.x - c.ax) * c.dx + (G.ship.y - c.ay) * c.dy,
      sn = clamp(along, from, c.s),
      px = c.ax + c.dx * sn,
      py = c.ay + c.dy * sn;
    if (!c.hit && Math.hypot(px - G.ship.x, py - G.ship.y) < c.r + G.ship.r * 0.8) {
      const res = takeHit(px, py, HULL_COMET);
      if (res === 'crash') return true;
      if (res === 'absorbed') {
        c.hit = true;
        explode(px, py, '#9fe8ff', 14);
      }
    }
    if (c.s > c.end) {
      if (!c.hit) {
        R.dodged++;
        R.pts += 1;
      }
      R.comets.splice(i, 1);
    }
  }
  return false;
}

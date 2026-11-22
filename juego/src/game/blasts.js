/**
 * Lo que golpea la pista después de avisar, y obliga a quitarse.
 *
 * Cada uno es una zona pegada al suelo: primero avisa (un círculo o una franja que se va
 * llenando) y luego golpea: quien esté adentro en ese momento recibe el daño.
 *
 * Durante el recorrido (avanzan con la pista):
 *   - meteor: apunta a donde está la nave; el meteorito baja del cielo y se estrella ahí.
 *   - crater: viene por la pista, hirviendo cada vez más, y estalla al llegar a cierta altura.
 *
 * En la pelea con el jefe (quietas: `still`), además de esas dos:
 *   - spike: una púa de hielo que sale del suelo.
 *   - beam: un rayo que barre un carril entero (franja).
 *   - tentacle: un tentáculo que cae a lo largo de la pista (franja).
 *   - bite: el mordisco del Devorador cuando logra arrastrar la nave hasta su boca.
 *
 *   G.run.blasts = [{ kind, x, y, r | (col, w, len), t (segundos para golpear), t0 (los que tenía),
 *                     still, linger (cuánto se queda a la vista después de golpear), hit, after }]
 */
import { H, HULL_BLAST, SPAWN, SY, W } from '../core/config.js';
import { emit } from '../core/events.js';
import { G } from '../core/state.js';
import { clamp, roll, rollIn } from '../core/util.js';
import { takeHit } from './adventure.js';
import { explode, mark } from './run.js';

/* M = { r, fuse (segundos de aviso) } */
export function spawnMeteor(M) {
  const x = clamp(G.ship.x + rollIn('blast', -55, 55), M.r, W - M.r),
    land = clamp(G.ship.y + rollIn('blast', -50, 30), H * 0.45, SY + 10); // dónde va a caer
  G.run.blasts.push({
    kind: 'meteor',
    x,
    y: land - G.run.sp * M.fuse, // el punto marcado viaja con la pista y llega justo cuando cae
    r: M.r,
    t: M.fuse,
    t0: M.fuse,
    side: roll('blast') < 0.5 ? -1 : 1, // de qué lado del cielo viene
  });
  mark('blast', x, land);
  emit('cometWarn');
}
/* C = { r: [mín, máx] } */
export function spawnCrater(C) {
  const r = rollIn('blast', C.r[0], C.r[1]),
    x = rollIn('blast', r, W - r),
    boomY = rollIn('blast', H * 0.46, SY + 10); // a qué altura de la pista estalla
  G.run.blasts.push({ kind: 'crater', x, y: -SPAWN - 220, r, boomY, t: 9, t0: 9 });
  mark('blast', x, boomY, r);
}
/* Las franjas van de cerca del jefe hasta detrás de la nave. */
const COL_FROM = 120,
  COL_TO = SY + 90;
/* Una zona quieta, de las que pone el jefe: { kind, x, y, r, t } o { kind, col: true, x, w, t }. */
export function zone(o) {
  const z = { still: true, t0: o.t, side: 1, ...o };
  if (z.col) {
    z.y = (COL_FROM + COL_TO) / 2;
    z.len = COL_TO - COL_FROM;
  }
  G.run.blasts.push(z);
  return z;
}
const inside = (z) =>
  z.col
    ? Math.abs(G.ship.x - z.x) < z.w + G.ship.r * 0.4
    : Math.hypot(G.ship.x - z.x, G.ship.y - z.y) < z.r + G.ship.r * 0.5;
/* Avanza las zonas y hace golpear las que toque. Devuelve true si la nave chocó y la partida se detuvo. */
export function updateBlasts(dt) {
  const R = G.run,
    col = (R.world && R.world.blast) || ['#ff8a2a', '#ffd24a'];
  for (let i = R.blasts.length - 1; i >= 0; i--) {
    const z = R.blasts[i];
    if (z.hit) {
      /* ya golpeó: se queda un momento a la vista (la púa, el rayo, el tentáculo) */
      z.after -= dt;
      if (z.after <= 0) R.blasts.splice(i, 1);
      continue;
    }
    if (!z.still) z.y += R.sp * dt;
    if (z.kind === 'crater' && !z.still) {
      /* el tiempo que le queda sale de lo que le falta por recorrer */
      z.t = Math.max(0, (z.boomY - z.y) / Math.max(60, R.sp));
      if (z.t0 === 9) z.t0 = Math.max(z.t, 0.1);
    } else z.t -= dt;
    if (z.t > 0) continue;
    if (z.linger) {
      z.hit = true;
      z.after = z.linger;
    } else R.blasts.splice(i, 1);
    if (z.col) for (let y = H * 0.44; y < SY + 40; y += 70) explode(z.x, y, col[0], 7);
    else {
      explode(z.x, z.y, col[0], z.still ? 14 : 30);
      explode(z.x, z.y, col[1], z.still ? 8 : 16);
      G.rings.push({ x: z.x, y: z.y, r: z.r * 0.6, life: 0.4, col: col[0] });
    }
    G.shake = Math.max(G.shake, z.still ? 0.3 : 0.45);
    emit('enemyDown');
    if (inside(z) && takeHit(z.x, z.col ? G.ship.y : z.y, z.dmg || HULL_BLAST) === 'crash') return true;
  }
  return false;
}

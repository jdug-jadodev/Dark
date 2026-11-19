/** Giro de pantalla (una vez en Aventura, periódico en Supervivencia), turbulencias y vueltas de 360°. */
import { emit } from '../core/events.js';
import { G } from '../core/state.js';
import { W, WOB_AT } from '../core/config.js';
import { chaos, survLv } from '../core/difficulty.js';
import { ease, rand } from '../core/util.js';

/* ---------- Supervivencia desde el nivel 5: una sola cosa mueve la pantalla a la vez ----------
   Hay tres movimientos: turbulencia (se mece), vuelta de 360° y giro de 180° (queda al revés un
   rato). Nunca se montan uno sobre otro, y al terminar cualquiera viene un respiro con la
   pantalla quieta. Con cada tramo de locura (1 = nivel 5 … 4 = nivel 20) los respiros se acortan
   y los movimientos llegan más seguido. Los números son [mínimo, máximo] en segundos. */
const REST = [null, [8, 11], [6, 8.5], [4, 5.5], [2.5, 3.5]]; // respiro después de cada movimiento
const TURB_EVERY = [null, [10, 15], [8, 12], [5, 8], [3, 5.5]]; // entre una turbulencia y la siguiente
const SPIN_EVERY = [null, [22, 32], [15, 22], [10, 14], [6, 9]]; // entre una vuelta de 360° y la siguiente
const SPIN_DUR = [0, 2.6, 2.2, 1.8, 1.5]; // lo que tarda la vuelta: lenta al principio, para poder seguirla
const FLIP_EVERY = [40, 75, 60, 45, 40]; // cuánto progreso (%) pasa entre un giro de 180° y el siguiente
const pickIn = (r) => rand(r[0], r[1]);
export const spinning = () => G.run.spin.t >= 0;
/* ¿puede empezar un movimiento nuevo? (c = tramo de locura; en 0 mandan las reglas de siempre) */
const free = (c) => !c || (G.run.calm <= 0 && !spinning() && G.run.wb.t < 0 && G.run.rot.st === 0);
const rest = (c) => {
  if (c) G.run.calm = pickIn(REST[c]);
};

export function runAngle(dt, x) {
  const c = chaos();
  if (c && G.run.calm > 0) G.run.calm -= dt;
  const r = baseAngle(dt, x, c);
  r.a += spinAngle(dt, c);
  return r;
}
/* ---------- Giro de 180° y turbulencias ---------- */
function baseAngle(dt, x, c) {
  const R = G.run.rot,
    B = G.run.wb;
  let a = 0,
    w = false,
    txt = '¡GIRA EL CELU!';
  if (R.st === 0 && x >= R.at && B.t < 0 && free(c)) {
    R.st = 1;
    R.t = 0;
  }
  if (R.st >= 1 && R.st <= 4) {
    R.t += dt;
    if (R.st === 1) {
      w = true;
      if (R.t >= 2.2) {
        R.st = 2;
        R.t = 0;
      }
    } else if (R.st === 2) {
      a = Math.PI * ease(Math.min(1, R.t / 1.6));
      if (R.t >= 1.6) {
        R.st = 3;
        R.t = 0;
      }
    } else if (R.st === 3) {
      a = Math.PI;
      if (R.t > 8) {
        w = true;
        txt = '¡VUELVE A LA NORMALIDAD!';
      }
      if (R.t >= 10) {
        R.st = 4;
        R.t = 0;
      }
    } else if (R.st === 4) {
      a = Math.PI * (1 - ease(Math.min(1, R.t / 1.6)));
      if (R.t >= 1.6) {
        /* Aventura: se gira una sola vez. Supervivencia: vuelve a girar más adelante. */
        R.st = G.run.mode === 'endless' ? 0 : 5;
        R.at = x + FLIP_EVERY[c];
        R.t = 0;
        B.next = Math.max(B.next, 4);
        rest(c);
      }
    }
    return {
      a,
      w,
      txt,
    };
  }
  if (x >= WOB_AT) {
    const late = x >= 75;
    if (B.t < 0) {
      B.next -= dt;
      if (B.next <= 0 && free(c)) {
        B.t = 0;
        B.dur = c ? rand(4, 6) : late ? rand(6, 8) : rand(5, 7);
        B.n++;
        emit('turbulence');
        G.pops.push({
          x: W / 2,
          y: 140,
          text: '¡TURBULENCIA!',
          life: 1.4,
          col: '#c792ff',
        });
      }
    } else {
      B.t += dt;
      const env = Math.sin(Math.PI * Math.min(1, B.t / B.dur));
      /* cuánto se mece. En Supervivencia avanzada arranca suave en el nivel 5 y crece con cada nivel. */
      const sway = c
        ? Math.min(0.6, 0.22 + (survLv() - 5) * 0.015)
        : late
          ? Math.min(0.62, 0.5 + Math.max(0, x - 100) * 0.002)
          : 0.36;
      a = Math.sin(B.t * 1.7) * sway * env;
      if (B.t >= B.dur) {
        B.t = -1;
        B.next = c ? pickIn(TURB_EVERY[c]) : late ? Math.max(3, rand(5, 8) - Math.max(0, x - 100) * 0.01) : rand(9, 13);
        rest(c);
      }
    }
  }
  return {
    a,
    w,
    txt,
  };
}

/* ---------- Vueltas de 360° (Supervivencia, desde el nivel 5) ----------
   La pista da una vuelta completa sobre sí misma y sigue. */
function spinAngle(dt, c) {
  if (!c) return 0;
  const P = G.run.spin;
  if (P.t < 0) {
    P.next -= dt;
    if (P.next > 0 || !free(c)) return 0;
    /* tampoco arranca con una pared a la vista */
    if (G.obs.some((o) => o.wall)) {
      P.next = 0.5;
      return 0;
    }
    P.t = 0;
    P.dir = Math.random() < 0.5 ? -1 : 1;
    P.turns = c >= 4 && Math.random() < 0.25 ? 2 : 1; // desde el nivel 20, a veces son dos vueltas seguidas
    P.dur = SPIN_DUR[c] * (P.turns === 2 ? 1.6 : 1);
    emit('spin');
    G.pops.push({
      x: W / 2,
      y: 140,
      text: P.turns === 2 ? '¡DOBLE GIRO!' : '¡GIRO 360°!',
      life: 1.2,
      col: '#ffd54a',
    });
  }
  P.t += dt;
  const k = P.t / P.dur;
  if (k >= 1) {
    P.t = -1;
    P.next = pickIn(SPIN_EVERY[c]);
    rest(c);
    return 0;
  }
  return P.dir * P.turns * 2 * Math.PI * ease(k);
}

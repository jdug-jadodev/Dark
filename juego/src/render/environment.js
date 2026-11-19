/** Colores del espacio según la fase o el nivel. */
import { G } from '../core/state.js';
import { FLIP_AT, SURV_PAL, WOB_AT } from '../core/config.js';
import { chaos, level, prog } from '../core/difficulty.js';
import { BG } from './engine.js';
/* Paleta por fase: [desde %, color del espacio, color de acento] */
const PAL = [
  [0, 0x0a1030, 0x5ee0ff],
  [18, 0x110f3e, 0x7f9dff],
  [WOB_AT, 0x1c0e42, 0xc792ff],
  [50, 0x2a0c32, 0xff6bd0],
  [FLIP_AT, 0x06282c, 0x6ef2a5],
  [75, 0x330b1c, 0xff6b8a],
];
export let bgCol;
export let accCol;
export let _tb;
export let _ta;
export function bootEnvironment() {
  bgCol = new THREE.Color(BG);
  accCol = new THREE.Color(0x5ee0ff);
  _tb = new THREE.Color();
  _ta = new THREE.Color();
}
/* Supervivencia, por tramo de locura: cada cuántos segundos cambia la paleta dentro del nivel
   (tramos 1 y 2) o cuánto tarda una vuelta completa al arcoíris (tramos 3 y 4) */
const PAL_EVERY = [0, 4, 2.2];
const RAINBOW_LAP = [0, 0, 0, 3.2, 2.2];
/* qué tan rápido se funde un color con el siguiente (por segundo) */
export const envSpeed = () => [0.8, 1.6, 2.6, 6, 6][G.state !== 'menu' && G.run ? chaos() : 0];
export function envTarget() {
  let bg = 0x0a1030,
    ac = 0x5ee0ff;
  if (G.state !== 'menu' && G.run) {
    if (G.run.mode === 'boss') {
      const r = G.run.boss ? G.run.boss.hp / G.run.boss.max : 1;
      if (r > 0.66) {
        bg = 0x22081c;
        ac = 0xff6b8a;
      } else if (r > 0.33) {
        bg = 0x2c0c08;
        ac = 0xff8a3c;
      } else {
        bg = 0x36060c;
        ac = 0xffd54a;
      }
    } else if (G.run.mode === 'endless') {
      const c = chaos();
      if (c >= 3) {
        /* arcoíris: el color de la pista da la vuelta completa y el fondo lo sigue, siempre oscuro */
        const hue = (G.t / RAINBOW_LAP[c]) % 1;
        _tb.setHSL((hue + 0.62) % 1, 0.7, 0.09);
        _ta.setHSL(hue, 1, 0.62);
        return;
      }
      /* desde el nivel 5 la paleta va cambiando también dentro del nivel */
      const p = SURV_PAL[(level() - 1 + (c ? Math.floor(G.t / PAL_EVERY[c]) : 0)) % SURV_PAL.length];
      bg = p[0];
      ac = p[1];
    } else if (G.run.stage === 'mini') {
      bg = 0x0b2a1c;
      ac = 0xffb454;
    } else if (G.run.stage === 'warn') {
      bg = 0x22081c;
      ac = 0xff6b8a;
    } else {
      const x = prog();
      for (const p of PAL)
        if (x >= p[0]) {
          bg = p[1];
          ac = p[2];
        }
    }
  }
  _tb.setHex(bg);
  _ta.setHex(ac);
}

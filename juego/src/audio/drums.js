/**
 * Batería de metal hecha por código. i = canal del tema ({ ctx, drums, rev }), t = cuándo suena.
 * El bombo lleva un "clic" agudo para que se distinga cada golpe del doble bombo, y los
 * platillos salen de una mezcla de ondas cuadradas desafinadas (suena a metal, no a soplido).
 */
import { noise, tone } from './synth.js';

const d = (i, t) => ({ ctx: i.ctx, out: i.drums, t });

/* material de los platillos: seis ondas cuadradas que no forman acorde */
const metalOf = new WeakMap();
function metalBuffer(ctx) {
  let buf = metalOf.get(ctx);
  if (!buf) {
    const sr = ctx.sampleRate,
      n = sr * 2;
    buf = ctx.createBuffer(1, n, sr);
    const x = buf.getChannelData(0);
    for (const f of [205.3, 304.4, 369.6, 522.7, 540, 800]) {
      const half = sr / (f * 9.7) / 2; // subidas ~10 veces: quedan en la zona brillante
      for (let i = 0; i < n; i++) x[i] += Math.floor(i / half) % 2 ? -1 / 6 : 1 / 6;
    }
    metalOf.set(ctx, buf);
  }
  return buf;
}
function metal(i, t, kind, f, dur, vol, q = 0.8) {
  const src = i.ctx.createBufferSource();
  src.buffer = metalBuffer(i.ctx);
  const flt = i.ctx.createBiquadFilter();
  flt.type = kind;
  flt.frequency.value = f;
  flt.Q.value = q;
  const g = i.ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.001);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(flt);
  flt.connect(g);
  g.connect(i.drums);
  src.start(t, (t * 0.37) % 0.4);
  src.stop(t + dur + 0.03);
}

export function kick(i, t, vol = 1) {
  tone(d(i, t), 'sine', 135, 42, 0.16, 0.9 * vol, { attack: 0.001 });
  tone(d(i, t), 'triangle', 1900, 350, 0.014, 0.35 * vol, { attack: 0.001 });
  noise(d(i, t), 'highpass', 3000, 3000, 0.008, 0.25 * vol, { attack: 0.001 });
}
export function snare(i, t, vol = 1) {
  tone(d(i, t), 'triangle', 235, 165, 0.13, 0.5 * vol, { attack: 0.001 });
  noise(d(i, t), 'bandpass', 2100, 1700, 0.2, 0.6 * vol, { q: 0.5, attack: 0.001 });
  noise(d(i, t), 'highpass', 6000, 6000, 0.07, 0.15 * vol, { attack: 0.001 });
  noise({ ctx: i.ctx, out: i.rev, t }, 'bandpass', 2000, 1500, 0.18, 0.3 * vol, { q: 0.5 }); // a la sala
}
export function tom(i, t, f, vol = 1) {
  tone(d(i, t), 'sine', f, f * 0.55, 0.22, 0.7 * vol, { attack: 0.001 });
  noise(d(i, t), 'lowpass', 1200, 400, 0.08, 0.2 * vol, { attack: 0.001 });
}
export function hat(i, t, vol = 1, open = false) {
  metal(i, t, 'highpass', 7500, open ? 0.28 : 0.045, 0.17 * vol);
}
export function ride(i, t, vol = 1) {
  metal(i, t, 'bandpass', 6200, 0.3, 0.18 * vol, 2);
}
/* china: el platillo "sucio" de los cortes pesados */
export function china(i, t, vol = 1) {
  metal(i, t, 'bandpass', 3600, 0.5, 0.28 * vol, 1.2);
  noise(d(i, t), 'highpass', 5000, 5000, 0.3, 0.12 * vol);
}
export function crash(i, t, vol = 1) {
  metal(i, t, 'highpass', 4200, 1.5, 0.24 * vol);
  noise(d(i, t), 'highpass', 6500, 6500, 1.1, 0.08 * vol);
}

/**
 * Sonido del juego: enciende el audio, escucha los avisos de la partida y toca el efecto que
 * corresponde. Las recetas de cada efecto están en synth.js. La música sale de dos lados:
 * grabada (tracks.js) si la página trae el tema, y si no, tocada en vivo por código (music.js).
 */
import { on } from '../core/events.js';
import { createEngine } from './engine.js';
import { S, save } from '../core/profile.js';
import { createMusic } from './music.js';
import { GAP, SOUNDS, createOutput } from './synth.js';
import { createTracks } from './tracks.js';

let ctx = null;
let buses = null; // salidas de los efectos: limpia y con distorsión
let tracks = null; // música grabada
let music = null; // música tocada en vivo por código: solo se arma si hace falta
let engine = null; // motor de la nave
let waking = false;
const lastAt = {}; // efecto → cuándo sonó por última vez
const recent = []; // momentos de los últimos efectos, para no amontonar demasiados
const MAX_AT_ONCE = 7; // efectos que pueden empezar en una misma décima de segundo
const ALWAYS = new Set(['crash', 'bossDown', 'win', 'lose', 'spaghetti']); // estos nunca se descartan

/* Volúmenes que elige el jugador, de 0 a 100 */
export const volumes = () => ({ music: S.volMusic ?? 100, sfx: S.volSfx ?? 100 });
const anySound = () => volumes().music > 0 || volumes().sfx > 0;
/* el oído no es parejo: con el cuadrado, la mitad del control se oye como la mitad */
const gainOf = (v) => (v / 100) ** 2;
function applyVolumes() {
  if (!ctx) return;
  const v = volumes();
  buses.level.gain.setTargetAtTime(gainOf(v.sfx), ctx.currentTime, 0.03);
  tracks.setLevel(gainOf(v.music));
  if (music) music.setLevel(gainOf(v.music));
}
/* which = 'music' | 'sfx' · done = true cuando el jugador soltó el control (ahí se guarda) */
export function setVolume(which, value, done) {
  S[which === 'music' ? 'volMusic' : 'volSfx'] = Math.max(0, Math.min(100, Math.round(value)));
  if (done) save();
  if (anySound()) wake();
  else if (ctx) ctx.suspend().catch(() => {});
  applyVolumes();
}

/* El navegador solo deja sonar después de que el jugador toca algo: ahí se enciende. */
function wake() {
  if (!anySound()) return;
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC({ latencyHint: 'interactive' });
      buses = createOutput(ctx);
      tracks = createTracks(ctx, ctx.destination);
      engine = createEngine(ctx, buses.out);
      applyVolumes();
    }
    if (ctx.state === 'suspended' && !document.hidden && !waking) {
      waking = true;
      const done = () => (waking = false);
      ctx.resume().then(done, done);
    }
  } catch (e) {}
}

export function play(name, data) {
  try {
    if (volumes().sfx <= 0 || !ctx || (ctx.state !== 'running' && !waking)) return;
    const recipe = SOUNDS[name];
    if (!recipe) return;
    const now = ctx.currentTime;
    if (now - (lastAt[name] ?? -9) < (GAP[name] ?? 0.03)) return;
    while (recent.length && now - recent[0] > 0.1) recent.shift();
    if (recent.length >= MAX_AT_ONCE && !ALWAYS.has(name)) return;
    lastAt[name] = now;
    recent.push(now);
    recipe({ ctx, ...buses, t: now + 0.005 }, data);
  } catch (e) {
    /* un fallo de sonido nunca debe detener la partida */
  }
}

/* Lo llama el bucle del juego en cada cuadro: mantiene andando la música y el motor.
   scene = qué tema toca · intensity = 0–1 (avance de la partida) · quiet = bajarle (pausa)
   thrust = potencia del motor: 0 apagado, hasta 1 en crucero, más con nitro */
export function tickAudio(scene, intensity, quiet, thrust) {
  try {
    if (!tracks || ctx.state !== 'running') return;
    engine.set(thrust || 0);
    const name = volumes().music > 0 ? scene : null,
      recorded = !!name && tracks.has(name);
    tracks.duck(!!quiet);
    tracks.tick(recorded ? name : null);
    /* lo que no está grabado se toca en vivo */
    if (name && !recorded && !music) {
      music = createMusic(ctx, ctx.destination);
      applyVolumes();
    }
    if (music) {
      music.duck(!!quiet);
      music.tick(recorded ? null : name, intensity);
    }
  } catch (e) {
    /* un fallo de sonido nunca debe detener la partida */
  }
}

export function bootSound() {
  on(play);
  for (const ev of ['pointerdown', 'keydown', 'touchend', 'click'])
    window.addEventListener(ev, wake, { capture: true, passive: true });
  /* al salir de la app no queda nada sonando; al volver se reanuda */
  document.addEventListener('visibilitychange', () => {
    if (!ctx) return;
    if (document.hidden) ctx.suspend().catch(() => {});
    else wake();
  });
  /* clic de los botones de menús y ventanas (no los de jugar: flechas y nitro) */
  document.addEventListener(
    'click',
    (e) => {
      if (e.target.closest && e.target.closest('.btn, .opt, .chk, #pauseBtn')) play('click');
    },
    true,
  );
}

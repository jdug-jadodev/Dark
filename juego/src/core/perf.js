/**
 * Rendimiento y calor. El juego no necesita dibujar tan rápido como aguante el teléfono: eso
 * solo lo calienta y gasta batería. Aquí se decide cuánto dibujar:
 *
 *   - Tope de 60 cuadros por segundo (una pantalla de 120 Hz dibujaría el doble sin que se note).
 *   - En menús, pausa y pantallas finales la escena de fondo se dibuja a media marcha o menos.
 *   - Calidad gráfica (Configuración): alta, media o baja cambian la nitidez con que se dibuja.
 *     En automático empieza en alta y baja sola si el teléfono no llega a los 60 cuadros.
 *   - Si el teléfono avisa que se está calentando (o está en ahorro de batería), se baja la
 *     nitidez; si el calor ya es serio, además se dibuja a 30 cuadros.
 *
 * La "nitidez" es cuántos puntos reales se dibujan por cada punto de pantalla (densidad).
 * Este archivo solo decide; quien dibuja (loop.js y render/engine.js) le pregunta.
 */
import { S, save } from './profile.js';

export const GFX = ['auto', 'high', 'medium', 'low'];
/* densidad máxima de cada calidad */
const DENSITY = { high: 2, medium: 1.5, low: 1 };
/* automático: escalones por los que va bajando si el teléfono no da 60 cuadros */
const AUTO_STEPS = [2, 1.5, 1.2, 1, 0.8];
/* tope de densidad según el calor que reporta el teléfono: 0 normal · 1 tibio · 2 caliente · 3+ muy caliente */
const HEAT_DENSITY = [2, 1.5, 1.2, 1];
const HOT = 3; // desde aquí también se baja a 30 cuadros

let autoStep = 0;
let heat = 0;

export const gfx = () => (GFX.includes(S.gfx) ? S.gfx : 'auto');
export function setGfx(value) {
  S.gfx = GFX.includes(value) ? value : 'auto';
  save();
}
/* Automático recuerda dónde quedó la última vez, pero arranca un escalón mejor para volver a intentar */
export function bootPerf() {
  autoStep = Math.max(0, Math.min(AUTO_STEPS.length - 1, (S.gfxStep | 0) - 1));
}
export const maxDensity = () =>
  Math.min(gfx() === 'auto' ? AUTO_STEPS[autoStep] : DENSITY[gfx()], HEAT_DENSITY[Math.min(heat, HOT)]);
export const maxFps = () => (heat >= HOT ? 30 : 60);
/* El teléfono dice qué tan caliente está. Devuelve true si cambió (hay que reajustar el dibujo). */
export function setHeat(level) {
  level = Math.max(0, Math.min(6, level | 0));
  if (level === heat) return false;
  heat = level;
  return true;
}

/* ---------- tope de cuadros ---------- */
let lastRun = -1e9;
/* true = todavía no toca dibujar otro cuadro (la pantalla refresca más rápido que el tope) */
export function tooSoon(ts) {
  const step = 1000 / maxFps(),
    elapsed = ts - lastRun;
  if (elapsed < step - 1.5) return true;
  /* se guarda el compás y no la hora exacta: así una pantalla de 75 o 90 Hz promedia 60 y no menos */
  lastRun = ts - (elapsed % step);
  return false;
}

/* ---------- menús y pausa a media marcha ---------- */
let frameNo = 0;
/* true = en este cuadro no hace falta volver a dibujar la escena (la lógica sí avanza) */
export function lazyFrame(state) {
  const every = state === 'play' || state === 'count' ? 1 : state === 'pause' ? 6 : 2;
  return ++frameNo % every !== 0;
}

/* ---------- automático: vigilar si el teléfono da la talla ---------- */
let winStart = 0,
  winFrames = 0,
  prevTs = 0,
  slowWindows = 0;
/* Se llama en cada cuadro dibujado. Devuelve true si acaba de bajar un escalón de calidad. */
export function watchFps(ts, playing) {
  const gap = ts - prevTs;
  prevTs = ts;
  /* solo cuenta jugando y en automático; un tirón largo (otra app, una ventana) reinicia la cuenta */
  if (!playing || gfx() !== 'auto' || gap > 250) {
    winStart = ts;
    winFrames = 0;
    if (!playing) slowWindows = 0;
    return false;
  }
  winFrames++;
  if (ts - winStart < 2000) return false;
  const fps = (winFrames * 1000) / (ts - winStart);
  winStart = ts;
  winFrames = 0;
  slowWindows = fps < maxFps() * 0.8 ? slowWindows + 1 : 0;
  /* dos tramos seguidos por debajo del 80 % del tope: se baja un escalón */
  if (slowWindows < 2 || autoStep >= AUTO_STEPS.length - 1) return false;
  slowWindows = 0;
  autoStep++;
  S.gfxStep = autoStep;
  save();
  return true;
}

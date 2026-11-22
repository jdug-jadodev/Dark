/** Utilidades puras: azar, límites, suavizado, formato de tiempo. */
export const rand = (a, b) => a + Math.random() * (b - a);
/* Azar solo para adornos (parpadeo de las llamas, chispas de la explosión de la nave). Va aparte del
   azar de la partida: así cambiar el aspecto de la nave nunca cambia lo que pasa en la pista. */
let vs = 0x9e3779b9;
export const vrand = (a = 0, b = 1) => {
  vs ^= vs << 13;
  vs ^= vs >>> 17;
  vs ^= vs << 5;
  return a + ((vs >>> 0) / 4294967296) * (b - a);
};
/* ---------- Azar de la pista ----------
   Todo lo que decide qué sale en la pista (rocas, paredes, monedas, naves, cometas, giros) pide
   su azar por aquí, diciendo quién lo pide: roll('rock'), roll('coin')…
     - Sin semilla (partida normal) sale de Math.random, igual que siempre.
     - Con semilla, cada nombre tiene su propia fuente repetible: la misma semilla da la misma
       pista en cualquier teléfono. Cada quien tiene la suya para que lo que un jugador hace
       (derribar naves, por ejemplo) no cambie las rocas que le salen. */
let seedNow = null,
  streams = {};
const mix = (text) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};
const source = (seed) => () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
/* fija la semilla de la pista (null = sin semilla) */
export function seedTrack(seed) {
  seedNow = seed == null ? null : seed >>> 0;
  streams = {};
}
export const trackSeed = () => seedNow;
export function roll(name) {
  if (seedNow === null) return Math.random();
  return (streams[name] || (streams[name] = source(mix(name + ':' + seedNow))))();
}
export const rollIn = (name, a, b) => a + roll(name) * (b - a);
export const rollPick = (name, list) => list[Math.floor(roll(name) * list.length)];
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const fmt = (s) => {
  s = Math.floor(s);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};

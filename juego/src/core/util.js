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
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const ease = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
export const pick = (a) => a[Math.floor(Math.random() * a.length)];
export const fmt = (s) => {
  s = Math.floor(s);
  return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0');
};

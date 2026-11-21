/** Acceso al HTML: atajo para buscar elementos y los dos lienzos (3D y textos flotantes). */
import { T } from './icons.js';
export const $ = (id) => document.getElementById(id);
/* Escribe en un elemento un texto que puede traer iconos como {coin}. Si el texto no cambió no
   toca nada (el marcador se actualiza en cada cuadro). */
const shown = {};
export function put(id, text) {
  if (shown[id] === text) return;
  shown[id] = text;
  $(id).innerHTML = T(text);
}
/* Convierte en dibujos los {iconos} de lo que ya se escribió en un elemento */
export function tok(id) {
  const el = $(id);
  el.innerHTML = T(el.innerHTML);
}
export let cv;
export let fx;
export let fctx;
export function bootDom() {
  /* ---------- Estado ---------- */
  cv = $('cv');
  fx = $('fx');
  fctx = fx.getContext('2d');
}

/** Acceso al HTML: atajo para buscar elementos y los dos lienzos (3D y textos flotantes). */
export const $ = (id) => document.getElementById(id);
export let cv;
export let fx;
export let fctx;
export function bootDom() {
  /* ---------- Estado ---------- */
  cv = $('cv');
  fx = $('fx');
  fctx = fx.getContext('2d');
}

/** Anuncio con recompensa (simulado). En la app se reemplazará por AdMob. */
import { noAds } from '../core/shop.js';
import { $ } from './dom.js';
/* ---------- Anuncio simulado ---------- */
let adCb = null;
let adTimer = null;
/* lo que dice un botón que da algo a cambio de un anuncio; quien compró "Sin anuncios" lo recibe directo */
export const adTag = () => (noAds() ? '' : ' (anuncio)');
/* sin anuncios (comprado, o mientras dure el mes): desaparece la franja de abajo */
export function applyNoAds() {
  $('banner').style.display = noAds() ? 'none' : '';
}
export function showAd(label, cb) {
  if (noAds()) {
    cb();
    return;
  }
  $('adLabel').textContent = label;
  $('adBtn').disabled = true;
  $('adBtn').textContent = 'Espera…';
  let n = 3;
  $('adCount').textContent = n;
  $('adFill').style.width = '0%';
  $('ad').classList.add('show');
  adCb = cb;
  clearInterval(adTimer);
  adTimer = setInterval(() => {
    n--;
    $('adFill').style.width = ((3 - Math.max(n, 0)) / 3) * 100 + '%';
    $('adCount').textContent = Math.max(n, 0);
    if (n <= 0) {
      clearInterval(adTimer);
      $('adBtn').disabled = false;
      $('adBtn').textContent = 'Recibir recompensa';
    }
  }, 1000);
}
export function bootAds() {
  $('adBtn').addEventListener('click', () => {
    $('ad').classList.remove('show');
    const f = adCb;
    adCb = null;
    if (f) f();
  });
}

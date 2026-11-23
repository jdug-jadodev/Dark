/**
 * Anuncios: el video con premio y la franja de abajo.
 *
 * En la app son de verdad (AdMob, lo pone Android: ver Platform.ads). En el navegador no hay, y
 * aquí se muestran unos de mentira para poder probar el juego completo.
 *
 * Con un anuncio de verdad pueden pasar tres cosas: el jugador lo ve entero (recibe el premio),
 * lo cierra antes (no recibe nada) o no hay anuncio que mostrar (sin conexión, o Google no tiene
 * uno en ese momento). En las dos últimas se le dice qué pasó y vuelve a donde estaba.
 */
import { tr } from '../core/i18n.js';
import { noAds } from '../core/shop.js';
import { Platform } from '../platform/platform.js';
import { $ } from './dom.js';
import { T } from './icons.js';

let adCb = null; // lo que hace el botón de la ventana del anuncio
let adTimer = null;
let asking = false; // ya se le pidió un video a Android y todavía no contesta

/* lo que dice un botón que da algo a cambio de un anuncio; quien compró "Sin anuncios" lo recibe directo */
export const adTag = () => (noAds() ? '' : ' ' + tr('(anuncio)'));
/* sin anuncios (comprado, o mientras dure el mes): desaparece la franja de abajo.
   En la app la franja la pone Android debajo del juego, y la de mentira no se muestra. */
export function applyNoAds() {
  const off = noAds();
  $('banner').style.display = off || Platform.ads.real() ? 'none' : '';
  Platform.ads.banner(!off);
}
/**
 * Pide un anuncio con premio. cb = entregar el premio. back = volver a donde estaba el jugador
 * si no hubo premio (solo hace falta cuando, para pedir el anuncio, se cerró la ventana anterior).
 */
export function showAd(label, cb, back) {
  if (noAds()) {
    cb();
    return;
  }
  $('adLabel').innerHTML = T(label); // el rótulo lo arma el juego (trae {iconos}), nunca texto de fuera
  if (Platform.ads.real()) return realAd(cb, back);
  $('adBtn').disabled = true;
  $('adBtn').textContent = tr('Espera…');
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
      $('adBtn').textContent = tr('Recibir recompensa');
    }
  }, 1000);
}
/* El anuncio de verdad. Mientras Android lo carga se ve "Cargando el anuncio…"; el video se abre
   encima del juego, y al cerrarse Android cuenta cómo terminó. */
async function realAd(cb, back) {
  if (asking) return;
  asking = true;
  adCb = null;
  $('adTitle').textContent = tr('Anuncio');
  $('adNote').textContent = tr('Cargando el anuncio…');
  $('ad').classList.add('show', 'real', 'wait');
  const result = await Platform.ads.video();
  asking = false;
  if (result === 'earned') {
    $('ad').classList.remove('show', 'real', 'wait');
    cb();
    return;
  }
  $('adNote').textContent =
    result === 'closed'
      ? tr('Cerraste el anuncio antes de terminar: esta vez no hay recompensa.')
      : tr('No hay anuncio disponible ahora. Intenta de nuevo en un momento.');
  $('adBtn').disabled = false;
  $('adBtn').textContent = tr('Cerrar');
  $('ad').classList.remove('wait');
  adCb = back || null;
}
/* "Atrás" del sistema con la ventana del anuncio de verdad abierta: mientras carga no hace nada;
   si ya dijo que no hubo premio, la cierra. Devuelve true si la ventana estaba abierta. */
export function closeAd() {
  const el = $('ad');
  if (!el.classList.contains('show') || !el.classList.contains('real')) return false;
  if (!el.classList.contains('wait')) $('adBtn').click();
  return true;
}
export function bootAds() {
  $('adBtn').addEventListener('click', () => {
    $('ad').classList.remove('show', 'real', 'wait');
    const f = adCb;
    adCb = null;
    if (f) f();
  });
}

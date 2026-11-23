/**
 * Tienda de pago: qué se vende y qué recibe el jugador. El cobro lo hace Google Play (en el
 * laboratorio, un pago simulado), y cada compra la verifica el servidor antes de entregarla:
 * ver settle(). Todo es barato y nada da ventaja: las monedas solo compran piezas de apariencia.
 *
 *   coins    = paquete de monedas (se puede comprar las veces que se quiera)
 *   adsMonth = 30 días sin anuncios (se puede renovar: cada compra suma 30 días)
 *   noAds    = sin anuncios para siempre (se compra una sola vez)
 *
 * cop = precio de referencia en pesos colombianos (el que se ve en el laboratorio; en la app se
 * muestra el que tenga puesto Google Play, en la moneda del jugador). bonus = cuánto más rinde
 * que el paquete pequeño. Las cantidades que se entregan en una compra real las pone el servidor.
 */
import { apiUrl, uid } from './cup.js';
import { tr } from './i18n.js';
import { S, save } from './profile.js';
import { Platform } from '../platform/platform.js';

const DAY = 24 * 3600 * 1000;
export const ADS_DAYS = 30;
export const PRODUCTS = [
  { id: 'coins_s', kind: 'coins', coins: 1200, cop: 1000, name: tr('Bolsa de monedas'), icon: '{coin}' },
  { id: 'coins_m', kind: 'coins', coins: 2800, cop: 2000, name: tr('Saco de monedas'), icon: '{bag}', bonus: 17 },
  { id: 'coins_l', kind: 'coins', coins: 8000, cop: 5000, name: tr('Cofre de monedas'), icon: '{crown}', bonus: 33 },
  { id: 'no_ads_30', kind: 'adsMonth', cop: 1000, name: tr('Sin anuncios por 30 días'), icon: '{calendar}' },
  { id: 'no_ads', kind: 'noAds', cop: 3000, name: tr('Sin anuncios para siempre'), icon: '{noads}' },
];
export const product = (id) => PRODUCTS.find((p) => p.id === id);
/* S.noAds = para siempre · S.noAdsUntil = hasta cuándo dura el mes comprado (hora del teléfono) */
export const adsForever = () => !!S.noAds;
/* días que quedan del mes sin anuncios (0 = no hay o ya venció) */
export const adsDaysLeft = () => Math.max(0, Math.ceil(((S.noAdsUntil || 0) - Date.now()) / DAY));
export const noAds = () => adsForever() || adsDaysLeft() > 0;
/* ¿se puede comprar? Con "para siempre" ya no hace falta nada más de anuncios */
export const canBuy = (p) => p.kind === 'coins' || !adsForever();
/* 1000 → "$1.000" */
export const pesos = (n) => '$' + String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.');

/* El pago simulado ya se hizo (solo en el laboratorio): se entrega lo comprado y se guarda. */
export function deliver(id) {
  const p = product(id);
  if (!p || !canBuy(p)) return false;
  apply(
    p.kind === 'coins'
      ? { kind: 'coins', coins: p.coins }
      : p.kind === 'adsMonth'
        ? { kind: 'adsMonth', days: ADS_DAYS }
        : { kind: 'noAds' },
  );
  save();
  return true;
}
/* lo que se recibe: { kind: 'coins', coins } · { kind: 'adsMonth', days } · { kind: 'noAds' } */
function apply(g) {
  if (g.kind === 'coins') S.coins += Math.max(0, Math.min(100000, Math.floor(g.coins) || 0));
  else if (g.kind === 'adsMonth')
    S.noAdsUntil = Math.max(Date.now(), S.noAdsUntil || 0) + (g.days || ADS_DAYS) * DAY; // si aún le quedaban días, se suman
  else if (g.kind === 'noAds') S.noAds = true;
}

/* ---------- compras de verdad (Google Play) ----------
   'play' = se cobra con Google Play · 'sim' = pago simulado · '' = aquí no se puede comprar.
   Sin servidor no hay quién verifique las compras, así que tampoco se puede comprar. */
export const storeMode = () => {
  const m = Platform.store.mode();
  return m === 'play' && !apiUrl() ? '' : m;
};
/* una marca corta de cada comprobante ya entregado en este perfil, para no entregarlo dos veces */
const markOf = (token) => token.slice(-24);
/* cada llamada lleva el identificador de esta instalación: el servidor solo le entrega una compra a quien la hizo */
const call = (path, p) => Platform.api('POST', apiUrl() + path, { productId: p.productId, token: p.token, uid: uid() });
/* abrir el pago de Google para un producto (ver Platform.store.buy) */
export const buy = (id) => Platform.store.buy(id, uid());
/**
 * Entrega las compras que el servidor confirme. list = [{ productId, token, state }] (lo que da el
 * teléfono). El teléfono solo dice "Google me dio este comprobante"; el servidor le pregunta a
 * Google si está pagado y contesta qué entregar. Después de entregar se le avisa, para que la
 * cierre. Si algo se corta a la mitad, la compra se retoma al abrir el juego: el servidor cierra
 * la compra en Google antes de contestar (así no se puede cobrar dos veces ni pedir reembolso de
 * algo ya entregado), y entonces Google deja de mostrarla; por eso cada comprobante se anota en
 * este teléfono (S.buying) ANTES de preguntarle al servidor y se borra cuando el asunto queda cerrado.
 * Devuelve { got: [ids entregados], pending: cuántas siguen sin confirmarse, failed: cuántas no se pudieron verificar }.
 */
export async function settle(list) {
  const out = { got: [], pending: 0, failed: 0 };
  for (const p of list || []) {
    const item = p && product(p.productId);
    if (!item || typeof p.token !== 'string') continue;
    if (p.state === 'pending') {
      out.pending++;
      continue;
    }
    if (p.state !== 'paid') continue;
    const mark = markOf(p.token),
      had = (S.paid || []).includes(mark);
    if (had && item.kind === 'noAds' && S.noAds) continue; // lo que es para siempre y ya está: nada que hacer
    note(p);
    const r = await call('/v1/purchase', p);
    if (!r) {
      out.failed++;
      continue;
    }
    const st = r.data && r.data.status;
    if (st === 'pending') out.pending++;
    else if (st === 'grant' && r.data.grant) {
      if (!had) {
        apply(r.data.grant);
        S.paid = [...(S.paid || []), mark].slice(-60);
        save();
        out.got.push(p.productId);
      } else if (r.data.grant.kind === 'noAds' && !S.noAds) {
        S.noAds = true;
        save();
      }
      const closed = await call('/v1/purchase/done', p);
      if (closed && closed.status < 500 && closed.status !== 429) forget(p); // si no se pudo avisar, se reintenta al abrir
    } else {
      if (st !== 'done') out.failed++;
      /* cerrada, o rechazada por Google (400, 402, 403): no hay nada más que esperar. Si el servidor
         falló o pidió ir más despacio, se queda anotada para el próximo intento. */
      if (st === 'done' || (r.status >= 400 && r.status < 500 && r.status !== 429)) forget(p);
    }
  }
  return out;
}
/* los comprobantes que este teléfono ya le llevó al servidor y cuyo asunto no ha quedado cerrado */
const same = (a, p) => a.token === p.token;
function note(p) {
  if ((S.buying || []).some((a) => same(a, p))) return;
  S.buying = [...(S.buying || []), { productId: p.productId, token: p.token }].slice(-20);
  save();
}
function forget(p) {
  if (!(S.buying || []).some((a) => same(a, p))) return;
  S.buying = S.buying.filter((a) => !same(a, p));
  save();
}
/* al abrir el juego o la tienda: retomar lo que haya quedado abierto en Google y lo anotado aquí */
export async function settleOpen() {
  if (storeMode() !== 'play') return { got: [], pending: 0, failed: 0 };
  const open = (await Platform.store.pending()).list || [],
    mine = (Array.isArray(S.buying) ? S.buying : [])
      .filter((a) => a && typeof a.token === 'string' && !open.some((p) => p && same(a, p)))
      .map((a) => ({ productId: a.productId, token: a.token, state: 'paid' }));
  return settle(open.concat(mine));
}

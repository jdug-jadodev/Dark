/**
 * Tienda: paquetes de monedas y "Sin anuncios". En la app instalada desde Google Play se cobra con
 * Google (y el servidor verifica cada compra antes de entregarla). En el laboratorio y en la app
 * de pruebas, el pago es simulado: una ventana que hace de Google Play.
 */
import { emit } from '../core/events.js';
import { locale, tr } from '../core/i18n.js';
import { S } from '../core/profile.js';
import { esc } from '../core/util.js';
import {
  ADS_DAYS,
  PRODUCTS,
  adsDaysLeft,
  buy,
  canBuy,
  deliver,
  pesos,
  product,
  settle,
  settleOpen,
  storeMode,
} from '../core/shop.js';
import { Platform } from '../platform/platform.js';
import { applyNoAds } from './ads.js';
import { $, tok } from './dom.js';
import { T } from './icons.js';
import { renderMenu } from './menu.js';

let onClose = null; // a quién avisar al cerrar (el taller vuelve a pintar sus botones)
let paying = null; // producto que se está pagando
let prices = null; // los precios de Google Play ({ id: texto }); null = todavía no llegan
let busy = false; // hay un pago de Google en curso
let msg = ''; // lo último que pasó, para decírselo al jugador

function render() {
  $('shopCoins').innerHTML = T('{coin} ' + S.coins);
  const left = adsDaysLeft(),
    mode = storeMode();
  $('shopMsg').textContent =
    msg || (mode ? '' : tr('Las compras solo funcionan en la versión instalada desde Google Play.'));
  $('shopList').innerHTML = PRODUCTS.map((p) => {
    const real = mode === 'play',
      /* con Google Play, un producto solo se puede comprar si Google ya dijo su precio */
      off = !mode || busy || (real && !(prices && prices[p.id])),
      mine = !canBuy(p);
    let title = p.name,
      detail = tr('Se quita la franja de anuncios y recibes las recompensas sin ver videos.'),
      price = real ? (prices ? esc(prices[p.id] || '—') : '…') : pesos(p.cop); // el precio lo escribe Google: se escapa
    if (p.kind === 'coins') {
      title = tr('+{n} monedas', { n: p.coins.toLocaleString(locale()) });
      detail = p.bonus ? tr('{name} · rinde {n} % más', { name: p.name, n: p.bonus }) : p.name;
    } else if (p.kind === 'adsMonth') {
      if (mine) {
        detail = tr('Ya no hace falta: tienes "para siempre".');
        price = '—';
      } else if (left)
        detail =
          left === 1
            ? tr('Activo: te queda 1 día. Comprar suma {x} más.', { x: ADS_DAYS })
            : tr('Activo: te quedan {n} días. Comprar suma {x} más.', { n: left, x: ADS_DAYS });
      else detail = tr('Se quita la franja de anuncios y recibes las recompensas sin ver videos. Se puede renovar.');
    } else if (mine) price = tr('{check} Activo');
    return (
      '<button class="prod' +
      (mine ? ' mine' : '') +
      '" data-prod="' +
      p.id +
      '"' +
      (mine || off ? ' disabled' : '') +
      '>' +
      '<i>' +
      p.icon +
      '</i><span><b>' +
      title +
      '</b><small>' +
      detail +
      '</small></span>' +
      '<em>' +
      price +
      '</em></button>'
    );
  }).join('');
  tok('shopList');
}
export function openShop(after) {
  onClose = after || null;
  msg = '';
  render();
  $('shop').classList.add('show');
  if (storeMode() === 'play') {
    /* los precios de Google y, de paso, lo que haya quedado abierto de una compra anterior */
    Platform.store.prices(PRODUCTS.map((p) => p.id)).then((list) => {
      prices = list;
      render();
    });
    settleOpen().then(tell);
  }
}
/* qué le pasó a una o varias compras, dicho para el jugador */
function tell(r) {
  if (r.got.length) {
    emit('reward');
    applyNoAds();
    msg = tr('¡Listo! Recibiste: {x}.', {
      x: r.got
        .map((id) => (product(id).kind === 'coins' ? tr('{n} monedas', { n: product(id).coins }) : product(id).name))
        .join(', '),
    });
  } else if (r.pending) msg = tr('Tu pago está en proceso. Lo recibes apenas Google lo confirme.');
  else if (r.failed)
    msg = tr('No pudimos confirmar la compra ahora. Si se cobró, se entrega sola cuando haya conexión.');
  if (r.got.length || r.pending || r.failed) {
    if ($('shop').classList.contains('show')) render();
    renderMenu();
  }
}
/* ---------- pago con Google Play ---------- */
async function buyReal(id) {
  const p = product(id);
  if (!p || !canBuy(p) || busy) return;
  busy = true;
  msg = tr('Abriendo Google Play…');
  render();
  const r = await buy(id);
  msg = r.cancel ? '' : r.error ? tr('No se pudo abrir el pago. Intenta de nuevo.') : tr('Confirmando tu compra…');
  render();
  const res = r.list && r.list.length ? await settle(r.list) : null;
  busy = false;
  if (res) {
    msg = '';
    tell(res);
  }
  render();
}
/* devuelve true si había algo abierto (para el botón "atrás" del sistema) */
export function closeShop() {
  if ($('pay').classList.contains('show')) {
    $('pay').classList.remove('show');
    paying = null;
    return true;
  }
  if (!$('shop').classList.contains('show')) return false;
  $('shop').classList.remove('show');
  renderMenu();
  if (onClose) onClose();
  onClose = null;
  return true;
}
/* ---------- pago simulado (laboratorio y app de pruebas) ---------- */
function askPay(id) {
  const p = product(id);
  if (!p || !canBuy(p) || storeMode() !== 'sim') return;
  paying = p;
  $('payInfo').textContent =
    (p.kind === 'coins' ? tr('+{n} monedas', { n: p.coins.toLocaleString(locale()) }) + ' · ' : '') + p.name;
  $('payPrice').textContent = pesos(p.cop);
  $('payOk').textContent = tr('Pagar {price} (simulado)', { price: pesos(p.cop) });
  $('pay').classList.add('show');
}
function paid() {
  const p = paying;
  paying = null;
  $('pay').classList.remove('show');
  if (!p || !deliver(p.id)) return;
  emit('reward');
  applyNoAds();
  render();
}
export function bootShop() {
  applyNoAds();
  /* al abrir el juego: retomar compras que quedaron a medias y recuperar "sin anuncios para siempre" */
  settleOpen().then(tell);
  /* y si Google confirma un pago lento mientras se juega, se entrega en ese momento */
  Platform.store.onPurchases((r) => settle(r.list).then(tell));
  $('shopBtn').addEventListener('click', () => openShop());
  $('mCoins').addEventListener('click', () => openShop());
  $('shopClose').addEventListener('click', closeShop);
  $('shopList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-prod]');
    if (b && !b.disabled) (storeMode() === 'play' ? buyReal : askPay)(b.dataset.prod);
  });
  $('payOk').addEventListener('click', paid);
  $('payNo').addEventListener('click', () => {
    paying = null;
    $('pay').classList.remove('show');
  });
}

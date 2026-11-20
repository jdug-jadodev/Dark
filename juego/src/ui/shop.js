/**
 * Tienda: paquetes de monedas y "Sin anuncios". El pago es simulado (una ventana que hace de
 * Google Play); en la app esa ventana se reemplaza por el pago real y lo demás queda igual.
 */
import { emit } from '../core/events.js';
import { S } from '../core/profile.js';
import { ADS_DAYS, PRODUCTS, adsDaysLeft, canBuy, deliver, pesos, product } from '../core/shop.js';
import { applyNoAds } from './ads.js';
import { $ } from './dom.js';
import { renderMenu } from './menu.js';

let onClose = null; // a quién avisar al cerrar (el taller vuelve a pintar sus botones)
let paying = null; // producto que se está pagando

function render() {
  $('shopCoins').textContent = '🪙 ' + S.coins;
  const left = adsDaysLeft();
  $('shopList').innerHTML = PRODUCTS.map((p) => {
    const mine = !canBuy(p);
    let title = p.name,
      detail = 'Se quita la franja de anuncios y recibes las recompensas sin ver videos.',
      price = pesos(p.cop);
    if (p.kind === 'coins') {
      title = '+' + pesos(p.coins).slice(1) + ' monedas';
      detail = p.name + (p.bonus ? ' · rinde ' + p.bonus + ' % más' : '');
    } else if (p.kind === 'adsMonth') {
      if (mine) {
        detail = 'Ya no hace falta: tienes "para siempre".';
        price = '—';
      } else if (left)
        detail = 'Activo: te quedan ' + left + (left === 1 ? ' día' : ' días') + '. Comprar suma ' + ADS_DAYS + ' más.';
      else detail += ' Se puede renovar.';
    } else if (mine) price = '✓ Activo';
    return (
      '<button class="prod' +
      (mine ? ' mine' : '') +
      '" data-prod="' +
      p.id +
      '"' +
      (mine ? ' disabled' : '') +
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
}
export function openShop(after) {
  onClose = after || null;
  render();
  $('shop').classList.add('show');
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
/* ---------- pago simulado ---------- */
function askPay(id) {
  const p = product(id);
  if (!p || !canBuy(p)) return;
  paying = p;
  $('payInfo').textContent = (p.kind === 'coins' ? '+' + pesos(p.coins).slice(1) + ' monedas · ' : '') + p.name;
  $('payPrice').textContent = pesos(p.cop);
  $('payOk').textContent = 'Pagar ' + pesos(p.cop) + ' (simulado)';
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
  $('shopBtn').addEventListener('click', () => openShop());
  $('mCoins').addEventListener('click', () => openShop());
  $('shopClose').addEventListener('click', closeShop);
  $('shopList').addEventListener('click', (e) => {
    const b = e.target.closest('[data-prod]');
    if (b && !b.disabled) askPay(b.dataset.prod);
  });
  $('payOk').addEventListener('click', paid);
  $('payNo').addEventListener('click', () => {
    paying = null;
    $('pay').classList.remove('show');
  });
}

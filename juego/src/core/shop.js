/**
 * Tienda de pago: qué se vende y qué recibe el jugador. Aquí no hay cobro: eso lo hace la
 * plataforma (hoy simulado; en la app será Google Play). Todo es barato y nada da ventaja:
 * las monedas solo compran piezas de apariencia.
 *
 *   coins    = paquete de monedas (se puede comprar las veces que se quiera)
 *   adsMonth = 30 días sin anuncios (se puede renovar: cada compra suma 30 días)
 *   noAds    = sin anuncios para siempre (se compra una sola vez)
 *
 * cop = precio en pesos colombianos. bonus = cuánto más rinde que el paquete pequeño.
 */
import { S, save } from './profile.js';

const DAY = 24 * 3600 * 1000;
export const ADS_DAYS = 30;
export const PRODUCTS = [
  { id: 'coins_s', kind: 'coins', coins: 1200, cop: 1000, name: 'Bolsa de monedas', icon: '🪙' },
  { id: 'coins_m', kind: 'coins', coins: 2800, cop: 2000, name: 'Saco de monedas', icon: '💰', bonus: 17 },
  { id: 'coins_l', kind: 'coins', coins: 8000, cop: 5000, name: 'Cofre de monedas', icon: '👑', bonus: 33 },
  { id: 'no_ads_30', kind: 'adsMonth', cop: 1000, name: 'Sin anuncios por 30 días', icon: '📅' },
  { id: 'no_ads', kind: 'noAds', cop: 3000, name: 'Sin anuncios para siempre', icon: '🚫' },
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

/* El pago ya se hizo: se entrega lo comprado y se guarda. */
export function deliver(id) {
  const p = product(id);
  if (!p || !canBuy(p)) return false;
  if (p.kind === 'coins') S.coins += p.coins;
  else if (p.kind === 'adsMonth')
    S.noAdsUntil = Math.max(Date.now(), S.noAdsUntil || 0) + ADS_DAYS * DAY; // si aún le quedaban días, se suman
  else S.noAds = true;
  save();
  return true;
}

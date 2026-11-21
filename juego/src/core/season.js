/**
 * Eventos con fecha: razones para volver un día concreto. Todo sale del calendario del teléfono,
 * sin servidor.
 *
 *   - Fin de semana (sábado y domingo): las monedas de cada partida valen doble.
 *   - Oferta de la semana: una nave única con descuento, distinta cada semana.
 *   - Piezas de temporada: solo se pueden comprar en sus fechas (quien ya las tiene, las conserva).
 */
import { hash, weekEnds, weekKey } from './dates.js';
import { BY_SLOT, PARTS, priceOf } from './parts.js';

const DAY = 86400000;
const MONTHS = 'enero febrero marzo abril mayo junio julio agosto septiembre octubre noviembre diciembre'.split(' ');
const days = (n) => (n === 1 ? '1 día' : n + ' días');

/* ---------- fin de semana: monedas dobles ---------- */
export const doubleCoins = () => {
  const d = new Date().getDay();
  return d === 0 || d === 6;
};
/* lo que paga una partida que juntó `coins` monedas */
export const payout = (coins) => (doubleCoins() ? coins * 2 : coins);

/* ---------- temporadas ---------- */
/* from/to = [mes, día], los dos incluidos */
const SEASONS = {
  navidad: { name: 'Navidad', from: [12, 1], to: [1, 6], parts: ['ship.trineo', 'gun.regalos', 'flame.elfos'] },
};
const SEASON_OF = {};
for (const [key, s] of Object.entries(SEASONS)) for (const id of s.parts) SEASON_OF[id] = key;
/* la temporada que está corriendo o la próxima: cuándo empieza y cuándo termina */
function span(s) {
  const now = new Date(),
    wraps = s.to[0] < s.from[0]; // termina en el año siguiente
  for (let y = now.getFullYear() - 1; ; y++) {
    const start = new Date(y, s.from[0] - 1, s.from[1]),
      end = new Date(y + (wraps ? 1 : 0), s.to[0] - 1, s.to[1] + 1);
    if (now < end) return { start, end, active: now >= start };
  }
}
/* la temporada de una pieza, o null si se consigue todo el año */
export function seasonOf(part) {
  const s = SEASONS[SEASON_OF[part.id]];
  if (!s) return null;
  const w = span(s),
    now = new Date();
  return {
    name: s.name,
    active: w.active,
    startsIn: w.active ? 0 : Math.ceil((w.start - now) / DAY),
    endsIn: w.active ? Math.ceil((w.end - now) / DAY) : 0,
    dates: 'del ' + s.from[1] + ' de ' + MONTHS[s.from[0] - 1] + ' al ' + s.to[1] + ' de ' + MONTHS[s.to[0] - 1],
  };
}
/* fuera de su temporada una pieza no se puede comprar */
export function locked(part) {
  const s = seasonOf(part);
  return !!s && !s.active;
}

/* ---------- oferta de la semana ---------- */
export const OFFER_OFF = 30; // % de descuento
/* la nave única en oferta esta semana (la misma para todos los jugadores) */
export function offer() {
  const pool = BY_SLOT.ship.filter((p) => p.rar === 'u' && !locked(p));
  return pool.length ? pool[hash('oferta ' + weekKey()) % pool.length] : null;
}
/* el precio de hoy: el de siempre, salvo la nave en oferta */
export function priceNow(part) {
  const o = offer(),
    price = priceOf(part);
  return o && o.id === part.id ? Math.round((price * (100 - OFFER_OFF)) / 100) : price;
}

/* ---------- lo que hay hoy, para el lobby ---------- */
/* Devuelve avisos { icon, text, part } (part = pieza a la que lleva el aviso). owns(id) dice qué
   tiene ya el jugador, para no anunciarle lo que no le sirve. */
export function events(owns) {
  const now = [], // lo que vale hoy
    soon = [], // lo que viene
    day = new Date().getDay();
  if (doubleCoins())
    now.push({ icon: '{coin}', text: '<b>Monedas dobles</b> ' + (day === 6 ? 'hoy y mañana' : 'hoy') });
  else if (day >= 4) soon.push({ icon: '{coin}', text: 'Monedas dobles ' + (day === 5 ? 'mañana' : 'el sábado') });
  for (const s of Object.values(SEASONS)) {
    const main = PARTS[s.parts[0]],
      info = seasonOf(main),
      missing = s.parts.find((id) => !owns(id));
    if (!missing) continue;
    if (info.active)
      now.push({
        icon: '{gift}',
        part: missing,
        text: '<b>' + s.name + ':</b> ' + main.name + ' · ' + days(info.endsIn),
      });
    else if (info.startsIn <= 14)
      soon.push({ icon: '{gift}', part: missing, text: s.name + ' llega en ' + days(info.startsIn) });
  }
  const o = offer();
  if (o && !owns(o.id))
    now.push({
      icon: '{star}',
      part: o.id,
      text: '<b>Oferta: ' + o.name + '</b> −' + OFFER_OFF + ' % · ' + days(Math.max(1, Math.ceil(weekEnds() / 86400))),
    });
  return now.concat(soon);
}

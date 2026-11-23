/**
 * Lo que cambia con el día real, para que haya una razón de volver mañana:
 *
 *   - Cofre diario: uno por día, con un calendario de 7 días cuyos premios se ven de antemano.
 *     La racha cuenta los días seguidos. Si se falta, NO vuelve a cero: retrocede un paso por
 *     cada día perdido.
 *   - Tres misiones que cambian cada día, una por modo de juego. Completar las tres da un premio extra.
 *
 * El día es el del reloj del teléfono. Aquí no hay pantallas: solo las reglas y lo que se guarda:
 *   S.chestDay = último día en que se abrió el cofre · S.streak = racha · S.chestX2 = día en que se duplicó
 *   S.mis = { day, p: [avance de cada misión], got: [ya cobrada], bonus: premio extra cobrado }
 */
import { hash } from './dates.js';
import { owns } from './garage.js';
import { tr } from './i18n.js';
import { BY_SLOT, SLOTS } from './parts.js';
import { S, save } from './profile.js';
import { locked } from './season.js';
import { fmt } from './util.js';

const DAY = 86400000;
const two = (n) => String(n).padStart(2, '0');
export const today = () => {
  const d = new Date();
  return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate());
};
/* número de día (para restar fechas) */
export const dayNo = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return Math.round(Date.UTC(y, m - 1, d) / DAY);
};
/* ---------- cofre diario y racha ---------- */
/* monedas de cada día del calendario; el día 7 trae además una pieza para la nave */
export const WEEK = [30, 40, 50, 70, 90, 120, 250];
const gap = () => (S.chestDay ? dayNo(today()) - dayNo(S.chestDay) : Infinity);
/* ¿hay cofre por abrir hoy? */
export const chestReady = () => gap() >= 1;
/* racha vigente: los días perdidos la hacen retroceder de a uno, sin borrarla */
export function streakNow() {
  if (!S.chestDay) return 0;
  const g = gap();
  return g <= 1 ? S.streak || 0 : Math.max(0, (S.streak || 0) - (g - 1));
}
/* día del calendario (1 a 7) del cofre que toca abrir, o del que ya se abrió hoy */
export const chestSlot = () => ((chestReady() ? streakNow() : streakNow() - 1) % 7) + 1;
export const chestDoubled = () => S.chestX2 === today();

/* Regala una pieza que el jugador no tenga, de las rarezas pedidas. Cuál sale lo decide el texto
   `seed` (la fecha, para el cofre del día 7), no el azar. Devuelve la pieza o null si ya las tiene todas. */
export function giftPiece(rars = ['r', 'e'], seed = today()) {
  const pool = [];
  for (const s of SLOTS)
    for (const p of BY_SLOT[s.id]) if (rars.includes(p.rar) && !owns(p.id) && !locked(p)) pool.push(p);
  if (!pool.length) return null;
  const p = pool[hash(seed) % pool.length];
  S.parts = [...(S.parts || []), p.id];
  return p;
}
/* abre el cofre de hoy. Devuelve { slot, coins, piece } o null si ya se abrió */
export function openChest() {
  if (!chestReady()) return null;
  const streak = streakNow() + 1,
    slot = ((streak - 1) % 7) + 1,
    coins = WEEK[slot - 1];
  S.streak = streak;
  S.chestDay = today();
  S.coins += coins;
  const piece = slot === 7 ? giftPiece() : null;
  save();
  return { slot, coins, piece };
}
/* duplicar las monedas del cofre de hoy (una vez) */
export function doubleChest() {
  if (chestReady() || chestDoubled()) return 0;
  const coins = WEEK[chestSlot() - 1];
  S.coins += coins;
  S.chestX2 = today();
  save();
  return coins;
}

/* ---------- misiones del día ---------- */
export const MISSION_COINS = 60; // por cada misión
export const BONUS_COINS = 150; // por completar las tres
/* stat = qué número de la partida cuenta · sum = se va sumando partida a partida (si no, vale la mejor) */
const POOL = {
  run: [
    { t: tr('Recoge {n} monedas en Mundos'), n: 15, stat: 'coins', sum: true },
    { t: tr('Llega a {n} puntos en un mundo'), n: 80, stat: 'pts' },
    { t: tr('Esquiva {n} obstáculos en Mundos'), n: 60, stat: 'dodged', sum: true },
    { t: tr('Pasa rozando {n} obstáculos en Mundos'), n: 8, stat: 'near', sum: true },
    { t: tr('Recoge {n} armas en Mundos'), n: 2, stat: 'weapons', sum: true },
  ],
  endless: [
    { t: tr('Aguanta {n} en Supervivencia'), n: 90, stat: 'time', clock: true },
    { t: tr('Llega al nivel {n} en Supervivencia'), n: 6, stat: 'level' },
    { t: tr('Esquiva {n} obstáculos en Supervivencia'), n: 80, stat: 'dodged', sum: true },
    { t: tr('Derriba {n} naves en Supervivencia'), n: 4, stat: 'kills', sum: true },
    { t: tr('Recoge {n} monedas en Supervivencia'), n: 25, stat: 'coins', sum: true },
  ],
  space: [
    { t: tr('Recorre {n} km en Viaje espacial'), n: 2500, stat: 'km', sum: true },
    { t: tr('Recorre {n} km en un solo viaje'), n: 1500, stat: 'km' },
    { t: tr('Aguanta {n} en Viaje espacial'), n: 60, stat: 'time', clock: true },
    { t: tr('Pasa rozando {n} obstáculos en Viaje espacial'), n: 6, stat: 'near', sum: true },
  ],
};
export const MODES = ['run', 'endless', 'space'];
const ICON = { run: '{play}', endless: '{timer}', space: '{planet}' };
/* las tres de hoy: una por modo, elegidas por la fecha */
const todays = () => MODES.map((mode) => ({ mode, ...POOL[mode][hash(today() + mode) % POOL[mode].length] }));
/* el avance guardado; al cambiar el día arranca de cero */
function progress() {
  if (!S.mis || S.mis.day !== today()) S.mis = { day: today(), p: [0, 0, 0], got: [false, false, false], bonus: false };
  return S.mis;
}
/* las misiones de hoy listas para mostrar */
export function missions() {
  const m = S.mis && S.mis.day === today() ? S.mis : { p: [0, 0, 0], got: [false, false, false], bonus: false };
  const show = (d, v) => (d.clock ? fmt(v) : String(Math.floor(v)));
  return todays().map((d, i) => ({
    mode: d.mode,
    icon: ICON[d.mode],
    text: d.t.replace('{n}', show(d, d.n)),
    have: Math.min(m.p[i], d.n),
    need: d.n,
    label: show(d, Math.min(m.p[i], d.n)) + ' / ' + show(d, d.n),
    done: m.got[i],
  }));
}
export const missionsDone = () => missions().filter((m) => m.done).length;
export const bonusDone = () => !!(S.mis && S.mis.day === today() && S.mis.bonus);
/**
 * Terminó una partida: suma lo que hizo a las misiones de su modo y paga las que se completen.
 * stats = { mode, coins, dodged, pts, kills, near, weapons, level, time, km }
 * Devuelve { done: [textos de las recién completadas], bonus: true si se completaron las tres ahora }.
 */
export function recordRun(stats) {
  const out = { done: [], bonus: false };
  S.runs = (S.runs || 0) + 1; // partidas de verdad jugadas (sin contar el modo demo)
  const defs = todays(),
    m = progress();
  defs.forEach((d, i) => {
    if (d.mode !== stats.mode || m.got[i]) return;
    const v = stats[d.stat] || 0;
    m.p[i] = d.sum ? m.p[i] + v : Math.max(m.p[i], v);
    if (m.p[i] >= d.n) {
      m.got[i] = true;
      S.coins += MISSION_COINS;
      out.done.push(d.t.replace('{n}', d.clock ? fmt(d.n) : d.n));
    }
  });
  if (!m.bonus && m.got.every(Boolean)) {
    m.bonus = true;
    S.coins += BONUS_COINS;
    out.bonus = true;
  }
  save();
  return out;
}

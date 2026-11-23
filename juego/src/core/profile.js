/** Perfil del jugador (monedas, récords, control elegido) y su guardado. */
import { LANGS } from './i18n.js';
import { Platform } from '../platform/platform.js';
export const S = {
  coins: 100,
  owned: ['aurora'],
  sel: 'aurora',
  mission: 0,
  mPaid: false,
  streak: 3,
  boss: false,
  bossWins: 0,
  best: 0,
  ctrl: 'swipe',
  volMusic: 100, // volúmenes de 0 a 100
  volSfx: 100,
  topTimes: [],
  topSpace: [],
};
/* ---------- lo guardado no es de fiar ----------
   El perfil vuelve del teléfono o de la nube y buena parte termina escrito en la pantalla. Antes
   de usarlo se limpia: cualquier texto pierde los caracteres con que se arma HTML (ningún dato
   del juego los usa: son ids, apodos, códigos y fechas), los números conocidos quedan como
   números dentro de su rango, y lo que no sea texto, número, sí/no, lista u objeto se descarta. */
const NUMBERS = {
  coins: 1e9,
  xp: 1e9,
  runs: 1e7,
  bossWins: 1e7,
  best: 1e7,
  streak: 1e5,
  mission: 1e5,
  volMusic: 100,
  volSfx: 100,
  noAdsUntil: 1e14,
  seenSent: 1e4,
  xpV: 100,
  gfxStep: 10,
  rank: 1e9,
  total: 1e9,
  n: 1e9,
  mine: 1e6,
  time: 1e6,
  passed: 1e9,
  seed: 4294967295,
  v: 1e12,
  at: 1e14,
};
const NUMBER_LISTS = ['topTimes', 'topSpace', 'seen']; // listas que solo llevan números
const UNSAFE = /[<>"'&`]/g,
  MAX_TEXT = 400,
  MAX_ITEMS = 2000,
  MAX_DEPTH = 6;
const number = (v, max) => Math.min(max, Math.max(0, +v || 0));
function clean(v, depth, key) {
  if (Object.hasOwn(NUMBERS, key) && typeof v !== 'object') return number(v, NUMBERS[key]);
  if (typeof v === 'string') return v.replace(UNSAFE, '').slice(0, MAX_TEXT);
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'boolean' || v === null) return v;
  if (typeof v !== 'object' || depth >= MAX_DEPTH) return undefined;
  if (Array.isArray(v)) {
    const list = v.slice(0, MAX_ITEMS);
    if (NUMBER_LISTS.includes(key)) return list.map((x) => number(x, 1e9));
    return list.map((x) => clean(x, depth + 1, '')).filter((x) => x !== undefined);
  }
  const out = {};
  for (const k of Object.keys(v).slice(0, MAX_ITEMS)) {
    const name = k.replace(UNSAFE, '').slice(0, 60);
    if (!name || name === '__proto__' || name === 'constructor' || name === 'prototype') continue;
    const x = clean(v[k], depth + 1, name);
    if (x !== undefined) out[name] = x;
  }
  return out;
}
/** Un perfil (del teléfono o de la nube) listo para usarse. Lo que no sea un objeto da {}. */
export function cleanProfile(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return {};
  const out = clean(data, 0, '');
  if ('lang' in out && !LANGS.some((l) => l.id === out.lang)) delete out.lang;
  return out;
}
export function bootProfile() {
  {
    const saved = Platform.load(),
      x = saved ? cleanProfile(saved) : null;
    if (x) {
      Object.assign(S, x);
      /* guardados anteriores: el sonido era encendido/apagado, ahora son dos volúmenes */
      if (x.sound === false) S.volMusic = S.volSfx = 0;
      else if (x.music === false) S.volMusic = 0;
      delete S.sound;
      delete S.music;
    }
  }
}
/* Guardar el perfil. Quien necesite enterarse de cada guardado (la cuenta, para subirlo a la
   nube) se apunta con onSave. saveQuiet guarda sin avisar: lo usa la cuenta para sus propias notas. */
const savers = [];
export const onSave = (fn) => savers.push(fn);
export const saveQuiet = () => Platform.save(S);
export const save = () => {
  for (const fn of savers) fn();
  Platform.save(S);
};

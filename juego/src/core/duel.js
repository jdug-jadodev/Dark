/**
 * Retos entre amigos: una pista de Supervivencia con un código de 6 letras. Quien crea el reto
 * juega la pista y manda el código; sus amigos juegan esa misma pista contra su tiempo, sin tener
 * que estar conectados a la vez. Cada reto tiene su propia tabla en el servidor.
 *
 *   S.duels = los retos del jugador, el más reciente primero (hasta 12):
 *     { code, seed, by (quién lo creó), mine (mi mejor tiempo), rank, n (jugadores),
 *       rival: { nick, time } (el mejor de los demás, o null), news (me superaron y no lo he visto) }
 */
import { Platform } from '../platform/platform.js';
import { apiUrl, cleanNick, nick, uid } from './cup.js';
import { S, save } from './profile.js';
import { num } from './util.js';

const KEEP = 12;
export const cleanCode = (text) =>
  String(text == null ? '' : text)
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 6);
/* una pista nueva para un reto (se elige al crear el reto, no durante la partida) */
export const newSeed = () => (Math.random() * 4294967296) >>> 0;

export const duels = () => S.duels || [];
export const duelOf = (code) => duels().find((d) => d.code === code) || null;
/* ¿hay algún reto donde me superaron y aún no lo he visto? */
export const duelNews = () => duels().some((d) => d.news);
export function seenDuelNews() {
  if (!duelNews()) return;
  for (const d of duels()) delete d.news;
  save();
}

/* guarda lo que contestó el servidor sobre un reto y lo devuelve como queda en S.duels.
   Lo que llega del servidor no se copia tal cual: el código, los apodos y los números se limpian
   aquí, porque después se escriben en la pantalla. */
function keep(view) {
  const code = cleanCode(view.code),
    old = duelOf(code),
    me = view.me && typeof view.me === 'object' ? view.me : null,
    others = view.top.filter((r) => r && typeof r === 'object' && !r.me),
    d = {
      code,
      seed: num(view.seed, 4294967295),
      by: cleanNick(view.by),
      mine: me ? num(me.time, 1e6) : old ? old.mine : 0,
      rank: me ? num(me.rank) : 0,
      n: num(view.total),
      rival: others.length ? { nick: cleanNick(others[0].nick), time: num(others[0].time, 1e6) } : null,
    };
  /* me superaron desde la última vez que miré */
  if (old && old.rank && d.rank > old.rank) d.news = true;
  else if (old && old.news) d.news = true;
  S.duels = [d, ...duels().filter((x) => x.code !== code)].slice(0, KEEP);
  save();
  return d;
}
const ok = (r) => r && typeof r.code === 'string' && cleanCode(r.code).length === 6 && Array.isArray(r.top);

/* ---------- conexión con el servidor ---------- */
/* Todas devuelven el reto (como queda en S.duels), 'missing' si ese código no existe, o null si
   no hay conexión. */
export async function createDuel(seed, secs) {
  const url = apiUrl();
  if (!url || !nick()) return null;
  const r = await Platform.net(url + '/v1/duel', { uid: uid(), nick: nick(), seed, time: Math.floor(secs) });
  return ok(r) ? keep(r) : null;
}
export async function sendDuel(code, secs) {
  const url = apiUrl();
  if (!url || !nick()) return null;
  const r = await Platform.net(url + '/v1/duel/score', { code, uid: uid(), nick: nick(), time: Math.floor(secs) });
  return ok(r) ? keep(r) : r && r.missing ? 'missing' : null;
}
export async function fetchDuel(code) {
  const url = apiUrl();
  if (!url) return null;
  const r = await Platform.net(url + '/v1/duel?code=' + cleanCode(code) + '&uid=' + (S.uid || ''));
  return ok(r) ? keep(r) : r && r.missing ? 'missing' : null;
}
/* trae las novedades de los retos más recientes (quién va ganando) */
export async function syncDuels(limit = 5) {
  const list = duels().slice(0, limit);
  /* de atrás hacia adelante, para que al final queden en el mismo orden */
  for (const d of list.reverse()) await fetchDuel(d.code);
}

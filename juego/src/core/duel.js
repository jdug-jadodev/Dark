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
import { apiUrl, nick, uid } from './cup.js';
import { S, save } from './profile.js';

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

/* guarda lo que contestó el servidor sobre un reto y lo devuelve como queda en S.duels */
function keep(view) {
  const old = duelOf(view.code),
    others = view.top.filter((r) => !r.me),
    d = {
      code: view.code,
      seed: view.seed,
      by: view.by,
      mine: view.me ? view.me.time : old ? old.mine : 0,
      rank: view.me ? view.me.rank : 0,
      n: view.total,
      rival: others.length ? { nick: others[0].nick, time: others[0].time } : null,
    };
  /* me superaron desde la última vez que miré */
  if (old && old.rank && d.rank > old.rank) d.news = true;
  else if (old && old.news) d.news = true;
  S.duels = [d, ...duels().filter((x) => x.code !== view.code)].slice(0, KEEP);
  save();
  return d;
}
const ok = (r) => r && typeof r.code === 'string' && Array.isArray(r.top);

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

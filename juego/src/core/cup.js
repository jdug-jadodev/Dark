/**
 * Copa semanal: el mejor tiempo de la semana en Supervivencia, contra los demás jugadores.
 * La semana va de lunes a domingo. Aquí están las reglas y lo que se guarda; la tabla vive en el
 * servidor (proyecto aparte: carpeta back-nave), y si no hay conexión la marca se guarda y se envía después.
 *
 *   S.uid  = número al azar de esta instalación (no dice quién es el jugador)
 *   S.nick = apodo
 *   S.cup  = { week, best, sent, rank, total, passed }
 *            best = mejor tiempo de la semana (s) · sent = ya lo tiene el servidor
 *            rank/total = último puesto conocido · passed = puesto que tenía cuando lo pasaron
 */
import { Platform } from '../platform/platform.js';
import { API_URL } from './config.js';
import { weekEnds, weekKey } from './dates.js';
import { S, save } from './profile.js';
import { unsentVisits, visitsSent } from './visits.js';

/* dirección del servidor. Vacía = la copa en línea no está conectada.
   Para probar con el servidor local: localStorage.giro_api = 'http://localhost:8787'
   Para no hablar con ningún servidor: localStorage.giro_api = 'off' */
export function apiUrl() {
  let url = Platform.testApi() || API_URL; // en el teléfono de pruebas: el servidor que se le haya configurado
  try {
    url = localStorage.getItem('giro_api') || url;
  } catch (e) {}
  return url === 'off' ? '' : url.replace(/\/+$/, ''); // 'off' = sin servidor (las pruebas automáticas)
}

/* lo de esta semana (si lo guardado es de otra semana, ya no cuenta) */
const fresh = () => ({ week: weekKey(), best: 0, sent: true, rank: 0, total: 0, passed: 0 });
export const cupNow = () => (S.cup && S.cup.week === weekKey() ? S.cup : fresh());
function mine() {
  if (!S.cup || S.cup.week !== weekKey()) S.cup = fresh();
  return S.cup;
}

/* ---------- apodo ---------- */
export const cleanNick = (text) =>
  String(text == null ? '' : text)
    .normalize('NFC')
    .replace(/[^\p{L}\p{N} _.-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 14)
    .trim();
export const nick = () => S.nick || '';
/* devuelve false si el apodo no sirve (menos de 2 letras) */
export function setNick(text) {
  const n = cleanNick(text);
  if (n.length < 2) return false;
  S.nick = n;
  if (cupNow().best > 0) mine().sent = false; // para que el servidor se entere del apodo
  save();
  return true;
}

/* ---------- la marca ---------- */
/* terminó una partida de Supervivencia. Devuelve { improved, best } */
export function recordCup(secs) {
  const time = Math.floor(secs),
    c = cupNow();
  if (time < 1 || time <= c.best) return { improved: false, best: c.best };
  const m = mine();
  m.best = time;
  m.sent = false;
  save();
  return { improved: true, best: time };
}
/* el jugador ya vio que lo pasaron */
export function seenPassed() {
  if (!cupNow().passed) return;
  mine().passed = 0;
  save();
}

/* ---------- conexión con el servidor ---------- */
export const LIVE = { table: null, offline: false, busy: false };
export function uid() {
  if (!S.uid) {
    S.uid = Platform.randomId();
    save();
  }
  return S.uid;
}
/* envía la marca pendiente (si hay) y trae la tabla. Devuelve la tabla o null si no se pudo */
export async function syncCup() {
  const url = apiUrl();
  if (!url || LIVE.busy) return LIVE.table;
  LIVE.busy = true;
  const c = cupNow(),
    sending = c.best > 0 && !c.sent && !!nick();
  const r = sending
    ? await Platform.net(url + '/v1/score', { uid: uid(), nick: nick(), week: c.week, time: c.best })
    : await Platform.net(url + '/v1/cup?uid=' + (S.uid || ''));
  LIVE.busy = false;
  LIVE.offline = !r;
  if (!r || !Array.isArray(r.top)) return null;
  LIVE.table = r;
  if (r.week === weekKey()) {
    const m = mine();
    /* solo se da por enviada si la marca no mejoró mientras viajaba la petición */
    if (sending && r.saved && m.best === c.best) m.sent = true;
    if (r.me) {
      if (m.rank && r.me.rank > m.rank && !m.passed) m.passed = m.rank; // lo pasaron desde la última vez
      m.rank = r.me.rank;
      m.total = r.total;
    }
    save();
  }
  return r;
}
/* medición: le cuenta al servidor los días jugados que aún no sabe */
export async function syncVisits() {
  const url = apiUrl(),
    days = unsentVisits();
  if (!url || !days.length || !S.first) return;
  const r = await Platform.net(url + '/v1/visits', { uid: uid(), first: S.first, days });
  if (r && r.ok) visitsSent(days.length);
}
export { weekEnds, weekKey };

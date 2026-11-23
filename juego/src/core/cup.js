/**
 * Copa semanal: el mejor tiempo de la semana en Supervivencia, contra los demás jugadores.
 * La semana va de lunes a domingo. Aquí están las reglas y lo que se guarda; la tabla vive en el
 * servidor (proyecto aparte: carpeta back-nave).
 *
 * Tiquete de partida: al empezar cada Supervivencia el juego le pide al servidor un tiquete, y la
 * marca solo entra a la copa si llega con él (el servidor comprueba que el tiempo quepa en el
 * reloj real que pasó desde que lo dio: así nadie anota un tiempo inventado de un tirón). Por eso
 * una partida que EMPIEZA sin conexión no cuenta para la copa. Si la conexión se cae después, la
 * marca se guarda con su tiquete y se envía cuando vuelva.
 *
 *   S.uid  = número al azar de esta instalación (no dice quién es el jugador)
 *   S.nick = apodo
 *   S.cup  = { week, best, ticket, sent, rank, total, passed }
 *            best = mejor tiempo de la semana (s) · ticket = el tiquete de esa partida
 *            sent = ya lo tiene el servidor
 *            rank/total = último puesto conocido · passed = puesto que tenía cuando lo pasaron
 */
import { Platform } from '../platform/platform.js';
import { API_URL } from './config.js';
import { weekEnds, weekKey } from './dates.js';
import { S, save } from './profile.js';
import { num } from './util.js';
import { unsentVisits, visitsSent } from './visits.js';

/* dirección del servidor. Vacía = la copa en línea no está conectada.
   Para probar con el servidor local: localStorage.giro_api = 'http://localhost:8787'
   Para no hablar con ningún servidor: localStorage.giro_api = 'off'
   Eso solo vale en el laboratorio y en la app de pruebas (Platform.lab): la app de publicación
   habla siempre con el servidor del juego, y nada guardado en la página puede cambiarlo. */
export function apiUrl() {
  let url = Platform.testApi() || API_URL; // en el teléfono de pruebas: el servidor que se le haya configurado
  if (Platform.lab)
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
/* Empieza una Supervivencia: pide el tiquete de la partida. Devuelve una promesa con el tiquete,
   o '' si no hay conexión (esa partida no contará para la copa) o si no hay servidor.
   Si el servidor contesta que no sabe de tiquetes (uno publicado antes de que existieran), se
   devuelve NO_TICKETS y la marca se manda como antes; quien decide si vale es el servidor: el
   que sí da tiquetes rechaza las marcas que lleguen sin uno. */
const NO_TICKETS = '-';
export async function askTicket() {
  const url = apiUrl();
  if (!url) return '';
  const r = await Platform.net(url + '/v1/run', { uid: uid() });
  if (r && r.missing) return NO_TICKETS;
  return r && typeof r.ticket === 'string' && /^[0-9a-z.]{10,60}$/.test(r.ticket) ? r.ticket : '';
}
/* Terminó una partida de Supervivencia; ticket = el tiquete con que empezó.
   Devuelve { improved, best, missed }: missed = era mejor que la marca de la semana, pero la
   partida empezó sin conexión (sin tiquete) y no cuenta.
   Sin servidor configurado (las pruebas) no hay tiquetes: la marca se lleva solo en el teléfono. */
export function recordCup(secs, ticket) {
  const time = Math.floor(secs),
    c = cupNow();
  if (time < 1 || time <= c.best) return { improved: false, best: c.best };
  if (apiUrl() && !ticket) return { improved: false, best: c.best, missed: true };
  const m = mine();
  m.best = time;
  if (ticket) m.ticket = ticket;
  else delete m.ticket; // sin servidor no hay tiquete: lo guardado queda como siempre
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
    ? await Platform.net(url + '/v1/score', {
        uid: uid(),
        nick: nick(),
        week: c.week,
        time: c.best,
        ticket: c.ticket || '',
      })
    : await Platform.net(url + '/v1/cup?uid=' + (S.uid || ''));
  LIVE.busy = false;
  LIVE.offline = !r;
  if (!r || !Array.isArray(r.top)) return null;
  const table = cleanTable(r);
  LIVE.table = table;
  if (r.week === weekKey()) {
    const m = mine();
    /* solo se da por enviada si la marca no mejoró mientras viajaba la petición */
    if (sending && r.saved && m.best === c.best) m.sent = true;
    /* el servidor no la aceptó (no trae un tiquete que valga): no se insiste, y la marca de la
       semana vuelve a ser la que el servidor sí tiene */
    if (sending && r.refused && m.best === c.best) {
      m.best = table.me ? table.me.time : 0;
      delete m.ticket;
      m.sent = true;
    }
    if (table.me) {
      if (m.rank && table.me.rank > m.rank && !m.passed) m.passed = m.rank; // lo pasaron desde la última vez
      m.rank = table.me.rank;
      m.total = table.total;
    }
    save();
  }
  return table;
}
/* La tabla como la contestó el servidor, pero armada de nuevo con solo lo que el juego usa y cada
   cosa de su tipo (apodos limpios, números de verdad): lo que llega de fuera se escribe en la pantalla. */
function cleanTable(r) {
  const row = (x) => ({ nick: cleanNick(x.nick), time: num(x.time, 1e6), me: !!x.me });
  return {
    week: typeof r.week === 'string' ? r.week.replace(/[^0-9A-Za-z-]/g, '').slice(0, 12) : '',
    ends: num(r.ends, 1e7),
    total: num(r.total),
    saved: !!r.saved,
    refused: !!r.refused,
    top: r.top
      .filter((x) => x && typeof x === 'object')
      .slice(0, 100)
      .map(row),
    me: r.me && typeof r.me === 'object' ? { rank: num(r.me.rank), time: num(r.me.time, 1e6) } : null,
  };
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

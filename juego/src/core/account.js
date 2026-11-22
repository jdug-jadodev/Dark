/**
 * Cuenta: guardar el progreso en la nube para no perderlo al cambiar de teléfono o reinstalar.
 * Es opcional: sin cuenta se juega igual que siempre, y todo queda en el teléfono.
 *
 * Se entra solo con Google. El juego nunca ve la contraseña ni guarda el correo: Google entrega
 * un comprobante firmado, el servidor lo revisa y devuelve una llave de sesión. Esa llave es lo
 * único delicado que tiene el teléfono, y se guarda cifrada (Platform.account).
 *
 * Qué se sube: el perfil (S) menos lo que es de este teléfono (control, volumen, gráficos…).
 * Cómo se evita perder progreso:
 *   - Cada guardado lleva la versión que el juego conocía. Si otro teléfono guardó después, el
 *     servidor no lo acepta y devuelve lo que hay: nunca se pisa nada sin saberlo.
 *   - Cuando hay dos progresos distintos (el del teléfono y el de la cuenta), no se escoge solo:
 *     se le muestran los dos al jugador y él decide cuál queda.
 *
 *   S.acct = { v: versión de la nube que este teléfono conoce, at: cuándo se subió,
 *              sum: huella de lo que se subió (si el perfil ya no da esa huella, hay cambios por subir) }
 */
import { apiUrl } from './cup.js';
import { pilot } from './pilot.js';
import { S, onSave, saveQuiet } from './profile.js';
import { G } from './state.js';
import { worldsDone } from './worlds.js';
import { Platform } from '../platform/platform.js';

/* lo que es de este teléfono y no viaja con la cuenta */
const LOCAL = ['acct', 'ctrl', 'volMusic', 'volSfx', 'gfx', 'remAsked'];
const PUSH_AFTER = 15000; // se sube 15 s después del último cambio, para no subir a cada rato

const listeners = [];
/* avisa a la pantalla: 'changed' (cambió el estado) o 'choose' (hay dos progresos: cloud = el de la cuenta) */
export const onAccount = (fn) => listeners.push(fn);
const tell = (what, cloud) => listeners.forEach((fn) => fn(what, cloud));

export const accountAvailable = () => !!apiUrl() && Platform.account.available();
export const signedIn = () => accountAvailable() && !!Platform.account.secret();
export const lastSync = () => (S.acct && S.acct.at) || 0;
/* huella corta de un texto (FNV-1a): para saber si el perfil cambió, no para proteger nada */
function mark(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193);
  return (h >>> 0).toString(36);
}
/* ¿hay algo en este teléfono que la cuenta todavía no tiene? */
const dirty = () => !!S.acct && S.acct.sum !== mark(JSON.stringify(cloudCopy()));
export const pendingUpload = dirty;
/* cómo estaba al abrir el juego: si la partida anterior terminó con cambios sin subir. Se mira
   antes de que el arranque toque el perfil (anotar el día, reiniciar las misiones…), para no
   confundir esos retoques con progreso de verdad. */
let dirtyAtStart = false;

/* lo que se sube: el perfil sin lo de este teléfono */
export function cloudCopy() {
  const o = { ...S };
  for (const k of LOCAL) delete o[k];
  return o;
}
/* ¿hay algo que valga la pena conservar en este teléfono? */
const hasProgress = (d) => (d.runs || 0) > 0 || (d.xp || 0) > 0 || (d.coins || 0) !== 100 || (d.bossWins || 0) > 0;
/* ¿dos progresos valen lo mismo? (mismas monedas, experiencia, piezas, mundos y récords). Si sí,
   no hay nada que elegir aunque difieran en detalles: se queda el de este teléfono. */
function sameProgress(a, b) {
  const pick = (d) =>
    JSON.stringify([
      d.xp || 0,
      d.coins || 0,
      d.runs || 0,
      d.bossWins || 0,
      (d.parts || []).length,
      (d.owned || []).length,
      Object.entries(d.worlds || {}).sort(),
      (d.topTimes || [])[0] || 0,
      (d.topSpace || [])[0] || 0,
    ]);
  return pick(a) === pick(b);
}
/* un progreso en pocas cifras, para que el jugador pueda comparar dos y elegir */
export function summary(d) {
  const keep = { ...S };
  /* el nivel y los mundos se calculan con las mismas reglas del juego, sobre esos datos */
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, d);
  let out;
  try {
    const p = pilot();
    out = {
      medal: p.medal,
      level: p.lv,
      coins: d.coins || 0,
      pieces: Array.isArray(d.parts) ? d.parts.length : 0,
      worlds: worldsDone(),
      best: Array.isArray(d.topTimes) && d.topTimes.length ? d.topTimes[0] : 0,
      runs: d.runs || 0,
    };
  } finally {
    for (const k of Object.keys(S)) delete S[k];
    Object.assign(S, keep);
  }
  return out;
}

/* ---------- hablar con el servidor ---------- */
const call = (method, path, data, withKey = true) =>
  Platform.api(method, apiUrl() + path, data, withKey ? Platform.account.secret() : '');
/* la sesión dejó de valer (venció, o se borró la cuenta desde otro teléfono): se cierra aquí también */
function dropSession() {
  Platform.account.setSecret('');
  if (S.acct) {
    delete S.acct;
    saveQuiet();
  }
  tell('changed');
}

/* ---------- entrar ----------
   Devuelve { ok: true, result } con result = 'saved' (se subió lo de este teléfono), 'restored'
   (se trajo lo de la cuenta), 'same' (ya estaban iguales) o 'choose' (hay dos: cloud trae el otro);
   o { ok: false, why } con why = 'net' | 'cancel' | 'denied'. */
export async function signIn() {
  const n = await call('POST', '/v1/auth/nonce', undefined, false);
  if (!n || n.status !== 200 || !n.data.nonce) return { ok: false, why: 'net' };
  const idToken = await Platform.account.idToken(n.data.nonce);
  if (!idToken) return { ok: false, why: 'cancel' };
  const r = await call('POST', '/v1/auth/google', { idToken }, false);
  if (!r) return { ok: false, why: 'net' };
  if (r.status !== 200 || !r.data.session) return { ok: false, why: 'denied' };
  Platform.account.setSecret(r.data.session);
  const cloud = r.data.save;
  tell('changed');
  if (!cloud || !cloud.data) {
    /* la cuenta está vacía: se sube lo de este teléfono */
    S.acct = { v: 0, at: 0, sum: '' };
    saveQuiet();
    await push();
    return { ok: true, result: 'saved' };
  }
  if (!hasProgress(S)) {
    adopt(cloud); // teléfono nuevo o recién instalado: se trae lo guardado
    return { ok: true, result: 'restored' };
  }
  if (S.acct && S.acct.v === cloud.version && !dirty()) return { ok: true, result: 'same' };
  if (sameProgress(S, cloud.data)) {
    await keepLocal(cloud);
    return { ok: true, result: 'same' };
  }
  return { ok: true, result: 'choose', cloud };
}

/* ---------- subir ---------- */
let busy = false,
  timer = 0;
/* Sube el progreso si hay cambios. Devuelve 'ok', 'idle' (nada que subir), 'net', 'choose' u 'out'. */
export async function push() {
  if (!signedIn() || !S.acct) return 'idle';
  if (busy || !dirty()) return 'idle';
  busy = true;
  const sent = JSON.stringify(cloudCopy()),
    r = await call('PUT', '/v1/save', { data: JSON.parse(sent), base: S.acct.v });
  busy = false;
  if (!r) return 'net';
  if (r.status === 200) {
    /* si el perfil cambió mientras viajaba la petición, sigue habiendo cambios por subir */
    S.acct = { v: r.data.version, at: r.data.at, sum: mark(sent) };
    saveQuiet();
    if (dirty()) later();
    tell('changed');
    return 'ok';
  }
  if (r.status === 409 && r.data.data) {
    /* otro teléfono guardó después */
    return clash({ version: r.data.version, at: r.data.at, data: r.data.data });
  }
  if (r.status === 401) {
    dropSession();
    return 'out';
  }
  return 'net';
}
function later() {
  clearTimeout(timer);
  timer = setTimeout(push, PUSH_AFTER);
}

/* ---------- elegir entre dos progresos ---------- */
/* hay dos progresos: si valen lo mismo queda el de este teléfono; si no, el jugador elige */
function clash(cloud) {
  if (sameProgress(S, cloud.data)) {
    keepLocal(cloud);
    return 'ok';
  }
  tell('choose', cloud);
  return 'choose';
}
/* queda el de este teléfono: se sube encima del de la cuenta */
export async function keepLocal(cloud) {
  S.acct = { v: cloud.version, at: cloud.at, sum: '' };
  saveQuiet();
  return push();
}
/* queda el de la cuenta: reemplaza al de este teléfono (y el juego vuelve a arrancar con él) */
export function keepCloud(cloud) {
  adopt(cloud);
}
function adopt(cloud) {
  const mine = {};
  for (const k of LOCAL) if (k in S && k !== 'acct') mine[k] = S[k];
  for (const k of Object.keys(S)) delete S[k];
  Object.assign(S, cloud.data, mine);
  S.acct = { v: cloud.version, at: cloud.at, sum: mark(JSON.stringify(cloudCopy())) };
  saveQuiet();
  Platform.restart();
}

/* ---------- salir ---------- */
/* cerrar sesión: el progreso se queda en el teléfono y deja de subirse */
export async function signOut() {
  await push(); // lo último, antes de salir
  await call('POST', '/v1/auth/logout');
  dropSession();
}
/* borrar la cuenta y todo lo guardado en la nube. Devuelve true si se borró. */
export async function deleteAccount() {
  const r = await call('DELETE', '/v1/account');
  if (!r || (r.status !== 200 && r.status !== 401)) return false;
  dropSession();
  return true;
}

/* ---------- al abrir el juego ---------- */
export async function syncAtStart() {
  if (!signedIn()) return;
  const r = await call('GET', '/v1/save');
  if (!r) return; // sin conexión: se intenta después
  if (r.status === 401) return dropSession();
  if (r.status !== 200) return;
  const cloud = r.data,
    known = (S.acct && S.acct.v) || 0;
  if (!S.acct || !cloud.data) S.acct = { v: 0, at: 0, sum: '' };
  if (!cloud.data || cloud.version === known) return void push(); // la cuenta no cambió: se sube lo pendiente
  /* la cuenta tiene algo más nuevo: se jugó en otro teléfono. Si aquí no quedó nada sin subir, se
     trae sin preguntar (en el menú: nunca a media partida); si quedó, el jugador elige. */
  if (!dirtyAtStart && G.state === 'menu') return adopt(cloud);
  clash(cloud);
}
/* Se llama apenas se carga el perfil, antes que todo lo demás. */
export function bootAccount() {
  /* cada vez que el juego guarda el perfil, queda pendiente subirlo */
  dirtyAtStart = signedIn() && dirty();
  onSave(() => {
    if (S.acct && signedIn() && dirty()) later();
  });
  /* al salir del juego (pasa a segundo plano), se sube lo pendiente sin esperar */
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') push();
  });
}

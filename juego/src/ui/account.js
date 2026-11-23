/**
 * La pantalla de la cuenta: entrar con Google para guardar el progreso, ver cuándo se guardó,
 * elegir entre dos progresos cuando no coinciden, cerrar sesión y borrar la cuenta.
 * Se abre desde Configuración y desde el aviso "Guarda tu progreso" del lobby.
 */
import {
  accountAvailable,
  cloudCopy,
  deleteAccount,
  keepCloud,
  keepLocal,
  lastSync,
  onAccount,
  pendingUpload,
  push,
  signIn,
  signOut,
  signedIn,
  summary,
  syncAtStart,
} from '../core/account.js';
import { locale, tr } from '../core/i18n.js';
import { S, saveQuiet } from '../core/profile.js';
import { G } from '../core/state.js';
import { fmt } from '../core/util.js';
import { $ } from './dom.js';
import { T } from './icons.js';

/* la G de Google, para el botón de entrar */
const GOOGLE =
  '<svg class="gmark" viewBox="0 0 48 48" aria-hidden="true">' +
  '<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>' +
  '<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>' +
  '<path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>' +
  '<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>' +
  '</svg>';
let view = 'home', // 'home' | 'busy' | 'choose' | 'confirm'
  note = '', // un mensaje para el jugador
  other = null; // el progreso de la cuenta, cuando hay que elegir

/* hace cuánto fue algo, en palabras */
function ago(at) {
  const s = Math.max(0, Math.floor((Date.now() - at) / 1000));
  if (s < 90) return tr('hace un momento');
  if (s < 3600) return tr('hace {n} minutos', { n: Math.round(s / 60) });
  if (s < 5400) return tr('hace 1 hora');
  if (s < 86400 * 2) return tr('hace {n} horas', { n: Math.round(s / 3600) });
  return tr('hace {n} días', { n: Math.round(s / 86400) });
}
/* la tarjeta de un progreso, para comparar */
function card(title, d, pick, when) {
  const x = summary(d);
  return (
    '<div class="acard"><b>' +
    title +
    '</b>' +
    (when ? '<small>' + tr('guardado {ago}', { ago: ago(when) }) + '</small>' : '<small>&nbsp;</small>') +
    '<div class="arank">' +
    x.medal.icon +
    '<span>' +
    x.medal.label +
    '<small>' +
    tr('nivel {n}', { n: x.level }) +
    '</small></span></div><div class="arow">{coin} ' +
    x.coins.toLocaleString(locale()) +
    '</div><div class="arow">{puzzle} ' +
    (x.pieces === 1 ? tr('1 pieza') : tr('{n} piezas', { n: x.pieces })) +
    '</div><div class="arow">{rocket} ' +
    (x.worlds === 1 ? tr('1 mundo') : tr('{n} mundos', { n: x.worlds })) +
    '</div><div class="arow">{timer} ' +
    (x.best ? fmt(x.best) : '—') +
    '</div><button class="btn" data-acct="' +
    pick +
    '">' +
    tr('Usar este') +
    '</button></div>'
  );
}
function render() {
  let h = '<h2>' + tr('{cloud} Tu progreso') + '</h2>';
  if (view === 'busy') h += '<div class="sub">' + (note || tr('Un momento…')) + '</div>';
  else if (view === 'choose')
    h +=
      '<div class="sub">' +
      tr(
        'Hay dos progresos distintos: el de este teléfono y el que está guardado en tu cuenta. Elige con cuál te quedas; el otro se reemplaza.',
      ) +
      '</div><div class="apick">' +
      card(tr('En este teléfono'), cloudCopy(), 'local', 0) +
      card(tr('En tu cuenta'), other.data, 'cloud', other.at) +
      '</div><button class="btn alt" data-acct="later">' +
      tr('Decidir después') +
      '</button>';
  else if (view === 'confirm')
    h +=
      '<div class="sub">' +
      tr(
        '¿Borrar tu cuenta y todo lo que está guardado en la nube? Lo que tienes en este teléfono se queda aquí, pero ya no estará a salvo si lo pierdes o reinstalas.',
      ) +
      ' ' +
      tr('Para confirmar te pediremos entrar con Google otra vez.') +
      '</div>' +
      '<button class="btn danger" data-acct="delete">' +
      tr('Sí, borrar mi cuenta') +
      '</button><button class="btn alt" data-acct="home">' +
      tr('No, volver') +
      '</button>';
  else if (signedIn())
    h +=
      '<div class="astate ok">' +
      tr('{check} Tu progreso se guarda en tu cuenta de Google') +
      '</div><div class="sub">' +
      (pendingUpload()
        ? tr('Hay cambios por subir.')
        : lastSync()
          ? tr('Último guardado: {ago}.', { ago: ago(lastSync()) })
          : tr('Todavía no se ha guardado.')) +
      ' ' +
      tr('Si cambias de teléfono o reinstalas, entra con la misma cuenta y lo recuperas.') +
      '</div>' +
      (note ? '<div class="note">' + note + '</div>' : '') +
      '<button class="btn" data-acct="push">' +
      tr('{cloud} Guardar ahora') +
      '</button>' +
      '<button class="btn alt" data-acct="out">' +
      tr('Cerrar sesión') +
      '</button>' +
      '<button class="btn alt" data-acct="close">' +
      tr('Listo') +
      '</button>' +
      '<button class="alink" data-acct="confirm">' +
      tr('Borrar mi cuenta y lo guardado') +
      '</button>';
  else
    h +=
      '<div class="sub">' +
      tr('Entra con Google y tu progreso queda guardado: si cambias de teléfono o reinstalas el juego, lo recuperas.') +
      '</div>' +
      '<div class="note">' +
      tr('{lock} No vemos tu contraseña ni guardamos tu correo o tu nombre. Es opcional: sin cuenta juegas igual.') +
      '</div>' +
      (note ? '<div class="note warn">' + note + '</div>' : '') +
      '<button class="btn gbtn" data-acct="in">' +
      GOOGLE +
      tr('Continuar con Google') +
      '</button><button class="btn alt" data-acct="close">' +
      tr('Ahora no') +
      '</button>';
  $('acctBox').innerHTML = T(h);
}
const show = (v, text = '') => {
  view = v;
  note = text;
  render();
};
export function openAccount() {
  if (!accountAvailable()) return;
  S.acctSeen = true; // ya vio la invitación: el aviso del lobby no vuelve a salir
  saveQuiet();
  show(other ? 'choose' : 'home');
  $('account').classList.add('show');
}
/* devuelve true si estaba abierta (para el botón "atrás" del sistema) */
export function closeAccount() {
  if (!$('account').classList.contains('show')) return false;
  if (view === 'busy') return true; // a media operación no se cierra
  $('account').classList.remove('show');
  return true;
}
/* ¿mostrar en el lobby la invitación a guardar el progreso? Una sola vez, cuando ya hay algo que perder */
export const accountOffer = () => accountAvailable() && !signedIn() && !S.acctSeen && (S.runs || 0) >= 3;
/* el renglón de Configuración */
export function renderAccountRow() {
  const on = signedIn();
  $('acctRow').style.display = accountAvailable() ? '' : 'none';
  $('acctOpen').innerHTML = T(on ? tr('{check} Guardado en tu cuenta') : tr('{cloud} Guardar mi progreso'));
  $('acctOpen').classList.toggle('ok', on);
  $('acctNote').textContent = on
    ? tr('Se sube solo cada vez que juegas. Toca para ver cuándo se guardó o cerrar sesión.')
    : tr('Entra con Google para no perderlo si cambias de teléfono o reinstalas el juego.');
}

const WHY = {
  net: tr('No se pudo conectar. Revisa tu internet e intenta de nuevo.'),
  cancel: tr('No se completó el inicio de sesión.'),
  denied: tr('Google no confirmó la cuenta. Intenta de nuevo.'),
};
async function act(a) {
  if (a === 'close' || a === 'later') return void closeAccount();
  if (a === 'home') return show('home');
  if (a === 'confirm') return show('confirm');
  if (a === 'in') {
    show('busy', tr('Entrando con Google…'));
    const r = await signIn();
    if (!r.ok) return show('home', WHY[r.why]);
    if (r.result === 'choose') {
      other = r.cloud;
      return show('choose');
    }
    return show(
      'home',
      r.result === 'saved'
        ? tr('Listo: tu progreso quedó guardado.')
        : r.result === 'same'
          ? tr('Tu progreso ya estaba guardado en tu cuenta.')
          : '',
    );
  }
  if (a === 'push') {
    show('busy', tr('Guardando…'));
    const r = await push();
    return show('home', r === 'net' ? WHY.net : r === 'ok' || r === 'idle' ? tr('Guardado.') : '');
  }
  if (a === 'out') {
    show('busy', tr('Cerrando sesión…'));
    const closed = await signOut();
    return show(
      'home',
      closed
        ? tr('Sesión cerrada. Tu progreso sigue en este teléfono.')
        : tr(
            'No se pudo confirmar el cierre de sesión (sin conexión). Tu sesión sigue abierta: intenta de nuevo con internet.',
          ),
    );
  }
  if (a === 'delete') {
    show('busy', tr('Confirma con Google para borrar tu cuenta…'));
    const r = await deleteAccount();
    return show(
      'home',
      r === 'ok'
        ? tr('Tu cuenta y lo guardado en la nube se borraron.')
        : r === 'cancel'
          ? tr('No se borró nada: faltó confirmar con Google.')
          : r === 'denied'
            ? tr('No se borró nada: Google no confirmó que esta cuenta sea tuya.')
            : r === 'out'
              ? tr('Tu sesión ya estaba cerrada y no se borró nada. Entra de nuevo para borrar la cuenta.')
              : WHY.net,
    );
  }
  if (a === 'local' || a === 'cloud') {
    const cloud = other;
    other = null;
    show('busy', a === 'cloud' ? tr('Trayendo tu progreso…') : tr('Guardando el de este teléfono…'));
    if (a === 'cloud') return keepCloud(cloud); // el juego vuelve a arrancar con ese progreso
    const r = await keepLocal(cloud);
    return show('home', r === 'ok' ? tr('Listo: quedó el de este teléfono.') : WHY.net);
  }
}
export function bootAccountScreen(refresh) {
  $('acctBox').addEventListener('click', (e) => {
    const b = e.target.closest('[data-acct]');
    if (b && view !== 'busy') act(b.dataset.acct).then(refresh);
  });
  $('acctOpen').addEventListener('click', openAccount);
  onAccount((what, cloud) => {
    if (what === 'choose') {
      other = cloud;
      /* solo se interrumpe en el menú; a media partida espera a que vuelva */
      if (G.state === 'menu' && !$('account').classList.contains('show')) openAccount();
      else if ($('account').classList.contains('show') && view !== 'busy') show('choose');
    }
    refresh();
  });
  if (accountAvailable()) syncAtStart();
}
/* al volver al menú: si quedó pendiente elegir entre dos progresos, se pregunta ahora */
export function accountAtMenu() {
  if (other && !$('account').classList.contains('show')) openAccount();
}

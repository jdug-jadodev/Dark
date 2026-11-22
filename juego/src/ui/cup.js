/**
 * Las tablas contra otros jugadores: la copa semanal (el mejor tiempo de la semana en Supervivencia)
 * y los retos entre amigos (una pista con código). Aquí están el botón del lobby, la ventana con
 * la tabla, los retos y el apodo, y la línea que sale al terminar una partida. Las reglas están en
 * core/cup.js y core/duel.js.
 */
import {
  LIVE,
  apiUrl,
  cupNow,
  nick,
  recordCup,
  seenPassed,
  setNick,
  syncCup,
  syncVisits,
  weekEnds,
} from '../core/cup.js';
import {
  cleanCode,
  createDuel,
  duelNews,
  duelOf,
  duels,
  fetchDuel,
  seenDuelNews,
  sendDuel,
  syncDuels,
} from '../core/duel.js';
import { G } from '../core/state.js';
import { fmt } from '../core/util.js';
import { noteVisit } from '../core/visits.js';
import { $ } from './dom.js';
import { T } from './icons.js';
import { tellCup } from './reminder.js';
import { playDuel, playNewDuel, playSurvival } from './tracks.js';
import { Platform } from '../platform/platform.js';

let refresh = () => {}; // repinta el lobby (lo entrega main.js)
let editing = false;
let tab = 'cup'; // qué se está mirando: 'cup' (copa semanal) o 'duel' (retos)
const MEDAL = ['{medal1}', '{medal2}', '{medal3}'];
const place = (n) => n + '.º';
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
/* "2 d 5 h", "5 h 20 min", "12 min" */
function left(secs) {
  const d = Math.floor(secs / 86400),
    h = Math.floor((secs % 86400) / 3600),
    m = Math.floor((secs % 3600) / 60);
  const text = d ? d + ' d ' + h + ' h' : h ? h + ' h ' + m + ' min' : Math.max(1, m) + ' min';
  return text.replace(/ /g, ' '); // que no se parta entre dos renglones
}

/* ---------- botones del lobby ---------- */
export function renderCupButton() {
  const c = cupNow();
  $('cupBtn').querySelector('small').innerHTML = c.rank ? place(c.rank) : c.best ? fmt(c.best) : 'nueva';
  $('cupBtn').classList.toggle('dot', !!c.passed || duelNews()); // lo pasaron en la copa o en un reto
  tellCup(c.rank || 0);
}

/* ---------- retar a los amigos ---------- */
/* el mensaje para el chat: el tiempo (el de la partida o el mejor) y el puesto */
function challengeText(secs, kind, code) {
  const duel = kind === 'duel' && duelOf(code);
  if (duel)
    return (
      'Te reto en Giro Estelar: aguanté ' +
      fmt(duel.mine) +
      ' en esta pista. Entra a Copa, pestaña Retos, y escribe el código ' +
      duel.code +
      '. ¿Me ganas? \u{1F680}'
    );
  const c = cupNow();
  return (
    'Aguanté ' +
    fmt(secs || c.best) +
    ' en Supervivencia de Giro Estelar' +
    (c.rank ? ' y voy ' + place(c.rank) + ' en la copa de esta semana' : '') +
    '. ¿Me ganas? \u{1F680}'
  );
}
/* abre el menú de compartir del teléfono; el botón cuenta qué pasó */
export async function challenge(button, secs, kind, code) {
  const how = await Platform.share(challengeText(secs, kind, code));
  if (how === 'copied') button.innerHTML = T('{check} Copiado: pégalo en tu chat');
  else if (!how) button.innerHTML = T('No se pudo compartir');
}

/* ---------- ventana ---------- */
const TABS = [
  ['cup', '{trophy} Copa'],
  ['duel', '{swords} Retos'],
];
const tabsBar = () =>
  '<div class="tabs">' +
  TABS.map(
    ([id, label]) =>
      '<button class="' + (id === tab ? 'sel' : '') + '" data-k="tab" data-v="' + id + '">' + label + '</button>',
  ).join('') +
  '</div>';
/* el apodo: hace falta para aparecer en cualquier tabla */
const nickForm = (name) =>
  '<div class="nick"><input id="cupNick" maxlength="14" autocomplete="off" placeholder="Tu apodo" value="' +
  esc(name) +
  '"><button class="btn" data-k="save">' +
  (name ? 'Guardar' : 'Entrar') +
  '</button></div><div class="sub" id="cupNickErr">' +
  (name ? '' : 'Elige un apodo para aparecer en la tabla (de 2 a 14 letras).') +
  '</div>';

/* la tabla de la copa */
const VIEWS = {
  cup: {
    title: '{trophy} Copa semanal',
    sub: (ends) => 'Gana quien más aguante en Supervivencia. Termina en ' + ends + ' y empieza otra.',
    state: cupNow,
    live: LIVE,
    ends: weekEnds,
    mine: 'Tu mejor de la semana',
    empty: 'Nadie ha marcado tiempo esta semana. El primer puesto está libre.',
    play: '{timer} Jugar Supervivencia',
    cls: 'surv',
  },
};
function render() {
  if (tab === 'duel') return renderDuels();
  const V = VIEWS[tab],
    c = V.state(),
    t = V.live.table,
    online = !!apiUrl(),
    name = nick();
  let h = tabsBar() + '<div class="sub">' + V.sub(left(t ? t.ends : V.ends())) + '</div>';
  if (tab === 'cup' && c.passed && c.rank)
    h +=
      '<div class="passed">Te pasaron: ibas ' +
      place(c.passed) +
      ' y ahora vas ' +
      place(c.rank) +
      '. ¡A recuperarlo!</div>';
  if (!name || editing) h += nickForm(name);
  /* lo mío */
  h +=
    '<div class="grid two"><div><b>' +
    (c.best ? fmt(c.best) : '—') +
    '</b><span>' +
    V.mine +
    '</span></div><div><b>' +
    (c.rank ? place(c.rank) + (c.total ? ' <small>de ' + c.total + '</small>' : '') : '—') +
    '</b><span>Tu puesto</span></div></div>';
  /* tabla */
  if (t && t.top.length) {
    h +=
      '<div class="top cup">' +
      t.top
        .map(
          (r, i) =>
            '<div class="' +
            (r.me ? 'me' : '') +
            '"><span><i>' +
            (MEDAL[i] || i + 1 + '.') +
            '</i> ' +
            esc(r.nick) +
            (r.me ? ' (tú)' : '') +
            '</span><b>' +
            fmt(r.time) +
            '</b></div>',
        )
        .join('') +
      (t.me && t.me.rank > t.top.length
        ? '<div class="gap">···</div><div class="me"><span><i>' +
          t.me.rank +
          '.</i> ' +
          esc(name) +
          ' (tú)</span><b>' +
          fmt(t.me.time) +
          '</b></div>'
        : '') +
      '</div>';
  } else if (t) h += '<div class="note">' + V.empty + '</div>';
  /* estado */
  if (!online)
    h +=
      '<div class="note">La tabla en línea todavía no está conectada. Tu mejor tiempo queda guardado en este teléfono.</div>';
  else if (V.live.offline)
    h +=
      '<div class="note">Sin conexión. ' +
      (c.best && !c.sent ? 'Tu tiempo se enviará cuando vuelva.' : 'La tabla se actualizará cuando vuelva.') +
      '</div>';
  else if (!t) h += '<div class="note">Cargando la tabla…</div>';
  else if (c.best && !name) h += '<div class="note">Tu tiempo entra a la tabla cuando elijas un apodo.</div>';
  if (name && !editing)
    h +=
      '<div class="sub">Juegas como <b>' +
      esc(name) +
      '</b> · <button class="link" data-k="edit">cambiar apodo</button></div>';
  h +=
    '<button class="btn ' +
    V.cls +
    '" data-k="play">' +
    V.play +
    '</button>' +
    (c.best ? '<button class="btn alt" data-k="share">{share} Retar a mis amigos</button>' : '') +
    '<button class="btn alt" data-k="close">Cerrar</button>';
  $('cupBox').innerHTML = T(h);
  const input = $('cupNick');
  /* dentro del apodo las teclas son letras, no controles de la nave */
  if (input) input.addEventListener('keydown', (e) => e.stopPropagation());
}
const isOpen = () => $('cup').classList.contains('show');
async function update() {
  await Promise.all([syncCup(), syncDuels()]);
  renderCupButton();
  if (isOpen() && !(editing && document.activeElement === $('cupNick'))) render();
}
function open(which) {
  editing = false;
  tab = which === 'duel' ? 'duel' : 'cup';
  render();
  $('cup').classList.add('show');
  update().then(() => {
    seenPassed(); // ya lo vio: el punto rojo del lobby se quita al cerrar
  });
}
/* devuelve true si estaba abierta (para el botón "atrás" del sistema) */
export function closeCup() {
  if (!isOpen()) return false;
  $('cup').classList.remove('show');
  refresh();
  return true;
}

/* ---------- al terminar una partida de Supervivencia ---------- */
/* Anota el tiempo donde corresponde (la copa, o el reto si era uno) y devuelve la línea
   para la pantalla de fin (vacía en modo demo). */
export function cupBlock(secs) {
  if (G.run.invincible) return '';
  if (G.run.kind === 'duel') return duelBlock(secs);
  const r = recordCup(secs),
    c = cupNow();
  if (r.improved) update().then(showRank);
  return (
    '<div class="mini cupline">{trophy} <b>Copa semanal:</b> ' +
    (r.improved
      ? '¡nuevo mejor tiempo de la semana, ' + fmt(r.best) + '!'
      : 'tu mejor de la semana es ' + fmt(c.best) + '.') +
    ' <span id="cupRank">' +
    rankText(c) +
    '</span></div>'
  );
}
const rankText = (c) =>
  c.rank
    ? 'Vas ' + place(c.rank) + (c.total ? ' de ' + c.total : '') + '.'
    : nick()
      ? ''
      : 'Ponte un apodo en la Copa para entrar a la tabla.';
/* cuando el servidor contesta, la línea de la pantalla de fin se actualiza con el puesto */
function showRank() {
  const el = $('cupRank');
  if (el) el.textContent = rankText(cupNow());
}

/* todo lo que se habla con el servidor al abrir el juego o al volver a él */
function online() {
  syncVisits();
  update();
}
export function bootCup(onChange) {
  refresh = onChange;
  $('cupBtn').addEventListener('click', () => open('cup'));
  $('cupBox').addEventListener('click', (e) => {
    const b = e.target.closest('[data-k]');
    if (!b) return;
    const k = b.dataset.k;
    if (k === 'close') closeCup();
    else if (k === 'newduel') {
      closeCup();
      playNewDuel();
    } else if (k === 'joinduel') joinDuel();
    else if (k === 'playduel') {
      const d = duelOf(b.dataset.code);
      closeCup();
      if (d) playDuel(d);
    } else if (k === 'shareduel') challenge(b, 0, 'duel', b.dataset.code);
    else if (k === 'tab') {
      tab = b.dataset.v;
      editing = false;
      render();
    } else if (k === 'share') challenge(b, 0);
    else if (k === 'play') {
      closeCup();
      playSurvival();
    } else if (k === 'edit') {
      editing = true;
      render();
      $('cupNick').focus();
    } else if (k === 'save') {
      if (!setNick($('cupNick').value)) {
        $('cupNickErr').textContent = 'El apodo debe tener de 2 a 14 letras o números.';
        return;
      }
      editing = false;
      render();
      update();
    }
  });
  /* la app puede quedar abierta de un día para otro: al volver se anota el día y se actualiza todo */
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    noteVisit();
    if (G.state === 'menu') refresh();
    online();
  });
  online();
}

/* ---------- retos entre amigos ---------- */
/* cómo va un reto, en una línea */
function duelStatus(d) {
  const r = d.rival;
  if (!d.mine) return r ? 'Por superar: ' + esc(r.nick) + ' con ' + fmt(r.time) : 'Aún sin tiempos';
  if (!r) return 'Tu tiempo: ' + fmt(d.mine) + ' · nadie más lo ha jugado';
  return d.rank === 1
    ? 'Vas ganando: ' + fmt(d.mine) + ' contra ' + fmt(r.time) + ' de ' + esc(r.nick)
    : (d.news ? '¡Te superó ' : 'Va ganando ') +
        esc(r.nick) +
        ' con ' +
        fmt(r.time) +
        (d.news ? '! Tú, ' : ' · tú ') +
        fmt(d.mine);
}
function renderDuels() {
  const name = nick(),
    list = duels(),
    online = !!apiUrl();
  let h =
    tabsBar() +
    '<div class="sub">Juega una pista, manda su código y que tus amigos intenten superarte en esa misma pista. No hace falta estar conectados a la vez.</div>';
  if (!name || editing) h += nickForm(name);
  h +=
    '<button class="btn surv" data-k="newduel"' +
    (name && online ? '' : ' disabled') +
    '>{swords} Crear un reto nuevo</button>' +
    '<div class="nick"><input id="duelCode" maxlength="7" autocomplete="off" autocapitalize="characters" placeholder="Código"><button class="btn" data-k="joinduel">Buscar</button></div><div class="sub" id="duelErr">' +
    (!online
      ? 'Los retos necesitan la tabla en línea, que aún no está conectada.'
      : !name
        ? 'Elige un apodo para crear o aceptar retos.'
        : '') +
    '</div>';
  h += list.length
    ? '<div class="duels">' +
      list
        .map(
          (d) =>
            '<div class="duel' +
            (d.news ? ' news' : '') +
            '"><div><b>' +
            d.code +
            '</b><small>de ' +
            esc(d.by) +
            ' · ' +
            d.n +
            (d.n === 1 ? ' jugador' : ' jugadores') +
            '</small><span>' +
            duelStatus(d) +
            '</span></div><button class="btn" data-k="playduel" data-code="' +
            d.code +
            '">Jugar</button><button class="btn alt" data-k="shareduel" data-code="' +
            d.code +
            '" aria-label="Compartir el reto">{share}</button></div>',
        )
        .join('') +
      '</div>'
    : '<div class="note">Aún no tienes retos. Crea uno, o escribe el código que te mandaron.</div>';
  if (name && !editing)
    h +=
      '<div class="sub">Juegas como <b>' +
      esc(name) +
      '</b> · <button class="link" data-k="edit">cambiar apodo</button></div>';
  h += '<button class="btn alt" data-k="close">Cerrar</button>';
  $('cupBox').innerHTML = T(h);
  for (const id of ['cupNick', 'duelCode']) {
    const input = $(id);
    /* dentro de las casillas las teclas son letras, no controles de la nave */
    if (input) input.addEventListener('keydown', (e) => e.stopPropagation());
  }
  seenDuelNews(); // ya lo vio: el punto rojo del lobby se quita al cerrar
}
/* buscar un reto por su código */
async function joinDuel() {
  const code = cleanCode($('duelCode').value),
    err = $('duelErr');
  if (!nick()) return (err.textContent = 'Primero elige un apodo.');
  if (code.length < 6) return (err.textContent = 'El código tiene 6 letras o números.');
  err.textContent = 'Buscando…';
  const d = await fetchDuel(code);
  if (!isOpen() || tab !== 'duel') return;
  if (d === 'missing') $('duelErr').textContent = 'Ese código no existe. Revísalo.';
  else if (!d) $('duelErr').textContent = 'Sin conexión: no se pudo buscar el reto.';
  else render(); // queda de primero en la lista, listo para jugar
}
/* al terminar la partida de un reto: lo crea (si era nuevo) o envía el tiempo, y cuenta cómo quedó */
function duelBlock(secs) {
  const rival = G.run.duel && G.run.duel.rival;
  Promise.resolve().then(() => settleDuel(secs));
  return (
    '<div class="mini cupline">{swords} <b>Reto:</b> <span id="duelMsg">' +
    (!G.run.duel
      ? 'creando tu reto…'
      : rival
        ? secs > rival.time
          ? '¡superaste a ' + esc(rival.nick) + ' (' + fmt(rival.time) + ')!'
          : 'te faltaron ' + fmt(Math.ceil(rival.time - secs)) + ' para alcanzar a ' + esc(rival.nick) + '.'
        : 'enviando tu tiempo…') +
    '</span><div id="duelBtns"></div></div>'
  );
}
async function settleDuel(secs) {
  const R = G.run,
    said = $('duelMsg') ? $('duelMsg').textContent : '';
  const d = R.duel ? await sendDuel(R.duel.code, secs) : await createDuel(R.seed, secs);
  const msg = $('duelMsg'),
    btns = $('duelBtns');
  if (R !== G.run || !msg || !btns) return; // el jugador ya se fue de esta pantalla
  if (!d || d === 'missing') {
    msg.textContent = R.duel
      ? 'tu tiempo no se pudo enviar (sin conexión).'
      : nick()
        ? 'no se pudo crear (sin conexión).'
        : 'para crear retos necesitas un apodo (en Copa).';
    btns.innerHTML = T('<button class="btn alt" data-a="duelretry">Reintentar</button>');
    btns.dataset.secs = secs;
    return;
  }
  const created = !R.duel;
  R.duel = { code: d.code, rival: d.rival };
  msg.innerHTML = created
    ? 'listo. Su código es <b class="code">' +
      d.code +
      '</b>: mándalo y que intenten superar tu ' +
      fmt(d.mine) +
      ' en esta misma pista.'
    : esc(said) +
      ' Vas ' +
      place(d.rank) +
      ' de ' +
      d.n +
      (d.rank === 1 ? '.' : d.rival ? ': ' + esc(d.rival.nick) + ' va primero con ' + fmt(d.rival.time) + '.' : '.');
  btns.innerHTML = T(
    '<button class="btn" data-a="duelshare">{share} ' +
      (created ? 'Enviar el reto' : 'Retar a alguien más') +
      '</button>',
  );
  renderCupButton();
}
/* los botones del reto en la pantalla de fin */
export function duelAction(action, button) {
  if (action === 'duelshare') challenge(button, 0, 'duel', G.run.duel && G.run.duel.code);
  else if (action === 'duelretry') {
    const secs = +$('duelBtns').dataset.secs || Math.floor(G.t);
    $('duelMsg').textContent = 'intentando de nuevo…';
    $('duelBtns').innerHTML = '';
    settleDuel(secs);
  }
}

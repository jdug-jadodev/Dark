/**
 * Las tablas contra otros jugadores: la copa semanal (el mejor tiempo de la semana en Supervivencia)
 * y los retos entre amigos (una pista con código). Aquí están el botón del lobby, la ventana con
 * la tabla, los retos y el apodo, y la línea que sale al terminar una partida. Las reglas están en
 * core/cup.js y core/duel.js.
 */
import { GAME } from '../core/brand.js';
import {
  LIVE,
  apiUrl,
  askTicket,
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
import { tr } from '../core/i18n.js';
import { G } from '../core/state.js';
import { esc, fmt } from '../core/util.js';
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
const place = (n) => tr('{n}.º', { n });
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
  $('cupBtn').querySelector('small').innerHTML = c.rank ? place(c.rank) : c.best ? fmt(c.best) : tr('nueva');
  $('cupBtn').classList.toggle('dot', !!c.passed || duelNews()); // lo pasaron en la copa o en un reto
  tellCup(c.rank || 0);
}

/* ---------- retar a los amigos ---------- */
/* el mensaje para el chat: el tiempo (el de la partida o el mejor) y el puesto */
function challengeText(secs, kind, code) {
  const duel = kind === 'duel' && duelOf(code);
  if (duel)
    return (
      tr(
        'Te reto en {game}: aguanté {time} en esta pista. Entra a Copa, pestaña Retos, y escribe el código {code}. ¿Me ganas?',
        { game: GAME, time: fmt(duel.mine), code: duel.code },
      ) + ' \u{1F680}'
    );
  const c = cupNow(),
    time = fmt(secs || c.best);
  return (
    (c.rank
      ? tr('Aguanté {time} en Supervivencia de {game} y voy {place} en la copa de esta semana. ¿Me ganas?', {
          game: GAME,
          time,
          place: place(c.rank),
        })
      : tr('Aguanté {time} en Supervivencia de {game}. ¿Me ganas?', { game: GAME, time })) + ' \u{1F680}'
  );
}
/* abre el menú de compartir del teléfono; el botón cuenta qué pasó */
export async function challenge(button, secs, kind, code) {
  const how = await Platform.share(challengeText(secs, kind, code));
  if (how === 'copied') button.innerHTML = T(tr('{check} Copiado: pégalo en tu chat'));
  else if (!how) button.innerHTML = T(tr('No se pudo compartir'));
}

/* ---------- ventana ---------- */
const TABS = [
  ['cup', tr('{trophy} Copa')],
  ['duel', tr('{swords} Retos')],
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
  '<div class="nick"><input id="cupNick" maxlength="14" autocomplete="off" placeholder="' +
  esc(tr('Tu apodo')) +
  '" value="' +
  esc(name) +
  '"><button class="btn" data-k="save">' +
  (name ? tr('Guardar') : tr('Entrar')) +
  '</button></div><div class="sub" id="cupNickErr">' +
  (name ? '' : tr('Elige un apodo para aparecer en la tabla (de 2 a 14 letras).')) +
  '</div>';
/* con qué apodo se juega, y el enlace para cambiarlo */
const playingAs = (name) =>
  '<div class="sub">' +
  tr('Juegas como <b>{name}</b>', { name: esc(name) }) +
  ' · <button class="link" data-k="edit">' +
  tr('cambiar apodo') +
  '</button></div>';

/* la tabla de la copa */
const VIEWS = {
  cup: {
    title: tr('{trophy} Copa semanal'),
    sub: (ends) => tr('Gana quien más aguante en Supervivencia. Termina en {ends} y empieza otra.', { ends }),
    state: cupNow,
    live: LIVE,
    ends: weekEnds,
    mine: tr('Tu mejor de la semana'),
    empty: tr('Nadie ha marcado tiempo esta semana. El primer puesto está libre.'),
    play: tr('{timer} Jugar Supervivencia'),
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
      '<div class="passed">' +
      tr('Te pasaron: ibas {a} y ahora vas {b}. ¡A recuperarlo!', { a: place(c.passed), b: place(c.rank) }) +
      '</div>';
  if (!name || editing) h += nickForm(name);
  /* lo mío */
  h +=
    '<div class="grid two"><div><b>' +
    (c.best ? fmt(c.best) : '—') +
    '</b><span>' +
    V.mine +
    '</span></div><div><b>' +
    (c.rank
      ? c.total
        ? tr('{place} <small>de {total}</small>', { place: place(c.rank), total: c.total })
        : place(c.rank)
      : '—') +
    '</b><span>' +
    tr('Tu puesto') +
    '</span></div></div>';
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
            (r.me ? ' ' + tr('(tú)') : '') +
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
          ' ' +
          tr('(tú)') +
          '</span><b>' +
          fmt(t.me.time) +
          '</b></div>'
        : '') +
      '</div>';
  } else if (t) h += '<div class="note">' + V.empty + '</div>';
  /* estado */
  if (!online)
    h +=
      '<div class="note">' +
      tr('La tabla en línea todavía no está conectada. Tu mejor tiempo queda guardado en este teléfono.') +
      '</div>';
  else if (V.live.offline)
    h +=
      '<div class="note">' +
      (c.best && !c.sent
        ? tr('Sin conexión. Tu tiempo se enviará cuando vuelva.')
        : tr('Sin conexión. La tabla se actualizará cuando vuelva.')) +
      '</div>';
  else if (!t) h += '<div class="note">' + tr('Cargando la tabla…') + '</div>';
  else if (c.best && !name)
    h += '<div class="note">' + tr('Tu tiempo entra a la tabla cuando elijas un apodo.') + '</div>';
  if (name && !editing) h += playingAs(name);
  h +=
    '<button class="btn ' +
    V.cls +
    '" data-k="play">' +
    V.play +
    '</button>' +
    (c.best ? '<button class="btn alt" data-k="share">' + tr('{share} Retar a mis amigos') + '</button>' : '') +
    '<button class="btn alt" data-k="close">' +
    tr('Cerrar') +
    '</button>';
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

/* ---------- al empezar una partida ---------- */
/* Si es una Supervivencia que cuenta para la copa, pide su tiquete (ver core/cup.js). No espera
   la respuesta: la partida arranca ya, y el tiquete queda en la partida cuando llegue. */
export function cupStart() {
  const run = G.run;
  if (run.mode !== 'endless' || run.invincible || run.kind === 'duel') return;
  askTicket().then((ticket) => {
    run.ticket = ticket;
  });
}

/* ---------- al terminar una partida de Supervivencia ---------- */
/* Anota el tiempo donde corresponde (la copa, o el reto si era uno) y devuelve la línea
   para la pantalla de fin (vacía en modo demo). */
export function cupBlock(secs) {
  if (G.run.invincible) return '';
  if (G.run.kind === 'duel') return duelBlock(secs);
  const r = recordCup(secs, G.run.ticket),
    c = cupNow();
  if (r.improved) update().then(showRank);
  return (
    '<div class="mini cupline">{trophy} <b>' +
    tr('Copa semanal:') +
    '</b> ' +
    (r.improved
      ? tr('¡nuevo mejor tiempo de la semana, {time}!', { time: fmt(r.best) })
      : r.missed
        ? tr('esta partida empezó sin conexión y no entró a la copa.')
        : tr('tu mejor de la semana es {time}.', { time: fmt(c.best) })) +
    ' <span id="cupRank">' +
    rankText(c) +
    '</span></div>'
  );
}
const rankText = (c) =>
  c.rank
    ? c.total
      ? tr('Vas {place} de {total}.', { place: place(c.rank), total: c.total })
      : tr('Vas {place}.', { place: place(c.rank) })
    : nick()
      ? ''
      : tr('Ponte un apodo en la Copa para entrar a la tabla.');
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
        $('cupNickErr').textContent = tr('El apodo debe tener de 2 a 14 letras o números.');
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
  if (!d.mine)
    return r ? tr('Por superar: {name} con {time}', { name: esc(r.nick), time: fmt(r.time) }) : tr('Aún sin tiempos');
  if (!r) return tr('Tu tiempo: {time} · nadie más lo ha jugado', { time: fmt(d.mine) });
  const data = { name: esc(r.nick), time: fmt(r.time), mine: fmt(d.mine) };
  return d.rank === 1
    ? tr('Vas ganando: {mine} contra {time} de {name}', data)
    : d.news
      ? tr('¡Te superó {name} con {time}! Tú, {mine}', data)
      : tr('Va ganando {name} con {time} · tú {mine}', data);
}
function renderDuels() {
  const name = nick(),
    list = duels(),
    online = !!apiUrl();
  let h =
    tabsBar() +
    '<div class="sub">' +
    tr(
      'Juega una pista, manda su código y que tus amigos intenten superarte en esa misma pista. No hace falta estar conectados a la vez.',
    ) +
    '</div>';
  if (!name || editing) h += nickForm(name);
  h +=
    '<button class="btn surv" data-k="newduel"' +
    (name && online ? '' : ' disabled') +
    '>' +
    tr('{swords} Crear un reto nuevo') +
    '</button>' +
    '<div class="nick"><input id="duelCode" maxlength="7" autocomplete="off" autocapitalize="characters" placeholder="' +
    esc(tr('Código')) +
    '"><button class="btn" data-k="joinduel">' +
    tr('Buscar') +
    '</button></div><div class="sub" id="duelErr">' +
    (!online
      ? tr('Los retos necesitan la tabla en línea, que aún no está conectada.')
      : !name
        ? tr('Elige un apodo para crear o aceptar retos.')
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
            '</b><small>' +
            (d.n === 1
              ? tr('de {name} · 1 jugador', { name: esc(d.by) })
              : tr('de {name} · {n} jugadores', { name: esc(d.by), n: d.n })) +
            '</small><span>' +
            duelStatus(d) +
            '</span></div><button class="btn" data-k="playduel" data-code="' +
            d.code +
            '">' +
            tr('Jugar') +
            '</button><button class="btn alt" data-k="shareduel" data-code="' +
            d.code +
            '" aria-label="' +
            esc(tr('Compartir el reto')) +
            '">{share}</button></div>',
        )
        .join('') +
      '</div>'
    : '<div class="note">' + tr('Aún no tienes retos. Crea uno, o escribe el código que te mandaron.') + '</div>';
  if (name && !editing) h += playingAs(name);
  h += '<button class="btn alt" data-k="close">' + tr('Cerrar') + '</button>';
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
  if (!nick()) return (err.textContent = tr('Primero elige un apodo.'));
  if (code.length < 6) return (err.textContent = tr('El código tiene 6 letras o números.'));
  err.textContent = tr('Buscando…');
  const d = await fetchDuel(code);
  if (!isOpen() || tab !== 'duel') return;
  if (d === 'missing') $('duelErr').textContent = tr('Ese código no existe. Revísalo.');
  else if (!d) $('duelErr').textContent = tr('Sin conexión: no se pudo buscar el reto.');
  else render(); // queda de primero en la lista, listo para jugar
}
/* al terminar la partida de un reto: lo crea (si era nuevo) o envía el tiempo, y cuenta cómo quedó */
function duelBlock(secs) {
  const rival = G.run.duel && G.run.duel.rival;
  Promise.resolve().then(() => settleDuel(secs));
  return (
    '<div class="mini cupline">{swords} <b>' +
    tr('Reto:') +
    '</b> <span id="duelMsg">' +
    (!G.run.duel
      ? tr('creando tu reto…')
      : rival
        ? secs > rival.time
          ? tr('¡superaste a {name} ({time})!', { name: esc(rival.nick), time: fmt(rival.time) })
          : tr('te faltaron {time} para alcanzar a {name}.', {
              name: esc(rival.nick),
              time: fmt(Math.ceil(rival.time - secs)),
            })
        : tr('enviando tu tiempo…')) +
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
      ? tr('tu tiempo no se pudo enviar (sin conexión).')
      : nick()
        ? tr('no se pudo crear (sin conexión).')
        : tr('para crear retos necesitas un apodo (en Copa).');
    btns.innerHTML = T('<button class="btn alt" data-a="duelretry">' + tr('Reintentar') + '</button>');
    btns.dataset.secs = secs;
    return;
  }
  const created = !R.duel;
  R.duel = { code: d.code, rival: d.rival };
  msg.innerHTML = created
    ? tr(
        'listo. Su código es <b class="code">{code}</b>: mándalo y que intenten superar tu {time} en esta misma pista.',
        { code: d.code, time: fmt(d.mine) },
      )
    : esc(said) +
      ' ' +
      (d.rank !== 1 && d.rival
        ? tr('Vas {place} de {total}: {name} va primero con {time}.', {
            place: place(d.rank),
            total: d.n,
            name: esc(d.rival.nick),
            time: fmt(d.rival.time),
          })
        : tr('Vas {place} de {total}.', { place: place(d.rank), total: d.n }));
  btns.innerHTML = T(
    '<button class="btn" data-a="duelshare">' +
      (created ? tr('{share} Enviar el reto') : tr('{share} Retar a alguien más')) +
      '</button>',
  );
  renderCupButton();
}
/* los botones del reto en la pantalla de fin */
export function duelAction(action, button) {
  if (action === 'duelshare') challenge(button, 0, 'duel', G.run.duel && G.run.duel.code);
  else if (action === 'duelretry') {
    const secs = +$('duelBtns').dataset.secs || Math.floor(G.t);
    $('duelMsg').textContent = tr('intentando de nuevo…');
    $('duelBtns').innerHTML = '';
    settleDuel(secs);
  }
}

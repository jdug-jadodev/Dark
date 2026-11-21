/**
 * Copa semanal: el botón del lobby, la ventana con la tabla y el apodo, y la línea que sale al
 * terminar una partida de Supervivencia. Las reglas están en core/cup.js.
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
import { G } from '../core/state.js';
import { fmt } from '../core/util.js';
import { noteVisit } from '../core/visits.js';
import { $ } from './dom.js';
import { startRun } from './flow.js';
import { T } from './icons.js';

let refresh = () => {}; // repinta el lobby (lo entrega main.js)
let editing = false;
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

/* ---------- botón del lobby ---------- */
export function renderCupButton() {
  const c = cupNow();
  $('cupBtn').querySelector('small').innerHTML = c.rank ? place(c.rank) : c.best ? fmt(c.best) : 'nueva';
  $('cupBtn').classList.toggle('dot', !!c.passed);
}

/* ---------- ventana ---------- */
function render() {
  const c = cupNow(),
    t = LIVE.table,
    online = !!apiUrl(),
    name = nick();
  let h =
    '<h2>{trophy} Copa semanal</h2><div class="sub">Gana quien más aguante en Supervivencia. Termina en ' +
    left(t ? t.ends : weekEnds()) +
    ' y empieza otra.</div>';
  if (c.passed && c.rank)
    h +=
      '<div class="passed">Te pasaron: ibas ' +
      place(c.passed) +
      ' y ahora vas ' +
      place(c.rank) +
      '. ¡A recuperarlo!</div>';
  /* apodo */
  if (!name || editing)
    h +=
      '<div class="nick"><input id="cupNick" maxlength="14" autocomplete="off" placeholder="Tu apodo" value="' +
      esc(name) +
      '"><button class="btn" data-k="save">' +
      (name ? 'Guardar' : 'Entrar') +
      '</button></div><div class="sub" id="cupNickErr">' +
      (name ? '' : 'Elige un apodo para aparecer en la tabla (de 2 a 14 letras).') +
      '</div>';
  /* lo mío */
  h +=
    '<div class="grid two"><div><b>' +
    (c.best ? fmt(c.best) : '—') +
    '</b><span>Tu mejor de la semana</span></div><div><b>' +
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
  } else if (t) h += '<div class="note">Nadie ha marcado tiempo esta semana. El primer puesto está libre.</div>';
  /* estado */
  if (!online)
    h +=
      '<div class="note">La tabla en línea todavía no está conectada. Tu mejor tiempo queda guardado en este teléfono.</div>';
  else if (LIVE.offline)
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
    '<button class="btn surv" data-k="play">{timer} Jugar Supervivencia</button><button class="btn alt" data-k="close">Cerrar</button>';
  $('cupBox').innerHTML = T(h);
  const input = $('cupNick');
  /* dentro del apodo las teclas son letras, no controles de la nave */
  if (input) input.addEventListener('keydown', (e) => e.stopPropagation());
}
const isOpen = () => $('cup').classList.contains('show');
async function update() {
  await syncCup();
  renderCupButton();
  if (isOpen() && !(editing && document.activeElement === $('cupNick'))) render();
}
function open() {
  editing = false;
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
/* anota el tiempo y devuelve la línea para la pantalla de fin (vacía en modo demo) */
export function cupBlock(secs) {
  if (G.run.invincible) return '';
  const r = recordCup(secs),
    c = cupNow();
  if (r.improved) update().then(showRank);
  return (
    '<div class="mini cupline">{trophy} <b>Copa semanal:</b> ' +
    (r.improved
      ? '¡nuevo mejor tiempo de la semana, ' + fmt(r.best) + '!'
      : 'tu mejor de la semana es ' + fmt(c.best) + '.') +
    ' <span id="cupRank">' +
    rankText() +
    '</span></div>'
  );
}
const rankText = () => {
  const c = cupNow();
  return c.rank
    ? 'Vas ' + place(c.rank) + (c.total ? ' de ' + c.total : '') + '.'
    : nick()
      ? ''
      : 'Ponte un apodo en la Copa para entrar a la tabla.';
};
/* cuando el servidor contesta, la línea de la pantalla de fin se actualiza con el puesto */
function showRank() {
  const el = $('cupRank');
  if (el) el.textContent = rankText();
}

/* todo lo que se habla con el servidor al abrir el juego o al volver a él */
function online() {
  syncVisits();
  update();
}
export function bootCup(onChange) {
  refresh = onChange;
  $('cupBtn').addEventListener('click', open);
  $('cupBox').addEventListener('click', (e) => {
    const b = e.target.closest('[data-k]');
    if (!b) return;
    const k = b.dataset.k;
    if (k === 'close') closeCup();
    else if (k === 'play') {
      closeCup();
      startRun('endless');
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

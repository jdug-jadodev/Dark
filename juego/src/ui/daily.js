/**
 * Pantallas de lo diario: el cofre con su calendario de 7 días, la ventana de misiones de hoy
 * y el bloque de misiones que sale al terminar una partida. Las reglas están en core/daily.js.
 */
import {
  BONUS_COINS,
  MISSION_COINS,
  WEEK,
  bonusDone,
  chestDoubled,
  chestReady,
  chestSlot,
  doubleChest,
  missions,
  openChest,
  recordRun,
  streakNow,
} from '../core/daily.js';
import { level } from '../core/difficulty.js';
import { emit } from '../core/events.js';
import { RARITY } from '../core/parts.js';
import { G } from '../core/state.js';
import { SPC, km } from '../game/space.js';
import { adTag, showAd } from './ads.js';
import { $, tok } from './dom.js';
import { T } from './icons.js';
import { onReminderChange, reminderOffer, setReminder } from './reminder.js';

let refresh = () => {}; // repinta el lobby (lo entrega main.js)
let opened = null; // lo que salió del cofre en esta sesión (para mostrar la pieza del día 7)

/* ---------- cofre diario ---------- */
function renderChest() {
  const ready = chestReady(),
    slot = chestSlot(),
    coins = WEEK[slot - 1],
    streak = streakNow();
  let h =
    '<div style="font-size:48px">{gift}</div><h2>Cofre diario</h2>' +
    '<div class="sub">{fire} Racha: ' +
    streak +
    (streak === 1 ? ' día' : ' días') +
    ' · si faltas un día, solo retrocede un paso</div>' +
    '<div class="week">' +
    WEEK.map((c, i) => {
      const n = i + 1,
        cls = n < slot || (!ready && n === slot) ? ' done' : n === slot ? ' now' : '';
      return (
        '<div class="wk' +
        cls +
        '"><small>Día ' +
        n +
        '</small><b>' +
        (n === 7 ? '{gift}' : '{coin}') +
        '</b><span>' +
        c +
        '</span></div>'
      );
    }).join('') +
    '</div><div class="sub">El día 7 trae además una pieza rara o épica para tu nave.</div>';
  if (ready) h += '<button class="btn" data-c="open">Abrir cofre del día ' + slot + ' · +' + coins + ' {coin}</button>';
  else {
    h += '<div class="gain">+' + coins + ' {coin}</div>';
    if (opened && opened.piece)
      h +=
        '<div class="rec">{gift} Pieza nueva: ' + opened.piece.name + ' (' + RARITY[opened.piece.rar].name + ')</div>';
    h += chestDoubled()
      ? '<div class="sub">{check} Duplicado</div>'
      : '<button class="btn ad" data-c="x2">{play} Duplicar' +
        (adTag() ? ' con anuncio' : '') +
        ' · +' +
        coins +
        ' {coin}</button>';
    const next = (slot % 7) + 1;
    h +=
      '<div class="sub">Vuelve mañana: día ' +
      next +
      ' · +' +
      WEEK[next - 1] +
      ' {coin}' +
      (next === 7 ? ' y una pieza' : '') +
      '</div>';
    /* el mejor momento para ofrecer el aviso: acaba de abrir el cofre y mañana hay otro */
    if (reminderOffer())
      h += '<button class="btn alt" data-c="remind">{bell} Avísame mañana cuando esté listo</button>';
  }
  h += '<button class="btn alt" data-c="close">Cerrar</button>';
  $('chestBox').innerHTML = T(h);
}
/* devuelve true si estaba abierto (para el botón "atrás" del sistema) */
export function closeChest() {
  if (!$('chest').classList.contains('show')) return false;
  $('chest').classList.remove('show');
  refresh();
  return true;
}

/* ---------- misiones del día ---------- */
function renderMissions() {
  $('misBox').innerHTML =
    '<h2>{clipboard} Misiones de hoy</h2><div class="sub">Cambian cada día: una por modo de juego.</div>' +
    missions()
      .map(
        (m) =>
          '<div class="mis' +
          (m.done ? ' done' : '') +
          '"><i>' +
          m.icon +
          '</i><div><b>' +
          m.text +
          '</b>' +
          '<div class="pbar"><i style="width:' +
          (m.have / m.need) * 100 +
          '%"></i></div></div>' +
          '<em>' +
          (m.done ? '{check}' : m.label) +
          '<small>+' +
          MISSION_COINS +
          ' {coin}</small></em></div>',
      )
      .join('') +
    '<div class="mis bonus' +
    (bonusDone() ? ' done' : '') +
    '"><i>{party}</i><div><b>Completa las tres</b></div>' +
    '<em>' +
    (bonusDone() ? '{check}' : '') +
    '<small>+' +
    BONUS_COINS +
    ' {coin}</small></em></div>' +
    '<button class="btn alt" data-m="close">Cerrar</button>';
  tok('misBox');
}
export function closeMissions() {
  if (!$('missions').classList.contains('show')) return false;
  $('missions').classList.remove('show');
  return true;
}

/* ---------- al terminar una partida ---------- */
/* Suma la partida a las misiones de hoy. En modo demo (no se puede morir) y contra el jefe no cuenta. */
export function countRun() {
  const R = G.run;
  if (R.invincible || R.mode === 'boss') return { done: [], bonus: false, skipped: R.invincible };
  const space = R.mode === 'space';
  return recordRun({
    mode: R.mode,
    coins: R.coins,
    dodged: R.dodged,
    pts: R.pts,
    kills: R.kills,
    weapons: R.wpnPicks,
    near: space ? SPC.near : R.near,
    level: level(),
    time: G.t,
    km: space ? km() : 0,
  });
}
/* el bloque que se muestra en la pantalla de fin: las tres misiones y lo que se acaba de ganar */
export function missionBlock(res) {
  return (
    '<div class="mini"><b>Misiones de hoy</b>' +
    missions()
      .map(
        (m) =>
          '<div class="mrow' +
          (m.done ? ' ok' : '') +
          '"><span>' +
          m.icon +
          ' ' +
          m.text +
          '</span><b>' +
          (m.done ? '{check}' : m.label) +
          '</b></div>',
      )
      .join('') +
    (res.done.length
      ? '<div class="rec">¡Misión completada! +' + res.done.length * MISSION_COINS + ' {coin}</div>'
      : '') +
    (res.bonus ? '<div class="rec">{party} ¡Las tres misiones! +' + BONUS_COINS + ' {coin}</div>' : '') +
    (res.skipped ? '<div>En modo demo las misiones no avanzan.</div>' : '') +
    '</div>'
  );
}

export function bootDaily(onChange) {
  refresh = onChange;
  $('chestBtn').addEventListener('click', () => {
    renderChest();
    $('chest').classList.add('show');
  });
  $('chestBox').addEventListener('click', (e) => {
    const b = e.target.closest('[data-c]');
    if (!b) return;
    const a = b.dataset.c;
    if (a === 'open') {
      opened = openChest();
      if (opened) emit('reward');
      renderChest();
    } else if (a === 'x2') {
      showAd('Recompensa: duplicar el cofre diario (+' + WEEK[chestSlot() - 1] + ' {coin})', () => {
        if (doubleChest()) emit('reward');
        renderChest();
      });
    } else if (a === 'remind') {
      setReminder(true);
      renderChest();
    } else if (a === 'close') closeChest();
  });
  onReminderChange(() => {
    if ($('chest').classList.contains('show')) renderChest();
  });
  $('misBtn').addEventListener('click', () => {
    renderMissions();
    $('missions').classList.add('show');
  });
  $('misBox').addEventListener('click', (e) => {
    if (e.target.closest('[data-m="close"]')) closeMissions();
  });
}

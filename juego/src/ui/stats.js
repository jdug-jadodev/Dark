/** Métricas del jugador: récords de cada modo, racha y piezas. Se abre con el botoncito {stats} del lobby. */
import { GOAL } from '../core/config.js';
import { missionsDone, streakNow } from '../core/daily.js';
import { owns } from '../core/garage.js';
import { PARTS } from '../core/parts.js';
import { S } from '../core/profile.js';
import { fmt } from '../core/util.js';
import { daysPlayed } from '../core/visits.js';
import { $, tok } from './dom.js';

const MEDAL = ['{medal1}', '{medal2}', '{medal3}', '4.', '5.'];
const top = (title, list, show) =>
  '<div class="top"><b>' +
  title +
  '</b>' +
  (list.length
    ? list.map((v, i) => '<div><span>' + MEDAL[i] + '</span><b>' + show(v) + '</b></div>').join('')
    : '<div><span>Aún sin partidas</span><b>—</b></div>') +
  '</div>';
function render() {
  const parts = Object.keys(PARTS),
    mine = parts.filter(owns).length,
    streak = streakNow();
  $('statsBox').innerHTML =
    '<div class="grid">' +
    '<div><b>' +
    (S.best || 0) +
    '</b><span>Aventura (de ' +
    GOAL +
    ')</span></div>' +
    '<div><b>' +
    (S.bossWins || 0) +
    '</b><span>Jefes vencidos</span></div>' +
    '<div><b>' +
    streak +
    '</b><span>Racha (' +
    (streak === 1 ? 'día' : 'días') +
    ')</span></div>' +
    '<div><b>' +
    missionsDone() +
    '/3</b><span>Misiones hoy</span></div></div>' +
    top('{timer} Supervivencia: mejores tiempos', S.topTimes || [], fmt) +
    top('{planet} Viaje espacial: mejores distancias', S.topSpace || [], (v) => v + ' km') +
    '<div class="top"><div><span>{puzzle} Piezas de la nave</span><b>' +
    mine +
    ' de ' +
    parts.length +
    '</b></div><div><span>{calendar} Días que has jugado</span><b>' +
    daysPlayed() +
    '</b></div></div>';
  tok('statsBox');
}
/* devuelve true si estaba abierta (para el botón "atrás" del sistema) */
export function closeStats() {
  if (!$('stats').classList.contains('show')) return false;
  $('stats').classList.remove('show');
  return true;
}
export function bootStats() {
  $('statsBtn').addEventListener('click', () => {
    render();
    $('stats').classList.add('show');
  });
  $('statsClose').addEventListener('click', closeStats);
}

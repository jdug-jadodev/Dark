/**
 * Los avisos del lobby (arriba a la izquierda): la meta del jugador y lo que hay hoy (monedas
 * dobles, oferta de la semana, temporada). También la línea de la meta al terminar una partida.
 */
import { owns } from '../core/garage.js';
import { goal, goalLeft, goalPct } from '../core/goal.js';
import { events } from '../core/season.js';
import { accountOffer, openAccount } from './account.js';
import { $ } from './dom.js';
import { openGarageAt } from './garage.js';
import { T } from './icons.js';

export const num = (n) => n.toLocaleString('es-CO');

export function renderNews() {
  const g = goal(),
    left = goalLeft();
  let h = g
    ? '<button class="lchip goal' +
      (left ? '' : ' ok') +
      '" data-part="' +
      g.id +
      '">{target}<span><b>' +
      g.name +
      '</b> ' +
      (left ? 'te faltan {coin} ' + num(left) : '¡ya te alcanza!') +
      '<i class="bar"><i style="width:' +
      goalPct() +
      '%"></i></i></span></button>'
    : ''; // sin meta no se pide nada: marcarla es opcional, desde el taller
  /* una sola vez, cuando ya hay algo que perder: la invitación a guardar el progreso */
  if (accountOffer())
    h += '<button class="lchip" data-acct="1">{cloud}<span><b>Guarda tu progreso</b> para no perderlo</span></button>';
  /* dos avisos como mucho, para no tapar la nave: primero lo que vale hoy */
  for (const e of events(owns).slice(0, 2))
    h += e.part
      ? '<button class="lchip" data-part="' + e.part + '">' + e.icon + '<span>' + e.text + '</span></button>'
      : '<div class="lchip">' + e.icon + '<span>' + e.text + '</span></div>';
  $('lNews').innerHTML = T(h);
}
/* al terminar una partida: cuánto falta para la meta (nada si no hay meta) */
export function goalBlock() {
  const g = goal();
  if (!g) return '';
  const left = goalLeft();
  return (
    '<div class="mini goalline">{target} <b>Tu meta: ' +
    g.name +
    '</b> · ' +
    (left ? 'te faltan {coin} ' + num(left) : '¡ya te alcanza! Búscala en el taller.') +
    '<div class="pbar"><i style="width:' +
    goalPct() +
    '%"></i></div></div>'
  );
}
export function bootNews() {
  $('lNews').addEventListener('click', (e) => {
    if (e.target.closest('[data-acct]')) return openAccount();
    const b = e.target.closest('[data-part]');
    if (b) openGarageAt(b.dataset.part);
  });
}

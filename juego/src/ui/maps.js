/**
 * Elegir el mapa de Supervivencia: uno concreto, o al azar. Se abre con el botón "Supervivencia"
 * del lobby. Cada mapa se muestra con una foto pequeña de cómo se ve (ui/mapThumbs.js).
 * La elección se recuerda (S.survMap): es la que usan "Jugar de nuevo" y la copa.
 */
import { tr } from '../core/i18n.js';
import { S, save } from '../core/profile.js';
import { WORLDS } from '../core/worlds.js';
import { $ } from './dom.js';
import { T } from './icons.js';
import { THUMBS } from './mapThumbs.js';
import { playSurvival } from './tracks.js';

const maps = () => WORLDS.filter((w) => w.ready);
function render() {
  const cur = S.survMap || 'azar',
    list = maps(),
    sel = (id) => (cur === id ? ' sel' : '');
  $('mapBox').innerHTML = T(
    '<h2>' +
      tr('{timer} Supervivencia') +
      '</h2><div class="sub">' +
      tr('Elige el mapa, o deja que te sorprenda. Las reglas son las mismas en todos.') +
      '</div>' +
      '<button class="mcard wide' +
      sel('azar') +
      '" data-map="azar"><span class="mosaic">' +
      list.map((w) => '<i class="th-' + w.id + '"></i>').join('') +
      '<u>?</u></span><span><b>' +
      tr('Al azar') +
      '</b><small>' +
      tr('No sabes cuál te va a tocar') +
      '</small></span></button>' +
      '<div class="mgrid">' +
      list
        .map(
          (w) =>
            '<button class="mcard' +
            sel(w.id) +
            '" data-map="' +
            w.id +
            '"><span class="shot th-' +
            w.id +
            '"></span><b>' +
            w.name +
            '</b></button>',
        )
        .join('') +
      '</div><button class="btn alt" data-map="">' +
      tr('Cerrar') +
      '</button>',
  );
}
export function openMaps() {
  render();
  $('maps').classList.add('show');
}
/* devuelve true si estaba abierto (para el botón "atrás" del sistema) */
export function closeMaps() {
  if (!$('maps').classList.contains('show')) return false;
  $('maps').classList.remove('show');
  return true;
}
export function bootMaps() {
  /* las fotos entran una sola vez, como estilos: así cada una se puede usar en varios sitios */
  const st = document.createElement('style');
  st.textContent = Object.keys(THUMBS)
    .map((id) => '.th-' + id + '{background-image:url(' + THUMBS[id] + ')}')
    .join('');
  document.head.appendChild(st);
  $('survBtn').addEventListener('click', openMaps);
  $('mapBox').addEventListener('click', (e) => {
    const b = e.target.closest('[data-map]');
    if (!b) return;
    const id = b.dataset.map;
    closeMaps();
    if (!id) return;
    S.survMap = id;
    save();
    playSurvival(id);
  });
}

/**
 * El idioma en la pantalla: traduce lo que ya viene escrito en index.html y arma el selector
 * de Configuración. Los textos que el juego escribe por código ya salen traducidos (tr()).
 *
 * Lo fijo de index.html se traduce al arrancar, antes de que nadie más toque la página: cada
 * trozo de texto entre etiquetas es una clave (sin los espacios de los lados), y también cada
 * aria-label. La prueba test/idiomas.mjs saca las claves de la misma manera.
 */
import { LANGS, lang, tr } from '../core/i18n.js';
import { S, save } from '../core/profile.js';
import { G } from '../core/state.js';
import { Platform } from '../platform/platform.js';
import { $ } from './dom.js';

function translatePage() {
  const walker = document.createTreeWalker($('app'), NodeFilter.SHOW_TEXT);
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const raw = node.nodeValue,
      key = raw.replace(/\s+/g, ' ').trim();
    if (!key || !/\p{L}/u.test(key)) continue;
    const out = tr(key);
    if (out !== key) node.nodeValue = raw.match(/^\s*/)[0] + out + raw.match(/\s*$/)[0];
  }
  document.querySelectorAll('#app [aria-label]').forEach((el) => {
    el.setAttribute('aria-label', tr(el.getAttribute('aria-label')));
  });
}

/* El selector: un botón por idioma, cada uno con su propio nombre (así se reconoce aunque el
   juego esté en un idioma que no se entiende). En plena partida no sale: cambiar de idioma
   vuelve a arrancar el juego y la partida se perdería. */
export function renderLang() {
  $('langRow').style.display = G.state === 'pause' ? 'none' : '';
  document.querySelectorAll('#lang .opt').forEach((b) => b.classList.toggle('sel', b.dataset.lang === lang()));
}

export function bootLang() {
  document.documentElement.lang = lang();
  Platform.lang(lang()); // la app lo necesita para escribir el aviso diario en el mismo idioma
  if (lang() !== 'es') translatePage();
  const row = $('lang');
  for (const l of LANGS) {
    const b = document.createElement('button');
    b.className = 'opt';
    b.dataset.lang = l.id;
    b.textContent = l.name;
    row.appendChild(b);
  }
  row.addEventListener('click', (e) => {
    const b = e.target.closest('[data-lang]');
    if (!b || b.dataset.lang === lang()) return;
    S.lang = b.dataset.lang;
    save();
    Platform.restart(); // el idioma se decide al cargar: ver core/i18n.js
  });
}

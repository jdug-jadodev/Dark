/**
 * Idiomas. El juego está escrito en español; cada texto que ve el jugador pasa por tr('…') y,
 * si el idioma elegido es otro, sale traducido. La clave de cada traducción es el mismo texto
 * en español, tal cual está en el código (ver los catálogos en core/lang/).
 *
 *   tr('Tienda')                               un texto fijo
 *   tr('Te faltan {n} monedas', { n: 30 })     con datos: {n} se reemplaza
 *   tr('Listo##botón')                         cuando la misma palabra se traduce distinto según
 *                                              dónde sale: lo que va después de ## no se muestra
 *   n === 1 ? tr('1 moneda') : tr('{n} monedas', { n })    plurales: una frase para cada caso
 *
 * Los {iconos} (como {coin}) van dentro del texto y se quedan igual en la traducción.
 * Los textos de tablas que no pueden importar nada (core/config.js) se marcan con un comentario
 * pegado antes, para que la prueba de idiomas los encuentre, y se traducen donde se muestran con tr(variable).
 *
 * El idioma se decide una sola vez, al cargar: por eso tr() sirve también en las tablas que se
 * arman al importar los módulos. Cambiarlo guarda la elección y vuelve a arrancar el juego.
 * Agregar un idioma = un catálogo nuevo en core/lang/ y un renglón en LANGS.
 * La prueba test/idiomas.mjs avisa si a algún catálogo le falta un texto.
 */
import { savedState } from '../platform/platform.js';
import en from './lang/en.js';
import pt from './lang/pt.js';

/* Los idiomas que hay, como se muestran en Configuración (cada uno con su propio nombre) */
export const LANGS = [
  { id: 'es', name: 'Español' },
  { id: 'en', name: 'English' },
  { id: 'pt', name: 'Português' },
];
const BOOKS = { en, pt };
const known = (id) => LANGS.some((l) => l.id === id);

/* El idioma: el que eligió el jugador; si nunca eligió, el del teléfono; y si el del teléfono
   no está entre los que hay, inglés. Fuera del navegador (herramientas y pruebas), español. */
function pick() {
  if (typeof window === 'undefined') return 'es';
  const saved = savedState();
  if (saved && known(saved.lang)) return saved.lang;
  try {
    const list = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ''];
    for (const l of list) {
      const id = String(l).slice(0, 2).toLowerCase();
      if (known(id)) return id;
    }
  } catch (e) {}
  return 'en';
}
const LANG = pick();
const book = BOOKS[LANG] || null;

/** El idioma en uso: 'es', 'en', 'pt'… */
export const lang = () => LANG;

/** El texto en el idioma en uso. Si falta la traducción sale en español (nunca vacío). */
export function tr(text, vars) {
  let s = book && typeof book[text] === 'string' && book[text] ? book[text] : text;
  const cut = s.indexOf('##');
  if (cut >= 0) s = s.slice(0, cut);
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  return s;
}

/** Los números con el separador de miles del idioma: 12.500 en español, 12,500 en inglés. */
const NUMBERS = { es: 'es-CO', en: 'en-US', pt: 'pt-BR' };
export const locale = () => NUMBERS[LANG] || 'en-US';

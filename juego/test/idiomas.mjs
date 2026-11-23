/**
 * Vigila las traducciones: cada texto que el juego muestra (los tr('…') del código, los textos
 * marcados con el comentario tr y lo escrito en index.html) debe estar en todos los catálogos de
 * src/core/lang/, con los mismos {datos}, {iconos} y etiquetas que el original.
 *
 *   node test/idiomas.mjs               revisa y falla si falta o sobra algo
 *   node test/idiomas.mjs --claves      escribe todas las claves (JSON)
 *   node test/idiomas.mjs --faltan en   escribe las claves que le faltan a un idioma (JSON)
 *   node test/idiomas.mjs --de ui/cup.js,game/   revisa solo los textos de esos archivos o carpetas
 *
 * Las claves de index.html salen igual que en el juego (ui/lang.js): cada trozo de texto entre
 * etiquetas, sin espacios a los lados, y cada aria-label.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, '../src');
const args = process.argv.slice(2);

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.js')) files.push(p);
  }
})(src);
const rel = (p) => path.relative(src, p).split(path.sep).join('/');
/* fuera: los catálogos mismos, el propio módulo de idiomas y el laboratorio de sonidos (no es parte del juego) */
const skip = (r) => r.startsWith('core/lang/') || r === 'core/i18n.js' || r === 'audio/probador.js';

const keys = new Map(); // clave → dónde sale (el primero)
const problems = [];
const add = (key, where) => {
  if (!keys.has(key)) keys.set(key, where);
};
const LIT = `'(?:[^'\\\\\\n]|\\\\.)*'|"(?:[^"\\\\\\n]|\\\\.)*"|\`(?:[^\`\\\\]|\\\\.)*\``;
const value = (lit) => new Function('return ' + lit)(); // el texto que representa el literal

for (const f of files) {
  const r = rel(f);
  if (skip(r)) continue;
  const text = fs.readFileSync(f, 'utf8');
  const line = (i) => text.slice(0, i).split('\n').length;
  /* tr('…') y tr('…', datos) */
  for (const m of text.matchAll(new RegExp(`(?<![\\w$.])tr\\(\\s*(${LIT})?\\s*([^\\s]?)`, 'g'))) {
    const where = `${r}:${line(m.index)}`;
    if (!m[1]) continue; // tr(variable): el texto viene de una tabla marcada
    if (m[1][0] === '`' && m[1].includes('${')) {
      problems.push(`${where} · tr() con \${…} adentro: usa {datos} → tr('… {n} …', { n })`);
      continue;
    }
    if (m[2] !== ',' && m[2] !== ')') {
      problems.push(`${where} · tr() con un texto armado a pedazos: debe ser un solo texto entre comillas`);
      continue;
    }
    add(value(m[1]), where);
  }
  /* textos de tablas, marcados con el comentario */
  for (const m of text.matchAll(new RegExp(`/\\*tr\\*/\\s*(${LIT})`, 'g'))) add(value(m[1]), `${r}:${line(m.index)}`);
}

/* index.html: con los {iconos} ya dibujados, como lo deja build.mjs */
{
  const { T } = await import(pathToFileURL(path.join(src, 'ui/icons.js')).href);
  /* el nombre del juego (__GAME__) no se traduce */
  const html = T(fs.readFileSync(path.join(here, '../index.html'), 'utf8')).replaceAll('__GAME__', '');
  const body = html
    .slice(html.indexOf('<body'))
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<(script|style|svg)\b[\s\S]*?<\/\1>/g, '<i></i>');
  for (const piece of body.split(/<[^>]+>/)) {
    const key = piece.replace(/\s+/g, ' ').trim();
    if (/\p{L}/u.test(key)) add(key, 'index.html');
  }
  for (const m of body.matchAll(/aria-label="([^"]+)"/g)) add(m[1], 'index.html (aria-label)');
}

/* --de: quedarse solo con los textos de unos archivos (para revisar una parte del trabajo) */
const only = args.includes('--de') ? args[args.indexOf('--de') + 1].split(',') : null;
if (only) {
  for (const [key, where] of [...keys]) if (!only.some((o) => where.startsWith(o))) keys.delete(key);
  for (let i = problems.length - 1; i >= 0; i--) if (!only.some((o) => problems[i].startsWith(o))) problems.splice(i, 1);
}
const MAX = only ? 1e9 : 15; // cuántos faltantes se listan por idioma
if (args.includes('--claves')) {
  console.log(JSON.stringify([...keys.keys()], null, 1));
  process.exit(0);
}

const { LANGS } = await import(pathToFileURL(path.join(src, 'core/i18n.js')).href);
const marks = (s) => (s.match(/\{\w+\}/g) || []).sort().join(' ');
const tags = (s) => (s.match(/<\/?[a-z][^>]*>/g) || []).sort().join(' ');
const shown = (key) => (key.includes('##') ? key.slice(0, key.indexOf('##')) : key);

if (args.includes('--faltan')) {
  const id = args[args.indexOf('--faltan') + 1];
  const book = (await import(pathToFileURL(path.join(src, `core/lang/${id}.js`)).href)).default;
  console.log(JSON.stringify([...keys.keys()].filter((k) => !book[k]), null, 1));
  process.exit(0);
}

console.log(`${keys.size} textos en el juego`);
for (const { id, name } of LANGS) {
  if (id === 'es') continue;
  const book = (await import(pathToFileURL(path.join(src, `core/lang/${id}.js`)).href)).default;
  let missing = 0,
    wrong = 0;
  for (const [key, where] of keys) {
    const tx = book[key];
    if (typeof tx !== 'string' || !tx) {
      missing++;
      if (missing <= MAX) problems.push(`${id} · falta: ${JSON.stringify(key)}  (${where})`);
      continue;
    }
    const base = shown(key);
    if (tx.includes('##')) problems.push(`${id} · la traducción no lleva ##: ${JSON.stringify(key)}`), wrong++;
    else if (marks(tx) !== marks(base))
      problems.push(`${id} · {datos} o {iconos} distintos: ${JSON.stringify(key)} → ${JSON.stringify(tx)}`), wrong++;
    else if (tags(tx) !== tags(base))
      problems.push(`${id} · etiquetas distintas: ${JSON.stringify(key)} → ${JSON.stringify(tx)}`), wrong++;
  }
  if (missing > MAX) problems.push(`${id} · …y ${missing - MAX} más sin traducir`);
  const extra = only ? [] : Object.keys(book).filter((k) => !keys.has(k));
  console.log(
    `${missing || wrong ? '✗' : '✓'} ${name} (${id}): ${keys.size - missing} de ${keys.size}` +
      (extra.length ? ` · ${extra.length} que ya no se usan` : ''),
  );
  if (extra.length && args.includes('--sobran')) for (const k of extra) console.log('   sobra: ' + JSON.stringify(k));
}
if (problems.length) {
  console.log('');
  for (const p of problems) console.log(p);
  process.exitCode = 1;
}

/**
 * Vigila las dependencias entre capas del juego y muestra cómo están hoy.
 *
 *   core/      reglas y datos puros          platform/  puente con el teléfono o el navegador
 *   game/      lógica de las partidas        render/    todo lo que es Three.js
 *   ui/        HTML: menús, marcador, entrada   audio/     efectos de sonido y música
 *
 * Las reglas de REGLAS son las que ya se cumplen y no deben romperse. La tabla que se
 * imprime sirve para ver qué falta desenredar en los siguientes pasos del refactor.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src');
const norm = (p) => path.relative(src, p).split(path.sep).join('/');
const layerOf = (rel) => (rel.includes('/') ? rel.split('/')[0] : 'raíz');

const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.js')) files.push(p);
  }
})(src);

const deps = {}; // archivo → [archivos que importa]
for (const f of files) {
  const text = fs.readFileSync(f, 'utf8');
  deps[norm(f)] = [...text.matchAll(/from '(\.[^']+)'/g)].map((m) => norm(path.join(path.dirname(f), m[1])));
}

/* ---------- reglas que no se pueden romper ---------- */
const REGLAS = [
  ['core/util.js no depende de nada', () => deps['core/util.js'].length === 0],
  ['core/config.js no depende de nada', () => deps['core/config.js'].length === 0],
  ['core/state.js no depende de nada', () => deps['core/state.js'].length === 0],
  [
    'platform/ no depende del juego',
    () =>
      Object.keys(deps)
        .filter((f) => f.startsWith('platform/'))
        .every((f) => deps[f].length === 0),
  ],
  [
    'Three.js solo se usa en render/ (y en game/space.js, pendiente)',
    () => {
      const allowed = (f) => f.startsWith('render/') || f === 'game/space.js';
      return Object.keys(deps).every(
        (f) => allowed(f) || !/\bTHREE\./.test(fs.readFileSync(path.join(src, f), 'utf8')),
      );
    },
  ],
  [
    'audio/ solo depende de core/ (se entera de la partida por core/events.js)',
    () =>
      Object.keys(deps)
        .filter((f) => f.startsWith('audio/'))
        .every((f) => deps[f].every((d) => d.startsWith('core/') || d.startsWith('audio/'))),
  ],
  [
    'game/ y render/ no llaman al sonido: solo avisan con emit()',
    () =>
      Object.keys(deps)
        .filter((f) => f.startsWith('game/') || f.startsWith('render/'))
        .every((f) => deps[f].every((d) => !d.startsWith('audio/'))),
  ],
];

const layers = ['core', 'platform', 'game', 'render', 'ui', 'audio', 'raíz'];
const matrix = Object.fromEntries(layers.map((a) => [a, Object.fromEntries(layers.map((b) => [b, 0]))]));
for (const [f, list] of Object.entries(deps)) for (const d of list) matrix[layerOf(f)][layerOf(d)]++;

console.log(`${files.length} módulos · cuántas importaciones hace cada capa (fila) hacia cada capa (columna):\n`);
console.log('          ' + layers.map((l) => l.padStart(9)).join(''));
for (const a of layers) console.log(a.padEnd(10) + layers.map((b) => String(matrix[a][b] || '·').padStart(9)).join(''));

let bad = 0;
console.log('');
for (const [name, ok] of REGLAS) {
  const pass = ok();
  if (!pass) bad++;
  console.log(`${pass ? '✓' : '✗'} ${name}`);
}
if (bad) process.exitCode = 1;

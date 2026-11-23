/**
 * Lista de precios de las piezas, para el servidor.
 *
 * El servidor lleva la cuenta de cuánto vale lo que tiene cada cuenta (monedas + piezas) para
 * notar un progreso retocado a mano (ver back-nave/src/tope.js). Para eso necesita saber cuánto
 * cuesta cada pieza, y los precios viven aquí, en el juego. Este programa se los copia:
 *
 *   node tools/precios.mjs           escribe ../../back-nave/src/precios.js
 *   node tools/precios.mjs --check   solo revisa que esa copia esté al día (lo corre `npm test`)
 *
 * Hay que correrlo cada vez que se agregan piezas o cambian los precios, y publicar el servidor.
 * Si el servidor no conoce una pieza, la cuenta como gratis: nunca perjudica al jugador.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PARTS, priceOf } from '../src/core/parts.js';

const here = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(here, '../../../back-nave/src/precios.js');

/* agrupadas por precio (así la lista pesa poco); las gratis no hacen falta */
const by = {};
for (const part of Object.values(PARTS)) {
  const price = priceOf(part);
  if (price > 0) (by[price] = by[price] || []).push(part.id);
}
const lines = Object.keys(by)
  .map(Number)
  .sort((a, b) => a - b)
  .map((price) => `  ${price}: ${JSON.stringify(by[price].sort())},`);
const text =
  '/* Precios de las piezas del juego, agrupadas por precio. Lo genera juego-nave/juego/tools/precios.mjs:\n' +
  '   no editar a mano. Lo usa tope.js para calcular cuánto vale lo que tiene una cuenta. */\n' +
  'export default {\n' +
  lines.join('\n') +
  '\n};\n';

if (!fs.existsSync(path.dirname(OUT))) {
  console.log('No está la carpeta del servidor (back-nave): no se revisa la lista de precios.');
  process.exit(0);
}
const now = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8').replace(/\r\n/g, '\n') : '';
if (process.argv.includes('--check')) {
  if (now !== text) {
    console.error(
      '✗ La lista de precios del servidor está atrasada. Corre: node tools/precios.mjs (y publica el servidor).',
    );
    process.exit(1);
  }
  console.log(`✓ La lista de precios del servidor está al día (${Object.values(by).flat().length} piezas).`);
} else {
  fs.writeFileSync(OUT, text);
  console.log(`${OUT} · ${Object.values(by).flat().length} piezas con precio`);
}

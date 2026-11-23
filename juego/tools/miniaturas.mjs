/**
 * Toma la foto pequeña de cada mapa (la que se ve al elegir mapa en Supervivencia) y las guarda
 * en src/ui/mapThumbs.js. Juega unos segundos de Supervivencia en modo demo en cada mapa, oculta
 * los marcadores y recorta el horizonte y el comienzo de la pista.
 *
 *   node build.mjs && node tools/miniaturas.mjs && node build.mjs
 *
 * Hay que volver a correrlo cuando cambie cómo se ve un mundo o se agregue uno.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { findChrome } from '../test/navegador.mjs';

const here = path.dirname(fileURLToPath(import.meta.url)),
  game = pathToFileURL(path.join(here, '..', '..', 'demo-juego.html')).href,
  out = path.join(here, '..', 'src', 'ui', 'mapThumbs.js'),
  W = 256,
  H = 160;
const b = await chromium.launch({
  executablePath: findChrome(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const open = async () => {
  const ctx = await b.newContext({ viewport: { width: 390, height: 780 }, locale: 'es-CO' });
  await ctx.addInitScript(() => localStorage.setItem('giro_api', 'off')); // sin tocar el servidor
  const p = await ctx.newPage();
  await p.goto(game);
  await p.waitForTimeout(1300);
  return { ctx, p };
};
const first = await open();
const ids = await first.p.evaluate(() => window.__giroMapIds());
await first.ctx.close();
const thumbs = {};
for (const id of ids) {
  const { ctx, p } = await open();
  await p.click('#inv'); // modo demo: no muere mientras se toma la foto
  await p.evaluate((w) => window.__giroMap(w), id);
  await p.waitForTimeout(11000);
  await p.addStyleTag({ content: '#hud,#nitroBtn,#toast,#hint,#banner,#fx{visibility:hidden!important}' });
  await p.waitForTimeout(400);
  const png = (await p.screenshot({ clip: { x: 0, y: 105, width: 390, height: 244 } })).toString('base64');
  thumbs[id] = await p.evaluate(
    async ([src, w, h]) => {
      const img = new Image();
      img.src = 'data:image/png;base64,' + src;
      await img.decode();
      const c = document.createElement('canvas');
      c.width = w;
      c.height = h;
      c.getContext('2d').drawImage(img, 0, 0, w, h);
      return c.toDataURL('image/jpeg', 0.74);
    },
    [png, W, H],
  );
  console.log(id, Math.round(thumbs[id].length / 1024) + ' KB');
  await ctx.close();
}
await b.close();
fs.writeFileSync(
  out,
  '/** Fotos pequeñas de cada mapa. Archivo generado: node tools/miniaturas.mjs */\n/* prettier-ignore */\nexport const THUMBS = {\n' +
    ids.map((id) => '  ' + id + ": '" + thumbs[id] + "',\n").join('') +
    '};\n',
);
console.log('guardado en', path.relative(process.cwd(), out));

/**
 * La pantalla del estudio (IANEJ) al abrir el juego: que sale, que se quita sola y que nunca se
 * queda tapando el juego. Corre sobre la página de verdad (demo-juego.html), con su política de
 * contenido puesta.
 *
 *   node test/inicio.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { findChrome } from './navegador.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.join(here, '../../demo-juego.html');
const THREE = fs.readFileSync(path.join(here, '../../app/android/src/main/assets/game/three.min.js'));

let failed = 0;
function check(ok, what, detail) {
  if (!ok) failed++;
  console.log((ok ? '✓ ' : '✗ ') + what + (!ok && detail ? ' → ' + detail : ''));
}

const browser = await chromium.launch({
  executablePath: findChrome(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

/* abre el juego sin servidor; three = false simula que el motor 3D no cargó */
async function open({ three = true, calm = false, look = 0 } = {}) {
  const ctx = await browser.newContext({
    viewport: { width: 390, height: 780 },
    locale: 'es-CO',
    reducedMotion: calm ? 'reduce' : 'no-preference',
  });
  await ctx.addInitScript(() => {
    localStorage.setItem('giro_api', 'off');
    window.__csp = [];
    document.addEventListener('securitypolicyviolation', (e) =>
      window.__csp.push(e.violatedDirective + ' ' + e.blockedURI),
    );
  });
  await ctx.route(/three(\.min)?\.js/, (r) =>
    three
      ? r.fulfill({
          contentType: 'application/javascript',
          headers: { 'access-control-allow-origin': '*' },
          body: THREE,
        })
      : r.abort(),
  );
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  if (look) await page.addInitScript(watch, look);
  await page.goto(pathToFileURL(HTML).href);
  return { ctx, page, errors };
}
/* Dentro de la página: anota lo que le pasa a la pantalla del estudio. En el momento en que
   empieza, adelanta la animación a un instante dado y mira cuántas letras hay dibujadas; luego la
   devuelve al principio. Se hace así, y no esperando, porque en estas pruebas los gráficos van por
   programa y la página se queda quieta varios segundos justo en ese rato. */
function watch(at) {
  window.__studio = { started: false, gone: false };
  const seen = () => {
    const el = document.getElementById('studio'),
      st = window.__studio;
    if (!el) {
      if (st.found) st.gone = true;
      return;
    }
    st.found = true;
    if (st.started || !el.classList.contains('run')) return;
    st.started = true;
    const box = el.getBoundingClientRect(),
      anims = el.getAnimations({ subtree: true });
    st.covers = box.width >= innerWidth && box.height >= innerHeight;
    st.black = getComputedStyle(el).backgroundColor === 'rgb(0, 0, 0)';
    st.names = [...new Set(anims.map((a) => a.animationName))].sort().join(' ');
    for (const a of anims) {
      a.pause();
      a.currentTime = at;
    }
    const paths = [...el.querySelectorAll('path')].map((p) => getComputedStyle(p));
    st.letters = paths.length;
    st.drawn = paths.filter((c) => parseFloat(c.strokeDashoffset) < 0.05 && parseFloat(c.opacity) > 0.95).length;
    st.visible = parseFloat(getComputedStyle(el).opacity) > 0.95;
    for (const a of anims) {
      a.currentTime = 0;
      a.play();
    }
  };
  new MutationObserver(seen).observe(document, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ['class'],
  });
}
const state = (page) => page.evaluate(() => window.__studio);
const gone = (page, ms) =>
  page.waitForFunction(() => window.__studio.gone, null, { timeout: ms, polling: 200 }).catch(() => {});
const ready = (page) =>
  page.waitForFunction(
    () => document.getElementById('mCoins') && document.getElementById('mCoins').textContent.trim(),
    null,
    {
      timeout: 30000,
      polling: 200,
    },
  );

/* ---------- 1. al abrir: sale, se dibuja y se va ---------- */
{
  const { ctx, page, errors } = await open({ look: 1500 });
  await ready(page);
  await gone(page, 20000);
  const st = await state(page);
  check(st.started, 'al abrir: la pantalla del estudio empieza', JSON.stringify(st));
  check(st.covers && st.black, 'cubre toda la pantalla, en negro', JSON.stringify(st));
  check(st.letters === 5, 'trae las cinco letras', String(st.letters));
  check(
    /studioDraw/.test(st.names) && /studioOut/.test(st.names),
    'las letras se dibujan y al final se desvanece',
    st.names,
  );
  check(
    st.drawn === 5 && st.visible,
    'a los 1,5 s las cinco letras ya están dibujadas y a la vista',
    JSON.stringify(st),
  );
  check(st.gone, 'se quita sola');
  /* y el menú queda a mano */
  await page.click('#menu [data-open="settings"]', { timeout: 5000 }).catch(() => {});
  check(
    await page.evaluate(() => !!document.querySelector('.screen.show #lang')),
    'después se puede tocar el menú (abre Configuración)',
  );
  const blocked = await page.evaluate(() => window.__csp);
  check(!blocked.length, 'la política de contenido no bloquea nada', blocked.join(' | '));
  check(!errors.length, 'sin errores en la página', errors.join(' | '));

  /* ---------- 2. si el juego se reinicia solo (cambio de idioma), no se repite ---------- */
  await page.reload();
  await ready(page);
  await page.waitForTimeout(500);
  const again = await state(page);
  check(
    !again.started && !(await page.evaluate(() => !!document.getElementById('studio'))),
    'al reiniciarse el juego: no vuelve a salir',
    JSON.stringify(again),
  );
  await ctx.close();
}

/* ---------- 3. con «menos movimiento» en el teléfono: aparece sin dibujarse y se va ---------- */
{
  const { ctx, page } = await open({ calm: true, look: 900 });
  await ready(page);
  await gone(page, 20000);
  const st = await state(page);
  check(
    st.started && st.drawn === 5 && !/studioDraw/.test(st.names),
    'menos movimiento: el nombre aparece completo, sin dibujarse',
    JSON.stringify(st),
  );
  check(st.gone, 'menos movimiento: también se quita sola');
  await ctx.close();
}

/* ---------- 4. si el juego no logra arrancar, no se queda en negro ----------
   Sin el motor 3D el código del juego se detiene antes de empezar: la pantalla del estudio no
   recibe ninguna orden. La saca la hoja de estilos sola, a los 10 s. Aquí no se esperan: se
   adelanta esa animación hasta el final y se mira que el negro ya no tape. */
{
  const { ctx, page } = await open({ three: false });
  await page.waitForTimeout(800);
  const r = await page.evaluate(() => {
    const el = document.getElementById('studio');
    if (!el) return { there: false };
    const anims = el.getAnimations(),
      names = anims.map((a) => a.animationName).join(' '),
      wait = anims.map((a) => a.effect.getTiming().delay).join(' ');
    const before = getComputedStyle(el).visibility;
    anims.forEach((a) => a.finish());
    return { there: true, names, wait, before, after: getComputedStyle(el).visibility };
  });
  check(
    r.there && r.before === 'visible' && r.names === 'studioGiveUp' && r.wait === '10000',
    'sin arrancar: el negro tiene puesta su salida a los 10 s',
    JSON.stringify(r),
  );
  check(r.after === 'hidden', 'sin arrancar: pasado ese tiempo deja de tapar la pantalla', JSON.stringify(r));
  await ctx.close();
}

await browser.close();
console.log(failed ? `\n${failed} cosa(s) fallaron.` : '\nLa pantalla del estudio sale y se quita como debe.');
process.exit(failed ? 1 : 0);

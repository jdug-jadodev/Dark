/**
 * Los anuncios, del lado del juego.
 *
 * En la app los pone Android (AdMob). Aquí se prueba lo que hace el juego con cada respuesta,
 * con un Android de mentira que contesta lo que se le pida:
 *
 *   1. En el navegador (sin Android) siguen los anuncios de mentira: la franja y la cuenta de 3 s.
 *   2. En la app: la franja de mentira no se ve y se le pide la de verdad a Android.
 *   3. Video cerrado antes → no hay premio, se dice por qué y se vuelve a donde se estaba.
 *   4. No hay anuncio → lo mismo, con su mensaje.
 *   5. Video visto entero → se entrega el premio (revivir).
 *   6. Quien compró "Sin anuncios": recibe el premio directo, sin franja y sin pedir video.
 *
 *   node test/anuncios.mjs
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

/* abre el juego; con native, como dentro de la app de pruebas, con un Android de mentira */
async function open({ profile, native }) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, locale: 'es-CO' });
  await ctx.route(/three(\.min)?\.js/, (r) =>
    r.fulfill({ contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' }, body: THREE }),
  );
  await ctx.addInitScript(
    ({ profile, native }) => {
      localStorage.setItem('giro_api', 'off'); // nada sale al servidor de verdad
      sessionStorage.setItem('giro_studio', '1'); // sin la pantalla del estudio
      if (!native) return localStorage.setItem('giro_estelar_demo', JSON.stringify(profile));
      let saved = JSON.stringify(profile);
      window.__ads = { next: 'earned', asked: 0, banner: [] };
      window.GiroNative = {
        loadState: () => saved,
        saveState: (j) => (saved = j),
        haptic: () => {},
        heat: () => 0,
        isDebug: () => true,
        testApi: () => '',
        setReminder: () => {},
        reminderOn: () => false,
        noteStreak: () => {},
        noteCup: () => {},
        setLang: () => {},
        share: () => {},
        googleReady: () => false,
        googleSignIn: () => {},
        secretGet: () => '',
        secretSet: () => {},
        storeReady: () => false,
        storeProducts: () => {},
        storeBuy: () => {},
        storePending: () => {},
        adsReady: () => true,
        adShow: () => {
          window.__ads.asked++;
          const result = window.__ads.next;
          setTimeout(() => window.__giroAd && window.__giroAd(result), 300); // Android contesta después
        },
        adBanner: (on) => window.__ads.banner.push(on),
        adsPrivacy: () => false,
        adsPrivacyOpen: () => {},
        openPolicy: (lang) => (window.__ads.policy = lang),
      };
    },
    { profile, native },
  );
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(pathToFileURL(HTML).href);
  await page.waitForFunction(() => window.__giroMap && document.getElementById('mCoins').textContent.trim(), null, {
    timeout: 30000,
    polling: 200,
  });
  return { ctx, page, errors };
}
/* empieza una Supervivencia y se estrella: queda en la ventana de "revivir o rendirse" */
async function crash(page) {
  await page.evaluate(() => window.__giroMap('espacio'));
  await page.waitForFunction(() => window.__giroState().state === 'play' && window.__giroState().t > 1, null, {
    timeout: 120000,
    polling: 200,
  });
  await page.evaluate(() => window.__giroHit(999));
  await page.waitForSelector('#reviveBtn', { state: 'visible', timeout: 15000 });
}
const shown = (page, id) => page.evaluate((id) => document.getElementById(id).classList.contains('show'), id);
const visible = (page, id) =>
  page.evaluate((id) => getComputedStyle(document.getElementById(id)).display !== 'none', id);
const text = (page, id) => page.evaluate((id) => document.getElementById(id).textContent.trim(), id);
const state = (page) => page.evaluate(() => window.__giroState().state);

/* ---------- 1. en el navegador: los de mentira ---------- */
{
  const { ctx, page, errors } = await open({ profile: { nick: 'Ana', runs: 3 }, native: false });
  check(await visible(page, 'banner'), 'navegador: se ve la franja de mentira');
  await crash(page);
  await page.click('#reviveBtn');
  check(
    (await shown(page, 'ad')) && (await text(page, 'adTitle')) === 'Anuncio (simulado)',
    'navegador: sale el anuncio de mentira',
  );
  await page.waitForFunction(() => !document.getElementById('adBtn').disabled, null, { timeout: 8000, polling: 100 });
  await page.click('#adBtn');
  await page.waitForFunction(() => window.__giroState().state === 'play', null, { timeout: 5000, polling: 100 });
  check(!(await shown(page, 'ad')), 'navegador: al recibir la recompensa, revive y sigue la partida');
  check(!errors.length, 'navegador: sin errores en la página', errors.join(' | '));
  await ctx.close();
}

/* ---------- 2 a 5. en la app: los de verdad ---------- */
{
  const { ctx, page, errors } = await open({ profile: { nick: 'Ana', runs: 3 }, native: true });
  const ads = () => page.evaluate(() => window.__ads);
  check(!(await visible(page, 'banner')), 'app: la franja de mentira no se ve');
  check(
    (await ads()).banner.at(-1) === true,
    'app: se le pide la franja de verdad a Android',
    JSON.stringify(await ads()),
  );

  /* el enlace a la política de privacidad (Google lo exige dentro de la app): solo viaja el idioma */
  await page.evaluate(() => document.getElementById('policyOpen').click());
  check(
    (await ads()).policy === 'es',
    'app: Configuración abre la política de privacidad',
    JSON.stringify(await ads()),
  );

  /* cerrado antes de tiempo (solo se puede revivir una vez por partida: todo pasa en el mismo choque) */
  await page.evaluate(() => (window.__ads.next = 'closed'));
  await crash(page);
  await page.click('#reviveBtn');
  check(
    (await shown(page, 'ad')) &&
      (await text(page, 'adNote')) === 'Cargando el anuncio…' &&
      !(await visible(page, 'adBtn')),
    'app: mientras llega el video dice "Cargando el anuncio…", sin botón',
    await text(page, 'adNote'),
  );
  await page.waitForSelector('#adBtn', { state: 'visible', timeout: 5000 });
  check(
    /Cerraste el anuncio antes de terminar/.test(await text(page, 'adNote')) && (await state(page)) !== 'play',
    'app: video cerrado antes → no revive y dice por qué',
    await text(page, 'adNote'),
  );
  await page.click('#adBtn');
  check(
    !(await shown(page, 'ad')) && (await shown(page, 'crash')),
    'app: al cerrar el aviso vuelve a la ventana de revivir o rendirse',
  );

  /* no hay anuncio */
  await page.evaluate(() => (window.__ads.next = 'none'));
  await page.click('#reviveBtn');
  await page.waitForSelector('#adBtn', { state: 'visible', timeout: 5000 });
  check(
    /No hay anuncio disponible ahora/.test(await text(page, 'adNote')) && (await state(page)) !== 'play',
    'app: sin anuncio disponible → no revive y lo dice',
    await text(page, 'adNote'),
  );
  /* "Atrás" del teléfono hace lo mismo que el botón Cerrar */
  const used = await page.evaluate(() => window.__giroBack());
  check(
    used === true && !(await shown(page, 'ad')) && (await shown(page, 'crash')),
    'app: "Atrás" cierra el aviso y vuelve',
  );

  /* una respuesta que no es ninguna de las tres cuenta como "no hubo" */
  await page.evaluate(() => (window.__ads.next = '<img src=x onerror=alert(1)>'));
  await page.click('#reviveBtn');
  await page.waitForSelector('#adBtn', { state: 'visible', timeout: 5000 });
  check(
    /No hay anuncio disponible ahora/.test(await text(page, 'adNote')) && (await state(page)) !== 'play',
    'app: una respuesta rara de Android no da premio',
  );
  await page.click('#adBtn');

  /* y después de fallar, uno que sí se ve entero sigue dando el premio */
  await page.evaluate(() => (window.__ads.next = 'earned'));
  await page.click('#reviveBtn');
  await page.waitForFunction(() => window.__giroState().state === 'play', null, { timeout: 5000, polling: 100 });
  check(
    (await ads()).asked === 4 && !(await shown(page, 'ad')),
    'app: video visto entero → revive y sigue la partida',
    JSON.stringify(await ads()),
  );
  check(!errors.length, 'app: sin errores en la página', errors.join(' | '));
  await ctx.close();
}

/* ---------- 6. sin anuncios comprado ---------- */
{
  const { ctx, page, errors } = await open({ profile: { nick: 'Ana', runs: 3, noAds: true }, native: true });
  const ads = () => page.evaluate(() => window.__ads);
  check(
    !(await visible(page, 'banner')) && (await ads()).banner.at(-1) === false,
    'sin anuncios: no hay franja, ni la de mentira ni la de verdad',
    JSON.stringify(await ads()),
  );
  await crash(page);
  await page.click('#reviveBtn');
  await page.waitForFunction(() => window.__giroState().state === 'play', null, { timeout: 5000, polling: 100 });
  check((await ads()).asked === 0 && !(await shown(page, 'ad')), 'sin anuncios: revive directo, sin pedir video');
  check(!errors.length, 'sin anuncios: sin errores en la página', errors.join(' | '));
  await ctx.close();
}

await browser.close();
console.log(failed ? `\n${failed} cosa(s) fallaron.` : '\nLos anuncios funcionan del lado del juego.');
process.exit(failed ? 1 : 0);

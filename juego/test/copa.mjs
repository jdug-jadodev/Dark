/**
 * El tiquete de partida de la copa, de punta a punta: el juego de verdad (demo-juego.html) contra
 * el servidor de verdad corriendo en este computador (back-nave/local.mjs).
 *
 *   1. Una Supervivencia que empieza con conexión entra a la copa, con su tiquete.
 *   2. Una que empieza sin conexión no entra, y la pantalla de fin lo dice.
 *   3. Si la conexión se cae al final, la marca se guarda con su tiquete y entra cuando vuelve.
 *   4. Una marca sin tiquete (la que mandaría un programa que imita al juego) no entra; y si el
 *      juego trae guardada una marca que el servidor rechaza, deja de insistir.
 *   5. Contra un servidor de antes de los tiquetes, la copa sigue funcionando como antes.
 *
 *   node test/copa.mjs
 *
 * Si la carpeta del servidor (back-nave) no está al lado de este proyecto, no se corre.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { findChrome } from './navegador.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.join(here, '../../demo-juego.html');
const LOCAL = path.join(here, '../../../back-nave/local.mjs');
const THREE = fs.readFileSync(path.join(here, '../../app/android/src/main/assets/game/three.min.js'));
if (!fs.existsSync(LOCAL)) {
  console.log('No está la carpeta del servidor (back-nave): no se prueba el tiquete de la copa.');
  process.exit(0);
}
const { start } = await import(pathToFileURL(LOCAL).href);
const { weekOf } = await import(pathToFileURL(path.join(path.dirname(LOCAL), 'src/reglas.js')).href);
const { server, store } = await start(0);
const API = 'http://127.0.0.1:' + server.address().port;
const UID = 'jugadordeprueba000001';

let failed = 0;
function check(ok, what, detail) {
  if (!ok) failed++;
  console.log((ok ? '✓ ' : '✗ ') + what + (!ok && detail ? ' → ' + detail : ''));
}
const browser = await chromium.launch({
  executablePath: findChrome(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

/* abre el juego con un perfil dado, hablando con el servidor local */
async function open(profile) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, locale: 'es-CO' });
  await ctx.route(/three(\.min)?\.js/, (r) =>
    r.fulfill({ contentType: 'application/javascript', headers: { 'access-control-allow-origin': '*' }, body: THREE }),
  );
  await ctx.addInitScript(
    ({ api, profile }) => {
      localStorage.setItem('giro_api', api);
      sessionStorage.setItem('giro_studio', '1'); // sin la pantalla del estudio
      if (!sessionStorage.getItem('puesto')) {
        sessionStorage.setItem('puesto', '1');
        localStorage.setItem('giro_estelar_demo', JSON.stringify(profile));
      }
    },
    { api: API, profile },
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
/* juega una Supervivencia hasta pasar de `secs` segundos de juego, se estrella y se rinde.
   Devuelve lo que dice la línea de la copa en la pantalla de fin. */
async function run(page, secs) {
  await page.evaluate(() => window.__giroMap('espacio'));
  await page.waitForFunction((s) => window.__giroState().state === 'play' && window.__giroState().t > s, secs, {
    timeout: 120000,
    polling: 200,
  });
  await page.evaluate(() => window.__giroHit(999));
  await page.waitForSelector('#giveUp', { state: 'visible', timeout: 15000 });
  await page.click('#giveUp');
  await page.waitForSelector('.cupline', { state: 'visible', timeout: 15000 });
  return page.evaluate(() => document.querySelector('.cupline').textContent.replace(/\s+/g, ' ').trim());
}
const saved = (page) => page.evaluate(() => JSON.parse(localStorage.getItem('giro_estelar_demo')).cup || {});
const backToMenu = async (page) => {
  await page.evaluate(() => document.querySelector('#endBox [data-a="menu"]')?.click());
  await page.waitForTimeout(400);
};
const mine = async () => (await store.top(weekOf(Date.now()).key, 20)).find((r) => r.uid === UID) || null;

{
  const { ctx, page, errors } = await open({ nick: 'Ana', uid: UID, runs: 3 });

  /* ---------- 1. con conexión ---------- */
  const line1 = await run(page, 2);
  check(/nuevo mejor tiempo/.test(line1), 'con conexión: la pantalla de fin anuncia la marca', line1);
  await page.waitForFunction(
    () => (JSON.parse(localStorage.getItem('giro_estelar_demo')).cup || {}).sent === true,
    null,
    {
      timeout: 15000,
      polling: 200,
    },
  );
  const c1 = await saved(page),
    s1 = await mine();
  check(
    !!s1 && s1.time === c1.best && s1.time >= 2,
    'con conexión: la marca quedó en el servidor',
    JSON.stringify({ c1, s1 }),
  );
  check(
    !!s1 && s1.started > 0 && /^[0-9a-z]+\.[0-9a-f]{32}$/.test(c1.ticket || ''),
    'con conexión: llegó con su tiquete',
    JSON.stringify({ c1, s1 }),
  );
  await backToMenu(page);

  /* ---------- 2. empieza sin conexión ---------- */
  await page.route(API + '/v1/run', (r) => r.abort());
  const line2 = await run(page, c1.best + 2);
  check(
    /empezó sin conexión y no entró a la copa/.test(line2),
    'sin conexión al empezar: la pantalla de fin lo dice',
    line2,
  );
  await page.waitForTimeout(1500);
  const c2 = await saved(page),
    s2 = await mine();
  check(
    c2.best === c1.best && s2.time === s1.time,
    'sin conexión al empezar: la marca de la semana no cambia, ni aquí ni en el servidor',
    JSON.stringify({ c2, s2 }),
  );
  await page.unroute(API + '/v1/run');
  await backToMenu(page);

  /* ---------- 3. la conexión se cae al final ---------- */
  await page.evaluate(() => window.__giroMap('espacio')); // empieza con conexión: recibe su tiquete
  await page.waitForFunction(() => window.__giroState().state === 'play', null, { timeout: 60000, polling: 200 });
  await page.waitForTimeout(1500);
  await page.route(API + '/v1/score', (r) => r.abort());
  await page.route(API + '/v1/cup*', (r) => r.abort());
  await page.waitForFunction((s) => window.__giroState().t > s, c1.best + 2, { timeout: 120000, polling: 200 });
  await page.evaluate(() => window.__giroHit(999));
  await page.waitForSelector('#giveUp', { state: 'visible', timeout: 15000 });
  await page.click('#giveUp');
  await page.waitForSelector('.cupline', { state: 'visible', timeout: 15000 });
  await page.waitForTimeout(1500);
  const c3 = await saved(page),
    s3 = await mine();
  check(
    c3.best > c1.best && c3.sent === false && !!c3.ticket && c3.ticket !== c1.ticket,
    'conexión caída al final: la marca se guarda en el teléfono con su tiquete nuevo',
    JSON.stringify(c3),
  );
  check(s3.time === s1.time, 'conexión caída al final: el servidor todavía no la tiene', JSON.stringify(s3));
  await page.unroute(API + '/v1/score');
  await page.unroute(API + '/v1/cup*');
  await backToMenu(page);
  await page.click('#cupBtn'); // abrir la copa vuelve a hablar con el servidor
  await page.waitForFunction(
    () => (JSON.parse(localStorage.getItem('giro_estelar_demo')).cup || {}).sent === true,
    null,
    {
      timeout: 15000,
      polling: 200,
    },
  );
  const s3b = await mine();
  check(s3b.time === c3.best, 'cuando vuelve la conexión, la marca entra', JSON.stringify({ c3, s3b }));
  check(!errors.length, 'sin errores en la página', errors.join(' | '));
  await ctx.close();
}

/* ---------- 4. sin tiquete no entra ---------- */
{
  const week = weekOf(Date.now()).key;
  const forged = await (
    await fetch(API + '/v1/score', {
      method: 'POST',
      body: JSON.stringify({ uid: 'programaqueimita0001', nick: 'Bot', week, time: 5000 }),
    })
  ).json();
  check(
    forged.saved === false && forged.refused === 'ticket',
    'una marca mandada sin tiquete no entra a la tabla',
    JSON.stringify(forged),
  );
  check(!(await store.top(week, 20)).some((r) => r.nick === 'Bot'), 'y no aparece en la copa');

  /* un perfil retocado: trae una marca enorme "pendiente de enviar", sin tiquete */
  const { ctx, page } = await open({
    nick: 'Eva',
    uid: 'perfilretocado0000001',
    runs: 3,
    cup: { week, best: 6000, sent: false, rank: 0, total: 0, passed: 0 },
  });
  await page.waitForFunction(
    () => (JSON.parse(localStorage.getItem('giro_estelar_demo')).cup || {}).sent === true,
    null,
    {
      timeout: 15000,
      polling: 200,
    },
  );
  const c4 = await saved(page);
  check(
    c4.best === 0 && c4.sent === true,
    'una marca guardada que el servidor rechaza: el juego la suelta y no insiste',
    JSON.stringify(c4),
  );
  check(!(await store.top(week, 20)).some((r) => r.nick === 'Eva'), 'y tampoco entra a la copa');
  await ctx.close();
}

/* ---------- 5. un servidor de antes de los tiquetes ---------- */
{
  const { ctx, page } = await open({ nick: 'Leo', uid: 'servidorviejo00000001', runs: 3 });
  /* el servidor viejo: no conoce la ruta del tiquete y anota las marcas sin pedir nada */
  const got = [];
  await page.route(API + '/v1/run', (r) =>
    r.fulfill({ status: 404, contentType: 'application/json', body: '{"error":"no existe"}' }),
  );
  await page.route(API + '/v1/score', (r) => {
    const sent = JSON.parse(r.request().postData());
    got.push(sent);
    return r.fulfill({
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({
        week: sent.week,
        ends: 3600,
        total: 1,
        saved: true,
        top: [{ nick: sent.nick, time: sent.time, me: true }],
        me: { time: sent.time, rank: 1 },
      }),
    });
  });
  const line = await run(page, 2);
  check(/nuevo mejor tiempo/.test(line), 'servidor sin tiquetes: la partida cuenta como antes', line);
  await page.waitForFunction(
    () => (JSON.parse(localStorage.getItem('giro_estelar_demo')).cup || {}).sent === true,
    null,
    {
      timeout: 15000,
      polling: 200,
    },
  );
  const c5 = await saved(page);
  check(
    got.length === 1 && got[0].time === c5.best && c5.rank === 1,
    'servidor sin tiquetes: la marca se envía y queda anotada',
    JSON.stringify({ got, c5 }),
  );
  /* y esa misma marca, mandada a un servidor que sí da tiquetes, no entra */
  const real = await (await fetch(API + '/v1/score', { method: 'POST', body: JSON.stringify(got[0]) })).json();
  check(
    real.saved === false && real.refused === 'ticket',
    'pero el servidor nuevo no acepta una marca así',
    JSON.stringify(real),
  );
  await ctx.close();
}

await browser.close();
server.close();
console.log(failed ? `\n${failed} cosa(s) fallaron.` : '\nEl tiquete de la copa funciona de punta a punta.');
process.exit(failed ? 1 : 0);

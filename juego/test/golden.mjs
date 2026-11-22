/**
 * Prueba de regresión ("golden master") del juego.
 *
 * Juega partidas automáticas en todos los modos con el azar y el reloj controlados,
 * y anota lo que se ve en pantalla (marcador, avisos, ventanas, progreso guardado)
 * junto con cuántos números al azar pidió el juego. Si el código cambia de forma
 * pero no de comportamiento, las anotaciones salen idénticas a las guardadas.
 *
 *   node test/golden.mjs --check     compara contra test/golden.baseline.json
 *   node test/golden.mjs --update    vuelve a guardar la referencia (solo si el cambio es intencional)
 *   --html <archivo>                 qué HTML probar (por defecto ../demo-juego.html)
 *   --only <nombre>                  un solo escenario
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findChrome } from './navegador.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);

const HTML = path.resolve(opt('--html', path.join(here, '../../demo-juego.html')));
const BASELINE = path.join(here, 'golden.baseline.json');
const THREE = path.join(here, '../../app/android/src/main/assets/game/three.min.js');

/* ---------- se inyecta antes que el juego: azar con semilla y reloj virtual ---------- */
function installHarness(seed) {
  /* las partidas de prueba no hablan con el servidor del juego: ni ensucian sus datos ni dependen de internet */
  try {
    localStorage.setItem('giro_api', 'off');
  } catch (e) {}
  let s = seed >>> 0;
  let calls = 0;
  Math.random = () => {
    calls++;
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  let vt = 0;
  performance.now = () => vt;
  /* la fecha también es fija (y avanza con el reloj virtual): el cofre y las misiones dependen del día */
  const RealDate = Date,
    T0 = new RealDate(2026, 10, 20, 12).getTime();
  window.Date = class extends RealDate {
    constructor(...a) {
      if (a.length) super(...a);
      else super(T0 + vt);
    }
    static now() {
      return T0 + vt;
    }
  };
  const raf = [];
  let rid = 0;
  window.requestAnimationFrame = (cb) => (raf.push(cb), ++rid);
  window.cancelAnimationFrame = () => {};
  const timers = [];
  let tid = 0;
  window.setTimeout = (fn, ms = 0, ...a) => (timers.push({ id: ++tid, at: vt + ms, fn, a }), tid);
  window.setInterval = (fn, ms = 0, ...a) => (
    timers.push({ id: ++tid, at: vt + ms, fn, a, every: Math.max(1, ms) }),
    tid
  );
  window.clearTimeout = window.clearInterval = (id) => {
    const i = timers.findIndex((t) => t.id === id);
    if (i >= 0) timers.splice(i, 1);
  };

  const el = (id) => document.getElementById(id);
  const shown = (id) => !!el(id) && el(id).classList.contains('show');
  const txt = (id) => (el(id) ? el(id).textContent : '');
  const wid = (id) => (el(id) ? el(id).style.width : '');
  const errors = [];
  window.addEventListener('error', (e) => errors.push(String(e.message)));

  function frame() {
    vt += 1000 / 60;
    for (let guard = 0; guard < 500; guard++) {
      const due = timers.filter((t) => t.at <= vt).sort((a, b) => a.at - b.at || a.id - b.id)[0];
      if (!due) break;
      if (due.every) due.at += due.every;
      else timers.splice(timers.indexOf(due), 1);
      due.fn(...due.a);
    }
    for (const cb of raf.splice(0)) cb(vt);
  }

  function snapshot(f) {
    const screens = ['menu', 'crash', 'end', 'chest', 'ad', 'pause'].filter(shown).join(',');
    return [
      f,
      calls,
      [
        txt('hCoins'),
        txt('hCombo'),
        txt('hPow'),
        txt('hTime'),
        txt('phase'),
        wid('barFill'),
        wid('nitroFill'),
        txt('hullTxt'),
      ].join('|'),
      shown('warn') ? txt('warnTxt') : '',
      shown('count') ? txt('count') : '',
      txt('toast'),
      screens,
      shown('end')
        ? txt('endBox')
        : shown('crash')
          ? txt('crashInfo')
          : shown('chest')
            ? txt('chestBox')
            : shown('pause')
              ? txt('pauseInfo')
              : '',
      screens.includes('menu') ? txt('mCoins') + ' ' + txt('mBest') : '',
      localStorage.getItem('giro_estelar_demo') || '',
    ].join(' ¦ ');
  }

  const fire = (target, type, init) =>
    target.dispatchEvent(new PointerEvent(type, { bubbles: true, cancelable: true, pointerId: 1, ...init }));
  const key = (type, k) => window.dispatchEvent(new KeyboardEvent(type, { key: k, bubbles: true }));

  /** Ejecuta un escenario (lista de pasos) y devuelve las anotaciones. */
  window.__golden = (steps) => {
    const out = [];
    let f = 0;
    const note = (what) => out.push(`${what} ¦ ${snapshot(f)}`);
    for (const st of steps) {
      if (st.click) {
        const b = document.querySelector(st.click);
        if (!b) {
          out.push(`FALTA ${st.click}`);
          continue;
        }
        b.click();
        note(`click ${st.click}`);
        continue;
      }
      const cv = el('cv');
      const auto = st.auto || {};
      let revived = false,
        doubled = false,
        keysDown = [];
      if (st.drag) fire(cv, 'pointerdown', { clientX: st.drag.cx, clientY: st.drag.cy });
      for (let i = 0; i < st.n; i++, f++) {
        if (st.drag) {
          const d = st.drag;
          fire(cv, 'pointermove', {
            clientX: d.cx + d.ax * Math.sin(i * d.wx),
            clientY: d.cy + d.ay * Math.sin(i * d.wy),
          });
        }
        if (st.keys && i % st.keys.every === 0) {
          for (const k of keysDown) key('keyup', k);
          keysDown = st.keys.seq[Math.floor(i / st.keys.every) % st.keys.seq.length];
          for (const k of keysDown) key('keydown', k);
        }
        if (st.nitro && i % st.nitro === st.nitro - 1 && el('nitroBtn')) fire(el('nitroBtn'), 'pointerdown', {});
        if (i % 10 === 0) {
          // piloto automático: resuelve las ventanas igual que lo haría un jugador
          if (shown('ad')) {
            if (!el('adBtn').disabled) {
              el('adBtn').click();
              note('ad:ok');
            }
          } else if (shown('crash')) {
            if (auto.revive && !revived) {
              revived = true;
              el('reviveBtn').click();
              note('revive');
            } else {
              el('giveUp').click();
              note('giveUp');
            }
          } else if (shown('end')) {
            const x2 = el('endBox').querySelector('[data-a="x2"]');
            if (auto.x2 && x2 && !x2.disabled && !doubled) {
              doubled = true;
              x2.click();
              note('x2');
            } else if (auto.end) {
              const b =
                el('endBox').querySelector(`[data-a="${auto.end}"]`) || el('endBox').querySelector('[data-a="menu"]');
              note('end');
              b.click();
              revived = false;
              doubled = false;
            }
          } else if (shown('menu') && auto.fromMenu) {
            document.querySelector(auto.fromMenu).click();
            note('menu→');
          }
        }
        frame();
        if (i % (st.snap || 30) === 0) note('');
      }
      for (const k of keysDown) key('keyup', k);
      if (st.drag) fire(cv, 'pointerup', {});
      note('fin-paso');
    }
    return { out, errors };
  };
}

/* ---------- escenarios: entre todos recorren los cuatro modos y las ventanas ---------- */
const drag = (ax, ay, wx, wy) => ({ cx: 195, cy: 520, ax, ay, wx, wy });
const SCENARIOS = {
  'menu-cofre': [
    { click: '#ctrl [data-ctrl="btn"]' },
    { click: '#ctrl [data-ctrl="swipe"]' },
    { click: '#chestBtn' },
    { click: '[data-c="open"]' },
    { click: '[data-c="x2"]' },
    { n: 260 },
    { click: '[data-c="close"]' },
  ],
  'aventura-demo': [
    { click: '#inv' },
    { click: '#play' },
    { click: '[data-world="hielo"]' },
    { n: 60000, snap: 60, drag: drag(120, 60, 0.021, 0.013), nitro: 420, auto: { x2: true, end: 'boss' } },
  ],
  'aventura-real': [
    { click: '#play' },
    { click: '[data-world="espacio"]' }, // el mundo del espacio: la Aventura de siempre
    { n: 7000, drag: drag(90, 30, 0.017, 0.009), nitro: 300, auto: { revive: true, x2: true, end: 'again' } },
    { click: '#pauseBtn' },
    { n: 40 },
    { click: '#resumeBtn' },
    { n: 300 },
    { click: '#pauseBtn' },
    { click: '#quitBtn' },
  ],
  supervivencia: [
    { click: '#ctrl [data-ctrl="btn"]' },
    { click: '#survBtn' },
    { click: '[data-map="espacio"]' },
    {
      n: 11000,
      auto: { revive: true, x2: true, end: 'endless' },
      keys: {
        every: 37,
        seq: [['ArrowLeft'], ['ArrowRight', 'ArrowUp'], ['ArrowLeft', 'ArrowDown'], ['d'], [], ['a', 'w']],
      },
    },
  ],
  'supervivencia-demo': [
    { click: '#inv' },
    { click: '#survBtn' },
    { click: '[data-map="espacio"]' },
    { n: 36000, snap: 60, drag: drag(140, 40, 0.025, 0.011), auto: {} },
  ],
  /* modo demo arrancando en el nivel 20: giros de 360°, arcoíris y cometas desde el primer segundo */
  'supervivencia-nivel-20': [
    { click: '#inv' },
    { click: '#lvlPick [data-lv="20"]' },
    { click: '#survBtn' },
    { click: '[data-map="fuego"]' }, // en el paisaje de un mundo
    { n: 6000, snap: 60, drag: drag(140, 40, 0.025, 0.011), auto: {} },
    { click: '#pauseBtn' },
    { click: '#quitBtn' },
  ],
  espacio: [
    { click: '#spaceBtn' },
    { n: 7000, drag: drag(110, 110, 0.019, 0.023), auto: { revive: true, x2: true, end: 'space' } },
  ],
  'espacio-demo': [
    { click: '#inv' },
    { click: '#spaceBtn' },
    { n: 6000, drag: drag(150, 130, 0.015, 0.027), auto: {} },
    { click: '#pauseBtn' },
    { click: '#quitBtn' },
  ],
  /* Al jefe ya no se entra desde el menú: se llega al final de la Aventura y desde ahí se repite.
     Aquí se llega en modo demo, se quita el modo demo y se pelea de verdad (perder, revivir, reintentar). */
  'jefe-real': [
    { click: '#inv' },
    { click: '#play' },
    { click: '[data-world="hielo"]' },
    { n: 37000, snap: 600, drag: drag(120, 60, 0.021, 0.013), nitro: 420, auto: {} },
    { click: '#inv' },
    { click: '[data-a="boss"]' },
    { n: 5000, drag: drag(100, 40, 0.02, 0.01), auto: { revive: true, end: 'boss' } },
  ],
};

async function run() {
  const only = opt('--only', null);
  // En la prueba no se dibuja (por software iría lentísimo). Three.js define render() en cada
  // objeto y no en la clase, así que se envuelve el constructor para anularlo.
  // Además Three.js le pone un identificador al azar a cada objeto que crea: aquí se numeran, para
  // que crear más o menos objetos (una nave con otras piezas) no corra el azar de la partida.
  const uuidRandom = '4294967295*Math.random()';
  const source = fs.readFileSync(THREE, 'utf8');
  if (source.split(uuidRandom).length !== 5)
    throw new Error('No encuentro el generador de identificadores de Three.js');
  const three =
    'let __giroId=1;function __giroU(){__giroId=(__giroId*1103515245+12345)%2147483648;return __giroId/2147483648;}\n' +
    source.split(uuidRandom).join('4294967295*__giroU()') +
    '\n(function(){const Real=THREE.WebGLRenderer;THREE.WebGLRenderer=function(p){const r=new Real(p);r.render=function(){};return r;};})();';
  const browser = await chromium.launch({
    executablePath: findChrome(),
    args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const result = {};
  for (const [name, steps] of Object.entries(SCENARIOS)) {
    if (only && only !== name) continue;
    const ctx = await browser.newContext({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 1 });
    const page = await ctx.newPage();
    const pageErrors = [];
    page.on('pageerror', (e) => pageErrors.push(e.message));
    await page.route(/three(\.min)?\.js/, (r) => r.fulfill({ contentType: 'application/javascript', body: three }));
    await page.addInitScript(installHarness, 20261118);
    await page.goto(pathToFileURL(HTML).href);
    await page.waitForFunction(() => document.getElementById('mCoins').textContent.includes('racha'));
    const t0 = Date.now();
    const r = await page.evaluate((s) => window.__golden(s), steps);
    result[name] = r.out;
    const errs = [...pageErrors, ...r.errors];
    console.log(
      `  ${name.padEnd(20)} ${String(r.out.length).padStart(4)} anotaciones  ${((Date.now() - t0) / 1000).toFixed(1)} s${errs.length ? '  ERRORES: ' + errs.slice(0, 3).join(' | ') : ''}`,
    );
    if (errs.length) process.exitCode = 1;
    await ctx.close();
  }
  await browser.close();
  return result;
}

console.log(`Probando ${path.relative(process.cwd(), HTML)}`);
const result = await run();

if (flag('--update')) {
  fs.writeFileSync(BASELINE, JSON.stringify(result, null, 1));
  console.log(`Referencia guardada en ${path.relative(process.cwd(), BASELINE)}`);
} else if (flag('--check')) {
  const base = JSON.parse(fs.readFileSync(BASELINE, 'utf8'));
  let bad = 0;
  for (const [name, lines] of Object.entries(result)) {
    const ref = base[name];
    if (!ref) {
      console.log(`✗ ${name}: no está en la referencia`);
      bad++;
      continue;
    }
    const i = lines.findIndex((l, k) => l !== ref[k]);
    if (i === -1 && lines.length === ref.length) {
      console.log(`✓ ${name}: idéntico (${lines.length} anotaciones)`);
      continue;
    }
    bad++;
    const k = i === -1 ? Math.min(lines.length, ref.length) : i;
    console.log(`✗ ${name}: cambia en la anotación ${k} de ${ref.length}`);
    console.log(`    antes: ${String(ref[k]).slice(0, 300)}`);
    console.log(`    ahora: ${String(lines[k]).slice(0, 300)}`);
  }
  if (bad) {
    console.log(`\n${bad} escenario(s) cambiaron de comportamiento.`);
    process.exitCode = 1;
  } else console.log('\nTodo se comporta igual que la referencia.');
}

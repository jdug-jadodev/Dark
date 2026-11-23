/**
 * Material para la ficha de Google Play, sacado del juego de verdad (../demo-juego.html).
 *
 *   node tools/tienda.mjs candidatos una hoja de miniaturas por mundo, para escoger los momentos
 *   node tools/tienda.mjs capturas   capturas de pantalla 1080×1920 → ../tienda/capturas/
 *   node tools/tienda.mjs ficha      capturas con titular, gráfico de cabecera e icono → ../tienda/ficha/
 *   node tools/tienda.mjs video      el video (1920×1080, sin sonido) → ../tienda/
 *   --perfil <archivo.json>          el progreso con el que se abre el juego (la nave, las piezas)
 *   --idioma es|en|pt
 *
 * Cómo funciona. El juego corre en el navegador de las pruebas con el reloj detenido: cada cuadro
 * se pide a mano, se dibuja y se fotografía. Así el resultado sale nítido y a 60 cuadros por
 * segundo sin depender de qué tan rápido sea el computador. Mientras tanto un piloto automático
 * mueve la nave (esquiva, recoge, se alinea con los enemigos) en modo demo, donde no se muere.
 *
 * Aquí nada toca el juego: se trabaja sobre una copia de la página a la que se le quita la
 * política de contenido y se le asoma el estado (G) para que el piloto pueda ver la pista.
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { findChrome } from '../test/navegador.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const HTML = path.join(here, '../../demo-juego.html');
const THREE = fs.readFileSync(path.join(here, '../../app/android/src/main/assets/game/three.min.js'));
const OUT = path.resolve(opt('--salida', path.join(here, '../../tienda')));
const LANG = opt('--idioma', 'es');

/* ---------- la copia de la página para grabar ---------- */
export function capturePage() {
  let text = fs.readFileSync(HTML, 'utf8');
  const cut = (re, what, by = '') => {
    const next = text.replace(re, by);
    if (next === text) throw new Error('No encontré ' + what + ' en demo-juego.html');
    text = next;
  };
  cut(/<meta http-equiv="Content-Security-Policy"[^>]*>/, 'la política de contenido');
  cut(/(<script src="https:[^"]*three[^"]*")[^>]*>/, 'la etiqueta de Three.js', '$1>');
  cut(/<div id="studio"[\s\S]*?<\/div>/, 'la pantalla del estudio');
  cut(/var G = \{\n(\s*)cw: 0,/, 'el estado del juego (G)', 'var G = window.__G = {\n$1cw: 0,');
  const copy = path.join(os.tmpdir(), `astrion-tienda-${process.pid}.html`);
  fs.writeFileSync(copy, text);
  return copy;
}

/* ---------- el progreso con el que se abre ---------- */
export function profile() {
  const file = opt('--perfil', '');
  const base = file ? JSON.parse(fs.readFileSync(file, 'utf8')) : {};
  for (const k of ['uid', 'acct', 'cup', 'daily', 'duel']) delete base[k]; // nada que identifique a nadie
  return {
    coins: 12480,
    best: 234,
    bossWins: 18,
    runs: 37,
    xp: 4886,
    streak: 5,
    boss: true,
    ...base,
    nick: 'Nova',
    lang: LANG,
    noAds: true, // sin la franja de anuncios de mentira
    remAsked: true,
    acctSeen: true,
    volMusic: 0,
    volSfx: 0,
    gfx: 'high',
  };
}

/* ---------- se inyecta antes que el juego: reloj a mano, azar con semilla y piloto ---------- */
function harness({ profile, seed, density }) {
  if (!/astrion-tienda/.test(location.pathname)) return; // solo en la página del juego
  localStorage.setItem('giro_api', 'off'); // nada sale al servidor
  sessionStorage.setItem('giro_studio', '1');
  localStorage.setItem('giro_estelar_demo', JSON.stringify(profile));
  if (density) Object.defineProperty(window, 'devicePixelRatio', { get: () => density });

  const asked = +new URLSearchParams(location.search).get('s'); // cada escena del video trae su semilla
  let s = (asked || seed) >>> 0;
  Math.random = () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  let vt = 0;
  performance.now = () => vt;
  const RealDate = Date,
    T0 = new RealDate(2026, 10, 21, 20).getTime();
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

  /* El piloto: mira lo que viene por la pista y elige hacia dónde llevar la nave. No es perfecto
     (ni hace falta: en modo demo no se muere), pero se mueve como alguien que sabe jugar. */
  const W = 360;
  let aim = W / 2,
    hold = 0;
  function pilot() {
    const G = window.__G;
    if (!G || G.state !== 'play' || !G.ship || !G.run || G.run.mode === 'space') return;
    const ship = G.ship;
    if (--hold <= 0) {
      let best = aim,
        cost = Infinity;
      for (let x = 22; x <= W - 22; x += 6) {
        let c = Math.abs(x - ship.x) * 0.012 + Math.abs(x - W / 2) * 0.006 + Math.abs(x - aim) * 0.004;
        const danger = (o, r, w) => {
          const dy = ship.y - o.y;
          if (dy < -r - 24 || dy > 300) return;
          const gap = Math.abs(o.x + (o.vx || 0) * Math.min(1, dy / 260) - x) - (r + 15);
          if (gap < 26) c += w * (1.2 + (300 - dy) / 90) * (gap < 0 ? 3.2 : (26 - gap) / 26);
        };
        for (const o of G.obs || []) danger(o, o.r || 14, 10);
        for (const b of G.eb || []) danger(b, b.r || 5, 9);
        for (const e of G.en || []) {
          if (e.y < 0) continue;
          const dx = Math.abs(e.x - x);
          if (dx < 16) c -= 2.4; // debajo de un enemigo: le dispara
        }
        const want = (o, w) => {
          const dy = ship.y - o.y;
          if (dy < -10 || dy > 240) return;
          const dx = Math.abs(o.x - x);
          if (dx < 18) c -= w * (1 - dy / 300);
        };
        for (const k of G.coins || []) want(k, 0.9);
        for (const k of G.caps || []) want(k, 3);
        if (c < cost) {
          cost = c;
          best = x;
        }
      }
      aim = best;
      hold = 3;
    }
    const d = aim - ship.tx;
    ship.tx += Math.max(-7, Math.min(7, d * 0.3));
  }

  /* avanza n cuadros; devuelve en qué va el juego */
  window.__step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      vt += 1000 / 60;
      for (let guard = 0; guard < 500; guard++) {
        const due = timers.filter((t) => t.at <= vt).sort((a, b) => a.at - b.at || a.id - b.id)[0];
        if (!due) break;
        if (due.every) due.at += due.every;
        else timers.splice(timers.indexOf(due), 1);
        try {
          due.fn(...due.a);
        } catch (e) {}
      }
      pilot();
      for (const cb of raf.splice(0)) cb(vt);
      /* las animaciones de la página (avisos que aparecen y se van) corren con el reloj de verdad:
         se detienen y se llevan a mano, al mismo paso que el juego */
      for (const anim of document.getAnimations()) {
        if (anim.playState !== 'paused') anim.pause();
        anim.currentTime = (Number(anim.currentTime) || 0) + 1000 / 60;
      }
      /* el marcador avisa que es modo demo: en la tienda no va */
      const phase = document.getElementById('phase');
      if (phase && /demo/i.test(phase.textContent))
        phase.textContent = phase.textContent.replace(/ · [^·]*demo[^·]*$/i, '');
    }
    const G = window.__G;
    return G ? { state: G.state, t: G.t, mode: G.run && G.run.mode, pts: G.run && Math.floor(G.run.pts || 0) } : null;
  };
  /* modo demo: no morir (y arrancar Supervivencia en un nivel alto) */
  window.__demo = (level) => {
    const box = document.getElementById('inv');
    box.checked = true;
    box.dispatchEvent(new Event('change', { bubbles: true }));
    if (level) window.__G.startLv = level;
  };
}

/* ---------- abrir el juego listo para grabar ---------- */
export async function openGame({ width = 360, height = 640, scale = 3, seed = 7, gpu = true } = {}) {
  const copy = capturePage();
  const browser = await chromium.launch({
    executablePath: findChrome(),
    args: gpu
      ? ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-vsync']
      : ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
  });
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: scale, locale: 'es-CO' });
  await ctx.route(/three(\.min)?\.js/, (r) => r.fulfill({ contentType: 'application/javascript', body: THREE }));
  await ctx.addInitScript(harness, { profile: profile(), seed, density: 0 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto(pathToFileURL(copy).href);
  const step = (n) => page.evaluate((n) => window.__step(n), n);
  /* que termine de arrancar: el menú con sus monedas a la vista */
  for (let i = 0; i < 400; i++) {
    await step(5);
    if (await page.evaluate(() => !!window.__giroMap && !!document.getElementById('mCoins').textContent.trim())) break;
    await new Promise((ok) => setTimeout(ok, 50)); // lo que carga con tiempo de verdad (música, imágenes)
  }
  await step(90);
  const close = async () => {
    await browser.close();
    fs.rmSync(copy, { force: true });
  };
  return { browser, ctx, page, step, errors, close };
}

/* ---------- capturas ---------- */
const WORLD_IDS = ['ciudad', 'fuego', 'hielo', 'gases', 'agujero', 'espacio'];
const jpg = (page, file) => page.screenshot({ path: file, type: 'jpeg', quality: 90 });
/* lo que solo existe en el laboratorio no sale en la tienda */
const tidy = (page) => page.addStyleTag({ content: '.chk,#lvlPick,#hint{display:none!important}' });

/* una hoja con las miniaturas de una carpeta, para escoger de un vistazo */
async function sheet(browser, dir, files, out) {
  const page = await browser.newPage({ viewport: { width: 1260, height: 100 } });
  const cells = files
    .map((f) => `<figure><img src="${encodeURI(f)}"><figcaption>${f.replace(/\.jpg$/, '')}</figcaption></figure>`)
    .join('');
  const html = path.join(dir, 'hoja.html'); // en la misma carpeta: una página suelta no puede abrir archivos
  fs.writeFileSync(
    html,
    `<style>body{margin:0;background:#111;display:grid;grid-template-columns:repeat(7,1fr);gap:4px;padding:4px}
     figure{margin:0}img{width:100%;display:block}figcaption{font:12px system-ui;color:#fff;text-align:center;padding:2px}</style>${cells}`,
  );
  await page.goto(pathToFileURL(html).href);
  await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  await page.screenshot({ path: out, fullPage: true, type: 'jpeg', quality: 80 });
  await page.close();
}

/* Candidatos: de cada mundo, una foto cada tanto durante el recorrido y durante el jefe.
   Con el reloj y el azar fijos, la foto N de un mundo es siempre la misma: la definitiva se
   vuelve a sacar con el mismo número (ver FINAL). */
const EVERY = 120; // cuadros entre fotos
async function playWorld(id, { boss = false, level = 0, upTo = 20, onShot }) {
  const game = await openGame({ seed: 11 + WORLD_IDS.indexOf(id) * 7 + (boss ? 3 : 0) + level });
  const { page, step } = game;
  await tidy(page);
  await page.evaluate((level) => window.__demo(level), level);
  await page.evaluate(({ id, level }) => (level ? window.__giroMap(id) : window.__giroWorld(id)), { id, level });
  for (let i = 0; i < 600; i++) if ((await step(5)).state === 'play') break;
  if (boss) {
    await page.evaluate(() => window.__giroBoss());
    for (let i = 0; i < 400; i++) {
      await step(5);
      if ((await page.evaluate(() => window.__giroBoss(''))) === 'fight') break;
    }
  }
  for (let n = 1; n <= upTo; n++) {
    await step(EVERY);
    await onShot(page, n);
  }
  if (game.errors.length) console.log('Errores de la página (' + id + '):', game.errors.join(' | '));
  await game.close();
}
async function candidates() {
  const dir = path.join(os.tmpdir(), 'astrion-candidatos');
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
  const only = opt('--solo', '');
  for (const id of WORLD_IDS) {
    if (only && !only.split(',').includes(id)) continue;
    const run = async (tag, o) => {
      const names = [];
      await playWorld(id, {
        ...o,
        onShot: async (page, n) => {
          const name = `${id}-${tag}-${String(n).padStart(2, '0')}.jpg`;
          await jpg(page, path.join(dir, name));
          names.push(name);
        },
      });
      return names;
    };
    const files = [
      ...(await run('r', { upTo: 21 })),
      ...(await run('j', { boss: true, upTo: 14 })),
      ...(await run('s', { level: 15, upTo: 7 })),
    ];
    const browser = await chromium.launch({ executablePath: findChrome() });
    await sheet(browser, dir, files, path.join(dir, `hoja-${id}.jpg`));
    await browser.close();
    console.log('hoja-' + id + '.jpg · ' + files.length + ' fotos');
  }
  console.log(dir);
}

/* Las escogidas: [nombre del archivo, mundo, qué (r = recorrido, j = jefe, s = Supervivencia nivel 15), número de foto] */
const FINAL = [
  ['ciudad-jefe', 'ciudad', 'j', 10],
  ['fuego-jefe', 'fuego', 'j', 11],
  ['hielo-jefe', 'hielo', 'j', 7],
  ['gases', 'gases', 'r', 19],
  ['agujero-jefe', 'agujero', 'j', 8],
  ['espacio-jefe', 'espacio', 'j', 4],
  ['ciudad', 'ciudad', 'r', 13],
  ['hielo', 'hielo', 'r', 17],
  ['espacio', 'espacio', 'r', 12],
  ['fuego', 'fuego', 'r', 13],
];
async function shots() {
  const dir = path.join(OUT, 'capturas');
  fs.mkdirSync(dir, { recursive: true });
  const only = opt('--solo', '');
  const want = (name) => !only || only.split(',').includes(name);
  const game = await openGame();
  const { page, step } = game;
  await tidy(page);
  const info = await page.evaluate(() => {
    const gl = document.createElement('canvas').getContext('webgl');
    const dbg = gl && gl.getExtension('WEBGL_debug_renderer_info');
    return { gpu: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : '?', dpr: window.__G.dpr };
  });
  console.log('Dibuja con:', info.gpu, '· nitidez', info.dpr);
  const shot = async (name, from = page) => {
    await from.screenshot({ path: path.join(dir, name + '.png') });
    console.log('  ' + name + '.png');
  };
  if (want('menu')) await shot('menu');
  if (want('taller')) {
    await page.click('#garageBtn');
    await step(150);
    await shot('taller');
    await page.click('#garageBack');
    await step(90);
  }
  if (want('mundos')) {
    await page.click('#play');
    await step(60);
    await shot('mundos');
    await page.evaluate(() => window.__giroBack());
    await step(30);
  }
  if (want('mapas')) {
    await page.click('#survBtn');
    await step(60);
    await shot('mapas');
  }
  if (game.errors.length) console.log('Errores de la página:', game.errors.join(' | '));
  await game.close();
  for (const [name, id, kind, n] of FINAL) {
    if (!want(name)) continue;
    await playWorld(id, {
      boss: kind === 'j',
      level: kind === 's' ? 15 : 0,
      upTo: n,
      onShot: async (p, i) => {
        if (i === n) await shot(name, p);
      },
    });
  }
}

/* ---------- la ficha: capturas con titular, gráfico de cabecera e icono ---------- */
/* [captura, titular, color de acento] — el orden es el de la tienda: la primera es la que más se ve */
const CARDS = {
  es: [
    ['fuego-jefe', '6 mundos\n6 jefes', '#ff8a3c'],
    ['ciudad', 'Esquiva, dispara\ny sobrevive', '#ff6bd0'],
    ['taller', 'Arma tu\npropia nave', '#5ee0ff'],
    ['hielo-jefe', 'Jefes que\nno perdonan', '#7fd8ff'],
    ['agujero-jefe', 'Cada mundo,\nun reto nuevo', '#c792ff'],
    ['hielo', 'Recoge armas\ny escudos', '#9eeeff'],
    ['gases', 'Mundos llenos\nde sorpresas', '#b4ff5e'],
    ['menu', 'Gratis y\nsin conexión', '#ffd24a'],
  ],
  en: [
    ['fuego-jefe', '6 worlds\n6 bosses', '#ff8a3c'],
    ['ciudad', 'Dodge, shoot\nand survive', '#ff6bd0'],
    ['taller', 'Build your\nown ship', '#5ee0ff'],
    ['hielo-jefe', 'Bosses with\nno mercy', '#7fd8ff'],
    ['agujero-jefe', 'Every world,\na new challenge', '#c792ff'],
    ['hielo', 'Grab weapons\nand shields', '#9eeeff'],
    ['gases', 'Worlds full\nof surprises', '#b4ff5e'],
    ['menu', 'Free and\nplayable offline', '#ffd24a'],
  ],
};
const TAGLINE = { es: '6 mundos · 6 jefes · tu nave', en: '6 worlds · 6 bosses · your ship' };
const FONT = `"Segoe UI Black","Segoe UI",system-ui,-apple-system,Roboto,sans-serif`;

/* el icono de la app (dibujos vectoriales de Android) como SVG, recortado a su zona visible */
function iconSvg() {
  const res = path.join(here, '../../app/android/src/main/res/drawable');
  const color = (c) => {
    const m = /^#([0-9a-f]{2})([0-9a-f]{6})$/i.exec(c);
    return m ? { fill: '#' + m[2], alpha: (parseInt(m[1], 16) / 255).toFixed(3) } : { fill: c, alpha: '1' };
  };
  const attr = (tag, name) => (new RegExp(`android:${name}="([^"]*)"`).exec(tag) || [])[1];
  let defs = '';
  const convert = (xml, id) =>
    xml
      .replace(/<\?xml[^>]*>|<!--[\s\S]*?-->/g, '')
      .replace(/<vector[^>]*>|<\/vector>/g, '')
      .replace(
        /<path([^>]*)>\s*<aapt:attr[^>]*>\s*<gradient([^>]*)>([\s\S]*?)<\/gradient>\s*<\/aapt:attr>\s*<\/path>/g,
        (_, p, g, items) => {
          const stops = [...items.matchAll(/<item([^>]*)\/>/g)]
            .map((m) => {
              const c = color(attr(m[1], 'color'));
              return `<stop offset="${attr(m[1], 'offset')}" stop-color="${c.fill}" stop-opacity="${c.alpha}"/>`;
            })
            .join('');
          defs += `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${attr(g, 'centerX')}" cy="${attr(g, 'centerY')}" r="${attr(g, 'gradientRadius')}">${stops}</radialGradient>`;
          return `<path d="${attr(p, 'pathData')}" fill="url(#${id})"/>`;
        },
      )
      .replace(/<group([^>]*)>/g, (_, g) => {
        const px = attr(g, 'pivotX') || 0,
          py = attr(g, 'pivotY') || 0;
        return `<g transform="translate(${px} ${py}) rotate(${attr(g, 'rotation') || 0}) scale(${attr(g, 'scaleX') || 1} ${attr(g, 'scaleY') || 1}) translate(${-px} ${-py})">`;
      })
      .replace(/<\/group>/g, '</g>')
      .replace(/<path([^>]*)\/>/g, (whole, p) => {
        if (!/android:pathData/.test(p)) return whole; // ya convertido (el del degradado)
        const fill = attr(p, 'fillColor'),
          stroke = attr(p, 'strokeColor');
        const f = fill ? color(fill) : null,
          k = stroke ? color(stroke) : null;
        return (
          `<path d="${attr(p, 'pathData')}" fill="${f ? f.fill : 'none'}"` +
          (f ? ` fill-opacity="${f.alpha}"` : '') +
          (k ? ` stroke="${k.fill}" stroke-opacity="${k.alpha}" stroke-width="${attr(p, 'strokeWidth') || 1}"` : '') +
          '/>'
        );
      });
  const back = convert(fs.readFileSync(path.join(res, 'ic_launcher_background.xml'), 'utf8'), 'fondo');
  const front = convert(fs.readFileSync(path.join(res, 'ic_launcher_foreground.xml'), 'utf8'), 'nave');
  /* la zona visible del icono adaptable es el centro: 72 de 108 */
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="18 18 72 72"><defs>${defs}</defs>${back}${front}</svg>`;
}

async function listing() {
  const dir = path.join(OUT, 'ficha' + (LANG === 'es' ? '' : '-' + LANG));
  fs.mkdirSync(dir, { recursive: true });
  const cards = CARDS[LANG] || CARDS.es;
  const browser = await chromium.launch({ executablePath: findChrome() });
  const render = async (name, width, height, html) => {
    const page = await browser.newPage({ viewport: { width, height } });
    const file = path.join(OUT, '_pagina.html'); // junto a las capturas: una página suelta no puede abrir archivos
    fs.writeFileSync(
      file,
      `<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;font-family:${FONT}}</style>${html}`,
    );
    await page.goto(pathToFileURL(file).href);
    await page.waitForFunction(() => [...document.images].every((i) => i.complete && i.naturalWidth));
    await page.screenshot({ path: path.join(dir, name) });
    await page.close();
    fs.rmSync(file, { force: true });
    console.log('  ' + path.relative(OUT, path.join(dir, name)));
  };
  const img = (name) => 'capturas/' + name + '.png';

  /* capturas con titular: 1080×1920 */
  let n = 0;
  for (const [name, title, tone] of cards) {
    n++;
    const [first, second] = title.split('\n');
    await render(
      `${String(n).padStart(2, '0')}-${name}.png`,
      1080,
      1920,
      `<style>
        body{background:radial-gradient(120% 70% at 50% 0%,${tone}55 0%,#0b1030 46%,#05070f 100%)}
        h1{margin:0;height:372px;padding:0 50px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;
           font-size:94px;line-height:1.06;font-weight:900;letter-spacing:1px;text-transform:uppercase;color:#fff;text-shadow:0 6px 34px ${tone}cc,0 2px 0 #0008}
        h1 b{color:${tone}}
        .shot{position:absolute;left:50%;top:372px;width:840px;height:1493px;transform:translateX(-50%);border-radius:54px;overflow:hidden;
           border:5px solid ${tone};box-shadow:0 0 0 12px #05070f,0 0 90px ${tone}88,0 40px 80px #000c}
        .shot img{width:100%;height:100%;display:block}
      </style><h1><span>${first}</span><b>${second || ''}</b></h1><div class="shot"><img src="${img(name)}"></div>`,
    );
  }

  /* gráfico de cabecera: 1024×500, sin transparencia */
  const tilt = (name, x, y, r, w) =>
    `<img src="${img(name)}" style="position:absolute;left:${x}px;top:${y}px;width:${w}px;border-radius:22px;transform:rotate(${r}deg);border:3px solid #ffffff55;box-shadow:0 18px 50px #000b">`;
  await render(
    'grafico-1024x500.png',
    1024,
    500,
    `<style>
      body{background:#05070f}
      .bg{position:absolute;inset:-40px;background:url("${img('fuego-jefe')}") center 34%/cover;filter:blur(18px) brightness(.55) saturate(1.2)}
      .shade{position:absolute;inset:0;background:linear-gradient(90deg,#05070ff2 0%,#05070fcc 38%,#05070f33 70%,#05070f00 100%)}
      .t{position:absolute;left:54px;top:118px}
      h1{margin:0;font-size:92px;line-height:.94;font-weight:900;letter-spacing:5px;color:#fff;text-shadow:0 0 44px #5ee0ffaa,0 3px 0 #0009}
      h1 span{color:#5ee0ff}
      p{margin:26px 0 0;font:700 27px ${FONT};letter-spacing:1px;color:#ffd24a;text-shadow:0 2px 12px #000}
    </style><div class="bg"></div><div class="shade"></div>
    ${tilt('hielo-jefe', 560, 70, -9, 190)}${tilt('ciudad', 820, 60, 9, 190)}${tilt('fuego-jefe', 676, 26, 0, 232)}
    <div class="t"><h1>ASTRION<br><span>SPACE</span></h1><p>${TAGLINE[LANG] || TAGLINE.es}</p></div>`,
  );

  /* icono: 512×512 */
  if (LANG === 'es')
    await render('icono-512.png', 512, 512, `<style>svg{width:512px;height:512px;display:block}</style>${iconSvg()}`);
  await browser.close();
}

/* ---------- el video ---------- */
/* Horizontal (1920×1080, como lo muestra la tienda) con el juego, que es vertical, en el centro.
   Cada escena: qué se juega, cuántos cuadros se dejan pasar antes de grabar (para llegar a lo
   bueno), cuántos se graban, el fondo y el letrero. */
const FPS = 60;
const SCENES = {
  es: [
    { world: 'espacio', lead: 420, frames: 250, bg: 'espacio', a: 'Pilota por', b: '6 mundos', tone: '#5ee0ff' },
    {
      world: 'ciudad',
      lead: 1260,
      frames: 260,
      bg: 'ciudad',
      a: 'Esquiva, dispara',
      b: 'y sobrevive',
      tone: '#ff6bd0',
    },
    {
      world: 'fuego',
      boss: true,
      lead: 500,
      frames: 290,
      bg: 'fuego-jefe',
      a: 'Enfrenta',
      b: 'jefes gigantes',
      tone: '#ff8a3c',
    },
    { garage: true, lead: 150, frames: 270, bg: 'taller', a: 'Arma tu', b: 'propia nave', tone: '#ffd24a' },
    {
      world: 'hielo',
      boss: true,
      lead: 240,
      frames: 280,
      bg: 'hielo-jefe',
      a: 'Cada mundo,',
      b: 'un reto nuevo',
      tone: '#7fd8ff',
    },
    {
      world: 'agujero',
      level: 15,
      lead: 200,
      frames: 290,
      bg: 'agujero-jefe',
      a: 'Supervivencia:',
      b: '¿cuánto aguantas?',
      tone: '#c792ff',
    },
  ],
  en: [
    { world: 'espacio', lead: 420, frames: 250, bg: 'espacio', a: 'Fly through', b: '6 worlds', tone: '#5ee0ff' },
    { world: 'ciudad', lead: 1260, frames: 260, bg: 'ciudad', a: 'Dodge, shoot', b: 'and survive', tone: '#ff6bd0' },
    {
      world: 'fuego',
      boss: true,
      lead: 500,
      frames: 290,
      bg: 'fuego-jefe',
      a: 'Face',
      b: 'giant bosses',
      tone: '#ff8a3c',
    },
    { garage: true, lead: 150, frames: 270, bg: 'taller', a: 'Build your', b: 'own ship', tone: '#ffd24a' },
    {
      world: 'hielo',
      boss: true,
      lead: 240,
      frames: 280,
      bg: 'hielo-jefe',
      a: 'Every world,',
      b: 'a new challenge',
      tone: '#7fd8ff',
    },
    {
      world: 'agujero',
      level: 15,
      lead: 200,
      frames: 290,
      bg: 'agujero-jefe',
      a: 'Survival:',
      b: 'how long can you last?',
      tone: '#c792ff',
    },
  ],
};
const END = { es: 'Gratis · juega sin conexión', en: 'Free · play offline' };
const TITLE_FRAMES = 150,
  END_FRAMES = 190,
  FADE = 14;

/* el escenario: fondo, el juego en el centro, letreros a los lados y las portadas */
function stageHtml() {
  const icon = iconSvg();
  return `<!doctype html><meta charset="utf-8"><style>
*{box-sizing:border-box}html,body{margin:0;width:1920px;height:1080px;overflow:hidden;background:#05070f;font-family:${FONT};color:#fff}
#bg{position:absolute;inset:-60px;background:center/cover;filter:blur(26px) brightness(.42) saturate(1.25)}
#shade{position:absolute;inset:0;background:radial-gradient(60% 90% at 50% 50%,#05070f00 0%,#05070fcc 100%)}
#phone{position:absolute;left:656px;top:28px;width:608px;height:1024px;border-radius:40px;overflow:hidden;border:4px solid var(--tone);
  box-shadow:0 0 0 10px #05070f,0 0 110px var(--glow),0 30px 70px #000c;background:#05070f}
#game{position:absolute;left:0;top:0;width:360px;height:606.3px;border:0;transform-origin:0 0;transform:scale(1.6889)}
#cap{position:absolute;left:70px;top:0;width:540px;height:1080px;display:flex;flex-direction:column;justify-content:center;
  font-size:74px;line-height:1.08;font-weight:900;text-transform:uppercase;letter-spacing:1px;text-shadow:0 6px 40px var(--glow),0 3px 0 #000a}
#cap b{color:var(--tone)}
#side{position:absolute;left:1320px;top:0;width:540px;height:1080px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:26px}
#side svg{width:210px;height:210px;border-radius:46px;box-shadow:0 0 70px #5ee0ff66,0 18px 40px #000b}
#side div{font-size:52px;font-weight:900;letter-spacing:5px;line-height:1;text-align:center;text-shadow:0 0 34px #5ee0ffaa}
#side div span{color:#5ee0ff}
#cover{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:34px;background:#05070fd9}
#cover svg{width:300px;height:300px;border-radius:66px;box-shadow:0 0 120px #5ee0ff77,0 24px 60px #000c}
#cover h1{margin:0;font-size:150px;line-height:1;font-weight:900;letter-spacing:10px;text-shadow:0 0 70px #5ee0ffaa,0 4px 0 #000a}
#cover h1 span{color:#5ee0ff}
#cover p{margin:0;font-size:50px;font-weight:800;letter-spacing:2px;color:#ffd24a;text-shadow:0 3px 18px #000}
#black{position:absolute;inset:0;background:#000}
</style>
<div id="bg"></div><div id="shade"></div>
<div id="phone"><iframe id="game" src="about:blank"></iframe></div>
<div id="cap"><span id="capA"></span><b id="capB"></b></div>
<div id="side">${icon}<div>ASTRION<br><span>SPACE</span></div></div>
<div id="cover">${icon}<h1>ASTRION <span>SPACE</span></h1><p id="coverP"></p></div>
<div id="black"></div>
<script>
const $ = (id) => document.getElementById(id);
/* una escena nueva: fondo, letrero y color */
window.__scene = (s) => {
  $('bg').style.backgroundImage = s.bg ? 'url("capturas/' + s.bg + '.png")' : 'none';
  $('capA').textContent = s.a || '';
  $('capB').textContent = s.b || '';
  document.body.style.setProperty('--tone', s.tone || '#5ee0ff');
  document.body.style.setProperty('--glow', (s.tone || '#5ee0ff') + '88');
  $('coverP').textContent = s.p || '';
};
/* cada cuadro: cuánto negro, cuánto letrero (0 a 1) y cuánta portada */
window.__mix = (m) => {
  $('black').style.opacity = m.black;
  $('cover').style.opacity = m.cover;
  $('cover').style.transform = 'scale(' + (1.06 - 0.06 * m.coverIn) + ')';
  const play = m.cover < 1 ? 1 : 0;
  for (const id of ['phone', 'cap', 'side']) $(id).style.visibility = play ? 'visible' : 'hidden';
  $('cap').style.opacity = m.cap;
  $('cap').style.transform = 'translateX(' + (-60 * (1 - m.cap)) + 'px)';
  $('side').style.opacity = 0.35 + 0.65 * m.cap;
};
</script>`;
}

async function video() {
  const scenes = SCENES[LANG] || SCENES.es;
  const copy = capturePage();
  const stage = path.join(OUT, '_video.html'); // junto a las capturas, que usa de fondo
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(stage, stageHtml());
  const out = path.join(OUT, `video-astrion-space${LANG === 'es' ? '' : '-' + LANG}.webm`);

  /* el codificador: el que trae el navegador de las pruebas (recibe fotos, entrega WebM) */
  const base = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  const ffdir = fs.existsSync(base)
    ? fs
        .readdirSync(base)
        .filter((d) => /^ffmpeg-/.test(d))
        .sort()
        .pop()
    : '';
  const ffmpeg = process.env.FFMPEG_PATH || (ffdir && path.join(base, ffdir, 'ffmpeg-win64.exe'));
  if (!ffmpeg || !fs.existsSync(ffmpeg)) throw new Error('No encontré ffmpeg (el de Playwright o FFMPEG_PATH)');
  const enc = spawn(
    ffmpeg,
    [
      '-loglevel',
      'error',
      '-y',
      '-f',
      'image2pipe',
      '-framerate',
      String(FPS),
      '-c:v',
      'mjpeg',
      '-i',
      'pipe:0',
      '-c:v',
      'libvpx-vp9',
      '-crf',
      opt('--crf', '24'),
      '-b:v',
      '0',
      '-deadline',
      'good',
      '-cpu-used',
      '3',
      '-row-mt',
      '1',
      '-threads',
      '8',
      '-pix_fmt',
      'yuv420p',
      '-r',
      String(FPS),
      out,
    ],
    { stdio: ['pipe', 'inherit', 'inherit'] },
  );
  const done = new Promise((ok, fail) =>
    enc.on('close', (code) => (code ? fail(new Error('ffmpeg terminó con ' + code)) : ok())),
  );

  const browser = await chromium.launch({
    executablePath: findChrome(),
    args: ['--use-gl=angle', '--use-angle=d3d11', '--enable-gpu', '--ignore-gpu-blocklist', '--disable-gpu-vsync'],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
    locale: 'es-CO',
  });
  await ctx.route(/three(\.min)?\.js/, (r) => r.fulfill({ contentType: 'application/javascript', body: THREE }));
  await ctx.addInitScript(harness, { profile: profile(), seed: 5, density: 2 });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => console.log('Error de la página:', e.message));
  await page.goto(pathToFileURL(stage).href);

  let total = 0;
  const ease = (x) => 1 - Math.pow(1 - Math.min(1, Math.max(0, x)), 3);
  /* un cuadro del video: mezcla, foto y al codificador */
  const emit = async (mix) => {
    await page.evaluate((m) => window.__mix(m), mix);
    const shot = await page.screenshot({ type: 'jpeg', quality: 93 });
    if (!enc.stdin.write(shot)) await new Promise((ok) => enc.stdin.once('drain', ok));
    total++;
  };
  /* portadas (al empezar y al terminar): sin juego */
  const cover = async (frames, p, fadeIn, fadeOut) => {
    await page.evaluate((s) => window.__scene(s), { bg: 'fuego-jefe', p });
    for (let i = 0; i < frames; i++) {
      await emit({
        black: Math.max(fadeIn ? 1 - i / 24 : 0, fadeOut ? 1 - (frames - 1 - i) / 30 : 0, 0),
        cover: 1,
        coverIn: ease(i / 50),
        cap: 0,
      });
    }
  };

  const n = opt('--escena', '');
  if (!n) await cover(TITLE_FRAMES, TAGLINE[LANG] || TAGLINE.es, true, false);
  let index = 0;
  for (const s of scenes) {
    index++;
    if (n && +n !== index) continue;
    /* el juego de esta escena, desde cero, dentro del marco */
    const seed = 11 + WORLD_IDS.indexOf(s.world || 'espacio') * 7 + (s.boss ? 3 : 0) + (s.level || 0);
    await page.evaluate(
      (src) => (document.getElementById('game').src = src),
      pathToFileURL(copy).href + '?s=' + seed + '&n=' + index,
    );
    let game = null;
    for (let i = 0; i < 200 && !game; i++) {
      await page.waitForTimeout(50);
      const f = page.frames().find((x) => x.url().includes('astrion-tienda') && x.url().includes('n=' + index));
      if (f && (await f.evaluate(() => typeof window.__step === 'function').catch(() => false))) game = f;
    }
    if (!game) throw new Error('El juego no abrió en la escena ' + index);
    const step = (k) => game.evaluate((k) => window.__step(k), k);
    for (let i = 0; i < 400; i++) {
      await step(5);
      if (await game.evaluate(() => !!window.__giroMap && !!document.getElementById('mCoins').textContent.trim()))
        break;
      await page.waitForTimeout(50);
    }
    await step(60);
    await game.addStyleTag({ content: '.chk,#lvlPick,#hint{display:none!important}' });
    /* en el taller no: ahí el modo demo cambia lo que dicen los botones */
    if (!s.garage) await game.evaluate((level) => window.__demo(level), s.level || 0);
    if (s.garage) {
      await game.evaluate(() => document.getElementById('garageBtn').click());
    } else {
      await game.evaluate(({ id, level }) => (level ? window.__giroMap(id) : window.__giroWorld(id)), {
        id: s.world,
        level: s.level || 0,
      });
      for (let i = 0; i < 600; i++) if ((await step(5)).state === 'play') break;
      if (s.boss) {
        await game.evaluate(() => window.__giroBoss());
        for (let i = 0; i < 400; i++) {
          await step(5);
          if ((await game.evaluate(() => window.__giroBoss(''))) === 'fight') break;
        }
      }
    }
    await step(s.lead);
    await page.evaluate((s) => window.__scene(s), s);
    for (let i = 0; i < s.frames; i++) {
      if (s.garage) {
        /* el taller: la nave gira despacio y van pasando las naves */
        await game.evaluate(
          (next) => {
            window.__G.yaw += 0.022;
            if (next) document.getElementById('gNext').click();
          },
          i > 0 && i % 68 === 0,
        );
      }
      await step(1);
      await emit({
        black: Math.max(1 - i / FADE, 1 - (s.frames - 1 - i) / FADE, 0),
        cover: 0,
        coverIn: 1,
        cap: ease((i - 6) / 26) * Math.min(1, (s.frames - i) / 16),
      });
    }
    console.log(`  escena ${index}: ${s.garage ? 'taller' : s.world}${s.boss ? ' (jefe)' : ''} · ${total} cuadros`);
  }
  if (!n) await cover(END_FRAMES, END[LANG] || END.es, true, true);

  enc.stdin.end();
  await done;
  await browser.close();
  fs.rmSync(copy, { force: true });
  fs.rmSync(stage, { force: true });
  console.log(`${out} · ${(total / FPS).toFixed(1)} s · ${(fs.statSync(out).size / 1048576).toFixed(1)} MB`);
}

const mode = args[0];
if (mode === 'capturas') await shots();
else if (mode === 'candidatos') await candidates();
else if (mode === 'video') await video();
else if (mode === 'ficha') await listing();
else
  console.log(
    'Uso: node tools/tienda.mjs candidatos | capturas | ficha | video   [--perfil archivo.json] [--idioma es|en]',
  );

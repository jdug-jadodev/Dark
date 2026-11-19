/**
 * Página para oír la música y cada efecto por separado (probar-sonidos.html). No es parte del
 * juego: sirve para decidir qué hay que ajustar sin tener que provocarlo jugando.
 */
import { createEngine } from './engine.js';
import { MUSIC_SCENES, createMusic } from './music.js';
import { SOUNDS, createOutput } from './synth.js';
import { createTracks } from './tracks.js';

/* [efecto, nombre visible, dato, repeticiones, segundos entre repeticiones] */
const GROUPS = {
  'Menús y partida': [
    ['click', 'Botón'],
    ['count', 'Cuenta regresiva', undefined, 3, 0.9],
    ['go', '¡YA!'],
    ['pause', 'Pausa'],
    ['reward', 'Monedas de premio'],
    ['revive', 'Revivir'],
    ['win', 'Victoria'],
    ['lose', 'Fin de la partida'],
    ['phase', 'Cambio de fase o nivel'],
  ],
  'Recoger cosas': [
    ['coin', 'Moneda · opción 1', 1, 3, 0.2],
    ['coin', 'Moneda · opción 2', 2, 3, 0.2],
    ['coin', 'Moneda · opción 3', 3, 3, 0.2],
    ['near', '¡CASI!', 0],
    ['near', '¡CASI! con combo alto', 8],
    ['bonus', 'Escape gravitatorio'],
    ['power', 'Cápsula (imán, orbes)', 'magnet'],
    ['power', 'Escudo', 'shield'],
    ['power', 'Arma nueva', 'twin'],
    ['nova', 'Nova'],
  ],
  'Armas y nitro': [
    ['shot', 'Disparo doble', 'twin', 8, 0.13],
    ['shot', 'Disparo triple', 'spread', 5, 0.26],
    ['shot', 'Disparo pesado', 'heavy', 3, 0.45],
    ['laser', 'Láser (se sobrecalienta)', 'ramp', 34, 0.12],
    ['gunEmpty', 'Arma agotada'],
    ['nitro', 'Nitro'],
    ['deny', 'Nitro insuficiente'],
  ],
  'Golpes y explosiones': [
    ['rockBreak', 'Meteorito destruido'],
    ['enemyHit', 'Golpe a una nave'],
    ['enemyDown', 'Nave destruida'],
    ['shieldBreak', 'Escudo roto'],
    ['hullHit', 'Golpe al casco'],
    ['crash', 'Choque (pierdes)'],
  ],
  'Enemigos y jefes': [
    ['enemyShot', 'Disparo enemigo', false],
    ['enemyShot', 'Disparo de nave pesada', true],
    ['bossIntro', 'Llega el jefe'],
    ['bossShot', 'Ráfaga del jefe', undefined, 8, 0.1],
    ['bossCharge', 'Jefe carga un ataque'],
    ['bossHit', 'Golpe al jefe', undefined, 6, 0.13],
    ['bossDown', 'Jefe derrotado'],
  ],
  'Peligros y avisos': [
    ['alarm', 'Alerta (gira el celu)', undefined, 3, 0.6],
    ['turbulence', 'Turbulencia'],
    ['spin', 'Giro de 360° (Supervivencia)'],
    ['cometWarn', 'Aviso de cometa'],
    ['comet', 'Pasa el cometa'],
    ['portal', 'Portal'],
    ['holePull', 'Agujero negro cerca', undefined, 3, 0.5],
    ['suckStart', 'Empieza la succión'],
    ['suck', 'Alarma de succión', undefined, 6, 0.22],
    ['escape', 'Escape del agujero'],
    ['spaghetti', 'Espagueti'],
  ],
};

let ctx = null;
let buses = null;
let music = null;
let engine = null;
let tracks = null;
let playing = null; // { rec: tema grabado } o { scene, k } (tocada en vivo): la música que está sonando
function start() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    buses = createOutput(ctx);
    music = createMusic(ctx, ctx.destination);
    engine = createEngine(ctx, buses.out);
    tracks = createTracks(ctx, ctx.destination);
    setInterval(() => {
      tracks.tick(playing && playing.rec ? playing.rec : null);
      music.tick(playing && playing.scene ? playing.scene : null, playing ? playing.k : 0);
    }, 50);
  }
  ctx.resume();
}
function play(name, data, times = 1, every = 0) {
  start();
  /* 'ramp' = el dato va subiendo de 0 a 1 a lo largo de las repeticiones (el láser que se calienta) */
  for (let i = 0; i < times; i++)
    SOUNDS[name](
      { ctx, ...buses, t: ctx.currentTime + 0.03 + i * every },
      data === 'ramp' ? i / Math.max(1, times - 1) : data,
    );
}

const listed = new Set();
const root = document.getElementById('lista');

function section(title, items) {
  const h = document.createElement('h2');
  h.textContent = title;
  const grid = document.createElement('div');
  grid.className = 'grid';
  for (const [name, label, data, times, every] of items) {
    listed.add(name);
    const b = document.createElement('button');
    b.textContent = label;
    const s = document.createElement('small');
    s.textContent = name + (data === undefined ? '' : ' · ' + data);
    b.appendChild(s);
    b.addEventListener('click', () => play(name, data, times, every));
    grid.appendChild(b);
  }
  root.append(h, grid);
}
/* música: suena hasta que se elija otra o "Parar"; los efectos se pueden probar encima */
function musicSection(title, items) {
  const h = document.createElement('h2');
  h.textContent = title;
  const grid = document.createElement('div');
  grid.className = 'grid';
  for (const [what, label, note] of items) {
    const b = document.createElement('button');
    b.textContent = label;
    if (note) {
      const s = document.createElement('small');
      s.textContent = note;
      b.appendChild(s);
    }
    b.addEventListener('click', () => {
      start();
      playing = what;
    });
    grid.appendChild(b);
  }
  root.append(h, grid);
}
/* Música grabada: la misma de abajo, ya tocada y guardada como archivo. Es la que suena en el juego. */
{
  const recorded = [...document.querySelectorAll('script[data-track]')];
  if (recorded.length) {
    musicSection(
      'Música grabada · la que suena en el juego',
      recorded
        .map((el) => [{ rec: el.dataset.track }, el.dataset.title || el.dataset.track, el.dataset.track + ' · archivo'])
        .concat([[null, '⏹ Parar la música']]),
    );
    /* y para llevársela: cada tema se puede guardar como archivo */
    const p = document.createElement('p');
    p.className = 'bajar';
    p.textContent = 'Descargar: ';
    for (const el of recorded) {
      const a = document.createElement('a');
      a.textContent = el.dataset.track + '.' + el.dataset.ext;
      a.download = 'giro-estelar-' + el.dataset.track + '.' + el.dataset.ext;
      a.href = 'data:' + el.dataset.mime + ';base64,' + el.textContent.trim();
      p.append(a, ' ');
    }
    root.append(p);
  }
}
const has = ([w]) => !w || MUSIC_SCENES.includes(w.scene);
musicSection(
  'Música tocada en vivo por código · para probar cambios antes de grabar',
  [
    [{ scene: 'doom', k: 0 }, 'Partida · al empezar', 'doom · metal industrial'],
    [{ scene: 'metal', k: 0.5 }, 'Partida pesada y jefes', 'metal · metal con guitarras'],
    [{ scene: 'metal', k: 1 }, 'Partida pesada · al final', 'metal · más rápido'],
    [{ scene: 'boss', k: 1 }, 'Variante para jefes (sin usar)', 'boss · thrash con guitarras'],
    [{ scene: 'menu', k: 0 }, 'Menú', 'menu · guitarra limpia'],
    [{ scene: 'space', k: 0 }, 'Viaje espacial', 'space'],
    [null, '⏹ Parar la música'],
  ].filter(has),
);
/* motor de la nave: queda sonando hasta apagarlo */
{
  const h = document.createElement('h2');
  h.textContent = 'Motor de la nave';
  const grid = document.createElement('div');
  grid.className = 'grid';
  for (const [power, label] of [
    [0.5, 'Al empezar'],
    [0.85, 'A toda marcha'],
    [1.45, 'Con nitro'],
    [0, '⏹ Apagar el motor'],
  ]) {
    const b = document.createElement('button');
    b.textContent = label;
    b.addEventListener('click', () => {
      start();
      engine.set(power);
    });
    grid.appendChild(b);
  }
  root.append(h, grid);
}
for (const [title, items] of Object.entries(GROUPS)) section(title, items);
/* si se agrega un efecto y se olvida ponerlo arriba, igual aparece aquí */
const rest = Object.keys(SOUNDS).filter((n) => !listed.has(n));
if (rest.length)
  section(
    'Otros',
    rest.map((n) => [n, n]),
  );

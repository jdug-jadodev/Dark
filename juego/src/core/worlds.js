/**
 * Mundos: reemplazan a la Aventura. Cada mundo es un recorrido con su propio paisaje, sus
 * obstáculos, sus enemigos y un jefe al final. Vencer al jefe de un mundo abre el siguiente.
 *
 * Aquí están los datos de cada mundo y el progreso del jugador; cómo se ve cada uno está en
 * render/worlds.js (se busca por `look`).
 *
 *   S.worlds = { hielo: 2, fuego: 1 }   veces que se ha vencido al jefe de cada mundo
 *
 * Datos de un mundo:
 *   ready   = ya se puede jugar (los demás salen en el mapa como "próximamente")
 *   sky/acc = color del cielo y color de acento (rieles, marcador)
 *   len     = largo del recorrido frente a los 320 puntos de la Aventura de antes
 *   slip    = cuánto responde la nave (1 = normal; menos = resbala)
 *   holes / flip / mini = agujeros negros, giro de pantalla y jefe intermedio
 *   comets  = cosas que cruzan la pista: { every: [mín, máx] s, v: 0 lento … 1 rápido, warn: s de aviso }
 *   shot / shotHeavy = color de los disparos enemigos
 *   boss    = { name, hp (frente al jefe final de antes), look: colores }
 *   phases  = cómo se llama cada tramo del recorrido (7, como los de la Aventura de antes)
 *   shake   = cómo se llama aquí la turbulencia
 *   peaks   = obstáculos grandes plantados en la pista (montañas, volcanes): no se rompen, hay que
 *             rodearlos. { from: % del recorrido desde donde salen, every: [mín, máx] s,
 *             r: [mín, máx] radio, pair: probabilidad de que salgan dos dejando un paso, name,
 *             arch: { p: probabilidad de que salga un arco, gap: [mín, máx] paso, r: radio del pilar } }
 *   enemyRest = cuánto más tardan en salir los enemigos (1 = normal)
 *   meteors = meteoritos que caen del cielo donde está la nave: { from: %, every: [mín, máx] s, r, fuse: s de aviso }
 *   craters = cráteres que vienen por la pista y estallan: { from: %, every: [mín, máx] s, r: [mín, máx] }
 *   blast   = colores de esas explosiones
 *   boss.form = qué criatura o nave es (render/bosses.js) · boss.sig = sus ataques propios
 *   peaks.pools = charcos junto a las montañas (lava): { p: probabilidad junto a un volcán,
 *             alone: probabilidad de que salgan charcos solos, r: [mín, máx] }
 */
import { tr } from './i18n.js';
import { S, save } from './profile.js';
import { roll, trackSeed } from './util.js';

export const WORLDS = [
  /* el espacio: la Aventura de siempre. No tiene paisaje propio (look: null): se ve el espacio,
     con sus tramos de siempre, el jefe intermedio, los agujeros negros y el giro de pantalla */
  {
    id: 'espacio',
    name: tr('Espacio'),
    icon: '{planet}',
    tag: tr('Asteroides y agujeros negros · Vigía Ámbar y Centinela del Vacío'),
    ready: true,
    look: null,
    len: 1,
    slip: 1,
    holes: true,
    flip: true,
    mini: true,
    comets: null,
    shot: '#ff6b8a',
    shotHeavy: '#ffb454',
    boss: { name: tr('Centinela del Vacío'), hp: 1 },
  },
  {
    id: 'hielo',
    name: tr('Mundo de hielo'),
    icon: '{snow}',
    tag: tr('La nave resbala · montañas de hielo · drones de escarcha'),
    ready: true,
    look: 'ice',
    sky: 0x4a8cc0,
    acc: 0xbff1ff,
    len: 1.15,
    slip: 0.24,
    holes: false,
    flip: false,
    mini: false,
    comets: null,
    shot: '#9fe8ff',
    shotHeavy: '#ffffff',
    shake: tr('¡VENTISCA!'),
    peaks: { from: 5, every: [5, 8], r: [36, 50], pair: 0.25, name: 'montaña' },
    phases: [
      tr('Entrada al glaciar'),
      tr('Drones de escarcha'),
      tr('El hielo se acelera'),
      tr('Ventisca'),
      tr('Campo de témpanos'),
      tr('Grietas'),
      tr('El coloso despierta'),
    ],
    blast: ['#7fd8ff', '#ffffff'],
    boss: {
      name: tr('Coloso de Escarcha'),
      form: 'colossus',
      sig: ['spikes'],
      hp: 0.7,
      look: { body: 0x2b5e86, trim: 0x8fd8f2, em: 0x0c3048, edge: '#dff6ff', core: '#9fe8ff', scale: 1.2 },
    },
  },
  {
    id: 'fuego',
    name: tr('Mundo de fuego'),
    icon: '{fire}',
    tag: tr('Volcanes, charcos de lava y meteoritos · murciélagos de magma'),
    ready: true,
    look: 'fire',
    sky: 0x2a0806,
    acc: 0xff8a3c,
    len: 1.25,
    slip: 1,
    holes: false,
    flip: false,
    mini: false,
    comets: null,
    meteors: { from: 5, every: [3.4, 5.8], r: 42, fuse: 2.1 },
    blast: ['#ff8a2a', '#ffd24a'],
    shot: '#ffb454',
    shotHeavy: '#ffe27a',
    shake: tr('¡TEMBLOR!'),
    peaks: {
      from: 6,
      every: [5, 8],
      r: [42, 56],
      pair: 0.15,
      name: 'volcán',
      pools: { p: 0.75, alone: 0.3, r: [26, 36] },
    },
    phases: [
      tr('Tierra quemada'),
      tr('Murciélagos de magma'),
      tr('El calor aprieta'),
      tr('Temblor'),
      tr('Lluvia de fuego'),
      tr('Río de lava'),
      tr('El señor de la ceniza'),
    ],
    boss: {
      name: tr('Señor de la Ceniza'),
      form: 'ashlord',
      sig: ['meteors'],
      hp: 0.85,
      look: { body: 0x2a1512, trim: 0x8a2a12, em: 0x3a0c00, edge: '#ff8a3c', core: '#ffd54a', scale: 1.2 },
    },
  },
  {
    id: 'gases',
    name: tr('Mundo de gases'),
    icon: '{cloud}',
    tag: tr('Gas por todas partes · cráteres que estallan · montañas y arcos de piedra'),
    ready: true,
    look: 'gas',
    sky: 0x3d4a1e,
    acc: 0xb6ff5a,
    len: 1.35,
    slip: 1,
    holes: false,
    flip: false,
    mini: false,
    enemyRest: 2.4, // pocos enemigos: aquí mandan las montañas y los meteoritos
    comets: null,
    craters: { from: 4, every: [2.8, 5], r: [40, 54] },
    meteors: { from: 35, every: [7, 11], r: 40, fuse: 2.2 },
    blast: ['#9dff5a', '#e8ffb0'],
    shot: '#7ffff0',
    shotHeavy: '#d9b4ff',
    shake: tr('¡TORMENTA!'),
    peaks: {
      from: 4,
      every: [3.8, 6.2],
      r: [56, 74],
      pair: 0.3,
      name: 'montaña',
      arch: { p: 0.4, gap: [105, 250], r: 22 },
    },
    phases: [
      tr('Entre la niebla'),
      tr('Medusas de gas'),
      tr('Montañas de piedra'),
      tr('Tormenta'),
      tr('Caen meteoritos'),
      tr('El paso de los arcos'),
      tr('El titán despierta'),
    ],
    boss: {
      name: tr('Titán de la Tormenta'),
      form: 'titan',
      sig: ['craters'],
      hp: 0.95,
      look: { body: 0x3a2a5e, trim: 0x2f8a7a, em: 0x0a2a26, edge: '#7ff0d0', core: '#d9b4ff', scale: 1.2 },
    },
  },
  {
    id: 'ciudad',
    name: tr('Ciudad'),
    icon: '{city}',
    tag: tr('Torres en la pista · tráfico de frente · drones de policía'),
    ready: true,
    look: 'city',
    sky: 0x141a40,
    acc: 0x5ee0ff,
    len: 1.45,
    slip: 1,
    holes: false,
    flip: false,
    mini: false,
    comets: null,
    shot: '#ff4fc8',
    shotHeavy: '#5ee0ff',
    shake: tr('¡TEMBLOR!'),
    peaks: {
      from: 5,
      every: [4, 6.5],
      r: [34, 46],
      pair: 0.3,
      name: 'torre',
      arch: { p: 0.35, gap: [110, 250], r: 20 },
    },
    phases: [
      tr('Las afueras'),
      tr('Drones de policía'),
      tr('Hora pico'),
      tr('Temblor'),
      tr('El centro'),
      tr('Autopista elevada'),
      tr('El guardián de neón'),
    ],
    blast: ['#ff4fc8', '#8ae8ff'],
    boss: {
      name: tr('Guardián de Neón'),
      form: 'guardian',
      sig: ['strike'],
      hp: 1.05,
      look: { body: 0x1a1f4e, trim: 0xb02a8a, em: 0x2a0626, edge: '#5ee0ff', core: '#ff4fc8', scale: 1.2 },
    },
  },
  {
    id: 'agujero',
    name: tr('Agujero negro'),
    icon: '{hole}',
    tag: tr('Te jala hacia adentro · la pantalla se voltea · espectros del vacío'),
    ready: true,
    look: 'hole',
    sky: 0x0a0514,
    acc: 0xc792ff,
    len: 1.6,
    slip: 1,
    holes: true, // agujeros negros que jalan la nave: se escapa con nitro
    flip: true,
    mini: false,
    comets: null,
    shot: '#c792ff',
    shotHeavy: '#ff8a3c',
    shake: tr('¡EL ESPACIO SE DOBLA!'),
    peaks: {
      from: 6,
      every: [4.5, 7.5],
      r: [34, 46],
      pair: 0.25,
      name: 'monolito',
      arch: { p: 0.35, gap: [110, 240], r: 18 },
    },
    phases: [
      tr('El horizonte'),
      tr('Espectros del vacío'),
      tr('Caída libre'),
      tr('El espacio se dobla'),
      tr('Zona de marea'),
      tr('¡Todo al revés!'),
      tr('El devorador'),
    ],
    blast: ['#c792ff', '#ff8a3c'],
    boss: {
      name: tr('Devorador del Horizonte'),
      form: 'devourer',
      sig: ['tentacle', 'pull'],
      hp: 1.2,
      look: { body: 0x0c0718, trim: 0x4a1f90, em: 0x1a0640, edge: '#c792ff', core: '#ff8a3c', scale: 1.25 },
    },
  },
];
export const worldOf = (id) => WORLDS.find((w) => w.id === id) || null;

/* ---------- progreso ---------- */
export const worldWins = (id) => (S.worlds && S.worlds[id]) || 0;
/* Un mundo se abre al vencer al jefe del anterior. Los dos primeros (el espacio y el hielo)
   están abiertos desde el principio: el hielo ya lo estaba antes de que existiera el del espacio. */
export function worldOpen(w) {
  const i = WORLDS.indexOf(w);
  return w.ready && (i <= 1 || worldWins(WORLDS[i - 1].id) > 0);
}
export const worldsDone = () => WORLDS.filter((w) => worldWins(w.id) > 0).length;
export const worldsReady = () => WORLDS.filter((w) => w.ready).length;
/* el siguiente mundo jugable después de uno, o null */
export function nextWorld(w) {
  const n = WORLDS[WORLDS.indexOf(w) + 1];
  return n && n.ready ? n : null;
}
/* el primer mundo abierto que aún no se ha vencido (o el último abierto): el que toca jugar */
export function currentWorld() {
  const open = WORLDS.filter(worldOpen);
  return open.find((w) => !worldWins(w.id)) || open[open.length - 1];
}
/* premio por vencer al jefe: más la primera vez */
export const WORLD_FIRST = 300;
export const WORLD_AGAIN = 100;
/* se venció al jefe de un mundo. Devuelve { first, coins } (las monedas las suma quien llama) */
export function winWorld(w) {
  const first = !worldWins(w.id);
  S.worlds = { ...(S.worlds || {}), [w.id]: worldWins(w.id) + 1 };
  save();
  return { first, coins: first ? WORLD_FIRST : WORLD_AGAIN };
}

/* ---------- el mapa de Supervivencia ----------
   Cada partida de Supervivencia se juega en el mapa que se elija (ui/maps.js) o en uno al azar: el del espacio (el de siempre, null)
   o el paisaje de uno de los mundos. Solo cambia lo que se ve; las reglas de Supervivencia son
   las mismas en todos. No repite el de la partida anterior. Con semilla (un reto entre amigos),
   el mapa sale de la semilla: los dos juegan en el mismo. */
let lastMap,
  mapSeed = 0;
/* azar propio, que arranca del reloj: ni gasta el azar de la partida ni sale igual cada vez que se abre el juego */
function pickMap(n) {
  mapSeed = (Math.imul(mapSeed ^ Date.now(), 0x9e3779b1) + 0x7f4a7c15) >>> 0;
  return Math.floor((mapSeed / 4294967296) * n);
}
export function survivalMap() {
  const maps = WORLDS.filter((w) => w.ready).map((w) => (w.look ? w : null)); // el del espacio es null
  if (trackSeed() !== null) return maps[Math.floor(roll('map') * maps.length)];
  let m;
  do {
    m = maps[pickMap(maps.length)];
  } while (m === lastMap && maps.length > 1);
  return (lastMap = m);
}

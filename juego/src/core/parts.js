/**
 * Catálogo de piezas de la nave. Son solo datos (números y colores): quien las dibuja es
 * render/models/ship.js y quien sabe cuáles tiene el jugador es core/garage.js.
 *
 * Ninguna pieza cambia cómo se juega: son apariencia. Agregar una pieza es agregar un renglón aquí.
 *
 * Medidas: la nave mira hacia −z (la nariz está adelante, en z negativo), x es hacia los lados
 * e y hacia arriba. Un ala o un alerón es un polígono [x, z] de un solo lado; el otro se copia en espejo.
 */

/* Las 10 ranuras, en el orden en que salen en el taller */
export const SLOTS = [
  { id: 'hull', name: 'Casco', icon: '🚀' },
  { id: 'nose', name: 'Trompa', icon: '👃' },
  { id: 'wing', name: 'Alas', icon: '🪽' },
  { id: 'fin', name: 'Alerón', icon: '🦈' },
  { id: 'paint', name: 'Pintura', icon: '🎨' },
  { id: 'glass', name: 'Cabina', icon: '🔮' },
  { id: 'engine', name: 'Motor', icon: '⚙️' },
  { id: 'flame', name: 'Llama', icon: '🔥' },
  { id: 'gun', name: 'Armas', icon: '🎯' },
  { id: 'boom', name: 'Boom', icon: '💥' },
];

/* Rareza: decide el precio en monedas y el color con que se marca la pieza. 'base' = viene con la nave. */
export const RARITY = {
  base: { name: 'De serie', price: 0, col: '#8fa0cc' },
  c: { name: 'Común', price: 80, col: '#9fb0e0' },
  r: { name: 'Rara', price: 200, col: '#5ee0ff' },
  e: { name: 'Épica', price: 450, col: '#c792ff' },
  l: { name: 'Legendaria', price: 900, col: '#ffd54a' },
};

/* un círculo como polígono de un lado (para el platillo) */
const halfDisc = (r, n) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const a = (i / n) * Math.PI;
    return [+(Math.sin(a) * r).toFixed(2), +(-Math.cos(a) * r).toFixed(2)];
  });
const FUS = [
  [0, -13],
  [3.2, -11.5],
  [4.6, -6],
  [5, 0],
  [4.3, 7],
  [2.5, 13],
  [0, 19],
];

/* ---------- Casco: el fuselaje ----------
   prof = perfil [radio, largo], de la cola a la nariz · flat = qué tan aplastado
   seg  = caras (20 redondo, 6 tallado, 4 cuadrado) · twin = dos fuselajes, separados esa distancia
   cab  = dónde va la cabina [alto, z] · engX = separación de los motores · engZ = motores más atrás
   stripe: false = sin franja de color en la nariz · noseAt = [z, radio] donde se pega la trompa (si no, en la punta) */
const HULL = {
  aurora: { name: 'Aurora', rar: 'base', prof: FUS, flat: 0.72 },
  flecha: {
    name: 'Flecha',
    rar: 'c',
    prof: [
      [0, -13],
      [3, -11.5],
      [4.2, -6],
      [4.6, 0],
      [3.8, 8],
      [2, 14],
      [0, 21],
    ],
    flat: 0.7,
  },
  avispa: {
    name: 'Avispa',
    rar: 'c',
    prof: [
      [0, -12],
      [3.4, -10.5],
      [4.4, -5],
      [3.2, 1],
      [4.8, 7],
      [3, 13],
      [0, 20],
    ],
    flat: 0.8,
  },
  cohete: {
    name: 'Cohete',
    rar: 'c',
    prof: [
      [0, -14],
      [4, -13],
      [5.4, -8],
      [5.8, 2],
      [5, 10],
      [3, 16],
      [0, 22],
    ],
    flat: 1,
    cab: [4.6, -7],
    engX: 4,
  },
  bala: {
    name: 'Bala',
    rar: 'c',
    prof: [
      [0, -12],
      [4.8, -11],
      [5.2, -4],
      [5.2, 6],
      [4.6, 12],
      [2.6, 17],
      [0, 20],
    ],
    flat: 0.85,
    cab: [3.4, -5],
  },
  bumeran: {
    name: 'Cápsula',
    rar: 'c',
    prof: [
      [0, -8],
      [3.6, -6.5],
      [4.6, 0],
      [3.6, 6],
      [0, 13],
    ],
    flat: 0.75,
    cab: [2.6, -3],
    engZ: -2,
  },
  gota: {
    name: 'Gota',
    rar: 'r',
    prof: [
      [0, -15],
      [1.6, -11],
      [3, -5],
      [4.6, 3],
      [5.6, 9],
      [4.4, 15],
      [0, 19],
    ],
    flat: 0.8,
    cab: [3.4, -9],
  },
  tiburon: {
    name: 'Tiburón',
    rar: 'r',
    prof: [
      [0, -15],
      [2.6, -13],
      [4.6, -7],
      [5.4, 0],
      [4.8, 8],
      [2.8, 15],
      [0, 21],
    ],
    flat: 0.85,
    cab: [3.4, -5],
  },
  ladrillo: {
    name: 'Ladrillo',
    rar: 'r',
    prof: [
      [0, -13],
      [6.5, -12.5],
      [6.8, 0],
      [6.5, 11],
      [4.2, 16],
      [0, 17],
    ],
    flat: 0.62,
    seg: 4,
    cab: [3.4, -5],
  },
  manta: {
    name: 'Manta',
    rar: 'e',
    prof: [
      [0, -12],
      [4, -10.5],
      [5.6, -5],
      [6, 1],
      [5, 8],
      [2.8, 13],
      [0, 17],
    ],
    flat: 0.58,
    engX: 7,
  },
  aguja: {
    name: 'Aguja',
    rar: 'e',
    prof: [
      [0, -14],
      [2.6, -12],
      [3.6, -6],
      [3.9, 1],
      [3.2, 10],
      [1.8, 18],
      [0, 26],
    ],
    flat: 0.8,
    cab: [2.5, -7],
    engX: 5,
  },
  equis: {
    name: 'Lanza',
    rar: 'e',
    prof: [
      [0, -13],
      [3, -11.5],
      [4, -6],
      [4.2, 0],
      [3.4, 9],
      [1.8, 17],
      [0, 24],
    ],
    flat: 0.9,
    cab: [2.9, -5],
  },
  cristal: {
    name: 'Cristal',
    rar: 'e',
    prof: [
      [0, -13],
      [3.6, -9],
      [5.4, -2],
      [5, 6],
      [3, 14],
      [0, 22],
    ],
    flat: 0.75,
    seg: 6,
    cab: [3.2, -5],
  },
  platillo: {
    name: 'Platillo',
    rar: 'e',
    prof: [
      [0, -9],
      [6, -8],
      [9.5, -3.5],
      [10.5, 0],
      [9.5, 3.5],
      [6, 8],
      [0, 9],
    ],
    flat: 0.5,
    stripe: false,
    noseAt: [8.4, 3],
    cab: [4.2, 0],
    engZ: 4,
    engX: 8,
  },
  ballena: {
    name: 'Ballena',
    rar: 'l',
    prof: [
      [0, -15],
      [4, -13.5],
      [6.5, -7],
      [7.4, 1],
      [6.6, 9],
      [4, 15],
      [0, 19],
    ],
    flat: 0.82,
    cab: [5.2, -8],
    engX: 8,
  },
  catamaran: {
    name: 'Catamarán',
    rar: 'l',
    prof: [
      [0, -13],
      [2.4, -11.5],
      [3.2, -5],
      [3.4, 2],
      [2.8, 10],
      [1.6, 16],
      [0, 21],
    ],
    flat: 0.9,
    twin: 6.5,
    cab: [2.9, -3],
    engX: 6.5,
  },
};

/* ---------- Trompa: la punta de adelante ----------
   Medidas propias: 1 = el radio del fuselaje donde se pega. prof = perfil [radio, largo hacia adelante]
   para las que son de revolución; kind = las que se arman pieza por pieza (render/models/nose.js)
   droop = la punta cae · icon = dibujo para la tarjeta del taller */
const OJIVA = [
  [1, 0],
  [0.93, 0.8],
  [0.72, 1.8],
  [0.38, 2.8],
  [0, 3.3],
];
const NOSE = {
  punta: { name: 'Punta', rar: 'base' },
  redonda: {
    name: 'Redonda',
    rar: 'c',
    prof: [
      [1, 0],
      [0.96, 0.35],
      [0.78, 0.75],
      [0.45, 1.02],
      [0, 1.12],
    ],
  },
  ojiva: { name: 'Bala', rar: 'c', prof: OJIVA },
  chata: {
    name: 'Chata',
    rar: 'c',
    prof: [
      [1, 0],
      [0.9, 0.45],
      [0.82, 0.6],
      [0, 0.62],
    ],
  },
  aguja: {
    name: 'Aguja',
    rar: 'c',
    prof: [
      [1, 0],
      [0.5, 1.2],
      [0.16, 2.6],
      [0.08, 5.2],
      [0, 5.4],
    ],
  },
  cohete: {
    name: 'Punta de cohete',
    rar: 'c',
    kind: 'rocket',
    prof: [
      [1, 0],
      [0.9, 0.7],
      [0.62, 1.6],
      [0.3, 2.4],
      [0, 2.8],
    ],
    icon: '🚀',
  },
  canon: { name: 'Cañón', rar: 'r', kind: 'cannon', icon: '💣' },
  concorde: {
    name: 'Pico caído',
    rar: 'r',
    prof: [
      [1, 0],
      [0.8, 1],
      [0.45, 2.6],
      [0.15, 4.2],
      [0, 4.6],
    ],
    droop: 0.26,
  },
  toma: { name: 'Toma de aire', rar: 'r', kind: 'intake', icon: '🌀' },
  faro: { name: 'Faro', rar: 'r', kind: 'lamp', icon: '💡' },
  ariete: { name: 'Ariete', rar: 'r', kind: 'ram', icon: '🔺' },
  radar: { name: 'Radar', rar: 'r', kind: 'dish', icon: '📡' },
  pico: { name: 'Pico de pájaro', rar: 'r', kind: 'beak', icon: '🐦' },
  tenedor: { name: 'Tenedor', rar: 'r', kind: 'fork', icon: '🍴' },
  taladro: { name: 'Taladro', rar: 'e', kind: 'drill', icon: '🔩' },
  tiburon: { name: 'Boca de tiburón', rar: 'e', kind: 'shark', icon: '🦈' },
  martillo: { name: 'Martillo', rar: 'e', kind: 'hammer', icon: '🔨' },
  payaso: { name: 'Nariz de payaso', rar: 'e', kind: 'ball', icon: '🤡' },
  carro: { name: 'Capó de carro', rar: 'e', kind: 'car', icon: '🚗' },
  camion: { name: 'Camión', rar: 'e', kind: 'truck', icon: '🚚' },
  tren: { name: 'Locomotora', rar: 'e', kind: 'train', icon: '🚂' },
  sierra: { name: 'Pez sierra', rar: 'e', kind: 'saw', icon: '🪚' },
  pinzas: { name: 'Tenazas', rar: 'e', kind: 'claws', icon: '🦞' },
  cerdo: { name: 'Hocico', rar: 'l', kind: 'snout', icon: '🐷' },
  unicornio: { name: 'Cuerno de unicornio', rar: 'l', kind: 'horn', icon: '🦄' },
  trompeta: { name: 'Trompeta', rar: 'l', kind: 'trumpet', icon: '🎺' },
  elefante: { name: 'Trompa de elefante', rar: 'l', kind: 'trunk', icon: '🐘' },
  dragon: { name: 'Cabeza de dragón', rar: 'l', kind: 'dragon', icon: '🐲' },
};

/* ---------- Alas ----------
   wing = ala · canard = segunda ala pequeña (adelante o atrás) · wing2 = otro par de alas
   up = cuánto suben las puntas (radianes; negativo, bajan) · tips = aletas con luz en la punta */
const WING = {
  aurora: {
    name: 'Clásicas',
    rar: 'base',
    wing: [
      [3, -6],
      [19, 6],
      [20, 10],
      [3, 8],
    ],
    tips: true,
  },
  flecha: {
    name: 'Delta',
    rar: 'c',
    wing: [
      [3, -11],
      [22, 9],
      [22, 12],
      [3, 9],
    ],
  },
  cometa: {
    name: 'Diamante',
    rar: 'c',
    wing: [
      [3, -13],
      [21, 3],
      [3, 12],
    ],
  },
  planeador: {
    name: 'Planeador',
    rar: 'c',
    wing: [
      [3, -5],
      [26, -3],
      [26, 2],
      [3, 5],
    ],
  },
  mini: {
    name: 'Mini',
    rar: 'c',
    wing: [
      [3, -3],
      [11, 1],
      [11, 5],
      [3, 6],
    ],
  },
  ninguna: { name: 'Sin alas', rar: 'c', wing: [] },
  sin: {
    name: 'Alitas',
    rar: 'c',
    wing: [
      [3, 0],
      [6.5, 2],
      [6.5, 5],
      [3, 6],
    ],
  },
  cohete: {
    name: 'De cohete',
    rar: 'c',
    wing: [
      [4, 3],
      [13, 12],
      [13, 16],
      [4, 11],
    ],
  },
  avispa: {
    name: 'Avispa',
    rar: 'c',
    wing: [
      [3, -9],
      [15, -6],
      [17, -1],
      [3, 2],
    ],
    canard: [
      [2.5, 6],
      [11, 9],
      [11, 13],
      [2.5, 12],
    ],
  },
  halcon: {
    name: 'Halcón',
    rar: 'r',
    wing: [
      [3, 0],
      [20, -8],
      [21, -4],
      [3, 9],
    ],
    canard: [
      [2.5, -13],
      [9.5, -10],
      [9.5, -8],
      [2.5, -8.5],
    ],
    tips: true,
  },
  tiburon: {
    name: 'Aletas',
    rar: 'r',
    wing: [
      [3, -4],
      [17, 5],
      [15, 9],
      [3, 6],
    ],
    canard: [
      [1.5, 9],
      [9, 15],
      [8, 18],
      [1.5, 14],
    ],
  },
  cangrejo: {
    name: 'Pinzas',
    rar: 'r',
    wing: [
      [3, -4],
      [14, -6],
      [17, -19],
      [21, -18],
      [21, -2],
      [16, 8],
      [3, 9],
    ],
  },
  biplano: {
    name: 'Biplano',
    rar: 'r',
    wing: [
      [3, -6],
      [21, -4],
      [21, 3],
      [3, 5],
    ],
    wing2: {
      pts: [
        [0, -5],
        [18, -3.5],
        [18, 2.5],
        [0, 4],
      ],
      y: 7.2,
      struts: 13,
    },
  },
  bumeran: {
    name: 'Bumerán',
    rar: 'r',
    wing: [
      [2, -15],
      [27, 8],
      [25, 13],
      [13, 4],
      [2, 3],
    ],
  },
  gaviota: {
    name: 'Gaviota',
    rar: 'r',
    wing: [
      [2, -6],
      [21, -1],
      [21, 4],
      [2, 7],
    ],
    up: 0.38,
  },
  caidas: {
    name: 'Caídas',
    rar: 'r',
    wing: [
      [2, -6],
      [20, 2],
      [20, 7],
      [2, 8],
    ],
    up: -0.32,
  },
  sierra: {
    name: 'Sierra',
    rar: 'r',
    wing: [
      [3, -7],
      [21, 3],
      [21, 7],
      [17, 5],
      [15, 10],
      [11, 6],
      [9, 11],
      [5, 7],
      [3, 10],
    ],
  },
  manta: {
    name: 'Manta',
    rar: 'e',
    wing: [
      [3, -10],
      [12, -6],
      [25, 5],
      [23, 10],
      [10, 11],
      [3, 10],
    ],
  },
  aguja: {
    name: 'Dardo',
    rar: 'e',
    wing: [
      [2.5, 1],
      [15, 10],
      [15, 13],
      [2.5, 11],
    ],
    canard: [
      [2, -15],
      [7.5, -11.5],
      [7.5, -10],
      [2, -10.5],
    ],
  },
  equis: {
    name: 'En equis',
    rar: 'e',
    wing: [
      [2, -1],
      [22, 3],
      [22, 7],
      [2, 9],
    ],
    up: 0.42,
    wing2: {
      pts: [
        [2, -1],
        [22, 3],
        [22, 7],
        [2, 9],
      ],
      y: -0.6,
      up: -0.42,
    },
  },
  murcielago: {
    name: 'Murciélago',
    rar: 'e',
    wing: [
      [3, -8],
      [22, -5],
      [25, 2],
      [19, 4],
      [21, 10],
      [14, 7],
      [13, 13],
      [8, 9],
      [3, 10],
    ],
  },
  mariposa: {
    name: 'Mariposa',
    rar: 'e',
    wing: [
      [2, -2],
      [10, -14],
      [20, -16],
      [24, -8],
      [14, 0],
      [22, 6],
      [18, 14],
      [8, 12],
      [2, 4],
    ],
  },
  hoja: {
    name: 'Hoja',
    rar: 'e',
    wing: [
      [2, -10],
      [10, -9],
      [18, -3],
      [21, 5],
      [16, 11],
      [8, 9],
      [2, 6],
    ],
  },
  disco: { name: 'Platillo', rar: 'e', wing: halfDisc(21, 10) },
  tridente: {
    name: 'Tridente',
    rar: 'l',
    wing: [
      [3, -7],
      [21, -15],
      [23, -11],
      [11, 2],
      [21, 9],
      [21, 12],
      [3, 9],
    ],
  },
  estrella: {
    name: 'Estrella ninja',
    rar: 'l',
    wing: [
      [0, -25],
      [5, -6],
      [24, 0],
      [5, 6],
      [0, 25],
    ],
  },
  angel: {
    name: 'Alas de ángel',
    rar: 'l',
    wing: [
      [2, -4],
      [12, -12],
      [22, -13],
      [26, -8],
      [22, -6],
      [25, -2],
      [20, 0],
      [23, 4],
      [17, 5],
      [19, 9],
      [12, 8],
      [2, 7],
    ],
    up: 0.22,
  },
};

/* ---------- Alerones (la cola) ----------
   Cada alerón: x = separación del centro (0 = uno solo al centro; si no, va en pareja)
   h = alto · l = largo · z = qué tan atrás · tilt = cuánto se abre hacia afuera (radianes; negativo, hacia adentro)
   y = desde qué altura sale · box = tabla recta en vez de triángulo · t = grosor
   plank = tabla horizontal [ancho, grosor, largo] a la altura y */
const FIN = {
  par: { name: 'Clásicos', rar: 'base', fins: [{ box: true, x: 3.4, h: 6, l: 6.5, z: 8.5, tilt: 0.38 }] },
  ve: { name: 'Cola en V', rar: 'c', fins: [{ x: 2.2, h: 9, l: 7, z: 9, tilt: 0.75 }] },
  veAbierta: { name: 'V abierta', rar: 'c', fins: [{ x: 2.4, h: 10.5, l: 7, z: 9, tilt: 1.1 }] },
  timon: { name: 'Timón', rar: 'c', fins: [{ x: 0, h: 8, l: 8, z: 8.5 }] },
  rectos: { name: 'Gemelos rectos', rar: 'c', fins: [{ x: 4, h: 7, l: 6.5, z: 8.5, tilt: 0 }] },
  ninguno: { name: 'Sin alerones', rar: 'c', fins: [] },
  tiburon: { name: 'Aleta de tiburón', rar: 'r', fins: [{ x: 0, h: 11, l: 9, z: 1 }] },
  te: {
    name: 'Cola en T',
    rar: 'r',
    fins: [
      { x: 0, h: 8, l: 7, z: 9 },
      { plank: [12, 0.6, 3.4], y: 8.8, z: 10.6 },
    ],
  },
  hache: {
    name: 'Cola en H',
    rar: 'r',
    fins: [
      { plank: [17, 0.6, 4], y: 1.8, z: 10 },
      { x: 8.5, h: 6.5, l: 5, z: 10, tilt: 0, y: -1.2 },
    ],
  },
  veInvertida: { name: 'V invertida', rar: 'r', fins: [{ x: 6.2, h: 9, l: 7, z: 9, tilt: -0.66 }] },
  cresta: {
    name: 'Cresta',
    rar: 'r',
    fins: [
      { x: 0, h: 4.5, l: 4.5, z: -1 },
      { x: 0, h: 5.5, l: 4.5, z: 4 },
      { x: 0, h: 6.5, l: 4.5, z: 9 },
    ],
  },
  tridente: {
    name: 'Tres puntas',
    rar: 'e',
    fins: [
      { x: 0, h: 8, l: 7, z: 9 },
      { x: 2.6, h: 7, l: 6.5, z: 9, tilt: 0.9 },
    ],
  },
  equis: {
    name: 'Cola en X',
    rar: 'e',
    fins: [
      { x: 2.4, h: 7.5, l: 6.5, z: 9, tilt: 0.6 },
      { x: 2.4, h: 6.5, l: 6.5, z: 9, tilt: 2.45, y: -0.4 },
    ],
  },
  spoiler: {
    name: 'Alerón de carro',
    rar: 'e',
    fins: [
      { box: true, x: 4.2, h: 4.4, l: 1.2, z: 11, tilt: 0, t: 0.6 },
      { plank: [16, 0.6, 3.8], y: 5.1, z: 11.4 },
      { box: true, x: 7.8, h: 2.4, l: 4.4, z: 11.4, tilt: 0, y: 3.6, t: 0.5 },
    ],
  },
  orejas: { name: 'Orejas', rar: 'e', fins: [{ x: 2.8, h: 5.5, l: 4, z: -9, tilt: 0.25 }] },
  cuernos: { name: 'Cuernos', rar: 'e', fins: [{ x: 3.2, h: 8, l: 2.6, z: -5, tilt: 0.95 }] },
  abanico: {
    name: 'Abanico',
    rar: 'l',
    fins: [
      { x: 0, h: 9, l: 6, z: 9 },
      { x: 1.6, h: 8.5, l: 6, z: 9, tilt: 0.5 },
      { x: 3, h: 7.5, l: 6, z: 9, tilt: 1 },
    ],
  },
  espinas: {
    name: 'Espinas de dragón',
    rar: 'l',
    fins: [
      { x: 0, h: 3.2, l: 3, z: -8 },
      { x: 0, h: 4, l: 3, z: -4.5 },
      { x: 0, h: 4.8, l: 3, z: -1 },
      { x: 0, h: 5.6, l: 3, z: 2.5 },
      { x: 0, h: 6.4, l: 3, z: 6 },
      { x: 0, h: 7.2, l: 3.4, z: 9.5 },
      { x: 3, h: 5, l: 5, z: 9, tilt: 1.2 },
    ],
  },
};

/* ---------- Pintura ----------
   c = color de alas, nariz y alerones · body = color del fuselaje · glow = brillo propio
   chrome = refleja como metal pulido
   fx = pintura especial (el efecto vive en render/models/ship.js); a y b son sus dos colores:
     shift    tornasol: cambia de a hacia b según el ángulo desde el que se mira
     spectrum prisma: todo el arcoíris según el ángulo
     rainbow  arcoíris que corre por la nave
     ghost    espectro: translúcida, con el borde encendido
     pulse    neón que late
     holo     holograma con líneas que suben
     glitter  escarcha: destellos que titilan
     lava     vetas de luz que se mueven */
const WHITE = '#d8e0f0';
const SOLID = [
  ['rojo', 'Rojo', '#ff4a4a'],
  ['coral', 'Coral', '#ff7a66'],
  ['naranja', 'Naranja', '#ff8a2a'],
  ['ambar', 'Ámbar', '#ffb454'],
  ['amarillo', 'Amarillo', '#ffe14a'],
  ['lima', 'Lima', '#a6f25e'],
  ['verde', 'Verde', '#3ddc6a'],
  ['menta', 'Menta', '#6ef2c0'],
  ['turquesa', 'Turquesa', '#2ad4c4'],
  ['celeste', 'Celeste', '#8fd0ff'],
  ['azul', 'Azul', '#3d7bff'],
  ['indigo', 'Índigo', '#5a55e8'],
  ['violeta', 'Violeta', '#a06bff'],
  ['lila', 'Lila', '#c9a6ff'],
  ['magenta', 'Magenta', '#e84adf'],
  ['rosa', 'Rosa', '#ff6bb0'],
  ['blanco', 'Blanco', '#ffffff'],
  ['grafito', 'Grafito', '#7d879c'],
];
/* dos colores: [id, nombre, fuselaje, alas] */
const DUO = [
  ['fuego', 'Fuego', '#ffd9a0', '#ff5a4a'],
  ['hielo', 'Hielo', '#a8dcff', '#ffffff'],
  ['oceano', 'Océano', '#2a6bd8', '#e8f6ff'],
  ['sandia', 'Sandía', '#3fbf5a', '#ff5a8a'],
  ['abeja', 'Abeja', '#ffd23c', '#22242e'],
  ['panda', 'Panda', '#f4f6fa', '#22242e'],
  ['chicle', 'Chicle', '#ff8fd0', '#6ee8ff'],
  ['uva', 'Uva', '#7a3fd0', '#b4ff5e'],
  ['mandarina', 'Mandarina', '#ff8a2a', '#ffffff'],
  ['selva', 'Selva', '#5d7a3a', '#e0c890'],
  ['carbon', 'Carbón', '#23252e', '#ff4a4a'],
  ['patrulla', 'Patrulla', '#1c2f6a', '#ffffff'],
];
const PAINT = { cian: { name: 'Cian', rar: 'base', c: '#5ee0ff', body: WHITE } };
for (const [id, name, c] of SOLID) PAINT[id] = { name, rar: 'c', c, body: WHITE };
for (const [id, name, body, c] of DUO) PAINT[id] = { name, rar: 'r', c, body };
Object.assign(PAINT, {
  sigilo: { name: 'Sigilo', rar: 'e', c: '#5ee0ff', body: '#232842', glow: 0.5 },
  medianoche: { name: 'Medianoche', rar: 'e', c: '#c792ff', body: '#1a1f4a', glow: 0.45 },
  carmesi: { name: 'Carmesí', rar: 'e', c: '#ffd54a', body: '#b3202e' },
  neonVerde: { name: 'Neón verde', rar: 'e', c: '#5eff8a', body: '#10241a', fx: 'pulse', a: '#5eff8a' },
  neonRosa: { name: 'Neón rosa', rar: 'e', c: '#ff5fd0', body: '#2a1026', fx: 'pulse', a: '#ff5fd0' },
  neonAzul: { name: 'Neón azul', rar: 'e', c: '#5ecbff', body: '#0e1c33', fx: 'pulse', a: '#5ecbff' },
  escarcha: { name: 'Escarcha', rar: 'e', c: '#bfe9ff', body: '#5a9ad8', fx: 'glitter', b: '#ffffff' },
  galaxia: { name: 'Galaxia', rar: 'e', c: '#8a5cff', body: '#1a1040', fx: 'glitter', b: '#ffd6ff' },
  cromo: { name: 'Cromo', rar: 'e', c: '#e8f0ff', body: '#dfe6f2', chrome: true },
  cobre: { name: 'Cobre', rar: 'e', c: '#ff9a5a', body: '#d8743c', chrome: true },
  obsidiana: { name: 'Obsidiana', rar: 'e', c: '#5a6078', body: '#2a2c3a', chrome: true },
  tornasol: {
    name: 'Tornasol escarabajo',
    rar: 'e',
    c: '#3ddc8a',
    body: '#3ddc8a',
    fx: 'shift',
    a: '#19c46a',
    b: '#8a3cff',
  },
  tornasolMar: {
    name: 'Tornasol marino',
    rar: 'e',
    c: '#3d9bff',
    body: '#3d9bff',
    fx: 'shift',
    a: '#2a7bff',
    b: '#ff5fc0',
  },
  tornasolSol: {
    name: 'Tornasol atardecer',
    rar: 'e',
    c: '#ff9a3c',
    body: '#ff9a3c',
    fx: 'shift',
    a: '#ffb02a',
    b: '#e83a9a',
  },
  tornasolAurora: {
    name: 'Tornasol aurora',
    rar: 'l',
    c: '#5ee0ff',
    body: '#5ee0ff',
    fx: 'shift',
    a: '#4ae8e0',
    b: '#b4ff5e',
  },
  holograma: { name: 'Holograma', rar: 'l', c: '#6ef2ff', body: '#6ef2ff', fx: 'holo', a: '#6ef2ff' },
  lava: { name: 'Lava', rar: 'l', c: '#ff7a1a', body: '#2a1210', fx: 'lava', a: '#2a1210', b: '#ff6a10' },
  plasmaVivo: { name: 'Plasma vivo', rar: 'l', c: '#c792ff', body: '#160c33', fx: 'lava', a: '#160c33', b: '#b45cff' },
  espectro: { name: 'Espectro', rar: 'l', c: '#8ff2ff', body: '#8ff2ff', fx: 'ghost', a: '#7ae8ff' },
  espectroRojo: { name: 'Espectro rojo', rar: 'l', c: '#ff7a8a', body: '#ff7a8a', fx: 'ghost', a: '#ff5a6e' },
  fantasma: { name: 'Fantasma', rar: 'l', c: '#ffffff', body: '#ffffff', fx: 'ghost', a: '#e8f0ff' },
  prisma: { name: 'Prisma', rar: 'l', c: '#ffffff', body: '#ffffff', fx: 'spectrum' },
  arcoiris: { name: 'Arcoíris', rar: 'l', c: '#ffffff', body: '#ffffff', fx: 'rainbow' },
  oro: { name: 'Oro', rar: 'l', c: '#ffd24a', body: '#f2c23c', chrome: true },
});

/* ---------- Cabina ----------
   c = color del vidrio · em = brillo propio · s = tamaño [ancho, alto, largo]
   kind = forma: (nada) burbuja · gem cristal tallado · box cuadrada · wedge cuña · twin dos en fila ·
          triple tres · eye ojo · cage con jaula · antenna con antenas · crown con corona */
const GLASS = {
  burbuja: { name: 'Burbuja', rar: 'base', c: '#8fe6ff', em: '#0f3a55', s: [2.9, 2.2, 6.2] },
  visor: { name: 'Visor ámbar', rar: 'c', c: '#ffc46b', em: '#553a0f', s: [3.5, 1.6, 5] },
  larga: { name: 'Larga esmeralda', rar: 'c', c: '#7dffb0', em: '#0f5533', s: [2.4, 1.9, 8.4] },
  cupula: { name: 'Cúpula', rar: 'c', c: '#bfe9ff', em: '#0f3a55', s: [3.6, 3.4, 4.2] },
  camioneta: { name: 'Camioneta', rar: 'c', c: '#8fe6ff', em: '#0f3a55', s: [5.4, 3, 6], kind: 'box' },
  rubi: { name: 'Burbuja rubí', rar: 'c', c: '#ff6b7a', em: '#551018', s: [2.9, 2.2, 6.2] },
  rosada: { name: 'Burbuja rosa', rar: 'r', c: '#ff9be0', em: '#551045', s: [3.1, 2.5, 6] },
  polar: { name: 'Polarizada', rar: 'r', c: '#20263a', em: '#000000', s: [3.5, 1.6, 5], metal: 0.9 },
  cristal: { name: 'Cristal tallado', rar: 'r', c: '#8fe6ff', em: '#12506e', s: [3.2, 2.6, 7], kind: 'gem' },
  diamante: { name: 'Diamante rosa', rar: 'r', c: '#ffa8e8', em: '#6a1458', s: [3.2, 3, 5.4], kind: 'gem' },
  cuna: { name: 'Cuña', rar: 'r', c: '#3a4468', em: '#0a1024', s: [3.4, 2.6, 9], kind: 'wedge', metal: 0.7 },
  alien: { name: 'Alienígena', rar: 'r', c: '#9dff7a', em: '#1d5a10', s: [3.1, 2.8, 5], kind: 'antenna' },
  biplaza: { name: 'Biplaza', rar: 'e', c: '#8fe6ff', em: '#0f3a55', s: [2.6, 2.1, 3.8], kind: 'twin' },
  triple: { name: 'Tres ojos', rar: 'e', c: '#ffd86b', em: '#5a400a', s: [2, 1.9, 2.6], kind: 'triple' },
  jaula: { name: 'Enjaulada', rar: 'e', c: '#8fe6ff', em: '#0f3a55', s: [3.1, 2.5, 6.2], kind: 'cage' },
  neon: { name: 'Neón', rar: 'e', c: '#5eff8a', em: '#2adf5a', s: [2.9, 2.2, 6.2] },
  magma: { name: 'Magma', rar: 'e', c: '#ff8a3c', em: '#e0500a', s: [3.4, 2.4, 5.4], kind: 'gem' },
  ciclope: { name: 'Cíclope', rar: 'e', c: '#ffffff', em: '#666666', s: [3.6, 3.6, 3.6], kind: 'eye' },
  espejo: { name: 'Espejo dorado', rar: 'l', c: '#ffe08a', em: '#3a2a00', s: [2.6, 2, 8], chrome: true },
  corona: { name: 'Coronada', rar: 'l', c: '#c792ff', em: '#3a1a6a', s: [3.1, 2.6, 5.6], kind: 'crown' },
};

/* ---------- Motores ----------
   pods = cada motor es [x, y, tamaño] · sides = caras de la tobera (16 redonda, 6 hexagonal, 4 cuadrada)
   rings = aros de luz · long = qué tan largos · bell = boca ancha · spike = punta en el centro · col = color
   extra = algo más que toberas: props hélice en cada motor · nose hélice en la nariz · fans ventiladores ·
           rotor de helicóptero · v8 motor de carro · halo anillo de luz */
const TWIN = [
  [-6, -0.4, 1],
  [6, -0.4, 1],
];
const ENGINE = {
  gemelos: { name: 'Gemelos', rar: 'base', pods: TWIN },
  turbina: { name: 'Turbina', rar: 'c', pods: [[0, -0.6, 1.5]] },
  cohetes: {
    name: 'Cohetes largos',
    rar: 'c',
    long: 1.7,
    pods: [
      [-6, -0.4, 0.75],
      [6, -0.4, 0.75],
    ],
  },
  campanas: { name: 'Campanas', rar: 'c', bell: true, pods: TWIN },
  rojos: { name: 'Gemelos rojos', rar: 'c', col: '#a3242e', pods: TWIN },
  cuadrados: { name: 'Cuadrados', rar: 'r', sides: 4, pods: TWIN },
  trimotor: {
    name: 'Trimotor',
    rar: 'r',
    pods: [
      [-6.5, -0.4, 0.9],
      [6.5, -0.4, 0.9],
      [0, 3.4, 0.75],
    ],
  },
  cuadruple: {
    name: 'Cuádruple',
    rar: 'r',
    pods: [
      [-4.4, -0.4, 0.7],
      [4.4, -0.4, 0.7],
      [-9.4, -0.5, 0.58],
      [9.4, -0.5, 0.58],
    ],
  },
  apilados: {
    name: 'Apilados',
    rar: 'r',
    pods: [
      [-5.5, -1.4, 0.72],
      [5.5, -1.4, 0.72],
      [-5.5, 2.6, 0.72],
      [5.5, 2.6, 0.72],
    ],
  },
  alares: {
    name: 'De ala',
    rar: 'r',
    pods: [
      [-14, -0.4, 0.8],
      [14, -0.4, 0.8],
    ],
  },
  hexa: {
    name: 'Hexagonales',
    rar: 'e',
    sides: 6,
    pods: [
      [-7, -0.4, 1.3],
      [7, -0.4, 1.3],
    ],
  },
  aerospike: { name: 'Aeroespiga', rar: 'e', spike: true, bell: true, pods: TWIN },
  enjambre: {
    name: 'Enjambre',
    rar: 'e',
    pods: [
      [-10, -0.4, 0.5],
      [-6, -0.4, 0.5],
      [-2, -0.4, 0.5],
      [2, -0.4, 0.5],
      [6, -0.4, 0.5],
      [10, -0.4, 0.5],
    ],
  },
  dorados: { name: 'Dorados', rar: 'e', col: '#c9962a', rings: 1, pods: TWIN },
  ionicos: {
    name: 'Iónicos',
    rar: 'l',
    rings: 3,
    pods: [
      [-6.5, -0.4, 1.1],
      [6.5, -0.4, 1.1],
    ],
  },
  nodriza: {
    name: 'Nodriza',
    rar: 'l',
    rings: 2,
    bell: true,
    pods: [
      [0, 0.4, 1.45],
      [-8, -0.6, 0.6],
      [8, -0.6, 0.6],
      [-12, -0.6, 0.45],
      [12, -0.6, 0.45],
    ],
  },
  gigantes: {
    name: 'Gigantes',
    rar: 'r',
    pods: [
      [-8, 0, 1.6],
      [8, 0, 1.6],
    ],
  },
  torre: {
    name: 'Torre',
    rar: 'r',
    pods: [
      [0, -1, 0.8],
      [0, 2.6, 0.8],
      [0, 6.2, 0.8],
    ],
  },
  escapes: {
    name: 'Escapes de carro',
    rar: 'c',
    col: '#b8c0d0',
    long: 1.6,
    pods: [
      [-7.2, -1, 0.36],
      [-5, -1, 0.36],
      [5, -1, 0.36],
      [7.2, -1, 0.36],
    ],
  },
  helices: { name: 'Hélices', rar: 'r', extra: 'props', long: 0.7, pods: TWIN },
  avioneta: {
    name: 'Avioneta',
    rar: 'r',
    extra: 'nose',
    pods: [
      [-5, -0.6, 0.5],
      [5, -0.6, 0.5],
    ],
  },
  ventiladores: {
    name: 'Ventiladores',
    rar: 'e',
    extra: 'fans',
    long: 0.55,
    pods: [
      [-8, 0, 1.2],
      [8, 0, 1.2],
    ],
  },
  helicoptero: { name: 'Helicóptero', rar: 'e', extra: 'rotor', pods: [[0, -0.6, 0.8]] },
  v8: {
    name: 'Motor V8',
    rar: 'e',
    extra: 'v8',
    col: '#c8d0e0',
    long: 1.1,
    pods: [
      [-6.4, 3, 0.34],
      [-6.4, 4.6, 0.34],
      [6.4, 3, 0.34],
      [6.4, 4.6, 0.34],
    ],
  },
  reactor: { name: 'Anillo reactor', rar: 'l', extra: 'halo', pods: [[0, 0, 1.2]] },
};

/* ---------- Llama ----------
   out = fuego de afuera · in = centro · ring = aro de la tobera
   style = cómo se mueve: pulse late · long larga y delgada · needle aguja · wide corta y gorda ·
           strobe parpadea · rainbow cambia de color
   shape = forma: (nada) cono · crystal pirámide · diamonds rombos de choque
   trail = estela que deja la nave como un camino: cols = colores de la cabeza a la cola
           ('rainbow' = arcoíris), w = ancho, len = largo
           stamp = el camino es de figuras sueltas (heart, star, note, snow, bubble, spark, bolt, paw, pixel);
           size = tamaño de cada figura · ribbon: true = además lleva la cinta de luz */
const FLAME_COLOR = [
  ['azul', 'Azul', '#4fc3ff', '#e6fbff'],
  ['toxica', 'Tóxica', '#7dff5e', '#f0ffd0'],
  ['roja', 'Roja', '#ff3b3b', '#ffd0a0'],
  ['amarilla', 'Amarilla', '#ffd54a', '#ffffff'],
  ['blanca', 'Blanca', '#dfe9ff', '#ffffff'],
  ['rosada', 'Rosada', '#ff5fb0', '#ffe0f0'],
  ['violeta', 'Violeta', '#b46bff', '#ffd6ff'],
  ['turquesa', 'Turquesa', '#2ad4c4', '#e0fff8'],
];
const FLAME = { naranja: { name: 'Naranja', rar: 'base', out: '#ff8a3c', in: '#fff2c0', ring: '#ffb454' } };
for (const [id, name, out, inn] of FLAME_COLOR) FLAME[id] = { name, rar: 'c', out, in: inn, ring: out };
Object.assign(FLAME, {
  plasma: { name: 'Plasma', rar: 'r', out: '#b46bff', in: '#ffd6ff', ring: '#c792ff', style: 'pulse' },
  rosa: { name: 'Rosa larga', rar: 'r', out: '#ff5fb0', in: '#ffe0f0', ring: '#ff9be0', style: 'long' },
  aguja: { name: 'Aguja azul', rar: 'r', out: '#4fc3ff', in: '#ffffff', ring: '#8fe6ff', style: 'needle' },
  postquemador: { name: 'Postquemador', rar: 'r', out: '#ff6a2a', in: '#8fd0ff', ring: '#ffb454', style: 'wide' },
  cristal: { name: 'Cristal', rar: 'r', out: '#5ee0ff', in: '#ffffff', ring: '#8fe6ff', shape: 'crystal' },
  hieloFuego: { name: 'Hielo y fuego', rar: 'r', out: '#4fa8ff', in: '#ffb02a', ring: '#ffb454' },
  estrobo: { name: 'Estrobo', rar: 'r', out: '#ffffff', in: '#ffffff', ring: '#ffffff', style: 'strobe' },
  pulso: { name: 'Pulso rojo', rar: 'e', out: '#ff3b3b', in: '#ffd0a0', ring: '#ff6b5a', style: 'pulse' },
  fusion: { name: 'Fusión', rar: 'e', out: '#bfe9ff', in: '#ffffff', ring: '#ffffff', style: 'long' },
  rombos: { name: 'Rombos de choque', rar: 'e', out: '#ff8a3c', in: '#fff2c0', ring: '#ffb454', shape: 'diamonds' },
  rombosAzul: { name: 'Rombos azules', rar: 'e', out: '#4fc3ff', in: '#ffffff', ring: '#8fe6ff', shape: 'diamonds' },
  esmeralda: {
    name: 'Cristal esmeralda',
    rar: 'e',
    out: '#3ddc6a',
    in: '#e0ffd0',
    ring: '#6ef2a5',
    shape: 'crystal',
    style: 'pulse',
  },
  caminoLuz: {
    name: 'Camino de luz',
    rar: 'e',
    out: '#5ee0ff',
    in: '#ffffff',
    ring: '#8fe6ff',
    trail: { cols: ['#ffffff', '#5ee0ff', '#2a5cff'], w: 1, len: 1 },
  },
  caminoRosa: {
    name: 'Camino rosa',
    rar: 'e',
    out: '#ff5fb0',
    in: '#ffe0f0',
    ring: '#ff9be0',
    trail: { cols: ['#ffffff', '#ff6bd0', '#8a3cff'], w: 1, len: 1 },
  },
  caminoFuego: {
    name: 'Camino de fuego',
    rar: 'e',
    out: '#ff6a2a',
    in: '#fff2c0',
    ring: '#ffb454',
    trail: { cols: ['#fff2c0', '#ff8a2a', '#c81e1e'], w: 1.1, len: 1.1 },
  },
  caminoOro: {
    name: 'Camino dorado',
    rar: 'l',
    out: '#ffd54a',
    in: '#ffffff',
    ring: '#ffe9a0',
    trail: { cols: ['#ffffff', '#ffd54a', '#ff8a1a'], w: 1.3, len: 1.3 },
  },
  cometa: {
    name: 'Cola de cometa',
    rar: 'l',
    out: '#bfe9ff',
    in: '#ffffff',
    ring: '#ffffff',
    style: 'long',
    trail: { cols: ['#ffffff', '#bfe9ff', '#4f8aff'], w: 2, len: 1.6 },
  },
  arcoiris: { name: 'Arcoíris', rar: 'l', out: '#ff5a4a', in: '#ffffff', ring: '#ffffff', style: 'rainbow' },
  caminoArcoiris: {
    name: 'Camino arcoíris',
    rar: 'l',
    out: '#ff5a4a',
    in: '#ffffff',
    ring: '#ffffff',
    style: 'rainbow',
    trail: { cols: 'rainbow', w: 1.4, len: 1.5 },
  },
  burbujas: {
    name: 'Burbujas',
    rar: 'r',
    out: '#4fc3ff',
    in: '#e6fbff',
    ring: '#8fe6ff',
    trail: { stamp: 'bubble', cols: ['#ffffff', '#8fe6ff', '#4f8aff'], size: 11, len: 1.5 },
  },
  chispas: {
    name: 'Chispas',
    rar: 'r',
    out: '#ff8a3c',
    in: '#fff2c0',
    ring: '#ffb454',
    trail: { stamp: 'spark', cols: ['#ffffff', '#ffd54a', '#ff5a1a'], size: 10, len: 1.2 },
  },
  pixeles: {
    name: 'Píxeles',
    rar: 'r',
    out: '#5eff8a',
    in: '#f0ffd0',
    ring: '#b4ff5e',
    trail: { stamp: 'pixel', cols: ['#ffffff', '#5eff8a', '#1a9a4a'], size: 8, len: 1.3 },
  },
  caminoEstrellas: {
    name: 'Camino de estrellas',
    rar: 'e',
    out: '#ffd54a',
    in: '#ffffff',
    ring: '#ffe9a0',
    trail: { stamp: 'star', cols: ['#ffffff', '#ffe14a', '#ff9a1a'], size: 13, len: 1.6 },
  },
  caminoCorazones: {
    name: 'Camino de corazones',
    rar: 'e',
    out: '#ff5fb0',
    in: '#ffe0f0',
    ring: '#ff9be0',
    trail: { stamp: 'heart', cols: ['#ffd0e0', '#ff4a8a', '#c81e5a'], size: 13, len: 1.6 },
  },
  caminoNieve: {
    name: 'Camino de nieve',
    rar: 'e',
    out: '#bfe9ff',
    in: '#ffffff',
    ring: '#ffffff',
    trail: { stamp: 'snow', cols: ['#ffffff', '#c8f0ff', '#6ab0ff'], size: 13, len: 1.8 },
  },
  caminoMusical: {
    name: 'Camino musical',
    rar: 'e',
    out: '#b46bff',
    in: '#ffd6ff',
    ring: '#c792ff',
    trail: { stamp: 'note', cols: 'rainbow', size: 14, len: 1.6 },
  },
  huellas: {
    name: 'Huellas',
    rar: 'e',
    out: '#ffb454',
    in: '#fff2c0',
    ring: '#ffd08a',
    trail: { stamp: 'paw', cols: ['#ffffff', '#ffc46b', '#c9762a'], size: 13, len: 1.7, every: 1.5 },
  },
  tormenta: {
    name: 'Tormenta',
    rar: 'e',
    out: '#4fa8ff',
    in: '#ffffff',
    ring: '#ffe14a',
    trail: { stamp: 'bolt', cols: ['#ffffff', '#ffe14a', '#4f8aff'], size: 14, len: 1.3, ribbon: true, w: 0.6 },
  },
  polvoEstelar: {
    name: 'Polvo de estrellas',
    rar: 'l',
    out: '#ffffff',
    in: '#ffffff',
    ring: '#ffffff',
    style: 'rainbow',
    trail: { stamp: 'star', cols: 'rainbow', size: 14, len: 2, ribbon: true, w: 0.8 },
  },
  lluviaAmor: {
    name: 'Lluvia de corazones',
    rar: 'l',
    out: '#ff5fb0',
    in: '#ffffff',
    ring: '#ffd0e8',
    trail: { stamp: 'heart', cols: 'rainbow', size: 15, len: 2, ribbon: true, w: 0.8 },
  },
});

/* ---------- Armas ----------
   barrel = color del cañón · model = forma del cañón (tube, rail, twin, gatling, mortar, pod)
   bolt = forma del disparo: box barra · orb bola · dart dardo · laser rayo · bomb bomba · heart corazón ·
          arrow flecha · star estrella · ring aro · emoji (usa icons)
   shots = color del disparo de cada arma que se recoge (doble, abanico, pesada) · rainbow = cada disparo de un color */
const shots = (twin, spread, heavy) => ({ twin, spread, heavy });
const GUN = {
  estandar: { name: 'Estándar', rar: 'base', barrel: '#ffb454', model: 'tube', bolt: 'box' },
  crio: {
    name: 'Criogénicas',
    rar: 'c',
    barrel: '#8fe6ff',
    model: 'tube',
    bolt: 'box',
    shots: shots('#8fe6ff', '#c8f4ff', '#4fc3ff'),
  },
  rojas: {
    name: 'Barras rojas',
    rar: 'c',
    barrel: '#ff5a5a',
    model: 'tube',
    bolt: 'box',
    shots: shots('#ff5a5a', '#ff9a8a', '#ff2a2a'),
  },
  laserVerde: {
    name: 'Láser verde',
    rar: 'c',
    barrel: '#5eff8a',
    model: 'rail',
    bolt: 'laser',
    shots: shots('#5eff8a', '#b4ff5e', '#2adf5a'),
  },
  laserRojo: {
    name: 'Láser rojo',
    rar: 'c',
    barrel: '#ff4a4a',
    model: 'rail',
    bolt: 'laser',
    shots: shots('#ff4a4a', '#ff8a6a', '#ff1a1a'),
  },
  toxicas: {
    name: 'Dardos tóxicos',
    rar: 'r',
    barrel: '#a6f25e',
    model: 'rail',
    bolt: 'dart',
    shots: shots('#b4ff5e', '#e0ff9a', '#5edc3c'),
  },
  plasma: {
    name: 'Plasma',
    rar: 'r',
    barrel: '#c792ff',
    model: 'twin',
    bolt: 'orb',
    shots: shots('#d9a8ff', '#ff9be0', '#9a5cff'),
  },
  laserAzul: {
    name: 'Láser azul',
    rar: 'r',
    barrel: '#5ecbff',
    model: 'gatling',
    bolt: 'laser',
    shots: shots('#5ecbff', '#a8e6ff', '#2a8aff'),
  },
  flechas: {
    name: 'Flechas',
    rar: 'r',
    barrel: '#c9a36a',
    model: 'rail',
    bolt: 'arrow',
    shots: shots('#ffe0a0', '#b4ff5e', '#ff8a3c'),
  },
  bombas: {
    name: 'Bombas',
    rar: 'r',
    barrel: '#4a4f66',
    model: 'mortar',
    bolt: 'bomb',
    shots: shots('#ffb02a', '#ffb02a', '#ff4a2a'),
  },
  aros: {
    name: 'Aros de energía',
    rar: 'r',
    barrel: '#6ef2ff',
    model: 'twin',
    bolt: 'ring',
    shots: shots('#6ef2ff', '#b4ff5e', '#ff9be0'),
  },
  corazones: {
    name: 'Corazones',
    rar: 'e',
    barrel: '#ff6b9a',
    model: 'pod',
    bolt: 'heart',
    shots: shots('#ff4a7a', '#ff9bc0', '#ff1a4a'),
  },
  estrellas: {
    name: 'Estrellas',
    rar: 'e',
    barrel: '#ffd54a',
    model: 'pod',
    bolt: 'star',
    shots: shots('#ffe14a', '#fff2a0', '#ffb02a'),
  },
  rubi: {
    name: 'Rubí',
    rar: 'e',
    barrel: '#ff5a6a',
    model: 'rail',
    bolt: 'dart',
    shots: shots('#ff6b7a', '#ffb0a0', '#ff2a3a'),
  },
  solar: {
    name: 'Solares',
    rar: 'e',
    barrel: '#ffd54a',
    model: 'twin',
    bolt: 'orb',
    shots: shots('#fff2a0', '#ffd54a', '#ff7a1a'),
  },
  gatling: {
    name: 'Ametralladora',
    rar: 'e',
    barrel: '#9aa4c0',
    model: 'gatling',
    bolt: 'box',
    shots: shots('#fff2a0', '#ffd54a', '#ffb02a'),
  },
  patitos: { name: 'Patitos', rar: 'e', barrel: '#ffd23c', model: 'pod', bolt: 'emoji', icons: ['🦆'] },
  pizza: { name: 'Pizzas', rar: 'e', barrel: '#ff8a3c', model: 'mortar', bolt: 'emoji', icons: ['🍕'] },
  fantasmas: { name: 'Fantasmitas', rar: 'e', barrel: '#e8f0ff', model: 'pod', bolt: 'emoji', icons: ['👻'] },
  musica: { name: 'Notas musicales', rar: 'e', barrel: '#c792ff', model: 'twin', bolt: 'emoji', icons: ['🎵', '🎶'] },
  balones: { name: 'Balones', rar: 'e', barrel: '#ffffff', model: 'mortar', bolt: 'emoji', icons: ['⚽', '🏀', '🎾'] },
  prisma: { name: 'Prisma', rar: 'l', barrel: '#ffffff', model: 'twin', bolt: 'orb', rainbow: true },
  laserArcoiris: {
    name: 'Láser arcoíris',
    rar: 'l',
    barrel: '#ffffff',
    model: 'gatling',
    bolt: 'laser',
    rainbow: true,
  },
  amor: { name: 'Lluvia de amor', rar: 'l', barrel: '#ff6b9a', model: 'pod', bolt: 'heart', rainbow: true },
  azar: {
    name: 'Caja sorpresa',
    rar: 'l',
    barrel: '#ffd54a',
    model: 'pod',
    bolt: 'emoji',
    icons: ['🦆', '🍕', '👻', '⚽', '🌮', '🍩', '🐟', '🎁', '🧦', '🍌', '⭐', '❤️'],
  },
};

/* ---------- Explosión de la nave: colores de las chispas, cuántas y cómo salen ---------- */
const BOOM = {
  clasica: { name: 'Clásica', rar: 'base', cols: ['#ff6b8a'] },
  fuego: { name: 'Bola de fuego', rar: 'c', cols: ['#ff8a3c', '#ffd54a', '#ff3b3b'], n: 44, style: 'burst' },
  hielo: { name: 'Astillas de hielo', rar: 'c', cols: ['#8fe6ff', '#ffffff', '#4fc3ff'], n: 44, style: 'shards' },
  onda: { name: 'Onda de choque', rar: 'r', cols: ['#5ee0ff', '#ffffff'], n: 54, style: 'ring' },
  confeti: {
    name: 'Confeti',
    rar: 'r',
    cols: ['#ff6bd0', '#ffd54a', '#5ee0ff', '#6ef2a5', '#c792ff', '#ff8a3c'],
    n: 70,
    style: 'fountain',
  },
  implosion: { name: 'Implosión', rar: 'e', cols: ['#c792ff', '#6a3aa8', '#ffffff'], n: 60, style: 'implode' },
  supernova: {
    name: 'Supernova',
    rar: 'l',
    cols: ['#ffffff', '#ffd54a', '#ff6bd0', '#5ee0ff'],
    n: 120,
    style: 'nova',
  },
};

/* ---------- Todo junto: PARTS['hull.aurora'] = { id, slot, key, name, rar, … } ---------- */
const GROUPS = {
  hull: HULL,
  nose: NOSE,
  wing: WING,
  fin: FIN,
  paint: PAINT,
  glass: GLASS,
  engine: ENGINE,
  flame: FLAME,
  gun: GUN,
  boom: BOOM,
};
const ORDER = ['base', 'c', 'r', 'e', 'l'];
export const PARTS = {};
export const BY_SLOT = {};
/* la pieza de serie de cada ranura: siempre se tiene, y es la que se usa si falta la elegida */
export const BASE = {};
for (const slot of Object.keys(GROUPS)) {
  const list = [];
  for (const [key, def] of Object.entries(GROUPS[slot])) {
    const part = { id: slot + '.' + key, slot, key, ...def };
    PARTS[part.id] = part;
    list.push(part);
    if (def.rar === 'base') BASE[slot] = part.id;
  }
  /* en el taller salen de la más común a la más rara */
  BY_SLOT[slot] = list.sort((a, b) => ORDER.indexOf(a.rar) - ORDER.indexOf(b.rar));
}
export const priceOf = (part) => RARITY[part.rar].price;

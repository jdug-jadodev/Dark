/**
 * Iconos propios del juego, dibujados en vectores (reemplazan a los emojis, que cambian de un
 * teléfono a otro). Cada icono es una lista de capas sobre una cuadrícula de 24 × 24:
 *
 *   [relleno, trazo]                 una figura rellena
 *   [relleno, trazo, color, grosor]  una figura con borde (relleno 'none' = solo la línea)
 * El relleno 'currentColor' toma el color de la letra de donde se ponga (para que se vea sobre cualquier botón).
 *
 * ic('coin') lo entrega como dibujo para meter en el HTML; drawIcon() lo pinta en un lienzo
 * (para las cápsulas y los avisos que se dibujan dentro de la partida).
 */

/* ---------- colores de la casa ---------- */
const GOLD = '#ffd24a',
  DGOLD = '#e09a1a',
  CYAN = '#5ee0ff',
  BLUE = '#3d7bff',
  VIOLET = '#c792ff',
  PINK = '#ff6bb0',
  RED = '#ff4a5a',
  ORANGE = '#ff8a3c',
  GREEN = '#6ef2a5',
  WHITE = '#f4f7ff',
  GRAY = '#9aa8cc',
  STEEL = '#c9d2e4',
  DARK = '#1a2142',
  INK = '#0a0f24';

/* ---------- ayudas para trazar ---------- */
const C = (x, y, r) => `M${x - r} ${y}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0z`; // círculo
const R = (x, y, w, h, q = 0) =>
  q
    ? `M${x + q} ${y}h${w - 2 * q}a${q} ${q} 0 0 1 ${q} ${q}v${h - 2 * q}a${q} ${q} 0 0 1 ${-q} ${q}h${-(w - 2 * q)}a${q} ${q} 0 0 1 ${-q} ${-q}v${-(h - 2 * q)}a${q} ${q} 0 0 1 ${q} ${-q}z`
    : `M${x} ${y}h${w}v${h}h${-w}z`; // rectángulo (q = esquinas redondas)
/* estrella o engranaje: n puntas, radio de afuera y de adentro, giro en vueltas */
const S = (n, out, inn, x = 12, y = 12, turn = 0) =>
  'M' +
  Array.from({ length: n * 2 }, (_, i) => {
    const a = (i / (n * 2) + turn) * Math.PI * 2,
      r = i % 2 ? inn : out;
    return (x + Math.sin(a) * r).toFixed(2) + ' ' + (y - Math.cos(a) * r).toFixed(2);
  }).join('L') +
  'z';
const FLAME =
    'M12 2c1 3.5 5.5 5.5 5.5 11a5.5 5.5 0 0 1-11 0c0-2.2 1-3.6 2-4.6.3 1.6 1 2.4 1.8 2.6C9.8 8 10.5 4.5 12 2z',
  FLAME_IN = 'M12 12.5c1 1.4 2.4 2.2 2.4 4.2a2.4 2.4 0 0 1-4.8 0c0-1.6 1.4-2.4 2.4-4.2z',
  SHIELD = 'M12 2.5l8 3v6c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10v-6z',
  /* medalla de rango: cintas, disco con borde y brillo, y estrella al centro */
  RANK = (disc, shade, light, ribbon) => [
    [ribbon, 'M6.6 1.4h4.2l2 6.6-3.6 1.4z'],
    [ribbon, 'M17.4 1.4h-4.2l-2 6.6 3.6 1.4z'],
    [shade, C(12, 14.6, 7.6)],
    [disc, C(12, 14.6, 6.1)],
    ['none', 'M7.6 13.2a4.6 4.6 0 0 1 3-3.2', light, 1.3],
    [shade, S(5, 3.5, 1.55, 12, 14.8)],
  ],
  MEDAL = (disc, shade) => [
    [BLUE, 'M7.5 2h4l1.5 7h-3.5z'],
    [RED, 'M12.5 2h4l-2 7H11z'],
    [shade, C(12, 14.5, 6.6)],
    [disc, C(12, 14.5, 5.2)],
    [shade, S(5, 3.3, 1.5, 12, 14.6)],
  ];

export const ICONS = {
  /* ---------- lo que se cuenta ---------- */
  coin: [
    [DGOLD, C(12, 12, 10)],
    [GOLD, C(12, 12, 8.4)],
    [DGOLD, C(12, 12, 6.2)],
    [GOLD, C(12, 12, 5.2)],
    [WHITE, S(4, 4.2, 1.5)],
  ],
  fire: [
    [ORANGE, FLAME],
    [GOLD, FLAME_IN],
  ],
  star: [
    [DGOLD, S(5, 10.4, 4.6)],
    [GOLD, S(5, 8.6, 3.9)],
  ],
  trophy: [
    ['none', 'M7 4.6H4.2v1.6a3.2 3.2 0 0 0 3.2 3.2M17 4.6h2.8v1.6a3.2 3.2 0 0 1-3.2 3.2', DGOLD, 1.8],
    [GOLD, 'M6.8 3h10.4v5.2a5.2 5.2 0 0 1-10.4 0z'],
    [DGOLD, R(11, 12.6, 2, 4)],
    [DGOLD, R(7.2, 16.4, 9.6, 3.6, 1.2)],
    [WHITE, S(5, 2.6, 1.1, 12, 7.4)],
  ],
  medal1: MEDAL(GOLD, DGOLD),
  medal2: MEDAL('#e4eaf6', '#9aa8cc'),
  medal3: MEDAL('#e8a368', '#a8642c'),
  check: [['none', 'M5 12.6l4.6 4.6L19 7.4', GREEN, 3.2]],
  timer: [
    [VIOLET, R(9.8, 1.8, 4.4, 2.8, 1)],
    [VIOLET, C(12, 13.4, 8.6)],
    [WHITE, C(12, 13.4, 6.6)],
    ['none', 'M12 13.4V8.9M12 13.4l3 2', DARK, 1.8],
    [RED, C(12, 13.4, 1.3)],
  ],
  ruler: [
    [GOLD, 'M3.2 16.4L16.4 3.2l4.4 4.4L7.6 20.8z'],
    ['none', 'M7.4 15.2l1.6 1.6M10.2 12.4l2.2 2.2M13 9.6l1.6 1.6M15.8 6.8l2.2 2.2', DARK, 1.3],
  ],
  target: [
    [RED, C(12, 12, 10)],
    [WHITE, C(12, 12, 7.2)],
    [RED, C(12, 12, 4.4)],
    [WHITE, C(12, 12, 1.7)],
  ],
  puzzle: [[CYAN, 'M4 8.5h4.3a2.4 2.4 0 1 1 4.4 0H17v4.3a2.4 2.4 0 1 1 0 4.4V21H4v-4.1a2.4 2.4 0 1 0 0-4.6z']],

  /* ---------- modos y acciones ---------- */
  play: [
    [
      'currentColor',
      'M7.5 5.1v13.8a1.1 1.1 0 0 0 1.66.94l11.4-6.9a1.1 1.1 0 0 0 0-1.88L9.16 4.16A1.1 1.1 0 0 0 7.5 5.1z',
    ],
  ],
  pause: [
    [WHITE, R(5.6, 4.6, 4.8, 14.8, 1.6)],
    [WHITE, R(13.6, 4.6, 4.8, 14.8, 1.6)],
  ],
  planet: [
    [CYAN, C(12, 12, 6.8)],
    [BLUE, 'M6.2 15.2c3.4.6 7.6-.8 10.6-3.8a6.8 6.8 0 0 1-10.6 3.8z'],
    [
      'none',
      'M5.6 9.4C2.6 11.6 1 14 1.9 15.5c1.3 2.2 7.2.9 13.2-2.8s9.8-8.4 8.5-10.6c-.8-1.3-3.2-1.4-6.3-.4',
      GOLD,
      1.7,
    ],
  ],
  rocket: [
    [ORANGE, 'M9.6 17.4h4.8L12 22.4z'],
    [RED, 'M7.6 11.6l-3.4 3.8 1 3.4 3.4-1.6zM16.4 11.6l3.4 3.8-1 3.4-3.4-1.6z'],
    [WHITE, 'M12 1.6c3.2 2.6 4.8 6.2 4.8 10.4l-1.6 5.4H8.8L7.2 12c0-4.2 1.6-7.8 4.8-10.4z'],
    [BLUE, C(12, 9.4, 2.3)],
    [CYAN, C(12, 9.4, 1.4)],
  ],
  shield: [
    [GREEN, SHIELD],
    ['#3fc487', 'M12 2.5v19c4.6-1.4 8-5 8-10v-6z'],
    ['none', 'M8.4 11.8l2.6 2.6 4.8-5', WHITE, 2],
  ],
  swords: [
    ['none', 'M4.6 3.6l11.2 11.2M19.4 3.6L8.2 14.8', STEEL, 2.6],
    ['none', 'M13.2 17.4l4.2-4.2M10.8 17.4l-4.2-4.2', GOLD, 2.2],
    ['none', 'M16 16l3.2 3.6M8 16l-3.2 3.6', DGOLD, 2.6],
  ],
  skull: [
    [
      WHITE,
      'M12 2.6a8.2 8.2 0 0 0-8.2 8.2c0 2.9 1.4 4.8 3.1 6V19a1.6 1.6 0 0 0 1.6 1.6h7A1.6 1.6 0 0 0 17.1 19v-2.2c1.7-1.2 3.1-3.1 3.1-6A8.2 8.2 0 0 0 12 2.6z',
    ],
    [DARK, C(8.7, 11.4, 2.2)],
    [DARK, C(15.3, 11.4, 2.2)],
    [DARK, 'M12 13.8l-1.2 2.3h2.4z'],
    ['none', 'M10.2 17.6v3M13.8 17.6v3', DARK, 1.2],
  ],
  boom: [
    [RED, S(10, 11, 6.4)],
    [ORANGE, S(10, 8.6, 4.8, 12, 12, 0.05)],
    [GOLD, S(8, 5.6, 2.8)],
    [WHITE, C(12, 12, 1.8)],
  ],
  bolt: [
    [DGOLD, 'M14 1.6L4.4 13.8h5.8L8.6 22.4 19.6 9.6h-6.2z'],
    [GOLD, 'M13.2 3.6L6.6 12.6h5L10.4 19l7-8.2h-5.2z'],
  ],
  sparkle: [
    [GOLD, S(4, 9.4, 2.8, 10.6, 12.6)],
    [WHITE, S(4, 4.6, 1.4, 18.4, 5.6)],
    [WHITE, S(4, 3, 1, 18.6, 18.6)],
  ],
  comet: [
    ['none', 'M13.2 10.8L3 21M10.8 7.6L4 14.4M16.6 13.2L9.8 20', ORANGE, 2.2],
    [GOLD, C(16.4, 7.6, 5)],
    [WHITE, C(17.2, 6.8, 2.6)],
  ],
  hole: [
    ['none', 'M2.4 13.6c1.6 2.8 7.4 2.4 13-.8s8.8-8 7.2-10.8', VIOLET, 1.6],
    [ORANGE, C(12, 12, 7.2)],
    [INK, C(12, 12, 5.4)],
    ['none', 'M4.2 9.6C2.2 11.4 1.4 13.2 2.2 14.6c1.4 2.4 7 1.6 12.6-1.6', GOLD, 1.8],
  ],
  party: [
    [VIOLET, 'M3.4 20.6L8.2 7.8l8 8z'],
    [PINK, 'M5.6 14.8l3.6 3.6-5.8 2.2z'],
    [GOLD, C(17.6, 4.6, 1.5)],
    [CYAN, C(12.4, 3.6, 1.2)],
    [GREEN, C(20.4, 10.4, 1.3)],
    ['none', 'M14.4 9.6c.4-2 2.4-2.6 2.8-4.6M16.6 12.4c2-.4 2.6-2 4.6-2.2', PINK, 1.5],
  ],
  phone: [
    [STEEL, R(6.6, 1.8, 10.8, 20.4, 2.6)],
    [DARK, R(8, 4.4, 8, 14, 1)],
    ['none', 'M9.4 10.4l2.6-2.4 2.6 2.4M9.4 13.6l2.6 2.4 2.6-2.4', CYAN, 1.5],
    [DARK, C(12, 20.3, 0.9)],
  ],
  tap: [
    ['none', 'M6.4 6.2a6 6 0 0 1 9.6-2.6', CYAN, 1.6],
    [
      WHITE,
      'M9.8 11.2V6a1.9 1.9 0 0 1 3.8 0v4.6l4.2.9a2.1 2.1 0 0 1 1.7 2.4l-.8 5a3.2 3.2 0 0 1-3.2 2.7h-3.7a3.2 3.2 0 0 1-2.6-1.3l-3.3-4.6a1.7 1.7 0 0 1 2.5-2.2z',
    ],
  ],
  pad: [
    [
      VIOLET,
      'M6.6 7.6h10.8a4.7 4.7 0 0 1 4.6 5.6l-.7 3.6a2.7 2.7 0 0 1-4.8 1.1L15 16.2H9l-1.5 1.7a2.7 2.7 0 0 1-4.8-1.1L2 13.2a4.7 4.7 0 0 1 4.6-5.6z',
    ],
    [WHITE, R(5.6, 11.2, 4.6, 1.6, 0.6)],
    [WHITE, R(7.1, 9.7, 1.6, 4.6, 0.6)],
    [PINK, C(15.4, 10.6, 1.3)],
    [CYAN, C(18, 12.8, 1.3)],
  ],
  music: [
    ['none', 'M8.8 17.4V6.2l10.4-2.2v11.6', CYAN, 2.2],
    [CYAN, C(6.6, 17.6, 2.8)],
    [CYAN, C(17, 15.8, 2.8)],
  ],
  sound: [
    [WHITE, 'M3.6 9.4h3.6l5-4.2v13.6l-5-4.2H3.6z'],
    ['none', 'M15.4 8.8a4.6 4.6 0 0 1 0 6.4M18 6a8.4 8.4 0 0 1 0 12', CYAN, 1.8],
  ],
  door: [
    [VIOLET, R(5.6, 2.6, 12.8, 18.8, 1.8)],
    [DARK, R(7.6, 4.6, 8.8, 16.8, 1)],
    [GOLD, C(14.2, 13, 1.3)],
  ],
  back: [['none', 'M19.4 12H5.6M11.2 6.2L5.4 12l5.8 5.8', WHITE, 2.6]],
  prev: [['none', 'M14.8 5.2L8 12l6.8 6.8', CYAN, 3]],
  next: [['none', 'M9.2 5.2L16 12l-6.8 6.8', CYAN, 3]],
  up: [['none', 'M5.2 14.8L12 8l6.8 6.8', WHITE, 3]],
  down: [['none', 'M5.2 9.2L12 16l6.8-6.8', WHITE, 3]],

  /* ---------- botones del lobby ---------- */
  gear: [
    [STEEL, S(8, 10.4, 7.6)],
    [STEEL, C(12, 12, 7.8)],
    [DARK, C(12, 12, 3.4)],
  ],
  stats: [
    [CYAN, R(3.6, 12, 4.4, 8.6, 1.2)],
    [VIOLET, R(9.8, 7.4, 4.4, 13.2, 1.2)],
    [PINK, R(16, 3.2, 4.4, 17.4, 1.2)],
  ],
  wrench: [
    [
      STEEL,
      'M20.8 6.4a5.2 5.2 0 0 1-6.9 6.9L7 20.2a2.1 2.1 0 1 1-3-3l6.9-6.9a5.2 5.2 0 0 1 6.9-6.9l-3.1 3.1.9 2.2 2.2.9z',
    ],
    [DARK, C(5.6, 18.6, 0.9)],
  ],
  gift: [
    [RED, R(3.8, 10.2, 16.4, 10.6, 2)],
    ['#d92f45', R(2.6, 6.6, 18.8, 4.6, 1.6)],
    [GOLD, R(10.4, 6.6, 3.2, 14.2)],
    [GOLD, 'M12 6.6C10.4 2.8 6.2 2.4 6.2 5s3.8 2.2 5.8 1.6zM12 6.6C13.6 2.8 17.8 2.4 17.8 5s-3.8 2.2-5.8 1.6z'],
  ],
  calendar: [
    [WHITE, R(3, 4.6, 18, 16.6, 3)],
    [RED, 'M6 4.6h12a3 3 0 0 1 3 3v2.6H3V7.6a3 3 0 0 1 3-3z'],
    [DARK, R(7, 2.6, 2.2, 4.4, 1)],
    [DARK, R(14.8, 2.6, 2.2, 4.4, 1)],
    ['none', 'M8.2 15.2l2.6 2.6 4.8-5', GREEN, 2.2],
  ],
  clipboard: [
    [VIOLET, R(4.6, 4, 14.8, 17.4, 2.6)],
    [WHITE, R(6.8, 7, 10.4, 12.4, 1)],
    [STEEL, R(8.8, 2.4, 6.4, 3.8, 1.3)],
    ['none', 'M9 11h6M9 14h6M9 17h3.6', GRAY, 1.4],
  ],
  cart: [
    ['none', 'M2.6 4h2.6l2.3 10.4a1.6 1.6 0 0 0 1.6 1.3h8.4a1.6 1.6 0 0 0 1.6-1.3L20.6 7.2H6.4', CYAN, 2.1],
    [VIOLET, C(9.8, 19.6, 1.8)],
    [VIOLET, C(17, 19.6, 1.8)],
  ],
  bell: [
    [DGOLD, 'M9.4 18.6a2.6 2.6 0 0 0 5.2 0z'],
    [
      GOLD,
      'M12 3.4a6.2 6.2 0 0 0-6.2 6.2v3.8l-2 3.4a.9.9 0 0 0 .8 1.4h14.8a.9.9 0 0 0 .8-1.4l-2-3.4V9.6A6.2 6.2 0 0 0 12 3.4z',
    ],
    [DGOLD, C(12, 3, 1.5)],
    ['none', 'M8.4 9.4a3.8 3.8 0 0 1 2.2-3', WHITE, 1.4],
  ],
  share: [
    ['none', 'M12 14.6V3.6M7.4 7.8L12 3.2l4.6 4.6', CYAN, 2.3],
    ['none', 'M5 12.4v6.2a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6.2', WHITE, 2.3],
  ],
  /* ---------- mundos ---------- */
  snow: [
    ['none', 'M12 2.4v19.2M3.7 7.2l16.6 9.6M20.3 7.2L3.7 16.8', CYAN, 2],
    [
      'none',
      'M12 6l-2.4-2.2M12 6l2.4-2.2M12 18l-2.4 2.2M12 18l2.4 2.2M6.8 9l-3.2-.6M6.8 9l-1 3M17.2 15l3.2.6M17.2 15l1-3M17.2 9l3.2-.6M17.2 9l1 3M6.8 15l-3.2.6M6.8 15l-1-3',
      WHITE,
      1.4,
    ],
    [WHITE, C(12, 12, 1.7)],
  ],
  cloud: [
    [VIOLET, 'M7.2 19a4.8 4.8 0 0 1-.7-9.5 6.2 6.2 0 0 1 11.9 1.5A4.1 4.1 0 0 1 17.6 19z'],
    ['#e0c4ff', 'M8 17a3 3 0 0 1-.4-6 4.6 4.6 0 0 1 8.6.4c-3.6-.6-7 1.6-8.2 5.6z'],
    [GOLD, S(4, 2.2, 0.8, 19.4, 5.2)],
  ],
  city: [
    [BLUE, R(2.8, 9.4, 5.6, 12, 0.8)],
    [VIOLET, R(9.2, 3.4, 6, 18, 0.8)],
    [PINK, R(16, 11.4, 5.2, 10, 0.8)],
    [
      GOLD,
      'M4.4 11.6h2.4v1.6H4.4zM4.4 15h2.4v1.6H4.4zM10.8 5.8h2.8v1.6h-2.8zM10.8 9.2h2.8v1.6h-2.8zM10.8 12.6h2.8v1.6h-2.8zM10.8 16h2.8v1.6h-2.8zM17.4 13.6h2.4v1.6h-2.4zM17.4 17h2.4v1.6h-2.4z',
    ],
  ],
  lock: [
    ['none', 'M8 10.8V7.6a4 4 0 0 1 8 0v3.2', STEEL, 2.2],
    [DGOLD, R(5, 10.4, 14, 10.6, 2.6)],
    [GOLD, R(6.4, 11.8, 11.2, 7.8, 1.6)],
    [DARK, C(12, 15.2, 1.5)],
    [DARK, R(11.3, 15.4, 1.4, 3, 0.5)],
  ],
  dice: [
    [WHITE, R(3.2, 3.2, 17.6, 17.6, 4.2)],
    [DARK, C(8.2, 8.2, 1.7)],
    [DARK, C(15.8, 8.2, 1.7)],
    [RED, C(12, 12, 1.9)],
    [DARK, C(8.2, 15.8, 1.7)],
    [DARK, C(15.8, 15.8, 1.7)],
  ],

  /* ---------- tienda ---------- */
  bag: [
    [DGOLD, 'M9 2.6h6l-1.6 3.6c3.6 1.6 5.8 5.2 5.8 8.8 0 3.8-2.6 6.4-7.2 6.4s-7.2-2.6-7.2-6.4c0-3.6 2.2-7.2 5.8-8.8z'],
    [GOLD, C(12, 14.4, 3.8)],
    [DGOLD, S(4, 2.8, 1, 12, 14.4)],
  ],
  crown: [
    [GOLD, 'M2.8 7.8l4.6 4.2L12 4.6l4.6 7.4 4.6-4.2-2 10.6H4.8z'],
    [DGOLD, R(4.8, 16.4, 14.4, 3, 1)],
    [RED, C(12, 12.6, 1.5)],
    [CYAN, C(7.4, 14, 1.1)],
    [CYAN, C(16.6, 14, 1.1)],
  ],
  noads: [
    [GRAY, R(5.4, 8, 13.2, 8, 1.6)],
    ['none', C(12, 12, 9), RED, 2.4],
    ['none', 'M5.8 5.8l12.4 12.4', RED, 2.4],
  ],

  /* ---------- cápsulas de la partida ---------- */
  magnet: [
    [RED, 'M4.6 3.6h4.8v8.6a2.6 2.6 0 0 0 5.2 0V3.6h4.8v8.6a7.4 7.4 0 0 1-14.8 0z'],
    [WHITE, R(4.6, 3.6, 4.8, 3.4)],
    [WHITE, R(14.6, 3.6, 4.8, 3.4)],
  ],
  blaster: [
    [CYAN, 'M2.6 7.6h13.6l5.2 2.2v3.4H11.6l-1.2 4.4H6.2v-4.4H2.6z'],
    [DARK, R(4.4, 9.4, 9, 1.8, 0.6)],
    [GOLD, C(20.4, 11.4, 1.2)],
  ],
  trident: [
    ['none', 'M12 21.6V7.8M5.8 3.4v5.4a6.2 6.2 0 0 0 12.4 0V3.4', GOLD, 2.3],
    [GOLD, 'M12 1.8l2.4 4.4H9.6zM5.8 1.6l1.9 3.4H3.9zM18.2 1.6l1.9 3.4h-3.8z'],
  ],
  bomb: [
    ['none', 'M15.4 8.6l2.4-2.8c.8-.9 2-.7 2.6.2', GRAY, 1.8],
    [DARK, C(10.6, 14.2, 7.6)],
    ['#3a4370', C(8.2, 11.6, 2.2)],
    [STEEL, R(12.6, 6.4, 4.4, 3, 0.8)],
    [GOLD, S(6, 3.2, 1.3, 20.6, 5.4)],
  ],
  nova: [
    ['none', C(12, 12, 9.6), CYAN, 1.6],
    ['none', C(12, 12, 6.2), VIOLET, 1.8],
    [WHITE, S(8, 4.4, 1.9)],
  ],
  orbit: [
    ['none', C(12, 12, 8.4), VIOLET, 1.4],
    [VIOLET, C(12, 12, 4)],
    [PINK, C(12, 3.6, 2)],
    [PINK, C(4.8, 16.2, 2)],
    [PINK, C(19.2, 16.2, 2)],
  ],
  laser: [
    [RED, R(2.6, 10.2, 18.8, 3.6, 1.8)],
    [WHITE, R(4.4, 11.3, 15.2, 1.4, 0.7)],
    [RED, S(8, 4.6, 2, 20.4, 12)],
  ],

  /* ---------- medallas de rango (de Bronce a Cósmico) ---------- */
  rank0: RANK('#e39a5c', '#a8642c', '#f6c79a', RED),
  rank1: RANK('#e4eaf6', '#8f9bb5', '#ffffff', BLUE),
  rank2: [
    ['none', 'M4.4 9.6c-1.4 3.6-.2 7.6 3 10M19.6 9.6c1.4 3.6.2 7.6-3 10', GREEN, 1.7],
    ['none', 'M3.4 13.2l2.2.4M4.4 16.6l2-.8M20.6 13.2l-2.2.4M19.6 16.6l-2-.8', GREEN, 1.5],
    ...RANK(GOLD, DGOLD, '#fff3bf', RED),
  ],
  rank3: [
    ['#2f9c90', SHIELD],
    ['#9ff3e6', 'M12 4.4l6.2 2.3v4.9c0 3.9-2.6 6.7-6.2 7.9-3.6-1.2-6.2-4-6.2-7.9V6.7z'],
    ['#5fd4c4', 'M12 4.4v15.1c3.6-1.2 6.2-4 6.2-7.9V6.7z'],
    [WHITE, S(5, 4.4, 1.9, 12, 11.4)],
  ],
  rank4: [
    [
      'none',
      'M2 9.2c1.2-.8 2.6-1 4-.6M22 9.2c-1.2-.8-2.6-1-4-.6M1.6 12.6c1.4-.4 2.8-.2 4 .6M22.4 12.6c-1.4-.4-2.8-.2-4 .6',
      CYAN,
      1.5,
    ],
    [BLUE, 'M7.4 3.4h9.2l3.6 5.4L12 21.6 3.8 8.8z'],
    ['#7fd0ff', 'M7.4 3.4h9.2l-1.8 5.4H9.2z'],
    ['#bfe8ff', 'M9.2 8.8h5.6L12 21.6z'],
    ['#5aa8ff', 'M3.8 8.8h5.4L7.4 3.4zM20.2 8.8h-5.4l1.8-5.4z'],
    [WHITE, S(4, 2.4, 0.8, 16.8, 5.4)],
  ],
  rank5: [
    [GOLD, 'M6.4 2.2l2.4 2.4L12 1.2l3.2 3.4 2.4-2.4-.8 5H7.2z'],
    [RED, C(12, 5.4, 0.9)],
    ['#7a3fe0', 'M12 7.6l7.4 2.6v4c0 3.9-3 6.7-7.4 8.2-4.4-1.5-7.4-4.3-7.4-8.2v-4z'],
    [VIOLET, 'M12 9.3l5.8 2v3c0 3-2.3 5.2-5.8 6.4-3.5-1.2-5.8-3.4-5.8-6.4v-3z'],
    ['#e0c4ff', 'M12 9.3v11.4c-3.5-1.2-5.8-3.4-5.8-6.4v-3z'],
    [WHITE, S(5, 3.6, 1.6, 12, 14.6)],
  ],
  rank6: [
    [RED, S(12, 11.6, 8.4)],
    [ORANGE, S(12, 10, 7.2, 12, 12, 0.042)],
    [DGOLD, C(12, 12, 6.8)],
    [GOLD, C(12, 12, 5.6)],
    [WHITE, S(5, 4.4, 1.9)],
    [PINK, C(12, 12, 1)],
  ],
  /* Cósmico: un agujero negro, con su disco de luz por detrás y por delante */
  rank7: [
    ['#2a1466', C(12, 12, 10.6)],
    ['none', C(12, 12, 10.6), VIOLET, 1],
    ['none', 'M1.6 12.8c0-3 4.6-5.2 10.4-5.2s10.4 2.2 10.4 5.2', ORANGE, 2.2],
    [ORANGE, C(12, 11.2, 6.9)],
    ['#ffe9a8', C(12, 11.2, 6)],
    ['#05030c', C(12, 11.2, 5.1)],
    ['none', 'M1.6 12.8c0 3 4.6 5.2 10.4 5.2s10.4-2.2 10.4-5.2', GOLD, 2.4],
    ['none', 'M5.4 15.6c1.8 1 4.1 1.5 6.6 1.5s4.8-.5 6.6-1.5', '#fff3bf', 0.9],
    [WHITE, S(4, 1.9, 0.6, 4.6, 5)],
    [WHITE, S(4, 1.5, 0.5, 19.6, 6.4)],
    [WHITE, S(4, 1.2, 0.4, 18.4, 19.4)],
  ],

  /* ---------- pestañas del taller ---------- */
  ufo: [
    [CYAN, 'M7.6 10.8a4.4 4.4 0 0 1 8.8 0z'],
    [STEEL, 'M2 13.4c0-1.9 4.5-3.2 10-3.2s10 1.3 10 3.2-4.5 3.6-10 3.6-10-1.7-10-3.6z'],
    [GOLD, C(6.4, 13.8, 1.1)],
    [PINK, C(12, 14.8, 1.1)],
    [GREEN, C(17.6, 13.8, 1.1)],
    ['#5ee0ff66', 'M9.6 17.6h4.8l1.8 4.4H7.8z'],
  ],
  hull: [
    [STEEL, 'M12 1.8c2.4 2.2 3.5 5.8 3.5 10.2S14.2 20 12 22.2c-2.2-2.2-3.5-5.8-3.5-10.2S9.6 4 12 1.8z'],
    [CYAN, 'M12 1.8c1.5 1.4 2.5 3.3 3 5.6H9c.5-2.3 1.5-4.2 3-5.6z'],
    [DARK, C(12, 11, 1.7)],
  ],
  nose: [
    [CYAN, 'M12 2.4c3.8 3.2 5.4 7.4 5.4 11.6H6.6c0-4.2 1.6-8.4 5.4-11.6z'],
    [STEEL, R(6.6, 14, 10.8, 4.4, 1)],
    [GRAY, R(6.6, 18.4, 10.8, 3, 1)],
  ],
  wing: [
    [CYAN, 'M2.6 15.6L13.6 4.4h4.6L13.4 13h8l-3.2 4.4H4.4z'],
    [BLUE, 'M4.4 17.4h13.8l-1.4 2H5.6z'],
  ],
  fin: [
    [CYAN, 'M3.6 19.4c2-7.4 6.2-13.4 12.6-15.6-1 5.2.2 10.6 4.2 15.6z'],
    [BLUE, R(2.6, 19.4, 18.8, 2.4, 1)],
  ],
  paint: [
    [
      WHITE,
      'M12 2.6a9.4 9.4 0 1 0 0 18.8c1.5 0 2.1-1 2.1-2.1 0-.9-.6-1.6-.6-2.5 0-1 .8-1.7 1.9-1.7h1.8a4.2 4.2 0 0 0 4.2-4.2c0-4.6-4.2-8.3-9.4-8.3z',
    ],
    [RED, C(7.6, 9, 1.6)],
    [GOLD, C(12, 6.6, 1.6)],
    [CYAN, C(16.4, 9, 1.6)],
    [VIOLET, C(7.4, 13.8, 1.6)],
  ],
  cabin: [
    [CYAN, 'M3.6 17.2a8.4 8.4 0 0 1 16.8 0z'],
    ['none', 'M7 12.6a5.8 5.8 0 0 1 4.2-3.6', WHITE, 1.6],
    [STEEL, R(2.6, 17.2, 18.8, 3.2, 1.6)],
  ],
  engine: [
    [GRAY, C(12, 12, 9.8)],
    [DARK, C(12, 12, 7.4)],
    [ORANGE, C(12, 12, 5.2)],
    [GOLD, C(12, 12, 2.8)],
  ],
};

/* el icono como dibujo para el HTML (toma el tamaño de la letra de donde se ponga) */
export function ic(name, cls) {
  const layers = ICONS[name];
  if (!layers) return '';
  return (
    '<svg class="ic' +
    (cls ? ' ' + cls : '') +
    '" viewBox="0 0 24 24" aria-hidden="true">' +
    layers
      .map(([fill, d, stroke, width]) =>
        stroke && stroke !== 'none'
          ? '<path d="' +
            d +
            '" fill="' +
            fill +
            '" stroke="' +
            stroke +
            '" stroke-width="' +
            width +
            '" stroke-linecap="round" stroke-linejoin="round"/>'
          : '<path d="' + d + '" fill="' + fill + '"/>',
      )
      .join('') +
    '</svg>'
  );
}
/* el icono pintado en un lienzo, con su esquina en (x, y) y de lado `size` */
export function drawIcon(ctx, name, x, y, size) {
  const layers = ICONS[name];
  if (!layers) return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.lineCap = ctx.lineJoin = 'round';
  for (const [fill, d, stroke, width] of layers) {
    const path = new Path2D(d);
    if (fill !== 'none') {
      ctx.fillStyle = fill === 'currentColor' ? CYAN : fill; // en un lienzo no hay "color de la letra"
      ctx.fill(path);
    }
    if (stroke && stroke !== 'none') {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = width;
      ctx.stroke(path);
    }
  }
  ctx.restore();
}

/* ¿es {nombre} un icono? */
const named = (part) => (part[0] === '{' && ICONS[part.slice(1, -1)] ? part.slice(1, -1) : '');
/* un texto con iconos escritos como {coin}: los convierte en dibujos para el HTML */
export const T = (text) => String(text).replace(/\{([a-z0-9]+)\}/gi, (whole, name) => (ICONS[name] ? ic(name) : whole));
/* el mismo texto, pintado en un lienzo y centrado en x (para los avisos que flotan en la partida).
   Quien llama deja listos la letra, el grosor y el color del borde; color = el del texto. */
export function drawLabel(ctx, text, x, y, size, color) {
  const parts = String(text)
      .split(/(\{[a-z0-9]+\})/i)
      .filter(Boolean),
    side = size * 1.15,
    widths = parts.map((part) => (named(part) ? side : ctx.measureText(part).width));
  let at = x - widths.reduce((a, b) => a + b, 0) / 2;
  ctx.textAlign = 'left';
  parts.forEach((part, i) => {
    const name = named(part);
    if (name) drawIcon(ctx, name, at, y - size * 0.92, side);
    else {
      ctx.strokeText(part, at, y);
      ctx.fillStyle = color;
      ctx.fillText(part, at, y);
    }
    at += widths[i];
  });
  ctx.textAlign = 'center';
}

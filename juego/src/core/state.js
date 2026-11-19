/**
 * Estado mutable compartido del juego (lo que antes eran variables sueltas del archivo único).
 * Los módulos lo leen y escriben como G.algo. Reducir lo que vive aquí es el siguiente paso del refactor.
 */
export const G = {
  cw: 0,
  ch: 0,
  dpr: 1,
  state: 'menu',
  t: 0,
  angle: 0,
  shake: 0,
  lastTs: 0,
  ship: undefined,
  obs: undefined,
  coins: undefined,
  caps: undefined,
  bullets: undefined,
  parts: undefined,
  pops: undefined,
  run: undefined,
  eb: undefined,
  rings: undefined,
  en: undefined,
  ptr: {
    x: 0,
    y: 0,
    has: false,
  },
  chestOpened: false,
  chestDoubled: false,
  camX: 0,
  scroll: 0,
  bendX: 0,
  bendY: 0,
  bendT: 2,
  startLv: 1, // modo demo: nivel en el que arranca Supervivencia
};

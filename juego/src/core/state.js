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
  camX: 0,
  scroll: 0,
  bendX: 0,
  bendY: 0,
  bendT: 2,
  startLv: 1, // modo demo: nivel en el que arranca Supervivencia
  demo: false, // modo demo activo (no morir, y en el taller se puede equipar todo)
  /* escaparate: en el menú la cámara se acerca a la nave */
  view: 'lobby', // 'lobby' o 'garage' (taller)
  show: 1, // 0 = cámara de juego … 1 = cámara de escaparate
  showG: 0, // 0 = lobby … 1 = taller (la nave sube y se gira con el dedo)
  yaw: 0, // giro de la nave en el taller
  lobbyYaw: 0.6, // giro de la nave en el lobby (arranca de tres cuartos; el dedo lo cambia)
  yawHold: false, // el dedo la está girando
  yawTo: null, // taller: ángulo al que se está acomodando la nave (null = quieta)
  showGuns: false, // taller: mostrar los cañones aunque no haya arma
  garageBig: false, // taller: la lista de piezas está agrandada
  showX: 0, // 0 … 1: cuánto se ha corrido la cámara para dejarle sitio a la lista agrandada
};

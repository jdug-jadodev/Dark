/** Números de balance y datos fijos del juego (metas, fases, daños, tiempos). Sin lógica. */
/* Dirección del servidor del juego (copa semanal y medición). Vacía = sin conexión: todo
   funciona igual, solo que la tabla de la copa no aparece. Se llena al publicar el
   servidor, que es un proyecto aparte (carpeta back-nave, al lado de esta). */
export const API_URL = 'https://giro-estelar.giro-estelar-servidor.workers.dev';
export const W = 360;
export const H = 640;
/* ---------- Datos ---------- */
/* Una sola nave genérica (luego se le agregarán aditamentos) */
export const SHIP_DEF = {
  id: 'gen',
  color: '#5ee0ff',
  follow: 27,
  startShield: false,
};
/* Progreso de la partida en % (0–100) según los puntos */
export const GOAL = 320; // puntos para llegar al jefe final
export const MINI_AT = 45; // % donde aparece el jefe intermedio
export const FLIP_AT = 62; // % donde se gira la pantalla (una sola vez)
export const WOB_AT = 30; // % desde donde hay turbulencias
export const PH = [
  {
    t: 0,
    name: 'Calentamiento',
    tip: 'Desliza el dedo para esquivar',
  },
  {
    t: 4,
    name: 'Naves y armas',
    tip: 'Recoge armas y derriba naves',
  },
  {
    t: 18,
    name: 'Se acelera',
    tip: 'Escuadrones enemigos a la vista',
  },
  {
    t: WOB_AT,
    name: 'Turbulencia',
    tip: 'La pantalla se moverá sola',
  },
  {
    t: 50,
    name: 'Zona roja',
    tip: 'Naves más pesadas',
  },
  {
    t: FLIP_AT,
    name: '¡Pantalla girada!',
    tip: 'Los controles siguen igual',
  },
  {
    t: 75,
    name: 'Caos total',
    tip: 'Turbulencias cada vez más seguidas',
  },
];
export const WALLS = [14, 26, 38, 56, 70, 84, 92];
export const WEAPONS = ['twin', 'spread', 'heavy', 'laser'];
export const CAPDEF = {
  shield: {
    c: '#78e6ff',
    i: '{shield}',
    t: '¡ESCUDO!',
  },
  twin: {
    c: '#ffb454',
    i: '{blaster}',
    t: '¡DOBLE CAÑÓN!',
  },
  spread: {
    c: '#b4ff5e',
    i: '{trident}',
    t: '¡ABANICO!',
  },
  heavy: {
    c: '#ff8a3c',
    i: '{bomb}',
    t: '¡CAÑÓN PESADO!',
  },
  orbit: {
    c: '#c792ff',
    i: '{orbit}',
    t: '¡ESCUDO ORBITAL!',
  },
  laser: {
    c: '#ff6b8a',
    i: '{laser}',
    t: '¡LÁSER!',
  },
  magnet: {
    c: '#6ef2a5',
    i: '{magnet}',
    t: '¡IMÁN!',
  },
  nova: {
    c: '#ffffff',
    i: '{nova}',
    t: '¡NOVA!',
  },
  repair: {
    c: '#6ef2a5',
    i: '{wrench}',
    t: '¡REPARACIÓN!',
  },
};
export const GUN_T = 10;
export const LASER_T = 6;
export const BOSS_UNLOCK = 40;
/* Supervivencia: el progreso avanza con el tiempo y no se detiene en 100 */
export const SURV_RATE = 0.7; // % de progreso por segundo (100% ≈ 2:23)
export const LVL = 12; // % por nivel (≈ 17 s por nivel)
export const SURV_TIPS = [
  'Sobrevive el mayor tiempo posible',
  'Llegan las naves enemigas',
  'Se acelera',
  'Turbulencias a la vista',
  'Naves más pesadas',
  '¡Prepárate para girar!',
  'Caos total',
  'Cada vez más rápido…',
  '¿Hasta dónde llegas?',
];
/* Avisos de los niveles donde empieza algo nuevo (los demás usan SURV_TIPS) */
export const SURV_TIP_AT = {
  5: '¡Giros de 360° y cometas! Mira de dónde vienen',
  9: 'En el nivel 10 te espera un jefe',
  10: 'Menos naves, más asteroides',
  15: '¡Arcoíris! Todo gira y se mueve más rápido',
  20: '¡Locura total! Cometas a toda velocidad',
};
/* La "locura" de Supervivencia entra por niveles */
export const CHAOS_LVL = 5; // giros de 360°, cometas lentos, la pista se mueve más y los colores van cambiando
export const RAINBOW_LVL = 15; // arcoíris rápido, más giros y más curvas
export const FRENZY_LVL = 20; // todo al máximo: cometas a toda velocidad
/* Cometas (desde CHAOS_LVL): avisan por dónde van a pasar y luego cruzan. Empiezan lentos, casi
   como una roca, y con cada nivel van más rápido hasta el tope en FRENZY_LVL. */
export const COMET_WARN = 1.9; // segundos de aviso en el nivel 5; baja de a poco hasta 1,3 en el 20 y 1 más arriba
export const COMET_SLOW = 300; // velocidad en el nivel 5
export const COMET_FAST = 1050; // velocidad desde el nivel 20
export const COMET_R = 15;
export const SURV_PAL = [
  [0x0a1030, 0x5ee0ff],
  [0x110f3e, 0x7f9dff],
  [0x1c0e42, 0xc792ff],
  [0x2a0c32, 0xff6bd0],
  [0x06282c, 0x6ef2a5],
  [0x330b1c, 0xff6b8a],
  [0x2a1a04, 0xffd54a],
  [0x041e34, 0x4fc3ff],
  [0x1a0630, 0xff8a3c],
];
/* Casco: cada golpe baja un % en vez de matar de una. En Supervivencia se repara (al pasar de
   nivel, con cápsulas, al vencer un jefe). En los mundos no se repara nunca: lo que se pierde
   en el recorrido falta contra el jefe. */
export const HULL_SHOT = 10;
export const HULL_ROCK = 15;
export const HULL_SHIP = 18;
export const HULL_COMET = 15;
export const HULL_REPAIR = 15; // lo que se repara solo al cruzar el portal de cada nivel
/* Cápsula de reparación: aparece al empezar el nivel KIT_FROM y luego cada KIT_EVERY niveles */
export const HULL_KIT = 20;
export const KIT_FROM = 7;
export const KIT_EVERY = 3;
export const HULL_BLAST = 20; // meteoritos, cráteres, púas, rayos y tentáculos: avisan, y pegan más
export const HULL_BITE = 25; // el mordisco del Devorador
export const HULL_REVIVE = 50; // Supervivencia: al revivir, el casco vuelve por lo menos a esto
export const HULL_SECOND = 40; // mundos: la segunda oportunidad empieza con esto, ni más ni menos
/* Máximo de naves enemigas a la vez según el nivel; desde el 30 ya no hay límite */
export const UNCAP_LVL = 30;
/* Jefes de Supervivencia: uno cada SURV_BOSS_EVERY niveles. Si no se le derriba en su tiempo
   (segundos), se retira sin dar premio y la partida sigue: nunca se queda trabada. */
export const SURV_BOSS_EVERY = 10;
export const SURV_BOSS_TIME = { mini: 45, final: 60 };
export const SURV_BOSS_HP = 0.7; // aguante frente al mismo jefe de Aventura (1 = igual)
export const SURV_BOSS_COINS = { mini: 40, final: 80 };
export const SURV_BOSS_REPAIR = 25; // casco que se repara al derribarlo
/* =====================================================================
   MOTOR 3D
   La lógica del juego sigue en el plano 2D original (W×H). Aquí solo se
   traduce: x del juego → X 3D, y del juego → profundidad Z 3D.
   ===================================================================== */
export const SY = H * 0.78; // fila de reposo de la nave → Z=0
/* Todo nace lejos, en la profundidad (y negativa), y se acerca más rápido
   mientras está lejos; cerca de la nave recupera su velocidad normal. */
export const SPAWN = 450;
/* ---------- Movimiento de la nave ---------- */
/* Deslizar: la nave se mueve lo mismo que el dedo (en cualquier parte).
   Flechas: velocidad constante mientras se mantiene presionado. */
export const SENS = 0.85;
export const BTN_SPEED = 270;
/* =====================================================================
   MODO VIAJE ESPACIAL · vuelo libre en 3D entre planetas
   La nave se mueve arriba/abajo/lados dentro de un túnel circular y todo
   viene de frente. El universo gira alrededor de la nave. Solo esquivar.
   ===================================================================== */
export const SPR = 120;
export const SPZ = -2400; // radio del área de vuelo · distancia donde nacen los obstáculos
export const SPACE_TIPS = [
  'Más rápido',
  'Campo de asteroides',
  'El universo gira',
  'Cuidado con las vigas',
  '¡Sigue así, piloto!',
];
/* -- PORTALES: en cada cambio de fase o nivel la pista cruza un portal -- */
export const WARP_T = 1.2;
/* -- agujeros negros en la pista (solo Aventura) -- */
export const BH_PULL = 150;
export const BH_CORE = 24;
export const SUCK_T = 1.8;
export const NITRO_COST = 50;
export const NITRO_GAIN = 20;
export const NITRO_T = 1.4;
export const COUNT_STEP = 0.9;

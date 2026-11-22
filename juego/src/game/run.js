/** Partida nueva, generadores (rocas, paredes, monedas, cápsulas), partículas y avance ambiental. */
import { G } from '../core/state.js';
import { FLIP_AT, LVL, SHIP_DEF, SPAWN, SY, W, WALLS } from '../core/config.js';
import { clamp, rand, roll, rollIn, seedTrack, vrand } from '../core/util.js';
import { survivalMap } from '../core/worlds.js';
import { initBoss } from './boss.js';
import { spaceInit } from './space.js';
import { $ } from '../ui/dom.js';
/* ---------- Nueva partida ---------- */
export function newRun(mode) {
  /* con semilla (solo Supervivencia), la pista es la misma para todo el que use esa semilla */
  const seed = mode === 'endless' && G.nextSeed != null ? G.nextSeed >>> 0 : null;
  seedTrack(seed);
  G.acc = 0;
  /* el mundo que se juega (ni Supervivencia ni Viaje espacial tienen mundo) */
  const world = mode === 'endless' || mode === 'space' ? null : G.nextWorld;
  /* Supervivencia se juega en el mapa elegido (G.nextMap: un mundo, o null = el espacio) o en uno al azar */
  const map = mode !== 'endless' ? null : G.nextMap !== undefined ? G.nextMap : survivalMap();
  G.nextMap = undefined;
  const sd = SHIP_DEF;
  G.ship = {
    x: W / 2,
    y: SY,
    r: 10,
    tx: W / 2,
    ty: SY,
    follow: sd.follow * (world && world.slip ? world.slip : 1), // en el hielo la nave resbala
    shield: !!sd.startShield,
    gun: null,
    orbit: 0,
    laser: 0,
    mag: 0,
    fire: 0,
    inv: 0,
    color: sd.color,
    id: sd.id,
    px: W / 2,
    py: SY,
    vxs: 0,
    vys: 0,
    nitro: 0,
    ghost: 0,
    hidden: false,
  };
  G.obs = [];
  G.coins = [];
  G.caps = [];
  G.bullets = [];
  G.parts = [];
  G.pops = [];
  G.eb = [];
  G.rings = [];
  G.en = [];
  G.t = 0;
  G.angle = 0;
  G.shake = 0;
  G.run = {
    coins: 0,
    near: 0,
    dodged: 0,
    combo: 0,
    comboT: 0,
    bestCombo: 0,
    revived: false,
    spawnT: 0.6,
    coinT: 3,
    wallIdx: 0,
    pcT: 7,
    enT: 3,
    oa: 0,
    rot: {
      st: 0,
      t: 0,
      at: world && !world.flip ? Infinity : FLIP_AT, // hay mundos donde la pantalla no se voltea
    },
    wb: {
      t: -1,
      next: 3,
      dur: 0,
      n: 0,
    },
    pts: 0,
    stage: 'run',
    transT: 0,
    phase: -1,
    sp: 170,
    invincible: $('inv').checked,
    mode: mode === 'boss' || mode === 'endless' || mode === 'space' ? mode : 'run',
    miniDone: false,
    wpnPicks: 0,
    kills: 0,
    nextWall: 0,
    boss: null,
    nitro: 0,
    holes: [],
    bhT: 12,
    suck: null,
    bhSeen: false,
    portals: [],
    warp: 0,
    hull: 100,
    hits: 0,
    /* locura de Supervivencia: vueltas de 360° y cometas */
    spin: {
      t: -1,
      next: 3,
      dur: 0,
      dir: 1,
      turns: 1,
    },
    calm: 0, // respiro antes del próximo movimiento de pantalla
    comets: [],
    peakT: 3, // cuánto falta para la próxima montaña en la pista (en los mundos que las tienen)
    blasts: [], // lo que va a explotar en la pista: meteoritos cayendo y cráteres (game/blasts.js)
    meteorT: 4,
    craterT: 3,
    cometT: 2.5,
    head: 0,
    world, // el mundo (core/worlds.js) o null
    map, // en Supervivencia: el mundo del que se toma el paisaje (null = el espacio)
    seed, // semilla de la pista (null = al azar)
    kind: seed == null ? null : G.nextKind || null, // 'duel' = un reto entre amigos
    duel: seed != null && G.nextKind === 'duel' ? G.nextDuel : null, // el reto: { code, rival } (null si se está creando)
    beat: false, // ya superó el tiempo del rival en esta partida
    sig: {}, // huella de la pista: ver mark()
    /* jefes de Supervivencia: nivel del que está por llegar, cuántos han salido, cuántos cayeron
       y segundos que le quedan al que está en pantalla */
    bossDue: 0,
    bossNo: 0,
    bossKills: 0,
    bossLeft: 0,
  };
  /* modo demo: Supervivencia puede arrancar en un nivel alto. El tiempo sigue contando desde cero;
     solo se adelanta el progreso, y con él todo lo que ya habría pasado (paredes, primer giro). */
  if (G.run.mode === 'endless' && G.run.invincible && G.startLv > 1) {
    const x = (G.startLv - 1) * LVL;
    G.run.head = x;
    G.run.wallIdx = WALLS.filter((w) => w <= x).length;
    G.run.nextWall = x + 10;
    G.run.rot.at = Math.max(FLIP_AT, x + 8);
  }
  if (G.run.mode === 'boss') initBoss();
  if (G.run.mode === 'space') spaceInit();
}
/* Huella de la pista (solo con semilla): por cada cosa que sale (roca, pared, monedas, cometa) se
   mezclan sus números en un resumen y se guarda una marca. Dos partidas con la misma
   semilla deben dejar las mismas marcas: sirve para comprobarlo. */
export function mark(kind, ...values) {
  const R = G.run;
  if (R.seed == null) return;
  const s = R.sig[kind] || (R.sig[kind] = { n: 0, h: 2166136261, at: [] });
  for (const v of values) s.h = Math.imul(s.h ^ Math.round(v * 10), 16777619) >>> 0;
  if (++s.n % (kind === 'rock' ? 10 : 1) === 0) s.at.push(s.h); // las rocas son muchas: una marca cada 10
}
/* ---------- Generadores ---------- */
export function spawnRock(sp) {
  const r = rollIn('rock', 12, 26);
  const o = {
    x: rollIn('rock', r + 4, W - r - 4),
    y: -SPAWN - r,
    r,
    vx: 0,
    vy: sp * rollIn('rock', 0.85, 1.2),
    rot: rollIn('rock', 0, 6.28),
    vr: rollIn('rock', -2, 2),
  };
  if (G.t > 5 && roll('rock') < 0.5) o.vx = rollIn('rock', -95, 95);
  mark('rock', o.x, o.r, o.vx || 0);
  G.obs.push(o);
}
export function spawnWall(v) {
  const gc = Math.floor(rollIn('wall', 0, 6));
  mark('wall', gc);
  for (let i = 0; i < 7; i++) {
    if (i === gc || i === gc + 1) continue;
    G.obs.push({
      x: 26 + i * 51.3,
      y: -SPAWN - 25,
      r: 25,
      vx: 0,
      vy: v,
      rot: rollIn('wall', 0, 6),
      vr: rollIn('wall', -0.6, 0.6),
      wall: true,
    });
  }
  G.pops.push({
    x: W / 2,
    y: 60,
    text: '¡Sigue el camino!',
    life: 1.4,
    col: '#ffb454',
  });
}
/* Monedas: de a una o máximo dos seguidas */
/* Montañas (o volcanes): obstáculos grandes plantados en la pista. No giran ni se rompen con las
   armas: hay que rodearlos. Se ven venir desde lejos. A veces salen dos, con un paso entre ellas. */
export function spawnPeak(P) {
  const put = (x, r, more) => G.obs.push({ x, y: -SPAWN - 250, r, vx: 0, vy: 0, rot: 0, vr: 0, peak: true, ...more });
  const r = rollIn('peak', P.r[0], P.r[1]);
  if (roll('peak') < P.pair) {
    const gap = rollIn('peak', 100, 135),
      c = rollIn('peak', 110, W - 110);
    put(c - gap / 2 - r, r);
    put(c + gap / 2 + r, r);
    mark('peak', c, gap, r);
  } else {
    const x = rollIn('peak', r + 8, W - r - 8);
    put(x, r);
    mark('peak', x, r);
    /* junto al volcán, un charco de lo que le escurre (del lado donde hay más pista) */
    if (P.pools && roll('peak') < P.pools.p) {
      const pr = rollIn('peak', P.pools.r[0], P.pools.r[1]),
        side = x < W / 2 ? 1 : -1,
        px = x + side * (r + pr + 4);
      if (px > pr && px < W - pr) put(px, pr, { pool: true, y: -SPAWN - 250 - rollIn('peak', -50, 70) });
    }
  }
}
/* Charcos solos (lava): dos, en diagonal, dejando por dónde pasar. No se rompen: se rodean. */
export function spawnPools(L) {
  const r1 = rollIn('peak', L.r[0], L.r[1]),
    r2 = rollIn('peak', L.r[0], L.r[1]),
    x1 = rollIn('peak', r1, W / 2 - 20),
    x2 = clamp(x1 + r1 + r2 + rollIn('peak', 105, 150), r2, W - r2),
    put = (x, r, y) => G.obs.push({ x, y, r, vx: 0, vy: 0, rot: 0, vr: 0, peak: true, pool: true });
  put(x1, r1, -SPAWN - 250);
  put(x2, r2, -SPAWN - 250 - rollIn('peak', 60, 140));
  mark('peak', x1, x2);
}
/* Un arco: dos pilares con un paso en medio (por ahí hay que pasar) y algo por encima.
   A veces el paso es estrecho y a veces el arco cruza casi toda la pista. */
export function spawnArch(A) {
  const gap = rollIn('peak', A.gap[0], A.gap[1]),
    span = gap + A.r * 2, // de centro a centro de los pilares
    left = rollIn('peak', A.r, Math.max(A.r, W - A.r - span)),
    one = (x, more) => G.obs.push({ x, y: -SPAWN - 250, r: A.r, vx: 0, vy: 0, rot: 0, vr: 0, peak: true, ...more });
  one(left, { arch: span });
  one(left + span, { archEnd: true });
  mark('peak', left, span);
}
export function spawnCoins() {
  const x = rollIn('coin', 30, W - 30),
    n = 1 + Math.floor(roll('coin') * 2);
  mark('coin', x, n);
  for (let i = 0; i < n; i++)
    G.coins.push({
      x,
      y: -SPAWN - i * 48,
      vy: G.run.sp * 0.6,
    });
}
export function spawnCap(type, x, y, vy) {
  G.caps.push({
    x: x == null ? rollIn('cap', 40, W - 40) : x,
    y: y == null ? -SPAWN : y,
    r: 13,
    type,
    vy: vy || 120,
  });
}
export function explode(x, y, col, n) {
  n = n || 12;
  for (let i = 0; i < n; i++) {
    const a = rand(0, 6.28),
      v = rand(40, 220);
    G.parts.push({
      x,
      y,
      h: rand(-2, 6),
      vh: rand(-90, 150),
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: rand(0.3, 0.7),
      max: 0.7,
      col,
    });
  }
}
/* La nave revienta con la explosión que el jugador lleva puesta (B = pieza de core/parts.js).
   La clásica es la de siempre. Las demás usan el azar de adornos, no el de la partida. */
export function shipBoom(x, y, B) {
  if (!B || !B.style) return explode(x, y, '#ff6b8a', 26);
  const col = () => B.cols[Math.floor(vrand() * B.cols.length)];
  const spark = (a, v, life, vh, r) =>
    G.parts.push({
      x: x + Math.cos(a) * (r || 0),
      y: y + Math.sin(a) * (r || 0),
      h: vrand(-2, 6),
      vh,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life,
      max: life,
      col: col(),
    });
  const ring = (life) => G.rings.push({ x, y, r: 10, life, col: B.cols[0] });
  const n = B.n,
    any = () => vrand(0, 6.283);
  if (B.style === 'burst') {
    /* bola de fuego: muchas chispas en todas direcciones */
    for (let i = 0; i < n; i++) spark(any(), vrand(40, 270), vrand(0.35, 0.8), vrand(-90, 170));
  } else if (B.style === 'shards') {
    /* astillas: rápidas, a ras, se apagan pronto */
    for (let i = 0; i < n; i++) spark(any(), vrand(190, 460), vrand(0.22, 0.5), vrand(-20, 40));
  } else if (B.style === 'ring') {
    /* onda: un círculo parejo que se abre, con su anillo */
    for (let i = 0; i < n; i++) spark((i / n) * 6.283, 250 + vrand(-12, 12), 0.6, 0);
    ring(0.7);
  } else if (B.style === 'fountain') {
    /* confeti: sale hacia arriba y cae despacio */
    for (let i = 0; i < n; i++) spark(any(), vrand(20, 130), vrand(0.6, 1.2), vrand(120, 400));
  } else if (B.style === 'implode') {
    /* implosión: las chispas vienen de afuera hacia el centro, y al final un destello */
    for (let i = 0; i < n; i++) {
      const r = vrand(90, 170),
        life = vrand(0.35, 0.55);
      spark(any(), -r / life, life, 0, r);
    }
    for (let i = 0; i < 14; i++) spark(any(), vrand(20, 90), vrand(0.5, 0.75), vrand(0, 60));
  } else {
    /* supernova: dos anillos, una onda pareja y una nube de chispas */
    for (let i = 0; i < n; i++)
      if (i % 3 === 0) spark((i / n) * 6.283, 330, 0.7, 0);
      else spark(any(), vrand(40, 300), vrand(0.4, 1), vrand(-80, 220));
    ring(0.7);
    ring(0.42);
  }
}
export function ambient(dt) {
  for (let i = G.parts.length - 1; i >= 0; i--) {
    const p = G.parts[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.h += (p.vh || 0) * dt;
    p.life -= dt;
    if (p.life <= 0) G.parts.splice(i, 1);
  }
  for (let i = G.pops.length - 1; i >= 0; i--) {
    G.pops[i].life -= dt;
    if (G.pops[i].life <= 0) G.pops.splice(i, 1);
  }
  G.shake = Math.max(0, G.shake - dt * 1.6);
  for (let i = G.rings.length - 1; i >= 0; i--) {
    G.rings[i].r += dt * 600;
    G.rings[i].life -= dt;
    if (G.rings[i].life <= 0) G.rings.splice(i, 1);
  }
  if (G.run.mode === 'boss' && G.state === 'count' && G.run.boss) {
    G.run.boss.y += (92 - G.run.boss.y) * Math.min(1, dt * 2.5);
  }
  if (G.state !== 'play' && G.state !== 'paused') G.angle *= 0.9;
}

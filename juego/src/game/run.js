/** Partida nueva, generadores (rocas, paredes, monedas, cápsulas), partículas y avance ambiental. */
import { G } from '../core/state.js';
import { FLIP_AT, LVL, SHIP_DEF, SPAWN, SY, W, WALLS } from '../core/config.js';
import { rand } from '../core/util.js';
import { initBoss } from './boss.js';
import { spaceInit } from './space.js';
import { $ } from '../ui/dom.js';
/* ---------- Nueva partida ---------- */
export function newRun(mode) {
  const sd = SHIP_DEF;
  G.ship = {
    x: W / 2,
    y: SY,
    r: 10,
    tx: W / 2,
    ty: SY,
    follow: sd.follow,
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
      at: FLIP_AT,
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
    cometT: 2.5,
    head: 0,
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
/* ---------- Generadores ---------- */
export function spawnRock(sp) {
  const r = rand(12, 26);
  const o = {
    x: rand(r + 4, W - r - 4),
    y: -SPAWN - r,
    r,
    vx: 0,
    vy: sp * rand(0.85, 1.2),
    rot: rand(0, 6.28),
    vr: rand(-2, 2),
  };
  if (G.t > 5 && Math.random() < 0.5) o.vx = rand(-95, 95);
  G.obs.push(o);
}
export function spawnWall(v) {
  const gc = Math.floor(rand(0, 6));
  for (let i = 0; i < 7; i++) {
    if (i === gc || i === gc + 1) continue;
    G.obs.push({
      x: 26 + i * 51.3,
      y: -SPAWN - 25,
      r: 25,
      vx: 0,
      vy: v,
      rot: rand(0, 6),
      vr: rand(-0.6, 0.6),
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
export function spawnCoins() {
  const x = rand(30, W - 30),
    n = 1 + Math.floor(Math.random() * 2);
  for (let i = 0; i < n; i++)
    G.coins.push({
      x,
      y: -SPAWN - i * 48,
      vy: G.run.sp * 0.6,
    });
}
export function spawnCap(type, x, y, vy) {
  G.caps.push({
    x: x == null ? rand(40, W - 40) : x,
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

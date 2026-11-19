/** Jefes intermedio y final: movimiento, ataques al azar, armas que caen, naves de apoyo. */
import { emit } from '../core/events.js';
import { G } from '../core/state.js';
import { SPAWN, W, WEAPONS } from '../core/config.js';
import { clamp, ease, pick, rand } from '../core/util.js';
import { hitEnemy, spawnEnemy, updateEB, updateEnemies } from './enemies.js';
import { moveBullets, rndWeapon, updateCaps, updatePowers } from './powers.js';
import { explode, spawnCap } from './run.js';
import { followPointer } from './ship.js';
import { after } from './timers.js';
import { $ } from '../ui/dom.js';
import { finishBoss } from '../ui/endScreens.js';
import { showToast } from '../ui/hud.js';
export const liveBoss = () => (G.run.boss && !G.run.boss.dead && G.run.boss.intro <= 0 ? G.run.boss : null);
/* ---------- Jefes: ataques aleatorios ---------- */
function newBoss(kind) {
  const mini = kind === 'mini';
  return {
    kind,
    x: W / 2,
    tx: W / 2,
    y: -SPAWN,
    hp: mini ? 140 : 300,
    max: mini ? 140 : 300,
    flash: 0,
    w: mini ? 84 : 104,
    h: mini ? 50 : 62,
    dead: false,
    intro: 2.4,
    t: 0,
    ph: 0,
    atk: null,
    rest: 1,
    last: '',
    moveT: 1,
    wpT: 1.2,
    enT: 6,
  };
}
export function initBoss() {
  G.run.boss = newBoss('final');
  G.run.bt = 0;
  G.run.flipStart = null;
  G.run.flipped = false;
}
const ATK_POOL = {
  mini: [
    ['fan', 'aimed', 'rain'],
    ['fan', 'aimed', 'rain', 'ring'],
  ],
  final: [
    ['fan', 'aimed', 'rain', 'ring'],
    ['fan', 'aimed', 'rain', 'ring', 'wall', 'spiral'],
    ['aimed', 'rain', 'ring', 'wall', 'spiral', 'cross', 'burst'],
  ],
};
function shoot(x, y, a, sp, r, col) {
  G.eb.push({
    x,
    y,
    vx: Math.cos(a) * sp,
    vy: Math.sin(a) * sp,
    r,
    col,
  });
}
function startAtk(b) {
  const pool = ATK_POOL[b.kind][Math.min(b.ph, ATK_POOL[b.kind].length - 1)];
  let k;
  do {
    k = pick(pool);
  } while (k === b.last && pool.length > 1);
  b.last = k;
  b.atk = {
    k,
    t: 0,
    acc: 0,
    a: rand(0, 6.28),
    dir: Math.random() < 0.5 ? 1 : -1,
    done: false,
  };
  if (k === 'burst') {
    emit('bossCharge');
    G.pops.push({
      x: b.x,
      y: b.y + 60,
      text: '¡CUIDADO!',
      life: 1,
      col: '#ffffff',
    });
  }
}
function tickAtk(b, dt) {
  const A = b.atk,
    ph = b.ph,
    sm = (b.kind === 'mini' ? 0.85 : 1) * (1 + ph * 0.12),
    bx = b.x,
    by = b.y + 30;
  A.t += dt;
  A.acc -= dt;
  let dur = 1.5;
  const shotsBefore = G.eb.length;
  switch (A.k) {
    case 'fan':
      dur = 1.4;
      if (A.acc <= 0) {
        A.acc = 0.65;
        const n = 5 + ph * 2;
        for (let i = 0; i < n; i++)
          shoot(bx, by, Math.PI / 2 + (i - (n - 1) / 2) * (1.2 / (n - 1)) + rand(-0.06, 0.06), 190 * sm, 7, '#ff6b8a');
      }
      break;
    case 'aimed':
      dur = 1.8;
      if (A.acc <= 0) {
        A.acc = 0.45;
        const a0 = Math.atan2(G.ship.y - by, G.ship.x - bx);
        for (let k = -1; k <= 1; k++) shoot(bx, by, a0 + k * 0.14, 240 * sm, 6, '#ffd54a');
      }
      break;
    case 'rain':
      dur = 2.4;
      if (A.acc <= 0) {
        A.acc = 0.1 - 0.02 * ph;
        shoot(rand(15, W - 15), b.y + 10, Math.PI / 2 + rand(-0.1, 0.1), rand(150, 220) * sm, 6, '#6ef2a5');
      }
      break;
    case 'ring':
      dur = 1.7;
      if (A.acc <= 0) {
        A.acc = 0.8;
        const n = 14 + ph * 2;
        A.a += 0.2;
        for (let i = 0; i < n; i++) shoot(bx, b.y, A.a + (i / n) * 6.283, 150 * sm, 6, '#78e6ff');
      }
      break;
    case 'wall':
      dur = 2.2;
      if (A.acc <= 0) {
        A.acc = 1.1;
        const gx = rand(70, W - 70);
        for (let x = 15; x < W; x += 30) {
          if (Math.abs(x - gx) < 62) continue;
          G.eb.push({
            x,
            y: b.y + 40,
            vx: 0,
            vy: 150 * sm,
            r: 9,
            col: '#ffb454',
          });
        }
        G.pops.push({
          x: W / 2,
          y: 220,
          text: '¡Sigue el camino!',
          life: 1.2,
          col: '#ffb454',
        });
      }
      break;
    case 'spiral':
      dur = 2.6;
      if (A.acc <= 0) {
        A.acc = 0.07;
        A.a += 0.45 * A.dir;
        for (const arm of [0, Math.PI]) shoot(bx, b.y, A.a + arm, 160 * sm, 6, '#c792ff');
      }
      break;
    case 'cross':
      dur = 2.2;
      if (A.acc <= 0) {
        A.acc = 0.22;
        A.a += 0.25 * A.dir;
        for (let k = 0; k < 4; k++) shoot(bx, b.y, A.a + (k * Math.PI) / 2, 180 * sm, 7, '#ff8a3c');
      }
      break;
    case 'burst':
      dur = 1.3;
      if (A.t >= 0.6 && !A.done) {
        A.done = true;
        b.flash = 0.15;
        const n = 26;
        for (let i = 0; i < n; i++) shoot(bx, b.y, (i / n) * 6.283, rand(120, 230) * sm, 6, '#ffffff');
      }
      break;
  }
  if (G.eb.length > shotsBefore) emit('bossShot');
  if (A.t >= dur) {
    b.atk = null;
    b.rest = (rand(0.3, 0.9) / (1 + 0.25 * ph)) * (b.kind === 'mini' ? 1.15 : 1);
  }
}
/* Movimiento, ataques, armas que caen y naves de apoyo. */
export function bossTick(dt) {
  const b = G.run.boss;
  b.flash = Math.max(0, b.flash - dt);
  if (b.intro > 0) {
    b.intro -= dt;
    b.y += (92 - b.y) * Math.min(1, dt * 2.2);
    b.x += (W / 2 - b.x) * Math.min(1, dt * 2);
    return;
  }
  b.t += dt;
  const r = b.hp / b.max;
  b.ph = b.kind === 'mini' ? (r > 0.5 ? 0 : 1) : r > 0.66 ? 0 : r > 0.33 ? 1 : 2;
  b.moveT -= dt;
  if (b.moveT <= 0) {
    b.moveT = rand(1.6, 3) / (1 + 0.25 * b.ph);
    b.tx = rand(70, W - 70);
  }
  b.x += (b.tx - b.x) * Math.min(1, dt * (1.1 + b.ph * 0.5));
  b.y = 92 + Math.sin(b.t * 1.3) * 8;
  if (b.atk) tickAtk(b, dt);
  else {
    b.rest -= dt;
    if (b.rest <= 0) startAtk(b);
  }
  /* armas: si estás desarmado caen rápido y cerca de ti */
  const armed = !!G.ship.gun || G.ship.laser > 0;
  if (!armed && b.wpT > 4 && !G.caps.some((c) => WEAPONS.includes(c.type))) b.wpT = 4;
  b.wpT -= dt;
  if (b.wpT <= 0) {
    b.wpT = armed ? rand(8, 11) : 4;
    const tp = Math.random() < 0.75 ? rndWeapon() : pick(['shield', 'orbit', 'nova']);
    spawnCap(tp, clamp(G.ship.x + rand(-80, 80), 40, W - 40), 170, 105);
  }
  if (b.kind === 'final') {
    b.enT -= dt;
    if (b.enT <= 0) {
      b.enT = rand(4.5, 6.5) / (1 + 0.3 * b.ph);
      if (G.en.length < 3 + b.ph) spawnEnemy(true);
    }
  }
}
/* ---------- Jefe intermedio ---------- */
export function startMini() {
  G.run.stage = 'mini';
  G.run.boss = newBoss('mini');
  G.run.wb.t = -1;
  for (const e of G.en) e.life = Math.min(e.life, 0);
  $('hud').classList.add('boss');
  showToast('¡JEFE INTERMEDIO!', 'Vigía Ámbar · recoge armas y derríbalo');
  emit('bossIntro');
}
export function endMini() {
  const b = G.run.boss;
  explode(b.x, b.y, '#ffb454', 50);
  explode(b.x, b.y, '#ffffff', 20);
  G.shake = 0.7;
  emit('bossDown');
  G.eb.length = 0;
  G.run.boss = null;
  G.run.stage = 'run';
  G.run.miniDone = true;
  G.run.pts += 30;
  G.run.coins += 20;
  G.run.spawnT = 1.5;
  G.run.enT = 5;
  $('hud').classList.remove('boss');
  G.pops.push({
    x: W / 2,
    y: 240,
    text: '¡JEFE DERROTADO! +30 · +20 🪙',
    life: 1.8,
    col: '#ffd54a',
  });
  spawnCap('shield', W / 2, 200, 110);
}
/* ---------- Partida normal ---------- */
export function beginBoss() {
  $('warn').classList.remove('show');
  G.obs.length = 0;
  G.en.length = 0;
  G.eb.length = 0;
  G.coins.length = 0;
  G.caps.length = 0;
  G.bullets.length = 0;
  G.run.portals.length = 0;
  G.run.holes.length = 0;
  G.run.suck = null;
  G.run.mode = 'boss';
  initBoss();
  G.run.phase = -1;
  G.angle = 0;
  $('hud').classList.add('boss');
  showToast('¡JEFE FINAL!', 'Centinela del Vacío');
  emit('bossIntro');
}
export function updateBoss(dt) {
  const b = G.run.boss;
  if (b.intro > 0) {
    bossTick(dt);
    G.angle *= 0.85;
    followPointer(dt);
    updatePowers(dt);
    moveBullets(dt);
    updateCaps(dt);
    return;
  }
  G.run.bt += dt;
  const bt = G.run.bt;
  G.t = bt;
  const r = b.hp / b.max,
    ph = r > 0.66 ? 0 : r > 0.33 ? 1 : 2;
  if (ph !== G.run.phase) {
    if (G.run.phase !== -1)
      showToast(
        'Fase ' + (ph + 1) + ' de 3',
        ['', 'Ataques nuevos y naves de apoyo', '¡Todo vale! No te detengas'][ph],
      );
    if (G.run.phase !== -1) emit('phase');
    G.run.phase = ph;
  }
  if (r < 0.5 && G.run.flipStart === null && !G.run.flipped) {
    G.run.flipped = true;
    G.run.flipStart = bt + 1.5;
  }
  let ang = 0,
    warn = false,
    wtxt = '¡GIRA EL CELU!';
  if (G.run.flipStart !== null) {
    const x = bt - G.run.flipStart;
    if (x < 0) warn = true;
    else if (x < 1.6) ang = Math.PI * ease(x / 1.6);
    else if (x < 8.6) {
      ang = Math.PI;
      if (x > 7.1) {
        warn = true;
        wtxt = '¡VUELVE A LA NORMALIDAD!';
      }
    } else if (x < 10.2) ang = Math.PI * (1 - ease((x - 8.6) / 1.6));
    else G.run.flipStart = null;
  }
  if (ang === 0 && r < 0.25) ang = Math.sin(bt * 0.9) * 0.32 * Math.min(1, (0.25 - r) / 0.1);
  G.angle = ang;
  $('warnTxt').textContent = wtxt;
  $('warn').classList.toggle('show', warn);
  if (warn) emit('alarm');
  followPointer(dt);
  updatePowers(dt);
  G.ship.inv = Math.max(0, G.ship.inv - dt);
  bossTick(dt);
  moveBullets(dt);
  if (updateEnemies(dt)) return;
  if (updateEB(dt)) return;
  updateCaps(dt);
  if (b.hp <= 0 && !b.dead) {
    b.hp = 0;
    b.dead = true;
    G.state = 'victory';
    G.shake = 0.9;
    emit('bossDown');
    G.eb.length = 0;
    for (const e of G.en) hitEnemy(e, 99);
    explode(b.x, b.y, '#ff6b8a', 60);
    explode(b.x, b.y, '#ffd54a', 40);
    $('warn').classList.remove('show');
    after(1.3, () => finishBoss(true));
  }
}

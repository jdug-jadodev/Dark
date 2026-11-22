/** Jefes intermedio y final: movimiento, ataques al azar, armas que caen, naves de apoyo. */
import { updateBlasts, zone } from './blasts.js';
import { emit } from '../core/events.js';
import { G } from '../core/state.js';
import {
  H,
  HULL_BITE,
  SPAWN,
  SURV_BOSS_COINS,
  SURV_BOSS_HP,
  SURV_BOSS_REPAIR,
  SURV_BOSS_TIME,
  SURV_RATE,
  SY,
  W,
  WEAPONS,
} from '../core/config.js';
import { clamp, ease, roll, rollIn, rollPick } from '../core/util.js';
import { hitEnemy, spawnEnemy, updateEB, updateEnemies } from './enemies.js';
import { moveBullets, rndWeapon, updateCaps, updatePowers } from './powers.js';
import { explode, spawnCap } from './run.js';
import { spinning } from './screenfx.js';
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
  const b = (G.run.boss = newBoss('final')),
    w = G.run.world;
  /* el jefe de un mundo: su nombre, sus colores y su aguante */
  if (w) {
    b.name = w.boss.name;
    b.look = w.boss.look;
    b.form = w.boss.form;
    if (b.form) {
      b.w = 150; // es más grande que los jefes de siempre
      b.h = 80;
    }
    b.sig = w.boss.sig;
    b.hp = b.max = Math.round(b.max * w.boss.hp);
  }
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
  /* el jefe de un mundo intercala su ataque propio: uno de los de siempre, uno suyo */
  const own = b.sig && !b.sig.includes(b.last) ? b.sig : null,
    pool = own || ATK_POOL[b.kind][Math.min(b.ph, ATK_POOL[b.kind].length - 1)];
  let k;
  do {
    k = rollPick('boss', pool);
  } while (k === b.last && pool.length > 1);
  b.last = k;
  b.atk = {
    k,
    t: 0,
    acc: 0,
    a: rollIn('boss', 0, 6.28),
    dir: roll('boss') < 0.5 ? 1 : -1,
    done: false,
    n: 0,
  };
  if (own) emit('bossCharge');
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
          shoot(
            bx,
            by,
            Math.PI / 2 + (i - (n - 1) / 2) * (1.2 / (n - 1)) + rollIn('boss', -0.06, 0.06),
            190 * sm,
            7,
            '#ff6b8a',
          );
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
        shoot(
          rollIn('boss', 15, W - 15),
          b.y + 10,
          Math.PI / 2 + rollIn('boss', -0.1, 0.1),
          rollIn('boss', 150, 220) * sm,
          6,
          '#6ef2a5',
        );
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
        const gx = rollIn('boss', 70, W - 70);
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
    /* ---- los ataques propios de cada jefe de mundo: avisan en el suelo y luego golpean ---- */
    case 'spikes': // hielo: filas de púas cruzan la pista, cada una con un hueco
      dur = 3;
      if (A.acc <= 0 && A.n < 2 + ph) {
        A.acc = 0.85;
        A.n++;
        const gap = rollIn('boss', 60, W - 60),
          y = clamp(G.ship.y + rollIn('boss', -45, 45), H * 0.46, SY);
        for (let x = 24; x < W; x += 48)
          if (Math.abs(x - gap) > 56) zone({ kind: 'spike', x, y, r: 26, t: 1.15, linger: 0.5 });
      }
      break;
    case 'meteors': // fuego: llueven meteoritos donde está la nave
      dur = 3;
      if (A.acc <= 0 && A.t < 2.2) {
        A.acc = 0.5 - 0.08 * ph;
        zone({
          kind: 'meteor',
          x: clamp(G.ship.x + rollIn('boss', -75, 75), 36, W - 36),
          y: clamp(G.ship.y + rollIn('boss', -70, 40), H * 0.44, SY + 10),
          r: 36,
          t: 1.25,
          side: roll('boss') < 0.5 ? -1 : 1,
        });
      }
      break;
    case 'craters': // gases: se abren cráteres por toda la pista y estallan uno tras otro
      dur = 3.4;
      if (!A.done) {
        A.done = true;
        const n = 5 + ph * 2;
        for (let i = 0; i < n; i++)
          zone({
            kind: 'crater',
            x: i ? rollIn('boss', 40, W - 40) : G.ship.x,
            y: i ? rollIn('boss', H * 0.44, SY + 10) : G.ship.y,
            r: rollIn('boss', 38, 50),
            t: 1.3 + i * 0.26,
          });
      }
      break;
    case 'strike': // ciudad: marca carriles y los barre con un rayo; quedan uno o dos libres
      dur = 3;
      if (A.acc <= 0 && A.n < 2 + (ph ? 1 : 0)) {
        A.acc = 0.95;
        A.n++;
        const lanes = 5,
          lw = W / lanes,
          free = Math.floor(roll('boss') * lanes),
          free2 = ph < 2 ? (free + 1 + Math.floor(roll('boss') * (lanes - 1))) % lanes : -1;
        for (let l = 0; l < lanes; l++)
          if (l !== free && l !== free2)
            zone({ kind: 'beam', col: true, x: (l + 0.5) * lw, w: lw / 2 - 4, t: 1.1, linger: 0.3 });
      }
      break;
    case 'tentacle': // agujero negro: tentáculos que caen a lo largo de la pista, donde está la nave
      dur = 3.2;
      if (A.acc <= 0 && A.n < 3 + ph) {
        A.acc = 0.72 - 0.08 * ph;
        A.n++;
        zone({
          kind: 'tentacle',
          col: true,
          x: clamp(G.ship.x + rollIn('boss', -22, 22), 30, W - 30),
          w: 24,
          t: 1.05,
          linger: 0.45,
        });
      }
      break;
    case 'pull': // agujero negro: traga. Arrastra la nave hacia su boca; hay que tirar hacia atrás
      dur = 3.8;
      if (!A.done) {
        A.done = true;
        G.pops.push({ x: W / 2, y: 230, text: '¡TE TRAGA! Tira hacia atrás', life: 1.6, col: '#ff8a3c' });
      }
      b.pull = A.t < 3.3 ? Math.min(1, A.t / 0.4) : 0;
      if (b.pull) {
        G.ship.ty -= (150 + 35 * ph) * b.pull * dt;
        G.ship.tx += (b.x - G.ship.tx) * 0.7 * dt;
        /* llegó hasta arriba: la muerde y la escupe hacia atrás */
        if (G.ship.y < H * 0.42 + 16 && G.ship.inv <= 0) {
          zone({ kind: 'bite', x: G.ship.x, y: G.ship.y, r: 44, t: 0.01, dmg: HULL_BITE });
          G.ship.ty += 190;
        }
      }
      break;
    case 'burst':
      dur = 1.3;
      if (A.t >= 0.6 && !A.done) {
        A.done = true;
        b.flash = 0.15;
        const n = 26;
        for (let i = 0; i < n; i++) shoot(bx, b.y, (i / n) * 6.283, rollIn('boss', 120, 230) * sm, 6, '#ffffff');
      }
      break;
  }
  if (G.eb.length > shotsBefore) emit('bossShot');
  if (A.t >= dur) {
    b.atk = null;
    b.pull = 0;
    b.rest = (rollIn('boss', 0.3, 0.9) / (1 + 0.25 * ph)) * (b.kind === 'mini' ? 1.15 : 1);
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
    b.moveT = rollIn('boss', 1.6, 3) / (1 + 0.25 * b.ph);
    b.tx = rollIn('boss', 70, W - 70);
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
    b.wpT = armed ? rollIn('boss', 8, 11) : 4;
    const tp = roll('boss') < 0.75 ? rndWeapon() : rollPick('boss', ['shield', 'orbit', 'nova']);
    spawnCap(tp, clamp(G.ship.x + rollIn('boss', -80, 80), 40, W - 40), 170, 105);
  }
  if (b.kind === 'final') {
    b.enT -= dt;
    if (b.enT <= 0) {
      b.enT = rollIn('boss', 4.5, 6.5) / (1 + 0.3 * b.ph);
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
    text: '¡JEFE DERROTADO! +30 · +20 {coin}',
    life: 1.8,
    col: '#ffd54a',
  });
  spawnCap('shield', W / 2, 200, 110);
}
/* ---------- Jefes de Supervivencia: uno cada 10 niveles ----------
   Salen por turnos el Vigía y el Centinela, cada vez con más aguante. El jugador tiene un
   tiempo para derribarlo (premio: monedas, reparación y un escudo); si no, el jefe se retira. */
const NAME = { mini: 'Vigía Ámbar', final: 'Centinela del Vacío' };
export const bossName = (b) => NAME[b.kind];
/* el jefe espera a que la pantalla esté quieta y sin cometas ni paredes a la vista */
export const survBossFree = () =>
  G.run.rot.st === 0 && G.run.wb.t < 0 && !spinning() && !G.run.comets.length && !G.obs.some((o) => o.wall);
export function startSurvBoss() {
  const R = G.run,
    n = ++R.bossNo,
    kind = n % 2 ? 'mini' : 'final',
    round = Math.floor((n - 1) / 2), // 0 para los dos primeros, 1 para los dos siguientes…
    b = newBoss(kind);
  /* más blandos que en Aventura (aquí hay un tiempo límite); cada pareja aguanta un poco más */
  b.hp = b.max = Math.round(b.max * (SURV_BOSS_HP + 0.25 * round));
  b.prize = Math.round(SURV_BOSS_COINS[kind] * (1 + 0.5 * round));
  b.lv = R.bossDue;
  R.boss = b;
  R.bossLeft = SURV_BOSS_TIME[kind];
  R.bossDue = 0;
  R.stage = 'mini';
  for (const e of G.en) e.life = Math.min(e.life, 0);
  $('hud').classList.add('boss');
  showToast('¡JEFE DEL NIVEL ' + b.lv + '!', NAME[kind] + ' · derríbalo antes de que se vaya');
  emit('bossIntro');
}
/* Avanza la pelea. Mientras dura, el nivel no sube (el tiempo aguantado sí sigue contando). */
export function survBossTick(dt) {
  const R = G.run,
    b = R.boss;
  R.head -= dt * SURV_RATE;
  bossTick(dt);
  if (b.intro > 0) return;
  R.bossLeft -= dt;
  if (b.hp <= 0) endSurvBoss(true);
  else if (R.bossLeft <= 0) endSurvBoss(false);
}
function endSurvBoss(win) {
  const R = G.run,
    b = R.boss;
  if (win) {
    explode(b.x, b.y, '#ffb454', 50);
    explode(b.x, b.y, '#ffffff', 20);
    G.shake = 0.7;
    emit('bossDown');
    R.bossKills++;
    R.coins += b.prize;
    R.pts += 30;
    const fix = Math.min(SURV_BOSS_REPAIR, 100 - R.hull);
    R.hull += fix;
    G.pops.push({
      x: W / 2,
      y: 240,
      text: '¡JEFE DERROTADO! +' + b.prize + ' {coin}' + (fix ? ' · {wrench} +' + fix + '%' : ''),
      life: 1.8,
      col: '#ffd54a',
    });
    spawnCap('shield', W / 2, 200, 110);
  } else {
    explode(b.x, b.y, '#9fb0e0', 18);
    emit('phase');
    G.pops.push({ x: W / 2, y: 240, text: 'El jefe se retiró', life: 1.6, col: '#9aa8cc' });
  }
  G.eb.length = 0;
  R.boss = null;
  R.stage = 'run';
  R.spawnT = 1.5;
  R.enT = 5;
  /* un respiro antes de que vuelvan los giros y los cometas */
  R.calm = Math.max(R.calm, 4);
  R.cometT = Math.max(R.cometT, 4);
  $('hud').classList.remove('boss');
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
  G.run.blasts.length = 0;
  G.run.suck = null;
  G.run.mode = 'boss';
  initBoss();
  G.run.phase = -1;
  G.angle = 0;
  $('hud').classList.add('boss');
  showToast(G.run.world ? '¡EL JEFE DE ESTE MUNDO!' : '¡JEFE FINAL!', G.run.boss.name || 'Centinela del Vacío');
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
  if (G.run.blasts.length && updateBlasts(dt)) return;
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
    G.run.blasts.length = 0;
    b.pull = 0;
    for (const e of G.en) hitEnemy(e, 99);
    explode(b.x, b.y, '#ff6b8a', 60);
    explode(b.x, b.y, '#ffd54a', 40);
    $('warn').classList.remove('show');
    after(1.3, () => finishBoss(true));
  }
}

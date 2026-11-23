/** Naves enemigas: aparición, escuadrones, disparos y balas enemigas. */
import { emit } from '../core/events.js';
import { tr } from '../core/i18n.js';
import { G } from '../core/state.js';
import { H, HULL_SHIP, SPAWN, W } from '../core/config.js';
import { ap, flipping, heavyMax, pace, shotRest } from '../core/difficulty.js';
import { clamp, roll, rollIn } from '../core/util.js';
import { takeHit } from './adventure.js';
import { rndWeapon } from './powers.js';
import { explode, spawnCap } from './run.js';
const inFight = () => G.run.mode === 'boss' || G.run.stage === 'mini';
export function hitEnemy(e, d) {
  if (e.dead) return;
  e.hp -= d;
  e.flash = 0.08;
  emit(e.hp <= 0 ? 'enemyDown' : 'enemyHit');
  if (e.hp <= 0) {
    e.dead = true;
    G.run.kills++;
    explode(e.x, e.y, '#ff6b8a', 24);
    explode(e.x, e.y, '#ffd54a', 10);
    G.shake = Math.max(G.shake, 0.2);
    const p = e.heavy ? 9 : 6;
    G.run.pts += p;
    G.run.coins += e.heavy ? 6 : 4;
    G.pops.push({
      x: e.x,
      y: e.y,
      text: tr('¡DESTRUIDA! +{n}', { n: p }),
      life: 1.1,
      col: '#ffd54a',
    });
    /* las naves a veces sueltan un arma */
    if (roll('drop') < (inFight() ? 0.5 : 0.22)) spawnCap(rndWeapon(), e.x, Math.max(e.y, 120), 110);
  }
}
export function spawnEnemy(inBoss, ex) {
  const x = pace(),
    bp = G.run.boss ? G.run.boss.ph || 0 : 0;
  const heavy = inBoss
    ? roll('enemy') < 0.3 + 0.15 * bp
    : x >= 35 && roll('enemy') < Math.min(heavyMax(), 0.2 + x / 250);
  if (!G.en.length)
    G.pops.push({
      x: W / 2,
      y: 60,
      text: tr('¡Naves enemigas!'),
      life: 1.2,
      col: '#ff6b8a',
    });
  G.en.push({
    x: ex == null ? rollIn('enemy', 50, W - 50) : ex,
    y: -SPAWN,
    ty: inBoss ? rollIn('enemy', 190, 270) : rollIn('enemy', 70, 210),
    r: heavy ? 17 : 13,
    hp: heavy ? 6 : 3,
    max: heavy ? 6 : 3,
    heavy,
    t: 0,
    life: rollIn('enemy', 7, 9),
    fire: rollIn('enemy', 0.6, 1.2),
    flash: 0,
    ph: rollIn('enemy', 0, 6.28),
    hitCd: 0,
    dead: false,
  });
}
/* Escuadrón: 2 o 3 naves a la vez */
export function spawnSquad(n) {
  const c = rollIn('enemy', 90, W - 90);
  for (let i = 0; i < n; i++) spawnEnemy(false, clamp(c + (i - (n - 1) / 2) * 80, 40, W - 40));
}
function enemyShoot(e) {
  const a0 = Math.atan2(G.ship.y - e.y, G.ship.x - e.x),
    sp = 200 + Math.min(60, pace() * 0.6);
  emit('enemyShot', e.heavy);
  for (const k of e.heavy ? [-0.28, 0, 0.28] : [0])
    G.eb.push({
      x: e.x,
      y: e.y + e.r,
      vx: Math.cos(a0 + k) * sp,
      vy: Math.sin(a0 + k) * sp,
      r: 6,
      col: G.run.world ? (e.heavy ? G.run.world.shotHeavy : G.run.world.shot) : e.heavy ? '#ffb454' : '#ff6b8a',
    });
}
export function updateEnemies(dt) {
  G.en = G.en.filter((e) => !e.dead);
  for (let i = G.en.length - 1; i >= 0; i--) {
    const e = G.en[i];
    e.t += dt;
    e.life -= dt;
    e.flash = Math.max(0, e.flash - dt);
    e.hitCd -= dt;
    if (e.life > 0) {
      e.y += (e.ty - e.y) * Math.min(1, dt * 1.6);
      e.x = clamp(e.x + Math.cos(e.t * 1.5 + e.ph) * (e.heavy ? 65 : 100) * dt, 28, W - 28);
      e.fire -= dt;
      if (e.fire <= 0 && e.y > 25) {
        e.fire = (e.heavy ? 1.8 : 1.25) * rollIn('shot', 0.85, 1.15) * (flipping() ? 1.6 : 1) * shotRest();
        enemyShoot(e);
      }
    } else {
      e.y -= 190 * dt * ap(e.y);
      if (e.y < -SPAWN - 40) {
        G.en.splice(i, 1);
        continue;
      }
    }
    if (Math.hypot(e.x - G.ship.x, e.y - G.ship.y) < e.r + G.ship.r * 0.8) {
      const res = takeHit(e.x, e.y, HULL_SHIP);
      if (res === 'crash') return true;
      if (res === 'absorbed') hitEnemy(e, 3);
    }
  }
  return false;
}
export function updateEB(dt) {
  for (let i = G.eb.length - 1; i >= 0; i--) {
    const e = G.eb[i];
    e.x += e.vx * dt;
    e.y += e.vy * dt;
    if (e.y > H + 20 || e.y < -SPAWN - 60 || e.x < -30 || e.x > W + 30) {
      G.eb.splice(i, 1);
      continue;
    }
    if (Math.hypot(e.x - G.ship.x, e.y - G.ship.y) - e.r - G.ship.r * 0.7 <= 0) {
      const res = takeHit(e.x, e.y);
      if (res === 'crash') return true;
      if (res === 'absorbed') G.eb.splice(i, 1);
    }
  }
  return false;
}

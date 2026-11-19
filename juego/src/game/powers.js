/** Cápsulas, poderes y armas: aplicar, disparar, láser, orbes, balas del jugador. */
import { emit } from '../core/events.js';
import { G } from '../core/state.js';
import { CAPDEF, GUN_T, H, HULL_KIT, LASER_T, SPAWN, W } from '../core/config.js';
import { ap } from '../core/difficulty.js';
import { pick } from '../core/util.js';
import { liveBoss } from './boss.js';
import { hitEnemy } from './enemies.js';
import { explode } from './run.js';
/* ---------- Poderes y armas ---------- */
/* El abanico (🔱) es el arma más fuerte: sale menos que las demás */
export const rndWeapon = () => pick(['twin', 'twin', 'twin', 'heavy', 'heavy', 'laser', 'laser', 'spread']);
export function rndCap() {
  return pick(['twin', 'twin', 'heavy', 'laser', 'spread', 'shield', 'shield', 'orbit', 'magnet', 'nova']);
}
function applyCap(type) {
  const d = CAPDEF[type],
    s = G.ship;
  if (type === 'shield') s.shield = true;
  else if (type === 'twin' || type === 'spread' || type === 'heavy') {
    s.gun = {
      type,
      t: GUN_T,
    };
    s.fire = 0;
    G.run.wpnPicks++;
  } else if (type === 'laser') {
    s.laser = LASER_T;
    G.run.wpnPicks++;
  } else if (type === 'orbit') s.orbit = 11;
  else if (type === 'magnet') s.mag = 9;
  else if (type === 'nova') nova();
  let text = d.t;
  if (type === 'repair') {
    const g = Math.min(HULL_KIT, 100 - G.run.hull);
    G.run.hull += g;
    text = g > 0 ? '🔧 +' + g + '% casco' : '🔧 Casco al máximo';
  }
  emit(type === 'nova' ? 'nova' : 'power', type);
  G.pops.push({
    x: s.x,
    y: s.y - 30,
    text,
    life: 1.2,
    col: d.c,
  });
}
function nova() {
  G.rings.push({
    x: G.ship.x,
    y: G.ship.y,
    r: 10,
    life: 0.7,
  });
  G.shake = 0.45;
  for (const o of G.obs) explode(o.x, o.y, '#ffb454', 6);
  G.run.pts += Math.floor(G.obs.length * 0.5);
  G.obs.length = 0;
  for (const e of G.eb) explode(e.x, e.y, '#ffffff', 2);
  G.eb.length = 0;
  for (const e of G.en) hitEnemy(e, 6);
  const b = liveBoss();
  if (b) {
    b.hp -= 25;
    b.flash = 0.2;
  }
}
export function killRock(j) {
  const o = G.obs[j];
  explode(o.x, o.y, '#ffb454', 9);
  emit('rockBreak');
  G.obs.splice(j, 1);
  G.run.pts += 1;
  G.run.coins += 1;
}
export function updatePowers(dt) {
  const s = G.ship;
  for (const k of ['orbit', 'laser', 'mag']) if (s[k] > 0) s[k] = Math.max(0, s[k] - dt);
  G.run.oa += dt * 5.5;
  G.run.obCd = Math.max(0, (G.run.obCd || 0) - dt);
  if (s.gun) {
    s.gun.t -= dt;
    if (s.gun.t <= 0) {
      s.gun = null;
      emit('gunEmpty');
      G.pops.push({
        x: s.x,
        y: s.y - 30,
        text: 'Arma agotada',
        life: 1,
        col: '#8fa0cc',
      });
    }
  }
  if (s.gun) {
    s.fire -= dt;
    if (s.fire <= 0) {
      const g = s.gun.type;
      emit('shot', g);
      if (g === 'twin') {
        s.fire = 0.13;
        for (const dx of [-9, 9])
          G.bullets.push({
            x: s.x + dx,
            y: s.y - 12,
            vy: -760,
            dmg: 1,
            w: 3.2,
            h: 12,
            col: '#ffb454',
          });
      } else if (g === 'spread') {
        s.fire = 0.26;
        for (let k = -1; k <= 1; k++) {
          const a = -Math.PI / 2 + k * 0.17;
          G.bullets.push({
            x: s.x,
            y: s.y - 12,
            vx: Math.cos(a) * 700,
            vy: Math.sin(a) * 700,
            dmg: 0.8,
            w: 3.6,
            h: 10,
            col: '#b4ff5e',
          });
        }
      } else {
        s.fire = 0.45;
        G.bullets.push({
          x: s.x,
          y: s.y - 14,
          vy: -600,
          dmg: 5,
          w: 9,
          h: 22,
          col: '#ff8a3c',
          pierce: true,
        });
      }
    }
  }
  const b = liveBoss();
  if (s.laser > 0) {
    emit('laser', 1 - s.laser / LASER_T); // 0 recién encendido … 1 a punto de agotarse
    for (let j = G.obs.length - 1; j >= 0; j--) {
      const o = G.obs[j];
      if (o.y < s.y && Math.abs(o.x - s.x) < o.r + 6) killRock(j);
    }
    for (const e of G.en) if (!e.dead && e.y < s.y && Math.abs(e.x - s.x) < e.r + 6) hitEnemy(e, dt * 9);
    for (let j = G.eb.length - 1; j >= 0; j--) {
      const e = G.eb[j];
      if (e.y < s.y && Math.abs(e.x - s.x) < e.r + 6) {
        explode(e.x, e.y, '#ff8aa6', 3);
        G.eb.splice(j, 1);
      }
    }
    if (b && Math.abs(b.x - s.x) < b.w / 2 + 6) {
      b.hp -= dt * 10;
      b.flash = 0.05;
    }
  }
  if (s.orbit > 0) {
    for (let k = 0; k < 3; k++) {
      const a = G.run.oa + k * 2.0944,
        ox = s.x + Math.cos(a) * 34,
        oy = s.y + Math.sin(a) * 34;
      for (let j = G.obs.length - 1; j >= 0; j--)
        if (Math.hypot(G.obs[j].x - ox, G.obs[j].y - oy) < G.obs[j].r + 7) killRock(j);
      for (let j = G.eb.length - 1; j >= 0; j--)
        if (Math.hypot(G.eb[j].x - ox, G.eb[j].y - oy) < G.eb[j].r + 8) {
          explode(G.eb[j].x, G.eb[j].y, '#c792ff', 4);
          G.eb.splice(j, 1);
        }
      for (const e of G.en)
        if (!e.dead && e.hitCd <= 0 && Math.hypot(e.x - ox, e.y - oy) < e.r + 7) {
          hitEnemy(e, 2);
          e.hitCd = 0.4;
        }
      if (b && G.run.obCd <= 0 && Math.abs(ox - b.x) < b.w / 2 + 7 && Math.abs(oy - b.y) < b.h / 2 + 7) {
        b.hp -= 3;
        b.flash = 0.08;
        emit('bossHit');
        G.run.obCd = 0.3;
      }
    }
  }
}
export function moveBullets(dt) {
  const b = liveBoss();
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const q = G.bullets[i];
    q.x += (q.vx || 0) * dt;
    q.y += q.vy * dt;
    let gone = q.y < -SPAWN - 30 || q.x < -20 || q.x > W + 20;
    if (!gone && b && Math.abs(q.x - b.x) < b.w / 2 + q.w / 2 && q.y < b.y + b.h / 2 && q.y > b.y - b.h / 2) {
      b.hp -= q.dmg;
      b.flash = 0.08;
      emit('bossHit');
      if (Math.random() < 0.4) explode(q.x, q.y, '#ffb454', 3);
      gone = true;
    }
    if (!gone) {
      for (const e of G.en)
        if (!e.dead && Math.hypot(e.x - q.x, e.y - q.y) < e.r + 4) {
          hitEnemy(e, q.dmg || 1);
          gone = true;
          break;
        }
    }
    if (!gone) {
      for (let j = G.obs.length - 1; j >= 0; j--) {
        if (Math.hypot(G.obs[j].x - q.x, G.obs[j].y - q.y) < G.obs[j].r + 4) {
          killRock(j);
          if (!q.pierce) gone = true;
          break;
        }
      }
    }
    if (gone) G.bullets.splice(i, 1);
  }
}
export function updateCaps(dt) {
  for (let i = G.caps.length - 1; i >= 0; i--) {
    const c = G.caps[i];
    c.y += c.vy * dt * ap(c.y);
    if (Math.hypot(c.x - G.ship.x, c.y - G.ship.y) < 26) {
      applyCap(c.type);
      explode(c.x, c.y, '#ffffff', 10);
      G.caps.splice(i, 1);
    } else if (c.y > H + 30) G.caps.splice(i, 1);
  }
}
export function powTxt() {
  let p = G.ship.shield ? '🛡 ' : '';
  if (G.ship.gun) p += CAPDEF[G.ship.gun.type].i + Math.ceil(G.ship.gun.t) + ' ';
  for (const [k, i] of [
    ['laser', '🔴'],
    ['orbit', '🌀'],
    ['mag', '🧲'],
  ])
    if (G.ship[k] > 0) p += i + Math.ceil(G.ship[k]) + ' ';
  return p;
}

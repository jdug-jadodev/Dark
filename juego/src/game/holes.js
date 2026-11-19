/** Agujeros negros (atracción, succión, espagueti) y nitro. */
import { emit } from '../core/events.js';
import { G } from '../core/state.js';
import { BH_CORE, BH_PULL, GOAL, H, NITRO_COST, NITRO_T, SPAWN, SUCK_T, SY, W } from '../core/config.js';
import { ap } from '../core/difficulty.js';
import { clamp, pick, rand } from '../core/util.js';
import { explode } from './run.js';
import { $ } from '../ui/dom.js';
import { crash } from '../ui/flow.js';
import { showToast } from '../ui/hud.js';
export function spawnHole() {
  const h = {
    x: rand(70, W - 70),
    y: -SPAWN,
    used: false,
    near: false,
    bonus: false,
  };
  G.run.holes.push(h);
  G.pops.push({
    x: h.x,
    y: 40,
    text: '🕳 ¡AGUJERO NEGRO!',
    life: 1.6,
    col: '#c792ff',
  });
  if (!G.run.bhSeen) {
    G.run.bhSeen = true;
    showToast('🕳 Agujeros negros', 'Te atraen · escapa con 🚀 NITRO (se llena con cada ¡CASI!)');
  }
}
/* mueve los agujeros y atrae la nave; si llega al centro empieza la succión */
export function updateHoles(dt) {
  for (let i = G.run.holes.length - 1; i >= 0; i--) {
    const h = G.run.holes[i];
    h.y += G.run.sp * 0.5 * dt * ap(h.y);
    if (h.y > H + 220) {
      G.run.holes.splice(i, 1);
      continue;
    }
    if (h.y > -120 && Math.random() < dt * 14) {
      const a = rand(0, 6.283),
        r = rand(90, BH_PULL);
      G.parts.push({
        x: h.x + Math.cos(a) * r,
        y: h.y + Math.sin(a) * r,
        h: rand(-4, 8),
        vh: 0,
        vx: -Math.cos(a) * r * 1.6,
        vy: -Math.sin(a) * r * 1.6 + G.run.sp * 0.5,
        life: 0.55,
        max: 0.6,
        col: pick(['#c792ff', '#ffb454', '#ffffff']),
      });
    }
    if (h.used || G.run.suck) continue;
    const dx = h.x - G.ship.x,
      dy = h.y - G.ship.y,
      d = Math.hypot(dx, dy);
    if (d < BH_CORE && G.ship.nitro <= 0) {
      startSuck(h, d);
      continue;
    }
    if (d < BH_PULL && G.ship.nitro <= 0) {
      h.near = true;
      emit('holePull');
      const str = 520 * Math.pow(1 - d / BH_PULL, 1.6);
      G.ship.tx = clamp(G.ship.tx + (dx / d) * str * dt, 14, W - 14);
      G.ship.ty = clamp(G.ship.ty + (dy / d) * str * dt, H * 0.42, SY + 15);
    }
    if (h.near && !h.bonus && h.y > G.ship.y + BH_PULL * 0.6) {
      h.bonus = true;
      emit('bonus');
      G.run.pts += 4;
      G.run.nitro = Math.min(100, G.run.nitro + 15);
      G.pops.push({
        x: G.ship.x,
        y: G.ship.y - 36,
        text: '¡ESCAPE GRAVITATORIO! +4 ⚡',
        life: 1.3,
        col: '#c792ff',
      });
    }
  }
  return false;
}
function startSuck(h, d) {
  G.run.suck = {
    h,
    t: 0,
    a: Math.atan2(G.ship.y - h.y, G.ship.x - h.x),
    r: Math.max(d, 10),
  };
  G.ship.ghost = 99;
  G.shake = 0.3;
  emit('suckStart');
  G.pops.push({
    x: h.x,
    y: h.y - 50,
    text: '¡TE ESTÁ SUCCIONANDO!',
    life: 1.2,
    col: '#c792ff',
  });
}
/* la nave gira en espiral hacia el centro; sin nitro termina en espagueti */
export function updateSuck(dt) {
  const q = G.run.suck,
    h = q.h;
  q.t += dt;
  const p = Math.min(1, q.t / SUCK_T);
  q.a += dt * (3 + 12 * p);
  const r = q.r * (1 - p);
  G.ship.x = h.x + Math.cos(q.a) * r;
  G.ship.y = h.y + Math.sin(q.a) * r;
  G.ship.tx = G.ship.x;
  G.ship.ty = G.ship.y;
  if (Math.random() < dt * 40)
    G.parts.push({
      x: G.ship.x,
      y: G.ship.y,
      h: 3,
      vh: 0,
      vx: (h.x - G.ship.x) * 3 + rand(-30, 30),
      vy: (h.y - G.ship.y) * 3 + rand(-30, 30),
      life: 0.4,
      max: 0.4,
      col: pick([G.ship.color, '#ffffff', '#c792ff']),
    });
  $('warnTxt').textContent = G.run.nitro >= NITRO_COST ? '¡USA EL NITRO! 🚀' : '¡SIN NITRO!';
  $('warn').classList.add('show');
  emit('suck');
  if (p >= 1) {
    if (G.run.invincible) {
      escapeHole(true);
      return false;
    }
    G.run.suck = null;
    G.ship.ghost = 0;
    G.ship.hidden = true;
    h.used = true;
    $('warn').classList.remove('show');
    explode(h.x, h.y, '#c792ff', 30);
    explode(h.x, h.y, '#ffffff', 14);
    G.shake = 0.6;
    emit('spaghetti');
    crash();
    $('crashInfo').textContent =
      '🕳 Un agujero negro te hizo espagueti · ' + Math.floor(G.run.pts) + ' de ' + GOAL + ' puntos';
    return true;
  }
  return false;
}
function escapeHole(free) {
  const q = G.run.suck,
    h = q.h,
    a = q.a;
  G.run.suck = null;
  h.used = true;
  G.ship.x = clamp(h.x + Math.cos(a) * 36, 14, W - 14);
  G.ship.y = clamp(h.y + Math.sin(a) * 36, H * 0.42, SY + 15);
  G.ship.tx = clamp(h.x + Math.cos(a) * 160, 14, W - 14);
  G.ship.ty = clamp(h.y + Math.sin(a) * 160, H * 0.42, SY + 15);
  G.ship.nitro = NITRO_T;
  G.ship.ghost = NITRO_T + 0.3;
  G.shake = 0.4;
  emit('escape');
  if (!free) G.run.pts += 5;
  explode(G.ship.x, G.ship.y, '#4fc3ff', 22);
  G.pops.push({
    x: G.ship.x,
    y: G.ship.y - 34,
    text: free ? 'Modo demo: ¡escapaste!' : '¡ESCAPASTE! +5',
    life: 1.4,
    col: '#b4ff5e',
  });
  $('warn').classList.remove('show');
}
/* Nitro: escapar de un agujero negro, o turbo invencible que rompe rocas */
export function useNitro() {
  if (G.state !== 'play' || G.run.mode !== 'run' || G.ship.nitro > 0) return;
  if (G.run.nitro < NITRO_COST) {
    G.pops.push({
      x: G.ship.x,
      y: G.ship.y - 30,
      text: 'Nitro insuficiente',
      life: 0.9,
      col: '#8fa0cc',
    });
    emit('deny');
    return;
  }
  G.run.nitro -= NITRO_COST;
  if (G.run.suck) {
    escapeHole(false);
    return;
  }
  G.ship.nitro = NITRO_T;
  G.ship.ghost = Math.max(G.ship.ghost, NITRO_T);
  G.shake = 0.25;
  emit('nitro');
  G.pops.push({
    x: G.ship.x,
    y: G.ship.y - 30,
    text: '🚀 ¡NITRO!',
    life: 1,
    col: '#4fc3ff',
  });
}

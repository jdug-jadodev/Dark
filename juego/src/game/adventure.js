/** Paso principal de Aventura y Supervivencia: fases, apariciones, choques, casco. */
import { emit } from '../core/events.js';
import { G } from '../core/state.js';
import {
  GOAL,
  H,
  HULL_REPAIR,
  KIT_EVERY,
  KIT_FROM,
  HULL_ROCK,
  HULL_SHOT,
  MINI_AT,
  NITRO_GAIN,
  PH,
  SURV_TIPS,
  SURV_TIP_AT,
  SY,
  UNCAP_LVL,
  W,
  WALLS,
} from '../core/config.js';
import {
  ap,
  enemyCap,
  extraRock,
  flipping,
  intervalAt,
  level,
  mult,
  pace,
  prog,
  speedAt,
  thirdRock,
} from '../core/difficulty.js';
import { clamp, rand } from '../core/util.js';
import { beginBoss, bossTick, endMini, startMini, updateBoss } from './boss.js';
import { updateComets } from './comets.js';
import { spawnEnemy, spawnSquad, updateEB, updateEnemies } from './enemies.js';
import { spawnHole, updateHoles, updateSuck } from './holes.js';
import { spawnPortal, updatePortals } from './portals.js';
import { killRock, moveBullets, rndCap, updateCaps, updatePowers } from './powers.js';
import { explode, spawnCap, spawnCoins, spawnRock, spawnWall } from './run.js';
import { runAngle, spinning } from './screenfx.js';
import { followPointer } from './ship.js';
import { spaceUpdate } from './space.js';
import { $ } from '../ui/dom.js';
import { crash } from '../ui/flow.js';
import { showToast } from '../ui/hud.js';
export function update(dt) {
  if (G.run.mode === 'space') {
    spaceUpdate(dt);
    return;
  }
  if (G.run.mode === 'boss') {
    updateBoss(dt);
    return;
  }
  G.t += dt;
  const x = prog();
  const surv = G.run.mode === 'endless';
  if (surv) {
    const lv = level();
    if (lv !== G.run.phase) {
      if (G.run.phase !== -1) {
        spawnPortal();
        emit('phase');
        if (G.run.hull < 100) {
          const g = Math.min(HULL_REPAIR, 100 - G.run.hull);
          G.run.hull += g;
          G.pops.push({
            x: G.ship.x,
            y: G.ship.y - 46,
            text: '🔧 +' + g + '% casco',
            life: 1.4,
            col: '#6ef2a5',
          });
        }
      }
      /* cada pocos niveles llega una cápsula de reparación: hay que ir por ella */
      if (lv >= KIT_FROM && (lv - KIT_FROM) % KIT_EVERY === 0) {
        spawnCap('repair');
        G.pops.push({
          x: W / 2,
          y: 100,
          text: '🔧 ¡Reparación en camino!',
          life: 1.6,
          col: '#6ef2a5',
        });
      }
      G.run.phase = lv;
      showToast(
        'Nivel ' + lv,
        lv === UNCAP_LVL
          ? '¡Sin límite de naves! A ver cuánto aguantas'
          : SURV_TIP_AT[lv] || SURV_TIPS[Math.min(lv - 1, SURV_TIPS.length - 1)],
      );
    }
  } else {
    let ph = 0;
    for (let i = 0; i < PH.length; i++) if (x >= PH[i].t) ph = i;
    if (ph !== G.run.phase) {
      if (G.run.phase !== -1 && G.run.stage === 'run') {
        spawnPortal();
        emit('phase');
      }
      G.run.phase = ph;
      if (G.run.stage === 'run') showToast(PH[ph].name, PH[ph].tip);
    }
  }
  updatePortals(dt);
  let warn = false,
    wtxt = '¡GIRA EL CELU!';
  if (G.run.stage === 'run') {
    const r = runAngle(dt, x);
    G.angle = r.a;
    warn = r.w;
    wtxt = r.txt;
  } else {
    G.angle += (0 - G.angle) * Math.min(1, dt * 4);
    if (G.run.stage === 'warn') {
      warn = true;
      wtxt = '¡EL JEFE SE ACERCA!';
    }
  }
  $('warnTxt').textContent = wtxt;
  $('warn').classList.toggle('show', warn);
  if (warn) emit('alarm');
  G.ship.nitro = Math.max(0, G.ship.nitro - dt);
  G.ship.ghost = Math.max(0, G.ship.ghost - dt);
  if (G.run.suck) {
    if (updateSuck(dt)) return;
  } else {
    followPointer(dt);
    if (G.ship.nitro > 0) G.ship.ty = clamp(G.ship.ty - 90 * dt, H * 0.42, SY + 15);
  }
  updatePowers(dt);
  const xd = pace(); // ritmo de fondo: igual a x salvo en Supervivencia avanzada
  const sp = speedAt(xd);
  G.run.sp = sp;
  if (G.run.stage === 'run') {
    G.run.spawnT -= dt;
    const flip = flipping();
    if (G.run.spawnT <= 0) {
      /* con la pantalla girada o dando una vuelta caen menos rocas */
      G.run.spawnT = intervalAt(xd) * rand(0.8, 1.2) * (flip ? 1.7 : spinning() ? 1.5 : 1);
      spawnRock(sp);
      if (!flip && x >= 35 && Math.random() < extraRock()) {
        spawnRock(sp);
        /* Supervivencia avanzada: a veces una tercera */
        if (thirdRock() && Math.random() < thirdRock()) spawnRock(sp);
      }
    }
    G.run.coinT -= dt;
    if (G.run.coinT <= 0) {
      G.run.coinT = rand(4.5, 7);
      spawnCoins();
    }
    if (flip || spinning()) {
      /* sin paredes mientras la pantalla está girada o dando una vuelta */
    } else if (G.run.wallIdx < WALLS.length && x >= WALLS[G.run.wallIdx]) {
      spawnWall(sp * 0.9);
      G.run.wallIdx++;
      G.run.nextWall = x + rand(9, 13);
    } else if (surv && G.run.wallIdx >= WALLS.length && x >= G.run.nextWall) {
      spawnWall(sp * 0.9);
      G.run.nextWall = x + rand(9, 13);
    }
    G.run.pcT -= dt;
    if (G.run.pcT <= 0 && (x >= 4 || G.t >= 8)) {
      G.run.pcT = rand(8, 11);
      spawnCap(rndCap());
    }
    G.run.enT -= dt;
    if (G.run.enT <= 0 && (x >= 4 || G.t >= 8)) {
      G.run.enT =
        (xd < MINI_AT ? rand(4.5, 6.5) : xd < 75 ? rand(3.5, 5) : rand(2.6, 4)) *
        Math.max(0.55, 1 - Math.max(0, xd - 100) / 300);
      /* tope de naves a la vez: difícil pero con espacio para maniobrar */
      const room = enemyCap() - G.en.filter((e) => !e.dead && e.life > 0).length;
      if (room <= 0) G.run.enT = Math.min(G.run.enT, 1.2);
      else {
        const sq = xd >= 25 && Math.random() < Math.min(0.7, 0.3 + xd / 300);
        if (sq && room >= 2) spawnSquad(Math.min(room, xd >= 60 && Math.random() < 0.5 ? 3 : 2));
        else spawnEnemy();
      }
    }
    if (G.run.mode === 'run' && x >= 12) {
      G.run.bhT -= dt;
      if (G.run.bhT <= 0 && !G.run.suck) {
        G.run.bhT = rand(15, 22) * Math.max(0.6, 1 - x / 250);
        spawnHole();
      }
    }
    if (surv) {
      /* sin jefes: solo sigue subiendo la dificultad */
      if (updateComets(dt)) return;
    } else if (!G.run.miniDone && x >= MINI_AT) startMini();
    else if (G.run.pts >= GOAL) {
      G.run.stage = 'warn';
      G.run.transT = 3.4;
      showToast('¡ALERTA!', 'Algo enorme se acerca…');
      for (const e of G.en) e.life = Math.min(e.life, 0);
    }
  } else if (G.run.stage === 'mini') {
    bossTick(dt);
    if (G.run.boss.hp <= 0) endMini();
  } else {
    G.run.transT -= dt;
    if (G.run.transT <= 0) {
      beginBoss();
      return;
    }
  }
  G.ship.inv = Math.max(0, G.ship.inv - dt);
  if (G.run.combo > 0) {
    G.run.comboT -= dt;
    if (G.run.comboT <= 0) G.run.combo = 0;
  }
  if (updateEnemies(dt)) return;
  for (const o of G.obs) {
    o.x += o.vx * dt;
    o.y += o.vy * dt * ap(o.y);
    o.rot += o.vr * dt;
    if ((o.x < o.r && o.vx < 0) || (o.x > W - o.r && o.vx > 0)) o.vx *= -1;
  }
  if (G.run.mode === 'run' && updateHoles(dt)) return;
  moveBullets(dt);
  if (updateEB(dt)) return;
  for (let i = G.obs.length - 1; i >= 0; i--) {
    const o = G.obs[i];
    const d = Math.hypot(o.x - G.ship.x, o.y - G.ship.y) - o.r - G.ship.r;
    if (d <= 0) {
      if (G.ship.nitro > 0) {
        killRock(i);
        G.shake = Math.max(G.shake, 0.15);
        continue;
      }
      if (G.ship.inv > 0 || G.ship.ghost > 0) {
        /* pasa */
      } else if (G.ship.shield) {
        G.ship.shield = false;
        G.ship.inv = 1;
        G.shake = 0.35;
        explode(o.x, o.y, '#78e6ff', 16);
        emit('shieldBreak');
        G.obs.splice(i, 1);
        G.pops.push({
          x: G.ship.x,
          y: G.ship.y - 30,
          text: '¡Escudo!',
          life: 1,
          col: '#78e6ff',
        });
        continue;
      } else if (G.run.invincible) {
        G.shake = 0.25;
        explode(o.x, o.y, '#ff6b8a', 12);
        emit('hullHit');
        G.obs.splice(i, 1);
        continue;
      } else if (hullHit(HULL_ROCK, o.x, o.y)) {
        explode(o.x, o.y, '#ffb454', 8);
        G.obs.splice(i, 1);
        continue;
      } else {
        crash();
        return;
      }
    } else {
      if (d < 16 && !o.nm) o.close = true;
      if (o.close && !o.nm && o.y > G.ship.y + o.r * 0.6) {
        o.nm = true;
        G.run.near++;
        G.run.combo++;
        G.run.bestCombo = Math.max(G.run.bestCombo, G.run.combo);
        G.run.comboT = 5;
        emit('near', G.run.combo);
        const b = mult();
        G.run.coins += b;
        G.run.pts += b;
        if (G.run.mode === 'run') G.run.nitro = Math.min(100, G.run.nitro + NITRO_GAIN);
        G.pops.push({
          x: G.ship.x,
          y: G.ship.y - 28,
          text: '¡CASI! +' + b + (G.run.mode === 'run' ? ' ⚡' : ''),
          life: 1,
          col: '#6ef2a5',
        });
      }
    }
    if (o.y > H + 50) {
      G.obs.splice(i, 1);
      G.run.dodged++;
      G.run.pts += 0.5;
    }
  }
  for (let i = G.coins.length - 1; i >= 0; i--) {
    const c = G.coins[i];
    c.y += c.vy * dt * ap(c.y);
    if (G.ship.mag > 0) {
      const dx = G.ship.x - c.x,
        dy = G.ship.y - c.y,
        d = Math.hypot(dx, dy);
      if (d < 170 && d > 1) {
        c.x += (dx / d) * 420 * dt;
        c.y += (dy / d) * 420 * dt;
      }
    }
    if (Math.hypot(c.x - G.ship.x, c.y - G.ship.y) < 20) {
      G.run.coins += mult();
      G.run.pts += 0.25;
      explode(c.x, c.y, '#ffd54a', 5);
      emit('coin');
      G.coins.splice(i, 1);
    } else if (c.y > H + 20) G.coins.splice(i, 1);
  }
  updateCaps(dt);
}
/* ---------- Jefe final ---------- */
/* En Supervivencia el casco absorbe el golpe; devuelve false si ya no aguanta */
function hullHit(dmg, x, y) {
  if (G.run.mode !== 'endless') return false;
  G.run.hull = Math.max(0, G.run.hull - dmg);
  if (G.run.hull <= 0) return false;
  G.run.hits++;
  G.ship.inv = 0.9;
  G.shake = Math.max(G.shake, 0.3);
  explode(x, y, '#ff6b8a', 12);
  emit('hullHit');
  G.pops.push({
    x: G.ship.x,
    y: G.ship.y - 30,
    text: '-' + dmg + '% casco',
    life: 1,
    col: '#ff6b8a',
  });
  return true;
}
export function takeHit(x, y, dmg) {
  if (G.ship.inv > 0 || G.ship.ghost > 0) return 'pass';
  if (G.ship.shield) {
    G.ship.shield = false;
    G.ship.inv = 1;
    G.shake = 0.35;
    explode(x, y, '#78e6ff', 16);
    emit('shieldBreak');
    G.pops.push({
      x: G.ship.x,
      y: G.ship.y - 30,
      text: '¡Escudo!',
      life: 1,
      col: '#78e6ff',
    });
    return 'absorbed';
  }
  if (G.run.invincible) {
    G.shake = 0.25;
    explode(x, y, '#ff6b8a', 12);
    emit('hullHit');
    return 'absorbed';
  }
  if (hullHit(dmg || HULL_SHOT, x, y)) return 'absorbed';
  crash();
  return 'crash';
}

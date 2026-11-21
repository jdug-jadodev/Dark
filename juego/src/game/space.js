/** Modo Viaje espacial: vuelo libre, patrones de obstáculos, giro del universo. */
import { emit } from '../core/events.js';
import { G } from '../core/state.js';
import { SENS, SPACE_TIPS, SPR, SPZ } from '../core/config.js';
import { ease, pick, rand } from '../core/util.js';
import { ROCKG } from '../render/models/props.js';
import { look } from '../core/garage.js';
import { buildShip } from '../render/models/ship.js';
import { placePlanet } from '../render/planets.js';
import { mkBeam, planets, rUnit, uDyn, uHotMat, uRockMats, uScene } from '../render/spaceScene.js';
import { $ } from '../ui/dom.js';
import { crash } from '../ui/flow.js';
import { showToast } from '../ui/hud.js';
import { K } from '../ui/input.js';
export const SPC = {
  ship: null,
  obs: [],
  sparks: [],
  pops: [],
};
export const uRoll = () => SPC.roll + SPC.spinOff;
function uRock(x, y, z, r, extra) {
  const m = new THREE.Mesh(pick(ROCKG), Math.random() < 0.08 ? uHotMat : pick(uRockMats));
  m.scale.setScalar(r);
  m.rotation.set(rand(0, 6), rand(0, 6), 0);
  uDyn.add(m);
  SPC.obs.push(
    Object.assign(
      {
        type: 'rock',
        x,
        y,
        z,
        r,
        m,
        vx: 0,
        vy: 0,
        rx: rand(-1.5, 1.5),
        ry: rand(-1.5, 1.5),
      },
      extra || {},
    ),
  );
}
export function spaceInit() {
  while (uDyn.children.length) uDyn.remove(uDyn.children[0]);
  if (SPC.ship) {
    uScene.remove(SPC.ship);
    SPC.ship.userData.dispose();
  }
  Object.assign(SPC, {
    x: 0,
    y: -20,
    tx: 0,
    ty: -20,
    px: 0,
    py: -20,
    vx: 0,
    vy: 0,
    roll: 0,
    rollV: 0,
    rollTgt: 0,
    rollT: 8,
    spinT: 8,
    spinPre: 0,
    spin: 0,
    spinDir: 1,
    spinOff: 0,
    obs: [],
    sparks: [],
    pops: [],
    spawnT: 1.2,
    speed: 380,
    dist: 0,
    near: 0,
    sector: 1,
    inv: 0,
    last: '',
  });
  SPC.ship = buildShip(look());
  SPC.ship.rotation.order = 'ZXY';
  uScene.add(SPC.ship);
  for (const p of planets) placePlanet(p, true);
}
function spBoom(x, y, z, col, n) {
  for (let i = 0; i < n; i++) {
    const v = rUnit().multiplyScalar(rand(40, 260));
    SPC.sparks.push({
      x,
      y,
      z,
      vx: v.x,
      vy: v.y,
      vz: v.z,
      life: rand(0.4, 0.9),
      max: 0.9,
      col,
    });
  }
}
/* controles: relativos a la pantalla aunque el universo esté girado */
export function spaceDrag(dx, dy) {
  const r = uRoll(),
    c = Math.cos(r),
    s = Math.sin(r),
    u = ((2 * SPR) / G.cw) * SENS * 0.9;
  SPC.tx += (dx * c + dy * s) * u;
  SPC.ty += (dx * s - dy * c) * u;
  const L = Math.hypot(SPC.tx, SPC.ty);
  if (L > SPR) {
    SPC.tx *= SPR / L;
    SPC.ty *= SPR / L;
  }
}
export function spaceFollow(dt) {
  const kx = K.right - K.left,
    ky = K.down - K.up;
  if (kx || ky) {
    const u = ((2 * SPR) / G.cw) * SENS * 0.9;
    spaceDrag(((kx * 210) / u) * dt, ((ky * 210) / u) * dt);
  }
  const k = Math.min(1, dt * G.ship.follow * 0.6);
  SPC.x += (SPC.tx - SPC.x) * k;
  SPC.y += (SPC.ty - SPC.y) * k;
}
function spacePattern(T) {
  const base = Math.max(0.17, 0.62 - T * 0.0045);
  const P = [
    ['single', 3],
    ['aimed', 2],
  ];
  if (T > 8) P.push(['cluster', 2]);
  if (T > 14) P.push(['big', 1]);
  if (T > 20 && SPC.last !== 'wall') P.push(['wall', 1.2]);
  if (T > 35 && SPC.last !== 'beam') P.push(['beam', 1]);
  let tot = 0;
  for (const p of P) tot += p[1];
  let r = Math.random() * tot,
    k = 'single';
  for (const p of P) {
    r -= p[1];
    if (r <= 0) {
      k = p[0];
      break;
    }
  }
  SPC.last = k;
  const drift = () =>
    T > 18 && Math.random() < 0.35
      ? {
          vx: rand(-35, 35),
          vy: rand(-35, 35),
        }
      : null;
  const disk = (rr) => {
    const a = rand(0, 6.283),
      d = Math.sqrt(Math.random()) * rr;
    return [Math.cos(a) * d, Math.sin(a) * d];
  };
  if (k === 'single') {
    const n = T > 40 && Math.random() < 0.5 ? 2 : 1;
    for (let i = 0; i < n; i++) {
      const [x, y] = disk(SPR + 25);
      uRock(x, y, SPZ - rand(0, 200), rand(14, 30), drift());
    }
    SPC.spawnT = base * rand(0.7, 1.1);
  } else if (k === 'aimed') {
    uRock(SPC.x + rand(-15, 15), SPC.y + rand(-15, 15), SPZ, rand(18, 28));
    SPC.spawnT = base;
  } else if (k === 'cluster') {
    const [cx, cy] = disk(SPR * 0.7),
      n = Math.min(11, 5 + Math.floor(T / 20));
    for (let i = 0; i < n; i++) {
      const [x, y] = disk(70);
      uRock(cx + x, cy + y, SPZ - rand(0, 240), rand(10, 20));
    }
    SPC.spawnT = base * 2.2;
  } else if (k === 'big') {
    const [x, y] = disk(SPR * 0.8);
    uRock(x, y, SPZ, rand(55, 85), drift());
    SPC.spawnT = base * 1.6;
  } else if (k === 'wall') {
    const [gx, gy] = disk(SPR * 0.6),
      gr = Math.max(38, 52 - T * 0.12);
    for (let x = -SPR - 30; x <= SPR + 30; x += 44)
      for (let y = -SPR - 30; y <= SPR + 30; y += 44) {
        const jx = x + rand(-6, 6),
          jy = y + rand(-6, 6);
        if (Math.hypot(jx, jy) > SPR + 35 || Math.hypot(jx - gx, jy - gy) < gr + 20) continue;
        uRock(jx, jy, SPZ + rand(-15, 15), rand(21, 26));
      }
    SPC.pops.push({
      x: SPC.x,
      y: SPC.y + 30,
      z: -60,
      text: '¡Busca el hueco!',
      life: 1.6,
      col: '#ffb454',
    });
    SPC.spawnT = Math.max(1.1, 1.7 - T * 0.006);
  } else {
    const g = mkBeam();
    uDyn.add(g);
    SPC.obs.push({
      type: 'beam',
      x: 0,
      y: 0,
      z: SPZ,
      r: 0,
      a: rand(0, Math.PI),
      w: (Math.random() < 0.5 ? -1 : 1) * rand(0.5, 1.1) * (1 + T * 0.006),
      m: g,
      vx: 0,
      vy: 0,
    });
    SPC.pops.push({
      x: SPC.x,
      y: SPC.y + 30,
      z: -60,
      text: '¡Viga giratoria!',
      life: 1.4,
      col: '#ff6b8a',
    });
    SPC.spawnT = Math.max(1.1, 1.6 - T * 0.005);
  }
}
const obsDist = (o) =>
  o.type === 'beam'
    ? Math.abs(SPC.x * Math.sin(o.a) - SPC.y * Math.cos(o.a)) - 5
    : Math.hypot(o.x - SPC.x, o.y - SPC.y) - o.r * 0.85;
export function spaceUpdate(dt) {
  G.t += dt;
  const T = G.t;
  SPC.speed = Math.min(1150, 380 + T * 5.5);
  SPC.dist += SPC.speed * dt;
  spaceFollow(dt);
  const vx = (SPC.x - SPC.px) / dt,
    vy = (SPC.y - SPC.py) / dt,
    k = Math.min(1, dt * 8);
  SPC.px = SPC.x;
  SPC.py = SPC.y;
  SPC.vx += (vx - SPC.vx) * k;
  SPC.vy += (vy - SPC.vy) * k;
  const sec = 1 + Math.floor(T / 30);
  if (sec !== SPC.sector) {
    SPC.sector = sec;
    G.run.coins += 5;
    showToast('Sector ' + sec, pick(SPACE_TIPS) + ' · +5 {coin}');
    emit('phase');
  }
  /* el universo gira lento, cada vez más */
  if (T > 10) {
    SPC.rollT -= dt;
    if (SPC.rollT <= 0) {
      SPC.rollT = rand(5, 9);
      SPC.rollTgt = (Math.random() < 0.5 ? -1 : 1) * rand(0.4, 1) * Math.min(0.85, 0.15 + T * 0.006);
    }
  }
  SPC.rollV += (SPC.rollTgt - SPC.rollV) * Math.min(1, dt * 0.7);
  SPC.roll += SPC.rollV * dt;
  /* de vez en cuando, vuelta completa */
  let warn = false;
  if (T > 30 && SPC.spin <= 0 && SPC.spinPre <= 0) {
    SPC.spinT -= dt;
    if (SPC.spinT <= 0) {
      SPC.spinPre = 1.4;
      SPC.spinDir = Math.random() < 0.5 ? 1 : -1;
      SPC.spinT = rand(20, 30);
    }
  }
  if (SPC.spinPre > 0) {
    warn = true;
    SPC.spinPre -= dt;
    if (SPC.spinPre <= 0) SPC.spin = 1e-6;
  }
  if (SPC.spin > 0) {
    SPC.spin += dt / 2.6;
    SPC.spinOff = SPC.spinDir * Math.PI * 2 * ease(Math.min(1, SPC.spin));
    if (SPC.spin >= 1) {
      SPC.spin = 0;
      SPC.spinOff = 0;
    }
  }
  $('warnTxt').textContent = '¡VUELTA 360°!';
  $('warn').classList.toggle('show', warn);
  if (warn) emit('alarm');
  SPC.spawnT -= dt;
  if (SPC.spawnT <= 0) spacePattern(T);
  SPC.inv = Math.max(0, SPC.inv - dt);
  for (let i = SPC.obs.length - 1; i >= 0; i--) {
    const o = SPC.obs[i],
      pz = o.z;
    o.z += SPC.speed * dt;
    o.x += o.vx * dt;
    o.y += o.vy * dt;
    if (o.type === 'beam') o.a += o.w * dt;
    const w = o.type === 'beam' ? 13 : o.r + 8;
    if (!o.hit && o.z > -w && pz < w && SPC.inv <= 0 && obsDist(o) < 7) {
      if (G.run.invincible) {
        o.hit = true;
        G.shake = 0.3;
        emit('hullHit');
        spBoom(SPC.x, SPC.y, 0, '#ff6b8a', 20);
        if (o.type !== 'beam') {
          uDyn.remove(o.m);
          SPC.obs.splice(i, 1);
        }
        continue;
      }
      /* la nave revienta con los colores de la explosión que lleva puesta */
      const cols = look().boom.cols;
      spBoom(SPC.x, SPC.y, 0, cols[0], 60);
      spBoom(SPC.x, SPC.y, 0, cols[1] || '#ffd54a', 30);
      SPC.ship.visible = false;
      crash();
      return;
    }
    if (!o.hit && !o.nm && pz < 0 && o.z >= 0 && obsDist(o) < 30) {
      o.nm = true;
      SPC.near++;
      emit('near', 0);
      G.run.coins++;
      SPC.pops.push({
        x: SPC.x,
        y: SPC.y + 18,
        z: 0,
        text: '¡CASI! +1',
        life: 1,
        col: '#6ef2a5',
      });
    }
    if (o.z > 300) {
      uDyn.remove(o.m);
      SPC.obs.splice(i, 1);
    }
  }
}
export const km = () => Math.floor(SPC.dist / 10);
export function spaceRevive() {
  SPC.inv = 2.5;
  SPC.ship.visible = true;
  for (let i = SPC.obs.length - 1; i >= 0; i--)
    if (SPC.obs[i].z > -800) {
      uDyn.remove(SPC.obs[i].m);
      SPC.obs.splice(i, 1);
    }
}

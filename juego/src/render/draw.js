/** Dibujo de cada cuadro de Aventura/Supervivencia/Jefe: objetos, nave, cámara y textos flotantes. */
import { G } from '../core/state.js';
import { SPAWN, SUCK_T, W, WARP_T } from '../core/config.js';
import { look, lookVersion } from '../core/garage.js';
import { clamp, ease, rand } from '../core/util.js';
import { bgTick } from './backdrop.js';
import { LSEG, PMAX, laserSegs, orbs, pCol, pGeo, pPos, shieldM } from './effects.js';
import { CAM, X3, Z3, camera, dyn, live, renderer, scene, use } from './engine.js';
import { _ta, _tb, accCol, bgCol, envSpeed, envTarget } from './environment.js';
import { mkHoleGame } from './holes.js';
import { col3 } from './kit.js';
import { mkBoss, mkEnemy } from './models/enemies.js';
import { mkBullet, mkCap, mkCoin, mkComet, mkEB, mkRing, mkRock } from './models/props.js';
import { buildShip, shipTick, shipTrails } from './models/ship.js';
import { mkPortal, portalDiscMat, portalGlowMat } from './portals.js';
import { spaceDraw } from './spaceScene.js';
import {
  BG_LAYER,
  SN,
  barMat,
  bd,
  bendTick,
  bgRT,
  postMat,
  put,
  railMat,
  sPos,
  starGeo,
  tanX,
  tanY,
  trackTick,
} from './track.js';
import { fctx } from '../ui/dom.js';
export let _v;
export function bootDraw() {
  /* ---------- Dibujo 3D ---------- */
  _v = new THREE.Vector3();
}
function proj(x, h, y) {
  const z = Z3(y),
    b = bd(z);
  _v.set(X3(x) + G.bendX * b, h + G.bendY * b, z).project(camera);
  return {
    x: ((_v.x + 1) / 2) * G.cw,
    y: ((1 - _v.y) / 2) * G.ch,
    ok: _v.z < 1,
  };
}
/* lazy = la lógica visual avanza pero no se vuelve a pintar (menús y pausa a media marcha) */
export function draw(dt, lazy) {
  if (!G.cw || !G.ch) return;
  if (G.run && G.run.mode === 'space' && G.state !== 'menu') {
    spaceDraw(dt, lazy);
    return;
  }
  const now = performance.now() / 1000;
  /* salto de portal: acelera el fondo y abre el campo de visión un momento */
  if (G.run.warp > 0) G.run.warp = Math.max(0, G.run.warp - dt);
  const wk = G.run.warp > 0 ? Math.sin(Math.PI * Math.min(1, G.run.warp / WARP_T)) : 0;
  const spd =
    (G.state === 'play'
      ? G.run.mode === 'boss' || G.run.stage === 'mini'
        ? 200
        : G.run.sp
      : G.state === 'menu'
        ? 90
        : 50) *
    (G.ship && G.ship.nitro > 0 ? 1.9 : 1) *
    (1 + 2.5 * wk);
  G.scroll += spd * dt;
  bendTick(dt);

  /* colores del espacio según la fase */
  envTarget();
  const ck = Math.min(1, dt * envSpeed());
  bgCol.lerp(_tb, ck);
  accCol.lerp(_ta, ck);
  scene.background.copy(bgCol);
  scene.fog.color.copy(bgCol);
  railMat.color.copy(accCol);
  postMat.color.copy(accCol);
  barMat.color.copy(accCol);

  /* fondo en movimiento */
  for (let i = 0; i < SN; i++) {
    let z = sPos[i * 3 + 2] + spd * 0.6 * dt;
    if (z > 400) z -= 2200;
    sPos[i * 3 + 2] = z;
  }
  starGeo.attributes.position.needsUpdate = true;
  trackTick();
  live.clear();
  for (const o of G.obs) {
    const m = use(o, mkRock);
    put(m, o.x, 0, o.y);
    m.rotation.set(o.rot * 0.7 + m.userData.tilt, o.rot, o.rot * 0.4);
  }
  for (const c of G.coins) {
    const m = use(c, mkCoin);
    put(m, c.x, 3, c.y);
    m.rotation.y = now * 4 + c.x * 0.05;
  }
  for (const c of G.caps) {
    const m = use(c, mkCap);
    put(m, c.x, 6 + Math.sin(now * 3 + c.x) * 3, c.y);
    m.children[0].rotation.y = now * 2;
  }
  for (const e of G.en) {
    const m = use(e, mkEnemy);
    put(m, e.x, 2 + Math.sin(now * 2 + e.ph) * 3, e.y);
    m.rotation.set(0.12, 0, Math.sin(e.t * 1.1 + e.ph) * 0.3);
    m.userData.mat.emissive.setHex(e.flash > 0 ? 0xffffff : 0x000000);
  }
  if (G.run.boss && !G.run.boss.dead) {
    const b = G.run.boss,
      m = use(b, mkBoss),
      u = m.userData;
    put(m, b.x, 4, b.y);
    m.rotation.set(0.1, Math.sin(now * 0.7) * 0.08 + (b.tx - b.x) * -0.002, Math.sin(now * 0.9) * 0.06);
    u.body.emissive.setHex(b.flash > 0 ? 0xffffff : 0x000000);
    const pulse = 1 + Math.sin(now * 6.3) * 0.12;
    u.core.scale.setScalar(13 * pulse);
    u.halo.scale.setScalar(21 * pulse);
    u.ring.rotation.set(Math.PI / 2 + Math.sin(now) * 0.3, now * 1.5, 0);
  }
  for (const e of G.eb) {
    const m = use(e, mkEB);
    put(m, e.x, 4, e.y);
    m.scale.setScalar(e.r * 0.85 * (1 + 0.18 * Math.sin(now * 20 + e.x)));
  }
  for (const b of G.bullets) {
    const m = use(b, mkBullet),
      bw = b.w || 3.2,
      bh = b.h || 12;
    put(m, b.x, 3, b.y);
    /* según el arma que lleve la nave: figuras redondas crecen parejo, las puntiagudas apuntan, otras giran */
    const bu = m.userData;
    if (bu.round) m.scale.setScalar(bw * 2.2 + 3);
    else m.scale.set(bw * 1.2, bw * 1.2, bh * 1.5);
    if (bu.aim && b.vx) m.rotation.y = Math.atan2(-b.vx, -b.vy);
    if (bu.spin) m.rotation.y = now * bu.spin + b.x;
  }
  for (const c of G.run.comets) {
    if (c.warn > 0) continue; // todavía está avisando: no ha salido
    const m = use(c, mkComet);
    put(m, c.ax + c.dx * c.s, 8, c.ay + c.dy * c.s);
    m.rotation.y = Math.atan2(-c.dx, -c.dy); // la cola hacia atrás
    m.scale.setScalar(c.r * (1 + 0.12 * Math.sin(now * 30)));
  }
  for (const q of G.rings) {
    const m = use(q, mkRing);
    put(m, q.x, 2, q.y);
    m.scale.setScalar(q.r);
    m.material.opacity = clamp(q.life / 0.7, 0, 1);
  }
  for (const h of G.run.holes) {
    const m = use(h, mkHoleGame);
    put(m, h.x, 2, h.y);
    m.userData.disk.rotation.y -= dt * 2.4;
    m.userData.pull.material.opacity = h.used ? 0.04 : 0.22 + 0.12 * Math.sin(now * 5);
  }
  portalDiscMat.color.copy(accCol);
  portalGlowMat.color.copy(accCol);
  for (const p of G.run.portals) {
    const m = use(p, mkPortal);
    put(m, W / 2, 45, p.y);
    m.userData.disc.rotation.z += dt * 2.6;
    m.rotation.set(-Math.atan(tanY(m.position.z)), Math.atan(tanX(m.position.z)), 0);
  }

  /* escaparate: en el menú la cámara se acerca a la nave (lobby); en el taller la nave sube y se gira */
  const inMenu = G.state === 'menu',
    inGarage = inMenu && G.view === 'garage';
  G.show += ((inMenu ? 1 : 0) - G.show) * Math.min(1, dt * (inMenu ? 3 : 5));
  G.showG += ((inGarage ? 1 : 0) - G.showG) * Math.min(1, dt * 5);
  G.showX += ((inGarage && G.garageBig ? 1 : 0) - G.showX) * Math.min(1, dt * 6);
  if (inGarage && G.showGuns) {
    /* mirando las armas la nave se pone de frente, para que los disparos de muestra salgan derecho */
    G.yaw = Math.atan2(Math.sin(G.yaw), Math.cos(G.yaw));
    G.yaw -= G.yaw * Math.min(1, dt * 6);
  } else if (inGarage && G.yawTo !== null) {
    /* se acomoda una sola vez hacia el ángulo pedido y ahí se queda */
    G.yaw += (G.yawTo - G.yaw) * Math.min(1, dt * 5);
    if (Math.abs(G.yawTo - G.yaw) < 0.01) G.yawTo = null;
  }
  const showK = ease(G.show),
    /* la nave queda quieta, vista de tres cuartos; solo gira con el dedo, en el lobby y en el taller */
    showYaw = showK * (G.showG * G.yaw + (1 - G.showG) * G.lobbyYaw);

  /* nave: si cambió alguna pieza se vuelve a armar */
  const s = G.ship,
    lv = lookVersion();
  if (s.m && s.m.userData.lookV !== lv) {
    dyn.remove(s.m);
    s.m.userData.dispose();
    s.m = null;
  }
  const sm = use(s, () => {
      const m = buildShip(look());
      m.userData.lookV = lv;
      return m;
    }),
    u = sm.userData;
  const vx = (s.x - s.px) / Math.max(dt, 1e-3),
    vy = (s.y - s.py) / Math.max(dt, 1e-3);
  s.px = s.x;
  s.py = s.y;
  const k = Math.min(1, dt * 10);
  s.vxs += (vx - s.vxs) * k;
  s.vys += (vy - s.vys) * k;
  const sz = Z3(s.y),
    sbd = bd(sz),
    sx = X3(s.x) + G.bendX * sbd,
    sh = 3 + Math.sin(now * 3) * 1.2 + G.bendY * sbd;
  sm.position.set(sx, sh, sz);
  sm.rotation.set(
    clamp(s.vys * 0.0012, -0.3, 0.3),
    clamp(-s.vxs * 0.0009, -0.35, 0.35) + showYaw,
    clamp(-s.vxs * 0.0028, -0.75, 0.75),
  );
  /* efecto espagueti: la nave se estira hacia el agujero negro y gira */
  if (G.run.suck) {
    const q = G.run.suck,
      p = Math.min(1, q.t / SUCK_T),
      dx = q.h.x - s.x,
      dz = q.h.y - s.y,
      th = Math.max(0.06, 1 - 0.92 * p);
    sm.rotation.set(0, Math.atan2(-dx, -dz), now * 14 * p);
    sm.scale.set(th, th, 1 + 4.5 * p);
  } else sm.scale.set(1, 1, 1);
  sm.visible = !s.hidden && !(s.inv > 0 && Math.floor(performance.now() / 70) % 2 === 0);
  shipTick(sm, now, s.vys < -60 ? 0.4 : 0, s.nitro > 0 ? 2.4 : 1);
  for (const t of shipTrails(sm, dyn, dt, Math.max(spd, 190), now)) live.add(t.mesh);
  for (const gn of u.guns) gn.visible = !!s.gun || (inGarage && G.showGuns);
  shieldM.visible = !!s.shield;
  if (s.shield) {
    shieldM.position.set(sx, sh, sz);
    shieldM.rotation.set(now * 0.4, now * 0.7, 0);
  }
  const orbOn = s.orbit > 0 && !(s.orbit < 2 && Math.floor(performance.now() / 120) % 2 === 0);
  for (let k2 = 0; k2 < 3; k2++) {
    const o = orbs[k2];
    o.visible = orbOn;
    if (orbOn) {
      const a = G.run.oa + k2 * 2.0944;
      o.position.set(sx + Math.cos(a) * 34, sh, sz + Math.sin(a) * 34);
    }
  }
  if (s.laser > 0) {
    const w = (8 + Math.sin(performance.now() / 40) * 2) * (s.laser < 0.5 ? s.laser * 2 : 1);
    const z0 = sz - 10,
      z1 = Z3(-SPAWN - 40),
      len = Math.max(1, z0 - z1) / LSEG,
      bx = X3(s.x),
      by = 3;
    for (let i = 0; i < LSEG; i++) {
      const L = laserSegs[i],
        zc = z0 - (i + 0.5) * len,
        b = bd(zc);
      L.g.visible = true;
      L.g.position.set(bx + G.bendX * b, by + G.bendY * b, zc);
      L.g.rotation.set(-Math.atan(tanY(zc)), Math.atan(tanX(zc)), 0);
      L.a.scale.set(w * 3.2, w * 1.6, len * 1.04);
      L.b.scale.set(w, w * 0.7, len * 1.04);
      L.c.scale.set(w * 0.4, w * 0.35, len * 1.04);
    }
  } else if (laserSegs[0].g.visible) for (const L of laserSegs) L.g.visible = false;

  /* partículas */
  let n = 0;
  for (const p of G.parts) {
    if (n >= PMAX) break;
    const a = clamp(p.life / p.max, 0, 1),
      c = col3(p.col);
    const pz = Z3(p.y),
      pb = bd(pz);
    pPos[n * 3] = X3(p.x) + G.bendX * pb;
    pPos[n * 3 + 1] = (p.h || 0) + G.bendY * pb;
    pPos[n * 3 + 2] = pz;
    pCol[n * 3] = c.r * a;
    pCol[n * 3 + 1] = c.g * a;
    pCol[n * 3 + 2] = c.b * a;
    n++;
  }
  pGeo.setDrawRange(0, n);
  pGeo.attributes.position.needsUpdate = true;
  pGeo.attributes.color.needsUpdate = true;

  /* quitar mallas de objetos que ya no existen */
  for (let i = dyn.children.length - 1; i >= 0; i--) {
    const c = dyn.children[i];
    if (!c) continue; // una nave que se fue se llevó sus estelas: la lista se acortó
    if (!live.has(c)) {
      dyn.remove(c);
      if (c.userData.dispose) c.userData.dispose();
    }
  }

  /* cámara: detrás de la nave, la sigue de lado; el giro del celu = roll */
  /* más frenética: sigue rápido a la nave, se inclina con ella y mira hacia la curva */
  G.camX += (X3(s.x) * 0.78 - G.camX) * Math.min(1, dt * 6);
  let ox = 0,
    oy = 0;
  if (G.shake > 0) {
    ox = rand(-1, 1) * G.shake * 10;
    oy = rand(-1, 1) * G.shake * 10;
  }
  camera.position.set(G.camX + ox, CAM.y + oy, CAM.z);
  camera.rotation.set(
    -CAM.p + G.bendY * 0.00018,
    -G.bendX * 0.00016,
    G.angle + clamp(-s.vxs * 0.00016, -0.07, 0.07) - G.bendX * 0.00014,
  );
  let fov = CAM.fov + 18 * wk + (s.nitro > 0 ? 7 : 0);
  if (showK > 0.001) {
    /* Cámara de escaparate: con menos ángulo (deforma menos) y a la distancia justa para que la
       nave ocupe buena parte del ancho. En el taller mira más abajo, así la nave queda arriba
       y el panel de piezas no la tapa. */
    const gk = G.showG,
      half = (SHOW.fov * Math.PI) / 360,
      tanH = Math.tan(half) * (G.cw / G.ch),
      dist = clamp(SHOW.span / ((SHOW.fill + SHOW.fillG * gk - SHOW.fillX * G.showX) * 2 * tanH), 90, 520),
      elev = SHOW.elev + SHOW.elevG * gk,
      rise = SHOW.rise + (SHOW.riseG - SHOW.rise) * gk + SHOW.riseX * G.showX;
    const mix = (a, b) => a + (b - a) * showK;
    camera.position.set(
      mix(camera.position.x, sx),
      mix(camera.position.y, sh + dist * Math.sin(elev)),
      mix(camera.position.z, sz + dist * Math.cos(elev)),
    );
    camera.rotation.set(
      mix(camera.rotation.x, -elev - Math.atan(rise * Math.tan(half))),
      mix(camera.rotation.y, 0),
      mix(camera.rotation.z, 0),
    );
    fov = mix(fov, SHOW.fov);
  }
  if (Math.abs(camera.fov - fov) > 0.05) {
    camera.fov += (fov - camera.fov) * Math.min(1, dt * 10);
    camera.updateProjectionMatrix();
  }
  camera.updateMatrixWorld();
  bgTick(dt, spd);
  if (lazy) return;

  /* 1) solo el fondo, en pequeño, a la textura del vidrio · 2) todo a la pantalla */
  camera.layers.set(BG_LAYER);
  renderer.setRenderTarget(bgRT);
  renderer.render(scene, camera);
  renderer.setRenderTarget(null);
  camera.layers.enable(0);
  renderer.render(scene, camera);
  drawOverlay();
}
function drawOverlay() {
  fctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
  fctx.clearRect(0, 0, G.cw, G.ch);
  /* destello al cruzar un portal */
  if (G.run.warp > WARP_T - 0.35) {
    fctx.fillStyle = 'rgba(255,255,255,' + (0.75 * (G.run.warp - (WARP_T - 0.35))) / 0.35 + ')';
    fctx.fillRect(0, 0, G.cw, G.ch);
  }
  for (const c of G.run.comets) cometLane(c);
  for (const e of G.en) {
    if (e.dead || e.hp >= e.max) continue;
    const p = proj(e.x, e.r * 1.8, e.y);
    if (!p.ok) continue;
    fctx.fillStyle = 'rgba(0,0,0,.55)';
    fctx.fillRect(p.x - 14, p.y - 12, 28, 4);
    fctx.fillStyle = '#6ef2a5';
    fctx.fillRect(p.x - 14, p.y - 12, 28 * Math.max(0, e.hp / e.max), 4);
  }
  fctx.font = '800 15px system-ui,sans-serif';
  fctx.textAlign = 'center';
  for (const p of G.pops) {
    const s = proj(p.x, 20, p.y);
    if (!s.ok) continue;
    const y = s.y - (1.4 - p.life) * 30;
    fctx.globalAlpha = clamp(p.life, 0, 1);
    fctx.lineWidth = 4;
    fctx.strokeStyle = 'rgba(0,0,0,.6)';
    fctx.strokeText(p.text, s.x, y);
    fctx.fillStyle = p.col;
    fctx.fillText(p.text, s.x, y);
  }
  fctx.globalAlpha = 1;
}
/* Aviso de un cometa: el carril por donde va a cruzar, pintado sobre la pista, con flechas que
   corren en el sentido en que viene y una señal en el borde por donde entra. Mientras avisa
   parpadea; cuando el cometa sale, el carril se apaga a medida que pasa. */
const LANE_N = 12;
/* Cámara de escaparate (lobby y taller). span = ancho que debe caber (la nave con margen);
   fill = qué parte del ancho de pantalla ocupa; elev = qué tan desde arriba se mira (radianes);
   rise = cuánto sube la nave respecto al centro de la pantalla (0 = centro, 1 = borde de arriba).
   Los que terminan en G son lo que cambia en el taller. */
const SHOW = {
  fov: 40,
  span: 50,
  fill: 0.78,
  fillG: -0.08,
  elev: 0.36,
  elevG: 0.06,
  rise: 0.14,
  riseG: 0.44,
  /* con la lista del taller agrandada: la nave más pequeña y más arriba */
  fillX: 0.2,
  riseX: 0.25,
};
function cometLane(c) {
  /* tramo del carril que cae dentro de la pista visible */
  let s0 = -1e4,
    s1 = 1e4;
  const cut = (p, d, lo, hi) => {
    if (Math.abs(d) < 1e-6) return;
    const a = (lo - p) / d,
      b = (hi - p) / d;
    s0 = Math.max(s0, Math.min(a, b));
    s1 = Math.min(s1, Math.max(a, b));
  };
  cut(c.ax, c.dx, 0, W);
  cut(c.ay, c.dy, -SPAWN * 0.9, G.ship.y + 150);
  if (c.warn <= 0) s0 = Math.max(s0, c.s); // lo que el cometa ya recorrió se borra
  if (s1 - s0 < 20) return;
  const now = performance.now() / 1000,
    warning = c.warn > 0,
    /* aparece suave; en el último tercio del aviso parpadea más rápido */
    urgent = warning && c.warn < c.warn0 * 0.35,
    blink = 0.5 + 0.5 * Math.sin(now * (urgent ? 26 : 13)),
    alpha = (warning ? Math.min(1, (c.warn0 - c.warn) / 0.15) : 0.8) * (0.55 + 0.45 * blink);
  const nx = -c.dy,
    ny = c.dx; // de lado al carril
  const at = (s, side) => proj(c.ax + c.dx * s + nx * c.r * side, 2, c.ay + c.dy * s + ny * c.r * side);
  /* el carril: una franja con el ancho real del cometa (se angosta a lo lejos) */
  const left = [],
    right = [];
  for (let i = 0; i <= LANE_N; i++) {
    const s = s0 + ((s1 - s0) * i) / LANE_N;
    left.push(at(s, 1.5));
    right.push(at(s, -1.5));
  }
  fctx.beginPath();
  left.forEach((p, i) => (i ? fctx.lineTo(p.x, p.y) : fctx.moveTo(p.x, p.y)));
  for (let i = LANE_N; i >= 0; i--) fctx.lineTo(right[i].x, right[i].y);
  fctx.closePath();
  fctx.fillStyle = 'rgba(255,90,60,' + 0.3 * alpha + ')';
  fctx.fill();
  fctx.lineWidth = 2;
  fctx.strokeStyle = 'rgba(255,170,90,' + 0.9 * alpha + ')';
  fctx.stroke();
  /* flechas que corren por el carril en el sentido del cometa */
  fctx.lineWidth = 4;
  fctx.lineJoin = 'round';
  fctx.strokeStyle = 'rgba(255,225,120,' + alpha + ')';
  const gap = 70,
    run = (now * 260) % gap;
  for (let s = s0 + run; s < s1 - 14; s += gap) {
    const tip = at(s + 14, 0),
      a = at(s - 8, 0.9),
      b = at(s - 8, -0.9);
    fctx.beginPath();
    fctx.moveTo(a.x, a.y);
    fctx.lineTo(tip.x, tip.y);
    fctx.lineTo(b.x, b.y);
    fctx.stroke();
  }
  /* señal en el borde por donde entra */
  if (warning) {
    const e = at(s0 + 12, 0);
    fctx.font = '900 26px system-ui,sans-serif';
    fctx.textAlign = 'center';
    fctx.textBaseline = 'middle';
    fctx.lineWidth = 5;
    fctx.strokeStyle = 'rgba(0,0,0,' + 0.7 * alpha + ')';
    fctx.strokeText('☄', e.x, e.y);
    fctx.fillStyle = 'rgba(255,225,120,' + alpha + ')';
    fctx.fillText('☄', e.x, e.y);
    fctx.textBaseline = 'alphabetic';
  }
}

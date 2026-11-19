/** Escena del modo Viaje espacial: cielo, sol, planetas, estelas, anillos guía y su dibujo. */
import { G } from '../core/state.js';
import { SPR, SURV_PAL } from '../core/config.js';
import { clamp, pick, rand } from '../core/util.js';
import { SPC, uRoll } from '../game/space.js';
import { _v } from './draw.js';
import { renderer } from './engine.js';
import { _ta } from './environment.js';
import { BOX, DOT, SPH, bmat, col3 } from './kit.js';
import { makePlanet, placePlanet } from './planets.js';
import { nebTex } from './textures.js';
import { fctx } from '../ui/dom.js';
export let uScene;
export let uCam;
let uSunDir;
let uKey;
let uSun;
let uFill;
export let uDyn;
let sky;
export function bootSpaceScene() {
  uScene = new THREE.Scene();
  uScene.background = new THREE.Color(0x03040c);
  uScene.fog = new THREE.Fog(0x03040c, 1500, 2600);
  uCam = new THREE.PerspectiveCamera(68, 1, 1, 9000);
  uSunDir = new THREE.Vector3(0.55, 0.35, -1).normalize();
  uScene.add(new THREE.AmbientLight(0x6a78a0, 0.7));
  uKey = new THREE.DirectionalLight(0xffffff, 0.75);
  uKey.position.set(0.2, 0.6, 1);
  uScene.add(uKey); // luz desde la cámara para ver bien la nave
  uSun = new THREE.DirectionalLight(0xfff0dc, 1.4);
  uSun.position.copy(uSunDir);
  uScene.add(uSun);
  uFill = new THREE.DirectionalLight(0x5ee0ff, 0.35);
  uFill.position.set(-0.5, -0.3, 0.8);
  uScene.add(uFill);
  uDyn = new THREE.Group();
  uScene.add(uDyn);
  sky = new THREE.Group();
  uScene.add(sky); // sigue a la cámara: estrellas, nebulosas y sol

  {
    const N = 2600,
      P = new Float32Array(N * 3),
      C = new Float32Array(N * 3),
      tints = [
        [1, 1, 1],
        [0.75, 0.85, 1],
        [1, 0.9, 0.75],
        [0.9, 0.8, 1],
      ];
    for (let i = 0; i < N; i++) {
      const v = rUnit().multiplyScalar(4200);
      P[i * 3] = v.x;
      P[i * 3 + 1] = v.y;
      P[i * 3 + 2] = v.z;
      const c = pick(tints),
        b = rand(0.35, 1);
      C[i * 3] = c[0] * b;
      C[i * 3 + 1] = c[1] * b;
      C[i * 3 + 2] = c[2] * b;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(P, 3));
    g.setAttribute('color', new THREE.BufferAttribute(C, 3));
    sky.add(
      new THREE.Points(
        g,
        new THREE.PointsMaterial({
          size: 2.2,
          sizeAttenuation: false,
          vertexColors: true,
          fog: false,
          depthWrite: false,
        }),
      ),
    );
  }
  for (let i = 0; i < 7; i++) {
    const s = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: nebTex(rand(0, 360)),
        transparent: true,
        opacity: rand(0.5, 0.85),
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
    s.position.copy(new THREE.Vector3(rand(-1, 1), rand(-0.7, 0.7), -rand(0.4, 1)).normalize().multiplyScalar(4000));
    s.scale.setScalar(rand(2400, 4200));
    sky.add(s);
  }
  {
    const glow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: DOT,
        color: 0xffcf8a,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
    glow.position.copy(uSunDir).multiplyScalar(4100);
    glow.scale.setScalar(1700);
    sky.add(glow);
    const core = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: DOT,
        color: 0xffffff,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    );
    core.position.copy(glow.position);
    core.scale.setScalar(430);
    sky.add(core);
  }
}
export const rUnit = () => {
  const v = new THREE.Vector3(rand(-1, 1), rand(-1, 1), rand(-1, 1));
  return v.lengthSq() > 1e-4 ? v.normalize() : new THREE.Vector3(0, 0, -1);
};
export let planets;
let wP;
let wGeo;
let warp;
let tRingMat;
let tRingGeo;
let kPos;
let kCol;
let kGeo;
let kPts;
export let uRockMats;
export let uHotMat;
let beamMat;
export function bootSpaceObjects() {
  planets = [0, 1, 2].map(() => {
    const p = makePlanet(uScene);
    placePlanet(p, true);
    return p;
  });
  wP = new Float32Array(WN * 3);
  for (let i = 0; i < WN; i++) {
    wP[i * 3] = rand(-900, 900);
    wP[i * 3 + 1] = rand(-700, 700);
    wP[i * 3 + 2] = rand(-3000, 300);
  }
  wGeo = new THREE.BufferGeometry();
  wGeo.setAttribute('position', new THREE.BufferAttribute(wP, 3));
  warp = new THREE.Points(
    wGeo,
    new THREE.PointsMaterial({
      size: 4,
      map: DOT,
      color: 0xa8c4ff,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  warp.frustumCulled = false;
  uScene.add(warp);
  tRingMat = new THREE.MeshBasicMaterial({
    color: 0x5ee0ff,
    transparent: true,
    opacity: 0.16,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  tRingGeo = new THREE.TorusGeometry(SPR + 30, 1.3, 8, 80);
  for (let i = 0; i < 7; i++) {
    const m = new THREE.Mesh(tRingGeo, tRingMat);
    m.position.z = -i * 420;
    uScene.add(m);
    tRings.push(m);
  }
  kPos = new Float32Array(KMAX * 3);
  kCol = new Float32Array(KMAX * 3);
  kGeo = new THREE.BufferGeometry();
  kGeo.setAttribute('position', new THREE.BufferAttribute(kPos, 3));
  kGeo.setAttribute('color', new THREE.BufferAttribute(kCol, 3));
  kPts = new THREE.Points(
    kGeo,
    new THREE.PointsMaterial({
      size: 7,
      map: DOT,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  kPts.frustumCulled = false;
  uScene.add(kPts);
  /* -- obstáculos -- */
  uRockMats = [0x8a7d72, 0x6e7388, 0x7f6b5c, 0x5f6a7a].map(
    (c) =>
      new THREE.MeshStandardMaterial({
        color: c,
        roughness: 0.95,
        metalness: 0.05,
        flatShading: true,
      }),
  );
  uHotMat = new THREE.MeshStandardMaterial({
    color: 0x5a3a2a,
    emissive: 0x8a2a00,
    roughness: 0.9,
    flatShading: true,
  });
  beamMat = new THREE.MeshStandardMaterial({
    color: 0x9aa6b8,
    metalness: 0.7,
    roughness: 0.35,
  });
}
/* -- estelas de velocidad y anillos guía del túnel -- */
const WN = 420;
const tRings = [];
/* -- chispas de choque -- */
const KMAX = 900;
export function mkBeam() {
  const g = new THREE.Group(),
    b = new THREE.Mesh(BOX, beamMat);
  b.scale.set(2 * SPR + 90, 9, 14);
  g.add(b);
  for (let i = -4; i <= 4; i++) {
    const s = new THREE.Mesh(BOX, bmat('#ffb454'));
    s.scale.set(3, 9.6, 14.6);
    s.position.x = i * 30;
    g.add(s);
  }
  for (const sx of [-1, 1]) {
    const l = new THREE.Mesh(SPH, bmat('#ff3d6e'));
    l.scale.setScalar(6);
    l.position.x = sx * (SPR + 45);
    g.add(l);
    const h = new THREE.Mesh(SPH, bmat('#ff3d6e', true, 0.4));
    h.scale.setScalar(14);
    h.position.x = sx * (SPR + 45);
    g.add(h);
  }
  return g;
}
export function spaceDraw(dt, lazy) {
  const spd = G.state === 'play' ? SPC.speed : 90;
  for (const p of planets) {
    p.m.position.z += spd * 0.14 * dt;
    p.m.rotation.y += p.spin * dt;
    if (p.m.position.z > 900) placePlanet(p, false);
  }
  for (let i = 0; i < WN; i++) {
    let z = wP[i * 3 + 2] + spd * dt;
    if (z > 300) {
      z -= 3300;
      wP[i * 3] = rand(-900, 900);
      wP[i * 3 + 1] = rand(-700, 700);
    }
    wP[i * 3 + 2] = z;
  }
  wGeo.attributes.position.needsUpdate = true;
  for (const m of tRings) {
    m.position.z += spd * dt;
    if (m.position.z > 300) m.position.z -= 7 * 420;
  }
  tRingMat.color.lerp(_ta.setHex(SURV_PAL[(SPC.sector - 1) % SURV_PAL.length][1]), Math.min(1, dt));
  for (const o of SPC.obs) {
    o.m.position.set(o.x, o.y, o.z);
    if (o.type === 'beam') o.m.rotation.z = o.a;
    else {
      o.m.rotation.x += o.rx * dt;
      o.m.rotation.y += o.ry * dt;
    }
  }
  /* nave: gira junto con la cámara (el universo da vueltas alrededor) */
  const sm = SPC.ship,
    u = sm.userData,
    r = uRoll(),
    c = Math.cos(r),
    s = Math.sin(r);
  const lvx = SPC.vx * c + SPC.vy * s,
    lvy = -SPC.vx * s + SPC.vy * c;
  sm.position.set(SPC.x, SPC.y, 0);
  sm.rotation.set(clamp(lvy * 0.003, -0.35, 0.35), clamp(-lvx * 0.0015, -0.3, 0.3), r + clamp(-lvx * 0.005, -0.7, 0.7));
  if (G.state !== 'paused' && G.state !== 'end')
    sm.visible = !(SPC.inv > 0 && Math.floor(performance.now() / 70) % 2 === 0);
  for (const f of u.flames) f.scale.set(1, 1, 0.9 + Math.random() * 0.6);
  for (const gn of u.guns) gn.visible = false;
  /* chispas */
  let n = 0;
  for (let i = SPC.sparks.length - 1; i >= 0; i--) {
    const p = SPC.sparks[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.z += p.vz * dt;
    p.life -= dt;
    if (p.life <= 0) {
      SPC.sparks.splice(i, 1);
      continue;
    }
    if (n >= KMAX) continue;
    const a = clamp(p.life / p.max, 0, 1),
      cc = col3(p.col);
    kPos[n * 3] = p.x;
    kPos[n * 3 + 1] = p.y;
    kPos[n * 3 + 2] = p.z;
    kCol[n * 3] = cc.r * a;
    kCol[n * 3 + 1] = cc.g * a;
    kCol[n * 3 + 2] = cc.b * a;
    n++;
  }
  kGeo.setDrawRange(0, n);
  kGeo.attributes.position.needsUpdate = true;
  kGeo.attributes.color.needsUpdate = true;
  /* cámara detrás de la nave, con el "arriba" girado */
  const ux = -s,
    uy = c,
    cx = SPC.x * 0.8,
    cy = SPC.y * 0.8;
  let ox = 0,
    oy = 0;
  if (G.shake > 0) {
    ox = rand(-1, 1) * G.shake * 12;
    oy = rand(-1, 1) * G.shake * 12;
  }
  uCam.position.set(cx + ux * 26 + ox, cy + uy * 26 + oy, 170);
  uCam.up.set(ux, uy, 0);
  uCam.lookAt(cx + ux * 6, cy + uy * 6, -400);
  sky.position.copy(uCam.position);
  if (lazy) return;
  renderer.render(uScene, uCam);
  /* textos flotantes */
  fctx.setTransform(G.dpr, 0, 0, G.dpr, 0, 0);
  fctx.clearRect(0, 0, G.cw, G.ch);
  fctx.font = '800 15px system-ui,sans-serif';
  fctx.textAlign = 'center';
  for (let i = SPC.pops.length - 1; i >= 0; i--) {
    const p = SPC.pops[i];
    p.life -= dt;
    if (p.life <= 0) {
      SPC.pops.splice(i, 1);
      continue;
    }
    _v.set(p.x, p.y, p.z).project(uCam);
    if (_v.z > 1) continue;
    const px = ((_v.x + 1) / 2) * G.cw,
      py = ((1 - _v.y) / 2) * G.ch - (1.4 - p.life) * 30;
    fctx.globalAlpha = clamp(p.life, 0, 1);
    fctx.lineWidth = 4;
    fctx.strokeStyle = 'rgba(0,0,0,.6)';
    fctx.strokeText(p.text, px, py);
    fctx.fillStyle = p.col;
    fctx.fillText(p.text, px, py);
  }
  fctx.globalAlpha = 1;
}

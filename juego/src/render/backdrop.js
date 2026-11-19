/** Fondo espacial de Aventura/Supervivencia: cielo, galaxias, cuásares, agujero negro lejano y planetas. */
import { pick, rand } from '../core/util.js';
import { camera, scene } from './engine.js';
import { DOT, SPH } from './kit.js';
import { makePlanet, setupPlanet } from './planets.js';
import { rUnit } from './spaceScene.js';
import { bhDiskTex, bhRingTex, galaxyTex, jetTex, nebTex } from './textures.js';
import { BG_LAYER, stars3 } from './track.js';
let BH_DISK;
let BH_RING;
let bhDiskGeo;
let bgSky;
let bgHole;
let bgPlanets;
let lowPlanets;
let jetGeo;
let jetMat;
let qDiskMat;
let quasars;
export function bootBackdrop() {
  BH_DISK = bhDiskTex();
  BH_RING = bhRingTex();
  bhDiskGeo = new THREE.RingGeometry(1.25, 3.6, 96);
  bhDiskGeo.rotateX(-Math.PI / 2);
  /* -- fondo: estrellas, nebulosas, galaxias, agujero negro lejano y planetas -- */
  bgSky = new THREE.Group();
  scene.add(bgSky);
  {
    const N = 1800,
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
    bgSky.add(
      new THREE.Points(
        g,
        new THREE.PointsMaterial({
          size: 2,
          sizeAttenuation: false,
          vertexColors: true,
          fog: false,
          depthWrite: false,
        }),
      ),
    );
    for (let i = 0; i < 6; i++) {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: nebTex(rand(0, 360)),
          transparent: true,
          opacity: rand(0.45, 0.75),
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          fog: false,
        }),
      );
      s.position.copy(new THREE.Vector3(rand(-1, 1), rand(0.05, 0.7), -rand(0.5, 1)).normalize().multiplyScalar(4000));
      s.scale.setScalar(rand(2000, 3600));
      bgSky.add(s);
    }
    const gGeo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(
        gGeo,
        new THREE.MeshBasicMaterial({
          map: galaxyTex(rand(0, 360)),
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          fog: false,
        }),
      );
      m.position.copy(
        new THREE.Vector3((i - 1) * 0.8 + rand(-0.3, 0.3), rand(0.12, 0.55), -1).normalize().multiplyScalar(3600),
      );
      m.scale.setScalar(rand(700, 1250));
      m.lookAt(0, 0, 0);
      m.rotateX(rand(0.6, 1.1));
      m.rotateZ(rand(0, 6.28));
      bgSky.add(m);
    }
  }
  bgHole = mkBlackHole(false);
  bgHole.scale.setScalar(115);
  bgHole.position.copy(new THREE.Vector3(0.5, 0.3, -1).normalize().multiplyScalar(3300));
  bgSky.add(bgHole);
  bgPlanets = [0, 1, 2].map(() => {
    const p = makePlanet(scene);
    placeBgPlanet(p, true);
    return p;
  });
  lowPlanets = [0, 1].map(() => {
    const p = makePlanet(scene);
    placeLowPlanet(p, true);
    return p;
  });
  /* más cielo también hacia abajo: nebulosas y galaxias bajo la pista */
  {
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: nebTex(rand(0, 360)),
          transparent: true,
          opacity: rand(0.4, 0.7),
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          fog: false,
        }),
      );
      s.position.copy(new THREE.Vector3(rand(-1, 1), -rand(0.25, 0.9), -rand(0.4, 1)).normalize().multiplyScalar(4000));
      s.scale.setScalar(rand(2000, 3400));
      bgSky.add(s);
    }
    const gGeo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < 3; i++) {
      const m = new THREE.Mesh(
        gGeo,
        new THREE.MeshBasicMaterial({
          map: galaxyTex(rand(0, 360)),
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          fog: false,
        }),
      );
      m.position.copy(
        new THREE.Vector3((i - 1) * 0.7 + rand(-0.25, 0.25), -rand(0.3, 0.8), -1).normalize().multiplyScalar(3600),
      );
      m.scale.setScalar(rand(800, 1400));
      m.lookAt(0, 0, 0);
      m.rotateX(rand(0.3, 0.9));
      m.rotateZ(rand(0, 6.28));
      bgSky.add(m);
    }
  }
  jetGeo = new THREE.PlaneGeometry(1, 1);
  jetGeo.translate(0, 0.5, 0);
  jetMat = new THREE.MeshBasicMaterial({
    map: jetTex(),
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  qDiskMat = new THREE.MeshBasicMaterial({
    map: BH_DISK,
    color: 0x9fc8ff,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  quasars = [
    [-0.75, 0.3, -1, 0.5, 0.9],
    [0.55, -0.5, -1, -0.7, 0.4],
    [-0.3, -0.75, -1, 0.2, -1.1],
  ].map((q) => {
    const m = mkQuasar();
    m.scale.setScalar(rand(95, 140));
    m.position.copy(new THREE.Vector3(q[0], q[1], q[2]).normalize().multiplyScalar(3400));
    m.rotation.set(q[3], 0, q[4]);
    bgSky.add(m);
    return m;
  });
  /* todo el fondo va en su propia capa para poder dibujarlo aparte (vidrio de la pista) */
  {
    const toBg = (o) => o.traverse((c) => c.layers.set(BG_LAYER));
    toBg(bgSky);
    toBg(stars3);
    for (const p of bgPlanets) toBg(p.m);
    for (const p of lowPlanets) toBg(p.m);
    scene.traverse((o) => {
      if (o.isLight) o.layers.enable(BG_LAYER);
    });
    camera.layers.enable(BG_LAYER);
  }
}
const BHM = {};
function bhMats(fog) {
  const k = fog ? 'f' : 'n';
  if (BHM[k]) return BHM[k];
  return (BHM[k] = {
    core: new THREE.MeshBasicMaterial({
      color: 0x000000,
      fog,
    }),
    disk: new THREE.MeshBasicMaterial({
      map: BH_DISK,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog,
    }),
    ring: new THREE.SpriteMaterial({
      map: BH_RING,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog,
    }),
    glow: new THREE.SpriteMaterial({
      map: DOT,
      color: 0x9a5cff,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog,
    }),
  });
}
/* núcleo negro + disco de acreción inclinado + anillo de luz + halo */
export function mkBlackHole(fog) {
  const M = bhMats(fog),
    g = new THREE.Group();
  g.add(new THREE.Mesh(SPH, M.core));
  const tilt = new THREE.Group();
  tilt.rotation.x = 0.42;
  g.add(tilt);
  const disk = new THREE.Mesh(bhDiskGeo, M.disk);
  tilt.add(disk);
  const ring = new THREE.Sprite(M.ring);
  ring.scale.setScalar(4.2);
  g.add(ring);
  const glow = new THREE.Sprite(M.glow);
  glow.scale.setScalar(9);
  g.add(glow);
  g.userData.disk = disk;
  return g;
}
function placeBgPlanet(p, initial) {
  const r = setupPlanet(p, 110, 380),
    side = Math.random() < 0.5 ? -1 : 1,
    off = p.ring.visible ? 2.3 * r + 200 : r + 300; /* los anillos no invaden el camino */
  p.m.position.set(side * rand(off, off + 600), rand(120, 650), initial ? rand(-4600, -1800) : rand(-5600, -4600));
}
/* planetas grandes que pasan por DEBAJO de la pista */
function placeLowPlanet(p, initial) {
  const r = setupPlanet(p, 220, 500);
  p.ring.visible = false; /* sin anillos: atravesarían la pista */
  /* corridos hacia un lado para no tapar la lectura de los obstáculos en el centro */
  p.m.position.set(
    (Math.random() < 0.5 ? -1 : 1) * rand(320, 1000),
    -(r + rand(420, 1050)),
    initial ? rand(-3400, -500) : rand(-4400, -3500),
  );
}
function mkQuasar() {
  const g = new THREE.Group();
  for (const dir of [1, -1])
    for (const ry of [0, Math.PI / 2]) {
      const j = new THREE.Mesh(jetGeo, jetMat);
      j.scale.set(1.3, 9 * dir, 1);
      j.rotation.y = ry;
      g.add(j);
    }
  const disk = new THREE.Mesh(bhDiskGeo, qDiskMat);
  disk.scale.setScalar(0.75);
  g.add(disk);
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
  core.scale.setScalar(2.4);
  g.add(core);
  const halo = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: DOT,
      color: 0x6fa8ff,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  );
  halo.scale.setScalar(6.5);
  g.add(halo);
  g.userData = {
    core,
    disk,
  };
  return g;
}
export function bgTick(dt, spd) {
  const now = performance.now() / 1000;
  bgSky.position.copy(camera.position);
  bgHole.userData.disk.rotation.y -= dt * 0.5;
  for (const p of bgPlanets) {
    p.m.position.z += spd * 0.1 * dt;
    p.m.rotation.y += p.spin * dt;
    if (p.m.position.z > -700) placeBgPlanet(p, false);
  }
  for (const p of lowPlanets) {
    p.m.position.z += spd * 0.3 * dt;
    p.m.rotation.y += p.spin * dt;
    if (p.m.position.z > 800) placeLowPlanet(p, false);
  }
  for (let i = 0; i < quasars.length; i++) {
    const u = quasars[i].userData;
    u.core.scale.setScalar(2.4 + Math.sin(now * 5 + i * 2) * 0.5);
    u.disk.rotation.y -= dt * 1.5;
  }
}

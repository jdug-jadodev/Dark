/** Modelos de naves enemigas y de los jefes. */
import { BOX, SPH, bmat, extrude, lmat } from '../kit.js';
import { mkWorldBoss } from '../bosses.js';
import { worldEnemy, worldLook } from '../worlds.js';
/* -- naves enemigas -- */
const EN_PTS = [
  [0, 1],
  [1.1, -0.6],
  [0.45, -0.2],
  [0, -0.7],
  [-0.45, -0.2],
  [-1.1, -0.6],
];
let enGeo;
let enEdge;
let bossGeo;
let bossEdge;
let bossTopGeo;
let barrelGeo;
let bossRingGeo;
export function bootEnemies() {
  enGeo = extrude(EN_PTS, 0.34, 0.07);
  enEdge = new THREE.EdgesGeometry(enGeo, 25);
  bossGeo = extrude(BOSS_PTS, 14, 3);
  bossEdge = new THREE.EdgesGeometry(bossGeo, 25);
  bossTopGeo = extrude(
    BOSS_PTS.map((p) => [p[0] * 0.58, p[1] * 0.58 - 4]),
    8,
    2,
  );
  barrelGeo = new THREE.CylinderGeometry(2.6, 2.6, 16, 12);
  bossRingGeo = new THREE.TorusGeometry(24, 1.6, 8, 48);
}
export function mkEnemy(e) {
  /* cada mundo tiene sus propios enemigos */
  const look = worldLook();
  if (look) return worldEnemy(e, look);
  const hex = e.heavy ? '#ffb454' : '#ff6b8a';
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: e.heavy ? 0x5a2a60 : 0x5a1f45,
    metalness: 0.55,
    roughness: 0.4,
  });
  g.add(new THREE.Mesh(enGeo, mat));
  g.add(new THREE.LineSegments(enEdge, lmat(hex)));
  const core = new THREE.Mesh(SPH, bmat(hex));
  core.scale.setScalar(0.24);
  core.position.set(0, 0.2, -0.05);
  g.add(core);
  const glow = new THREE.Mesh(SPH, bmat(hex, true, 0.35));
  glow.scale.setScalar(0.42);
  glow.position.copy(core.position);
  g.add(glow);
  for (const sx of [-1.05, 1.05]) {
    const tt = new THREE.Mesh(SPH, bmat(hex));
    tt.scale.setScalar(0.09);
    tt.position.set(sx, 0, -0.6);
    g.add(tt);
  }
  g.scale.setScalar(e.r * 1.3);
  g.userData = {
    mat,
    dispose() {
      mat.dispose();
    },
  };
  return g;
}
/* -- jefes (intermedio y final) -- */
const BOSS_PTS = [
  [-52, 2],
  [-34, -30],
  [34, -30],
  [52, 2],
  [30, 30],
  [-30, 30],
];
const BOSS_LOOK = {
  final: {
    body: 0x3e1a46,
    trim: 0x7a2a55,
    em: 0x2a0614,
    edge: '#ff6b8a',
    core: '#ff3d6e',
    scale: 1.2,
  },
  mini: {
    body: 0x1e3a40,
    trim: 0x2f6a5a,
    em: 0x06281c,
    edge: '#ffb454',
    core: '#ffb454',
    scale: 0.95,
  },
};
export function mkBoss(bs) {
  if (bs.form) return mkWorldBoss(bs); // el jefe de un mundo es una criatura o una nave propia
  const L = bs.look || BOSS_LOOK[bs.kind] || BOSS_LOOK.final, // el jefe de un mundo trae sus colores
    g = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({
    color: L.body,
    metalness: 0.6,
    roughness: 0.4,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: L.trim,
    metalness: 0.5,
    roughness: 0.35,
    emissive: L.em,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x1a1024,
    metalness: 0.7,
    roughness: 0.4,
  });
  g.add(new THREE.Mesh(bossGeo, body));
  g.add(new THREE.LineSegments(bossEdge, lmat(L.edge)));
  const top = new THREE.Mesh(bossTopGeo, trim);
  top.position.y = 10;
  g.add(top);
  for (const sx of [-40, 40]) {
    const c = new THREE.Mesh(BOX, body);
    c.scale.set(13, 10, 18);
    c.position.set(sx, 0, 28);
    g.add(c);
    const br = new THREE.Mesh(barrelGeo, dark);
    br.rotation.x = Math.PI / 2;
    br.position.set(sx, 0, 40);
    g.add(br);
    const mz = new THREE.Mesh(SPH, bmat(L.edge, true, 0.7));
    mz.scale.setScalar(3.2);
    mz.position.set(sx, 0, 48);
    g.add(mz);
  }
  const core = new THREE.Mesh(SPH, bmat(L.core));
  core.scale.setScalar(13);
  core.position.set(0, 18, 0);
  g.add(core);
  const halo = new THREE.Mesh(SPH, bmat(L.core, true, 0.35));
  halo.scale.setScalar(21);
  halo.position.copy(core.position);
  g.add(halo);
  const eye = new THREE.Mesh(SPH, bmat('#ffffff'));
  eye.scale.setScalar(5);
  eye.position.set(0, 20, 9);
  g.add(eye);
  const ring = new THREE.Mesh(bossRingGeo, trim);
  ring.position.copy(core.position);
  g.add(ring);
  g.scale.setScalar(L.scale);
  g.userData = {
    body,
    core,
    halo,
    ring,
    dispose() {
      body.dispose();
      trim.dispose();
      dark.dispose();
    },
  };
  return g;
}

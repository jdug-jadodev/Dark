/** Modelo de la nave del jugador. */
import { BOX, SPH, bmat, extrude, mirror } from '../kit.js';
/* -- nave del jugador -- */
const SHIP_SHAPE = {
  wing: [
    [3, -6],
    [19, 6],
    [20, 10],
    [3, 8],
  ],
  tips: true,
};
export function buildShip(id, color) {
  const g = new THREE.Group(),
    C = new THREE.Color(color),
    D = SHIP_SHAPE;
  const hull = new THREE.MeshStandardMaterial({
    color: 0xd8e0f0,
    metalness: 0.6,
    roughness: 0.32,
  });
  const paint = new THREE.MeshStandardMaterial({
    color: C,
    metalness: 0.45,
    roughness: 0.4,
    emissive: C.clone().multiplyScalar(0.18),
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x1a2142,
    metalness: 0.7,
    roughness: 0.45,
  });
  const glass = new THREE.MeshStandardMaterial({
    color: 0x8fe6ff,
    metalness: 0.2,
    roughness: 0.06,
    emissive: 0x0f3a55,
  });
  /* fuselaje */
  const prof = [
    [0, -13],
    [3.2, -11.5],
    [4.6, -6],
    [5, 0],
    [4.3, 7],
    [2.5, 13],
    [0, 19],
  ].map((p) => new THREE.Vector2(p[0], p[1]));
  const fg = new THREE.LatheGeometry(prof, 20);
  fg.rotateX(-Math.PI / 2);
  const fus = new THREE.Mesh(fg, hull);
  fus.scale.set(1, 0.72, 1);
  g.add(fus);
  /* franja de color en la nariz */
  const st = new THREE.Mesh(fg, paint);
  st.scale.set(1.02, 0.74, 0.5);
  st.position.z = -8.6;
  g.add(st);
  /* alas */
  const wing = new THREE.Mesh(extrude(mirror(D.wing), 1.4, 0.5), paint);
  wing.position.y = -0.6;
  g.add(wing);
  if (D.canard) {
    const cn = new THREE.Mesh(extrude(mirror(D.canard), 1, 0.3), paint);
    cn.position.y = 0.4;
    g.add(cn);
  }
  if (D.tips) {
    const w = D.wing[1];
    for (const sx of [-1, 1]) {
      const f = new THREE.Mesh(BOX, hull);
      f.scale.set(0.9, 5, 7);
      f.position.set(sx * (w[0] + 0.5), 1.6, w[1] + 2);
      g.add(f);
      const l = new THREE.Mesh(SPH, bmat(color));
      l.scale.setScalar(1.1);
      l.position.set(sx * (w[0] + 0.5), 4.2, w[1] + 4.8);
      g.add(l);
    }
  }
  /* aletas traseras */
  for (const sx of [-1, 1]) {
    const f = new THREE.Mesh(BOX, paint);
    f.scale.set(0.8, 6, 6.5);
    f.position.set(sx * 3.4, 3.4, 8.5);
    f.rotation.z = -sx * 0.38;
    g.add(f);
  }
  /* cabina */
  const ck = new THREE.Mesh(SPH, glass);
  ck.scale.set(2.9, 2.2, 6.2);
  ck.position.set(0, 2.6, -4);
  g.add(ck);
  /* motores + llamas */
  const flames = [];
  const eg = new THREE.CylinderGeometry(2.4, 2.9, 10, 16);
  eg.rotateX(Math.PI / 2);
  const fo = new THREE.ConeGeometry(2.3, 13, 14, 1, true);
  fo.rotateX(Math.PI / 2);
  fo.translate(0, 0, 6.5);
  const fi = new THREE.ConeGeometry(1.2, 8, 10, 1, true);
  fi.rotateX(Math.PI / 2);
  fi.translate(0, 0, 4);
  for (const sx of [-6, 6]) {
    const e = new THREE.Mesh(eg, dark);
    e.position.set(sx, -0.4, 8.5);
    g.add(e);
    const ring = new THREE.Mesh(SPH, bmat('#ffb454'));
    ring.scale.set(2.2, 2.2, 0.6);
    ring.position.set(sx, -0.4, 13.5);
    g.add(ring);
    const a = new THREE.Mesh(fo, bmat('#ff8a3c', true, 0.75));
    a.position.set(sx, -0.4, 13.6);
    g.add(a);
    const b = new THREE.Mesh(fi, bmat('#fff2c0', true, 0.9));
    b.position.set(sx, -0.4, 13.6);
    g.add(b);
    flames.push(a, b);
  }
  /* cañones visibles cuando hay un arma recogida */
  const guns = [];
  const gg = new THREE.CylinderGeometry(1, 1, 12, 8);
  for (const sx of [-9, 9]) {
    const gn = new THREE.Mesh(gg, bmat('#ffb454'));
    gn.rotation.x = Math.PI / 2;
    gn.position.set(sx, 0.8, -4);
    gn.visible = false;
    g.add(gn);
    guns.push(gn);
  }
  g.scale.setScalar(1);
  g.userData = {
    flames,
    guns,
    dispose() {
      hull.dispose();
      paint.dispose();
      dark.dispose();
      glass.dispose();
    },
  };
  return g;
}

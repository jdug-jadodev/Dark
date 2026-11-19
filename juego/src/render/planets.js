/** Planetas al azar (tipo, textura, anillos, atmósfera). */
import { pick, rand } from '../core/util.js';
import { DOT } from './kit.js';
import { planetTex, ringTex } from './textures.js';
let planetGeo;
let pRingGeo;
export function bootPlanets() {
  planetGeo = new THREE.SphereGeometry(1, 48, 32);
  pRingGeo = new THREE.RingGeometry(1.35, 2.3, 96);
}
const ATM = {
  gas: null,
  earth: 0x7fc8ff,
  ice: 0xbfefff,
  lava: 0xff8a3c,
  rock: 0x9a9aa0,
};
/* Planeta nuevo al azar (tipo, textura, anillos, atmósfera); devuelve el radio */
export function setupPlanet(p, rMin, rMax) {
  const kind = pick(['gas', 'gas', 'earth', 'ice', 'lava', 'rock']);
  if (p.mat.map) p.mat.map.dispose();
  p.mat.map = planetTex(kind);
  p.mat.emissive.setHex(kind === 'lava' ? 0x6a2000 : 0x000000);
  p.mat.emissiveMap = kind === 'lava' ? p.mat.map : null;
  p.mat.needsUpdate = true;
  const r = rand(rMin, rMax);
  p.m.scale.setScalar(r);
  p.m.rotation.set(rand(-0.3, 0.3), rand(0, 6), rand(-0.2, 0.2));
  p.spin = rand(0.02, 0.08);
  p.ring.visible = kind === 'gas' && Math.random() < 0.7;
  p.ring.rotation.set(Math.PI / 2 + rand(-0.5, 0.5), rand(-0.3, 0.3), 0);
  if (ATM[kind] == null) p.atm.material.color.setHSL(rand(0, 1), 0.6, 0.6);
  else p.atm.material.color.setHex(ATM[kind]);
  p.atm.material.opacity = kind === 'rock' ? 0.15 : 0.35;
  return r;
}
export function placePlanet(p, initial) {
  const r = setupPlanet(p, 140, 480),
    side = Math.random() < 0.5 ? -1 : 1;
  p.m.position.set(side * rand(r + 300, r + 1300), rand(-650, 650), initial ? rand(-5400, -2600) : rand(-6500, -5200));
}
export function makePlanet(target) {
  const mat = new THREE.MeshStandardMaterial({
    roughness: 0.9,
    metalness: 0,
    fog: false,
  });
  const m = new THREE.Mesh(planetGeo, mat);
  const ring = new THREE.Mesh(
    pRingGeo,
    new THREE.MeshBasicMaterial({
      map: ringTex(),
      transparent: true,
      side: THREE.DoubleSide,
      depthWrite: false,
      fog: false,
      opacity: 0.85,
    }),
  );
  m.add(ring);
  const atm = new THREE.Sprite(
    new THREE.SpriteMaterial({
      map: DOT,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
      opacity: 0.35,
    }),
  );
  atm.scale.setScalar(2.7);
  m.add(atm);
  target.add(m);
  return {
    m,
    mat,
    ring,
    atm,
    spin: 0.05,
  };
}

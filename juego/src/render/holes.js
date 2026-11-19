/** Modelo del agujero negro de la pista y su zona de atracción. */
import { BH_PULL } from '../core/config.js';
import { mkBlackHole } from './backdrop.js';
let pullGeo;
let pullMat;
export function bootHoles() {
  pullGeo = new THREE.RingGeometry(0.96, 1, 96);
  pullGeo.rotateX(-Math.PI / 2);
  pullMat = new THREE.MeshBasicMaterial({
    color: 0xb07cff,
    transparent: true,
    opacity: 0.25,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}
export function mkHoleGame() {
  const g = mkBlackHole(true);
  g.scale.setScalar(22);
  const pull = new THREE.Mesh(pullGeo, pullMat);
  pull.scale.setScalar(BH_PULL / 22);
  pull.position.y = -28 / 22;
  g.add(pull);
  g.userData.pull = pull;
  return g;
}

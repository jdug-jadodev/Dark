/** Modelo del portal. */
import { portalTex } from './textures.js';
let portalRingGeo;
let portalGlowGeo;
let portalDiscGeo;
let portalRingMat;
export let portalGlowMat;
export let portalDiscMat;
export function bootPortals() {
  portalRingGeo = new THREE.TorusGeometry(1, 0.03, 10, 80);
  portalGlowGeo = new THREE.TorusGeometry(1, 0.09, 10, 80);
  portalDiscGeo = new THREE.CircleGeometry(0.98, 56);
  portalRingMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
  });
  portalGlowMat = new THREE.MeshBasicMaterial({
    color: 0x5ee0ff,
    transparent: true,
    opacity: 0.4,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  portalDiscMat = new THREE.MeshBasicMaterial({
    map: portalTex(),
    color: 0x5ee0ff,
    transparent: true,
    opacity: 0.55,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
}
export function mkPortal() {
  const g = new THREE.Group();
  g.rotation.order = 'YXZ';
  const disc = new THREE.Mesh(portalDiscGeo, portalDiscMat);
  g.add(disc, new THREE.Mesh(portalRingGeo, portalRingMat), new THREE.Mesh(portalGlowGeo, portalGlowMat));
  g.scale.setScalar(255);
  g.userData.disc = disc;
  return g;
}

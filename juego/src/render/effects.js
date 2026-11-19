/** Efectos sobre la nave (escudo, orbes, láser) y partículas. */
import { scene } from './engine.js';
import { BOX, DOT, SPH, bmat } from './kit.js';
export let shieldM;
let orbMat;
export let orbs;
export let pPos;
export let pCol;
export let pGeo;
let pPts;
export function bootEffects() {
  /* -- efectos persistentes: escudo, orbes, láser -- */
  shieldM = new THREE.Group();
  shieldM.add(
    new THREE.Mesh(
      SPH,
      new THREE.MeshBasicMaterial({
        color: 0x78e6ff,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  shieldM.add(
    new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.02, 2),
      new THREE.MeshBasicMaterial({
        color: 0x78e6ff,
        wireframe: true,
        transparent: true,
        opacity: 0.45,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    ),
  );
  shieldM.scale.setScalar(23);
  shieldM.visible = false;
  scene.add(shieldM);
  orbMat = new THREE.MeshStandardMaterial({
    color: 0xc792ff,
    emissive: 0x6a3aa8,
    metalness: 0.3,
    roughness: 0.3,
  });
  orbs = [0, 1, 2].map(() => {
    const m = new THREE.Mesh(SPH, orbMat);
    m.scale.setScalar(7);
    const h = new THREE.Mesh(SPH, bmat('#c792ff', true, 0.3));
    h.scale.setScalar(1.6);
    m.add(h);
    m.visible = false;
    scene.add(m);
    return m;
  });
  for (let i = 0; i < LSEG; i++) {
    const g = new THREE.Group();
    g.rotation.order = 'YXZ';
    const a = new THREE.Mesh(BOX, bmat('#ff5a82', true, 0.35)),
      b = new THREE.Mesh(BOX, bmat('#ff8aa6', true, 0.8)),
      c = new THREE.Mesh(BOX, bmat('#ffffff'));
    g.add(a, b, c);
    g.visible = false;
    scene.add(g);
    laserSegs.push({
      g,
      a,
      b,
      c,
    });
  }
  pPos = new Float32Array(PMAX * 3);
  pCol = new Float32Array(PMAX * 3);
  pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
  pPts = new THREE.Points(
    pGeo,
    new THREE.PointsMaterial({
      size: 9,
      map: DOT,
      vertexColors: true,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  pPts.frustumCulled = false;
  scene.add(pPts);
}
/* el láser va en tramos para poder seguir la curva de la pista */
export const LSEG = 12;
export const laserSegs = [];
/* -- partículas -- */
export const PMAX = 2000;

/** Modelos de rocas, monedas, cápsulas, balas y anillos de nova. */
import { CAPDEF, WEAPONS } from '../../core/config.js';
import { rand } from '../../core/util.js';
import { BOX, DOT, SPH, bmat, col3, emojiMat } from '../kit.js';
/* -- rocas -- */
function rockGeo() {
  const g = new THREE.IcosahedronGeometry(1, 1),
    p = g.attributes.position,
    map = {};
  for (let i = 0; i < p.count; i++) {
    const k = p.getX(i).toFixed(3) + ',' + p.getY(i).toFixed(3) + ',' + p.getZ(i).toFixed(3);
    if (!(k in map)) map[k] = rand(0.76, 1.12);
    const f = map[k];
    p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * 0.85, p.getZ(i) * f);
  }
  g.computeVertexNormals();
  return g;
}
export let ROCKG;
let rockMat;
let wallMat;
let coinGeo;
let coinMat;
let torusGeo;
let ebCoreMat;
let ringGeo;
let tailGeo;
let cometMats;
export function bootProps() {
  ROCKG = Array.from(
    {
      length: 6,
    },
    rockGeo,
  );
  rockMat = new THREE.MeshStandardMaterial({
    color: 0x5d6aa0,
    roughness: 0.95,
    metalness: 0.05,
    flatShading: true,
  });
  wallMat = new THREE.MeshStandardMaterial({
    color: 0x6e4c55,
    roughness: 0.9,
    metalness: 0.05,
    flatShading: true,
    emissive: 0x4a2000,
  });
  /* -- monedas, cápsulas, balas -- */
  coinGeo = new THREE.CylinderGeometry(7, 7, 2.2, 24);
  coinGeo.rotateX(Math.PI / 2);
  coinMat = new THREE.MeshStandardMaterial({
    color: 0xffd54a,
    metalness: 0.85,
    roughness: 0.25,
    emissive: 0x6a4400,
  });
  torusGeo = new THREE.TorusGeometry(14, 2.4, 10, 32);
  ebCoreMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    fog: false,
  });
  ringGeo = new THREE.RingGeometry(0.9, 1, 64);
  ringGeo.rotateX(-Math.PI / 2);
}
export function mkRock(o) {
  const m = new THREE.Mesh(ROCKG[Math.floor(Math.random() * ROCKG.length)], o.wall ? wallMat : rockMat);
  m.scale.setScalar(o.r);
  m.userData.tilt = rand(0, 6);
  return m;
}
export const mkCoin = () => new THREE.Mesh(coinGeo, coinMat);
const CMAT = {};
export function mkCap(c) {
  const d = CAPDEF[c.type],
    g = new THREE.Group();
  const mat =
    CMAT[c.type] ||
    (CMAT[c.type] = new THREE.MeshStandardMaterial({
      color: d.c,
      emissive: col3(d.c).clone().multiplyScalar(0.6),
      metalness: 0.4,
      roughness: 0.3,
    }));
  g.add(new THREE.Mesh(torusGeo, mat));
  const glow = new THREE.Mesh(SPH, bmat(d.c, true, WEAPONS.includes(c.type) ? 0.3 : 0.18));
  glow.scale.setScalar(12);
  g.add(glow);
  const sp = new THREE.Sprite(emojiMat(d.i));
  sp.scale.set(19, 19, 1);
  g.add(sp);
  return g;
}
export function mkBullet(b) {
  return new THREE.Mesh(BOX, bmat(b.col || '#ffb454'));
}
/* disparos enemigos: centro blanco + capa de color + resplandor grande; no se apagan con la niebla */
const EBM = {};
function ebMats(col) {
  return (
    EBM[col] ||
    (EBM[col] = {
      shell: new THREE.MeshBasicMaterial({
        color: col,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
      glow: new THREE.SpriteMaterial({
        map: DOT,
        color: col,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        fog: false,
      }),
    })
  );
}
export function mkEB(e) {
  const M = ebMats(e.col),
    m = new THREE.Mesh(SPH, ebCoreMat);
  const shell = new THREE.Mesh(SPH, M.shell);
  shell.scale.setScalar(1.5);
  m.add(shell);
  const glow = new THREE.Sprite(M.glow);
  glow.scale.setScalar(7);
  m.add(glow);
  return m;
}
/* Las piezas del cometa se crean la primera vez que aparece uno (en Supervivencia) y no
   en el arranque: así el resto del juego arranca exactamente igual que antes. */
function cometKit() {
  if (cometMats) return;
  /* cola: un cono acostado, ancho en la cabeza (z=0) y en punta hacia atrás (z=1) */
  tailGeo = new THREE.ConeGeometry(1, 1, 12, 1, true);
  tailGeo.rotateX(Math.PI / 2);
  tailGeo.translate(0, 0, 0.5);
  const add = (color, opacity) =>
    new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
      fog: false,
    });
  cometMats = {
    shell: add(0x7fdcff, 0.85),
    tail: add(0x4fb4ff, 0.5),
    trail: add(0xbfefff, 0.6),
    glow: new THREE.SpriteMaterial({
      map: DOT,
      color: 0x9fe8ff,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      fog: false,
    }),
  };
}
/* cometa: cabeza blanca, capa azul, resplandor y dos colas (una ancha y una fina más larga).
   Mide 1 de radio y apunta la cola hacia +Z; quien lo dibuja lo escala y lo orienta. */
export function mkComet() {
  cometKit();
  const g = new THREE.Group();
  g.add(new THREE.Mesh(SPH, ebCoreMat));
  const shell = new THREE.Mesh(SPH, cometMats.shell);
  shell.scale.setScalar(1.45);
  g.add(shell);
  const glow = new THREE.Sprite(cometMats.glow);
  glow.scale.setScalar(6);
  g.add(glow);
  const tail = new THREE.Mesh(tailGeo, cometMats.tail);
  tail.scale.set(1.3, 1.3, 9);
  g.add(tail);
  const trail = new THREE.Mesh(tailGeo, cometMats.trail);
  trail.scale.set(0.55, 0.55, 14);
  g.add(trail);
  return g;
}
export function mkRing() {
  const mat = new THREE.MeshBasicMaterial({
    color: 0xffd54a,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(ringGeo, mat);
  m.userData.dispose = () => mat.dispose();
  return m;
}

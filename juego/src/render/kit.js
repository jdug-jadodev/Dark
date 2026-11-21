import { drawIcon } from '../ui/icons.js';
/** Piezas 3D compartidas: geometrías básicas, materiales en caché, texturas de punto y emoji, extrusión. */
/* -- utilidades -- */
const CC = {};
export const col3 = (c) => CC[c] || (CC[c] = new THREE.Color(c));
const MC = {};
export function bmat(c, add, op) {
  const k = c + '|' + (add ? 1 : 0) + '|' + (op || 1);
  if (!MC[k])
    MC[k] = new THREE.MeshBasicMaterial({
      color: c,
      transparent: !!add,
      opacity: add ? op || 0.5 : 1,
      blending: add ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: !add,
    });
  return MC[k];
}
function dotTex() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  r.addColorStop(0, 'rgba(255,255,255,1)');
  r.addColorStop(0.3, 'rgba(255,255,255,.7)');
  r.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = r;
  g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}
export let DOT;
export let SPH;
export let BOX;
export function bootKit() {
  DOT = dotTex();
  SPH = new THREE.SphereGeometry(1, 16, 12);
  BOX = new THREE.BoxGeometry(1, 1, 1);
}
const ETX = {};
export function emojiMat(e) {
  if (ETX[e]) return ETX[e];
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.font = '44px sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(e, 32, 35);
  return (ETX[e] = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(c),
    transparent: true,
    depthWrite: false,
  }));
}
/* un icono propio como etiqueta que siempre mira a la cámara (las cápsulas). name puede venir como {nombre} */
export function iconMat(name) {
  const key = 'ic:' + name;
  if (ETX[key]) return ETX[key];
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  drawIcon(c.getContext('2d'), name.replace(/[{}]/g, ''), 8, 8, 80);
  return (ETX[key] = new THREE.SpriteMaterial({
    map: new THREE.CanvasTexture(c),
    transparent: true,
    depthWrite: false,
  }));
}
/* Extruye un polígono 2D (y hacia abajo = hacia el jugador) y lo acuesta en el plano */
export function extrude(pts, depth, bev) {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], -pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], -pts[i][1]);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth,
    bevelEnabled: bev > 0,
    bevelThickness: bev,
    bevelSize: bev,
    bevelSegments: 2,
    curveSegments: 4,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, -depth / 2, 0);
  return g;
}
export const mirror = (r) =>
  r.concat(
    r
      .slice()
      .reverse()
      .map((p) => [-p[0], p[1]]),
  );
const LM = {};
export const lmat = (c) =>
  LM[c] ||
  (LM[c] = new THREE.LineBasicMaterial({
    color: c,
  }));

/** Motor 3D base: renderizador, escena, cámara, luces, tamaño de pantalla. */
import { maxDensity } from '../core/perf.js';
import { G } from '../core/state.js';
import { SY, W } from '../core/config.js';
import { uCam } from './spaceScene.js';
import { bgRT, floorMat } from './track.js';
import { $, cv, fx } from '../ui/dom.js';
export const X3 = (x) => x - W / 2;
export const Z3 = (y) => y - SY;
export const BG = 0x0a1030;
export let renderer;
export let scene;
export let camera;
let sun;
let hemi;
let rim;
export let dyn;
export let live;
export function bootEngine() {
  renderer = new THREE.WebGLRenderer({
    canvas: cv,
    antialias: true,
    powerPreference: 'high-performance',
  });
  scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 850, 1650);
  camera = new THREE.PerspectiveCamera(72, 1, 1, 9000);
  camera.rotation.order = 'XYZ';
  hemi = new THREE.HemisphereLight(0xa8c0ff, 0x2a1838, 0.85);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffffff, 1.15);
  sun.position.set(-150, 320, 260);
  scene.add(sun);
  rim = new THREE.DirectionalLight(0x5ee0ff, 0.55);
  rim.position.set(220, 60, -320);
  scene.add(rim);
  dyn = new THREE.Group();
  scene.add(dyn);
  live = new Set();
}
/* La luz de cada mundo: T = { hemi: [cielo, suelo], rim } (render/worlds.js); null = la del espacio. */
export function mood(T) {
  hemi.color.setHex(T ? T.hemi[0] : 0xa8c0ff);
  hemi.groundColor.setHex(T ? T.hemi[1] : 0x2a1838);
  rim.color.setHex(T ? T.rim : 0x5ee0ff);
}
export const CAM = {
  y: 180,
  z: 280,
  p: 0.23,
};
export function use(e, make) {
  if (!e.m) e.m = make(e);
  if (e.m.parent !== dyn) dyn.add(e.m);
  live.add(e.m);
  return e.m;
}
export function resize() {
  const r = cv.getBoundingClientRect();
  G.dpr = Math.min(window.devicePixelRatio || 1, maxDensity());
  G.cw = r.width;
  G.ch = r.height;
  if (!G.cw || !G.ch) return;
  renderer.setPixelRatio(G.dpr);
  renderer.setSize(G.cw, G.ch, false);
  fx.width = Math.round(G.cw * G.dpr);
  fx.height = Math.round(G.ch * G.dpr);
  const bw = Math.max(32, Math.round(cv.width / 5)),
    bh = Math.max(32, Math.round(cv.height / 5));
  bgRT.setSize(bw, bh);
  floorMat.uniforms.uRes.value.set(cv.width, cv.height);
  floorMat.uniforms.uPx.value.set(1 / bw, 1 / bh);
  /* Cámara detrás y un poco arriba de la nave: la nave queda abajo
     y la pista hacia adelante se ve hasta el horizonte. */
  const a = G.cw / G.ch,
    V = (36 * Math.PI) / 180,
    tanV = Math.tan(V),
    P = (22 * Math.PI) / 180;
  CAM.fov = (V * 2 * 180) / Math.PI;
  camera.fov = CAM.fov;
  camera.aspect = a;
  camera.updateProjectionMatrix();
  const beta = Math.atan(0.6 * tanV),
    th = P + beta;
  const dist = Math.max(200, 100 / (a * tanV)) / Math.cos(beta);
  CAM.y = dist * Math.sin(th);
  CAM.z = dist * Math.cos(th);
  CAM.p = P;
  uCam.aspect = a;
  uCam.updateProjectionMatrix();
}
export function bootEngineResize() {
  new ResizeObserver(resize).observe($('stage'));
  window.addEventListener('resize', resize);
}

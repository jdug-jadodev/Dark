/** Pista: estrellas en movimiento, curvas (solo visuales), rieles y piso de vidrio esmerilado. */
import { G } from '../core/state.js';
import { W } from '../core/config.js';
import { chaos, prog } from '../core/difficulty.js';
import { rand } from '../core/util.js';
import { X3, Z3, scene } from './engine.js';
import { accCol, bgCol } from './environment.js';
import { BOX, DOT } from './kit.js';
/* -- fondo: estrellas, rejilla y rieles laterales (cambian de color por fase) -- */
export const SN = 520;
export let sPos;
export let starGeo;
export let stars3;
export let railMat;
export let barMat;
export let postMat;
let railI;
let barI;
let postI;
let _d;
export let bgRT;
let fPos;
let fAux;
let floorGeo;
export let floorMat;
let floorM;
export function bootTrack() {
  sPos = new Float32Array(SN * 3);
  for (let i = 0; i < SN; i++) {
    let x = rand(-1100, 1100),
      y = rand(-400, 800);
    if (Math.abs(x) < 260 && y > -80 && y < 90) y += y > 0 ? 120 : -160;
    sPos[i * 3] = x;
    sPos[i * 3 + 1] = y;
    sPos[i * 3 + 2] = rand(-1800, 400);
  }
  starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  stars3 = new THREE.Points(
    starGeo,
    new THREE.PointsMaterial({
      size: 5,
      map: DOT,
      color: 0xc8d6ff,
      transparent: true,
      depthWrite: false,
      fog: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  stars3.frustumCulled = false;
  scene.add(stars3);
  railMat = new THREE.MeshBasicMaterial({
    color: 0x5ee0ff,
    transparent: true,
    opacity: 0.6,
  });
  barMat = new THREE.MeshBasicMaterial({
    color: 0x5ee0ff,
    transparent: true,
    opacity: 0.2,
  });
  postMat = new THREE.MeshBasicMaterial({
    color: 0x5ee0ff,
  });
  railI = new THREE.InstancedMesh(BOX, railMat, TSEG * 2);
  barI = new THREE.InstancedMesh(BOX, barMat, TSEG);
  postI = new THREE.InstancedMesh(BOX, postMat, TSEG * 2);
  for (const m of [railI, barI, postI]) {
    m.frustumCulled = false;
    scene.add(m);
  }
  _d = new THREE.Object3D();
  _d.rotation.order = 'YXZ';
  bgRT = new THREE.WebGLRenderTarget(64, 128, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.LinearFilter,
  });
  fPos = new Float32Array((TSEG + 1) * 6);
  fAux = new Float32Array((TSEG + 1) * 4);
  for (let i = 0; i <= TSEG; i++) {
    fAux[i * 4] = -1;
    fAux[i * 4 + 1] = i / TSEG;
    fAux[i * 4 + 2] = 1;
    fAux[i * 4 + 3] = i / TSEG;
    if (i < TSEG) {
      const a = i * 2;
      fIdx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  floorGeo = new THREE.BufferGeometry();
  floorGeo.setAttribute('position', new THREE.BufferAttribute(fPos, 3));
  floorGeo.setAttribute('aux', new THREE.BufferAttribute(fAux, 2));
  floorGeo.setIndex(fIdx);
  floorMat = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms: {
      tBg: {
        value: bgRT.texture,
      },
      uRes: {
        value: new THREE.Vector2(1, 1),
      },
      uPx: {
        value: new THREE.Vector2(1 / 64, 1 / 128),
      },
      uTint: {
        value: new THREE.Color(),
      },
      uAcc: {
        value: new THREE.Color(),
      },
    },
    vertexShader:
      'attribute vec2 aux;varying vec2 vAux;void main(){vAux=aux;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: [
      'uniform sampler2D tBg;uniform vec2 uRes;uniform vec2 uPx;uniform vec3 uTint;uniform vec3 uAcc;varying vec2 vAux;',
      'void main(){',
      '  vec2 uv=gl_FragCoord.xy/uRes;',
      '  vec3 c=texture2D(tBg,uv).rgb*.28;',
      '  c+=(texture2D(tBg,uv+uPx*vec2(1.6,0.)).rgb+texture2D(tBg,uv-uPx*vec2(1.6,0.)).rgb+texture2D(tBg,uv+uPx*vec2(0.,1.6)).rgb+texture2D(tBg,uv-uPx*vec2(0.,1.6)).rgb)*.12;',
      '  c+=(texture2D(tBg,uv+uPx*vec2(2.4,2.4)).rgb+texture2D(tBg,uv-uPx*vec2(2.4,2.4)).rgb+texture2D(tBg,uv+uPx*vec2(2.4,-2.4)).rgb+texture2D(tBg,uv+uPx*vec2(-2.4,2.4)).rgb)*.06;',
      '  float far=smoothstep(.62,1.,vAux.y);',
      '  vec3 glass=mix(c*.42,uTint,.34);',
      '  glass+=uAcc*pow(abs(vAux.x),10.)*.11;',
      '  gl_FragColor=vec4(mix(glass,c,far),1.);',
      '}',
    ].join('\n'),
  });
  floorM = new THREE.Mesh(floorGeo, floorMat);
  floorM.frustumCulled = false;
  scene.add(floorM);
}
let bendTX = 0;
let bendTY = 0;
export const bd = (z) => {
  const d = Math.max(0, -z) / 1000;
  return d * d;
};
export const tanX = (z) => (z < 0 ? (G.bendX * 2 * z) / 1e6 : 0);
export const tanY = (z) => (z < 0 ? (G.bendY * 2 * z) / 1e6 : 0);
export function put(m, x, h, y) {
  const z = Z3(y),
    b = bd(z);
  m.position.set(X3(x) + G.bendX * b, h + G.bendY * b, z);
}
/* Supervivencia, por tramo de locura: la pista cambia de curva más seguido (FAST), llega a la
   curva nueva más rápido (SNAP) y se dobla más hacia los lados (WIDE) y en subidas y bajadas (TALL) */
const FAST = [1, 1.1, 1.3, 1.8, 2.4];
const SNAP = [1, 1.1, 1.25, 1.7, 2.1];
const WIDE = [1, 1, 1.05, 1.2, 1.3];
const TALL = [1, 1.1, 1.25, 1.6, 1.9];
export function bendTick(dt) {
  const c = G.state === 'play' ? chaos() : 0;
  if (G.state === 'play' && G.run.mode !== 'space') {
    G.bendT -= dt;
    if (G.bendT <= 0) {
      G.bendT = rand(3, 6) / FAST[c];
      const amp = Math.min(1, 0.5 + prog() / 150) * WIDE[c];
      bendTX =
        Math.random() < 0.15 ? 0 : (bendTX > 0 ? -1 : 1) * rand(0.4, 1) * 400 * amp; /* alterna izquierda/derecha */
      bendTY = ((rand(-0.7, 1) * 110 * amp) / WIDE[c]) * TALL[c];
    }
  } else {
    bendTX = 0;
    bendTY = 0;
  }
  const k = Math.min(1, dt * 0.8 * SNAP[c]);
  G.bendX += (bendTX - G.bendX) * k;
  G.bendY += (bendTY - G.bendY) * k;
}
/* rieles, travesaños y postes: piezas cortas que siguen la curva */
const TSEG = 36;
const TLEN = 50;
/* -- PISTA DE VIDRIO ESMERILADO --
   El fondo (planetas, galaxias, estrellas) se dibuja primero en pequeño a una
   textura; el piso de la pista muestra esa textura desenfocada y apagada.
   Así lo que queda debajo del camino no distrae, y fuera de él se ve nítido. */
export const BG_LAYER = 1;
const fIdx = [];
export function trackTick() {
  const off = G.scroll % TLEN,
    HW = W / 2 + 6;
  for (let i = 0; i <= TSEG; i++) {
    const z = 260 - i * TLEN,
      b = bd(z),
      cx = G.bendX * b,
      cy = -33 + G.bendY * b,
      k = i * 6;
    fPos[k] = cx - HW;
    fPos[k + 1] = cy;
    fPos[k + 2] = z;
    fPos[k + 3] = cx + HW;
    fPos[k + 4] = cy;
    fPos[k + 5] = z;
  }
  floorGeo.attributes.position.needsUpdate = true;
  floorMat.uniforms.uTint.value.copy(bgCol);
  floorMat.uniforms.uAcc.value.copy(accCol);
  for (let i = 0; i < TSEG; i++) {
    const z = 240 - i * TLEN + off,
      b = bd(z),
      cx = G.bendX * b,
      cy = -30 + G.bendY * b;
    _d.rotation.set(-Math.atan(tanY(z)), Math.atan(tanX(z)), 0);
    for (let k = 0; k < 2; k++) {
      const x = cx + (k ? HW : -HW);
      _d.position.set(x, cy, z);
      _d.scale.set(2, 2, TLEN + 3);
      _d.updateMatrix();
      railI.setMatrixAt(i * 2 + k, _d.matrix);
      _d.position.set(x, cy + 4, z);
      _d.scale.set(3, 7, 3);
      _d.updateMatrix();
      postI.setMatrixAt(i * 2 + k, _d.matrix);
    }
    _d.position.set(cx, cy - 1, z);
    _d.scale.set(HW * 2, 1, 1.5);
    _d.updateMatrix();
    barI.setMatrixAt(i, _d.matrix);
  }
  railI.instanceMatrix.needsUpdate = true;
  barI.instanceMatrix.needsUpdate = true;
  postI.instanceMatrix.needsUpdate = true;
}

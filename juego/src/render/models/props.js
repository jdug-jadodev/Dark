/** Modelos de rocas, monedas, cápsulas, balas y anillos de nova. */
import { CAPDEF, WEAPONS } from '../../core/config.js';
import { look } from '../../core/garage.js';
import { rand } from '../../core/util.js';
import { BOX, DOT, SPH, bmat, col3, emojiMat, iconMat } from '../kit.js';
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
  const sp = new THREE.Sprite(iconMat(d.i));
  sp.scale.set(17, 17, 1);
  g.add(sp);
  return g;
}
/* Disparo de la nave: color y forma según las armas que lleva puestas. El tamaño lo pone draw.js.
   En m.userData: round = se agranda parejo (no se estira a lo largo) · aim = apunta hacia donde va ·
   spin = gira sobre sí mismo. */
const BG = {};
const bgeo = (key, make) => BG[key] || (BG[key] = make());
/* figura plana (corazón, estrella) acostada: se ve bien desde la cámara, que mira desde arriba */
const flat = (shape) => {
  const g = new THREE.ExtrudeGeometry(shape, { depth: 0.28, bevelEnabled: false, curveSegments: 8 });
  g.rotateX(-Math.PI / 2);
  return g;
};
const heartGeo = () =>
  bgeo('heart', () => {
    const h = new THREE.Shape();
    h.moveTo(0, -0.55);
    h.bezierCurveTo(-1, 0.1, -0.55, 0.8, 0, 0.3);
    h.bezierCurveTo(0.55, 0.8, 1, 0.1, 0, -0.55);
    return flat(h);
  });
const starGeo = () =>
  bgeo('star', () => {
    const st = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2,
        r = i % 2 ? 0.26 : 0.62;
      st[i ? 'lineTo' : 'moveTo'](Math.sin(a) * r, Math.cos(a) * r);
    }
    st.closePath();
    return flat(st);
  });
const tipGeo = () =>
  bgeo('tip', () => {
    const g = new THREE.ConeGeometry(0.75, 1.5, 6);
    g.rotateX(-Math.PI / 2); // la punta hacia adelante
    return g;
  });
let hue = 0;
let shotNo = 0;
export function mkBullet(b) {
  const W = look().gun;
  let col = (W.shots && W.shots[b.k]) || b.col || '#ffb454';
  if (W.rainbow) {
    hue = (hue + 0.09) % 1; // cada disparo, un color distinto
    col = '#' + new THREE.Color().setHSL(hue, 1, 0.62).getHexString();
  }
  if (W.bolt === 'box') return new THREE.Mesh(BOX, bmat(col));
  const g = new THREE.Group(),
    part = (geometry, material, sx, sy, sz, x, y, z) => {
      const m = new THREE.Mesh(geometry, material);
      m.scale.set(sx, sy, sz);
      m.position.set(x || 0, y || 0, z || 0);
      g.add(m);
      return m;
    };
  if (W.bolt === 'dart') {
    part(tipGeo(), bmat(col), 1, 1, 1);
    g.userData.aim = true;
  } else if (W.bolt === 'laser') {
    /* rayo: un hilo blanco muy largo con su resplandor de color */
    part(BOX, bmat('#ffffff'), 0.3, 0.3, 2.8);
    part(BOX, bmat(col, true, 0.7), 0.85, 0.85, 3.1);
    g.userData.aim = true;
  } else if (W.bolt === 'arrow') {
    /* flecha: palo, punta y plumas */
    part(BOX, bmat('#c9a36a'), 0.16, 0.16, 1.2);
    part(tipGeo(), bmat(col), 0.5, 0.5, 0.22, 0, 0, -0.72);
    part(BOX, bmat(col), 0.7, 0.08, 0.2, 0, 0, 0.55);
    part(BOX, bmat(col), 0.08, 0.7, 0.2, 0, 0, 0.55);
    g.userData.aim = true;
  } else if (W.bolt === 'bomb') {
    /* bomba: bola oscura con la mecha encendida */
    part(SPH, bmat('#2a2c38'), 0.5, 0.5, 0.5);
    part(BOX, bmat('#8a8fa8'), 0.16, 0.3, 0.16, 0, 0.52, 0);
    part(SPH, bmat(col), 0.17, 0.17, 0.17, 0, 0.74, 0);
    part(SPH, bmat(col, true, 0.5), 0.4, 0.4, 0.4, 0, 0.74, 0);
    g.userData.round = true;
    g.userData.spin = 5;
  } else if (W.bolt === 'heart') {
    part(heartGeo(), bmat(col), 1, 1, 1);
    part(heartGeo(), bmat(col, true, 0.35), 1.35, 1, 1.35, 0, -0.1, 0);
    g.userData.round = true;
  } else if (W.bolt === 'star') {
    part(starGeo(), bmat(col), 1.2, 1, 1.2);
    part(starGeo(), bmat(col, true, 0.35), 1.7, 1, 1.7, 0, -0.1, 0);
    g.userData.round = true;
    g.userData.spin = 7;
  } else if (W.bolt === 'gift') {
    /* cajita de regalo con su cinta dorada y el moño */
    part(BOX, bmat(col), 0.8, 0.8, 0.8);
    part(BOX, bmat('#ffd54a'), 0.84, 0.84, 0.2);
    part(BOX, bmat('#ffd54a'), 0.2, 0.84, 0.84);
    part(SPH, bmat('#ffd54a'), 0.2, 0.14, 0.14, -0.2, 0.5, 0);
    part(SPH, bmat('#ffd54a'), 0.2, 0.14, 0.14, 0.2, 0.5, 0);
    g.userData.round = true;
    g.userData.spin = 4;
  } else if (W.bolt === 'beam') {
    /* rayo alienígena: un haz con dos aros que lo rodean */
    part(BOX, bmat('#ffffff'), 0.28, 0.28, 2.6);
    part(BOX, bmat(col, true, 0.7), 0.8, 0.8, 2.9);
    const hoop = bgeo('ring', () => new THREE.TorusGeometry(0.42, 0.09, 8, 20));
    part(hoop, bmat(col), 2.6, 2.6, 0.5, 0, 0, -0.7);
    part(hoop, bmat(col), 1.9, 1.9, 0.5, 0, 0, 0.5);
    g.userData.aim = true;
  } else if (W.bolt === 'ring') {
    /* aro de energía, de frente como un anillo de humo */
    part(
      bgeo('ring', () => new THREE.TorusGeometry(0.42, 0.09, 8, 20)),
      bmat(col),
      1,
      1,
      1,
    );
    part(SPH, bmat(col, true, 0.25), 0.42, 0.42, 0.12);
    g.userData.round = true;
  } else if (W.bolt === 'emoji') {
    /* cualquier cosa: el dibujo siempre mira a la cámara */
    const sp = new THREE.Sprite(emojiMat(W.icons[shotNo++ % W.icons.length]));
    sp.scale.setScalar(1.5);
    g.add(sp);
    g.userData.round = true;
  } else {
    /* bola de energía: centro claro y un halo del color del disparo */
    part(SPH, bmat('#ffffff'), 0.42, 0.42, 0.36);
    part(SPH, bmat(col, true, 0.75), 0.85, 0.85, 0.62);
  }
  return g;
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
export function mkRing(q) {
  const mat = new THREE.MeshBasicMaterial({
    color: (q && q.col) || 0xffd54a,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const m = new THREE.Mesh(ringGeo, mat);
  m.userData.dispose = () => mat.dispose();
  return m;
}

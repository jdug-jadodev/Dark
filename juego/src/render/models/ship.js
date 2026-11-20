/**
 * Modelo de la nave del jugador, armado con las piezas que lleva puestas (core/parts.js):
 * casco, trompa, alas, alerones, pintura, cabina, motores, llama y armas. Aquí vive también cómo se ven las pinturas
 * especiales (tornasol, espectro, holograma…) y el movimiento de las llamas.
 */
import { vrand } from '../../core/util.js';
import { BOX, SPH, bmat, extrude, mirror } from '../kit.js';
import { buildNose } from './nose.js';
import { makeStamps, makeTrail } from './trail.js';
import { buildVehicle } from './vehicles.js';

/* Geometrías: se crean la primera vez que hacen falta y se reutilizan (probar piezas en el
   taller rehace la nave muchas veces; así solo se crean los materiales). */
const GEO = {};
const geo = (key, make) => GEO[key] || (GEO[key] = make());
const along = (g) => (g.rotateX(Math.PI / 2), g); // acostada a lo largo de la nave, mirando hacia atrás
const nozzleGeo = (sides, bell) =>
  geo('nozzle' + sides + (bell ? 'b' : ''), () =>
    along(new THREE.CylinderGeometry(bell ? 3.7 : 2.4, bell ? 2.2 : 2.9, 10, sides)),
  );
const flameGeo = (inner, sides) =>
  geo('flame' + (inner ? 'In' : 'Out') + sides, () => {
    const g = along(new THREE.ConeGeometry(inner ? 1.2 : 2.3, inner ? 8 : 13, sides, 1, true));
    g.translate(0, 0, inner ? 4 : 6.5);
    return g;
  });
/* alerón triangular (el de un solo alerón al centro): de 1 de alto, 1 de largo y 1 de grueso */
const finGeo = () =>
  geo('finTri', () => {
    const s = new THREE.Shape();
    s.moveTo(-0.5, 0);
    s.lineTo(0.5, 0);
    s.lineTo(0.5, 1);
    s.lineTo(0.15, 1);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false });
    g.translate(0, 0, -0.5);
    g.rotateY(-Math.PI / 2);
    return g;
  });

/* ---------- pinturas que reflejan (cromo, oro…): un cielo sencillo para que tengan qué reflejar ---------- */
let sky;
function shine() {
  if (sky) return sky;
  const face = (stops, band) => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const g = c.getContext('2d'),
      grad = g.createLinearGradient(0, 0, 0, 64);
    stops.forEach((s, i) => grad.addColorStop(i / (stops.length - 1), s));
    g.fillStyle = grad;
    g.fillRect(0, 0, 64, 64);
    if (band) {
      g.fillStyle = 'rgba(255,255,255,.9)';
      g.fillRect(0, 27, 64, 5);
    }
    return c;
  };
  const side = face(['#f4fbff', '#9cc0ff', '#3a3a8a', '#141030'], true);
  sky = new THREE.CubeTexture([side, side, face(['#ffffff', '#e8f4ff']), face(['#141030', '#0a0818']), side, side]);
  sky.needsUpdate = true;
  return sky;
}

/* ---------- pinturas especiales: un trozo de programa de dibujo que se le agrega al material ---------- */
const FX = {
  shift: 1,
  spectrum: 2,
  rainbow: 3,
  ghost: 4,
  pulse: 5,
  holo: 6,
  glitter: 7,
  lava: 8,
  aurora: 9,
  rim: 10,
  crystal: 11,
  cosmos: 12,
  neonbow: 13,
};
const FX_HEAD = `
uniform float uTime;
uniform int uFx;
uniform vec3 uA;
uniform vec3 uB;
vec3 fxPal(float t) { return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67))); }
float fxHash(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main() {`;
/* fr = qué tan de lado se ve la superficie (0 de frente … 1 de canto): de ahí sale el tornasol */
const FX_BODY = `#include <emissivemap_fragment>
{
  float fr = 1.0 - abs(dot(normal, normalize(vViewPosition)));
  if (uFx == 1) {
    vec3 c = mix(uA, uB, smoothstep(0.08, 0.8, fr + 0.08 * sin(uTime * 0.9)));
    diffuseColor.rgb = c;
    totalEmissiveRadiance += c * 0.22;
  } else if (uFx == 2) {
    vec3 c = fxPal(fr * 1.25 + uTime * 0.06);
    diffuseColor.rgb = c;
    totalEmissiveRadiance += c * 0.25;
  } else if (uFx == 3) {
    vec3 c = fxPal(uTime * 0.35 + vViewPosition.x * 0.02 + vViewPosition.y * 0.01);
    diffuseColor.rgb = c;
    totalEmissiveRadiance += c * 0.3;
  } else if (uFx == 4) {
    float rim = pow(fr, 1.6);
    diffuseColor.rgb = uA * 0.5;
    diffuseColor.a = 0.16 + 0.8 * rim;
    totalEmissiveRadiance += uA * (0.3 + 1.1 * rim) * (0.85 + 0.15 * sin(uTime * 3.0));
  } else if (uFx == 5) {
    float k = 0.5 + 0.5 * sin(uTime * 4.0);
    totalEmissiveRadiance += uA * (0.12 + 0.9 * k * k);
  } else if (uFx == 6) {
    float scan = step(0.5, fract(gl_FragCoord.y * 0.07 - uTime * 1.4));
    diffuseColor.rgb = uA * (0.3 + 0.5 * scan);
    diffuseColor.a = 0.4 + 0.5 * scan + 0.3 * fr;
    totalEmissiveRadiance += uA * (0.25 + 0.55 * scan + 0.5 * fr);
  } else if (uFx == 7) {
    float h = fxHash(floor(vViewPosition * 1.7));
    totalEmissiveRadiance += uB * step(0.965, h) * (0.5 + 0.5 * sin(uTime * 7.0 + h * 90.0)) * 2.2;
  } else if (uFx == 8) {
    float n = sin(vViewPosition.x * 0.42 + sin(vViewPosition.z * 0.33 + uTime * 0.8) * 2.0 + vViewPosition.y * 0.5 + uTime * 1.1);
    totalEmissiveRadiance += uB * smoothstep(0.25, 1.0, n) * 1.6;
  } else if (uFx == 9) {
    float w = 0.5 + 0.5 * sin(vViewPosition.x * 0.22 + sin(vViewPosition.y * 0.3 + uTime * 0.9) * 1.8 + uTime * 0.6);
    vec3 c = mix(uA, uB, w);
    diffuseColor.rgb = c * 0.55;
    totalEmissiveRadiance += c * (0.25 + 0.55 * w * w + 0.5 * fr);
  } else if (uFx == 10) {
    float rim = pow(fr, 2.2) * (0.75 + 0.25 * sin(uTime * 2.2));
    totalEmissiveRadiance += mix(uA, uB, rim) * rim * 2.6;
  } else if (uFx == 11) {
    vec3 c = fxPal(fr * 1.6 + uTime * 0.15);
    diffuseColor.rgb = c * 0.6;
    diffuseColor.a = 0.22 + 0.75 * pow(fr, 1.3);
    totalEmissiveRadiance += c * (0.25 + 0.9 * pow(fr, 1.6));
  } else if (uFx == 12) {
    float w = 0.5 + 0.5 * sin(vViewPosition.x * 0.16 + vViewPosition.z * 0.12 + sin(vViewPosition.y * 0.2 + uTime * 0.5) * 2.0);
    float h = fxHash(floor(vViewPosition * 1.5));
    diffuseColor.rgb = mix(uA, uB, w * w) * 0.5;
    totalEmissiveRadiance += mix(uA, uB, w * w) * 0.35 + vec3(1.0) * step(0.97, h) * (0.5 + 0.5 * sin(uTime * 6.0 + h * 80.0)) * 1.8;
  } else if (uFx == 13) {
    float line = smoothstep(0.86, 1.0, sin(vViewPosition.x * 0.9 + vViewPosition.y * 0.6 - uTime * 2.0));
    vec3 c = fxPal(uTime * 0.25 + vViewPosition.x * 0.03);
    totalEmissiveRadiance += c * (line * 1.8 + 0.6 * pow(fr, 2.0));
  }
}`;
function special(mat, P, U) {
  if (P.chrome) {
    mat.envMap = shine();
    mat.metalness = 0.95;
    mat.roughness = 0.14;
    mat.envMapIntensity = 1.15;
  }
  if (P.fx) {
    mat.onBeforeCompile = (sh) => {
      Object.assign(sh.uniforms, U);
      sh.fragmentShader = sh.fragmentShader
        .replace('void main() {', FX_HEAD)
        .replace('#include <emissivemap_fragment>', FX_BODY);
    };
    mat.customProgramCacheKey = () => 'giro-fx';
    if (P.fx === 'ghost' || P.fx === 'holo' || P.fx === 'crystal') mat.transparent = true;
  }
  return mat;
}

/* ---------- lo que comparten las naves armables y las únicas: llamas, cañones y estelas ---------- */
/* Las llamas de la nave. at(x, y, z, k) pone una en la boca de un escape (k = tamaño). */
function flameSet(F, keep, g) {
  const fOut = keep(
    new THREE.MeshBasicMaterial({
      color: F.out,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const fIn = keep(
    new THREE.MeshBasicMaterial({
      color: F.in,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    }),
  );
  const fRing = keep(new THREE.MeshBasicMaterial({ color: F.ring }));
  const flames = [],
    fSides = F.shape === 'crystal' ? 4 : 0;
  const at = (x, y, z, k) => {
    const flame = (obj) => {
      obj.position.set(x, y, z);
      obj.userData.k = k;
      g.add(obj);
      flames.push(obj);
    };
    if (F.shape === 'diamonds') {
      /* rombos de choque: un fuego tenue con tres nudos de luz adentro */
      const f = new THREE.Group();
      f.add(new THREE.Mesh(flameGeo(false, 14), fOut));
      [
        [2.6, 1.5],
        [6.4, 1.1],
        [9.8, 0.75],
      ].forEach(([fz, r]) => {
        const knot = new THREE.Mesh(SPH, fIn);
        knot.position.z = fz;
        knot.scale.set(r, r, r * 1.5);
        f.add(knot);
      });
      flame(f);
    } else {
      flame(new THREE.Mesh(flameGeo(false, fSides || 14), fOut));
      flame(new THREE.Mesh(flameGeo(true, fSides || 10), fIn));
    }
  };
  return { fOut, fIn, fRing, flames, at };
}
/* Los cañones, a gx de cada lado. Se ven solo cuando hay un arma recogida. */
function addGuns(W, gx, add, dark) {
  const guns = [],
    barrel = bmat(W.barrel);
  const gun = (geometry, sx, sy, sz, x, y, z, material) => {
    const m = add(geometry, material || barrel, sx, sy, sz, x, y, z);
    m.visible = false;
    guns.push(m);
  };
  const tube = geo('gunTube', () => along(new THREE.CylinderGeometry(1, 1, 12, 8)));
  for (const sx of [-1, 1]) {
    /* soporte que une el cañón con la nave (hay cascos sin ala a esa altura) */
    gun(BOX, gx - 2, 0.7, 2.6, (sx * (gx + 2)) / 2, 0.4, -1.5, dark);
    if (W.model === 'rail') {
      /* riel: dos barras planas con un núcleo entre ellas */
      gun(BOX, 0.7, 2.4, 15, sx * (gx - 0.8), 0.8, -4.5);
      gun(BOX, 0.7, 2.4, 15, sx * (gx + 1), 0.8, -4.5);
      gun(BOX, 1.1, 1, 9, sx * (gx + 0.1), 0.8, -2);
    } else if (W.model === 'twin') {
      /* doble cañón delgado a cada lado */
      gun(tube, 0.62, 0.62, 1.1, sx * (gx - 0.9), 0.8, -4.6);
      gun(tube, 0.62, 0.62, 1.1, sx * (gx + 1.1), 0.8, -4.6);
      gun(BOX, 3.4, 1.6, 4, sx * (gx + 0.1), 0.8, 0);
    } else if (W.model === 'gatling') {
      /* ametralladora: cuatro tubos finos en manojo, con dos abrazaderas */
      for (const [ox, oy] of [
        [-0.6, -0.6],
        [0.6, -0.6],
        [-0.6, 0.6],
        [0.6, 0.6],
      ])
        gun(tube, 0.42, 0.42, 1.2, sx * gx + ox, 0.9 + oy, -5);
      gun(tube, 1.25, 1.25, 0.12, sx * gx, 0.9, -9);
      gun(tube, 1.25, 1.25, 0.12, sx * gx, 0.9, -3);
    } else if (W.model === 'mortar') {
      /* mortero: corto y gordo */
      gun(tube, 1.9, 1.9, 0.6, sx * gx, 1, -3);
      gun(tube, 2.2, 2.2, 0.1, sx * gx, 1, -6.4);
    } else if (W.model === 'pod') {
      /* lanzador: una caja con la boca oscura */
      gun(BOX, 3.6, 2.6, 9, sx * gx, 1, -3);
      gun(BOX, 2.8, 1.8, 0.6, sx * gx, 1, -7.6, dark);
    } else gun(tube, 1, 1, 1, sx * gx, 0.8, -4);
  }
  return guns;
}
/* el camino puede ser una cinta, figuras sueltas (estrellas, corazones…) o las dos cosas */
function trailsFor(F, exits) {
  const T = F.trail,
    trails = [];
  if (T)
    for (const e of exits) {
      const figures = T.stamp || T.icon;
      if (T.flag) {
        /* bandera: una franja por color, una al lado de la otra */
        const total = T.flag.reduce((n, f) => n + f[1], 0);
        let done = 0;
        for (const [col, weight] of T.flag) {
          trails.push(makeTrail(T, e, { col, w: weight / total, dx: (done + weight / 2) / total - 0.5 }));
          done += weight;
        }
      } else if (!figures || T.ribbon) trails.push(makeTrail(T, e));
      if (figures) trails.push(makeStamps(T, e));
    }
  return trails;
}

/* Junta en una sola malla las piezas quietas que comparten material (dentro de cada grupo): un
   vehículo detallado tiene cientos de piezas, y dibujarlas una por una le costaría al teléfono.
   Lo que se anima pieza por pieza se marca con userData.live y no se toca. */
function mergeStatic(root, keep) {
  const groups = [root];
  root.traverse((o) => {
    if (o.isGroup && o !== root) groups.push(o);
  });
  for (const grp of groups) {
    const by = new Map();
    for (const m of grp.children) {
      if (!m.isMesh || m.children.length || m.userData.live) continue;
      if (!by.has(m.material)) by.set(m.material, []);
      by.get(m.material).push(m);
    }
    for (const [material, list] of by) {
      if (list.length < 2) continue;
      const pos = [],
        nor = [];
      for (const m of list) {
        m.updateMatrix();
        const flat = m.geometry.index ? m.geometry.toNonIndexed() : m.geometry.clone();
        flat.applyMatrix4(m.matrix);
        const p = flat.attributes.position.array,
          n = flat.attributes.normal.array,
          order = m.matrix.determinant() < 0 ? [0, 6, 3] : [0, 3, 6]; // una pieza en espejo se dibuja al revés
        for (let i = 0; i < p.length; i += 9)
          for (const o of order) {
            pos.push(p[i + o], p[i + o + 1], p[i + o + 2]);
            nor.push(n[i + o], n[i + o + 1], n[i + o + 2]);
          }
        flat.dispose();
        grp.remove(m);
      }
      const merged = keep(new THREE.BufferGeometry());
      merged.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
      merged.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
      grp.add(new THREE.Mesh(merged, material));
    }
  }
}

/* ---------- naves únicas: el vehículo entero es un modelo propio (render/models/vehicles.js) ---------- */
function buildUnique(look) {
  const { ship: V, flame: F, gun: W } = look;
  const g = new THREE.Group(),
    own = [],
    keep = (m) => (own.push(m), m),
    spin = [],
    anim = []; // funciones (ahora) que mueven partes: alas, patas, cola…
  const add = (geometry, material, sx, sy, sz, x, y, z, parent) => {
    const m = new THREE.Mesh(geometry, material);
    m.scale.set(sx, sy, sz);
    m.position.set(x || 0, y || 0, z || 0);
    (parent || g).add(m);
    return m;
  };
  const dark = keep(new THREE.MeshStandardMaterial({ color: 0x1a2142, metalness: 0.7, roughness: 0.45 }));
  const fl = flameSet(F, keep, g);
  /* el vehículo dice dónde están sus escapes [x, y, z, tamaño] y dónde van los cañones */
  const chrome = (color) => special(keep(new THREE.MeshStandardMaterial({ color })), { chrome: true });
  const out = buildVehicle(V, { g, add, keep, spin, anim, dark, chrome });
  mergeStatic(g, keep);
  const exits = out.exits.map(([x, y, z, k]) => {
    fl.at(x, y, z + 0.1, k);
    return { x, y, z: z + 1, k };
  });
  const mount = new THREE.Group();
  mount.position.set(0, out.gunY || 0, out.gunZ || 0);
  g.add(mount);
  const guns = addGuns(W, out.gunX || 9, (...a) => add(...a.slice(0, 8), mount), dark);
  const trails = trailsFor(F, exits);
  g.userData = {
    flames: fl.flames,
    guns,
    flame: F,
    fOut: fl.fOut,
    fRing: fl.fRing,
    fxU: { uTime: { value: 0 } },
    trails,
    spin,
    anim,
    dispose() {
      for (const m of own) m.dispose();
      for (const t of trails) t.dispose();
    },
  };
  return g;
}

export function buildShip(look) {
  if (look.ship && look.ship.kind) return buildUnique(look);
  const { hull: H, nose: N, wing: Wg, fin: Fn, paint: P, glass: C, engine: E, flame: F, gun: W } = look;
  const g = new THREE.Group(),
    own = []; // materiales propios de esta nave: se liberan con ella
  const keep = (m) => (own.push(m), m);
  const col = new THREE.Color(P.c);
  /* lo que las pinturas especiales necesitan saber en cada cuadro */
  const fxU = {
    uTime: { value: 0 },
    uFx: { value: FX[P.fx] || 0 },
    uA: { value: new THREE.Color(P.a || P.c) },
    uB: { value: new THREE.Color(P.b || P.c) },
  };
  const body = special(
    keep(
      new THREE.MeshStandardMaterial({
        color: P.body,
        metalness: P.metal ?? 0.6,
        roughness: P.rough ?? 0.32,
      }),
    ),
    P,
    fxU,
  );
  const paint = special(
    keep(
      new THREE.MeshStandardMaterial({
        color: col,
        metalness: P.metal ?? 0.45,
        roughness: P.rough ?? 0.4,
        emissive: col.clone().multiplyScalar(P.glow ?? 0.18),
      }),
    ),
    P,
    fxU,
  );
  const dark = keep(
    new THREE.MeshStandardMaterial({
      color: E.col || 0x1a2142,
      metalness: 0.7,
      roughness: 0.45,
    }),
  );
  const glass = keep(
    new THREE.MeshStandardMaterial({
      color: C.c,
      metalness: C.metal ?? 0.2,
      roughness: C.rough ?? 0.06,
      emissive: C.em,
      flatShading: C.kind === 'gem' || C.kind === 'wedge',
    }),
  );
  if (C.chrome) special(glass, { chrome: true }, fxU);
  const add = (geometry, material, sx, sy, sz, x, y, z) => {
    const m = new THREE.Mesh(geometry, material);
    m.scale.set(sx, sy, sz);
    m.position.set(x, y, z);
    g.add(m);
    return m;
  };

  /* ---------- fuselaje y trompa ---------- */
  /* Con la trompa de serie el fuselaje termina en su propia punta. Con cualquier otra se le corta
     la punta y ahí se pega la trompa (o en noseAt, para cascos que no terminan en punta). */
  const seg = H.seg || 20,
    custom = N.rar !== 'base',
    cut = custom && !H.noseAt,
    prof = cut ? H.prof.slice(0, -1) : H.prof,
    tip = prof[prof.length - 1][1]; // hasta dónde llega el fuselaje hacia adelante
  const fg = geo('fus.' + H.key + (cut ? '.cut' : ''), () => {
    let lathe = new THREE.LatheGeometry(
      prof.map((p) => new THREE.Vector2(p[0], p[1])),
      seg,
    );
    lathe.rotateX(-Math.PI / 2);
    if (seg < 12) {
      /* pocas caras: se ven planas (con 4, una queda hacia arriba) */
      if (seg === 4) lathe.rotateZ(Math.PI / 4);
      lathe = lathe.toNonIndexed();
      lathe.computeVertexNormals();
    }
    return lathe;
  });
  const noseAt = H.noseAt || [tip, prof[prof.length - 1][0]],
    /* las trompas armadas (carro, dragón…) van un poco más grandes que el fuselaje, para que se noten */
    noseR = Math.max(1.8, Math.min(4.4, noseAt[1])) * (N.kind ? 1.22 : 1),
    spin = []; // piezas que giran: { o, ax (eje), v (velocidad) }
  let nose = tip; // qué tan adelante llega la nave
  /* uno solo, o dos fuselajes lado a lado unidos por un puente */
  for (const fx of H.twin ? [-H.twin, H.twin] : [0]) {
    add(fg, body, 1, H.flat, 1, fx, 0, 0);
    /* franja de color en la nariz */
    if (H.stripe !== false) add(fg, paint, 1.02, H.flat + 0.02, 0.5, fx, 0, -(tip * 0.5 - (cut ? 0.05 : 0.9)));
    if (custom) {
      const n = buildNose(N, { paint, body, dark, glass, keep }, H.flat);
      n.group.position.set(fx, 0, -noseAt[0]);
      n.group.scale.set(noseR, noseR * H.flat, noseR);
      g.add(n.group);
      spin.push(...n.spin);
      nose = noseAt[0] + n.len * noseR;
    }
  }
  if (H.twin) add(BOX, body, H.twin * 2, 1.8, 13, 0, 0.6, -1);

  /* ---------- alas ---------- */
  /* por mitades cuando las puntas suben o bajan, o cuando hay un segundo par */
  const halfWing = (key, pts, y, up) => {
    const wg = geo(key, () => extrude(pts, 1.4, 0.5));
    for (const sx of [-1, 1]) add(wg, paint, sx, 1, 1, 0, y, 0).rotation.z = sx * up;
  };
  if (!Wg.wing.length) {
    /* sin alas: queda como un cohete */
  } else if (Wg.up || Wg.wing2) halfWing('wingH.' + Wg.key, Wg.wing, -0.6, Wg.up || 0);
  else
    add(
      geo('wing.' + Wg.key, () => extrude(mirror(Wg.wing), 1.4, 0.5)),
      paint,
      1,
      1,
      1,
      0,
      -0.6,
      0,
    );
  if (Wg.wing2) {
    const w2 = Wg.wing2;
    halfWing('wing2.' + Wg.key, w2.pts, w2.y, w2.up || 0);
    /* los palos que unen las dos alas del biplano */
    if (w2.struts) for (const sx of [-1, 1]) add(BOX, body, 0.7, w2.y + 0.6, 1.4, sx * w2.struts, (w2.y - 0.6) / 2, 0);
  }
  if (Wg.canard)
    add(
      geo('canard.' + Wg.key, () => extrude(mirror(Wg.canard), 1, 0.3)),
      paint,
      1,
      1,
      1,
      0,
      0.4,
      0,
    );
  /* aletas en la punta del ala, con su luz */
  if (Wg.tips) {
    const w = Wg.wing[1];
    for (const sx of [-1, 1]) {
      add(BOX, body, 0.9, 5, 7, sx * (w[0] + 0.5), 1.6, w[1] + 2);
      add(SPH, bmat(P.c), 1.1, 1.1, 1.1, sx * (w[0] + 0.5), 4.2, w[1] + 4.8);
    }
  }

  /* ---------- alerones (la cola) ---------- */
  for (const f of Fn.fins) {
    const y = f.y ?? 0.4;
    if (f.plank) add(BOX, paint, f.plank[0], f.plank[1], f.plank[2], 0, f.y, f.z);
    else if (f.box)
      /* tabla recta, inclinada sobre su centro */
      for (const sx of [-1, 1])
        add(BOX, paint, f.t ?? 0.8, f.h, f.l, sx * f.x, f.h / 2 + y, f.z).rotation.z = -sx * f.tilt;
    else if (!f.x) add(finGeo(), paint, f.t ?? 0.9, f.h, f.l, 0, y + 0.2, f.z);
    else
      /* triángulo en pareja: se abre hacia afuera (o hacia adentro, o hacia abajo) desde su base */
      for (const sx of [-1, 1]) add(finGeo(), paint, f.t ?? 0.85, f.h, f.l, sx * f.x, y, f.z).rotation.z = -sx * f.tilt;
  }

  /* ---------- cabina ---------- */
  const [cy, cz] = H.cab || [2.6, -4],
    [s0, s1, s2] = C.s;
  if (C.kind === 'gem')
    add(
      geo('gem', () => new THREE.OctahedronGeometry(1, 0)),
      glass,
      s0,
      s1,
      s2,
      0,
      cy,
      cz,
    );
  else if (C.kind === 'box') add(BOX, glass, s0, s1, s2, 0, cy - 0.3, cz);
  else if (C.kind === 'wedge')
    add(
      geo('wedge', () => {
        const w = new THREE.ConeGeometry(1, 1, 4);
        w.rotateY(Math.PI / 4);
        w.rotateX(-Math.PI / 2); // la punta hacia adelante
        return w;
      }),
      glass,
      s0,
      s1,
      s2,
      0,
      cy - 0.4,
      cz,
    );
  else if (C.kind === 'twin') {
    add(SPH, glass, s0, s1, s2, 0, cy, cz - 2.6);
    add(SPH, glass, s0 * 0.92, s1, s2, 0, cy + 0.25, cz + 3.6);
  } else if (C.kind === 'triple') {
    add(SPH, glass, s0, s1, s2, 0, cy, cz - 2.6);
    for (const sx of [-1, 1]) add(SPH, glass, s0, s1, s2, sx * 2.3, cy - 0.4, cz + 1.8);
  } else if (C.kind === 'eye') {
    /* un ojo que mira hacia adelante */
    add(SPH, glass, s0, s1, s2, 0, cy + 0.6, cz);
    add(SPH, bmat('#2a9aff'), s0 * 0.58, s1 * 0.58, s2 * 0.4, 0, cy + 0.9, cz - s2 * 0.72);
    add(SPH, bmat('#0a0a14'), s0 * 0.3, s1 * 0.3, s2 * 0.25, 0, cy + 1, cz - s2 * 0.98);
  } else {
    add(SPH, glass, s0, s1, s2, 0, cy, cz);
    if (C.kind === 'cage') {
      const wire = keep(new THREE.MeshBasicMaterial({ color: 0xdfe6f2, wireframe: true }));
      add(
        geo('cage', () => new THREE.IcosahedronGeometry(1.1, 1)),
        wire,
        s0,
        s1,
        s2,
        0,
        cy,
        cz,
      );
    } else if (C.kind === 'antenna') {
      for (const sx of [-1, 1]) {
        add(BOX, dark, 0.3, 5, 0.3, sx * 1.95, cy + 3.9, cz).rotation.z = -sx * 0.3;
        add(SPH, bmat(C.c), 0.75, 0.75, 0.75, sx * 2.7, cy + 6.3, cz);
      }
    } else if (C.kind === 'crown') {
      const spike = geo('spike', () => new THREE.ConeGeometry(0.5, 2.2, 6));
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2;
        add(spike, bmat('#ffd54a'), 1, 1, 1, Math.sin(a) * 1.7, cy + s1 * 0.75 + 0.6, cz + Math.cos(a) * 1.7);
      }
    }
  }

  /* ---------- motores + llamas: cada motor es [x, y, tamaño] ---------- */
  const fl = flameSet(F, keep, g),
    { fOut, fRing, flames } = fl;
  const exits = [], // dónde termina cada tobera: de ahí salen las estelas
    spread = (H.engX || 6) / 6, // cascos más anchos o más angostos separan o juntan los motores
    zc = 8.5 + (H.engZ || 0),
    long = E.long || 1,
    ng = nozzleGeo(E.sides || 16, E.bell),
    mouth = E.bell ? 3.3 : 2.2;
  for (const [px, py, k] of E.pods) {
    const x = px * spread,
      exit = zc + 5 * k * long; // donde termina la tobera
    add(ng, dark, k, k, k * long, x, py, zc);
    add(SPH, fRing, mouth * k, mouth * k, 0.6 * k, x, py, exit);
    /* aros luminosos a lo largo del motor */
    for (let i = 1; i <= (E.rings || 0); i++) add(SPH, fRing, 3.05 * k, 3.05 * k, 0.35 * k, x, py, exit - i * 2.6 * k);
    /* punta en el centro de la tobera */
    if (E.spike)
      add(
        geo('aero', () => along(new THREE.ConeGeometry(1.5, 7, 12))),
        dark,
        k,
        k,
        k,
        x,
        py,
        exit + 1.5 * k,
      );
    fl.at(x, py, exit + 0.1, k);
    exits.push({ x, y: py, z: exit + 1, k });
  }

  /* ---------- lo que gira o adorna según el motor: hélices, rotor, motor de carro, anillo ---------- */
  const blades = (n, len, wide, x, y, z, speed, axis) => {
    const hub = new THREE.Group();
    for (let i = 0; i < n; i++) {
      const arm = new THREE.Group(),
        blade = new THREE.Mesh(BOX, body);
      if (axis === 'y') {
        blade.scale.set(len, 0.3, wide);
        blade.position.x = len / 2;
        arm.rotation.y = (i / n) * Math.PI * 2;
      } else {
        blade.scale.set(wide, len, 0.3);
        blade.position.y = len / 2;
        arm.rotation.z = (i / n) * Math.PI * 2;
      }
      arm.add(blade);
      hub.add(arm);
    }
    const cap = new THREE.Mesh(SPH, dark);
    cap.scale.setScalar(wide * 0.9);
    hub.add(cap);
    hub.position.set(x, y, z);
    g.add(hub);
    spin.push({ o: hub, ax: axis || 'z', v: speed });
  };
  if (E.extra === 'props') for (const e of exits) blades(3, 6 * e.k, 1.3 * e.k, e.x, e.y, e.z + 0.4, 24);
  else if (E.extra === 'nose') blades(3, 8.5, 1.5, 0, 0, -nose - 0.8, 26);
  else if (E.extra === 'fans') {
    /* ventiladores: un aro grueso con aspas adentro */
    const duct = geo('duct', () => new THREE.TorusGeometry(3.7, 0.6, 8, 24));
    for (const e of exits) {
      add(duct, dark, e.k, e.k, 3.4 * e.k, e.x, e.y, e.z - 1.6);
      blades(5, 3.4 * e.k, 1.1 * e.k, e.x, e.y, e.z - 1, 30);
    }
  } else if (E.extra === 'rotor') {
    /* rotor de helicóptero sobre la cabina */
    add(BOX, dark, 0.7, 5, 0.7, 0, cy + s1 + 2, cz + 1);
    blades(4, 15, 1.7, 0, cy + s1 + 4.6, cz + 1, 16, 'y');
  } else if (E.extra === 'v8') {
    /* motor de carro: bloque, dos tapas de color en V, toma de aire; los escapes son las toberas */
    const iron = keep(new THREE.MeshStandardMaterial({ color: 0x2a2f3d, metalness: 0.7, roughness: 0.5 }));
    add(BOX, iron, 8, 3.4, 9, 0, 3.2, 5.5);
    for (const sx of [-1, 1]) add(BOX, paint, 2.8, 1.3, 8, sx * 2.9, 5.3, 5.5).rotation.z = -sx * 0.5;
    add(BOX, iron, 3, 2.2, 4.6, 0, 6.2, 4.6);
    add(BOX, paint, 3.8, 1.3, 2.2, 0, 7.8, 3);
  } else if (E.extra === 'halo') {
    /* anillo de luz alrededor de la cola */
    const halo = geo('halo', () => new THREE.TorusGeometry(9, 0.7, 10, 40));
    add(halo, fRing, 1, 1, 1.4, 0, 0.5, zc + 2);
    add(halo, fOut, 1.12, 1.12, 2.2, 0, 0.5, zc + 2);
  }

  /* ---------- cañones: se ven solo cuando hay un arma recogida ---------- */
  const guns = addGuns(W, H.gunX || 9, add, dark);

  const trails = trailsFor(F, exits);

  g.userData = {
    flames,
    guns,
    flame: F,
    fOut,
    fRing,
    fxU,
    trails,
    spin,
    dispose() {
      for (const m of own) m.dispose();
      for (const t of trails) t.dispose();
    },
  };
  return g;
}

/**
 * Lo que se mueve de la nave en cada cuadro: las llamas y las pinturas especiales.
 * extra = lo que se alargan las llamas por ir acelerando; boost = multiplicador (nitro).
 * El parpadeo usa el azar de adornos, no el de la partida.
 */
export function shipTick(model, now, extra, boost) {
  const u = model.userData,
    style = u.flame.style;
  u.fxU.uTime.value = now % 1000;
  for (const sp of u.spin) sp.o.rotation[sp.ax] = now * sp.v;
  if (u.anim) for (const move of u.anim) move(now);
  let i = 0;
  for (const f of u.flames) {
    const k = f.userData.k;
    let len = 0.75 + vrand() * 0.5,
      wide = 1;
    if (style === 'pulse')
      len = 0.85 + 0.55 * Math.sin(now * 11 + (i >> 1) * 1.3) + vrand() * 0.15; // late como un corazón
    else if (style === 'long') {
      len = 1.35 + vrand() * 0.5; // larga y delgada
      wide = 0.8;
    } else if (style === 'needle') {
      len = 2 + vrand() * 0.4; // una aguja de luz
      wide = 0.45;
    } else if (style === 'wide') {
      len = 0.5 + vrand() * 0.3; // corta y gorda
      wide = 1.5;
    } else if (style === 'strobe') len = Math.floor(now * 13) % 2 ? 1.3 : 0.3; // se prende y se apaga
    f.scale.set(k * wide, k * wide, k * (len + extra) * boost);
    i++;
  }
  if (style === 'rainbow') {
    u.fOut.color.setHSL((now * 0.45) % 1, 1, 0.56);
    u.fRing.color.setHSL((now * 0.45 + 0.08) % 1, 1, 0.7);
  }
}

/**
 * Mueve las estelas. parent = a qué escena se agregan; speed = qué tan rápido queda atrás el camino.
 * Devuelve las cintas, para que quien dibuja las mantenga vivas.
 */
export function shipTrails(model, parent, dt, speed, now) {
  const trails = model.userData.trails;
  if (!trails.length) return trails;
  model.updateMatrixWorld();
  for (const t of trails) {
    if (t.mesh.parent !== parent) parent.add(t.mesh);
    t.update(model.matrixWorld, dt, speed, now, model.visible);
  }
  return trails;
}

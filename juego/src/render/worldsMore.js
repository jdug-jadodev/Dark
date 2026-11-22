/**
 * Las piezas de los mundos de gases, ciudad y agujero negro: paisaje, obstáculos que vuelan,
 * montañas (o torres, o monolitos) plantadas en la pista, arcos y enemigos.
 *
 * Cada mundo ofrece lo mismo:
 *   props()          → paisaje a los lados: [geometría, material, cerca, alcance, tamaño, crece, forma, parpadea]
 *   rock(o)          → un obstáculo que vuela (o.wall = parte de una pared)
 *   peak(o)          → algo grande plantado en la pista
 *   arch(o)          → un arco entre dos pilares (o.arch = distancia entre ellos)
 *   enemy(e)        → { group, mat }
 *   comet            → colores de lo que cruza la pista, si lo hay
 * Todo se crea la primera vez que se usa y con vrand() (azar solo de adorno).
 */
import { vrand } from '../core/util.js';
import { BOX, SPH, bmat } from './kit.js';
import { arched, cone, crag, lump, onGround, planted, roughen } from './worldKit.js';

const std = (color, extra) => new THREE.MeshStandardMaterial({ color, roughness: 0.9, flatShading: true, ...extra });
const pickOne = (list) => list[Math.floor(vrand() * list.length)];
const piece = (g, geo, mat, s, x, y, z) => {
  const p = new THREE.Mesh(geo, mat);
  p.scale.set(s[0], s[1], s[2]);
  p.position.set(x || 0, y || 0, z || 0);
  g.add(p);
  return p;
};
/* medio aro de pie (para los arcos): mide 1 de radio y va de un pie al otro por arriba */
const halfRing = (tube) => new THREE.TorusGeometry(1, tube, 6, 16, Math.PI);

/* =====================================================================================
   MUNDO DE GASES: piedra café con musgo verde, gas por todos lados, montañas y arcos de piedra
   ===================================================================================== */
let GAS;
/* la piedra de este mundo: oscura al pie, estratos café, ocre arriba y parches de musgo */
const BROWN = [0x2a1a0c, 0x4a3018, 0x6a4a28, 0x8a6a40];
function paintStone(t, n, c) {
  const layer = Math.floor(t * 11 + n * 0.8); // estratos: capas café, y cada tanto una cornisa con musgo
  c.setHex(t < 0.14 ? BROWN[0] : t > 0.86 ? BROWN[3] : layer % 2 ? BROWN[1] : BROWN[2]);
  if (layer % 4 === 2 && n > 0.35 && t < 0.86) c.setHex(n > 0.8 ? 0x6fa82a : 0x3f6a1c);
}
function gasKit() {
  if (GAS) return GAS;
  const spire = crag(0.08, 3.4, 8, 5, 0.2, paintStone);
  spire.scale(0.5, 1, 0.5);
  const disc = new THREE.CircleGeometry(1, 14);
  disc.rotateX(-Math.PI / 2);
  const drip = new THREE.ConeGeometry(0.5, 1, 5);
  drip.rotateX(Math.PI);
  drip.translate(0, -0.5, 0); // cuelga: la base arriba, la punta abajo
  return (GAS = {
    crag: std(0xffffff, { vertexColors: true, side: THREE.DoubleSide }),
    stone: std(0x6b4a2a),
    dark: std(0x36230f),
    pale: std(0xa3834e),
    moss: std(0x6fae2c, { emissive: 0x2c5a08, emissiveIntensity: 0.6 }),
    vent: bmat('#d4ff6a'),
    gas: new THREE.MeshBasicMaterial({ color: 0xa6f04a, transparent: true, opacity: 0.22, depthWrite: false }),
    haze: new THREE.MeshBasicMaterial({
      color: 0x8fe03a,
      transparent: true,
      opacity: 0.085,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
    rocks: [0, 1, 2].map(() => lump(1, 0.85)),
    mounts: [0, 1, 2].map(() => crag(0.04, 3, 14, 10, 0.15, paintStone)),
    spire,
    ventCone: crag(0.5, 0.5, 7, 1, 0.1, (t, n, c) => c.setHex(t > 0.7 ? 0x4f7a22 : 0x36230f)),
    disc,
    drip,
    plume: cone(0.5, 2.6, 7),
    puff: new THREE.IcosahedronGeometry(1, 1),
    pillar: roughen(onGround(new THREE.CylinderGeometry(0.8, 1.15, 1, 7, 4)), 0.1),
    ring: roughen(halfRing(0.2), 0.04),
    dome: new THREE.SphereGeometry(1, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    arm: new THREE.ConeGeometry(0.07, 1.2, 5),
  });
}
const gas = {
  props() {
    const K = gasKit();
    return [
      [K.spire, K.crag, 40, 840, 13, 0.17, [0.6, 1, 0.6]],
      [K.rocks[0], K.stone, 30, 900, 12, 0.1, [1.3, 0.8, 1.1]],
      [K.plume, bmat('#a6f04a', true, 0.3), 46, 620, 10, 0.08, [1, 1, 1], true],
      /* bancos de gas: bajos, anchos, pegados a la pista y perdiéndose a lo lejos */
      [K.puff, K.haze, -34, 760, 26, 0.07, [1.6, 0.5, 1.6], true],
      [K.puff, K.gas, 60, 900, 16, 0.08, [1.4, 0.7, 1.4], true],
    ];
  },
  rock(o) {
    const K = gasKit(),
      g = new THREE.Group();
    g.add(new THREE.Mesh(pickOne(K.rocks), o.wall ? K.dark : K.stone));
    /* musgo encima y un poco de gas pegado */
    piece(g, pickOne(K.rocks), K.moss, [0.62, 0.3, 0.62], 0.1, 0.55, 0.1);
    piece(g, SPH, bmat('#b6ff5a', true, 0.2), [0.5, 0.3, 0.5], 0.3, 0.62, 0.2);
    return g;
  },
  peak(o) {
    const K = gasKit(),
      puffs = [];
    const g = planted(o, (add) => {
      /* una montaña ancha y maciza: una cumbre principal y varias más bajas pegadas a ella */
      const tops = [[0, 0, 1.05, 0.64]];
      const n = 3 + Math.floor(vrand() * 2);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.28 + vrand() * 0.6;
        tops.push([Math.cos(a) * 0.5, Math.sin(a) * 0.5, 0.6 + vrand() * 0.16, 0.32 + vrand() * 0.18]);
      }
      for (const [x, z, w, h] of tops) add(pickOne(K.mounts), K.crag, [w, h, w], x, 0, z, vrand() * 6.28);
      /* cornisas de piedra clara con musgo, a media ladera */
      for (let i = 0; i < 5; i++) {
        const a = vrand() * 6.28,
          t = 0.22 + vrand() * 0.4,
          r = (1 - t) * 0.84,
          x = Math.cos(a) * r,
          z = Math.sin(a) * r;
        add(pickOne(K.rocks), K.pale, [0.2, 0.07, 0.2], x, t * 1.92, z, vrand() * 6);
        add(pickOne(K.rocks), K.moss, [0.17, 0.045, 0.17], x, t * 1.92 + 0.07, z, vrand() * 6);
      }
      /* rocas caídas al pie */
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * 6.28 + vrand(),
          w = 0.22 + vrand() * 0.12;
        add(pickOne(K.rocks), K.dark, [w, w * 0.75, w], Math.cos(a) * 0.96, 0.06, Math.sin(a) * 0.96, vrand() * 6);
      }
      /* respiraderos: un cono bajo con el fondo encendido, y el gas que sube */
      for (let i = 0; i < 3; i++) {
        const a = (i / 3) * 6.28 + vrand() * 1.5,
          x = Math.cos(a) * 1.02,
          z = Math.sin(a) * 1.02;
        add(K.ventCone, K.crag, [0.2, 0.3, 0.2], x, 0, z, vrand() * 6);
        add(K.disc, K.vent, [0.09, 1, 0.09], x, 0.13, z);
        for (let j = 0; j < 3; j++) puffs.push([add(K.puff, K.gas, [0.1, 0.1, 0.1], x, 0.2, z), x, z, vrand()]);
      }
      /* gas enredado en las laderas */
      for (let i = 0; i < 2; i++) {
        const a = vrand() * 6.28;
        add(K.puff, K.haze, [0.6, 0.3, 0.6], Math.cos(a) * 0.6, 0.45 + vrand() * 0.8, Math.sin(a) * 0.6);
      }
    });
    g.userData.tick = (now) => {
      for (const [m, x, z, ph] of puffs) {
        const k = (now * 0.35 + ph) % 1;
        m.position.set(x + Math.sin(k * 5 + ph * 9) * 0.06, 0.15 + k * 1.3, z);
        m.scale.setScalar((0.07 + 0.32 * k) * (k > 0.8 ? (1 - k) * 5 : 1)); // sube, crece y se deshace
      }
    };
    return g;
  },
  arch(o) {
    const K = gasKit(),
      span = o.arch,
      r = o.r,
      top = 78, // altura de los pilares
      rise = span / 2 + 18; // cuánto sube el arco por encima de ellos
    return arched((add) => {
      for (const x of [0, span]) {
        /* el pilar: un fuste quebrado, con la base ancha, un collar de piedra clara y musgo */
        add(K.pillar, K.stone, [r, top, r], x, 0, 0);
        add(pickOne(K.rocks), K.dark, [r * 1.35, r * 0.75, r * 1.35], x, 6, 0);
        add(pickOne(K.rocks), K.pale, [r * 1.05, r * 0.3, r * 1.05], x, top * 0.55, 0);
        add(pickOne(K.rocks), K.moss, [r * 0.95, r * 0.22, r * 0.95], x, top * 0.55 + r * 0.25, 0);
        add(pickOne(K.rocks), K.stone, [r * 1.1, r * 0.5, r * 1.1], x, top - 4, 0);
        add(K.puff, K.haze, [r * 2.2, r * 1.1, r * 2.2], x, 8, 0); // gas al pie
      }
      /* el arco de piedra: medio aro quebrado apoyado en los dos pilares */
      add(K.ring, K.stone, [span / 2, rise, span / 2], span / 2, top - 6, 0);
      /* musgo por encima y gas que gotea por debajo */
      for (let i = 1; i < 6; i++) {
        const th = (i / 6) * Math.PI,
          x = span / 2 - Math.cos(th) * (span / 2),
          y = top - 6 + Math.sin(th) * rise;
        add(pickOne(K.rocks), i % 2 ? K.moss : K.pale, [r * 0.55, r * 0.26, r * 0.6], x, y + 5, 0);
        if (i % 2 === 0) add(K.drip, K.gas, [7, 16 + vrand() * 22, 7], x, y - 6, 0);
      }
    });
  },
  enemy(e) {
    /* medusa de gas: campana translúcida, tentáculos y una luz por dentro */
    const K = gasKit(),
      g = new THREE.Group(),
      hex = e.heavy ? '#ffe38a' : '#d8ff8a',
      mat = new THREE.MeshStandardMaterial({
        color: e.heavy ? 0xe0b84a : 0x9be04a,
        roughness: 0.25,
        metalness: 0.1,
        transparent: true,
        opacity: 0.88,
      });
    piece(g, K.dome, mat, [1, 0.8, 1], 0, 0, 0);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * 6.28,
        t = piece(g, K.arm, mat, [1, 1, 1], Math.cos(a) * 0.55, -0.55, Math.sin(a) * 0.55);
      t.rotation.set(Math.PI + Math.sin(a) * 0.25, 0, Math.cos(a) * 0.25); // cuelgan, algo abiertos
    }
    piece(g, SPH, bmat(hex), [0.3, 0.3, 0.3], 0, 0.25, 0);
    piece(g, SPH, bmat(hex, true, 0.3), [0.75, 0.6, 0.75], 0, 0.25, 0);
    return { group: g, mat };
  },
};

/* =====================================================================================
   CIUDAD: torres con ventanas encendidas, tráfico que viene de frente, puentes y drones de policía
   ===================================================================================== */
/* una fachada: ventanas encendidas y apagadas sobre un muro oscuro */
function windowTexture() {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 128;
  const x = c.getContext('2d');
  x.fillStyle = '#080b1a';
  x.fillRect(0, 0, 64, 128);
  for (let row = 0; row < 16; row++)
    for (let col = 0; col < 6; col++) {
      const lit = vrand();
      x.fillStyle = lit < 0.42 ? '#141a34' : lit < 0.75 ? '#ffd98a' : lit < 0.9 ? '#8ae8ff' : '#ff8ad8';
      x.fillRect(4 + col * 10, 3 + row * 8, 6, 4.5);
    }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}
let CITY;
function cityKit() {
  if (CITY) return CITY;
  const win = windowTexture();
  return (CITY = {
    tower: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: win,
      emissive: 0xffffff,
      emissiveMap: win,
      emissiveIntensity: 0.95,
      roughness: 0.8,
    }),
    concrete: std(0x2c3356, { flatShading: false, roughness: 0.75 }),
    dark: std(0x10142c, { flatShading: false, roughness: 0.5, metalness: 0.4 }),
    cars: [0xd93a5a, 0x3a8fd9, 0xe0b23a, 0x9a5ad9].map((c) =>
      std(c, { flatShading: false, roughness: 0.35, metalness: 0.55 }),
    ),
    box: onGround(new THREE.BoxGeometry(1, 1, 1)),
    rotor: new THREE.CylinderGeometry(0.42, 0.42, 0.06, 14),
  });
}
const city = {
  props() {
    const K = cityKit();
    return [
      [K.box, K.tower, 70, 900, 34, 0.24, [0.6, 2.6, 0.6]],
      [K.box, bmat('#ff4fc8'), 22, 320, 30, 0.02, [0.07, 1.3, 0.07]],
    ];
  },
  rock(o) {
    const K = cityKit(),
      g = new THREE.Group();
    if (o.wall) {
      /* barrera de obra: bloque con franjas encendidas */
      piece(g, BOX, K.concrete, [1.8, 1.15, 0.6]);
      for (const x of [-0.6, 0, 0.6]) piece(g, BOX, bmat('#ff9a2a'), [0.3, 0.3, 0.62], x, 0.15, 0);
      piece(g, SPH, bmat('#ff3b3b'), [0.16, 0.16, 0.16], 0, 0.75, 0);
    } else {
      /* un carro volador que viene de frente: se le ven los faros */
      piece(g, BOX, pickOne(K.cars), [1.5, 0.42, 2], 0, 0, 0);
      piece(g, BOX, K.dark, [1.1, 0.36, 0.95], 0, 0.36, -0.15);
      for (const sx of [-0.5, 0.5]) {
        piece(g, SPH, bmat('#fff6d8'), [0.17, 0.12, 0.08], sx, 0.02, 1.01);
        piece(g, SPH, bmat('#ff3b3b'), [0.15, 0.1, 0.06], sx, 0.04, -1.01);
      }
      piece(g, BOX, bmat('#5ee0ff', true, 0.45), [1.3, 0.05, 1.7], 0, -0.3, 0); // el resplandor de abajo
      g.scale.setScalar(0.66);
    }
    g.userData.steady = true; // viene derecho, sin dar vueltas
    return g;
  },
  peak(o) {
    const K = cityKit();
    return planted(o, (add) => {
      /* una torre: cuerpo con ventanas, un piso más angosto arriba, remate de neón y antena */
      const h = 3.6 + vrand() * 1.4;
      add(K.box, K.tower, [1.5, h, 1.5], 0, 0, 0);
      add(K.box, K.tower, [1.05, 1.1, 1.05], 0, h, 0);
      add(K.box, bmat(vrand() < 0.5 ? '#ff4fc8' : '#5ee0ff'), [1.6, 0.1, 1.6], 0, h, 0);
      add(K.box, K.dark, [0.06, 1.2, 0.06], 0.25, h + 1.1, 0.2);
      add(SPH, bmat('#ff3b3b'), [0.1, 0.1, 0.1], 0.25, h + 2.35, 0.2);
    });
  },
  arch(o) {
    const K = cityKit(),
      span = o.arch,
      r = o.r,
      top = 88;
    return arched((add) => {
      /* un puente de autopista: dos columnas, una viga y un letrero de neón colgando */
      for (const x of [0, span]) add(K.box, K.concrete, [r * 1.5, top, r * 1.5], x, 0, 0);
      add(K.box, K.concrete, [span + r * 2.4, 16, 30], span / 2, top - 4, 0);
      add(K.box, K.dark, [span * 0.7, 20, 4], span / 2, top - 30, 16);
      add(K.box, bmat('#5ee0ff'), [span * 0.62, 3.5, 1.5], span / 2, top - 18, 18.5);
      add(K.box, bmat('#ff4fc8'), [span * 0.4, 3.5, 1.5], span / 2, top - 26, 18.5);
      for (const x of [0, span]) add(SPH, bmat('#ffb454'), [4, 4, 4], x, top + 14, 0);
    });
  },
  enemy(e) {
    /* dron de policía: cuatro rotores y luces roja y azul */
    const K = cityKit(),
      g = new THREE.Group(),
      mat = new THREE.MeshStandardMaterial({
        color: e.heavy ? 0x3a2470 : 0x1e2c66,
        roughness: 0.4,
        metalness: 0.6,
      });
    piece(g, BOX, mat, [1, 0.32, 1], 0, 0, 0);
    piece(g, BOX, mat, [2.1, 0.08, 0.16], 0, 0.05, 0).rotation.y = Math.PI / 4;
    piece(g, BOX, mat, [2.1, 0.08, 0.16], 0, 0.05, 0).rotation.y = -Math.PI / 4;
    for (const sx of [-1, 1])
      for (const sz of [-1, 1]) {
        piece(g, K.rotor, K.dark, [1, 1, 1], sx * 0.74, 0.12, sz * 0.74);
        piece(g, K.rotor, bmat('#5ee0ff', true, 0.35), [1.15, 0.4, 1.15], sx * 0.74, 0.16, sz * 0.74);
      }
    piece(g, SPH, bmat('#ff3b3b'), [0.16, 0.14, 0.16], -0.28, 0.24, 0.2);
    piece(g, SPH, bmat('#3b7bff'), [0.16, 0.14, 0.16], 0.28, 0.24, 0.2);
    piece(g, SPH, bmat('#ff3b3b', true, 0.35), [0.4, 0.34, 0.4], -0.28, 0.24, 0.2);
    piece(g, SPH, bmat('#3b7bff', true, 0.35), [0.4, 0.34, 0.4], 0.28, 0.24, 0.2);
    piece(g, SPH, bmat('#fff6d8'), [0.12, 0.1, 0.06], 0, -0.04, 0.5); // el foco
    return { group: g, mat };
  },
};

/* =====================================================================================
   AGUJERO NEGRO: esquirlas de obsidiana, monolitos, aros de luz y espectros del vacío
   ===================================================================================== */
let HOLE;
function holeKit() {
  return (
    HOLE ||
    (HOLE = {
      obsidian: new THREE.MeshStandardMaterial({
        color: 0x140b22,
        roughness: 0.22,
        metalness: 0.65,
        flatShading: true,
        emissive: 0x6a2fd0,
        emissiveIntensity: 0.6,
      }),
      shard: (() => {
        const g = new THREE.OctahedronGeometry(1);
        g.scale(0.45, 1.15, 0.45);
        return g;
      })(),
      chunk: new THREE.OctahedronGeometry(1),
      blocks: [0, 1, 2].map(() => lump(0, 0.9)),
      prism: onGround(new THREE.CylinderGeometry(0.5, 0.68, 1, 6)),
      ring: halfRing(0.07),
      halo: new THREE.TorusGeometry(1, 0.06, 6, 22),
      tail: new THREE.ConeGeometry(0.2, 1.3, 6),
    })
  );
}
const hole = {
  props() {
    const K = holeKit();
    return [
      [K.chunk, K.obsidian, 46, 820, 9, 0.11, [0.8, 1.5, 0.8]],
      [BOX, bmat('#c792ff', true, 0.5), 60, 700, 9, 0.05, [0.12, 0.12, 7]],
    ];
  },
  rock(o) {
    const K = holeKit(),
      g = new THREE.Group();
    if (o.wall) {
      g.add(new THREE.Mesh(pickOne(K.blocks), K.obsidian));
      piece(g, SPH, bmat('#ff8a3c', true, 0.2), [1.3, 1.3, 1.3]);
    } else {
      /* un racimo de esquirlas de obsidiana con luz violeta */
      const n = 3 + Math.floor(vrand() * 2);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * 6.28 + vrand(),
          s = i ? 0.5 + vrand() * 0.3 : 0.95,
          p = piece(g, K.shard, K.obsidian, [s, s, s], i ? Math.cos(a) * 0.42 : 0, 0, i ? Math.sin(a) * 0.42 : 0);
        p.rotation.set(i ? Math.sin(a) * 0.7 : 0, vrand() * 3, i ? -Math.cos(a) * 0.7 : 0);
      }
      piece(g, SPH, bmat('#c792ff', true, 0.2), [1.25, 1.25, 1.25]);
    }
    return g;
  },
  peak(o) {
    const K = holeKit();
    return planted(o, (add) => {
      /* monolitos: prismas de obsidiana de distintas alturas, con un corazón de luz arriba */
      const cols = [
        [0, 0, 1, 3.4],
        [0.6, 0.25, 0.7, 2.1],
        [-0.55, 0.35, 0.65, 1.6],
        [0.1, -0.62, 0.6, 2.5],
      ];
      for (const [x, z, w, h] of cols) add(K.prism, K.obsidian, [w, h, w], x, 0, z, vrand() * 3);
      add(SPH, bmat('#fff0ff'), [0.2, 0.2, 0.2], 0, 3.7, 0);
      add(SPH, bmat('#c792ff', true, 0.45), [0.6, 0.6, 0.6], 0, 3.7, 0);
      add(SPH, bmat('#7a3fe0', true, 0.14), [1.6, 2.4, 1.6], 0, 1.6, 0);
    });
  },
  arch(o) {
    const K = holeKit(),
      span = o.arch,
      r = o.r;
    return arched((add) => {
      /* un aro de luz anclado en dos monolitos */
      for (const x of [0, span]) {
        add(K.prism, K.obsidian, [r * 1.5, 46, r * 1.5], x, 0, 0);
        add(SPH, bmat('#ff8a3c'), [5, 5, 5], x, 50, 0);
      }
      add(K.ring, bmat('#ff8a3c'), [span / 2, span / 2 + 10, span / 2], span / 2, 50, 0);
      add(K.ring, bmat('#ffd24a', true, 0.4), [span / 2 + 5, span / 2 + 16, span / 2 + 5], span / 2, 50, 0);
    });
  },
  enemy(e) {
    /* espectro del vacío: cuerpo negro, un ojo, un aro de luz y una cola que se deshace */
    const K = holeKit(),
      g = new THREE.Group(),
      hex = e.heavy ? '#ff8a3c' : '#c792ff',
      mat = new THREE.MeshStandardMaterial({ color: e.heavy ? 0x22102e : 0x0e0818, roughness: 0.35, metalness: 0.55 });
    piece(g, SPH, mat, [0.72, 0.55, 0.85], 0, 0, 0);
    for (const sx of [-0.4, 0, 0.4]) {
      const t = piece(g, K.tail, mat, [1, 1, 1], sx, 0, -0.95);
      t.rotation.x = -Math.PI / 2; // hacia atrás
      t.scale.setScalar(sx ? 0.7 : 1);
    }
    piece(g, SPH, bmat('#ffffff'), [0.17, 0.17, 0.1], 0, 0.1, 0.78);
    piece(g, SPH, bmat(hex, true, 0.5), [0.36, 0.36, 0.2], 0, 0.1, 0.76);
    const halo = piece(g, K.halo, bmat(hex), [1.05, 1.05, 1.05], 0, 0, 0);
    halo.rotation.set(Math.PI / 2.4, 0, 0.3);
    piece(g, SPH, bmat(hex, true, 0.14), [1.3, 0.9, 1.3], 0, 0, 0);
    return { group: g, mat };
  },
};

export const MORE = { gas, city, hole };

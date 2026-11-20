/**
 * Trompas de la nave (la punta de adelante). Cada una se arma en medidas propias: 1 = el radio
 * del fuselaje donde se pega, y "adelante" es −z. Quien la usa (ship.js) la pone en su sitio
 * y le da el tamaño del casco que lleve la nave.
 */
import { BOX, SPH, bmat } from '../kit.js';

const GEO = {};
const geo = (key, make) => GEO[key] || (GEO[key] = make());
/* cono con la base en z = 0 y la punta en z = −1 */
const coneF = (sides) =>
  geo('coneF' + sides, () => {
    const g = new THREE.ConeGeometry(1, 1, sides);
    if (sides === 4) g.rotateY(Math.PI / 4); // la pirámide, con una cara hacia arriba
    g.rotateX(-Math.PI / 2);
    g.translate(0, 0, -0.5);
    return g;
  });
/* cono con la base en y = 0 y la punta hacia arriba */
const coneUp = () =>
  geo('coneUp', () => {
    const g = new THREE.ConeGeometry(1, 1, 8);
    g.translate(0, 0.5, 0);
    return g;
  });
/* tubos de largo 1 y radio 1, a lo largo de cada eje */
const tubeZ = () => geo('tubeZ', () => new THREE.CylinderGeometry(1, 1, 1, 18).rotateX(Math.PI / 2));
const tubeX = () => geo('tubeX', () => new THREE.CylinderGeometry(1, 1, 1, 18).rotateZ(Math.PI / 2));
const tubeY = () => geo('tubeY', () => new THREE.CylinderGeometry(1, 1, 1, 14));
const ring = () => geo('ring', () => new THREE.TorusGeometry(1, 0.14, 8, 22));
/* figura de revolución: perfil [radio, largo hacia adelante] desde la base hasta la punta */
const lathe = (key, prof) =>
  geo('lathe.' + key, () => {
    const g = new THREE.LatheGeometry(
      prof.map((p) => new THREE.Vector2(p[0], p[1])),
      22,
    );
    g.rotateX(-Math.PI / 2);
    return g;
  });
const TAPA = [
  [1, 0],
  [0.92, 0.3],
  [0.6, 0.55],
  [0, 0.62],
];
const radiusAt = (prof, z) => {
  for (let i = 1; i < prof.length; i++)
    if (z <= prof[i][1]) {
      const [r0, z0] = prof[i - 1],
        [r1, z1] = prof[i];
      return r0 + ((r1 - r0) * (z - z0)) / (z1 - z0 || 1);
    }
  return 0;
};

/**
 * N = la pieza (core/parts.js) · M = materiales de la nave { paint, body, dark, glass, keep }
 * F = qué tan aplastado es el casco (para que lo redondo no quede ovalado)
 * Devuelve { group, len (cuánto sobresale), spin (piezas que giran) }.
 */
export function buildNose(N, M, F) {
  const group = new THREE.Group(),
    spin = [];
  const put = (geometry, material, sx, sy, sz, x, y, z, parent) => {
    const m = new THREE.Mesh(geometry, material);
    m.scale.set(sx, sy, sz);
    m.position.set(x || 0, y || 0, z || 0);
    (parent || group).add(m);
    return m;
  };
  const sub = () => {
    const g = new THREE.Group();
    group.add(g);
    return g;
  };
  const solid = (color, extra) =>
    M.keep(new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.4, ...extra }));
  const cap = (material) => put(lathe('tapa', TAPA), material || M.body, 1.02, 1.02, 1); // cierra el fuselaje
  const eyes = (x, y, z, s) => {
    for (const sx of [-1, 1]) {
      put(SPH, bmat('#ffffff'), s, s / F, s, sx * x, y, z);
      put(SPH, bmat('#0a0a14'), s * 0.5, (s * 0.5) / F, s * 0.5, sx * x * 1.02, y, z - s * 0.7);
    }
  };
  let len = 1;

  if (!N.kind) {
    /* de revolución: redonda, bala, aguja, chata… (droop = la punta cae hacia abajo) */
    const m = put(lathe(N.key, N.prof), M.paint, 1.02, 1.02, 1);
    if (N.droop) m.rotation.x = -N.droop;
    len = N.prof[N.prof.length - 1][1];
  } else if (N.kind === 'rocket') {
    put(lathe(N.key, N.prof), M.body, 1.02, 1.02, 1);
    put(coneF(18), bmat('#ff4a4a'), 0.5, 0.5, 1.3, 0, 0, -1.75);
    put(BOX, M.dark, 0.05, 0.05 / F, 1, 0, 0, -3.4);
    put(SPH, bmat('#ff4a4a'), 0.15, 0.15 / F, 0.15, 0, 0, -3.95);
    len = 4.1;
  } else if (N.kind === 'cannon') {
    cap();
    put(tubeZ(), M.dark, 0.42, 0.42 / F, 4.2, 0, 0, -2.3);
    put(tubeZ(), M.dark, 0.6, 0.6 / F, 0.7, 0, 0, -4.2);
    put(tubeZ(), M.paint, 0.75, 0.75 / F, 0.8, 0, 0, -0.6);
    len = 4.6;
  } else if (N.kind === 'intake') {
    /* toma de aire de avión a reacción: boca oscura con su cono al centro */
    put(tubeZ(), M.paint, 1.04, 1.04, 1, 0, 0, -0.5);
    put(ring(), M.paint, 0.98, 0.98, 1.6, 0, 0, -1);
    put(SPH, bmat('#05060c'), 0.9, 0.9, 0.12, 0, 0, -0.95);
    put(coneF(18), M.body, 0.4, 0.4, 1.3, 0, 0, -0.8);
    len = 2.1;
  } else if (N.kind === 'lamp') {
    /* faro: una cúpula de vidrio con la luz adentro */
    const dome = M.keep(
      new THREE.MeshStandardMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.4, roughness: 0.1 }),
    );
    put(tubeZ(), M.paint, 1.03, 1.03, 0.4, 0, 0, -0.2);
    put(SPH, bmat('#fff2a0'), 0.45, 0.45 / F, 0.45, 0, 0, -0.75);
    put(SPH, bmat('#ffd54a', true, 0.35), 1.5, 1.5 / F, 1.5, 0, 0, -0.9);
    put(SPH, dome, 0.98, 0.98, 1.15, 0, 0, -0.4);
    len = 1.6;
  } else if (N.kind === 'ram') {
    /* ariete: una cuña ancha y plana */
    cap();
    put(coneF(4), M.paint, 2.3, 0.6, 3.2, 0, 0, 0);
    len = 3.2;
  } else if (N.kind === 'dish') {
    /* radar: un plato mirando hacia adelante */
    const plate = M.keep(
      new THREE.MeshStandardMaterial({ color: 0xdfe6f2, metalness: 0.5, roughness: 0.3, side: THREE.DoubleSide }),
    );
    cap();
    put(BOX, M.dark, 0.14, 0.14 / F, 0.8, 0, 0.1, -0.8);
    const dish = put(
      geo('dish', () => new THREE.ConeGeometry(1, 1, 22, 1, true).rotateX(Math.PI / 2)),
      plate,
      1.5,
      1.5 / F,
      0.7,
      0,
      0.1,
      -1.4,
    );
    dish.rotation.x = 0.25;
    put(BOX, M.dark, 0.06, 0.06 / F, 0.9, 0, 0.25, -1.9);
    put(SPH, bmat('#ff4a4a'), 0.13, 0.13 / F, 0.13, 0, 0.3, -2.4);
    len = 2.5;
  } else if (N.kind === 'beak') {
    cap();
    put(coneF(12), bmat('#ffb02a'), 0.72, 0.5, 2.6, 0, 0.12, -0.2).rotation.x = -0.14;
    put(coneF(12), bmat('#ff8a1a'), 0.55, 0.28, 1.8, 0, -0.36, -0.2).rotation.x = -0.3;
    eyes(0.62, 0.5, -0.15, 0.26);
    len = 2.8;
  } else if (N.kind === 'fork') {
    cap();
    put(BOX, M.paint, 1.7, 0.4, 0.6, 0, 0, -0.5);
    for (const x of [-0.65, 0, 0.65]) put(coneF(10), M.paint, 0.2, 0.2 / F, 3, x, 0, -0.6);
    len = 3.6;
  } else if (N.kind === 'drill') {
    /* taladro: un cono con rosca, y gira */
    const iron = solid(0x8a93a8, { metalness: 0.75, roughness: 0.35 });
    cap(M.dark);
    const bit = sub();
    put(coneF(18), iron, 0.95, 0.95 / F, 3.3, 0, 0, -0.1, bit);
    for (let i = 0; i < 5; i++) {
      const r = 0.84 * (1 - i * 0.17);
      put(ring(), M.paint, r, r / F, r, 0, 0, -0.45 - i * 0.58, bit).rotation.x = 0.4;
    }
    spin.push({ o: bit, ax: 'z', v: 10 });
    len = 3.4;
  } else if (N.kind === 'shark') {
    /* boca de tiburón: dientes abajo, mandíbula roja y ojos */
    const prof = [
      [1, 0],
      [0.93, 0.8],
      [0.72, 1.8],
      [0.38, 2.8],
      [0, 3.3],
    ];
    put(lathe('ojiva', prof), M.paint, 1.02, 1.02, 1);
    put(SPH, bmat('#c81e2e'), 0.78, 0.3, 1.25, 0, -0.5, -1.35);
    for (let i = 0; i < 6; i++) {
      const z = 0.5 + i * 0.36,
        r = radiusAt(prof, z) * 0.82;
      for (const sx of [-1, 1]) put(coneUp(), bmat('#ffffff'), 0.11, -0.34, 0.11, sx * r, -0.36, -z);
    }
    eyes(0.72, 0.42, -1.2, 0.2);
    len = 3.3;
  } else if (N.kind === 'hammer') {
    cap();
    put(tubeZ(), M.body, 0.5, 0.5 / F, 1.5, 0, 0, -0.9);
    put(tubeX(), M.paint, 3.8, 0.85 / F, 0.85, 0, 0, -1.9);
    len = 2.8;
  } else if (N.kind === 'ball') {
    /* nariz de payaso */
    cap();
    put(SPH, solid(0xff2a3a, { roughness: 0.22 }), 1.4, 1.4 / F, 1.4, 0, 0, -1.3);
    put(SPH, bmat('#ffffff', true, 0.5), 0.35, 0.35 / F, 0.2, -0.45, 0.6 / F, -2.25);
    len = 2.7;
  } else if (N.kind === 'car') {
    /* frente de carro: capó, parrilla, faros, parachoques y ruedas */
    const tire = solid(0x15161c, { roughness: 0.8 });
    put(BOX, M.paint, 2.6, 1.15, 2.7, 0, -0.05, -1.3);
    put(BOX, M.dark, 1.5, 0.5, 0.14, 0, -0.15, -2.66);
    put(BOX, M.body, 2.8, 0.26, 0.34, 0, -0.52, -2.66);
    for (const sx of [-1, 1]) {
      put(SPH, bmat('#fff2a0'), 0.3, 0.3 / F, 0.16, sx * 0.98, 0.12, -2.66);
      put(SPH, bmat('#fff2a0', true, 0.3), 0.7, 0.7 / F, 0.5, sx * 0.98, 0.12, -2.8);
      put(tubeX(), tire, 0.5, 0.68 / F, 0.68, sx * 1.45, -0.5, -1.5);
    }
    len = 2.9;
  } else if (N.kind === 'truck') {
    /* cabina de camión: alta y plana, con parabrisas y chimeneas */
    put(BOX, M.paint, 2.5, 2.4, 1.9, 0, 0.5, -0.95);
    put(BOX, M.glass, 2.2, 0.8, 0.12, 0, 1.05, -1.9);
    put(BOX, M.dark, 1.5, 0.85, 0.12, 0, -0.1, -1.9);
    put(BOX, M.body, 2.7, 0.28, 0.34, 0, -0.65, -1.92);
    for (const sx of [-1, 1]) {
      put(SPH, bmat('#fff2a0'), 0.24, 0.24 / F, 0.14, sx * 1, -0.1, -1.92);
      put(tubeY(), M.body, 0.11, 2, 0.11, sx * 1.36, 1.3, -0.3);
    }
    len = 2.1;
  } else if (N.kind === 'train') {
    /* locomotora: caldera, farol, chimenea y la reja de adelante */
    put(tubeZ(), M.paint, 1.05, 1.05, 2.5, 0, 0, -1.25);
    put(tubeZ(), M.dark, 0.95, 0.95, 0.16, 0, 0, -2.52);
    put(SPH, bmat('#fff2a0'), 0.3, 0.3 / F, 0.24, 0, 0.25, -2.62);
    put(tubeY(), M.dark, 0.26, 1.3, 0.26, 0, 1.4, -1.9);
    put(tubeY(), M.dark, 0.42, 0.34, 0.42, 0, 2.15, -1.9);
    put(coneF(4), M.dark, 1.5, 0.75, 1.4, 0, -0.75, -2.2);
    len = 3.6;
  } else if (N.kind === 'saw') {
    /* pez sierra: una hoja larga con dientes a los dos lados */
    cap();
    put(BOX, M.body, 0.9, 0.16, 5, 0, 0, -2.7);
    const tooth = geo('tooth', () => new THREE.ConeGeometry(1, 1, 6).rotateZ(-Math.PI / 2).translate(0.5, 0, 0));
    for (let i = 0; i < 7; i++)
      for (const sx of [-1, 1]) put(tooth, M.paint, sx * 0.55, 0.14, 0.22, sx * 0.45, 0, -0.9 - i * 0.62);
    len = 5.3;
  } else if (N.kind === 'claws') {
    /* tenazas: salen hacia afuera y se cierran en punta */
    cap();
    for (const sx of [-1, 1]) {
      put(tubeZ(), M.paint, 0.36, 0.36 / F, 1.7, sx * 0.85, 0, -0.8).rotation.y = -sx * 0.5;
      put(coneF(10), M.paint, 0.36, 0.36 / F, 2, sx * 1.28, 0, -1.5).rotation.y = sx * 0.6;
    }
    len = 3.4;
  } else if (N.kind === 'snout') {
    /* hocico de cerdo */
    const pink = solid(0xff9bb8, { roughness: 0.5 });
    put(tubeZ(), pink, 1.02, 1.02, 1.2, 0, 0, -0.6);
    put(tubeZ(), solid(0xffb8cc, { roughness: 0.5 }), 0.92, 0.92, 0.1, 0, 0, -1.22);
    for (const sx of [-1, 1]) put(SPH, bmat('#7a2a4a'), 0.2, 0.3 / F, 0.1, sx * 0.38, 0, -1.26);
    len = 1.4;
  } else if (N.kind === 'horn') {
    /* cuerno de unicornio: largo, con vueltas doradas, apuntando un poco hacia arriba */
    cap();
    const horn = sub();
    horn.rotation.x = 0.3;
    put(coneF(12), solid(0xfff8ee, { roughness: 0.25 }), 0.34, 0.34 / F, 3.8, 0, 0.1, -0.2, horn);
    for (let i = 0; i < 6; i++) {
      const r = 0.33 * (1 - i * 0.15);
      put(ring(), bmat('#ffd54a'), r, r / F, r, 0, 0.1, -0.5 - i * 0.55, horn).rotation.x = 0.45;
    }
    len = 3.9;
  } else if (N.kind === 'trumpet') {
    /* trompeta: una campana dorada que se abre */
    const gold = M.keep(
      new THREE.MeshStandardMaterial({
        color: 0xffcf40,
        metalness: 0.5,
        roughness: 0.28,
        emissive: 0x4a3500,
        side: THREE.DoubleSide,
      }),
    );
    cap();
    put(
      lathe('trompeta', [
        [0.5, 0.3],
        [0.4, 1],
        [0.42, 2],
        [0.75, 2.9],
        [1.6, 3.5],
      ]),
      gold,
      1,
      1 / F,
      1,
    );
    for (const z of [-1.1, -1.5, -1.9]) put(tubeY(), gold, 0.12, 0.7, 0.12, 0, 0.6, z);
    len = 3.5;
  } else if (N.kind === 'trunk') {
    /* trompa de elefante: baja, se enrosca hacia arriba, y lleva dos colmillos */
    for (let i = 0; i <= 10; i++) {
      const t = i / 10,
        r = 0.95 - 0.6 * t,
        y = -1.7 * Math.sin(t * Math.PI * 0.85) + (t > 0.65 ? (t - 0.65) * 4 : 0);
      put(SPH, M.paint, r, r / F, r, 0, y / F, -t * 4.2);
    }
    for (const sx of [-1, 1])
      put(coneF(10), bmat('#fff8e0'), 0.17, 0.17 / F, 2.1, sx * 0.85, -0.2, -0.1).rotation.x = 0.18;
    len = 4.5;
  } else if (N.kind === 'dragon') {
    /* cabeza de dragón: hocico, mandíbula abierta con fuego, ojos encendidos, cuernos y colmillos */
    put(BOX, M.paint, 1.6, 1, 2.7, 0, 0.1, -1.4);
    put(BOX, M.body, 1.4, 0.3, 2.3, 0, -0.72, -1.3).rotation.x = -0.16;
    put(SPH, bmat('#ff8a1a', true, 0.7), 0.5, 0.22, 0.9, 0, -0.38, -1.9);
    for (const sx of [-1, 1]) {
      put(SPH, bmat('#ff3b1a'), 0.2, 0.2 / F, 0.2, sx * 0.62, 0.55, -1);
      put(SPH, bmat('#ff3b1a', true, 0.4), 0.45, 0.45 / F, 0.45, sx * 0.62, 0.55, -1);
      put(coneUp(), bmat('#fff8e0'), 0.2, 1.5, 0.2, sx * 0.55, 0.5, -0.3).rotation.x = 0.7;
      put(coneUp(), bmat('#ffffff'), 0.1, -0.4, 0.1, sx * 0.6, -0.38, -2.5);
      put(SPH, M.dark, 0.14, 0.14 / F, 0.14, sx * 0.4, 0.62, -2.6);
    }
    len = 2.9;
  }
  return { group, len, spin };
}

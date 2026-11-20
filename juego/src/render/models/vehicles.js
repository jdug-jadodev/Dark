/**
 * Naves únicas: vehículos enteros con su propio modelo (no se arman con piezas).
 * Aquí están el avión, el platillo y el patito; las demás, más detalladas, en vehiclesPro.js.
 * Cada uno se construye con figuras básicas y dice dónde están sus escapes y sus cañones.
 * "Adelante" es −z, x es hacia los lados e y hacia arriba; caben en unas 40 unidades de ancho y de largo.
 */
import { BOX, SPH, bmat, extrude, mirror } from '../kit.js';
import { coneF, coneUp, lathe, ring, tubeX, tubeY, tubeZ } from './nose.js';
import { buildPremium } from './vehiclesPro.js';

const GEO = {};
const geo = (key, make) => GEO[key] || (GEO[key] = make());

/**
 * V = la pieza (core/parts.js) · C = { g, add, keep, spin, anim, dark }
 * Devuelve { exits: [[x, y, z, tamaño]], gunX, gunY, gunZ }.
 */
export function buildVehicle(V, C) {
  /* las más trabajadas tienen su propio archivo */
  const pro = buildPremium(V, C);
  if (pro) return pro;
  const { add, keep, spin, anim, g } = C;
  const mat = (color, extra) =>
    keep(new THREE.MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.45, ...extra }));
  const group = (x, y, z, parent) => {
    const o = new THREE.Group();
    o.position.set(x || 0, y || 0, z || 0);
    (parent || g).add(o);
    return o;
  };
  const chrome = () => mat(0xdfe6f2, { metalness: 0.8, roughness: 0.2 });
  const glassy = (color) => mat(color, { metalness: 0.2, roughness: 0.08, emissive: 0x0f3a55 });
  const wheels = (list, r, w) => {
    const tire = mat(0x15161c, { roughness: 0.85 }),
      hub = chrome();
    for (const [x, y, z] of list) {
      add(tubeX(), tire, w, r, r, x, y, z);
      add(tubeX(), hub, w + 0.2, r * 0.45, r * 0.45, x, y, z);
    }
  };

  switch (V.kind) {
    /* ---------- avión de combate: gris, alas en delta, doble cola y misiles ---------- */
    case 'jet': {
      const gray = mat(0x8a93a8, { metalness: 0.5 }),
        dk = mat(0x4f586c, { metalness: 0.5 }),
        prof = [
          [0, -15],
          [2.6, -13],
          [3.4, -5],
          [3.5, 4],
          [2.6, 12],
          [1.2, 19],
          [0, 24],
        ];
      add(lathe('jet', prof), gray, 1, 0.85, 1);
      add(coneF(16), dk, 1.25, 1.05, 5.4, 0, 0, -18.6); // punta oscura
      add(
        geo('jetWing', () =>
          extrude(
            mirror([
              [3, -5],
              [20, 9],
              [20, 12],
              [3, 11],
            ]),
            1,
            0.4,
          ),
        ),
        gray,
        1,
        1,
        1,
        0,
        -0.5,
        0,
      );
      add(
        geo('jetTail', () =>
          extrude(
            mirror([
              [2, 11],
              [9.5, 16],
              [9.5, 18.5],
              [2, 17],
            ]),
            0.8,
            0.3,
          ),
        ),
        gray,
        1,
        1,
        1,
        0,
        0,
        0,
      );
      add(
        geo('jetCamo', () =>
          extrude(
            mirror([
              [6, 2],
              [14, 7],
              [14, 9],
              [6, 8],
            ]),
            1.1,
            0.2,
          ),
        ),
        dk,
        1,
        1,
        1,
        0,
        -0.45,
        0,
      );
      for (const sx of [-1, 1]) {
        const tail = add(BOX, gray, 0.6, 7.5, 6, sx * 2.8, 4.3, 12.5); // doble cola
        tail.rotation.set(0.22, 0, -sx * 0.3);
        add(BOX, dk, 2.6, 2.6, 9, sx * 4.3, -0.2, -1); // tomas de aire
        add(BOX, bmat('#05060c'), 2.2, 2.2, 0.3, sx * 4.3, -0.2, -5.6);
        for (const mx of [10, 15]) {
          add(tubeZ(), mat(0xf4f6fa), 0.55, 0.55, 8, sx * mx, -1.5, 6); // misiles
          add(coneF(10), bmat('#ff3b3b'), 0.55, 0.55, 1.8, sx * mx, -1.5, 2);
        }
        add(tubeZ(), dk, 2, 1.8, 4, sx * 2.2, 0, 14.5); // toberas
      }
      add(SPH, mat(0xffc46b, { metalness: 0.4, roughness: 0.05, emissive: 0x553a0f }), 2.2, 2, 6.4, 0, 2.5, -9);
      return {
        exits: [
          [-2.2, 0, 16.6, 0.8],
          [2.2, 0, 16.6, 0.8],
        ],
        gunX: 8,
        gunY: -0.2,
      };
    }

    /* ---------- platillo volador con su extraterrestre: luces que giran y rayo abajo ---------- */
    case 'ufo': {
      const silver = mat(0xc9d2e4, { metalness: 0.75, roughness: 0.22 }),
        alien = mat(0x7dff5e, { roughness: 0.6 });
      add(
        geo(
          'ufoDisc',
          () =>
            new THREE.LatheGeometry(
              [
                [0, -2.4],
                [7, -2.1],
                [15, -0.7],
                [17.5, 0],
                [15, 1],
                [8, 2.2],
                [0, 2.4],
              ].map((p) => new THREE.Vector2(p[0], p[1])),
              30,
            ),
        ),
        silver,
        1,
        1,
        1,
        0,
        0,
        0,
      );
      add(ring(), mat(0x4f586c, { metalness: 0.6 }), 10, 10, 6, 0, 1.7, 0).rotation.x = Math.PI / 2;
      /* el extraterrestre: cabezón, ojos negros enormes y antenas */
      add(SPH, alien, 2, 2.4, 1.6, 0, 3.4, 0);
      add(SPH, alien, 3, 3.4, 2.8, 0, 6.8, -0.2);
      for (const sx of [-1, 1]) {
        add(SPH, bmat('#05060c'), 1, 1.5, 0.6, sx * 1.25, 7, -2.5).rotation.z = sx * 0.5;
        add(BOX, alien, 0.22, 2.6, 0.22, sx * 1.4, 10.6, 0).rotation.z = -sx * 0.3;
        add(SPH, bmat('#ffe14a'), 0.5, 0.5, 0.5, sx * 1.8, 11.9, 0);
      }
      add(
        SPH,
        keep(new THREE.MeshStandardMaterial({ color: 0xbfe9ff, transparent: true, opacity: 0.32, roughness: 0.05 })),
        6.6,
        7.4,
        6.6,
        0,
        3,
        0,
      );
      /* luces de colores dando la vuelta */
      const lights = group(0, 0.2, 0),
        cols = ['#ff5a4a', '#ffd54a', '#6ef2a5', '#5ee0ff', '#c792ff', '#ff6bd0'];
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2;
        add(SPH, bmat(cols[i % 6]), 0.95, 0.95, 0.95, Math.sin(a) * 16.4, 0, Math.cos(a) * 16.4, lights);
      }
      spin.push({ o: lights, ax: 'y', v: 1.6 });
      add(SPH, bmat('#6ef2ff', true, 0.35), 7, 1.2, 7, 0, -2.8, 0); // rayo
      anim.push((now) => (lights.position.y = 0.2 + Math.sin(now * 3) * 0.15));
      return {
        exits: [
          [-5, -1.4, 15.5, 0.7],
          [5, -1.4, 15.5, 0.7],
        ],
        gunX: 10,
        gunY: 0.2,
      };
    }

    /* ---------- patito de hule: amarillo, con pico naranja, y se bambolea ---------- */
    case 'duck': {
      const yellow = mat(0xffd92e, { roughness: 0.3 }),
        orange = mat(0xff8a1a, { roughness: 0.35 });
      const all = group(0, 0, 0);
      add(SPH, yellow, 7.4, 5.6, 9.6, 0, 3, 2, all);
      add(coneF(10), yellow, 3.4, 2.4, 6, 0, 5.4, 9, all).rotation.set(0.7, Math.PI, 0); // la colita
      add(SPH, yellow, 4.8, 4.6, 4.8, 0, 10, -5, all);
      add(SPH, orange, 2.4, 1, 2.8, 0, 9.3, -9.8, all);
      add(SPH, orange, 2, 0.6, 2.2, 0, 8.3, -9.4, all);
      for (const sx of [-1, 1]) {
        add(SPH, bmat('#0a0a14'), 0.7, 0.9, 0.5, sx * 2.2, 11.4, -8.8, all);
        add(SPH, bmat('#ffffff'), 0.25, 0.25, 0.2, sx * 2.1, 11.8, -9.3, all);
        add(SPH, yellow, 1.4, 3.2, 5.4, sx * 6.9, 3.6, 3, all).rotation.x = 0.25; // alitas
      }
      anim.push((now) => {
        all.rotation.z = Math.sin(now * 3.2) * 0.1;
        all.position.y = Math.sin(now * 6.4) * 0.4;
      });
      return { exits: [[0, 1.4, 11.6, 0.9]], gunX: 9, gunY: 1.5 };
    }
  }
  return { exits: [[0, 0, 12, 1]], gunX: 9 };
}

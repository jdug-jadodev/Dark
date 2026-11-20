/**
 * Naves únicas con modelo detallado: carro clásico, carro de helados, tiburón, unicornio, dragón
 * y trineo de Papá Noel. Cada una se arma con muchas piezas pequeñas (siluetas estiradas, figuras
 * de revolución, tubos y esferas); al final ship.js junta las piezas quietas para que dibujarlas
 * no cueste. Lo que se mueve (patas, alas, cola) va en grupos aparte.
 *
 * "Adelante" es −z, x es hacia los lados e y hacia arriba.
 */
import { BOX, SPH, bmat, extrude, mirror } from '../kit.js';
import { coneF, coneUp, lathe, ring, tubeX, tubeY, tubeZ } from './nose.js';

const GEO = {};
const geo = (key, make) => GEO[key] || (GEO[key] = make());
/* silueta vista de lado [z, y] estirada a lo ancho, con los bordes redondeados */
const slab = (key, pts, width, bevel) =>
  geo('slab.' + key, () => {
    const s = new THREE.Shape();
    pts.forEach((p, i) => s[i ? 'lineTo' : 'moveTo'](p[0], p[1]));
    s.closePath();
    const depth = Math.max(0.01, width - 2 * bevel);
    const g = new THREE.ExtrudeGeometry(s, {
      depth,
      bevelEnabled: bevel > 0,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelOffset: -bevel, // el redondeo va hacia adentro: la silueta mide lo que dicen sus puntos
      bevelSegments: 3,
      curveSegments: 6,
    });
    g.translate(0, 0, -depth / 2);
    g.rotateY(-Math.PI / 2);
    return g;
  });
/* figura plana vista desde arriba [x, z], de un lado; el otro se copia en espejo */
const plate = (key, pts, thick, bevel) => geo('plate.' + key, () => extrude(mirror(pts), thick, bevel));
const half = (key, pts, thick, bevel) => geo('half.' + key, () => extrude(pts, thick, bevel));
/* arco de tubo (para rizos y sonrisas): de pie en el plano de lado, empezando desde abajo */
const curl = (key, R, tube, angle) =>
  geo('curl.' + key, () => new THREE.TorusGeometry(R, tube, 8, 20, angle).rotateZ(-Math.PI / 2).rotateY(Math.PI / 2));
const star = () =>
  geo('star', () => {
    const s = new THREE.Shape();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2,
        r = i % 2 ? 0.42 : 1;
      s[i ? 'lineTo' : 'moveTo'](Math.sin(a) * r, Math.cos(a) * r);
    }
    s.closePath();
    return new THREE.ExtrudeGeometry(s, { depth: 0.2, bevelEnabled: false }).rotateY(Math.PI / 2);
  });

/** Devuelve { exits, gunX, gunY, gunZ } o null si V no es una de estas naves. */
export function buildPremium(V, C) {
  const { add, keep, anim, g } = C;
  const mat = (color, extra) =>
    keep(new THREE.MeshStandardMaterial({ color, metalness: 0.25, roughness: 0.42, ...extra }));
  const group = (x, y, z, parent) => {
    const o = new THREE.Group();
    o.position.set(x || 0, y || 0, z || 0);
    (parent || g).add(o);
    return o;
  };
  /* una barra entre dos puntos del plano de arriba (huesos de ala, riendas…) */
  const bar = (material, x1, z1, x2, z2, y, thick, parent) => {
    const m = add(BOX, material, Math.hypot(x2 - x1, z2 - z1), thick, thick, (x1 + x2) / 2, y, (z1 + z2) / 2, parent);
    m.rotation.y = -Math.atan2(z2 - z1, x2 - x1);
    return m;
  };

  switch (V.kind) {
    /* =====================================================================================
       CARRO CLÁSICO DEL ESPACIO: dos tonos, aletas de cola con luces de cohete, cromo por todos
       lados, llantas de banda blanca y propulsores atrás.
       ===================================================================================== */
    case 'car': {
      const teal = mat(0x16c4b4, { metalness: 0.55, roughness: 0.22 }),
        cream = mat(0xfff6e4, { roughness: 0.32 }),
        cr = C.chrome(0xe8eef8),
        glass = mat(0x1a2a44, { metalness: 0.6, roughness: 0.08, emissive: 0x0a1a30 }),
        tire = mat(0x14151b, { roughness: 0.9 }),
        black = mat(0x14151b, { roughness: 0.6 });
      /* carrocería baja y larga, con la cola subiendo hacia las aletas */
      add(
        slab(
          'carBody',
          [
            [-20, 0.7],
            [-20.7, 2.4],
            [-19.6, 3.9],
            [-13, 4.6],
            [-5, 4.8],
            [7, 4.6],
            [14, 5],
            [20.2, 5.7],
            [20.8, 3.2],
            [19.8, 0.7],
          ],
          13.4,
          1.1,
        ),
        teal,
        1,
        1,
        1,
      );
      add(
        slab(
          'carSide',
          [
            [-17, 1.1],
            [-15.6, 3],
            [15.5, 3.4],
            [18.6, 1.1],
          ],
          13.75,
          0.3,
        ),
        cream,
        1,
        1,
        1,
      );
      for (const sx of [-1, 1]) {
        add(BOX, cr, 0.2, 0.3, 33, sx * 6.9, 3.55, -0.5); // moldura
        add(
          slab(
            'carFin',
            [
              [6.5, 4.7],
              [20.6, 8.6],
              [21.4, 7.6],
              [20.6, 4.9],
            ],
            1.4,
            0.4,
          ),
          teal,
          1,
          1,
          1,
          sx * 5.95,
          0,
          0,
        );
        add(BOX, cr, 0.25, 0.25, 14.6, sx * 6.3, 6.75, 13.8).rotation.x = -0.27; // filo cromado de la aleta
        /* luces de cohete en la punta de la aleta */
        add(ring(), cr, 1.05, 1.05, 2.4, sx * 5.95, 6.5, 20.9);
        add(coneF(12), bmat('#ff2a3a'), 0.85, 0.85, -1.8, sx * 5.95, 6.5, 21);
        add(SPH, bmat('#ff2a3a', true, 0.4), 1.8, 1.8, 1.8, sx * 5.95, 6.5, 22);
        /* faros dobles con aro cromado */
        for (const dx of [3.5, 5.6]) {
          add(ring(), cr, 0.95, 0.95, 1.6, sx * dx, 3.1, -20.5);
          add(SPH, bmat('#fff7d0'), 0.78, 0.78, 0.4, sx * dx, 3.1, -20.5);
        }
        add(SPH, bmat('#fff7d0', true, 0.22), 3, 2, 2.4, sx * 4.5, 3.1, -21.6);
        add(coneF(14), cr, 0.85, 0.85, 1.9, sx * 3.3, 1.3, -20.9); // "balas" del parachoques
        add(tubeZ(), cr, 1.35, 1.35, 4.2, sx * 3.6, 1.5, 20.4); // propulsores
        add(tubeZ(), black, 1.05, 1.05, 0.5, sx * 3.6, 1.5, 22.4);
      }
      /* cabina: vidrio oscuro todo alrededor, techo crema y marcos cromados */
      add(
        slab(
          'carGlass',
          [
            [-6.4, 4.6],
            [-2.6, 8],
            [6.8, 8.1],
            [11.2, 4.6],
          ],
          10.6,
          0.6,
        ),
        glass,
        1,
        1,
        1,
      );
      add(
        slab(
          'carRoof',
          [
            [-3.3, 7.8],
            [-2.5, 8.7],
            [6.6, 8.8],
            [7.8, 7.9],
          ],
          11,
          0.55,
        ),
        cream,
        1,
        1,
        1,
      );
      for (const sx of [-1, 1]) {
        add(BOX, cr, 0.3, 4.6, 0.45, sx * 5.2, 6.3, -4.45).rotation.x = -0.84; // parales
        add(BOX, cr, 0.3, 4.9, 0.45, sx * 5.2, 6.3, 8.95).rotation.x = 0.92;
        add(BOX, cr, 0.3, 3.3, 0.4, sx * 5.35, 6.3, 2);
      }
      add(BOX, cr, 10.6, 0.3, 0.3, 0, 8, -2.7);
      /* frente: parrilla de barras, capó con adorno */
      add(BOX, black, 6, 1.5, 0.5, 0, 1.9, -20.45);
      for (let i = -3; i <= 3; i++) add(BOX, cr, 0.3, 1.5, 0.6, i * 0.9, 1.9, -20.55);
      add(BOX, cr, 6.6, 0.3, 0.7, 0, 2.75, -20.5);
      add(tubeX(), cr, 14.2, 0.7, 0.7, 0, 1, -20.9);
      add(tubeX(), cr, 14.2, 0.7, 0.7, 0, 1.5, 21);
      add(BOX, cr, 0.25, 0.18, 12, 0, 4.9, -12.5);
      add(coneF(8), cr, 0.4, 0.3, 2.6, 0, 5.2, -15.4); // adorno del capó
      add(BOX, cream, 3.2, 1.3, 0.2, 0, 2.9, 20.95); // placa
      add(BOX, cr, 0.1, 5.4, 0.1, -5.2, 8, 12).rotation.x = 0.25; // antena
      add(SPH, bmat('#ff2a3a'), 0.3, 0.3, 0.3, -5.2, 10.6, 12.7);
      /* llantas de banda blanca con copa cromada */
      for (const [x, z] of [
        [-6.5, -12.5],
        [6.5, -12.5],
        [-6.5, 11.5],
        [6.5, 11.5],
      ]) {
        add(tubeX(), tire, 2.1, 2.95, 2.95, x, 0.3, z);
        add(tubeX(), cream, 2.2, 2.15, 2.15, x, 0.3, z);
        add(tubeX(), cr, 2.35, 1.25, 1.25, x, 0.3, z);
        add(tubeX(), black, 2.45, 0.35, 0.35, x, 0.3, z);
      }
      add(SPH, bmat('#5ee0ff', true, 0.25), 7.5, 0.6, 20, 0, -2.6, 0); // resplandor de flotar
      return {
        exits: [
          [-3.6, 1.5, 22.7, 0.62],
          [3.6, 1.5, 22.7, 0.62],
        ],
        gunX: 8.8,
        gunY: 1.2,
      };
    }

    /* =====================================================================================
       CARRO DE HELADOS: furgón crema y rosa con toldo de rayas, mostrador, luces de colores
       y un cono gigante de tres bolas con salsa, chispas y cereza.
       ===================================================================================== */
    case 'icecream': {
      const cream = mat(0xfff7ea, { roughness: 0.38 }),
        pink = mat(0xff7fbe, { roughness: 0.38 }),
        mint = mat(0x86efc0, { roughness: 0.4 }),
        vanilla = mat(0xfff0b4, { roughness: 0.5 }),
        choc = mat(0x6a3a1c, { roughness: 0.35 }),
        waffle = mat(0xdba45c, { roughness: 0.85 }),
        waffle2 = mat(0xb9803e, { roughness: 0.85 }),
        cr = C.chrome(0xe8eef8),
        glass = mat(0x1a2a44, { metalness: 0.6, roughness: 0.08, emissive: 0x0a1a30 }),
        dark = mat(0x2a2030),
        tire = mat(0x14151b, { roughness: 0.9 }),
        lights = ['#ff5a6e', '#ffd54a', '#6ef2a5', '#5ecbff', '#c792ff'];
      add(
        slab(
          'vanBody',
          [
            [-16, 0.9],
            [-16.9, 3.6],
            [-15.7, 6.5],
            [-12.7, 7.1],
            [-10.7, 11],
            [13.3, 11.2],
            [14.1, 10.3],
            [14.1, 0.9],
          ],
          12.4,
          1.2,
        ),
        cream,
        1,
        1,
        1,
      );
      add(
        slab(
          'vanSkirt',
          [
            [-16.7, 0.8],
            [-17.1, 3.1],
            [14.3, 3.1],
            [14.3, 0.8],
          ],
          12.75,
          0.5,
        ),
        pink,
        1,
        1,
        1,
      );
      add(BOX, mint, 12.8, 0.5, 30.7, 0, 3.5, -1.35);
      add(
        slab(
          'vanRoof',
          [
            [-10.9, 10.9],
            [-10.4, 11.6],
            [13.2, 11.8],
            [14.3, 11],
          ],
          12.8,
          0.4,
        ),
        pink,
        1,
        1,
        1,
      ); // alero del techo
      /* cabina: parabrisas inclinado y ventanas */
      add(BOX, glass, 10.2, 3.7, 0.4, 0, 9.15, -11.95).rotation.x = 0.48;
      add(BOX, cr, 10.9, 0.3, 0.5, 0, 7.05, -12.8);
      for (const sx of [-1, 1]) {
        add(BOX, glass, 0.3, 2.7, 3.2, sx * 6.25, 8.6, -8.4);
        add(BOX, cr, 0.4, 0.3, 3.6, sx * 6.28, 7.1, -8.4);
        /* faros redondos y luces de atrás */
        add(ring(), cr, 1.05, 1.05, 1.8, sx * 4.5, 4.7, -16.45);
        add(SPH, bmat('#fff7d0'), 0.88, 0.88, 0.4, sx * 4.5, 4.7, -16.4);
        add(SPH, bmat('#fff7d0', true, 0.22), 2.6, 2.2, 2, sx * 4.5, 4.7, -17.2);
        add(BOX, bmat('#ff2a3a'), 1.2, 2, 0.3, sx * 5, 4.4, 14.2);
        add(tubeZ(), cr, 1.25, 1.25, 3.4, sx * 3.6, 1.7, 14.2); // propulsores
        add(tubeZ(), dark, 0.95, 0.95, 0.5, sx * 3.6, 1.7, 15.8);
        /* luces de colores a lo largo del techo */
        for (let i = 0; i < 9; i++)
          add(SPH, bmat(lights[(i + (sx > 0 ? 2 : 0)) % 5]), 0.42, 0.42, 0.42, sx * 6.3, 11.25, -9.4 + i * 2.8);
      }
      add(
        geo('smile', () => new THREE.TorusGeometry(2.3, 0.26, 8, 20, Math.PI).rotateZ(Math.PI)),
        cr,
        0.8,
        0.8,
        0.8,
        0,
        4.2,
        -16.85,
      ); // parrilla que sonríe
      add(tubeX(), cr, 13.2, 0.65, 0.65, 0, 1.5, -17.2);
      add(tubeX(), cr, 13.2, 0.65, 0.65, 0, 1.5, 14.5);
      /* lado derecho: ventana de atender, mostrador y toldo de rayas con flecos */
      add(BOX, dark, 0.3, 4.6, 10.4, 6.25, 7.6, 3);
      add(BOX, cream, 1.9, 0.45, 11, 7, 5.2, 3);
      add(BOX, cr, 0.3, 0.3, 11, 7.9, 5.2, 3);
      for (let i = 0; i < 7; i++) {
        const z = -1.56 + i * 1.52,
          m = i % 2 ? cream : pink;
        add(BOX, m, 3.4, 0.32, 1.52, 7.6, 10.2, z).rotation.z = -0.55;
        add(SPH, m, 0.76, 0.55, 0.76, 9, 9.3, z);
      }
      /* lado izquierdo: letrero redondo con una paleta, y lunares */
      add(tubeX(), pink, 0.3, 3, 3, -6.25, 7.3, 3);
      add(tubeX(), cream, 0.34, 2.5, 2.5, -6.26, 7.3, 3);
      add(BOX, mint, 0.4, 2.6, 1.7, -6.3, 7.8, 3);
      add(tubeX(), mint, 0.4, 0.85, 0.85, -6.3, 9.1, 3);
      add(BOX, waffle, 0.4, 1.5, 0.4, -6.3, 5.9, 3);
      [
        [9, -3.5, '#ffd54a'],
        [5.2, -4.6, '#5ecbff'],
        [9.4, 9.6, '#c792ff'],
        [5.4, 10.6, '#6ef2a5'],
        [8.6, -7.2, '#ff5a6e'],
      ].forEach(([y, z, c]) => add(tubeX(), bmat(c), 0.3, 0.7, 0.7, -6.26, y, z));
      /* bocina en el techo de la cabina */
      add(coneF(14), cr, 1.4, 1.4, -2.6, -3.2, 12.6, -8.6);
      add(BOX, cr, 0.3, 1, 0.3, -3.2, 11.8, -7.6);
      /* el cono gigante */
      const top = group(0, 11.2, 2.5);
      top.scale.setScalar(0.72);
      add(coneUp(), waffle, 3.3, -8.4, 3.3, 0, 8.6, 0, top);
      for (let i = 1; i <= 4; i++) {
        const r = 3.3 * (i / 4.6);
        add(ring(), waffle2, r, r, 1.6, 0, 0.2 + (8.4 * i) / 4.6, 0, top).rotation.x = Math.PI / 2;
      }
      for (let i = 0; i < 6; i++)
        add(BOX, waffle2, 0.22, 8, 0.22, Math.sin(i * 1.047) * 1.75, 4.7, Math.cos(i * 1.047) * 1.75, top).rotation.set(
          Math.cos(i * 1.047) * 0.37,
          0,
          -Math.sin(i * 1.047) * 0.37,
        );
      add(SPH, pink, 3.8, 3.2, 3.8, 0, 10.1, 0, top);
      for (let i = 0; i < 7; i++)
        add(
          SPH,
          pink,
          0.9,
          1.1 + (i % 3) * 0.35,
          0.9,
          Math.sin(i * 0.9) * 3.3,
          8.6 - (i % 3) * 0.3,
          Math.cos(i * 0.9) * 3.3,
          top,
        ); // chorreado
      add(SPH, mint, 3.15, 2.8, 3.15, 0, 13.6, 0, top);
      add(SPH, vanilla, 2.55, 2.3, 2.55, 0, 16.5, 0, top);
      add(SPH, choc, 2.25, 1.15, 2.25, 0, 17.75, 0, top);
      for (let i = 0; i < 6; i++)
        add(
          SPH,
          choc,
          0.5,
          0.9 + (i % 2) * 0.5,
          0.5,
          Math.sin(i * 1.05) * 2.1,
          16.9 - (i % 2) * 0.4,
          Math.cos(i * 1.05) * 2.1,
          top,
        );
      add(SPH, bmat('#ff1a3a'), 0.95, 0.95, 0.95, 0, 19.3, 0, top); // cereza
      add(BOX, mat(0x3a7a2a), 0.12, 1.4, 0.12, 0.3, 20.5, 0, top).rotation.z = -0.4;
      add(tubeY(), waffle, 0.36, 4.4, 0.36, 1.7, 17.6, 0.6, top).rotation.z = -0.45; // barquillo
      lights.concat(['#ffffff', '#ff9a3c']).forEach((c, i) => {
        const a = i * 0.9;
        add(
          BOX,
          bmat(c),
          0.26,
          0.26,
          0.85,
          Math.sin(a) * 2.5,
          14.6 + (i % 3) * 0.5,
          Math.cos(a) * 2.5,
          top,
        ).rotation.set(i, a, 0);
      });
      /* llantas con copa rosa */
      for (const [x, z] of [
        [-6.3, -10.5],
        [6.3, -10.5],
        [-6.3, 8.5],
        [6.3, 8.5],
      ]) {
        add(tubeX(), tire, 1.9, 2.6, 2.6, x, 0.4, z);
        add(tubeX(), cream, 2, 1.8, 1.8, x, 0.4, z);
        add(tubeX(), pink, 2.1, 1.1, 1.1, x, 0.4, z);
      }
      return {
        exits: [
          [-3.6, 1.7, 16.1, 0.6],
          [3.6, 1.7, 16.1, 0.6],
        ],
        gunX: 8.4,
        gunY: 1.4,
      };
    }

    /* =====================================================================================
       TIBURÓN ESPACIAL: lomo azul y panza blanca, aletas de verdad, dos filas de dientes,
       agallas, cola que nada, y de toque espacial dos propulsores y un láser en el lomo.
       ===================================================================================== */
    case 'shark': {
      const blue = mat(0x4b7096, { roughness: 0.28, metalness: 0.2 }),
        deep = mat(0x2f4c68, { roughness: 0.4 }),
        white = mat(0xf4f7fb, { roughness: 0.4 }),
        cr = C.chrome(0xe8eef8),
        black = mat(0x14151b),
        prof = [
          [0, -21],
          [0.9, -20.4],
          [1.7, -17.5],
          [3.1, -13.5],
          [4.5, -8.5],
          [5.3, -3],
          [5.4, 3],
          [4.7, 9],
          [3.4, 13.5],
          [1.7, 16.6],
          [0, 17.8],
        ];
      add(lathe('sharkBody', prof), blue, 0.9, 1, 1);
      add(lathe('sharkBody', prof), white, 0.8, 0.84, 0.985, 0, -1.2, 0); // panza
      add(lathe('sharkBody', prof), deep, 0.62, 0.5, 0.9, 0, 3.05, 1); // lomo más oscuro
      /* aletas */
      add(
        slab(
          'sharkDorsal',
          [
            [-3.4, 0],
            [2.2, 9],
            [4.2, 8.8],
            [3.2, 3.6],
            [4.8, 0],
          ],
          0.9,
          0.3,
        ),
        blue,
        1,
        1,
        1,
        0,
        4.6,
        -0.5,
      );
      add(
        slab(
          'sharkDorsal',
          [
            [-3.4, 0],
            [2.2, 9],
            [4.2, 8.8],
            [3.2, 3.6],
            [4.8, 0],
          ],
          0.9,
          0.3,
        ),
        blue,
        0.6,
        0.32,
        0.36,
        0,
        2.5,
        13,
      );
      for (const sx of [-1, 1]) {
        add(
          half(
            'sharkPec',
            [
              [0, -3.4],
              [10.5, 5.6],
              [9.4, 7.6],
              [0, 2],
            ],
            0.8,
            0.3,
          ),
          blue,
          sx,
          1,
          1,
          sx * 3.9,
          -2.4,
          -4,
        ).rotation.z = -sx * 0.32;
        add(
          half(
            'sharkPel',
            [
              [0, -1.4],
              [4.2, 2.6],
              [3.6, 3.6],
              [0, 1.4],
            ],
            0.6,
            0.2,
          ),
          blue,
          sx,
          1,
          1,
          sx * 2.6,
          -3.2,
          9.5,
        ).rotation.z = -sx * 0.5;
        /* ojo con brillo y ceja */
        add(SPH, bmat('#0a0a14'), 0.66, 0.66, 0.42, sx * 3.02, 1.3, -12.3);
        add(SPH, bmat('#ffffff'), 0.2, 0.2, 0.14, sx * 3.12, 1.55, -12.62);
        add(BOX, deep, 0.5, 0.34, 2, sx * 3.05, 2.1, -12.2).rotation.x = -0.22;
        add(SPH, bmat('#0a0a14'), 0.16, 0.16, 0.16, sx * 1.1, 0.2, -17.1); // fosa de la nariz
        for (let k = 0; k < 4; k++)
          add(BOX, deep, 0.16, 3.2 - k * 0.2, 0.34, sx * (4.42 + k * 0.1), -0.3, -7.6 + k * 1.25).rotation.z =
            sx * 0.12; // agallas
        /* propulsores cromados bajo las aletas */
        add(tubeZ(), cr, 1.35, 1.35, 5.6, sx * 5.6, -3.2, 2.2);
        add(coneF(14), cr, 1.35, 1.35, 2.2, sx * 5.6, -3.2, -0.6);
        add(tubeZ(), black, 1.05, 1.05, 0.5, sx * 5.6, -3.2, 5);
      }
      /* boca abierta con dos filas de dientes */
      add(SPH, bmat('#7a0d1c'), 3.3, 1, 3.7, 0, -3.1, -11.7);
      add(SPH, bmat('#d8405a'), 1.7, 0.4, 2.2, 0, -3.5, -10.8); // lengua
      for (let i = 0; i < 9; i++) {
        const a = (i / 8 - 0.5) * 2.5;
        add(coneUp(), bmat('#ffffff'), 0.44, -1.35, 0.44, Math.sin(a) * 3.05, -2.45, -11.7 - Math.cos(a) * 3.2);
        add(coneUp(), bmat('#ffffff'), 0.34, 1, 0.34, Math.sin(a) * 2.75, -4.05, -11.5 - Math.cos(a) * 2.85);
      }
      /* láser amarrado al lomo */
      add(ring(), black, 4.6, 5.2, 4, 0, 0.1, -5.6);
      add(BOX, cr, 1.6, 1.2, 4.6, 0, 5.6, -5.6);
      add(tubeZ(), cr, 0.42, 0.42, 5.6, 0, 5.8, -10);
      add(ring(), cr, 0.62, 0.62, 1.6, 0, 5.8, -12.6);
      add(SPH, bmat('#ff2a3a'), 0.42, 0.42, 0.42, 0, 5.8, -12.9);
      add(SPH, bmat('#ff2a3a', true, 0.4), 1.1, 1.1, 1.1, 0, 5.8, -13);
      /* la cola: se mueve de lado a lado */
      const tail = group(0, 0, 19.6);
      add(
        slab(
          'sharkTail',
          [
            [-1.6, 1],
            [4.8, 10],
            [6.6, 9.7],
            [3.1, 1.3],
            [4.8, -6.6],
            [3.5, -6.8],
            [-1.6, -1],
          ],
          0.9,
          0.3,
        ),
        blue,
        1,
        1,
        1,
        0,
        0,
        0,
        tail,
      );
      anim.push((now) => (tail.rotation.y = Math.sin(now * 6) * 0.42));
      return {
        exits: [
          [-5.6, -3.2, 5.3, 0.62],
          [5.6, -3.2, 5.3, 0.62],
        ],
        gunX: 9.6,
        gunY: -1.6,
        gunZ: 2,
      };
    }

    /* =====================================================================================
       UNICORNIO: blanco perla, galopa con las patas articuladas, cuerno dorado en espiral,
       crin y cola de arcoíris que ondean, pestañas, mejillas y una estrella en el anca.
       ===================================================================================== */
    case 'unicorn': {
      const pearl = mat(0xffffff, { roughness: 0.26, metalness: 0.08, emissive: 0x2c2434 }),
        gold = C.chrome(0xffd24a),
        pink = mat(0xffa8cf, { roughness: 0.5 }),
        hues = ['#ff5a6e', '#ff9a3c', '#ffe14a', '#6ef2a5', '#5ecbff', '#b48cff'];
      const all = group(0, 3.6, 0);
      all.scale.setScalar(0.82);
      add(
        lathe('uniBody', [
          [0, -9.6],
          [3.5, -8.6],
          [4.6, -4.6],
          [4.1, 0.5],
          [4.6, 5],
          [3.7, 8],
          [0, 9.6],
        ]),
        pearl,
        1,
        1.02,
        1,
        0,
        0,
        0,
        all,
      );
      /* cuello arqueado: una sola pieza lisa, que nace ancha en el pecho */
      add(SPH, pearl, 3.3, 3.4, 3.4, 0, 1.6, -6.4, all);
      add(SPH, pearl, 2.25, 5.6, 2.75, 0, 5.6, -8.7, all).rotation.x = -0.42;
      /* cabeza */
      const head = group(0, 10.4, -11.2, all);
      add(SPH, pearl, 2.3, 2.4, 2.9, 0, 0, 0, head);
      add(SPH, pearl, 1.7, 1.6, 2.7, 0, -1, -2.8, head);
      add(SPH, pink, 1.3, 1.05, 1.05, 0, -1.3, -4.7, head); // hocico
      add(coneUp(), pearl, 0.85, 1.6, 1.2, 0, 1.6, 0.9, head).rotation.x = 0.5; // copete
      for (const sx of [-1, 1]) {
        add(SPH, bmat('#2a1a3a'), 0.16, 0.22, 0.12, sx * 0.5, -1.3, -5.6, head);
        add(SPH, bmat('#1a1026'), 0.52, 0.66, 0.3, sx * 1.78, 0.5, -1.5, head);
        add(SPH, bmat('#ffffff'), 0.17, 0.17, 0.12, sx * 1.9, 0.8, -1.72, head);
        for (let k = 0; k < 3; k++)
          add(BOX, bmat('#1a1026'), 0.08, 0.55, 0.08, sx * 1.95, 1.15 + k * 0.05, -1.75 + k * 0.32, head).rotation.set(
            -0.5 + k * 0.5,
            0,
            -sx * 0.7,
          ); // pestañas
        add(SPH, bmat('#ff8fc0', true, 0.5), 0.6, 0.45, 0.5, sx * 1.75, -0.7, -2.2, head); // mejilla
        add(coneUp(), pearl, 0.55, 1.9, 0.42, sx * 1.25, 1.7, 0.5, head).rotation.z = -sx * 0.25;
        add(coneUp(), pink, 0.3, 1.3, 0.2, sx * 1.25, 1.8, 0.32, head).rotation.z = -sx * 0.25;
        add(star(), gold, 1, 1.5, 1.5, sx * 4.42, 0.9, 5.4, all); // estrella en el anca
      }
      /* cuerno en espiral, con destello en la punta */
      const horn = group(0, 2, -1.7, head);
      horn.rotation.x = -0.62;
      add(coneUp(), gold, 0.52, 6.6, 0.52, 0, 0, 0, horn);
      for (let i = 0; i < 7; i++) {
        const r = 0.56 * (1 - i * 0.125);
        add(ring(), gold, r, r, 1.2, 0, 0.5 + i * 0.82, 0, horn).rotation.set(Math.PI / 2 + 0.35, 0, 0);
      }
      add(SPH, bmat('#ffffff', true, 0.7), 0.7, 0.7, 0.7, 0, 6.7, 0, horn);
      add(star(), bmat('#fff7d0', true, 0.8), 1, 1.1, 1.1, 0, 6.7, 0, horn);
      /* crin: mechones de colores que caen por el cuello y ondean */
      const mane = hues.concat(hues[0]).map((c, i) => {
        const lock = group(0, 11.6 - i * 1.25, -10.2 + i * 1.5, all);
        add(SPH, bmat(c), 1, 1.5, 1.5, 0, 0, 0, lock);
        add(SPH, bmat(c), 0.75, 1.9, 1.1, -1.5, -1.5, 0.3, lock);
        add(SPH, bmat(c), 0.5, 1.3, 0.8, -1.9, -3.1, 0.6, lock);
        return lock;
      });
      /* cola: seis hebras de colores */
      const tail = group(0, 2.4, 9.4, all);
      hues.forEach((c, i) => {
        for (let k = 0; k < 5; k++)
          add(
            SPH,
            bmat(c),
            1 - k * 0.14,
            1 - k * 0.14,
            1.5,
            (i - 2.5) * 0.5 * (1 + k * 0.35),
            -k * k * 0.32,
            0.8 + k * 1.9,
            tail,
          );
      });
      /* patas de dos tramos, con mechón y casco dorado */
      const legs = [
        [-2.3, -5.6],
        [2.3, -5.6],
        [-2.5, 6.6],
        [2.5, 6.6],
      ].map(([x, z]) => {
        const up = group(x, -1.2, z, all);
        add(SPH, pearl, 1.3, 2.7, 1.5, 0, -1.9, 0, up);
        const low = group(0, -4.2, 0, up);
        add(tubeY(), pearl, 0.62, 3.8, 0.62, 0, -1.8, 0, low);
        add(SPH, pearl, 0.72, 0.72, 0.72, 0, 0, 0, low);
        add(SPH, pearl, 0.95, 0.7, 0.95, 0, -3.5, 0, low);
        add(tubeY(), gold, 0.82, 1.1, 0.82, 0, -4.3, 0, low);
        return { up, low };
      });
      anim.push((now) => {
        const t = now * 9;
        legs.forEach((L, i) => {
          const ph = t + (i % 2 ? 2.2 : 0) + (i > 1 ? 1.2 : 0);
          L.up.rotation.x = Math.sin(ph) * 0.7;
          L.low.rotation.x = Math.max(0, -Math.sin(ph + 0.9)) * 1.15; // la rodilla dobla al recoger
        });
        all.position.y = 3.6 + Math.sin(t * 2) * 0.3;
        all.rotation.x = Math.sin(t) * 0.04;
        head.rotation.x = Math.sin(t + 1) * 0.07;
        tail.rotation.y = Math.sin(now * 4) * 0.35;
        mane.forEach((lock, i) => (lock.rotation.z = Math.sin(now * 5 - i * 0.6) * 0.22));
      });
      return { exits: [[0, 3.4, 9.4, 0.7]], gunX: 6.6, gunY: 3, gunZ: 1 };
    }

    /* =====================================================================================
       DRAGÓN ESPACIAL: cuerpo largo de escamas que ondula, panza dorada, espinas, cabeza con
       cuernos, mandíbula que se abre con dientes y fuego, alas con huesos que baten, patas con
       garras y cola en punta de flecha.
       ===================================================================================== */
    case 'dragon': {
      const greens = [0x3ccf62, 0x2fb85a, 0x26a056, 0x1f8a52].map((c) => mat(c, { roughness: 0.4 })),
        scale = mat(0x177048, { roughness: 0.5 }),
        belly = mat(0xecd47c, { roughness: 0.5 }),
        spine = mat(0xff5a2a, { roughness: 0.4, emissive: 0x4a1206 }),
        bone = mat(0xfff3d6, { roughness: 0.5 }),
        wingBone = mat(0x8a2018, { roughness: 0.5 }),
        membrane = keep(
          new THREE.MeshStandardMaterial({
            color: 0xe0452e,
            roughness: 0.6,
            emissive: 0x3a0c06,
            side: THREE.DoubleSide,
          }),
        );
      const N = 13,
        segs = [],
        rad = (i) => 4.3 - 0.27 * i,
        baseY = (i) => 2 + (i < 3 ? (3 - i) * 1.25 : 0);
      for (let i = 0; i < N; i++) {
        const o = group(0, baseY(i), -8.5 + i * 2.45),
          r = rad(i);
        add(SPH, greens[Math.min(3, i >> 2)], r, r * 0.92, 2.15, 0, 0, 0, o);
        add(SPH, belly, r * 0.8, r * 0.6, 2.05, 0, -r * 0.44, 0, o);
        add(
          slab(
            'dragSpike',
            [
              [-1, 0],
              [0.5, 2.4],
              [1, 0],
            ],
            0.55,
            0.14,
          ),
          spine,
          1,
          1.55 - i * 0.07,
          1,
          0,
          r * 0.82,
          0,
          o,
        );
        for (const sx of [-1, 1]) add(SPH, scale, 0.5, 0.95, 0.95, sx * r * 0.88, r * 0.18, 0, o);
        segs.push(o);
      }
      add(
        plate(
          'dragTip',
          [
            [0, -1],
            [2.8, 2.2],
            [1, 1.7],
            [0, 5.4],
          ],
          0.5,
          0.15,
        ),
        spine,
        1,
        1,
        1,
        0,
        0,
        1.4,
        segs[N - 1],
      ); // punta de flecha
      /* patas con garras, recogidas bajo el cuerpo */
      for (const i of [3, 8])
        for (const sx of [-1, 1]) {
          const r = rad(i),
            leg = group(sx * r * 0.8, -r * 0.5, 0, segs[i]);
          add(SPH, greens[2], 1.25, 1.9, 1.7, 0, -0.6, 0, leg);
          add(tubeY(), greens[3], 0.6, 2.2, 0.6, 0, -2.3, -0.5, leg).rotation.x = -0.5;
          add(SPH, greens[3], 0.9, 0.5, 1.2, 0, -3.3, -1.5, leg);
          for (const c of [-0.5, 0, 0.5]) add(coneF(8), bone, 0.2, 0.2, 1, c, -3.4, -2.4, leg);
        }
      /* alas: brazo, tres dedos de hueso y la membrana entre ellos */
      const wingPts = [
        [0, -3],
        [9, -9],
        [19, -10.5],
        [24, -5.5],
        [19.5, -2],
        [22, 3.5],
        [15.5, 3],
        [16.5, 8.5],
        [9.5, 5.5],
        [8, 10],
        [0, 6],
      ];
      const wings = [-1, 1].map((sx) => {
        const pivot = group(sx * 2.4, 2.6, 0, segs[3]),
          flip = group(0, 0, 0, pivot);
        flip.scale.x = sx;
        add(half('dragWing', wingPts, 0.22, 0.08), membrane, 1, 1, 1, 0, 0, 0, flip);
        bar(wingBone, 0, -1, 9, -8.4, 0.25, 0.75, flip);
        bar(wingBone, 9, -8.4, 24, -5.6, 0.25, 0.55, flip);
        bar(wingBone, 9, -8.4, 22, 3.4, 0.25, 0.45, flip);
        bar(wingBone, 9, -8.4, 16.4, 8.3, 0.25, 0.45, flip);
        bar(wingBone, 4.5, -4.8, 8, 9.8, 0.25, 0.4, flip);
        add(coneUp(), bone, 0.35, 1.6, 0.35, 9, 0.4, -8.6, flip); // garra del codo
        return pivot;
      });
      /* cabeza */
      const head = group(0, 0.4, -3.6, segs[0]);
      add(SPH, greens[0], 3.3, 2.9, 3.5, 0, 0, 0, head);
      add(
        slab(
          'dragSnout',
          [
            [-8.2, -0.5],
            [-8.6, 0.7],
            [-6.4, 1.9],
            [-1, 2.5],
            [0.5, 2.4],
            [0.5, -0.9],
          ],
          3.9,
          0.6,
        ),
        greens[0],
        1,
        1,
        1,
        0,
        0,
        0,
        head,
      );
      add(BOX, scale, 1, 0.5, 5.4, 0, 2.5, -4, head); // cresta del hocico
      for (const sx of [-1, 1]) {
        add(SPH, scale, 0.62, 0.55, 0.7, sx * 1.15, 1.75, -7.4, head); // fosas, con brasa adentro
        add(SPH, bmat('#ff8a1a'), 0.26, 0.2, 0.3, sx * 1.15, 1.9, -7.9, head);
        add(BOX, scale, 1.7, 0.75, 2.8, sx * 1.9, 2.25, -1.7, head).rotation.set(0.1, 0, -sx * 0.35); // ceja
        add(SPH, bmat('#ffe14a'), 0.68, 0.6, 0.5, sx * 2.5, 1.25, -2.4, head);
        add(SPH, bmat('#ffe14a', true, 0.4), 1.3, 1.2, 1, sx * 2.6, 1.25, -2.5, head);
        add(BOX, bmat('#0a0a14'), 0.14, 0.95, 0.3, sx * 2.9, 1.25, -2.62, head).rotation.y = sx * 0.5; // pupila rasgada
        add(coneUp(), bone, 0.62, 5.8, 0.62, sx * 1.6, 2, 1.4, head).rotation.set(1.05, 0, -sx * 0.18); // cuernos
        add(coneUp(), bone, 0.4, 2.8, 0.4, sx * 2.6, 0.9, 1.3, head).rotation.set(1.25, 0, -sx * 0.5);
        add(
          slab(
            'dragSpike',
            [
              [-1, 0],
              [0.5, 2.4],
              [1, 0],
            ],
            0.55,
            0.14,
          ),
          spine,
          1,
          1.5,
          1.9,
          sx * 3.05,
          -0.6,
          1.4,
          head,
        ).rotation.z = -sx * 1.15; // aleta de la mejilla
        for (let k = 0; k < 5; k++)
          add(coneUp(), bone, 0.26, -(0.95 - k * 0.08), 0.26, sx * 1.55, -0.4, -7.4 + k * 1.25, head); // dientes de arriba
      }
      const jaw = group(0, -0.9, 0, head);
      add(
        slab(
          'dragJaw',
          [
            [-7.6, -0.3],
            [-7.9, 0.4],
            [0.3, 0.5],
            [0.3, -1.1],
            [-5.4, -1.1],
          ],
          3.3,
          0.5,
        ),
        belly,
        1,
        1,
        1,
        0,
        0,
        0,
        jaw,
      );
      add(BOX, bmat('#d8203a'), 1.1, 0.22, 5, 0, 0.62, -4, jaw); // lengua bífida
      for (const sx of [-1, 1]) {
        add(BOX, bmat('#d8203a'), 0.4, 0.2, 1.4, sx * 0.4, 0.62, -7, jaw).rotation.y = -sx * 0.3;
        for (let k = 0; k < 4; k++) add(coneUp(), bone, 0.22, 0.75, 0.22, sx * 1.3, 0.45, -6.8 + k * 1.4, jaw);
      }
      const fire = add(SPH, bmat('#ff8a1a', true, 0.75), 1.2, 0.55, 2.4, 0, -0.1, -4.2, head);
      fire.userData.live = true;
      anim.push((now) => {
        segs.forEach((o, i) => {
          o.position.x = Math.sin(now * 2.4 - i * 0.5) * (0.25 + i * 0.22);
          o.position.y = baseY(i) + Math.sin(now * 4.2 - i * 0.6) * (0.3 + i * 0.07);
        });
        const flap = 0.2 + 0.42 * Math.sin(now * 7);
        wings[0].rotation.z = -flap;
        wings[1].rotation.z = flap;
        head.rotation.y = Math.sin(now * 2.2) * 0.14;
        jaw.rotation.x = 0.13 + 0.11 * Math.sin(now * 3.3);
        fire.scale.z = 2.4 * (0.75 + 0.3 * Math.sin(now * 17));
      });
      return { exits: [[0, 2, 23.6, 0.85]], gunX: 7.6, gunY: 2 };
    }

    /* =====================================================================================
       TRINEO DE PAPÁ NOEL: trineo rojo de frente curvo con patines y adornos dorados, Papá
       Noel con barba, cinturón y gorro, el saco con regalos y un bastón de dulce, un farol, y
       dos renos con cornamenta y arnés de cascabeles (el de adelante, de nariz roja).
       ===================================================================================== */
    case 'sleigh': {
      const red = mat(0xd3202a, { roughness: 0.3, metalness: 0.2 }),
        wine = mat(0x8f1219, { roughness: 0.5 }),
        gold = C.chrome(0xffd24a),
        white = mat(0xffffff, { roughness: 0.85 }),
        green = mat(0x1f8a4a, { roughness: 0.6 }),
        brown = mat(0x8a5a2a, { roughness: 0.75 }),
        tan = mat(0xc99a66, { roughness: 0.75 }),
        dark = mat(0x4a2e16, { roughness: 0.7 }),
        skin = mat(0xffc9a0, { roughness: 0.6 }),
        black = mat(0x15161c, { roughness: 0.5 });
      /* el trineo */
      add(
        slab(
          'sleigh',
          [
            [-3.6, 1],
            [-6.4, 2.4],
            [-7.8, 5.2],
            [-7.2, 8],
            [-5.6, 9],
            [-4.6, 8.2],
            [-5.4, 6.4],
            [-4, 4.6],
            [2, 4.2],
            [8, 5],
            [11, 8.6],
            [12.6, 9.6],
            [14, 9.2],
            [14.6, 2],
            [13, 1],
          ],
          10.2,
          0.9,
        ),
        red,
        1,
        1,
        1,
        0,
        0,
        1,
      );
      add(BOX, wine, 8.4, 0.6, 12, 0, 4.4, 5.6);
      add(BOX, green, 8.2, 1.5, 4.6, 0, 5.2, 9.4); // cojín
      add(BOX, green, 8.2, 3.8, 1, 0, 7.6, 12.2).rotation.x = 0.28;
      for (const sx of [-1, 1]) {
        add(tubeZ(), gold, 0.32, 0.32, 17.5, sx * 5.12, 1.2, 6.6); // ribete
        add(curl('scrollA', 1.7, 0.27, Math.PI * 1.55), gold, 1, 1, 1, sx * 5.2, 4.2, 5.6); // volutas doradas
        add(curl('scrollB', 1, 0.22, Math.PI * 1.55), gold, 1, -1, 1, sx * 5.2, 6.6, 9.4);
        add(star(), gold, sx, 1.1, 1.1, sx * 5.2, 3.4, 11);
        /* patín con rizo adelante y tirantes */
        add(tubeZ(), gold, 0.4, 0.4, 23, sx * 4.8, -1.5, 5.5);
        add(curl('runner', 2.7, 0.4, Math.PI * 1.35), gold, 1, 1, 1, sx * 4.8, 1.2, -6);
        add(SPH, gold, 0.62, 0.62, 0.62, sx * 4.8, 2.45, -3.6);
        add(BOX, gold, 0.36, 2.6, 0.36, sx * 4.8, -0.2, 1.2);
        add(BOX, gold, 0.36, 2.6, 0.36, sx * 4.8, -0.2, 12);
      }
      /* farol y acebo en el frente */
      add(BOX, gold, 0.2, 3, 0.2, 4.2, 9.8, -4);
      add(SPH, bmat('#ffe9a0'), 0.75, 0.9, 0.75, 4.2, 11.6, -4);
      add(SPH, bmat('#ffd54a', true, 0.35), 1.9, 1.9, 1.9, 4.2, 11.6, -4);
      for (const [x, r] of [
        [-1.3, 0.5],
        [1.3, -0.5],
      ])
        add(SPH, green, 1.5, 0.3, 0.8, x, 9.3, -4.4).rotation.z = r;
      for (const x of [-0.4, 0.2, 0]) add(SPH, bmat('#ff2a3a'), 0.42, 0.42, 0.42, x, 9.5 + Math.abs(x), -4.6 - x);
      /* Papá Noel */
      const s = group(0, 5.6, 9);
      add(SPH, red, 3, 3.4, 2.8, 0, 2.2, 0, s);
      add(SPH, white, 0.6, 3, 0.5, 0, 2.2, -2.62, s); // piel del abrigo
      add(ring(), white, 2.9, 2.9, 3.4, 0, 0.3, 0, s).rotation.x = Math.PI / 2;
      add(ring(), black, 2.98, 2.98, 3.6, 0, 1.7, 0, s).rotation.x = Math.PI / 2;
      add(BOX, gold, 1.3, 1.2, 0.3, 0, 1.7, -3, s); // hebilla
      add(BOX, black, 0.7, 0.6, 0.34, 0, 1.7, -3.02, s);
      for (const sx of [-1, 1]) {
        add(tubeZ(), red, 0.9, 0.9, 3.8, sx * 2.7, 3.1, -1.9, s).rotation.set(0.3, -sx * 0.2, 0); // brazos al frente
        add(ring(), white, 0.9, 0.9, 2.6, sx * 2.35, 2.55, -3.7, s);
        add(SPH, green, 0.85, 0.85, 0.95, sx * 2.3, 2.4, -4.3, s);
        add(SPH, bmat('#ff9a9a', true, 0.6), 0.5, 0.4, 0.3, sx * 1, 6.2, -1.75, s); // cachetes
        add(SPH, bmat('#15161c'), 0.2, 0.26, 0.14, sx * 0.62, 6.75, -1.78, s);
        add(SPH, white, 0.55, 0.22, 0.2, sx * 0.62, 7.15, -1.72, s); // cejas
        add(SPH, white, 0.85, 0.42, 0.5, sx * 0.72, 5.75, -1.95, s); // bigote
        add(SPH, white, 1.1, 1.3, 0.9, sx * 1.35, 5, -1, s); // patillas
      }
      add(SPH, skin, 1.8, 1.8, 1.8, 0, 6.5, -0.2, s);
      add(SPH, mat(0xff9a8a), 0.42, 0.4, 0.42, 0, 6.3, -2.02, s); // nariz
      add(SPH, white, 1.9, 1.9, 1.2, 0, 5.2, -1.3, s); // barba
      add(SPH, white, 1.35, 1.6, 1, 0, 4, -1.7, s);
      add(SPH, white, 0.8, 1, 0.7, 0, 3, -2.1, s);
      add(ring(), white, 1.85, 1.85, 3.2, 0, 7.75, -0.2, s).rotation.x = Math.PI / 2; // borde del gorro
      const hat = group(0, 7.8, -0.2, s);
      hat.rotation.x = 0.55;
      add(coneUp(), red, 1.75, 4, 1.75, 0, 0, 0, hat);
      add(SPH, white, 0.75, 0.75, 0.75, 0, 4.1, 0, hat);
      /* el saco, los regalos y un bastón de dulce */
      add(SPH, brown, 3.5, 4.1, 3.3, 0, 7.8, 13.4);
      add(SPH, brown, 2.4, 2.4, 2.4, -1.6, 6.4, 14.6);
      add(SPH, brown, 2.4, 2.2, 2.4, 1.8, 6.6, 14.4);
      add(ring(), dark, 1.9, 1.9, 2.6, 0, 10.9, 13.4).rotation.x = Math.PI / 2;
      const gift = (x, y, z, k, color, turn) => {
        const o = group(x, y, z);
        o.rotation.set(0.2, turn, 0.15);
        add(BOX, mat(color, { roughness: 0.4 }), k, k, k, 0, 0, 0, o);
        add(BOX, gold, k * 1.04, k * 1.04, k * 0.22, 0, 0, 0, o);
        add(BOX, gold, k * 0.22, k * 1.04, k * 1.04, 0, 0, 0, o);
        for (const sx of [-1, 1]) add(SPH, gold, k * 0.26, k * 0.18, k * 0.16, sx * k * 0.24, k * 0.6, 0, o);
      };
      gift(-1.7, 11.9, 12.8, 2.3, 0x2a9a4a, 0.4);
      gift(1.6, 11.7, 13.9, 2, 0x2a6ae0, -0.3);
      gift(0.2, 13.4, 13.2, 1.6, 0xffffff, 0.8);
      add(tubeY(), white, 0.3, 4, 0.3, 2.9, 12.2, 12.2).rotation.z = -0.3;
      add(
        geo('cane', () => new THREE.TorusGeometry(0.75, 0.3, 8, 16, Math.PI)),
        bmat('#ff2a3a'),
        1,
        1,
        1,
        4.2,
        14,
        12.2,
      ).rotation.z = -0.3;
      for (let k = 0; k < 3; k++)
        add(tubeY(), bmat('#ff2a3a'), 0.33, 0.5, 0.33, 2.56 + k * 0.3, 11.1 + k * 1, 12.2).rotation.z = -0.3;
      /* los renos */
      const legs = [],
        deers = [];
      [-1, 1].forEach((sx, n) => {
        const d = group(sx * 3.1, 3.6, -13.5),
          lead = !n;
        add(
          lathe('deerBody', [
            [0, -4.8],
            [1.8, -4],
            [2.2, -1],
            [1.95, 1.6],
            [2.3, 3.4],
            [1.6, 4.9],
            [0, 5.5],
          ]),
          brown,
          1,
          1.05,
          1,
          0,
          0,
          0,
          d,
        );
        add(SPH, tan, 1.4, 1.5, 1, 0, -0.5, -4.5, d);
        add(SPH, brown, 1.15, 2.5, 1.3, 0, 2.3, -4.7, d).rotation.x = -0.5; // cuello
        add(SPH, white, 0.55, 0.6, 0.5, 0, 1, 5.3, d); // colita
        add(ring(), red, 1.55, 1.55, 3, 0, 1.4, -4.2, d).rotation.x = 1.05; // collar con cascabeles
        for (const bx of [-1, 0, 1])
          add(SPH, gold, 0.34, 0.34, 0.34, bx * 0.9, 0.3 - Math.abs(bx) * 0.25, -5.35 + Math.abs(bx) * 0.3, d);
        const head = group(0, 4.6, -6, d);
        add(SPH, brown, 1.2, 1.25, 1.55, 0, 0, 0, head);
        add(SPH, tan, 0.82, 0.78, 1.25, 0, -0.38, -1.55, head);
        add(SPH, lead ? bmat('#ff2a3a') : bmat('#15161c'), 0.44, 0.4, 0.4, 0, -0.2, -2.7, head);
        if (lead) add(SPH, bmat('#ff2a3a', true, 0.5), 1.25, 1.25, 1.25, 0, -0.2, -2.8, head);
        for (const ax of [-1, 1]) {
          add(SPH, bmat('#15161c'), 0.2, 0.26, 0.16, ax * 0.9, 0.35, -1.05, head);
          add(coneUp(), brown, 0.36, 1.1, 0.26, ax * 1, 0.7, 0.5, head).rotation.z = -ax * 0.95; // oreja
          /* cornamenta con tres puntas */
          const antler = group(ax * 0.55, 1, 0.3, head);
          antler.rotation.z = -ax * 0.42;
          add(tubeY(), tan, 0.17, 3.4, 0.17, 0, 1.7, 0, antler);
          add(tubeY(), tan, 0.14, 1.6, 0.14, ax * 0.5, 1.9, 0, antler).rotation.z = -ax * 0.9;
          add(tubeY(), tan, 0.14, 1.4, 0.14, -ax * 0.35, 2.9, 0, antler).rotation.z = ax * 0.7;
          add(tubeY(), tan, 0.12, 1.2, 0.12, 0, 2.4, -0.45, antler).rotation.x = -0.9;
        }
        for (const [lx, lz] of [
          [-1.1, -3],
          [1.1, -3],
          [-1.1, 3.4],
          [1.1, 3.4],
        ]) {
          const up = group(lx, -1.5, lz, d);
          add(tubeY(), brown, 0.44, 2.8, 0.44, 0, -1.3, 0, up);
          const low = group(0, -2.7, 0, up);
          add(tubeY(), brown, 0.31, 2.8, 0.31, 0, -1.3, 0, low);
          add(tubeY(), dark, 0.4, 0.55, 0.4, 0, -2.9, 0, low);
          legs.push({ up, low });
        }
        /* rienda dorada hasta las manos de Papá Noel */
        add(BOX, gold, 0.14, 0.14, 21.6, sx * 2.7, 7.3, -6.2).rotation.set(-0.085, sx * 0.02, 0);
        deers.push(d);
      });
      anim.push((now) => {
        const t = now * 10;
        legs.forEach((L, i) => {
          const ph = t + i * 1.6;
          L.up.rotation.x = Math.sin(ph) * 0.7;
          L.low.rotation.x = Math.max(0, -Math.sin(ph + 0.9)) * 1.1;
        });
        deers.forEach((d, i) => (d.position.y = 3.6 + Math.sin(t * 0.5 + i * 1.5) * 0.4));
        s.rotation.z = Math.sin(now * 2.5) * 0.04;
      });
      return {
        exits: [
          [-3, 1.2, 16.8, 0.55],
          [3, 1.2, 16.8, 0.55],
        ],
        gunX: 8.8,
        gunY: 2,
        gunZ: 8,
      };
    }
  }
  return null;
}

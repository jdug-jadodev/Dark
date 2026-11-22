/**
 * Los jefes de los mundos. Cada uno es una criatura o una nave distinta, con su forma de moverse:
 *
 *   colossus  → Coloso de Escarcha: un gigante de hielo con dos puños que flotan
 *   ashlord   → Señor de la Ceniza: un dragón de magma que bate las alas y abre las fauces
 *   titan     → Titán de la Tormenta: una cabeza de piedra con musgo, rodeada de rocas y gas
 *   guardian  → Guardián de Neón: una nave patrulla enorme, con sirena y cañones
 *   devourer  → Devorador del Horizonte: una boca en la oscuridad, con tentáculos
 *
 * Todos devuelven un grupo con userData = { lit, tick(b, now), dispose() }:
 *   lit  = [material, brillo normal] de lo que se pone blanco cuando recibe un disparo
 *   tick = lo mueve cada cuadro (b = el jefe de la partida)
 * Miran hacia +Z (hacia la nave del jugador). Miden más o menos 120 de ancho.
 */
import { vrand } from '../core/util.js';
import { BOX, SPH, bmat } from './kit.js';
import { cone, lump } from './worldKit.js';

let GEO;
function geo() {
  if (GEO) return GEO;
  const wing = new THREE.Shape();
  wing.moveTo(0, 0);
  wing.lineTo(58, 26);
  wing.lineTo(78, -2);
  wing.lineTo(56, -8);
  wing.lineTo(46, -24);
  wing.lineTo(30, -12);
  wing.lineTo(16, -26);
  wing.lineTo(6, -10);
  wing.closePath();
  const barrel = new THREE.CylinderGeometry(1, 1, 1, 8);
  barrel.rotateX(Math.PI / 2); // a lo largo de Z
  return (GEO = {
    rock: [0, 1, 2, 3].map(() => lump(1, 0.92)),
    spike: cone(1, 1, 5),
    wing: new THREE.ShapeGeometry(wing),
    ring: new THREE.TorusGeometry(1, 0.05, 6, 32),
    hoop: new THREE.TorusGeometry(1, 0.02, 5, 28),
    barrel,
  });
}
/* lo común a todos: el grupo, los materiales que parpadean al recibir un golpe y cómo agregar piezas */
function rig() {
  const g = new THREE.Group(),
    lit = [];
  return {
    g,
    lit,
    mat(color, em, extra) {
      const m = new THREE.MeshStandardMaterial({
        color,
        emissive: em || 0,
        roughness: 0.6,
        metalness: 0.2,
        flatShading: true,
        ...extra,
      });
      lit.push([m, em || 0]);
      return m;
    },
    add(geo, mat, s, x, y, z, parent) {
      const p = new THREE.Mesh(geo, mat);
      p.scale.set(s[0], s[1], s[2]);
      p.position.set(x || 0, y || 0, z || 0);
      (parent || g).add(p);
      return p;
    },
    group(x, y, z, parent) {
      const p = new THREE.Group();
      p.position.set(x, y, z);
      (parent || g).add(p);
      return p;
    },
    done(tick) {
      g.userData = {
        lit,
        tick,
        dispose() {
          for (const [m] of lit) m.dispose();
        },
      };
      return g;
    },
  };
}
const sway = (g, now, b) =>
  g.rotation.set(0.1, Math.sin(now * 0.7) * 0.08 + (b.tx - b.x) * -0.002, Math.sin(now * 0.9) * 0.05);

/* ---------- Coloso de Escarcha ---------- */
function colossus() {
  const R = rig(),
    K = geo(),
    ice = R.mat(0xe2f5ff, 0x2f7fb8, { roughness: 0.22, metalness: 0.15 }),
    deep = R.mat(0x3f7fb8, 0x0e3560, { roughness: 0.4 }),
    white = bmat('#ffffff'),
    glow = bmat('#9ff0ff');
  /* el cuerpo: un témpano ancho, el pecho y la cintura que termina en puntas */
  R.add(K.rock[0], deep, [40, 26, 26], 0, 12, 0);
  R.add(K.rock[1], ice, [30, 20, 22], 0, 30, 5);
  for (let i = 0; i < 5; i++) {
    const p = R.add(K.spike, deep, [7, 18 + vrand() * 10, 7], (i - 2) * 13, -4, 2);
    p.rotation.x = Math.PI; // cuelgan
  }
  const core = R.add(SPH, glow, [8, 8, 8], 0, 22, 24),
    halo = R.add(SPH, bmat('#9ff0ff', true, 0.35), [14, 14, 14], 0, 22, 24);
  /* la cabeza, con los ojos encendidos y una corona de hielo */
  const head = R.group(0, 52, 10);
  R.add(K.rock[2], ice, [15, 13, 14], 0, 0, 0, head);
  R.add(K.rock[3], deep, [11, 5, 9], 0, -8, 6, head); // la mandíbula
  for (const sx of [-1, 1]) {
    R.add(SPH, white, [3.4, 1.8, 2], sx * 6, 2, 12, head);
    R.add(SPH, bmat('#9ff0ff', true, 0.5), [6, 4, 4], sx * 6, 2, 12, head);
  }
  for (let i = 0; i < 5; i++) {
    const p = R.add(K.spike, ice, [3.2, 14 + (2 - Math.abs(i - 2)) * 6, 3.2], (i - 2) * 6, 9, -1, head);
    p.rotation.z = (i - 2) * -0.22;
  }
  /* hombros con cristales y dos puños que flotan a los lados */
  const fists = [];
  for (const sx of [-1, 1]) {
    R.add(K.rock[1], deep, [17, 14, 16], sx * 44, 34, 0);
    for (let i = 0; i < 3; i++) {
      const p = R.add(K.spike, ice, [4.5, 18 + i * 6, 4.5], sx * (38 + i * 7), 42, -2 + i * 2);
      p.rotation.z = sx * -(0.25 + i * 0.25);
    }
    const f = R.group(sx * 64, 6, 26);
    R.add(K.rock[2], ice, [15, 15, 17], 0, 0, 0, f);
    R.add(K.rock[0], deep, [10, 9, 10], sx * -4, 12, -6, f);
    for (let i = 0; i < 3; i++) {
      const p = R.add(K.spike, ice, [3, 9, 3], (i - 1) * 7, 2, 15, f);
      p.rotation.x = Math.PI / 2; // nudillos de hielo, hacia el frente
    }
    fists.push(f);
  }
  return R.done((b, now) => {
    sway(R.g, now, b);
    const hit = b.atk ? 1 : 0; // cuando ataca, adelanta los puños
    fists.forEach((f, i) => {
      f.position.y = 6 + Math.sin(now * 2 + i * Math.PI) * 7;
      f.position.z += (26 + hit * 22 - f.position.z) * 0.15;
      f.rotation.z = Math.sin(now * 1.3 + i) * 0.2;
    });
    head.rotation.y = Math.sin(now * 0.9) * 0.25;
    const pulse = 1 + Math.sin(now * 5) * 0.14;
    core.scale.setScalar(8 * pulse);
    halo.scale.setScalar(14 * pulse);
  });
}

/* ---------- Señor de la Ceniza ---------- */
function ashlord() {
  const R = rig(),
    K = geo(),
    rock = R.mat(0x2a1510, 0x3a0a02, { roughness: 1 }),
    crust = R.mat(0x4a1c10, 0x7a1e06, { roughness: 0.9 }),
    skin = R.mat(0x7a1408, 0x5a0c02, { roughness: 0.8, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }),
    hot = bmat('#ffb02a'),
    lava = bmat('#ff6a14');
  /* el cuerpo y el cuello, que suben hacia atrás; por el lomo, púas encendidas */
  R.add(K.rock[0], rock, [30, 22, 26], 0, 14, -8);
  R.add(K.rock[1], crust, [22, 16, 20], 0, 22, 8);
  R.add(SPH, lava, [9, 9, 6], 0, 12, 18); // el pecho, al rojo
  const chest = R.add(SPH, bmat('#ff6a14', true, 0.4), [16, 16, 12], 0, 12, 18);
  for (let i = 0; i < 4; i++) R.add(K.spike, lava, [3, 12 - i * 2, 3], 0, 34 - i * 2, -4 - i * 9);
  /* la cabeza: cráneo, hocico, cuernos, ojos, y la mandíbula que se abre */
  const head = R.group(0, 34, 26);
  R.add(K.rock[2], crust, [15, 12, 15], 0, 0, 0, head);
  R.add(K.rock[3], rock, [9, 7, 13], 0, -1, 16, head);
  for (const sx of [-1, 1]) {
    const horn = R.add(K.spike, rock, [3.6, 26, 3.6], sx * 10, 7, -4, head);
    horn.rotation.set(-0.7, 0, sx * -0.5);
    R.add(SPH, bmat('#fff0a0'), [2.6, 1.6, 2], sx * 6.5, 3, 13, head);
    R.add(SPH, bmat('#ffb02a', true, 0.5), [5, 3.4, 4], sx * 6.5, 3, 13, head);
    R.add(K.spike, hot, [1.2, 5, 1.2], sx * 4, -6, 25, head).rotation.x = Math.PI; // colmillos
  }
  const jaw = R.group(0, -6, 6, head);
  R.add(K.rock[1], rock, [8, 3, 12], 0, 0, 10, jaw);
  const fire = R.add(SPH, hot, [5, 4, 7], 0, -4, 16, head),
    breath = R.add(SPH, bmat('#ff8a14', true, 0.45), [9, 7, 13], 0, -4, 20, head);
  /* las alas: tres dedos de roca y la membrana entre ellos */
  const wings = [];
  for (const sx of [-1, 1]) {
    const w = R.group(sx * 16, 30, -8);
    const inner = new THREE.Group();
    inner.scale.x = sx;
    inner.rotation.x = -0.55; // echadas hacia atrás, para que se vean desde arriba
    w.add(inner);
    R.add(K.wing, skin, [1, 1, 1], 0, 0, 0, inner);
    for (const [len, rot] of [
      [64, -1.15],
      [78, -1.6],
      [60, -2.05],
    ])
      R.add(K.spike, rock, [2.2, len, 2.2], 0, 0, 0.5, inner).rotation.z = rot;
    wings.push(w);
  }
  /* la cola */
  for (let i = 0; i < 4; i++)
    R.add(K.rock[i], i % 2 ? rock : crust, [12 - i * 2.4, 9 - i * 1.6, 12], 0, 10 + i * 5, -30 - i * 14);
  return R.done((b, now) => {
    sway(R.g, now, b);
    const flap = Math.sin(now * 3.2);
    wings.forEach((w, i) => (w.rotation.z = (i ? -1 : 1) * (0.1 + flap * 0.28)));
    R.g.position.y += flap * 2.5; // sube y baja con el aleteo
    const open = b.atk ? 0.55 : 0.12 + 0.08 * Math.sin(now * 2);
    jaw.rotation.x += (open - jaw.rotation.x) * 0.2;
    head.rotation.y = Math.sin(now * 0.8) * 0.3;
    head.rotation.x = Math.sin(now * 1.1) * 0.08;
    const heat = 1 + Math.sin(now * 8) * 0.18;
    fire.scale.set(5 * heat, 4 * heat, 7 * heat * (b.atk ? 1.6 : 1));
    breath.scale.set(9 * heat, 7 * heat, 13 * heat * (b.atk ? 1.8 : 1));
    chest.scale.setScalar(16 * (1 + Math.sin(now * 4) * 0.1));
    chest.scale.z = 12;
  });
}

/* ---------- Titán de la Tormenta ---------- */
function titan() {
  const R = rig(),
    K = geo(),
    stone = R.mat(0x6b4a2a, 0x140c04, { roughness: 1 }),
    dark = R.mat(0x33210f, 0x0a0602, { roughness: 1 }),
    moss = R.mat(0x5f9a2a, 0x2c5a08, { roughness: 0.9 }),
    eye = bmat('#d4ff6a'),
    gasM = new THREE.MeshBasicMaterial({ color: 0xa6f04a, transparent: true, opacity: 0.22, depthWrite: false });
  /* una cabeza de piedra enorme: frente, pómulos, quijada, y musgo en la coronilla */
  R.add(K.rock[0], stone, [42, 32, 30], 0, 22, 0);
  R.add(K.rock[1], dark, [36, 10, 14], 0, 36, 20); // el ceño
  R.add(K.rock[2], moss, [34, 9, 26], 0, 48, -2);
  R.add(K.rock[3], moss, [14, 6, 12], -22, 42, 8);
  for (const sx of [-1, 1]) {
    R.add(K.rock[2], stone, [14, 14, 14], sx * 30, 12, 16);
    const tusk = R.add(K.spike, dark, [6, 30, 6], sx * 26, -2, 24);
    tusk.rotation.set(1.9, 0, sx * 0.35); // colmillos de piedra, hacia el frente
    R.add(K.spike, stone, [7, 22, 7], sx * 26, 50, -8).rotation.z = sx * -0.35; // chimeneas
  }
  /* tres ojos de gas encendido y la boca, una grieta que brilla */
  const eyes = [];
  for (const [x, y, s] of [
    [-15, 28, 5],
    [15, 28, 5],
    [0, 39, 3.6],
  ]) {
    eyes.push(R.add(SPH, eye, [s, s * 0.75, 2.5], x, y, 27));
    R.add(SPH, bmat('#b6ff5a', true, 0.45), [s * 2, s * 1.5, 4], x, y, 27);
  }
  const jaw = R.group(0, 6, 8);
  R.add(K.rock[1], dark, [28, 9, 20], 0, 0, 8, jaw);
  for (let i = 0; i < 5; i++) R.add(K.spike, stone, [3, 8, 3], (i - 2) * 9, 6, 22, jaw);
  const mouth = R.add(SPH, bmat('#9dff4a'), [18, 5, 6], 0, 13, 24),
    mglow = R.add(SPH, bmat('#b6ff5a', true, 0.4), [26, 10, 10], 0, 13, 26);
  /* rocas que giran a su alrededor y el gas que lo envuelve */
  const orbit = [],
    puffs = [];
  for (let i = 0; i < 8; i++) {
    const s = 6 + vrand() * 6;
    orbit.push([
      R.add(K.rock[i % 4], i % 3 ? stone : moss, [s, s * 0.8, s], 0, 0, 0),
      (i / 8) * 6.28,
      62 + vrand() * 14,
    ]);
  }
  for (let i = 0; i < 7; i++)
    puffs.push([R.add(SPH, gasM, [20, 12, 20], 0, 0, 0), vrand() * 6.28, 30 + vrand() * 40, vrand()]);
  return R.done((b, now) => {
    sway(R.g, now, b);
    R.g.position.y += Math.sin(now * 1.2) * 3;
    for (const [m, a0, r] of orbit) {
      const a = a0 + now * 0.9;
      m.position.set(Math.cos(a) * r, 18 + Math.sin(a * 2 + a0) * 10, Math.sin(a) * r * 0.55);
      m.rotation.set(a, a * 1.3, 0);
    }
    for (const [m, a0, r, ph] of puffs) {
      const a = a0 + now * 0.25;
      m.position.set(Math.cos(a) * r, -4 + Math.sin(now * 0.8 + ph * 9) * 6 + ph * 20, Math.sin(a) * r * 0.6 + 6);
      m.scale.setScalar(16 + 6 * Math.sin(now * 1.1 + ph * 20));
    }
    const open = b.atk ? 9 : 2 + Math.sin(now * 1.6) * 1.5;
    jaw.position.y += (6 - open - jaw.position.y) * 0.15;
    mouth.scale.y = 3 + (6 - jaw.position.y) * 0.9;
    mglow.scale.y = 8 + (6 - jaw.position.y) * 1.2;
    const blink = 0.75 + 0.25 * Math.sin(now * 6);
    eyes.forEach((e, i) => e.scale.set((i < 2 ? 5 : 3.6) * blink, (i < 2 ? 3.8 : 2.7) * blink, 2.5));
  });
}

/* ---------- Guardián de Neón ---------- */
function guardian() {
  const R = rig(),
    K = geo(),
    hull = R.mat(0x1a2148, 0x05081a, { roughness: 0.35, metalness: 0.7, flatShading: false }),
    plate = R.mat(0x2c3670, 0x080c26, { roughness: 0.3, metalness: 0.75, flatShading: false }),
    black = R.mat(0x0a0c1c, 0, { roughness: 0.5, metalness: 0.6 }),
    pink = bmat('#ff4fc8'),
    cyan = bmat('#5ee0ff'),
    red = new THREE.MeshBasicMaterial({ color: 0xff2a3c }),
    blue = new THREE.MeshBasicMaterial({ color: 0x2a6cff });
  /* el casco: ancho y bajo, con una cabina encima y la proa en cuña */
  R.add(BOX, hull, [88, 14, 40], 0, 12, 0);
  R.add(BOX, plate, [56, 10, 28], 0, 24, -2);
  R.add(BOX, hull, [34, 8, 16], 0, 32, -6);
  const prow = R.add(K.spike, plate, [30, 30, 8], 0, 12, 20);
  prow.rotation.x = Math.PI / 2;
  /* el visor: una franja oscura con un ojo que barre de lado a lado */
  R.add(BOX, black, [46, 6, 2], 0, 25, 12.5);
  const visor = R.add(BOX, cyan, [9, 3.4, 1.2], 0, 25, 14),
    vglow = R.add(SPH, bmat('#5ee0ff', true, 0.5), [9, 5, 3], 0, 25, 14);
  /* neón por los bordes */
  for (const sx of [-1, 1]) {
    R.add(BOX, pink, [1.4, 1.4, 40], sx * 44.5, 19.5, 0);
    R.add(BOX, cyan, [1.2, 1.2, 28], sx * 28.5, 29.5, -2);
    R.add(BOX, pink, [30, 1.2, 1.2], sx * 28, 5.4, 20.5);
  }
  R.add(BOX, cyan, [88, 1.2, 1.2], 0, 19.5, -20.5);
  /* la sirena: roja y azul, por turnos */
  R.add(BOX, black, [40, 2, 7], 0, 37, -6);
  const sirenR = R.add(BOX, red, [17, 4, 6], -10.5, 40, -6),
    sirenB = R.add(BOX, blue, [17, 4, 6], 10.5, 40, -6),
    flashR = R.add(SPH, bmat('#ff2a3c', true, 0.5), [22, 12, 14], -10.5, 41, -6),
    flashB = R.add(SPH, bmat('#2a6cff', true, 0.5), [22, 12, 14], 10.5, 41, -6);
  /* dos brazos con cañones dobles y la boca de fuego encendida */
  const arms = [];
  for (const sx of [-1, 1]) {
    const a = R.group(sx * 60, 10, 4);
    R.add(BOX, plate, [16, 16, 44], 0, 0, 0, a);
    R.add(BOX, hull, [10, 6, 20], sx * -10, 2, -6, a); // el brazo que lo une al casco
    R.add(BOX, pink, [16.4, 1.2, 44.4], 0, 5, 0, a);
    for (const dx of [-4, 4]) {
      R.add(K.barrel, black, [2.6, 2.6, 22], dx, -2, 30, a);
      R.add(SPH, bmat('#ff4fc8', true, 0.7), [3.4, 3.4, 3.4], dx, -2, 42, a);
    }
    arms.push(a);
  }
  /* motores por debajo y dos aletas */
  const jets = [];
  for (const x of [-30, -10, 10, 30]) jets.push(R.add(SPH, bmat('#5ee0ff', true, 0.6), [6, 9, 6], x, 2, -14));
  for (const sx of [-1, 1]) R.add(BOX, plate, [2, 18, 14], sx * 22, 38, -16).rotation.z = sx * -0.3;
  return R.done((b, now) => {
    sway(R.g, now, b);
    const turn = Math.floor(now * 5) % 2;
    sirenR.visible = flashR.visible = !turn;
    sirenB.visible = flashB.visible = !!turn;
    visor.position.x = vglow.position.x = Math.sin(now * 2.4) * 17;
    arms.forEach((a, i) => {
      a.position.y = 10 + Math.sin(now * 1.8 + i * 2) * 3;
      a.rotation.y = (i ? -1 : 1) * (b.atk ? 0.22 : 0.05); // apunta hacia el centro cuando ataca
    });
    jets.forEach((j, i) => (j.scale.y = 9 + Math.sin(now * 20 + i) * 2.5));
  });
}

/* ---------- Devorador del Horizonte ---------- */
function devourer() {
  const R = rig(),
    K = geo(),
    flesh = R.mat(0x1c0a30, 0x2a0a4a, { roughness: 0.5, metalness: 0.3, flatShading: false }),
    hide = R.mat(0x0c0418, 0x14042a, { roughness: 0.7 }),
    tip = bmat('#ff8a3c'),
    tooth = R.mat(0xf0e0ff, 0x6a3aa0, { roughness: 0.3 });
  /* el cuerpo: una masa oscura con bultos, y el anillo de luz que lo rodea */
  R.add(SPH, flesh, [38, 32, 30], 0, 18, 0);
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * 6.28;
    R.add(K.rock[i % 4], hide, [13, 11, 12], Math.cos(a) * 30, 20 + Math.sin(a) * 24, -8);
  }
  const ring = R.add(K.ring, bmat('#ff8a3c'), [58, 58, 58], 0, 18, -6),
    ring2 = R.add(K.hoop, bmat('#ffd9a0'), [66, 66, 66], 0, 18, -6);
  /* la boca: un pozo negro con el fondo morado y una corona de dientes */
  const maw = R.group(0, 14, 26);
  R.add(SPH, bmat('#000000'), [17, 17, 5], 0, 0, 0, maw);
  const throat = R.add(SPH, bmat('#b46cff', true, 0.6), [9, 9, 3], 0, 0, 3, maw);
  R.add(K.ring, bmat('#c792ff'), [18, 18, 26], 0, 0, 2, maw);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * 6.28,
      t = R.add(K.spike, tooth, [2.2, 8, 2.2], Math.cos(a) * 16, Math.sin(a) * 16, 5, maw);
    t.rotation.z = a + Math.PI / 2; // apuntan al centro
  }
  /* ojos sueltos alrededor de la boca */
  const eyes = [];
  for (const [x, y, s] of [
    [-20, 36, 4],
    [-8, 41, 2.6],
    [6, 42, 3.2],
    [21, 35, 4.4],
    [30, 24, 2.4],
    [-30, 22, 2.8],
  ]) {
    eyes.push(R.add(SPH, bmat('#ffd9a0'), [s, s, 2], x, y, 22));
    R.add(SPH, bmat('#ff8a3c', true, 0.45), [s * 2, s * 2, 3], x, y, 22);
  }
  /* los tentáculos: cadenas de bolas que se van afinando y ondulan */
  const N = 9,
    arms = [];
  for (let j = 0; j < 8; j++) {
    const segs = [];
    for (let i = 0; i < N; i++) segs.push(R.add(SPH, i === N - 1 ? tip : i % 2 ? flesh : hide, [1, 1, 1], 0, 0, 0));
    arms.push({ segs, a: Math.PI - 0.4 + (j / 7) * (Math.PI + 0.8), ph: vrand() * 6.28 }); // por los lados y por abajo
  }
  /* aros que se cierran hacia la boca cuando traga */
  const suck = [0, 1, 2, 3].map(() => R.add(K.hoop, bmat('#c792ff', true, 0.6), [1, 1, 1], 0, 14, 30));
  return R.done((b, now) => {
    sway(R.g, now, b);
    const pull = b.pull || 0;
    ring.rotation.set(1.2 + Math.sin(now * 0.7) * 0.2, now * 0.8, 0);
    ring2.rotation.set(1.35, -now * 0.5, 0.3);
    const gape = 1 + pull * 0.7 + Math.sin(now * 3) * 0.06;
    maw.scale.set(gape, gape, 1);
    throat.scale.setScalar(9 * (1 + 0.25 * Math.sin(now * 7)));
    throat.scale.z = 3;
    for (const a of arms) {
      const reach = 0.5 + 0.5 * Math.sin(now * 1.1 + a.ph) + pull * 0.8 + (b.atk && b.atk.k === 'tentacle' ? 0.9 : 0);
      a.segs.forEach((s, i) => {
        const t = i / (N - 1),
          ang = a.a + Math.sin(now * 1.7 + a.ph + t * 3.2) * 0.42 * t,
          r = 30 + t * 74;
        s.position.set(Math.cos(ang) * r, 16 + Math.sin(ang) * r * 0.5, -6 + t * t * 44 * reach);
        s.scale.setScalar(10 - 6.8 * t);
      });
    }
    eyes.forEach((e, i) => (e.scale.y = e.scale.x * (Math.sin(now * 0.9 + i * 2.1) > 0.94 ? 0.15 : 1))); // parpadean
    suck.forEach((s, i) => {
      const k = (now * 0.9 + i / suck.length) % 1; // de lejos (0) a la boca (1)
      s.visible = pull > 0.05;
      s.position.z = 30 + (1 - k) * 330;
      s.position.y = 14 - (1 - k) * 22;
      s.scale.setScalar(14 + (1 - k) * 70);
    });
  });
}

const FORMS = { colossus, ashlord, titan, guardian, devourer };
/* cuánto se agranda cada uno (están lejos, al fondo de la pista) y cuánto se sube para que no se hunda */
const SIZE = { colossus: 1.7, ashlord: 1.7, titan: 1.75, guardian: 1.6, devourer: 2 };
export function mkWorldBoss(b) {
  const g = (FORMS[b.form] || devourer)(),
    k = SIZE[b.form] || 1.6;
  g.scale.setScalar(k);
  g.userData.lift = 22 * (k - 1);
  return g;
}

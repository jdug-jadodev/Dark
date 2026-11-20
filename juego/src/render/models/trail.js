/**
 * Estela de luz: una cinta que sale de un motor y queda atrás como un camino. Guarda por dónde
 * pasó la nave y dibuja una franja que se va angostando y apagando.
 */
const MAX = 44; // puntos de la cinta, como mucho
const LIFE = 0.55; // segundos que dura un punto (por el largo de la pieza)

/* T = { cols: colores de la cabeza a la cola, o 'rainbow' · w = ancho · len = largo
         solid: true = colores planos que se desvanecen (banderas), en vez de luz que se suma }
   exit = boca del motor · band = una franja de bandera { dx: corrimiento, w: parte del ancho, col } */
export function makeTrail(T, exit, band) {
  const pos = new Float32Array(MAX * 2 * 3),
    col = new Float32Array(MAX * 2 * 4),
    index = [];
  for (let i = 0; i < MAX - 1; i++) {
    const a = i * 2;
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 4));
  geometry.setIndex(index);
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: T.solid ? THREE.NormalBlending : THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.DoubleSide,
    fog: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  const dispose = () => {
    if (mesh.parent) mesh.parent.remove(mesh);
    geometry.dispose();
    material.dispose();
  };
  mesh.userData.dispose = dispose;

  const full = 2.1 * (T.w || 1) * exit.k, // medio ancho de toda la estela
    cols = band
      ? [new THREE.Color(band.col), new THREE.Color(band.col)]
      : T.cols === 'rainbow'
        ? null
        : T.cols.map((c) => new THREE.Color(c)),
    life = LIFE * (T.len || 1),
    half = band ? full * band.w : full,
    shift = band ? band.dx * full * 2 : 0,
    pts = [], // del más nuevo al más viejo: { x, y, z, age }
    head = new THREE.Vector3(),
    c = new THREE.Color();

  /* matrix = dónde está la nave · speed = qué tan rápido queda atrás el camino · on = la nave se ve */
  function update(matrix, dt, speed, now, on) {
    for (const p of pts) {
      p.z += speed * dt;
      p.age += dt;
    }
    while (pts.length && pts[pts.length - 1].age > life) pts.pop();
    if (on && dt > 0) {
      head.set(exit.x, exit.y, exit.z).applyMatrix4(matrix);
      pts.unshift({ x: head.x, y: head.y, z: head.z, age: 0 });
      if (pts.length > MAX) pts.pop();
    }
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i],
        k = p.age / life, // 0 en la nave … 1 en la cola
        taper = T.solid ? 1 - 0.25 * k : 1 - 0.65 * k, // las banderas casi no se angostan
        w = half * taper,
        cx = p.x + shift * taper,
        fade = (1 - k) * (1 - k);
      if (cols) {
        /* de un color al siguiente a lo largo de la cinta */
        const f = k * (cols.length - 1),
          j = Math.min(cols.length - 2, Math.floor(f));
        c.copy(cols[j]).lerp(cols[j + 1], f - j);
      } else c.setHSL((k * 0.9 + now * 0.5) % 1, 1, 0.55);
      for (const side of [0, 1]) {
        const o = (i * 2 + side) * 3,
          q = (i * 2 + side) * 4,
          lit = T.solid ? 1 : fade; // la luz se apaga oscureciéndose; lo plano, volviéndose transparente
        pos[o] = cx + (side ? w : -w);
        pos[o + 1] = p.y;
        pos[o + 2] = p.z;
        col[q] = c.r * lit;
        col[q + 1] = c.g * lit;
        col[q + 2] = c.b * lit;
        col[q + 3] = T.solid ? Math.sqrt(fade) : 1;
      }
    }
    geometry.setDrawRange(0, Math.max(0, pts.length - 1) * 6);
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }
  return { mesh, update, dispose };
}

/* ---------- camino de figuras: estrellas, corazones, notas… que la nave va soltando ---------- */
/* cada figura se dibuja una vez, en blanco, y después se tiñe del color que toque */
const SHAPES = {};
/* Elfo navideño dibujado a mano (el emoji de elfo es uno de fantasía, no de Navidad):
   gorro verde con banda roja y cascabel, orejas puntudas, traje verde con cinturón y medias de rayas. */
function drawElf(g) {
  const fill = (color, draw) => {
    g.beginPath();
    draw();
    g.fillStyle = color;
    g.fill();
    g.stroke();
  };
  const poly = (color, pts) =>
    fill(color, () => {
      pts.forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p[0], p[1]));
      g.closePath();
    });
  const dot = (color, x, y, r) => fill(color, () => g.arc(x, y, r, 0, Math.PI * 2));
  g.lineJoin = 'round';
  g.lineWidth = 2;
  g.strokeStyle = '#14301c';
  /* medias de rayas y zapatos de punta */
  for (const x of [37, 51]) {
    poly('#ffffff', [
      [x, 70],
      [x + 8, 70],
      [x + 8, 84],
      [x, 84],
    ]);
    g.fillStyle = '#e02a34';
    g.fillRect(x + 1, 73, 6, 3);
    g.fillRect(x + 1, 79, 6, 3);
  }
  poly('#1f9a4a', [
    [33, 84],
    [46, 84],
    [46, 90],
    [30, 90],
    [26, 86],
  ]);
  poly('#1f9a4a', [
    [50, 84],
    [63, 84],
    [70, 86],
    [66, 90],
    [50, 90],
  ]);
  /* brazos y manos */
  poly('#27b257', [
    [36, 50],
    [24, 60],
    [28, 65],
    [38, 58],
  ]);
  poly('#27b257', [
    [60, 50],
    [72, 60],
    [68, 65],
    [58, 58],
  ]);
  dot('#ffcf9f', 24, 63, 4);
  dot('#ffcf9f', 72, 63, 4);
  /* traje con cinturón y cuello de picos */
  poly('#27b257', [
    [36, 46],
    [60, 46],
    [66, 72],
    [30, 72],
  ]);
  poly('#e02a34', [
    [32, 61],
    [64, 61],
    [65, 67],
    [31, 67],
  ]);
  poly('#ffd54a', [
    [44, 60],
    [52, 60],
    [52, 68],
    [44, 68],
  ]);
  poly('#e02a34', [
    [36, 46],
    [41, 53],
    [45, 47],
    [48, 54],
    [51, 47],
    [55, 53],
    [60, 46],
  ]);
  /* orejas puntudas, cara, cachetes, ojos y sonrisa */
  poly('#ffcf9f', [
    [35, 30],
    [21, 23],
    [34, 40],
  ]);
  poly('#ffcf9f', [
    [61, 30],
    [75, 23],
    [62, 40],
  ]);
  dot('#ffcf9f', 48, 34, 14);
  g.fillStyle = '#ff9a9a';
  g.beginPath();
  g.arc(39, 38, 3.4, 0, Math.PI * 2);
  g.arc(57, 38, 3.4, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#14301c';
  g.beginPath();
  g.arc(43, 32, 2, 0, Math.PI * 2);
  g.arc(53, 32, 2, 0, Math.PI * 2);
  g.fill();
  g.beginPath();
  g.arc(48, 37, 5.5, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
  /* gorro verde doblado, con banda roja y cascabel dorado */
  poly('#1f9a4a', [
    [34, 25],
    [62, 25],
    [66, 8],
    [72, 4],
    [58, 6],
  ]);
  poly('#e02a34', [
    [32, 22],
    [64, 22],
    [65, 28],
    [31, 28],
  ]);
  dot('#ffd54a', 72, 5, 4.2);
}
const ART = { elf: drawElf };
/* una figura a todo color: un dibujo propio (ART) o, si no, el emoji del teléfono (una vaca…) */
function iconTexture(icon) {
  const key = 'icon:' + icon;
  if (SHAPES[key]) return SHAPES[key];
  const c = document.createElement('canvas');
  c.width = c.height = 96;
  const g = c.getContext('2d');
  if (ART[icon]) ART[icon](g);
  else {
    g.font = '70px sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(icon, 48, 52);
  }
  return (SHAPES[key] = new THREE.CanvasTexture(c));
}
function shapeTexture(kind) {
  if (SHAPES[kind]) return SHAPES[kind];
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = g.strokeStyle = '#fff';
  g.lineCap = g.lineJoin = 'round';
  g.translate(32, 32);
  const star = (points, outer, inner) => {
    g.beginPath();
    for (let i = 0; i < points * 2; i++) {
      const a = (i / (points * 2)) * Math.PI * 2,
        r = i % 2 ? inner : outer;
      g[i ? 'lineTo' : 'moveTo'](Math.sin(a) * r, -Math.cos(a) * r);
    }
    g.closePath();
    g.fill();
  };
  if (kind === 'heart') {
    g.beginPath();
    g.moveTo(0, 24);
    g.bezierCurveTo(-40, -4, -22, -34, 0, -12);
    g.bezierCurveTo(22, -34, 40, -4, 0, 24);
    g.fill();
  } else if (kind === 'star') star(5, 28, 12);
  else if (kind === 'spark') star(4, 29, 6);
  else if (kind === 'note') {
    /* una corchea: la bolita, el palo y la banderita */
    g.beginPath();
    g.ellipse(-7, 17, 11, 8, -0.4, 0, Math.PI * 2);
    g.fill();
    g.lineWidth = 5;
    g.beginPath();
    g.moveTo(2, 15);
    g.lineTo(2, -24);
    g.quadraticCurveTo(20, -18, 16, -2);
    g.stroke();
  } else if (kind === 'snow') {
    /* copo: tres palos cruzados con puntas */
    g.lineWidth = 5;
    for (let i = 0; i < 3; i++) {
      g.rotate(Math.PI / 3);
      g.beginPath();
      g.moveTo(0, -26);
      g.lineTo(0, 26);
      for (const s of [-1, 1]) {
        g.moveTo(-7, s * 20);
        g.lineTo(0, s * 13);
        g.lineTo(7, s * 20);
      }
      g.stroke();
    }
  } else if (kind === 'bubble') {
    g.lineWidth = 5;
    g.beginPath();
    g.arc(0, 0, 24, 0, Math.PI * 2);
    g.stroke();
    g.beginPath();
    g.arc(-9, -9, 5, 0, Math.PI * 2);
    g.fill();
  } else if (kind === 'bolt') {
    g.beginPath();
    [
      [8, -29],
      [-14, 4],
      [-1, 4],
      [-9, 29],
      [15, -6],
      [2, -6],
    ].forEach((p, i) => g[i ? 'lineTo' : 'moveTo'](p[0], p[1]));
    g.closePath();
    g.fill();
  } else if (kind === 'paw') {
    /* huella: una almohadilla grande y cuatro dedos */
    g.beginPath();
    g.ellipse(0, 11, 15, 12, 0, 0, Math.PI * 2);
    g.fill();
    for (const [x, y] of [
      [-19, -5],
      [-7, -17],
      [7, -17],
      [19, -5],
    ]) {
      g.beginPath();
      g.arc(x, y, 6.5, 0, Math.PI * 2);
      g.fill();
    }
  } else g.fillRect(-20, -20, 40, 40); // píxel
  return (SHAPES[kind] = new THREE.CanvasTexture(c));
}

const STAMPS = 48; // figuras a la vez, como mucho
/* T = { stamp: figura (o icon: un emoji a todo color) · cols · size · len · every: separación entre figuras (1 = normal) } */
export function makeStamps(T, exit) {
  const pos = new Float32Array(STAMPS * 3),
    col = new Float32Array(STAMPS * 4),
    solid = !!T.icon; // las figuras a color no son luz: se desvanecen volviéndose transparentes
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 4));
  const material = new THREE.PointsMaterial({
    map: T.icon ? iconTexture(T.icon) : shapeTexture(T.stamp),
    size: (T.size || 12) * (0.6 + 0.4 * exit.k),
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    alphaTest: solid ? 0.05 : 0,
    blending: solid ? THREE.NormalBlending : THREE.AdditiveBlending,
    depthWrite: false,
    fog: false,
  });
  const mesh = new THREE.Points(geometry, material);
  mesh.frustumCulled = false;
  const dispose = () => {
    if (mesh.parent) mesh.parent.remove(mesh);
    geometry.dispose();
    material.dispose();
  };
  mesh.userData.dispose = dispose;

  const cols = solid
      ? [new THREE.Color('#ffffff'), new THREE.Color('#ffffff')]
      : T.cols === 'rainbow'
        ? null
        : T.cols.map((c) => new THREE.Color(c)),
    life = LIFE * 1.5 * (T.len || 1),
    gap = 11 * (T.every || 1), // distancia entre una figura y la siguiente: así a más velocidad no quedan ralas
    pts = [], // { x, y, z, vx, vy, age, hue }
    head = new THREE.Vector3(),
    c = new THREE.Color();
  let wait = 0,
    count = 0;

  function update(matrix, dt, speed, now, on) {
    for (const p of pts) {
      p.x += p.vx * dt; // se abren un poco hacia los lados y flotan
      p.y += p.vy * dt;
      p.z += speed * dt;
      p.age += dt;
    }
    while (pts.length && pts[pts.length - 1].age > life) pts.pop();
    wait -= speed * dt;
    if (on && dt > 0 && wait <= 0) {
      wait = gap;
      head.set(exit.x, exit.y, exit.z).applyMatrix4(matrix);
      /* azar de adornos sencillo, propio de esta estela: no toca el azar de la partida */
      const r1 = Math.sin(++count * 12.9898) * 43758.5453,
        r2 = Math.sin(count * 78.233) * 12543.123;
      pts.unshift({
        x: head.x,
        y: head.y,
        z: head.z,
        vx: (r1 - Math.floor(r1) - 0.5) * 34,
        vy: (r2 - Math.floor(r2)) * 10,
        age: 0,
        hue: (count * 0.13) % 1,
      });
      if (pts.length > STAMPS) pts.pop();
    }
    for (let i = 0; i < pts.length; i++) {
      const p = pts[i],
        k = p.age / life,
        fade = Math.min(1, p.age * 12) * (1 - k) * (1 - k * 0.5); // aparece de golpe y se apaga despacio
      if (cols) {
        const f = k * (cols.length - 1),
          j = Math.min(cols.length - 2, Math.floor(f));
        c.copy(cols[j]).lerp(cols[j + 1], f - j);
      } else c.setHSL(p.hue, 1, 0.6);
      pos[i * 3] = p.x;
      pos[i * 3 + 1] = p.y + 1.5;
      pos[i * 3 + 2] = p.z;
      const lit = solid ? 1 : fade;
      col[i * 4] = c.r * lit;
      col[i * 4 + 1] = c.g * lit;
      col[i * 4 + 2] = c.b * lit;
      col[i * 4 + 3] = solid ? Math.min(1, fade * 1.6) : 1;
    }
    geometry.setDrawRange(0, pts.length);
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }
  return { mesh, update, dispose };
}

/**
 * Estela de luz: una cinta que sale de un motor y queda atrás como un camino. Guarda por dónde
 * pasó la nave y dibuja una franja que se va angostando y apagando.
 */
const MAX = 44; // puntos de la cinta, como mucho
const LIFE = 0.55; // segundos que dura un punto (por el largo de la pieza)

/* T = { cols: colores de la cabeza a la cola, o 'rainbow' · w = ancho · len = largo } · exit = boca del motor */
export function makeTrail(T, exit) {
  const pos = new Float32Array(MAX * 2 * 3),
    col = new Float32Array(MAX * 2 * 3),
    index = [];
  for (let i = 0; i < MAX - 1; i++) {
    const a = i * 2;
    index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geometry.setIndex(index);
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
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

  const cols = T.cols === 'rainbow' ? null : T.cols.map((c) => new THREE.Color(c)),
    life = LIFE * (T.len || 1),
    half = 2.1 * (T.w || 1) * exit.k,
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
        w = half * (1 - 0.65 * k),
        fade = (1 - k) * (1 - k);
      if (cols) {
        /* de un color al siguiente a lo largo de la cinta */
        const f = k * (cols.length - 1),
          j = Math.min(cols.length - 2, Math.floor(f));
        c.copy(cols[j]).lerp(cols[j + 1], f - j);
      } else c.setHSL((k * 0.9 + now * 0.5) % 1, 1, 0.55);
      for (const side of [0, 1]) {
        const o = (i * 2 + side) * 3;
        pos[o] = p.x + (side ? w : -w);
        pos[o + 1] = p.y;
        pos[o + 2] = p.z;
        col[o] = c.r * fade;
        col[o + 1] = c.g * fade;
        col[o + 2] = c.b * fade;
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
/* T = { stamp: figura · cols · size · len · every: separación entre figuras (1 = normal) } */
export function makeStamps(T, exit) {
  const pos = new Float32Array(STAMPS * 3),
    col = new Float32Array(STAMPS * 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const material = new THREE.PointsMaterial({
    map: shapeTexture(T.stamp),
    size: (T.size || 12) * (0.6 + 0.4 * exit.k),
    sizeAttenuation: true,
    vertexColors: true,
    transparent: true,
    blending: THREE.AdditiveBlending,
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

  const cols = T.cols === 'rainbow' ? null : T.cols.map((c) => new THREE.Color(c)),
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
      col[i * 3] = c.r * fade;
      col[i * 3 + 1] = c.g * fade;
      col[i * 3 + 2] = c.b * fade;
    }
    geometry.setDrawRange(0, pts.length);
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.color.needsUpdate = true;
  }
  return { mesh, update, dispose };
}

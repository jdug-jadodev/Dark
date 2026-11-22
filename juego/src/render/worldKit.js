/** Ayudas para armar las piezas de los mundos (rocas, conos, montañas plantadas en la pista). */
import { vrand } from '../core/util.js';

/* la pista queda por debajo de donde flotan los obstáculos: ahí se apoya lo que va plantado */
export const TRACK_Y = -33;

/* una roca irregular (como las del espacio), para deformar a gusto */
export function lump(detail, squash) {
  const g = new THREE.IcosahedronGeometry(1, detail),
    p = g.attributes.position,
    seen = {};
  for (let i = 0; i < p.count; i++) {
    const k = p.getX(i).toFixed(3) + ',' + p.getY(i).toFixed(3) + ',' + p.getZ(i).toFixed(3);
    if (!(k in seen)) seen[k] = 0.76 + vrand() * 0.36;
    const f = seen[k];
    p.setXYZ(i, p.getX(i) * f, p.getY(i) * f * squash, p.getZ(i) * f);
  }
  g.computeVertexNormals();
  return g;
}
/* un cono apoyado en el suelo (la base en y = 0) */
export function cone(r, h, sides) {
  const g = new THREE.ConeGeometry(r, h, sides);
  g.translate(0, h / 2, 0);
  return g;
}
/* una figura cualquiera apoyada en el suelo: caja, prisma… (mide 1 de alto) */
export function onGround(g) {
  g.translate(0, 0.5, 0);
  return g;
}
/**
 * Algo plantado en la pista (montaña, volcán, torre). `build(add)` lo arma en medidas donde el
 * radio de la base es 1; add(geometría, material, [sx, sy, sz], x, y, z, giro) agrega una pieza.
 */
export function planted(o, build) {
  const g = new THREE.Group(),
    m = new THREE.Group();
  build((geo, mat, s, x, y, z, ry) => {
    const p = new THREE.Mesh(geo, mat);
    p.scale.set(s[0], s[1], s[2]);
    p.position.set(x || 0, y || 0, z || 0);
    p.rotation.y = ry || 0;
    m.add(p);
    return p;
  }, m);
  m.position.y = TRACK_Y / o.r;
  g.add(m);
  g.scale.setScalar(o.r);
  g.userData.tilt = 0;
  g.userData.steady = true; // no da vueltas: está plantada
  return g;
}
/**
 * Un arco que cruza parte de la pista: dos pilares (los que chocan) y algo por encima. Se arma en
 * medidas reales: el pilar izquierdo está en x = 0 y el derecho en x = span; el suelo, en y = 0.
 */
export function arched(build) {
  const g = new THREE.Group(),
    m = new THREE.Group();
  build((geo, mat, s, x, y, z) => {
    const p = new THREE.Mesh(geo, mat);
    p.scale.set(s[0], s[1], s[2]);
    p.position.set(x || 0, y || 0, z || 0);
    m.add(p);
    return p;
  });
  m.position.y = TRACK_Y;
  g.add(m);
  g.userData.tilt = 0;
  g.userData.steady = true;
  return g;
}

/**
 * Una montaña con relieve: un cono (top = 0) o un cono cortado (un volcán), con las caras
 * quebradas, aristas que bajan desde la cumbre y pintada por altura.
 *   top = radio de arriba · h = alto · rough = cuánto se quiebra (0 a 0.3) · ridge = aristas
 *   paint(t, n, out) pinta un punto: t = altura de 0 a 1, n = azar de 0 a 1, out = THREE.Color
 * La base mide 1 de radio y queda en y = 0. Se usa con un material con vertexColors.
 */
export function crag(top, h, sides, rings, rough, paint, ridge = 0.13) {
  const g = new THREE.CylinderGeometry(top, 1, h, sides, rings, true);
  g.translate(0, h / 2, 0);
  const p = g.attributes.position,
    col = new Float32Array(p.count * 3),
    seen = {},
    c = new THREE.Color(),
    ridges = 3 + Math.floor(vrand() * 3),
    ph = vrand() * 6.28;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i),
      y = p.getY(i),
      z = p.getZ(i),
      k = x.toFixed(3) + ',' + y.toFixed(3) + ',' + z.toFixed(3);
    if (!(k in seen)) seen[k] = [vrand(), vrand(), vrand()];
    const [a, b, n] = seen[k],
      t = y / h,
      mid = t > 0.02 && t < 0.98 ? 1 : 0.35, // la base y el borde de arriba se quiebran menos
      f = 1 + ((a - 0.5) * 2 * rough + ridge * Math.sin(Math.atan2(z, x) * ridges + ph) * (1 - t * 0.4)) * mid;
    p.setXYZ(i, x * f, y + (b - 0.5) * rough * h * 0.5 * (mid === 1 ? 1 : 0), z * f);
    paint(t, n, c);
    col[i * 3] = c.r;
    col[i * 3 + 1] = c.g;
    col[i * 3 + 2] = c.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}
/* Quiebra una figura cualquiera (un aro, un cilindro) para que parezca piedra. */
export function roughen(g, amt) {
  const p = g.attributes.position,
    seen = {};
  for (let i = 0; i < p.count; i++) {
    const k = p.getX(i).toFixed(3) + ',' + p.getY(i).toFixed(3) + ',' + p.getZ(i).toFixed(3);
    if (!(k in seen)) seen[k] = 1 + (vrand() - 0.5) * 2 * amt;
    const f = seen[k];
    p.setXYZ(i, p.getX(i) * f, p.getY(i) * f, p.getZ(i) * f);
  }
  g.computeVertexNormals();
  return g;
}
/* Una pieza que apunta de un punto a otro (un chorro de lava que baja por una ladera): la figura
   debe medir 1 de alto, centrada, a lo largo de Y. */
const _up = new THREE.Vector3(0, 1, 0),
  _dir = new THREE.Vector3();
export function between(mesh, x0, y0, z0, x1, y1, z1, thick) {
  _dir.set(x1 - x0, y1 - y0, z1 - z0);
  const len = _dir.length();
  mesh.position.set((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
  mesh.quaternion.setFromUnitVectors(_up, _dir.normalize());
  mesh.scale.set(thick, len, thick);
  return mesh;
}

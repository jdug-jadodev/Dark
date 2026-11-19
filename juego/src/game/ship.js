/** Movimiento de la nave: deslizar (relativo) y flechas. */
import { G } from '../core/state.js';
import { BTN_SPEED, H, SENS, SY, W } from '../core/config.js';
import { clamp } from '../core/util.js';
import { spaceDrag, spaceFollow } from './space.js';
import { K } from '../ui/input.js';
export function dragBy(dx, dy) {
  if (!G.ship) return;
  if (G.run && G.run.mode === 'space') {
    spaceDrag(dx, dy);
    return;
  }
  /* el gesto se "des-gira" junto con la pantalla: los controles siguen igual */
  const c = Math.cos(G.angle),
    s = Math.sin(G.angle),
    u = (W / G.cw) * SENS;
  const ux = (dx * c + dy * s) * u,
    uy = (-dx * s + dy * c) * u;
  G.ship.tx = clamp(G.ship.tx + ux, 14, W - 14);
  G.ship.ty = clamp(G.ship.ty + uy, H * 0.42, SY + 15);
}
export function followPointer(dt) {
  if (G.run.mode === 'space') {
    spaceFollow(dt);
    return;
  }
  const kx = K.right - K.left,
    ky = K.down - K.up;
  if (kx || ky) {
    const pps = BTN_SPEED / ((W / G.cw) * SENS);
    dragBy(kx * pps * dt, ky * pps * dt);
  }
  G.ship.tx = clamp(G.ship.tx, 14, W - 14);
  G.ship.ty = clamp(G.ship.ty, H * 0.42, SY + 15);
  const k = Math.min(1, dt * G.ship.follow);
  G.ship.x += (G.ship.tx - G.ship.x) * k;
  G.ship.y += (G.ship.ty - G.ship.y) * k;
}

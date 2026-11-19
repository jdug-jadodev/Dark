/** Portales: aparecen al cambiar de fase o nivel y disparan el salto. */
import { emit } from '../core/events.js';
import { G } from '../core/state.js';
import { H, SPAWN, WARP_T } from '../core/config.js';
import { ap } from '../core/difficulty.js';
export function spawnPortal() {
  G.run.portals.push({
    y: -SPAWN,
    done: false,
  });
}
export function updatePortals(dt) {
  for (let i = G.run.portals.length - 1; i >= 0; i--) {
    const p = G.run.portals[i];
    p.y += G.run.sp * 1.1 * dt * ap(p.y);
    if (!p.done && p.y >= G.ship.y) {
      p.done = true;
      G.run.warp = WARP_T;
      G.shake = Math.max(G.shake, 0.3);
      G.bendT = 0;
      emit('portal');
      G.pops.push({
        x: G.ship.x,
        y: G.ship.y - 40,
        text: '🌀 ¡PORTAL!',
        life: 1.2,
        col: '#ffffff',
      });
    }
    if (p.y > H + 460) G.run.portals.splice(i, 1);
  }
}

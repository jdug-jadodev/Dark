/**
 * Escaparate del taller: mientras se miran las armas la nave dispara de muestra, y al elegir una
 * explosión se ve cómo revienta. Todo pasa fuera de la partida (en el menú).
 */
import { SPAWN } from '../core/config.js';
import { look } from '../core/garage.js';
import { G } from '../core/state.js';
import { fireGun } from './powers.js';
import { shipBoom } from './run.js';

/* se muestran las tres armas que se recogen en la partida, una tras otra: [arma, cuántos disparos] */
const DEMO = [
  ['twin', 8],
  ['spread', 4],
  ['heavy', 2],
];
let wait = 0;
let step = 0;
let shots = 0;
let hiddenFor = 0;

export function showroomTick(dt) {
  for (let i = G.bullets.length - 1; i >= 0; i--) {
    const b = G.bullets[i];
    b.x += (b.vx || 0) * dt;
    b.y += b.vy * dt;
    if (b.y < -SPAWN) G.bullets.splice(i, 1);
  }
  if (hiddenFor > 0) {
    hiddenFor -= dt;
    if (hiddenFor <= 0) G.ship.hidden = false;
  }
  if (G.view !== 'garage' || !G.showGuns || G.ship.hidden) return;
  wait -= dt;
  if (wait > 0) return;
  const [gun, count] = DEMO[step];
  wait = fireGun(G.ship, gun);
  if (++shots >= count) {
    shots = 0;
    step = (step + 1) % DEMO.length;
    wait += 0.45; // pausa entre un arma y la siguiente
  }
}
/* la nave revienta con la explosión que se está mirando y reaparece enseguida */
export function showroomBoom() {
  shipBoom(G.ship.x, G.ship.y, look().boom);
  G.ship.hidden = true;
  hiddenFor = 1;
}
/* al salir del taller no queda nada de muestra en la pista */
export function showroomClear() {
  G.bullets.length = 0;
  G.ship.hidden = false;
  hiddenFor = 0;
  wait = 0;
  step = 0;
  shots = 0;
}

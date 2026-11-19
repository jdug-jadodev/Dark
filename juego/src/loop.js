/** Bucle principal: cada cuadro avanza la partida y dibuja. */
import { tickAudio } from './audio/sound.js';
import { MINI_AT } from './core/config.js';
import { prog } from './core/difficulty.js';
import { lazyFrame, setHeat, tooSoon, watchFps } from './core/perf.js';
import { G } from './core/state.js';
import { update } from './game/adventure.js';
import { ambient, newRun } from './game/run.js';
import { followPointer } from './game/ship.js';
import { tickTimers } from './game/timers.js';
import { Platform } from './platform/platform.js';
import { draw } from './render/draw.js';
import { resize } from './render/engine.js';
import { tickCount } from './ui/flow.js';
import { hud } from './ui/hud.js';
import { renderMenu } from './ui/menu.js';
/* ---------- Bucle ---------- */
let fpsN = 0;
let fpsT = 0;
let heatT = 0;
function loop(ts) {
  /* tope de cuadros: si la pantalla refresca más rápido de lo necesario, este cuadro se salta */
  if (tooSoon(ts)) {
    requestAnimationFrame(loop);
    return;
  }
  /* cada 5 s se le pregunta al teléfono si se está calentando; y se vigila si da los 60 cuadros */
  let adjust = watchFps(ts, G.state === 'play');
  if (ts - heatT > 5000) {
    heatT = ts;
    if (setHeat(Platform.heat())) adjust = true;
  }
  if (adjust) resize();
  if (Platform.debug) {
    fpsN++;
    if (ts - fpsT >= 3000) {
      console.log(
        'FPS=' +
          Math.round((fpsN * 1000) / (ts - fpsT)) +
          ' estado=' +
          G.state +
          ' dpr=' +
          G.dpr.toFixed(2) +
          ' ' +
          Math.round(G.cw * G.dpr) +
          'x' +
          Math.round(G.ch * G.dpr),
      );
      fpsN = 0;
      fpsT = ts;
    }
  }
  const advance = Math.min(1, prog() / 100);
  tickAudio(musicScene(advance), advance, G.state === 'pause' || G.state === 'paused', thrust(advance));
  if (G.state === 'pause') {
    G.lastTs = ts;
    draw(0, lazyFrame('pause'));
    requestAnimationFrame(loop);
    return;
  } /* en pausa todo queda congelado */
  const dt = Math.min(0.05, (ts - G.lastTs) / 1000 || 0);
  G.lastTs = ts;
  ambient(dt);
  tickTimers(dt);
  if (G.state === 'count') {
    followPointer(dt);
    tickCount(dt);
  }
  if (G.state === 'play') {
    update(dt);
    if (G.state === 'play') hud();
  }
  draw(dt, lazyFrame(G.state));
  requestAnimationFrame(loop);
}
/* potencia del motor para el sonido: apagado fuera de la partida, sube con el avance y ruge con el nitro */
function thrust(advance) {
  if (G.state !== 'play' && G.state !== 'count') return 0;
  return 0.45 + 0.4 * advance + (G.ship.nitro > 0 ? 0.6 : 0);
}
/* Qué tema de música va con lo que está pasando: la partida arranca con metal industrial y,
   desde que se pone pesada (el punto del jefe intermedio) y en todos los jefes, pasa a las guitarras */
function musicScene(advance) {
  if (G.state === 'menu' || G.state === 'end') return 'menu';
  if (G.run.mode === 'space') return 'space';
  if (G.run.mode === 'boss' || G.run.stage === 'mini' || G.run.stage === 'warn') return 'metal';
  return advance >= MINI_AT / 100 ? 'metal' : 'doom';
}
export function bootLoop() {
  resize();
  newRun();
  renderMenu();
  requestAnimationFrame(loop);
}

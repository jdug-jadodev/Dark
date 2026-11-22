/** Entrada del jugador: deslizar, flechas en pantalla, teclado, nitro, pausa y "atrás" del sistema. */
import { G } from '../core/state.js';
import { S } from '../core/profile.js';
import { useNitro } from '../game/holes.js';
import { dragBy } from '../game/ship.js';
import { $, cv } from './dom.js';
import { pauseGame, quitGame, resumeGame } from './flow.js';
import { closeCup } from './cup.js';
import { closeAccount } from './account.js';
import { closeMaps } from './maps.js';
import { closeWorlds } from './worlds.js';
import { closeRemAsk } from './reminder.js';
import { closeChest, closeMissions } from './daily.js';
import { closeGarage } from './garage.js';
import { closeSettings } from './settings.js';
import { closeShop } from './shop.js';
import { closeStats } from './stats.js';
export const K = {
  up: 0,
  down: 0,
  left: 0,
  right: 0,
};
export function bootInput() {
  /* ---------- Entrada ---------- */
  /* Deslizar (solo si ese es el control elegido) */
  cv.addEventListener('pointerdown', (e) => {
    if (S.ctrl === 'btn') return;
    G.ptr.x = e.clientX;
    G.ptr.y = e.clientY;
    G.ptr.has = true;
    try {
      cv.setPointerCapture(e.pointerId);
    } catch (_) {}
  });
  cv.addEventListener('pointermove', (e) => {
    if (!G.ptr.has) return;
    const dx = e.clientX - G.ptr.x,
      dy = e.clientY - G.ptr.y;
    G.ptr.x = e.clientX;
    G.ptr.y = e.clientY;
    if (G.state === 'play' || G.state === 'count') dragBy(dx, dy);
  });
  cv.addEventListener('pointerup', endPtr);
  cv.addEventListener('pointercancel', endPtr);
  /* Flechas en pantalla (se pueden mantener dos a la vez) */
  document.querySelectorAll('#pad button').forEach((bt) => {
    const d = bt.dataset.d;
    const off = () => {
      K[d] = 0;
      bt.classList.remove('on');
    };
    bt.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      K[d] = 1;
      bt.classList.add('on');
      try {
        bt.setPointerCapture(e.pointerId);
      } catch (_) {}
    });
    bt.addEventListener('pointerup', off);
    bt.addEventListener('pointercancel', off);
    bt.addEventListener('lostpointercapture', off);
    bt.addEventListener('contextmenu', (e) => e.preventDefault());
  });
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === ' ' || k === 'n' || k === 'shift') {
      useNitro();
      e.preventDefault();
      return;
    }
    const d = KEYS[k];
    if (d && (G.state === 'play' || G.state === 'count')) {
      K[d] = 1;
      e.preventDefault();
    }
  });
  /* Pausa: botón, teclas Esc/P, y automática si la app pasa a segundo plano */
  $('pauseBtn').addEventListener('click', pauseGame);
  $('resumeBtn').addEventListener('click', resumeGame);
  $('quitBtn').addEventListener('click', quitGame);
  window.addEventListener('keydown', (e) => {
    const k = e.key.toLowerCase();
    if (k === 'escape' || k === 'p') {
      if (G.state === 'play') pauseGame();
      else if (G.state === 'pause') resumeGame();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) pauseGame();
  });
  /* Atrás: devuelve true si el juego lo usó; false = la app puede cerrarse */
  window.__giroBack = () => {
    if (closeRemAsk()) return true;
    if (closeSettings()) return true;
    if (closeShop()) return true;
    if (closeGarage()) return true;
    if (G.state === 'play') {
      pauseGame();
      return true;
    }
    if (G.state === 'pause') {
      resumeGame();
      return true;
    }
    if (closeChest() || closeMissions() || closeStats() || closeCup() || closeWorlds() || closeMaps() || closeAccount())
      return true;
    return G.state !== 'menu';
  };
  window.__giroPause = () => pauseGame();
  /* Botón de nitro */
  $('nitroBtn').addEventListener('pointerdown', (e) => {
    e.preventDefault();
    e.stopPropagation();
    useNitro();
  });
  $('nitroBtn').addEventListener('contextmenu', (e) => e.preventDefault());
  window.addEventListener('keyup', (e) => {
    const d = KEYS[e.key.toLowerCase()];
    if (d) K[d] = 0;
  });
}
const endPtr = () => {
  G.ptr.has = false;
};
/* Teclado (computador): flechas o WASD */
const KEYS = {
  arrowup: 'up',
  arrowdown: 'down',
  arrowleft: 'left',
  arrowright: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
};

/** Flujo de una partida: empezar, cuenta regresiva, pausa, salir, choque y revivir. */
import { emit } from '../core/events.js';
import { G } from '../core/state.js';
import { COUNT_STEP, FLIP_AT, GOAL, HULL_REVIVE, MINI_AT } from '../core/config.js';
import { level } from '../core/difficulty.js';
import { look } from '../core/garage.js';
import { S, save } from '../core/profile.js';
import { fmt } from '../core/util.js';
import { explode, newRun, shipBoom } from '../game/run.js';
import { km, spaceRevive } from '../game/space.js';
import { after, timers } from '../game/timers.js';
import { Platform } from '../platform/platform.js';
import { adTag, showAd } from './ads.js';
import { $ } from './dom.js';
import { finish, finishBoss } from './endScreens.js';
import { showToast } from './hud.js';
import { K } from './input.js';
import { renderMenu } from './menu.js';
/* ---------- Flujo ---------- */
function hideAll() {
  ['menu', 'garage', 'crash', 'end', 'chest', 'ad', 'pause', 'settings', 'shop', 'pay'].forEach((id) =>
    $(id).classList.remove('show'),
  );
}
export function showPad(on) {
  const nit = !!on && G.run && G.run.mode === 'run';
  $('nitroBtn').classList.toggle('show', nit);
  $('pauseBtn').classList.toggle('show', !!on);
  $('nitro').style.display = nit ? 'block' : 'none';
  $('hull').style.display = !!on && G.run && G.run.mode === 'endless' ? 'block' : 'none';
  $('pad').classList.toggle('show', !!on && S.ctrl === 'btn');
  for (const k in K) K[k] = 0;
  document.querySelectorAll('#pad button').forEach((b) => b.classList.remove('on'));
}
export function startRun(mode) {
  hideAll();
  newRun(mode);
  const isBoss = G.run.mode === 'boss';
  if (isBoss) G.run.boss.intro = 1;
  $('hud').classList.toggle('boss', isBoss);
  $('bar')
    .querySelectorAll('b')
    .forEach((e) => e.remove());
  if (G.run.mode === 'run')
    $('bar').insertAdjacentHTML(
      'beforeend',
      '<b style="left:' + MINI_AT + '%"></b><b class="f" style="left:' + FLIP_AT + '%"></b>',
    );
  const btn = S.ctrl === 'btn';
  $('hint').textContent =
    G.run.mode === 'space'
      ? btn
        ? 'Flechas: muévete arriba, abajo y a los lados'
        : 'Desliza en cualquier dirección: arriba, abajo y a los lados'
      : btn
        ? 'Flechas: ▲▼ a la izquierda · ◀▶ a la derecha'
        : 'Desliza el dedo en cualquier parte para mover la nave';
  $('hud').style.display = 'block';
  $('hint').style.display = 'block';
  showPad(true);
  G.ptr.has = false;
  timers.length = 0;
  G.state = 'count';
  countT = COUNT_STEP * 3;
  const c = $('count');
  c.textContent = '3';
  emit('count');
  c.classList.add('show');
}
let countT = 0;
export function tickCount(dt) {
  countT -= dt;
  const c = $('count'),
    n = Math.ceil(countT / COUNT_STEP);
  if (n > 0) {
    if (c.textContent !== String(n)) {
      c.textContent = n;
      emit('count');
    }
    return;
  }
  c.textContent = '¡YA!';
  emit('go');
  after(0.5, () => c.classList.remove('show'));
  G.state = 'play';
  after(3.5, () => {
    $('hint').style.display = 'none';
  });
  if (G.run.mode === 'boss') showToast('¡JEFE FINAL!', 'Centinela del Vacío · recoge armas en el camino');
  if (G.run.mode === 'space') showToast('Viaje espacial', 'Esquiva todo lo que venga');
}
/* ---------- Pausa ---------- */
export function pauseGame() {
  if (G.state !== 'play') return;
  G.state = 'pause';
  emit('pause');
  for (const k in K) K[k] = 0;
  G.ptr.has = false;
  $('pauseInfo').textContent =
    G.run.mode === 'space'
      ? 'Viaje espacial · ' + km() + ' km · ' + fmt(G.t)
      : G.run.mode === 'endless'
        ? 'Supervivencia · ' + fmt(G.t) + ' · Nivel ' + level()
        : G.run.mode === 'boss'
          ? 'Jefe final'
          : 'Aventura · ' + Math.floor(G.run.pts) + ' de ' + GOAL + ' puntos';
  $('pause').classList.add('show');
}
export function resumeGame() {
  if (G.state !== 'pause') return;
  $('pause').classList.remove('show');
  G.state = 'play';
  G.lastTs = performance.now();
}
export function quitGame() {
  if (G.state !== 'pause') return;
  S.coins += G.run.coins;
  save();
  backToMenu();
}
export function backToMenu() {
  timers.length = 0;
  $('count').classList.remove('show');
  hideAll();
  newRun();
  G.state = 'menu';
  G.view = 'lobby';
  $('hud').classList.remove('boss');
  $('hud').style.display = 'none';
  $('warn').classList.remove('show');
  $('hint').style.display = 'none';
  showPad(false);
  renderMenu();
  $('menu').classList.add('show');
}
export function crash() {
  Platform.haptic(60);
  emit('crash');
  G.state = 'paused';
  G.shake = 0.6;
  shipBoom(G.ship.x, G.ship.y, look().boom);
  if (G.run.revived) {
    after(0.6, () => {
      if (G.run.mode === 'boss') finishBoss(false);
      else finish(false);
    });
    return;
  }
  $('crashInfo').textContent =
    G.run.mode === 'space'
      ? 'Recorriste ' + km() + ' km en ' + fmt(G.t)
      : G.run.mode === 'endless'
        ? 'Aguantaste ' + fmt(G.t) + ' · Nivel ' + level()
        : G.run.mode === 'boss'
          ? 'Le hiciste ' + Math.round((1 - G.run.boss.hp / G.run.boss.max) * 100) + '% de daño al jefe'
          : 'Llevabas ' + Math.floor(G.run.pts) + ' de ' + GOAL + ' puntos y ' + G.run.coins + ' 🪙';
  $('reviveBtn').textContent = adTag() ? '▶ Revivir viendo un anuncio' : '▶ Revivir';
  after(0.45, () => {
    if (G.state === 'paused') $('crash').classList.add('show');
  });
}
function revive() {
  G.run.revived = true;
  emit('revive');
  G.ship.inv = 2.5;
  G.ship.shield = false;
  if (G.run.mode === 'space') spaceRevive();
  if (G.run.mode === 'endless') G.run.hull = Math.max(G.run.hull, HULL_REVIVE);
  G.run.suck = null;
  G.ship.hidden = false;
  G.ship.ghost = 0;
  G.ship.nitro = 0;
  if (G.run.holes) G.run.holes = G.run.holes.filter((h) => Math.hypot(h.x - G.ship.x, h.y - G.ship.y) > 280);
  G.obs = G.obs.filter((o) => {
    if (Math.hypot(o.x - G.ship.x, o.y - G.ship.y) < 150) {
      explode(o.x, o.y, '#9fb0e0', 8);
      return false;
    }
    return true;
  });
  G.eb = G.eb.filter((e) => Math.hypot(e.x - G.ship.x, e.y - G.ship.y) > 150);
  G.run.comets = [];
  $('crash').classList.remove('show');
  G.state = 'play';
  G.lastTs = performance.now();
}
export function bootFlow() {
  /* ---------- Choque ---------- */
  $('reviveBtn').addEventListener('click', () => {
    $('crash').classList.remove('show');
    showAd('Recompensa: revivir y seguir la partida', revive);
  });
  $('giveUp').addEventListener('click', () => {
    $('crash').classList.remove('show');
    if (G.run.mode === 'boss') finishBoss(false);
    else finish(false);
  });
}

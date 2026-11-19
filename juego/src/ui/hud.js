/** Marcador durante la partida (monedas, combo, armas, progreso, casco) y avisos grandes. */
import { G } from '../core/state.js';
import { GOAL, LVL, NITRO_COST, PH } from '../core/config.js';
import { level, mult, prog } from '../core/difficulty.js';
import { S } from '../core/profile.js';
import { fmt } from '../core/util.js';
import { powTxt } from '../game/powers.js';
import { SPC, km } from '../game/space.js';
import { $ } from './dom.js';
export function showToast(a, b) {
  const el = $('toast');
  el.innerHTML = '<b>' + a + '</b><small>' + b + '</small>';
  el.classList.remove('go');
  void el.offsetWidth;
  el.classList.add('go');
}
export function hud() {
  if (G.run.mode === 'space') {
    spaceHud();
    return;
  }
  if (G.run.mode === 'boss') {
    hudBoss();
    return;
  }
  if (G.run.mode === 'run') {
    const ok = G.run.nitro >= NITRO_COST,
      nb = $('nitroBtn');
    $('nitroFill').style.width = G.run.nitro + '%';
    $('nitro').classList.toggle('ready', ok);
    nb.classList.toggle('ready', ok);
    nb.classList.toggle('urgent', !!G.run.suck && ok);
  }
  $('hCoins').textContent = '🪙 ' + G.run.coins;
  $('hCombo').textContent = G.run.combo > 0 ? '🔥 x' + mult() + ' · ' + G.run.combo : '';
  $('hPow').textContent = powTxt() || (prog() >= 5 ? 'sin arma' : '');
  if (G.run.mode === 'endless') {
    const hp = Math.ceil(G.run.hull),
      hf = $('hullFill');
    hf.style.width = hp + '%';
    hf.style.background = hp > 60 ? '#6ef2a5' : hp > 30 ? '#ffb454' : '#ff6b8a';
    $('hullTxt').textContent = '🛡 CASCO ' + hp + '%';
    $('hull').classList.toggle('low', hp <= 30);
    const best = (S.topTimes || [])[0];
    $('hTime').textContent = '⏱ ' + fmt(G.t);
    $('barFill').style.width = ((prog() % LVL) / LVL) * 100 + '%';
    $('phase').textContent =
      'SUPERVIVENCIA · Nivel ' +
      level() +
      (best ? ' · récord ' + fmt(best) : '') +
      (G.run.invincible ? ' · modo demo' : '');
  } else if (G.run.stage === 'mini' && G.run.boss) {
    const b = G.run.boss;
    $('hTime').textContent = '⚔ ' + Math.max(0, Math.ceil((b.hp / b.max) * 100)) + '%';
    $('barFill').style.width = Math.max(0, (b.hp / b.max) * 100) + '%';
    $('phase').textContent = 'JEFE INTERMEDIO · Vigía Ámbar' + (G.run.invincible ? ' · modo demo' : '');
  } else {
    $('hTime').textContent = '🎯 ' + Math.min(GOAL, Math.floor(G.run.pts)) + '/' + GOAL;
    $('barFill').style.width = Math.min(100, prog()) + '%';
    $('phase').textContent =
      (G.run.stage === 'run' ? PH[Math.max(0, G.run.phase)].name : '¡Jefe final en camino!') +
      (G.run.invincible ? ' · modo demo (no mueres)' : '');
  }
}
function hudBoss() {
  const b = G.run.boss;
  $('hCoins').textContent = '🪙 ' + G.run.coins;
  $('hCombo').textContent = '';
  $('hPow').textContent = powTxt() || 'sin arma';
  $('hTime').textContent = '⏱ ' + Math.floor(G.run.bt) + ' s';
  $('barFill').style.width = Math.max(0, (b.hp / b.max) * 100) + '%';
  $('phase').textContent =
    'JEFE · Centinela del Vacío · Fase ' +
    (Math.max(0, G.run.phase) + 1) +
    ' de 3' +
    (G.run.invincible ? ' · modo demo' : '');
}
function spaceHud() {
  const best = (S.topSpace || [])[0];
  $('hCoins').textContent = '🪙 ' + G.run.coins;
  $('hCombo').textContent = SPC.near ? '✨ ' + SPC.near : '';
  $('hPow').textContent = '🪐 Sector ' + SPC.sector;
  $('hTime').textContent = '📏 ' + km() + ' km';
  $('barFill').style.width = ((G.t % 30) / 30) * 100 + '%';
  $('phase').textContent =
    'VIAJE ESPACIAL · ⏱ ' +
    fmt(G.t) +
    (best ? ' · récord ' + best + ' km' : '') +
    (G.run.invincible ? ' · modo demo' : '');
}

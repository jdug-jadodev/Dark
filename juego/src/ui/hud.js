/** Marcador durante la partida (monedas, combo, armas, progreso, casco) y avisos grandes. */
import { emit } from '../core/events.js';
import { G } from '../core/state.js';
import { GOAL, LVL, NITRO_COST, PH, W } from '../core/config.js';
import { goal, level, mult, phaseOf, prog } from '../core/difficulty.js';
import { S } from '../core/profile.js';
import { fmt } from '../core/util.js';
import { powTxt } from '../game/powers.js';
import { SPC, km } from '../game/space.js';
import { bossName } from '../game/boss.js';
import { $, put } from './dom.js';
import { T } from './icons.js';
export function showToast(a, b) {
  const el = $('toast');
  el.innerHTML = '<b>' + T(a) + '</b><small>' + T(b) + '</small>';
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
  put('hCoins', '{coin} ' + G.run.coins);
  put('hCombo', G.run.combo > 0 ? '{fire} x' + mult() + ' · ' + G.run.combo : '');
  put('hPow', powTxt() || (prog() >= 5 ? 'sin arma' : ''));
  hullBar();
  if (G.run.mode === 'endless') {
    const best = (S.topTimes || [])[0];
    put('hTime', '{timer} ' + fmt(G.t));
    /* en un reto: el momento en que se pasa el tiempo del rival se celebra, una vez */
    const rival = G.run.duel && G.run.duel.rival;
    if (rival && !G.run.beat && G.t > rival.time) {
      G.run.beat = true;
      emit('reward');
      G.pops.push({ x: W / 2, y: 200, text: '{trophy} ¡Superaste a ' + rival.nick + '!', life: 2.2, col: '#ffd54a' });
    }
    /* con un jefe en pantalla, la barra es su vida y el texto dice cuánto falta para que se vaya */
    const boss = G.run.stage === 'mini' && G.run.boss;
    $('barFill').style.width = (boss ? Math.max(0, boss.hp / boss.max) : (prog() % LVL) / LVL) * 100 + '%';
    put(
      'phase',
      (boss
        ? 'JEFE · ' + bossName(boss) + ' · se va en ' + Math.max(0, Math.ceil(G.run.bossLeft)) + ' s'
        : (G.run.kind === 'duel'
            ? rival
              ? 'RETO contra ' + rival.nick + ' (' + fmt(rival.time) + ')'
              : 'RETO NUEVO'
            : 'SUPERVIVENCIA') +
          ' · Nivel ' +
          level() +
          (best && G.run.kind !== 'duel' ? ' · récord ' + fmt(best) : '')) + (G.run.invincible ? ' · modo demo' : ''),
    );
  } else if (G.run.stage === 'mini' && G.run.boss) {
    const b = G.run.boss;
    put('hTime', '{swords} ' + Math.max(0, Math.ceil((b.hp / b.max) * 100)) + '%');
    $('barFill').style.width = Math.max(0, (b.hp / b.max) * 100) + '%';
    put('phase', 'JEFE INTERMEDIO · Vigía Ámbar' + (G.run.invincible ? ' · modo demo' : ''));
  } else {
    put('hTime', '{target} ' + Math.min(goal(), Math.floor(G.run.pts)) + '/' + goal());
    $('barFill').style.width = Math.min(100, prog()) + '%';
    put(
      'phase',
      (G.run.stage === 'run'
        ? phaseOf(Math.max(0, G.run.phase)).name
        : G.run.world
          ? '¡' + G.run.world.boss.name + ' se acerca!'
          : '¡Jefe final en camino!') + (G.run.invincible ? ' · modo demo (no mueres)' : ''),
    );
  }
}
/* la barra del casco */
function hullBar() {
  const hp = Math.ceil(G.run.hull),
    hf = $('hullFill');
  hf.style.width = hp + '%';
  hf.style.background = hp > 60 ? '#6ef2a5' : hp > 30 ? '#ffb454' : '#ff6b8a';
  put('hullTxt', '{shield} CASCO ' + hp + '%');
  $('hull').classList.toggle('low', hp <= 30);
}
function hudBoss() {
  const b = G.run.boss;
  hullBar();
  put('hCoins', '{coin} ' + G.run.coins);
  put('hCombo', '');
  put('hPow', powTxt() || 'sin arma');
  put('hTime', '{timer} ' + Math.floor(G.run.bt) + ' s');
  $('barFill').style.width = Math.max(0, (b.hp / b.max) * 100) + '%';
  put(
    'phase',
    'JEFE · ' +
      (b.name || 'Centinela del Vacío') +
      ' · Fase ' +
      (Math.max(0, G.run.phase) + 1) +
      ' de 3' +
      (G.run.invincible ? ' · modo demo' : ''),
  );
}
function spaceHud() {
  const best = (S.topSpace || [])[0];
  put('hCoins', '{coin} ' + G.run.coins);
  put('hCombo', SPC.near ? '{sparkle} ' + SPC.near : '');
  put('hPow', '{planet} Sector ' + SPC.sector);
  put('hTime', '{ruler} ' + km() + ' km');
  $('barFill').style.width = ((G.t % 30) / 30) * 100 + '%';
  put(
    'phase',
    'VIAJE ESPACIAL · {timer} ' +
      fmt(G.t) +
      (best ? ' · récord ' + best + ' km' : '') +
      (G.run.invincible ? ' · modo demo' : ''),
  );
}

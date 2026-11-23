/** Marcador durante la partida (monedas, combo, armas, progreso, casco) y avisos grandes. */
import { emit } from '../core/events.js';
import { tr } from '../core/i18n.js';
import { G } from '../core/state.js';
import { GOAL, LVL, NITRO_COST, PH, W } from '../core/config.js';
import { goal, level, mult, phaseOf, prog } from '../core/difficulty.js';
import { S } from '../core/profile.js';
import { esc, fmt } from '../core/util.js';
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
  put('hPow', powTxt() || (prog() >= 5 ? tr('sin arma') : ''));
  hullBar();
  if (G.run.mode === 'endless') {
    const best = (S.topTimes || [])[0];
    put('hTime', '{timer} ' + fmt(G.t));
    /* en un reto: el momento en que se pasa el tiempo del rival se celebra, una vez */
    const rival = G.run.duel && G.run.duel.rival;
    if (rival && !G.run.beat && G.t > rival.time) {
      G.run.beat = true;
      emit('reward');
      G.pops.push({
        x: W / 2,
        y: 200,
        text: tr('{trophy} ¡Superaste a {nick}!', { nick: rival.nick }),
        life: 2.2,
        col: '#ffd54a',
      });
    }
    /* con un jefe en pantalla, la barra es su vida y el texto dice cuánto falta para que se vaya */
    const boss = G.run.stage === 'mini' && G.run.boss;
    $('barFill').style.width = (boss ? Math.max(0, boss.hp / boss.max) : (prog() % LVL) / LVL) * 100 + '%';
    put(
      'phase',
      (boss
        ? tr('JEFE · {name} · se va en {n} s', { name: bossName(boss), n: Math.max(0, Math.ceil(G.run.bossLeft)) })
        : (G.run.kind === 'duel'
            ? rival
              ? tr('RETO contra {nick} ({time})', { nick: esc(rival.nick), time: fmt(rival.time) })
              : tr('RETO NUEVO')
            : tr('SUPERVIVENCIA')) +
          ' · ' +
          tr('Nivel {n}', { n: level() }) +
          (best && G.run.kind !== 'duel' ? ' · ' + tr('récord {x}', { x: fmt(best) }) : '')) +
        (G.run.invincible ? ' · ' + tr('modo demo') : ''),
    );
  } else if (G.run.stage === 'mini' && G.run.boss) {
    const b = G.run.boss;
    put('hTime', '{swords} ' + Math.max(0, Math.ceil((b.hp / b.max) * 100)) + '%');
    $('barFill').style.width = Math.max(0, (b.hp / b.max) * 100) + '%';
    put(
      'phase',
      tr('JEFE INTERMEDIO · {name}', { name: tr('Vigía Ámbar') }) + (G.run.invincible ? ' · ' + tr('modo demo') : ''),
    );
  } else {
    put('hTime', '{target} ' + Math.min(goal(), Math.floor(G.run.pts)) + '/' + goal());
    $('barFill').style.width = Math.min(100, prog()) + '%';
    put(
      'phase',
      (G.run.stage === 'run'
        ? tr(phaseOf(Math.max(0, G.run.phase)).name)
        : G.run.world
          ? tr('¡{name} se acerca!', { name: G.run.world.boss.name })
          : tr('¡Jefe final en camino!')) + (G.run.invincible ? ' · ' + tr('modo demo (no mueres)') : ''),
    );
  }
}
/* la barra del casco */
function hullBar() {
  const hp = Math.ceil(G.run.hull),
    hf = $('hullFill');
  hf.style.width = hp + '%';
  hf.style.background = hp > 60 ? '#6ef2a5' : hp > 30 ? '#ffb454' : '#ff6b8a';
  put('hullTxt', tr('{shield} CASCO {n}%', { n: hp }));
  $('hull').classList.toggle('low', hp <= 30);
}
function hudBoss() {
  const b = G.run.boss;
  hullBar();
  put('hCoins', '{coin} ' + G.run.coins);
  put('hCombo', '');
  put('hPow', powTxt() || tr('sin arma'));
  put('hTime', '{timer} ' + Math.floor(G.run.bt) + ' s');
  $('barFill').style.width = Math.max(0, (b.hp / b.max) * 100) + '%';
  put(
    'phase',
    tr('JEFE · {name} · Fase {n} de 3', {
      name: b.name || tr('Centinela del Vacío'),
      n: Math.max(0, G.run.phase) + 1,
    }) + (G.run.invincible ? ' · ' + tr('modo demo') : ''),
  );
}
function spaceHud() {
  const best = (S.topSpace || [])[0];
  put('hCoins', '{coin} ' + G.run.coins);
  put('hCombo', SPC.near ? '{sparkle} ' + SPC.near : '');
  put('hPow', tr('{planet} Sector {n}', { n: SPC.sector }));
  put('hTime', '{ruler} ' + km() + ' km');
  $('barFill').style.width = ((G.t % 30) / 30) * 100 + '%';
  put(
    'phase',
    tr('VIAJE ESPACIAL · {timer} {x}', { x: fmt(G.t) }) +
      (best ? ' · ' + tr('récord {x}', { x: best + ' km' }) : '') +
      (G.run.invincible ? ' · ' + tr('modo demo') : ''),
  );
}

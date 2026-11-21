/** Lobby (menú principal): monedas, racha, récords, lo de hoy y los botones de los modos. */
import { chestReady, missionsDone, streakNow } from '../core/daily.js';
import { touchLook } from '../core/garage.js';
import { G } from '../core/state.js';
import { GOAL } from '../core/config.js';
import { S } from '../core/profile.js';
import { fmt } from '../core/util.js';
import { applyNoAds } from './ads.js';
import { renderCupButton } from './cup.js';
import { $ } from './dom.js';
import { T } from './icons.js';
import { renderNews } from './news.js';
import { tellStreak } from './reminder.js';
import { startRun } from './flow.js';

export function renderMenu() {
  applyNoAds(); // por si el mes sin anuncios se venció
  const streak = streakNow();
  tellStreak(streak);
  $('mCoins').innerHTML = T('{coin} ' + S.coins + '  ·  {fire} racha ' + streak + (streak === 1 ? ' día' : ' días'));
  const bt = (S.topTimes || [])[0],
    parts2 = [];
  if (S.best) parts2.push('{star} Aventura: ' + S.best + '/' + GOAL);
  if (bt) parts2.push('{timer} Supervivencia: ' + fmt(bt));
  if ((S.topSpace || [])[0]) parts2.push('{planet} ' + S.topSpace[0] + ' km');
  if (S.bossWins) parts2.push('{trophy} ' + S.bossWins);
  $('mBest').innerHTML = T(parts2.length ? parts2.join(' · ') : '{star} Aún sin récord: ¡juega tu primera partida!');
  /* lo de hoy: cuántas misiones van, y un punto sobre el cofre si está por abrir */
  const done = missionsDone();
  $('misBtn').querySelector('small').innerHTML = T(done === 3 ? '{check} 3/3' : done + '/3');
  $('misBtn').classList.toggle('all', done === 3);
  $('chestBtn').classList.toggle('dot', chestReady());
  renderCupButton();
  renderNews();
}
export function bootMenu() {
  $('play').addEventListener('click', () => startRun());
  $('survBtn').addEventListener('click', () => startRun('endless'));
  $('spaceBtn').addEventListener('click', () => startRun('space'));
  $('inv').addEventListener('change', () => {
    G.demo = $('inv').checked; // en modo demo el taller deja equipar todo
    touchLook();
    renderMenu();
    /* solo en modo demo: empezar Supervivencia en un nivel alto para probarlo sin jugar varios minutos */
    $('lvlPick').style.display = $('inv').checked ? 'flex' : 'none';
  });
  $('lvlPick').addEventListener('click', (e) => {
    const b = e.target.closest('[data-lv]');
    if (!b) return;
    G.startLv = +b.dataset.lv;
    document.querySelectorAll('#lvlPick .opt').forEach((o) => o.classList.toggle('sel', o === b));
  });
}

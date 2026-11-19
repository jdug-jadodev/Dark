/** Menú principal y cofre diario. */
import { emit } from '../core/events.js';
import { G } from '../core/state.js';
import { GOAL } from '../core/config.js';
import { S, save } from '../core/profile.js';
import { fmt } from '../core/util.js';
import { showAd } from './ads.js';
import { $ } from './dom.js';
import { startRun } from './flow.js';
/* ---------- Menú y cofre ---------- */
export function renderMenu() {
  $('mCoins').textContent = '🪙 ' + S.coins + '  ·  🔥 racha ' + S.streak + ' días';
  const bt = (S.topTimes || [])[0],
    parts2 = [];
  if (S.best) parts2.push('⭐ Aventura: ' + S.best + '/' + GOAL);
  if (bt) parts2.push('⏱ Supervivencia: ' + fmt(bt));
  if ((S.topSpace || [])[0]) parts2.push('🪐 ' + S.topSpace[0] + ' km');
  if (S.bossWins) parts2.push('🏆 ' + S.bossWins);
  $('mBest').textContent = parts2.length ? parts2.join(' · ') : '⭐ Aún sin récord: ¡juega tu primera partida!';
}
export function bootMenu() {
  $('play').addEventListener('click', () => startRun());
  $('survBtn').addEventListener('click', () => startRun('endless'));
  $('spaceBtn').addEventListener('click', () => startRun('space'));
  $('inv').addEventListener('change', renderMenu);
  /* solo en modo demo: empezar Supervivencia en un nivel alto para probarlo sin jugar varios minutos */
  $('inv').addEventListener('change', () => {
    $('lvlPick').style.display = $('inv').checked ? 'flex' : 'none';
  });
  $('lvlPick').addEventListener('click', (e) => {
    const b = e.target.closest('[data-lv]');
    if (!b) return;
    G.startLv = +b.dataset.lv;
    document.querySelectorAll('#lvlPick .opt').forEach((o) => o.classList.toggle('sel', o === b));
  });
  $('chestBtn').addEventListener('click', () => {
    renderChest();
    $('chest').classList.add('show');
  });
  $('chestBox').addEventListener('click', (e) => {
    const b = e.target.closest('[data-c]');
    if (!b) return;
    const a = b.dataset.c,
      r = chestReward();
    if (a === 'open') {
      S.coins += r;
      G.chestOpened = true;
      emit('reward');
      save();
      renderChest();
    } else if (a === 'x2') {
      showAd('Recompensa: duplicar el cofre diario (+' + r + ' 🪙)', () => {
        S.coins += r;
        G.chestDoubled = true;
        emit('reward');
        save();
        renderChest();
      });
    } else if (a === 'close') {
      $('chest').classList.remove('show');
      renderMenu();
    }
  });
}
function chestReward() {
  return 20 + S.streak * 10;
}
function renderChest() {
  const r = chestReward();
  let h = '<div style="font-size:54px">🎁</div><h2>Cofre diario</h2><div class="sub">Racha: día ' + S.streak + '</div>';
  if (!G.chestOpened) {
    h += '<button class="btn" data-c="open">Abrir cofre · +' + r + ' 🪙</button>';
  } else {
    h += '<div class="gain">+' + r + ' 🪙</div>';
    if (!G.chestDoubled) h += '<button class="btn ad" data-c="x2">▶ Duplicar con anuncio · +' + r + ' 🪙</button>';
    else h += '<div class="sub">✔ Duplicado</div>';
    h += '<div class="sub">Vuelve mañana: día ' + (S.streak + 1) + ' con premio mayor.</div>';
  }
  h += '<button class="btn alt" data-c="close">Cerrar</button>';
  $('chestBox').innerHTML = h;
}

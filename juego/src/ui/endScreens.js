/** Pantallas de fin de partida de cada modo, con récords y duplicar monedas. */
import { emit } from '../core/events.js';
import { G } from '../core/state.js';
import { BOSS_UNLOCK, GOAL, MINI_AT } from '../core/config.js';
import { level, prog } from '../core/difficulty.js';
import { S, save } from '../core/profile.js';
import { doubleCoins, payout } from '../core/season.js';
import { fmt } from '../core/util.js';
import { SPC, km } from '../game/space.js';
import { adTag, showAd } from './ads.js';
import { cupBlock } from './cup.js';
import { countRun, missionBlock } from './daily.js';
import { $, tok } from './dom.js';
import { T } from './icons.js';
import { goalBlock } from './news.js';
import { backToMenu, showPad, startRun } from './flow.js';
/* en fin de semana las monedas de la partida valen doble: se avisa junto a lo ganado */
const weekend = () => (doubleCoins() ? '<small>monedas dobles de fin de semana</small>' : '');
export function finishBoss(win) {
  G.state = 'end';
  emit(win ? 'win' : 'lose');
  $('warn').classList.remove('show');
  $('hud').style.display = 'none';
  $('hint').style.display = 'none';
  showPad(false);
  const b = G.run.boss,
    dmg = Math.round((1 - b.hp / b.max) * 100);
  const gain = payout((win ? 100 : Math.round(dmg * 0.5)) + G.run.coins);
  S.coins += gain;
  if (win) S.bossWins = (S.bossWins || 0) + 1;
  save();
  $('endBox').innerHTML =
    '<div class="big">' +
    (win ? '{trophy} ¡Jefe derrotado!' : '{skull} El jefe te venció') +
    '</div>' +
    '<div class="grid"><div><b>' +
    Math.floor(G.run.bt) +
    ' s</b><span>Tiempo</span></div>' +
    '<div><b>' +
    dmg +
    '%</b><span>Daño al jefe</span></div>' +
    '<div><b>' +
    G.run.wpnPicks +
    '</b><span>Armas</span></div>' +
    '<div><b>' +
    (S.bossWins || 0) +
    '</b><span>Victorias</span></div></div>' +
    '<div class="gain">+' +
    gain +
    ' {coin}' +
    (win ? '<small>cofre del jefe</small>' : '<small>según el daño que hiciste</small>') +
    weekend() +
    '</div>' +
    goalBlock() +
    '<div class="mini">' +
    (win
      ? 'Siguiente: un jefe nuevo por zona, con ataques distintos (en el juego real).'
      : 'Tip: el jefe cambia de ataque al azar; quédate cerca de las armas que caen y no te quedes quieto.') +
    '</div>' +
    '<button class="btn ad" data-a="x2">{play} Duplicar monedas' +
    adTag() +
    ' +' +
    gain +
    ' {coin}</button>' +
    '<button class="btn" data-a="boss">{swords} ' +
    (win ? 'Pelear otra vez' : 'Reintentar') +
    '</button>' +
    '<button class="btn alt" data-a="menu">Menú</button>';
  tok('endBox');
  $('end').classList.add('show');
  $('endBox')._gain = gain;
}
function finishSpace() {
  const d = km(),
    gain = payout(G.run.coins);
  S.coins += gain;
  const prev = (S.topSpace || []).slice(),
    list = prev
      .concat([d])
      .sort((a, b) => b - a)
      .slice(0, 5);
  const rank = list.indexOf(d),
    rec = rank === 0 && (!prev.length || d > prev[0]);
  S.topSpace = list;
  save();
  const mis = missionBlock(countRun());
  const rows = list
    .map(
      (v, i) =>
        '<div class="' +
        (i === rank ? 'me' : '') +
        '"><span>' +
        ['{medal1}', '{medal2}', '{medal3}', '4.', '5.'][i] +
        ' ' +
        (i === rank ? 'Esta partida' : '') +
        '</span><b>' +
        v +
        ' km</b></div>',
    )
    .join('');
  const next = list[rank > 0 ? rank - 1 : 0];
  $('endBox').innerHTML =
    '<div class="big">{planet} Recorriste ' +
    d +
    ' km</div>' +
    (rec
      ? '<div class="rec">{star} ¡Nuevo récord!</div>'
      : rank > 0
        ? '<div class="sub">Te faltaron ' + (next - d) + ' km para subir al puesto ' + rank + '</div>'
        : '<div class="sub">Récord: ' + list[0] + ' km</div>') +
    '<div class="grid"><div><b>' +
    fmt(G.t) +
    '</b><span>Tiempo</span></div>' +
    '<div><b>' +
    SPC.sector +
    '</b><span>Sector</span></div>' +
    '<div><b>' +
    SPC.near +
    '</b><span>Casi</span></div>' +
    '<div><b>' +
    Math.round(SPC.speed / 10) +
    '</b><span>km/s final</span></div></div>' +
    '<div class="top"><b>Tus mejores distancias</b>' +
    rows +
    '</div>' +
    '<div class="gain">+' +
    gain +
    ' {coin}' +
    weekend() +
    '</div>' +
    goalBlock() +
    mis +
    (gain > 0
      ? '<button class="btn ad" data-a="x2">{play} Duplicar monedas' + adTag() + ' +' + gain + ' {coin}</button>'
      : '') +
    '<button class="btn space" data-a="space">{planet} Volar de nuevo</button>' +
    '<button class="btn alt" data-a="menu">Menú</button>';
  tok('endBox');
  $('end').classList.add('show');
  $('endBox')._gain = gain;
}
export function finish(win) {
  G.state = 'end';
  emit(win ? 'win' : 'lose');
  $('warn').classList.remove('show');
  $('hud').style.display = 'none';
  $('hint').style.display = 'none';
  showPad(false);
  if (G.run.mode === 'endless') {
    finishSurv();
    return;
  }
  if (G.run.mode === 'space') {
    finishSpace();
    return;
  }
  const gain = payout(G.run.coins + (win ? 25 : 0));
  S.coins += gain;
  if (!S.boss && G.run.coins >= BOSS_UNLOCK) S.boss = true;
  const pts = Math.floor(G.run.pts),
    rec = pts > (S.best || 0);
  if (rec) S.best = pts;
  save();
  const mis = missionBlock(countRun());
  const nextGoal = !G.run.miniDone
    ? 'Te faltaron ' + Math.max(0, Math.ceil((GOAL * MINI_AT) / 100 - G.run.pts)) + ' puntos para el jefe intermedio.'
    : 'Te faltaron ' + Math.max(0, Math.ceil(GOAL - G.run.pts)) + ' puntos para el jefe final.';
  $('endBox').innerHTML =
    '<div class="big">{boom} Partida terminada</div>' +
    (rec
      ? '<div class="rec">{star} ¡Nuevo récord! ' + pts + ' puntos</div>'
      : '<div class="sub">Récord: ' + (S.best || 0) + ' puntos</div>') +
    '<div class="grid"><div><b>' +
    pts +
    '/' +
    GOAL +
    '</b><span>Puntos</span></div>' +
    '<div><b>' +
    G.run.dodged +
    '</b><span>Esquivados</span></div>' +
    '<div><b>' +
    G.run.near +
    '</b><span>Casi-fallos</span></div>' +
    '<div><b>' +
    G.run.wpnPicks +
    '</b><span>Armas</span></div></div>' +
    '<div class="gain">+' +
    gain +
    ' {coin}' +
    (win ? '<small>incluye +25 por completar el reto</small>' : '') +
    weekend() +
    '</div>' +
    goalBlock() +
    '<div class="mini">' +
    nextGoal +
    '<div class="pbar"><i style="width:' +
    Math.min(100, prog()) +
    '%"></i></div></div>' +
    mis +
    '<button class="btn ad" data-a="x2">{play} Duplicar monedas' +
    adTag() +
    ' +' +
    gain +
    ' {coin}</button>' +
    '<button class="btn" data-a="again">Jugar otra vez</button>' +
    '<button class="btn alt" data-a="menu">Menú</button>';
  tok('endBox');
  $('end').classList.add('show');
  $('endBox')._gain = gain;
}
/* Fin de Supervivencia: tiempo, nivel y top 5 de mejores tiempos */
function finishSurv() {
  const secs = G.t,
    gain = payout(G.run.coins);
  S.coins += gain;
  const prev = (S.topTimes || []).slice();
  const list = prev
    .concat([secs])
    .sort((a, b) => b - a)
    .slice(0, 5);
  const rank = list.indexOf(secs),
    rec = rank === 0 && (!prev.length || secs > prev[0]);
  S.topTimes = list;
  if (G.run.bossKills) S.bossWins = (S.bossWins || 0) + G.run.bossKills;
  save();
  const mis = missionBlock(countRun()),
    cup = cupBlock(secs);
  const rows = list
    .map(
      (v, i) =>
        '<div class="' +
        (i === rank ? 'me' : '') +
        '"><span>' +
        ['{medal1}', '{medal2}', '{medal3}', '4.', '5.'][i] +
        ' ' +
        (i === rank ? 'Esta partida' : '') +
        '</span><b>' +
        fmt(v) +
        '</b></div>',
    )
    .join('');
  const next = list[rank > 0 ? rank - 1 : 0];
  $('endBox').innerHTML =
    '<div class="big">{timer} Aguantaste ' +
    fmt(secs) +
    '</div>' +
    (rec
      ? '<div class="rec">{star} ¡Nuevo récord!</div>'
      : rank > 0
        ? '<div class="sub">Te faltaron ' + Math.ceil(next - secs) + ' s para subir al puesto ' + rank + '</div>'
        : '<div class="sub">Récord: ' + fmt(list[0]) + '</div>') +
    '<div class="grid"><div><b>' +
    level() +
    '</b><span>Nivel</span></div>' +
    '<div><b>' +
    G.run.dodged +
    '</b><span>Esquivados</span></div>' +
    '<div><b>' +
    G.run.kills +
    '</b><span>Naves</span></div>' +
    '<div><b>' +
    G.run.wpnPicks +
    '</b><span>Armas</span></div></div>' +
    (G.run.bossKills
      ? '<div class="rec">{swords} ' +
        (G.run.bossKills === 1 ? 'Derribaste un jefe' : 'Derribaste ' + G.run.bossKills + ' jefes') +
        '</div>'
      : '') +
    '<div class="top"><b>Tus mejores tiempos</b>' +
    rows +
    '</div>' +
    cup +
    '<div class="gain">+' +
    gain +
    ' {coin}' +
    weekend() +
    '</div>' +
    goalBlock() +
    mis +
    (gain > 0
      ? '<button class="btn ad" data-a="x2">{play} Duplicar monedas' + adTag() + ' +' + gain + ' {coin}</button>'
      : '') +
    '<button class="btn surv" data-a="endless">{timer} Intentar de nuevo</button>' +
    '<button class="btn alt" data-a="menu">Menú</button>';
  tok('endBox');
  $('end').classList.add('show');
  $('endBox')._gain = gain;
}
export function bootEndScreens() {
  $('endBox').addEventListener('click', (e) => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    const a = b.dataset.a;
    if (a === 'again') startRun();
    else if (a === 'endless') startRun('endless');
    else if (a === 'space') startRun('space');
    else if (a === 'boss') startRun('boss');
    else if (a === 'menu') backToMenu();
    else if (a === 'x2') {
      const gain = $('endBox')._gain || 0;
      showAd('Recompensa: duplicar las monedas de esta partida (+' + gain + ' {coin})', () => {
        S.coins += gain;
        save();
        emit('reward');
        b.disabled = true;
        b.innerHTML = T('{check} Monedas duplicadas');
      });
    }
  });
}

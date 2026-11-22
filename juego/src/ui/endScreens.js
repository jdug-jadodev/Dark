/** Pantallas de fin de partida de cada modo, con récords y duplicar monedas. */
import { emit } from '../core/events.js';
import { G } from '../core/state.js';
import { BOSS_UNLOCK, GOAL, MINI_AT } from '../core/config.js';
import { goal, level, prog } from '../core/difficulty.js';
import { S, save } from '../core/profile.js';
import { doubleCoins, payout } from '../core/season.js';
import { fmt } from '../core/util.js';
import { SPC, km } from '../game/space.js';
import { adTag, showAd } from './ads.js';
import { challenge, cupBlock, duelAction } from './cup.js';
import { countRun, missionBlock } from './daily.js';
import { $, tok } from './dom.js';
import { T } from './icons.js';
import { openWorlds, playWorld } from './worlds.js';
import { nextWorld, winWorld } from '../core/worlds.js';
import { replay } from './tracks.js';
import { goalBlock } from './news.js';
import { xpBlock } from './pilot.js';
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
    dmg = Math.round((1 - b.hp / b.max) * 100),
    w = G.run.world,
    /* vencer al jefe completa el mundo: { first, coins }. En modo demo no cuenta. */
    won = win && w && !G.run.invincible ? winWorld(w) : null,
    next = w ? nextWorld(w) : null;
  const gain = payout((win ? (won ? won.coins : 100) : Math.round(dmg * 0.5)) + G.run.coins);
  S.coins += gain;
  if (win) S.bossWins = (S.bossWins || 0) + 1;
  save();
  $('endBox').innerHTML =
    '<div class="big">' +
    (win
      ? w
        ? won
          ? '{trophy} ¡' + w.name + ' completado!'
          : '{trophy} ¡' + b.name + ' derrotado!'
        : '{trophy} ¡Jefe derrotado!'
      : '{skull} ' + (b.name || 'El jefe') + (b.form === 'devourer' ? ' te tragó' : ' te venció')) +
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
    (win
      ? won && won.first
        ? '<small>premio por completar el mundo</small>'
        : '<small>cofre del jefe</small>'
      : '<small>según el daño que hiciste</small>') +
    weekend() +
    '</div>' +
    xpBlock(win) +
    goalBlock() +
    '<div class="mini">' +
    (win
      ? w
        ? !won
          ? 'En modo demo el mundo no cuenta como completado: para abrir el siguiente hay que vencer al jefe de verdad.'
          : next
            ? (won.first ? '{sparkle} Se abrió un mundo nuevo: ' : 'Siguiente mundo: ') + next.name + '.'
            : 'Completaste todos los mundos que hay por ahora. Vienen más.'
        : 'Siguiente: un jefe nuevo por zona, con ataques distintos (en el juego real).'
      : 'Tip: el jefe cambia de ataque al azar; quédate cerca de las armas que caen y no te quedes quieto.') +
    '</div>' +
    '<button class="btn ad" data-a="x2">{play} Duplicar monedas' +
    adTag() +
    ' +' +
    gain +
    ' {coin}</button>' +
    (win && next ? '<button class="btn" data-a="nextworld">{play} Ir a ' + next.name + '</button>' : '') +
    '<button class="btn' +
    (win && next ? ' alt' : '') +
    '" data-a="boss">{swords} ' +
    (win ? 'Pelear otra vez' : 'Reintentar') +
    '</button>' +
    (w ? '<button class="btn alt" data-a="worlds">{rocket} Mundos</button>' : '') +
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
    xpBlock() +
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
  const w = G.run.world;
  const nextGoal = w
    ? 'Te faltaron ' + Math.max(0, Math.ceil(goal() - G.run.pts)) + ' puntos para llegar a ' + w.boss.name + '.'
    : !G.run.miniDone
      ? 'Te faltaron ' + Math.max(0, Math.ceil((GOAL * MINI_AT) / 100 - G.run.pts)) + ' puntos para el jefe intermedio.'
      : 'Te faltaron ' + Math.max(0, Math.ceil(GOAL - G.run.pts)) + ' puntos para el jefe final.';
  $('endBox').innerHTML =
    '<div class="big">{boom} ' +
    (w ? 'No llegaste al jefe' : 'Partida terminada') +
    '</div>' +
    (w ? '<div class="sub">' + w.icon + ' ' + w.name + '</div>' : '') +
    (rec
      ? '<div class="rec">{star} ¡Nuevo récord! ' + pts + ' puntos</div>'
      : '<div class="sub">Récord: ' + (S.best || 0) + ' puntos</div>') +
    '<div class="grid"><div><b>' +
    pts +
    '/' +
    goal() +
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
    xpBlock() +
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
    (w ? '<button class="btn alt" data-a="worlds">{rocket} Mundos</button>' : '') +
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
    (G.run.kind === 'duel'
      ? '<div class="sub">{swords} Reto' +
        (G.run.duel && G.run.duel.rival ? ' contra ' + G.run.duel.rival.nick : ' nuevo') +
        '</div>'
      : '') +
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
    xpBlock() +
    goalBlock() +
    mis +
    (gain > 0
      ? '<button class="btn ad" data-a="x2">{play} Duplicar monedas' + adTag() + ' +' + gain + ' {coin}</button>'
      : '') +
    '<button class="btn surv" data-a="endless">{timer} Intentar de nuevo</button>' +
    (G.run.invincible || G.run.kind === 'duel'
      ? '' // el reto trae su propio botón para enviarlo
      : '<button class="btn alt" data-a="share">{share} Retar a mis amigos</button>') +
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
    else if (a === 'endless') replay();
    else if (a === 'space') startRun('space');
    else if (a === 'boss') startRun('boss');
    else if (a === 'menu') backToMenu();
    else if (a === 'worlds') {
      backToMenu();
      openWorlds();
    } else if (a === 'nextworld') playWorld(nextWorld(G.run.world));
    else if (a === 'share') challenge(b, Math.floor(G.t), G.run.kind);
    else if (a === 'duelshare' || a === 'duelretry') duelAction(a, b);
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

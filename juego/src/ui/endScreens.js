/** Pantallas de fin de partida de cada modo, con récords y duplicar monedas. */
import { emit } from '../core/events.js';
import { G } from '../core/state.js';
import { BOSS_UNLOCK, GOAL, MINI_AT } from '../core/config.js';
import { goal, level, prog } from '../core/difficulty.js';
import { tr } from '../core/i18n.js';
import { S, save } from '../core/profile.js';
import { doubleCoins, payout } from '../core/season.js';
import { esc, fmt } from '../core/util.js';
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
const weekend = () => (doubleCoins() ? '<small>' + tr('monedas dobles de fin de semana') + '</small>' : '');
/* el botón de duplicar lo ganado viendo un anuncio */
const x2Button = (gain) =>
  '<button class="btn ad" data-a="x2">' +
  tr('{play} Duplicar monedas{ad} +{n} {coin}', { ad: adTag(), n: gain }) +
  '</button>';
/* un rótulo de la cuadrícula de números */
const cell = (value, label) => '<div><b>' + value + '</b><span>' + label + '</span></div>';
const menuButton = () => '<button class="btn alt" data-a="menu">' + tr('Menú') + '</button>';
const worldsButton = () => '<button class="btn alt" data-a="worlds">' + tr('{rocket} Mundos') + '</button>';
/* los apodos los escriben otros jugadores: nunca van como HTML */
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
          ? tr('{trophy} ¡{name} completado!', { name: w.name })
          : tr('{trophy} ¡{name} derrotado!', { name: b.name })
        : tr('{trophy} ¡Jefe derrotado!')
      : b.name
        ? b.form === 'devourer'
          ? tr('{skull} {name} te tragó', { name: b.name })
          : tr('{skull} {name} te venció', { name: b.name })
        : b.form === 'devourer'
          ? tr('{skull} El jefe te tragó')
          : tr('{skull} El jefe te venció')) +
    '</div>' +
    '<div class="grid">' +
    cell(Math.floor(G.run.bt) + ' s', tr('Tiempo')) +
    cell(dmg + '%', tr('Daño al jefe')) +
    cell(G.run.wpnPicks, tr('Armas')) +
    cell(S.bossWins || 0, tr('Victorias')) +
    '</div>' +
    '<div class="gain">+' +
    gain +
    ' {coin}' +
    '<small>' +
    (win
      ? won && won.first
        ? tr('premio por completar el mundo')
        : tr('cofre del jefe')
      : tr('según el daño que hiciste')) +
    '</small>' +
    weekend() +
    '</div>' +
    xpBlock(win) +
    goalBlock() +
    '<div class="mini">' +
    (win
      ? w
        ? !won
          ? tr(
              'En modo demo el mundo no cuenta como completado: para abrir el siguiente hay que vencer al jefe de verdad.',
            )
          : next
            ? won.first
              ? tr('{sparkle} Se abrió un mundo nuevo: {name}.', { name: next.name })
              : tr('Siguiente mundo: {name}.', { name: next.name })
            : tr('Completaste todos los mundos que hay por ahora. Vienen más.')
        : tr('Siguiente: un jefe nuevo por zona, con ataques distintos (en el juego real).')
      : tr('Tip: el jefe cambia de ataque al azar; quédate cerca de las armas que caen y no te quedes quieto.')) +
    '</div>' +
    x2Button(gain) +
    (win && next
      ? '<button class="btn" data-a="nextworld">' + tr('{play} Ir a {name}', { name: next.name }) + '</button>'
      : '') +
    '<button class="btn' +
    (win && next ? ' alt' : '') +
    '" data-a="boss">' +
    (win ? tr('{swords} Pelear otra vez') : tr('{swords} Reintentar')) +
    '</button>' +
    (w ? worldsButton() : '') +
    menuButton();
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
        (i === rank ? tr('Esta partida') : '') +
        '</span><b>' +
        v +
        ' km</b></div>',
    )
    .join('');
  const next = list[rank > 0 ? rank - 1 : 0];
  $('endBox').innerHTML =
    '<div class="big">' +
    tr('{planet} Recorriste {n} km', { n: d }) +
    '</div>' +
    (rec
      ? '<div class="rec">' + tr('{star} ¡Nuevo récord!') + '</div>'
      : rank > 0
        ? '<div class="sub">' + tr('Te faltaron {n} km para subir al puesto {rank}', { n: next - d, rank }) + '</div>'
        : '<div class="sub">' + tr('Récord: {n} km', { n: list[0] }) + '</div>') +
    '<div class="grid">' +
    cell(fmt(G.t), tr('Tiempo')) +
    cell(SPC.sector, tr('Sector')) +
    cell(SPC.near, tr('Casi')) +
    cell(Math.round(SPC.speed / 10), tr('km/s final')) +
    '</div>' +
    '<div class="top"><b>' +
    tr('Tus mejores distancias') +
    '</b>' +
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
    (gain > 0 ? x2Button(gain) : '') +
    '<button class="btn space" data-a="space">' +
    tr('{planet} Volar de nuevo') +
    '</button>' +
    menuButton();
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
    ? tr('Te faltaron {n} puntos para llegar a {name}.', {
        n: Math.max(0, Math.ceil(goal() - G.run.pts)),
        name: w.boss.name,
      })
    : !G.run.miniDone
      ? tr('Te faltaron {n} puntos para el jefe intermedio.', {
          n: Math.max(0, Math.ceil((GOAL * MINI_AT) / 100 - G.run.pts)),
        })
      : tr('Te faltaron {n} puntos para el jefe final.', { n: Math.max(0, Math.ceil(GOAL - G.run.pts)) });
  $('endBox').innerHTML =
    '<div class="big">' +
    (w ? tr('{boom} No llegaste al jefe') : tr('{boom} Partida terminada')) +
    '</div>' +
    (w ? '<div class="sub">' + w.icon + ' ' + w.name + '</div>' : '') +
    (rec
      ? '<div class="rec">' + tr('{star} ¡Nuevo récord! {n} puntos', { n: pts }) + '</div>'
      : '<div class="sub">' + tr('Récord: {n} puntos', { n: S.best || 0 }) + '</div>') +
    '<div class="grid">' +
    cell(pts + '/' + goal(), tr('Puntos')) +
    cell(G.run.dodged, tr('Esquivados')) +
    cell(G.run.near, tr('Casi-fallos')) +
    cell(G.run.wpnPicks, tr('Armas')) +
    '</div>' +
    '<div class="gain">+' +
    gain +
    ' {coin}' +
    (win ? '<small>' + tr('incluye +25 por completar el reto') + '</small>' : '') +
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
    x2Button(gain) +
    '<button class="btn" data-a="again">' +
    tr('Jugar otra vez') +
    '</button>' +
    (w ? worldsButton() : '') +
    menuButton();
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
        (i === rank ? tr('Esta partida') : '') +
        '</span><b>' +
        fmt(v) +
        '</b></div>',
    )
    .join('');
  const next = list[rank > 0 ? rank - 1 : 0];
  $('endBox').innerHTML =
    '<div class="big">' +
    tr('{timer} Aguantaste {time}', { time: fmt(secs) }) +
    '</div>' +
    (G.run.kind === 'duel'
      ? '<div class="sub">' +
        (G.run.duel && G.run.duel.rival
          ? tr('{swords} Reto contra {name}', { name: esc(G.run.duel.rival.nick) })
          : tr('{swords} Reto nuevo')) +
        '</div>'
      : '') +
    (rec
      ? '<div class="rec">' + tr('{star} ¡Nuevo récord!') + '</div>'
      : rank > 0
        ? '<div class="sub">' +
          tr('Te faltaron {n} s para subir al puesto {rank}', { n: Math.ceil(next - secs), rank }) +
          '</div>'
        : '<div class="sub">' + tr('Récord: {time}', { time: fmt(list[0]) }) + '</div>') +
    '<div class="grid">' +
    cell(level(), tr('Nivel')) +
    cell(G.run.dodged, tr('Esquivados')) +
    cell(G.run.kills, tr('Naves')) +
    cell(G.run.wpnPicks, tr('Armas')) +
    '</div>' +
    (G.run.bossKills
      ? '<div class="rec">' +
        (G.run.bossKills === 1
          ? tr('{swords} Derribaste un jefe')
          : tr('{swords} Derribaste {n} jefes', { n: G.run.bossKills })) +
        '</div>'
      : '') +
    '<div class="top"><b>' +
    tr('Tus mejores tiempos') +
    '</b>' +
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
    (gain > 0 ? x2Button(gain) : '') +
    '<button class="btn surv" data-a="endless">' +
    tr('{timer} Intentar de nuevo') +
    '</button>' +
    (G.run.invincible || G.run.kind === 'duel'
      ? '' // el reto trae su propio botón para enviarlo
      : '<button class="btn alt" data-a="share">' + tr('{share} Retar a mis amigos') + '</button>') +
    menuButton();
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
      showAd(tr('Recompensa: duplicar las monedas de esta partida (+{n} {coin})', { n: gain }), () => {
        S.coins += gain;
        save();
        emit('reward');
        b.disabled = true;
        b.innerHTML = T(tr('{check} Monedas duplicadas'));
      });
    }
  });
}

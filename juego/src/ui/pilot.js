/**
 * Rango de piloto en pantalla: la insignia del lobby, la escalera de medallas de Métricas y la
 * experiencia al terminar una partida (la barra se llena a la vista, y cada nivel o ascenso se celebra).
 */
import { emit } from '../core/events.js';
import { RARITY } from '../core/parts.js';
import { MEDALS, addXp, medalOf, nextMedalLevel, pilot, rewardOf, runXp } from '../core/pilot.js';
import { G } from '../core/state.js';
import { $ } from './dom.js';
import { T } from './icons.js';

const pct = (p) => Math.round((p.have / p.need) * 100);

/* ---------- lobby ---------- */
export function renderPilot() {
  const p = pilot();
  $('pLvl').innerHTML = T(
    p.medal.icon +
      '<span><b>' +
      p.medal.label +
      '</b> nivel ' +
      p.lv +
      '<i class="bar"><i style="width:' +
      pct(p) +
      '%"></i></i></span>',
  );
}

/* ---------- métricas: la escalera de medallas ---------- */
export function pilotStats() {
  const p = pilot(),
    next = nextMedalLevel(p.lv),
    r = rewardOf(next);
  return (
    '<div class="rankbox"><div class="rankbig">' +
    p.medal.icon +
    '</div><b>' +
    p.medal.label +
    '</b><small>Nivel ' +
    p.lv +
    ' · ' +
    p.have +
    ' / ' +
    p.need +
    ' de experiencia</small><div class="pbar"><i style="width:' +
    pct(p) +
    '%"></i></div></div><div class="ladder">' +
    MEDALS.map(
      (m, i) =>
        '<div class="' +
        (i === p.medal.tier ? 'now' : i < p.medal.tier ? 'got' : '') +
        '">{rank' +
        i +
        '}<span>' +
        m.name +
        '</span><small>nivel ' +
        m.from +
        '</small></div>',
    ).join('') +
    '</div><div class="top"><div><span>Al subir de nivel</span><b>+' +
    rewardOf(p.lv + 1).coins +
    ' {coin}</b></div><div><span>' +
    /* en la última medalla ya no hay ascenso, pero cada cinco niveles sigue llegando una pieza */
    (medalOf(next).tier !== p.medal.tier
      ? 'Ascenso a ' + medalOf(next).name + ' (nivel ' + next + ')'
      : 'Al llegar al nivel ' + next) +
    '</span><b>una pieza ' +
    r.rarity +
    '</b></div></div>'
  );
}

/* ---------- al terminar una partida ---------- */
let anim = 0; // cuál animación está corriendo (si el jugador sale de la pantalla, la vieja se detiene)
/**
 * Suma la experiencia de la partida y devuelve el bloque para la pantalla de fin. El bloque
 * arranca mostrando cómo estaba el piloto ANTES de la partida; un momento después la barra se
 * llena hasta donde quedó. En modo demo no hay experiencia (devuelve vacío). won = venció al jefe final.
 */
export function xpBlock(won) {
  const R = G.run;
  if (R.invincible) return '';
  const r = addXp(runXp({ time: G.t, kills: R.kills, bosses: R.bossKills, won })),
    b = r.before;
  const id = ++anim;
  setTimeout(() => play(id, r), 450);
  return (
    '<div class="mini xpline" id="xpLine"><div class="xphead"><span class="xpmedal" id="xpMedal">' +
    b.medal.icon +
    '</span><span><b id="xpName">' +
    b.medal.label +
    '</b><small id="xpLv">Nivel ' +
    b.lv +
    '</small></span><em>+<span id="xpNum">0</span> de experiencia</em></div><div class="pbar"><i id="xpBar" style="width:' +
    pct(b) +
    '%"></i></div><div id="xpUps"></div></div>'
  );
}
const wait = (ms) => new Promise((ok) => setTimeout(ok, ms));
/* La animación: la barra se llena; al llegar al tope sube el nivel (la medalla salta y suena),
   y si además cambia de medalla aparece el ascenso en grande. */
async function play(id, r) {
  const bar = $('xpBar'),
    alive = () => id === anim && bar && bar.isConnected;
  if (!alive()) return;
  /* el número de experiencia sube contando */
  const STEPS = 14;
  for (let i = 1; i <= STEPS; i++)
    setTimeout(() => alive() && ($('xpNum').textContent = Math.round((r.xp * i) / STEPS)), i * 55);
  for (const up of r.ups) {
    bar.style.width = '100%';
    await wait(780);
    if (!alive()) return;
    /* subió de nivel: la medalla salta, la barra destella y vuelve a empezar */
    emit('reward');
    $('xpMedal').innerHTML = T(up.medal.icon);
    $('xpName').textContent = up.medal.label;
    $('xpLv').textContent = 'Nivel ' + up.lv;
    restart($('xpMedal'), 'pop');
    restart($('xpLine'), 'flash');
    $('xpUps').insertAdjacentHTML(
      'beforeend',
      T(
        '<div class="rec xpup">{party} ' +
          (up.promoted ? '¡Ascenso a ' + up.medal.name + '!' : '¡Nivel ' + up.lv + '!') +
          ' +' +
          up.coins +
          ' {coin}' +
          (up.piece ? ' y una pieza: ' + up.piece.name + ' (' + RARITY[up.piece.rar].name + ')' : '') +
          '</div>',
      ),
    );
    if (up.promoted) {
      await promote(up, alive);
      if (!alive()) return;
    }
    bar.classList.add('snap'); // de vuelta a cero sin animación
    bar.style.width = '0%';
    void bar.offsetWidth;
    bar.classList.remove('snap');
    await wait(140);
    if (!alive()) return;
  }
  bar.style.width = pct(r.after) + '%';
}
/* vuelve a disparar una animación de CSS */
function restart(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}
/* el ascenso de medalla, en grande sobre la tarjeta: se cierra solo o con un toque */
function promote(up, alive) {
  return new Promise((done) => {
    const box = document.createElement('div');
    box.className = 'promo';
    box.innerHTML = T(
      '<i class="rays"></i><div class="promedal">' +
        up.medal.icon +
        '</div><small>ASCENSO</small><b>' +
        up.medal.label +
        '</b><span>+' +
        up.coins +
        ' {coin}' +
        (up.piece ? '<br>Pieza nueva: ' + up.piece.name + ' (' + RARITY[up.piece.rar].name + ')' : '') +
        '</span><em>Toca para seguir</em>',
    );
    const close = () => {
      if (!box.isConnected) return;
      box.remove();
      done();
    };
    box.addEventListener('click', (e) => {
      e.stopPropagation(); // el toque es para cerrar el ascenso, no para los botones de debajo
      close();
    });
    if (!alive()) return done();
    $('xpLine').closest('.card').appendChild(box);
    emit('win');
    setTimeout(close, 3200);
  });
}

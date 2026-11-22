/** El mapa de mundos: se abre con el botón "Mundos" del lobby y deja elegir a cuál entrar. */
import { G } from '../core/state.js';
import { WORLDS, currentWorld, worldOf, worldOpen, worldWins, worldsDone } from '../core/worlds.js';
import { $ } from './dom.js';
import { startRun } from './flow.js';
import { T } from './icons.js';

/* A un mundo se entra si está abierto. En modo demo se entra a todos, para verlos: ahí no se
   muere y vencer al jefe no cuenta (el mundo sigue por abrir de verdad). */
const canEnter = (w) => w.ready && (worldOpen(w) || G.demo);
/* el botón del lobby: el mundo que toca y cuántos van */
export function renderWorldButton() {
  const w = currentWorld();
  $('worldSub').textContent = w.name + ' · ' + worldsDone() + ' de ' + WORLDS.length + ' completados';
}
function render() {
  $('worldBox').innerHTML = T(
    '<h2>{rocket} Mundos</h2><div class="sub">Cada mundo tiene su paisaje, sus enemigos y un jefe. Vence al jefe para abrir el siguiente.</div>' +
      WORLDS.map((w, i) => {
        const wins = worldWins(w.id),
          open = canEnter(w),
          prev = WORLDS[i - 1];
        const state = !w.ready
          ? 'Próximamente'
          : !open
            ? '{lock} Vence al jefe de ' + prev.name
            : wins
              ? '{check} Jefe vencido' + (wins > 1 ? ' ×' + wins : '') + ' · jugar de nuevo'
              : worldOpen(w)
                ? '{play} Jugar'
                : '{play} Ver en modo demo';
        return (
          '<button class="wcard w-' +
          w.id +
          (open ? '' : w.ready ? ' locked' : ' soon') +
          '" data-world="' +
          w.id +
          '"' +
          (open ? '' : ' disabled') +
          '><i>' +
          w.icon +
          '</i><span><b>' +
          (i + 1) +
          ' · ' +
          w.name +
          '</b><small>' +
          w.tag +
          '</small><em>' +
          state +
          '</em></span></button>'
        );
      }).join('') +
      '<button class="btn alt" data-world="">Cerrar</button>',
  );
}
export function openWorlds() {
  render();
  $('worlds').classList.add('show');
}
/* devuelve true si estaba abierto (para el botón "atrás" del sistema) */
export function closeWorlds() {
  if (!$('worlds').classList.contains('show')) return false;
  $('worlds').classList.remove('show');
  return true;
}
/* entrar a un mundo */
export function playWorld(w) {
  G.nextWorld = w;
  closeWorlds();
  startRun();
}
export function bootWorldMap() {
  $('play').addEventListener('click', openWorlds);
  $('worldBox').addEventListener('click', (e) => {
    const b = e.target.closest('[data-world]');
    if (!b) return;
    const w = worldOf(b.dataset.world);
    if (!w) closeWorlds();
    else if (canEnter(w)) playWorld(w);
  });
}

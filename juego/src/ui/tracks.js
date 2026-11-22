/**
 * Cómo empieza una partida de Supervivencia: en una pista al azar (la de siempre) o en una pista
 * con semilla (un reto entre amigos). La semilla de la próxima partida queda en G.nextSeed.
 */
import { duelOf, newSeed } from '../core/duel.js';
import { S } from '../core/profile.js';
import { G } from '../core/state.js';
import { worldOf } from '../core/worlds.js';
import { startRun } from './flow.js';

/* Supervivencia normal: pista al azar, en el mapa que se diga ('azar' o el id de un mundo); si no
   se dice, en el último que se eligió */
export function playSurvival(choice) {
  const w = worldOf(choice || S.survMap || 'azar'); // null si es 'azar'
  G.nextSeed = null;
  G.nextKind = null;
  G.nextMap = !w ? undefined : w.look ? w : null;
  startRun('endless');
}
/* un reto nuevo: una pista recién elegida; al terminar se crea el reto con el tiempo que se haga */
export function playNewDuel() {
  G.nextSeed = newSeed();
  G.nextKind = 'duel';
  G.nextDuel = null;
  G.nextMap = undefined; // en un reto el mapa sale de la semilla
  startRun('endless');
}
/* un reto que ya existe: su misma pista, contra el mejor tiempo de los demás */
export function playDuel(d) {
  G.nextSeed = d.seed;
  G.nextKind = 'duel';
  G.nextDuel = { code: d.code, rival: d.rival };
  G.nextMap = undefined;
  startRun('endless');
}
/* "intentar de nuevo": lo mismo que se acaba de jugar */
export function replay() {
  const d = G.run.kind === 'duel' && G.run.duel && duelOf(G.run.duel.code);
  if (d) playDuel(d);
  else playSurvival();
}

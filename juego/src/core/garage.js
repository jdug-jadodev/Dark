/**
 * El hangar del jugador: qué piezas tiene, cuáles lleva puestas y cuál se está probando en el taller.
 *
 * En el perfil guardado solo se escribe cuando el jugador compra o equipa algo:
 *   S.parts = piezas compradas (las de serie no se guardan, siempre se tienen)
 *   S.fit   = pieza puesta en cada ranura, p. ej. { paint: 'paint.fuego' }
 * Lo que falte ahí vale "la pieza de serie", así un guardado viejo sigue sirviendo.
 */
import { BASE, PARTS, SLOTS, priceOf } from './parts.js';
import { S, save } from './profile.js';
import { G } from './state.js';

let preview = null; // pieza que se está mirando en el taller sin haberla equipado
let version = 0; // sube cada vez que cambia el aspecto: quien dibuja la nave sabe que debe rehacerla

export const lookVersion = () => version;
export const owns = (id) => BASE[PARTS[id].slot] === id || (S.parts || []).includes(id);
/* en modo demo se puede equipar todo para verlo; al quitar el modo demo vuelve lo que sí se tiene */
export const canUse = (id) => owns(id) || G.demo;
export function equippedId(slot) {
  const id = S.fit && S.fit[slot];
  return id && PARTS[id] && PARTS[id].slot === slot && canUse(id) ? id : BASE[slot];
}
/* lo que se ve en la nave: lo equipado, más la pieza que se esté probando */
export const shownId = (slot) => (preview && preview.slot === slot ? preview.id : equippedId(slot));
export function look() {
  const out = {};
  for (const s of SLOTS) out[s.id] = PARTS[shownId(s.id)];
  return out;
}

export function setPreview(id) {
  preview = id ? { slot: PARTS[id].slot, id } : null;
  version++;
}
export function equip(id) {
  if (!canUse(id)) return false;
  const slot = PARTS[id].slot;
  S.fit = { ...(S.fit || {}), [slot]: id };
  if (preview && preview.slot === slot) preview = null;
  version++;
  save();
  return true;
}
export function buy(id) {
  const price = priceOf(PARTS[id]);
  if (owns(id) || S.coins < price) return false;
  S.coins -= price;
  S.parts = [...(S.parts || []), id];
  return equip(id);
}
/* el modo demo cambió: puede cambiar lo que se ve */
export function touchLook() {
  version++;
}

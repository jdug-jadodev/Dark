/**
 * Rango de piloto: cada partida da experiencia, y cada nivel nuevo paga un premio. Así ninguna
 * partida es "en vano": aunque no haya récord, algo avanzó.
 *
 *   S.xp = experiencia total. El nivel, la medalla y lo que falta salen de ahí.
 *
 * Los niveles se agrupan en medallas: Bronce (1–4), Plata (5–9), Oro (10–14), Platino (15–19),
 * Diamante (20–24), Maestro (25–29), Leyenda (30–34) y Cósmico (35 en adelante; su insignia es
 * un agujero negro). Dentro de cada medalla se sube de I a V. Cambiar de medalla es un ascenso,
 * y trae además una pieza para la nave.
 *
 * Experiencia de una partida: 1 por cada 2 segundos aguantados, 1 por nave derribada, 30 por jefe
 * de Supervivencia y 60 por vencer al jefe final. Las partidas en modo demo no dan.
 *
 * Segunda versión (2026-11-22): el usuario vio que se subía demasiado rápido y fácil. Ahora cada
 * partida da cerca de la mitad y cada nivel cuesta más que el anterior, cada vez más. Jugando
 * seguido (unas 2.500 de experiencia por hora): Plata a la media hora, Oro a las 2 horas, Platino
 * a las 5, Diamante a las 10, Maestro a las 18, Leyenda a las 29 y Cósmico a las 44. Antes,
 * Leyenda llegaba en unas 4 horas. Quien ya tenía nivel lo conserva: ver migrate().
 * Premio de cada nivel: monedas; en cada ascenso, además una pieza (cada vez más rara).
 */
import { giftPiece } from './daily.js';
import { RARITY } from './parts.js';
import { S, save } from './profile.js';

/* experiencia para pasar del nivel lv al siguiente: 150, 230, 320, 420… cada vez sube más */
export const xpFor = (lv) => 150 + (lv - 1) * 75 + (lv - 1) * (lv - 1) * 5;
/* lo que costaba antes (primera versión): solo para convertir lo que ya se tenía */
const oldXpFor = (lv) => 80 + (lv - 1) * 40;

/* ---------- medallas ---------- */
export const MEDALS = [
  { name: 'Bronce', from: 1 },
  { name: 'Plata', from: 5 },
  { name: 'Oro', from: 10 },
  { name: 'Platino', from: 15 },
  { name: 'Diamante', from: 20 },
  { name: 'Maestro', from: 25 },
  { name: 'Leyenda', from: 30 },
  { name: 'Cósmico', from: 35 },
];
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];
/* la medalla de un nivel: { tier (0–7), name, icon, label ("Plata III") } */
export function medalOf(lv) {
  let tier = 0;
  while (tier + 1 < MEDALS.length && lv >= MEDALS[tier + 1].from) tier++;
  const step = lv - MEDALS[tier].from; // 0 = recién llegado a la medalla
  return {
    tier,
    name: MEDALS[tier].name,
    icon: '{rank' + tier + '}',
    label: MEDALS[tier].name + ' ' + (step < ROMAN.length ? ROMAN[step] : step + 1),
  };
}
/* el nivel de hoy: { lv, have (experiencia dentro del nivel), need, medal } */
const levelAt = (xp, cost = xpFor) => {
  let lv = 1,
    have = xp;
  while (have >= cost(lv)) {
    have -= cost(lv);
    lv++;
  }
  return { lv, have, need: cost(lv), medal: medalOf(lv) };
};
/* Al cambiar lo que cuesta cada nivel, quien ya había subido conserva su nivel y lo que llevaba
   de él: su experiencia se convierte una sola vez a la escala nueva (S.xpV dice en cuál está). */
function migrate() {
  if (S.xpV === 2) return;
  if (S.xp) {
    const old = levelAt(S.xp, oldXpFor);
    let xp = Math.floor((old.have / old.need) * xpFor(old.lv));
    for (let lv = 1; lv < old.lv; lv++) xp += xpFor(lv);
    S.xp = xp;
  }
  S.xpV = 2;
}
export const pilot = () => {
  migrate();
  return levelAt(S.xp || 0);
};

/* ---------- premios ---------- */
/* la rareza de la pieza que regala un nivel (los ascensos), o null si ese nivel solo da monedas */
const pieceAt = (lv) => (lv % 5 ? null : lv >= 20 ? 'l' : lv >= 10 ? 'e' : 'r');
const coinsAt = (lv) => 40 + lv * 10;
/* el premio de llegar a un nivel, para mostrarlo: { coins, rarity (nombre, o '' si no hay pieza) } */
export function rewardOf(lv) {
  const rar = pieceAt(lv);
  return { coins: coinsAt(lv), rarity: rar ? RARITY[rar].name.toLowerCase() : '' };
}
/* el próximo nivel que es un ascenso de medalla */
export const nextMedalLevel = (lv) => lv + (5 - (lv % 5));

/* ---------- sumar una partida ---------- */
/* stats = { time, kills, bosses, won } */
export const runXp = (st) =>
  Math.max(3, Math.round((st.time || 0) * 0.5 + (st.kills || 0) + (st.bosses || 0) * 30 + (st.won ? 60 : 0)));
/**
 * Suma la experiencia de una partida y paga los niveles que se suban.
 * Devuelve { xp, before, after, ups: [{ lv, medal, promoted, coins, piece }] } para poder mostrarlo.
 */
export function addXp(xp) {
  const before = pilot();
  S.xp = (S.xp || 0) + xp;
  const after = pilot(),
    ups = [];
  for (let lv = before.lv + 1; lv <= after.lv; lv++) {
    const coins = coinsAt(lv),
      rar = pieceAt(lv),
      medal = medalOf(lv);
    S.coins += coins;
    ups.push({
      lv,
      medal,
      promoted: medal.tier !== medalOf(lv - 1).tier, // cambió de medalla
      coins,
      piece: rar ? giftPiece([rar], 'piloto ' + lv) : null,
    });
  }
  save();
  return { xp, before, after, ups };
}

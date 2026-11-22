/** Perfil del jugador (monedas, récords, control elegido) y su guardado. */
import { Platform } from '../platform/platform.js';
export const S = {
  coins: 100,
  owned: ['aurora'],
  sel: 'aurora',
  mission: 0,
  mPaid: false,
  streak: 3,
  boss: false,
  bossWins: 0,
  best: 0,
  ctrl: 'swipe',
  volMusic: 100, // volúmenes de 0 a 100
  volSfx: 100,
  topTimes: [],
  topSpace: [],
};
export function bootProfile() {
  {
    const x = Platform.load();
    if (x) {
      Object.assign(S, x);
      /* guardados anteriores: el sonido era encendido/apagado, ahora son dos volúmenes */
      if (x.sound === false) S.volMusic = S.volSfx = 0;
      else if (x.music === false) S.volMusic = 0;
      delete S.sound;
      delete S.music;
    }
  }
}
/* Guardar el perfil. Quien necesite enterarse de cada guardado (la cuenta, para subirlo a la
   nube) se apunta con onSave. saveQuiet guarda sin avisar: lo usa la cuenta para sus propias notas. */
const savers = [];
export const onSave = (fn) => savers.push(fn);
export const saveQuiet = () => Platform.save(S);
export const save = () => {
  for (const fn of savers) fn();
  Platform.save(S);
};

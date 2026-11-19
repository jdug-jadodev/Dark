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
export const save = () => Platform.save(S);

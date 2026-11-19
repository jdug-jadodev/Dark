/** Esperas dentro del bucle del juego (reemplazan a setTimeout). */
/* Esperas del juego. Van dentro del bucle (no con setTimeout/setInterval) porque en el
   celular el navegador posterga esos temporizadores mientras hay un dedo moviéndose
   en la pantalla, y la cuenta regresiva se quedaba atorada. */
export const timers = [];
export function after(seconds, fn) {
  timers.push({
    t: seconds,
    fn,
  });
}
export function tickTimers(dt) {
  for (let i = timers.length - 1; i >= 0; i--) {
    const q = timers[i];
    q.t -= dt;
    if (q.t <= 0) {
      timers.splice(i, 1);
      q.fn();
    }
  }
}

/**
 * Avisos de lo que pasa en la partida ("se recogió una moneda", "chocó", "apareció el jefe").
 * La lógica solo avisa con emit(); quien quiera reaccionar (hoy el sonido) se suscribe con on().
 * Así la lógica no conoce al sonido, y más adelante tampoco a la interfaz.
 */
const listeners = [];
export function on(fn) {
  listeners.push(fn);
}
export function emit(name, data) {
  for (const fn of listeners) fn(name, data);
}

/**
 * Recordatorio diario: un aviso del teléfono si un día no se ha jugado. Solo existe dentro de la
 * app (en el navegador no hay avisos). Las reglas de cuándo avisar están en Kotlin (Reminders.kt);
 * aquí solo se enciende, se apaga y se le cuenta la racha para que el aviso la nombre.
 */
import { S, save } from '../core/profile.js';
import { Platform } from '../platform/platform.js';

const listeners = [];
let told = -1;

export const reminderAvailable = () => Platform.reminder.available;
export const reminderOn = () => Platform.reminder.on();
/* ¿vale la pena ofrecerlo? (existe, está apagado y el jugador aún no ha dicho que no) */
export const reminderOffer = () => reminderAvailable() && !reminderOn() && !S.remAsked;
/* Encender o apagar. Encenderlo puede abrir la pregunta de permiso de Android: la respuesta
   llega después, por window.__giroReminder. */
export function setReminder(on) {
  S.remAsked = true; // ya se le ofreció: no se insiste más desde el cofre
  save();
  Platform.reminder.set(on);
}
/* la racha de hoy, para el texto del aviso (solo se envía cuando cambia) */
export function tellStreak(days) {
  if (days === told) return;
  told = days;
  Platform.reminder.streak(days);
}
/* avisa cuando cambia (para repintar la configuración y el cofre) */
export const onReminderChange = (fn) => listeners.push(fn);
export function bootReminder() {
  window.__giroReminder = () => listeners.forEach((fn) => fn());
}

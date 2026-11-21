/** Fechas según el calendario del teléfono: la semana (de lunes a domingo) y un número fijo a partir de un texto. */
const two = (n) => String(n).padStart(2, '0');
const monday = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
};
/* la semana se nombra por la fecha de su lunes */
export function weekKey() {
  const m = monday();
  return m.getFullYear() + '-' + two(m.getMonth() + 1) + '-' + two(m.getDate());
}
/* segundos que faltan para que termine (lunes a medianoche) */
export function weekEnds() {
  const m = monday();
  return Math.max(0, Math.round((new Date(m.getFullYear(), m.getMonth(), m.getDate() + 7) - new Date()) / 1000));
}
/* un número fijo a partir de un texto: lo que toca hoy o esta semana sale de la fecha, no del azar */
export const hash = (text) => {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
};

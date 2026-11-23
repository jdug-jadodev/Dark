/**
 * La pantalla del estudio: «IANEJ» sobre negro al abrir el juego, antes del menú.
 *
 * El dibujo y la animación están en index.html y estilos.css (#studio); aquí solo se decide
 * cuándo empieza y cuándo se quita:
 *   - Empieza cuando el juego ya arrancó y el teléfono dejó de estar ocupado. Antes solo se ve
 *     negro; si empezara mientras se arma el menú (los primeros cuadros son los más pesados),
 *     las letras se dibujarían a saltos.
 *   - Sale una vez por apertura. Si el juego se reinicia solo (al cambiar de idioma o al traer
 *     el progreso de la cuenta), no se repite.
 *   - Pase lo que pase se quita: nunca puede quedarse tapando el juego.
 */
const SEEN = 'giro_studio'; // en sessionStorage: se borra sola al cerrar la app
const SMOOTH = 40; // ms entre dos cuadros seguidos para dar al teléfono por desocupado
const WAIT = 2000; // ms: lo más que se espera a que se desocupe antes de empezar igual
const SHOW = 4500; // ms: la animación dura 3,25 s; pasado esto se quita aunque no haya avisado
const LIMIT = 8000; // ms desde el arranque: se quita aunque nunca haya empezado

export function bootStudio() {
  const el = document.getElementById('studio');
  if (!el) return;
  let seen = false;
  try {
    seen = sessionStorage.getItem(SEEN) === '1';
    sessionStorage.setItem(SEEN, '1');
  } catch (e) {}
  if (seen) return el.remove();
  const done = () => el.remove();
  el.addEventListener('animationend', (e) => {
    if (e.target === el) done(); // terminó de desvanecerse (las letras también avisan: esas no cuentan)
  });
  /* Esto se llama antes del arranque, que tiene ocupado al teléfono un buen rato: nada de lo de
     abajo corre hasta que el arranque termina (o falla). Los plazos se cuentan desde ahí, no
     desde ahora; si no, en un teléfono lento se quitaría sin haberse visto. */
  setTimeout(() => setTimeout(done, LIMIT), 0);
  let first = 0,
    last = 0;
  const frame = (ts) => {
    if (!el.isConnected) return;
    if (!first) first = ts;
    if ((last && ts - last < SMOOTH) || ts - first > WAIT) {
      el.classList.add('run');
      setTimeout(done, SHOW);
      return;
    }
    last = ts;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

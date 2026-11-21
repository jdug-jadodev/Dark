/** Puente con la plataforma: guardado y vibración. En la app usa window.GiroNative (Kotlin); en el navegador, localStorage. */
let NATIVE;
export let Platform;
export function bootPlatform() {
  /* ---------- Plataforma ----------
     Este mismo archivo corre en el navegador (laboratorio) y dentro de la app Android.
     En la app existe window.GiroNative (puente con Kotlin): guardado nativo, vibración y registro.
     En el navegador no existe y se usa localStorage. */
  NATIVE = window.GiroNative || null;
  Platform = {
    load() {
      try {
        return JSON.parse((NATIVE ? NATIVE.loadState() : localStorage.getItem(SAVE_KEY)) || 'null');
      } catch (e) {
        return null;
      }
    },
    save(data) {
      try {
        const j = JSON.stringify(data);
        if (NATIVE) NATIVE.saveState(j);
        else localStorage.setItem(SAVE_KEY, j);
      } catch (e) {}
    },
    haptic(ms) {
      try {
        if (NATIVE) NATIVE.haptic(ms);
      } catch (e) {}
    },
    /* qué tan caliente está el teléfono: 0 normal · 1 tibio · 2 caliente · 3 o más, muy caliente.
       En el navegador no se puede saber: siempre 0. */
    heat() {
      try {
        return NATIVE && NATIVE.heat ? NATIVE.heat() : 0;
      } catch (e) {
        return 0;
      }
    },
    /* una petición al servidor del juego (con datos = enviar; sin datos = solo pedir).
       Devuelve lo que contestó, o null si no hay conexión o algo falló. Se envía como texto
       simple para que el navegador no haga una consulta previa. */
    async net(url, data) {
      try {
        const stop = new AbortController(),
          timer = setTimeout(() => stop.abort(), 7000);
        const r = await fetch(
          url,
          data ? { method: 'POST', body: JSON.stringify(data), signal: stop.signal } : { signal: stop.signal },
        );
        clearTimeout(timer);
        return r.ok ? await r.json() : null;
      } catch (e) {
        return null;
      }
    },
    /* un identificador al azar para esta instalación (no sale del azar del juego) */
    randomId() {
      const b = new Uint8Array(12);
      crypto.getRandomValues(b);
      return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    },
    /* dirección de un servidor de pruebas, si a esta app de pruebas se le configuró uno */
    testApi() {
      try {
        return (NATIVE && NATIVE.testApi && NATIVE.testApi()) || '';
      } catch (e) {
        return '';
      }
    },
    /* recordatorio diario (solo en la app): encender, apagar, preguntar y contar la racha */
    reminder: {
      available: !!(NATIVE && NATIVE.setReminder),
      on() {
        try {
          return !!(NATIVE && NATIVE.reminderOn());
        } catch (e) {
          return false;
        }
      },
      set(on) {
        try {
          if (NATIVE) NATIVE.setReminder(!!on);
        } catch (e) {}
      },
      streak(days) {
        try {
          if (NATIVE && NATIVE.noteStreak) NATIVE.noteStreak(days);
        } catch (e) {}
      },
    },
    debug: (() => {
      try {
        return !!(NATIVE && NATIVE.isDebug());
      } catch (e) {
        return false;
      }
    })(),
  };
}
const SAVE_KEY = 'giro_estelar_demo';

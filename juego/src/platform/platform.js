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
        /* 404 = lo que se pidió no existe (un código de reto equivocado): no es lo mismo que no tener conexión */
        return r.ok ? await r.json() : r.status === 404 ? { missing: true } : null;
      } catch (e) {
        return null;
      }
    },
    /* Una petición al servidor con método, datos y (si hace falta) la llave de sesión.
       Devuelve { status, data } o null si no hubo conexión. */
    async api(method, url, data, key) {
      try {
        const stop = new AbortController(),
          timer = setTimeout(() => stop.abort(), 12000),
          headers = {};
        if (data !== undefined) headers['content-type'] = 'application/json';
        if (key) headers.authorization = 'Bearer ' + key;
        const r = await fetch(url, {
          method,
          headers,
          body: data === undefined ? undefined : JSON.stringify(data),
          signal: stop.signal,
          keepalive: true, // que termine aunque el juego pase a segundo plano
        });
        clearTimeout(timer);
        let out = {};
        try {
          out = await r.json();
        } catch (e) {}
        return { status: r.status, data: out || {} };
      } catch (e) {
        return null;
      }
    },
    /* volver a arrancar el juego (después de traer otro progreso de la cuenta) */
    restart() {
      location.reload();
    },
    /* Cuenta (guardar el progreso en la nube). En la app: Google por el sistema de Android, y
       la llave de sesión cifrada con el almacén de claves del teléfono. En el navegador solo
       existe para las pruebas (localStorage.giro_google = el número de cuenta de mentira, con
       el servidor local, que hace de Google). */
    account: {
      available() {
        try {
          return NATIVE ? !!(NATIVE.googleReady && NATIVE.googleReady()) : !!localStorage.getItem('giro_google');
        } catch (e) {
          return false;
        }
      },
      /* Le pide a Google el comprobante de quién es el jugador (nonce = el número de un solo uso
         que dio el servidor). Devuelve el comprobante, o '' si canceló o no se pudo. */
      idToken(nonce) {
        if (!NATIVE) return testIdToken(nonce);
        return new Promise((done) => {
          const timer = setTimeout(() => finish(''), 120000);
          const finish = (token) => {
            clearTimeout(timer);
            window.__giroGoogle = null;
            done(typeof token === 'string' ? token : '');
          };
          window.__giroGoogle = finish; // Android contesta por aquí
          try {
            NATIVE.googleSignIn(nonce);
          } catch (e) {
            finish('');
          }
        });
      },
      secret() {
        try {
          return (NATIVE ? NATIVE.secretGet() : localStorage.getItem('giro_session')) || '';
        } catch (e) {
          return '';
        }
      },
      setSecret(value) {
        try {
          if (NATIVE) NATIVE.secretSet(value || '');
          else if (value) localStorage.setItem('giro_session', value);
          else localStorage.removeItem('giro_session');
        } catch (e) {}
      },
    },
    /* un identificador al azar para esta instalación (no sale del azar del juego) */
    randomId() {
      const b = new Uint8Array(12);
      crypto.getRandomValues(b);
      return Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
    },
    /* Compartir un texto con otra app (WhatsApp, etc.). Devuelve 'shared' si se abrió el menú de
       compartir, 'copied' si solo se pudo copiar al portapapeles, o '' si no se pudo. */
    async share(text) {
      try {
        if (NATIVE && NATIVE.share) {
          NATIVE.share(text);
          return 'shared';
        }
        if (navigator.share) {
          await navigator.share({ text });
          return 'shared';
        }
        await navigator.clipboard.writeText(text);
        return 'copied';
      } catch (e) {
        return '';
      }
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
      cup(rank) {
        try {
          if (NATIVE && NATIVE.noteCup) NATIVE.noteCup(rank);
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
/* solo para las pruebas en el navegador: el servidor local hace de Google y firma el comprobante */
async function testIdToken(nonce) {
  try {
    const api = (localStorage.getItem('giro_api') || '').replace(/\/+$/, ''),
      sub = localStorage.getItem('giro_google');
    if (!api || !sub || sub === 'cancelar') return '';
    const r = await fetch(api + '/test/token?sub=' + encodeURIComponent(sub) + '&nonce=' + encodeURIComponent(nonce));
    return r.ok ? (await r.json()).idToken || '' : '';
  } catch (e) {
    return '';
  }
}

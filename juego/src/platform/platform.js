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

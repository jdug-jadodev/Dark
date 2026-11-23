/** Ubica el Chromium que usan las pruebas (el que descarga Playwright, o el de CHROME_PATH). */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export function findChrome() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const base = path.join(process.env.LOCALAPPDATA || '', 'ms-playwright');
  const dirs = fs.existsSync(base)
    ? fs
        .readdirSync(base)
        .filter((d) => /^chromium-\d+$/.test(d))
        .sort()
        .reverse()
    : [];
  for (const d of dirs) {
    for (const sub of ['chrome-win64', 'chrome-win']) {
      const exe = path.join(base, d, sub, 'chrome.exe');
      if (fs.existsSync(exe)) return exe;
    }
  }
  return undefined; // deja que Playwright busque el suyo
}

/**
 * Una copia de la página para las pruebas que cambian Three.js por una versión retocada (reloj y
 * azar fijos): la etiqueta de Three.js del laboratorio lleva `integrity`, y con eso el navegador
 * se niega a ejecutar cualquier archivo que no sea exactamente el del CDN. La copia va sin esa
 * marca y sin la pantalla del estudio; todo lo demás (incluida la política de contenido) queda igual. Devuelve la ruta; quien
 * la pide la borra al terminar.
 */
export function pageForTests(html) {
  const text = fs.readFileSync(html, 'utf8'),
    bare = text.replace(/(<script src="https:[^"]*three[^"]*")[^>]*>/, '$1>');
  if (bare === text && /integrity=/.test(text)) throw new Error('No pude quitar integrity de la etiqueta de Three.js');
  /* y sin la pantalla del estudio: dura 2,5 s de reloj de verdad y estas pruebas llevan el suyo (la revisa test/inicio.mjs) */
  const out = bare.replace(/<div id="studio"[\s\S]*?<\/div>/, '');
  if (out === bare) throw new Error('No encontré la pantalla del estudio para quitarla de la copia de pruebas');
  const copy = path.join(os.tmpdir(), `giro-prueba-${process.pid}-${path.basename(html)}`);
  fs.writeFileSync(copy, out);
  return copy;
}

/**
 * Construye el juego: une los módulos de src/ en un solo archivo y lo mete, junto con
 * los estilos, dentro de index.html. El resultado es ../demo-juego.html: un único
 * archivo que se abre en el navegador, se comparte, y que la app Android copia al compilar.
 *
 *   node build.mjs                 escribe ../demo-juego.html y ../probar-sonidos.html
 *   node build.mjs --out <archivo> escribe en otro lado (para pruebas)
 *   --musica <carpeta>             de dónde tomar la música grabada (por defecto musica/)
 */
import { build } from 'esbuild';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const out = path.resolve(
  args.includes('--out') ? args[args.indexOf('--out') + 1] : path.join(here, '../demo-juego.html'),
);

const result = await build({
  entryPoints: [path.join(here, 'src/main.js')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  charset: 'utf8',
  minify: false, // legible: facilita depurar en el celular
  write: false,
  logLevel: 'warning',
});
const js = result.outputFiles[0].text;
if (js.includes('</script')) throw new Error('El código contiene "</script": rompería el HTML');

const css = fs.readFileSync(path.join(here, 'estilos.css'), 'utf8');
/* los {iconos} escritos en index.html se vuelven dibujos aquí, al construir */
const { T } = await import(pathToFileURL(path.join(here, 'src/ui/icons.js')).href);
/* y el nombre del juego (core/brand.js) entra donde index.html dice __GAME__ */
const { GAME } = await import(pathToFileURL(path.join(here, 'src/core/brand.js')).href);
const template = T(fs.readFileSync(path.join(here, 'index.html'), 'utf8')).replaceAll('__GAME__', GAME);
for (const mark of ['<!--__CSP__-->', '/*__CSS__*/', '<!--__SONG__-->', '/*__JS__*/']) {
  if (!template.includes(mark)) throw new Error(`index.html no tiene la marca ${mark}`);
}
/* Música grabada: los temas que haya en musica/ (los escribe tools/grabar-musica.mjs) van dentro
   de la página como texto, así el juego sigue siendo un solo archivo que funciona sin internet.
   Lo que no esté grabado lo toca el juego en vivo, por código. */
const musicDir = path.resolve(
  args.includes('--musica') ? args[args.indexOf('--musica') + 1] : path.join(here, 'musica'),
);
const MIME = { mp3: 'audio/mpeg', wav: 'audio/wav' };
function trackTags(all) {
  const file = path.join(musicDir, 'pistas.json');
  if (!fs.existsSync(file)) return { tags: '', names: [] };
  const names = [];
  let tags = '';
  for (const [name, t] of Object.entries(JSON.parse(fs.readFileSync(file, 'utf8')).tracks)) {
    const audio = path.join(musicDir, t.file);
    if ((!t.embed && !all) || !fs.existsSync(audio)) continue;
    const ext = path.extname(t.file).slice(1);
    names.push(name);
    tags +=
      `<script type="application/octet-stream" data-track="${name}" data-title="${t.title}" data-ext="${ext}" ` +
      `data-mime="${MIME[ext]}" data-loop-start="${t.loopStart}" data-loop-end="${t.loopEnd}" data-gain="${t.gain}">` +
      fs.readFileSync(audio).toString('base64') +
      '</script>\n';
  }
  return { tags, names };
}
const game = trackTags(false);
const page = template
  .replace('/*__CSS__*/', () => css.trim())
  .replace('<!--__SONG__-->', () => game.tags)
  .replace('/*__JS__*/', () => js.trim());

/* Política de contenido: qué puede cargar y ejecutar la página. Es la segunda barrera: si algún
   texto de fuera lograra colarse como HTML, igual no podría ejecutar código ni mandar datos a otro lado.
     - código: solo el del juego (por su huella exacta: cambiarle una letra lo invalida), Three.js
       del CDN (en el laboratorio) o del archivo incluido (en la app). Nada de onclick= ni eval.
     - conexiones: solo el servidor del juego, y localhost para las pruebas en el computador.
     - nada de marcos, complementos, formularios ni <base>.
   La app la aprieta más al compilar (app/android/build.gradle.kts): quita el CDN y localhost. */
const { API_URL } = await import(pathToFileURL(path.join(here, 'src/core/config.js')).href);
const inline = [...page.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (inline.length !== 1) throw new Error(`Esperaba un solo <script> en línea y hay ${inline.length}`);
/* la huella se calcula como la lee el navegador: con los saltos de línea normalizados */
const hash = crypto.createHash('sha256').update(inline[0].replace(/\r\n?/g, '\n'), 'utf8').digest('base64');
const policy = [
  "default-src 'none'",
  `script-src 'self' https://cdnjs.cloudflare.com 'sha256-${hash}'`,
  "style-src 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "media-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src ${new URL(API_URL).origin} http://localhost:* http://127.0.0.1:*`,
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');
const html = page.replace('<!--__CSP__-->', () => `<meta http-equiv="Content-Security-Policy" content="${policy}">`);

fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, html);
console.log(
  `${path.relative(process.cwd(), out)} · ${(html.length / 1024).toFixed(0)} KB` +
    (game.names.length ? ` (con música grabada: ${game.names.join(', ')})` : ' (sin música grabada: la toca en vivo)'),
);

/* Página aparte para oír cada efecto de sonido por separado (no es parte del juego) */
if (!args.includes('--out')) {
  const lab = await build({
    entryPoints: [path.join(here, 'src/audio/probador.js')],
    bundle: true,
    format: 'iife',
    target: 'es2020',
    charset: 'utf8',
    write: false,
    logLevel: 'warning',
  });
  const labOut = path.join(here, '../probar-sonidos.html');
  const page = fs.readFileSync(path.join(here, 'probador.html'), 'utf8');
  fs.writeFileSync(
    labOut,
    page
      .replace('<!--__SONG__-->', () => trackTags(true).tags)
      .replace('/*__JS__*/', () => lab.outputFiles[0].text.trim()),
  );
  console.log(path.relative(process.cwd(), labOut));
}

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
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
const template = fs.readFileSync(path.join(here, 'index.html'), 'utf8');
for (const mark of ['/*__CSS__*/', '<!--__SONG__-->', '/*__JS__*/']) {
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
const html = template
  .replace('/*__CSS__*/', () => css.trim())
  .replace('<!--__SONG__-->', () => game.tags)
  .replace('/*__JS__*/', () => js.trim());

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

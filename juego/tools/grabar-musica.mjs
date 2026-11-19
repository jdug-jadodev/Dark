/**
 * Graba la música del juego a archivos.
 *
 * La música está escrita como código (src/audio/music.js). Tocarla en vivo dentro del juego
 * gasta procesador todo el tiempo, y eso calienta el teléfono. Esta herramienta la toca una
 * sola vez aquí, en el computador, y guarda cada tema como un archivo que el juego solo tiene
 * que reproducir. De paso quedan los MP3 para oírlos o usarlos fuera del juego.
 *
 *   node tools/grabar-musica.mjs                 graba todos los temas en musica/ (MP3) y musica/pistas.json
 *   node tools/grabar-musica.mjs --solo metal    solo un tema (los demás quedan como estaban)
 *   --formato wav                                sin comprimir (pesa mucho; para revisar o para editar)
 *   --salida <carpeta>                           otra carpeta de destino
 *
 * Cada vez que se cambie la música (notas, instrumentos, tempo) hay que volver a grabar:
 * la prueba de sonidos avisa si los archivos quedaron viejos.
 *
 * CÓMO QUEDA SIN CORTE AL REPETIRSE
 * Se tocan dos vueltas seguidas y se guarda la segunda: así el comienzo ya trae la "cola" (eco,
 * sala) de la vuelta anterior, igual que cuando lleva rato sonando. Los últimos milisegundos se
 * funden con lo que sonaba justo antes del comienzo, y el archivo lleva un margen repetido a
 * cada lado, de modo que el punto de repetición cae siempre dentro de sonido continuo aunque el
 * MP3 corra el audio unos milisegundos al comprimir.
 */
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome } from '../test/navegador.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const audioDir = path.join(here, '../src/audio');
const args = process.argv.slice(2);
const opt = (n, d) => (args.includes(n) ? args[args.indexOf(n) + 1] : d);
const outDir = path.resolve(opt('--salida', path.join(here, '../musica')));
const format = opt('--formato', 'mp3');
const only = opt('--solo', null);

/* Qué se graba. k = intensidad con la que se toca (fija el tempo) · kbps = calidad del MP3 ·
   embed = va dentro del juego (los demás solo quedan como archivo) */
export const PISTAS = [
  { name: 'menu', k: 0, kbps: 112, embed: true, title: 'Menú · guitarra limpia' },
  { name: 'doom', k: 0.25, kbps: 128, embed: true, title: 'Partida · metal industrial' },
  { name: 'metal', k: 0.75, kbps: 128, embed: true, title: 'Partida pesada y jefes · metal con guitarras' },
  { name: 'space', k: 0, kbps: 96, embed: true, title: 'Viaje espacial · ambiental' },
  { name: 'boss', k: 1, kbps: 128, embed: false, title: 'Variante para jefes (sin usar) · thrash' },
];
const RATE = 44100;
const PAD = 0.25; // margen repetido a cada lado del bucle, en segundos
const FADE = 0.03; // fundido del final con lo que suena antes del comienzo
const EARLY = 0.005; // el corte cae un instante antes del primer golpe, no encima
const PEAK = 0.89; // los archivos se guardan a buen volumen; el juego los devuelve a su nivel

/* Huella de todo lo que define cómo suena la música: si cambia, hay que volver a grabar */
export function musicFingerprint() {
  const h = crypto.createHash('sha1');
  for (const f of ['music.js', 'guitar.js', 'drums.js', 'synth.js'])
    h.update(fs.readFileSync(path.join(audioDir, f), 'utf8').replace(/\r\n/g, '\n'));
  h.update(JSON.stringify({ PISTAS, RATE, PAD, FADE, EARLY, PEAK }));
  return h.digest('hex').slice(0, 16);
}

/* ---------- se ejecuta dentro del navegador: toca el tema y arma el bucle ---------- */
async function renderLoop({ name, k, RATE, PAD, FADE, EARLY, PEAK }) {
  const { steps, step } = Audio.trackLoop(name, k);
  const L = steps * step; // duración exacta de una vuelta
  const cut = 0.06 + L - EARLY; // dónde empieza la segunda vuelta (el secuenciador arranca en 0.06 s)
  const total = cut + L + 0.2;
  const ctx = new OfflineAudioContext(2, Math.ceil(total * RATE), RATE);
  Audio.createMusic(ctx, ctx.destination).tick(name, k, total);
  const out = await ctx.startRendering();
  const a = Math.round(cut * RATE),
    n = Math.round(L * RATE),
    fade = Math.round(FADE * RATE),
    pad = Math.round(PAD * RATE);

  /* ¿La segunda vuelta termina igual que la primera? (0 = idénticas.) Se comparan los últimos
     150 ms sin los agudos: un platillo desplazado media muestra se oye igual pero "difiere". */
  let diff = 0,
    power = 0,
    peak = 0;
  const look = Math.round(0.15 * RATE);
  const loops = [0, 1].map((c) => {
    const x = out.getChannelData(c);
    let p = 0,
      q = 0;
    for (let i = -look * 2; i < 0; i++) {
      p += (x[a + i] - p) * 0.25;
      q += (x[a + n + i] - q) * 0.25;
      if (i < -look) continue;
      diff += (p - q) ** 2;
      power += q ** 2;
    }
    const loop = x.slice(a, a + n);
    /* Fundido del final con lo que sonaba antes del comienzo. Si las dos señales se parecen se
       mezclan en línea recta; si no (colas distintas), con curva de potencia pareja, para que
       el volumen no se hunda a mitad del fundido. */
    let same = 0,
      e1 = 0,
      e2 = 0;
    for (let i = 0; i < fade; i++) {
      same += loop[n - fade + i] * x[a - fade + i];
      e1 += loop[n - fade + i] ** 2;
      e2 += x[a - fade + i] ** 2;
    }
    const alike = same / Math.sqrt(e1 * e2 || 1) > 0.6;
    for (let i = 0; i < fade; i++) {
      const w = (i + 1) / fade,
        up = alike ? w : Math.sin((w * Math.PI) / 2),
        down = alike ? 1 - w : Math.cos((w * Math.PI) / 2);
      loop[n - fade + i] = loop[n - fade + i] * down + x[a - fade + i] * up;
    }
    for (let i = 0; i < n; i++) peak = Math.max(peak, Math.abs(loop[i]));
    return loop;
  });
  /* archivo = final del bucle + bucle completo + comienzo del bucle, a 16 bits y a buen volumen */
  const scale = PEAK / peak,
    frames = n + 2 * pad,
    pcm = new Int16Array(frames * 2);
  for (let i = 0; i < frames; i++) {
    const j = (((i - pad) % n) + n) % n;
    for (let c = 0; c < 2; c++) pcm[i * 2 + c] = Math.round(Math.max(-1, Math.min(1, loops[c][j] * scale)) * 32767);
  }
  const bytes = new Uint8Array(pcm.buffer);
  let b64 = '';
  for (let i = 0; i < bytes.length; i += 0x6000)
    b64 += btoa(String.fromCharCode.apply(null, bytes.subarray(i, i + 0x6000)));
  return {
    b64,
    frames,
    loopStart: pad / RATE,
    loopEnd: (pad + n) / RATE,
    gain: peak / PEAK,
    bpm: 15 / step,
    seam: Math.sqrt(diff / Math.max(power, 1e-12)),
  };
}

/* ---------- formatos ---------- */
function wavFile(pcm) {
  const head = Buffer.alloc(44);
  head.write('RIFF', 0);
  head.writeUInt32LE(36 + pcm.byteLength, 4);
  head.write('WAVEfmt ', 8);
  head.writeUInt32LE(16, 16);
  head.writeUInt16LE(1, 20);
  head.writeUInt16LE(2, 22);
  head.writeUInt32LE(RATE, 24);
  head.writeUInt32LE(RATE * 4, 28);
  head.writeUInt16LE(4, 32);
  head.writeUInt16LE(16, 34);
  head.write('data', 36);
  head.writeUInt32LE(pcm.byteLength, 40);
  return Buffer.concat([head, Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength)]);
}
async function mp3File(pcm, kbps) {
  let lame;
  try {
    lame = await import('@breezystack/lamejs');
  } catch (e) {
    throw new Error(
      'Falta el codificador de MP3. Instálalo una vez con:  npm install --save-dev @breezystack/lamejs\n' +
        '(o graba sin comprimir con --formato wav)',
    );
  }
  const frames = pcm.length / 2,
    left = new Int16Array(frames),
    right = new Int16Array(frames);
  for (let i = 0; i < frames; i++) {
    left[i] = pcm[i * 2];
    right[i] = pcm[i * 2 + 1];
  }
  const enc = new lame.Mp3Encoder(2, RATE, kbps),
    parts = [];
  for (let i = 0; i < frames; i += 1152) {
    const part = enc.encodeBuffer(left.subarray(i, i + 1152), right.subarray(i, i + 1152));
    if (part.length) parts.push(Buffer.from(part));
  }
  const end = enc.flush();
  if (end.length) parts.push(Buffer.from(end));
  return Buffer.concat(parts);
}

/* ---------- principal ---------- */
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const bundle = await build({
    stdin: { contents: "export * from './music.js';", resolveDir: audioDir },
    bundle: true,
    format: 'iife',
    globalName: 'Audio',
    write: false,
  });
  const browser = await chromium.launch({ executablePath: findChrome() });
  const page = await browser.newPage();
  await page.addScriptTag({ content: bundle.outputFiles[0].text });

  fs.mkdirSync(outDir, { recursive: true });
  const manifestFile = path.join(outDir, 'pistas.json');
  const manifest = only && fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {};
  manifest.tracks = manifest.tracks || {};
  console.log('tema     duración   tempo   archivo               tamaño');
  for (const p of PISTAS) {
    if (only && only !== p.name) continue;
    const r = await page.evaluate(renderLoop, { ...p, RATE, PAD, FADE, EARLY, PEAK });
    const raw = Buffer.from(r.b64, 'base64');
    const pcm = new Int16Array(raw.buffer, raw.byteOffset, raw.byteLength / 2);
    const file = p.name + '.' + format;
    const data = format === 'wav' ? wavFile(pcm) : await mp3File(pcm, p.kbps);
    fs.writeFileSync(path.join(outDir, file), data);
    manifest.tracks[p.name] = {
      file,
      title: p.title,
      loopStart: +r.loopStart.toFixed(6),
      loopEnd: +r.loopEnd.toFixed(6),
      gain: +r.gain.toFixed(4),
      bpm: +r.bpm.toFixed(1),
      embed: p.embed,
    };
    console.log(
      `${p.name.padEnd(8)} ${(r.loopEnd - r.loopStart).toFixed(2).padStart(6)} s  ${r.bpm.toFixed(0).padStart(4)}   ${file.padEnd(20)} ${(data.length / 1024).toFixed(0).padStart(5)} KB`,
    );
  }
  await browser.close();
  manifest.source = musicFingerprint();
  fs.writeFileSync(manifestFile, JSON.stringify(manifest, null, 2) + '\n');
  console.log(
    `Listo: ${path.relative(process.cwd(), outDir)}${path.sep}  (pistas.json dice dónde se repite cada tema)`,
  );
}

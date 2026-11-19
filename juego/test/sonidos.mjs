/**
 * Prueba del sonido (efectos y música). No puede decir si suena "bonito" (eso se oye), pero sí:
 *
 *  1. Que cada aviso que emite el juego tenga su efecto, y que no sobren efectos sin usar.
 *  2. Que cada efecto y cada tema de música se pueda generar sin errores, que suene
 *     (no silencio), que no sature y que no dure más de la cuenta.
 *  3. Que en el peor momento (música a tope + disparos + explosiones a la vez) la mezcla
 *     no se pase del máximo, que es cuando el parlante distorsiona.
 *  4. Que la música grabada (musica/) corresponda a la música de código de hoy: si alguien
 *     cambió una nota y no volvió a grabar, el juego seguiría sonando como antes.
 *
 * Todo se genera fuera de línea, sin parlante.
 *
 *   node test/sonidos.mjs            revisa y muestra las tablas
 *   node test/sonidos.mjs --wav dir  además guarda todo como .wav en esa carpeta
 */
import { build } from 'esbuild';
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { findChrome } from './navegador.mjs';
import { PISTAS, musicFingerprint } from '../tools/grabar-musica.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const src = path.join(here, '../src');
const args = process.argv.slice(2);
const wavDir = args.includes('--wav') ? path.resolve(args[args.indexOf('--wav') + 1]) : null;

/* variantes de los efectos que cambian según un dato */
const VARIANTS = {
  near: [0, 8],
  coin: [1, 2, 3],
  laser: [0, 1],
  power: ['magnet', 'shield', 'twin'],
  shot: ['twin', 'spread', 'heavy'],
  enemyShot: [false, true],
};
/* temas de música a revisar: [tema, intensidad] */
const MUSIC = [
  ['menu', 0],
  ['doom', 0],
  ['metal', 0],
  ['metal', 1],
  ['boss', 1],
  ['space', 0],
];
const FX = { minPeak: 0.03, maxPeak: 0.95, maxSeconds: 2.6 };
const SONG = { minPeak: 0.05, maxPeak: 0.6, seconds: 16 };
const MIX_MAX = 0.98;

/* ---------- 1. avisos del juego ↔ efectos ---------- */
const used = new Map(); // nombre → archivos donde se emite o se toca
(function walk(d) {
  for (const f of fs.readdirSync(d)) {
    const p = path.join(d, f);
    if (fs.statSync(p).isDirectory()) walk(p);
    else if (p.endsWith('.js')) {
      const text = fs.readFileSync(p, 'utf8');
      for (const m of text.matchAll(/\b(?:emit|play)\(([^)]*)\)/g)) {
        for (const q of m[1].split(',')[0].matchAll(/'([A-Za-z]+)'/g)) {
          if (!used.has(q[1])) used.set(q[1], []);
          used.get(q[1]).push(path.relative(src, p).split(path.sep).join('/'));
        }
      }
    }
  }
})(src);

/* ---------- 2 y 3. generar todo fuera de línea ---------- */
const bundle = await build({
  stdin: {
    contents: "export * from './synth.js'; export * from './music.js'; export * from './engine.js';",
    resolveDir: path.join(src, 'audio'),
  },
  bundle: true,
  format: 'iife',
  globalName: 'Audio',
  write: false,
});

const browser = await chromium.launch({ executablePath: findChrome() });
const page = await browser.newPage();
await page.addScriptTag({ content: bundle.outputFiles[0].text });

const results = await page.evaluate(
  async ({ VARIANTS, MUSIC, songSeconds, keep }) => {
    const RATE = 44100;
    async function render(seconds, fill) {
      const row = {};
      try {
        const ctx = new OfflineAudioContext(2, RATE * seconds, RATE);
        fill(ctx);
        const out = await ctx.startRendering();
        /* en cada instante cuenta el lado que suena más fuerte */
        const l = out.getChannelData(0),
          r = out.getChannelData(1),
          x = new Float32Array(l.length);
        for (let i = 0; i < x.length; i++) x[i] = Math.abs(l[i]) >= Math.abs(r[i]) ? l[i] : r[i];
        let peak = 0,
          last = 0,
          sum = 0,
          bad = false;
        for (let i = 0; i < x.length; i++) {
          const v = Math.abs(x[i]);
          if (!(v >= 0)) bad = true;
          if (v > peak) peak = v;
          if (v > 0.003) last = i;
          sum += v * v;
        }
        row.peak = peak;
        row.seconds = last / RATE;
        row.rms = Math.sqrt(sum / Math.max(1, last));
        row.bad = bad;
        if (keep) row.samples = Array.from(x.subarray(0, Math.min(x.length, last + RATE / 10)));
      } catch (e) {
        row.error = String(e);
      }
      return row;
    }
    const fx = [];
    for (const name of Object.keys(Audio.SOUNDS))
      for (const data of VARIANTS[name] || [undefined]) {
        const row = await render(3, (ctx) => Audio.SOUNDS[name]({ ctx, ...Audio.createOutput(ctx), t: 0.01 }, data));
        fx.push({ ...row, label: name + (data === undefined ? '' : ` (${data})`) });
      }
    const songs = [];
    for (const [scene, k] of MUSIC) {
      const row = await render(songSeconds, (ctx) =>
        Audio.createMusic(ctx, ctx.destination).tick(scene, k, songSeconds - 1.5),
      );
      songs.push({ ...row, label: `${scene} (intensidad ${k})` });
    }
    const motor = [];
    for (const p of [0.5, 1.5]) {
      const row = await render(3, (ctx) => Audio.createEngine(ctx, Audio.createOutput(ctx).out).set(p));
      motor.push({ ...row, label: p > 1 ? 'motor con nitro' : 'motor en crucero' });
    }
    /* peor caso: jefe + disparo doble sin parar + naves explotando + monedas + golpes */
    const mix = await render(10, (ctx) => {
      Audio.createMusic(ctx, ctx.destination).tick('metal', 1, 9);
      const buses = Audio.createOutput(ctx);
      Audio.createEngine(ctx, buses.out).set(1.5);
      const play = (name, t, data) => Audio.SOUNDS[name]({ ctx, ...buses, t }, data);
      for (let t = 0.1; t < 9; t += 0.13) play('shot', t, 'twin');
      for (let t = 0.3; t < 9; t += 0.45) play('shot', t, 'heavy');
      for (let t = 0.5; t < 9; t += 0.7) play('enemyDown', t);
      for (let t = 0.2; t < 9; t += 0.1) play('bossShot', t);
      for (let t = 0.4; t < 9; t += 0.5) play('coin', t);
      for (let t = 1; t < 9; t += 2) play('hullHit', t);
      play('nova', 3);
      play('bossDown', 6);
      play('crash', 6.05);
    });
    return {
      fx,
      songs,
      motor,
      mix,
      names: Object.keys(Audio.SOUNDS),
      gaps: Object.keys(Audio.GAP),
      scenes: Audio.MUSIC_SCENES,
    };
  },
  { VARIANTS, MUSIC, songSeconds: SONG.seconds, keep: !!wavDir },
);
await browser.close();

/* ---------- informe ---------- */
const problems = [];
for (const n of used.keys())
  if (!results.names.includes(n))
    problems.push(`el juego avisa '${n}' (${used.get(n)[0]}) pero no hay efecto con ese nombre`);
for (const n of results.names) if (!used.has(n)) problems.push(`el efecto '${n}' existe pero nada lo usa`);
for (const n of results.gaps) if (!results.names.includes(n)) problems.push(`GAP nombra '${n}', que no es un efecto`);
for (const n of results.scenes)
  if (!MUSIC.some(([s]) => s === n)) problems.push(`el tema de música '${n}' no se está revisando`);

function table(title, rows, judge) {
  console.log(title.padEnd(24) + 'duración'.padStart(9) + 'pico'.padStart(7) + 'media'.padStart(7));
  for (const r of rows) {
    if (r.error) {
      problems.push(`${r.label}: no se pudo generar · ${r.error}`);
      continue;
    }
    const note = r.bad ? 'valores inválidos' : judge(r);
    if (note) problems.push(`${r.label}: ${note}`);
    console.log(
      r.label.padEnd(24) +
        (r.seconds.toFixed(2) + ' s').padStart(9) +
        r.peak.toFixed(2).padStart(7) +
        r.rms.toFixed(3).padStart(7) +
        (note ? '   ✗ ' + note : ''),
    );
    if (wavDir) {
      fs.mkdirSync(wavDir, { recursive: true });
      const file = r.label.replace(/[^\w]+/g, '-').replace(/-$/, '') + '.wav';
      fs.writeFileSync(path.join(wavDir, file), wav(r.samples, 44100));
    }
  }
  console.log('');
}

console.log(`${results.names.length} efectos · ${used.size} avisos distintos en el juego\n`);
table('efecto', results.fx, (r) =>
  r.peak < FX.minPeak
    ? 'casi no suena'
    : r.peak > FX.maxPeak
      ? 'satura'
      : r.seconds > FX.maxSeconds
        ? 'dura demasiado'
        : '',
);
table('música', results.songs, (r) =>
  r.peak < SONG.minPeak
    ? 'casi no suena'
    : r.peak > SONG.maxPeak
      ? 'muy fuerte: taparía los efectos'
      : r.seconds < SONG.seconds - 4
        ? 'se queda en silencio antes de tiempo'
        : '',
);
table('motor (debe ser discreto)', results.motor, (r) =>
  r.peak < 0.01 ? 'no se oye' : r.peak > 0.3 ? 'muy fuerte para ser un fondo' : '',
);
table('mezcla en el peor caso', [{ ...results.mix, label: 'jefe + todo a la vez' }], (r) =>
  r.peak > MIX_MAX ? 'se pasa del máximo: distorsionaría' : '',
);

/* ---------- 4. música grabada al día ---------- */
{
  const dir = path.join(here, '../musica'),
    file = path.join(dir, 'pistas.json');
  if (!fs.existsSync(file))
    console.log(
      '· Sin música grabada (musica/): el juego la toca en vivo, que gasta más batería. Se graba con: npm run musica\n',
    );
  else {
    const m = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (m.source !== musicFingerprint())
      problems.push(
        'la música grabada está vieja: la de código cambió después de grabar. Vuelve a grabar con: npm run musica',
      );
    for (const p of PISTAS) {
      const t = m.tracks[p.name];
      if (!t || !fs.existsSync(path.join(dir, t.file)))
        problems.push(`falta grabar el tema "${p.name}" (npm run musica)`);
      else if (!(t.loopEnd > t.loopStart && t.gain > 0))
        problems.push(`el tema grabado "${p.name}" no dice dónde se repite`);
    }
    console.log(`música grabada: ${Object.keys(m.tracks).join(', ')}\n`);
  }
}

if (problems.length) {
  for (const p of problems) console.log('✗ ' + p);
  process.exitCode = 1;
} else console.log('✓ Cada aviso tiene su efecto; efectos, música y mezcla suenan sin saturar.');
if (wavDir) console.log('Archivos .wav en ' + wavDir);

function wav(samples, rate) {
  const buf = Buffer.alloc(44 + samples.length * 2);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + samples.length * 2, 4);
  buf.write('WAVEfmt ', 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(samples.length * 2, 40);
  samples.forEach((v, i) => buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, v)) * 32767), 44 + i * 2));
  return buf;
}

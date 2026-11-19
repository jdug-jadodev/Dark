/**
 * Guitarra eléctrica hecha por código. Para que suene a guitarra y no a sintetizador se imita
 * cómo funciona una de verdad:
 *
 *  1. La cuerda: un golpe de ruido (la púa) dando vueltas en un eco cortísimo que lo va
 *     suavizando. Eso produce el sonido de una cuerda pulsada que se apaga sola.
 *  2. El amplificador: la cuerda entra a un amplificador con muchísima ganancia que la recorta
 *     (la distorsión), y luego a un filtro que imita el parlante.
 *
 * Varias cuerdas entran juntas al mismo amplificador, y es esa mezcla recortada la que da el
 * gruñido de un acorde de metal. No usa Math.random.
 */
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

/* ---------- la cuerda ---------- */
const stringsOf = new WeakMap(); // contexto de audio → cuerdas ya calculadas
function makeString(ctx, midi, muted) {
  const sr = ctx.sampleRate,
    f = hz(midi);
  const L = Math.max(2, Math.round(sr / f - 0.5)); // largo del eco: define la nota
  const n = Math.floor(sr * (muted ? 0.45 : 2.2));
  /* las primeras vueltas son casi puro ruido (la púa): se calculan pero no se usan, porque la
     distorsión las convertía en estática */
  const skip = L * 4;
  const y = new Float32Array(n + skip);
  /* la púa: ruido; más opaco cuando la mano apaga la cuerda */
  const bright = muted ? 0.2 : 0.45;
  let seed = Math.imul(midi * 2 + (muted ? 1 : 0) + 11, 2654435761) >>> 0,
    lp = 0,
    mean = 0,
    peak = 0;
  for (let i = 0; i < L; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    lp += bright * (seed / 2147483648 - 1 - lp);
    y[i] = lp;
    mean += lp / L;
  }
  for (let i = 0; i < L; i++) {
    y[i] -= mean;
    peak = Math.max(peak, Math.abs(y[i]));
  }
  for (let i = 0; i < L; i++) y[i] /= peak || 1;
  /* el eco: cada vuelta promedia dos muestras vecinas (suaviza) y pierde un poco de fuerza */
  const keep = muted ? 0.98 : 0.9987;
  for (let i = L; i < n + skip; i++) y[i] = keep * 0.5 * (y[i - L] + (i - L - 1 >= 0 ? y[i - L - 1] : 0));
  const buffer = ctx.createBuffer(1, n, sr);
  buffer.getChannelData(0).set(y.subarray(skip));
  /* el promedio atrasa media muestra: se corrige la afinación con la velocidad de reproducción */
  return { buffer, rate: f / (sr / (L + 0.5)) };
}
function stringOf(ctx, midi, muted) {
  let map = stringsOf.get(ctx);
  if (!map) stringsOf.set(ctx, (map = new Map()));
  const key = midi * 2 + (muted ? 1 : 0);
  let s = map.get(key);
  if (!s) map.set(key, (s = makeString(ctx, midi, muted)));
  return s;
}

/**
 * Pulsa una cuerda. input = a dónde entra (un amplificador o la salida limpia).
 * o.muted = apagada con la mano ("chug") · o.cents = desafinación mínima · o.vibrato = nodo que la hace temblar
 */
export function pluck(ctx, input, t, midi, dur, vol, o = {}) {
  const s = stringOf(ctx, midi, !!o.muted);
  const src = ctx.createBufferSource();
  src.buffer = s.buffer;
  src.playbackRate.value = s.rate;
  if (o.cents) src.detune.value = o.cents;
  if (o.vibrato) o.vibrato.connect(src.detune);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(vol, t + 0.002);
  g.gain.setValueAtTime(vol, t + dur);
  g.gain.linearRampToValueAtTime(0, t + dur + 0.025); // la mano corta la nota
  src.connect(g);
  g.connect(input);
  src.start(t);
  src.stop(t + dur + 0.05);
}

/* ---------- el amplificador ---------- */
function biquad(ctx, type, f, q, gain) {
  const n = ctx.createBiquadFilter();
  n.type = type;
  n.frequency.value = f;
  if (q) n.Q.value = q;
  if (gain) n.gain.value = gain;
  return n;
}
let curve = null;
function clipCurve() {
  if (!curve) {
    curve = new Float32Array(2048);
    for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(((i / (curve.length - 1)) * 2 - 1) * 4);
  }
  return curve;
}
/**
 * Amplificador de metal. drive = cuánta distorsión · level = volumen de salida · pan = -1 izquierda … 1 derecha.
 * Devuelve la entrada, donde se conectan las cuerdas.
 */
export function createAmp(ctx, destination, drive, level, pan = 0) {
  const input = ctx.createGain();
  const pre = ctx.createGain();
  pre.gain.value = drive;
  const clip = ctx.createWaveShaper();
  clip.curve = clipCurve();
  clip.oversample = '2x';
  const out = ctx.createGain();
  out.gain.value = level;
  const chain = [
    input,
    biquad(ctx, 'highpass', 110), // graves apretados: sin esto el recorte suena a barro
    biquad(ctx, 'peaking', 900, 0.7, 7), // empuja los medios antes de distorsionar
    pre,
    clip,
    biquad(ctx, 'highpass', 75),
    biquad(ctx, 'peaking', 420, 1, -5), // el "hueco" en los medios típico del metal
    biquad(ctx, 'peaking', 1800, 1.2, 3), // mordida
    biquad(ctx, 'lowpass', 3000, 0.8), // el parlante: corta el chillido agudo
    biquad(ctx, 'lowpass', 3400, 0.7),
    biquad(ctx, 'lowpass', 4200, 0.7),
    out,
  ];
  if (pan && ctx.createStereoPanner) {
    const p = ctx.createStereoPanner();
    p.pan.value = pan;
    chain.push(p);
  }
  chain.push(destination);
  for (let i = 0; i + 1 < chain.length; i++) chain[i].connect(chain[i + 1]);
  return input;
}

/* Sala: un eco difuso corto para que la batería y la guitarra solista no suenen "pegadas al oído" */
export function createReverb(ctx, destination, level) {
  const sr = ctx.sampleRate,
    n = Math.floor(sr * 1.3);
  const ir = ctx.createBuffer(2, n, sr);
  for (let c = 0; c < 2; c++) {
    const d = ir.getChannelData(c);
    let seed = 9001 + c * 7919,
      lp = 0;
    for (let i = 0; i < n; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      lp += 0.5 * (seed / 2147483648 - 1 - lp);
      d[i] = lp * Math.exp((-5.5 * i) / n);
    }
  }
  const conv = ctx.createConvolver();
  conv.buffer = ir;
  const out = ctx.createGain();
  out.gain.value = level;
  conv.connect(out);
  out.connect(destination);
  return conv;
}

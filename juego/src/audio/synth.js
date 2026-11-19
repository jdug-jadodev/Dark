/**
 * Recetas de los efectos de sonido. No hay archivos de audio: cada efecto se arma con
 * osciladores y ruido filtrado (Web Audio). Para cambiar cómo suena algo, se cambian sus números.
 *
 * El carácter es de batalla espacial: los disparos son cañones de energía (un rayo que cae en
 * picada, con timbre metálico y distorsión), las explosiones son ruido largo que retumba, y
 * los avisos musicales son acordes de guitarra distorsionada.
 *
 * Ojo con una trampa: un golpe de ruido corto más un tono grave que cae suena a TAMBOR, no a
 * disparo ni a explosión. Por eso aquí los disparos no llevan golpe grave y las explosiones
 * son largas y sin tono.
 *
 * Cada receta recibe `a` = { ctx, out, dirt, t }: el contexto de audio, la salida limpia, la
 * salida con distorsión y en qué momento empieza. No usan Math.random: el azar del juego no
 * se toca desde aquí.
 */

/* ---------- salidas ---------- */
/* Distorsión: sube mucho la señal y la recorta, como un amplificador de guitarra al máximo.
   Todo lo que entra se mezcla antes de recortarse, por eso varios disparos juntos suenan
   más densos pero no más fuertes de lo que el parlante aguanta. */
export function createDirt(ctx, destination, drive, level) {
  const pre = ctx.createGain();
  pre.gain.value = drive;
  const shaper = ctx.createWaveShaper();
  const curve = new Float32Array(1024);
  for (let i = 0; i < curve.length; i++) curve[i] = Math.tanh(((i / (curve.length - 1)) * 2 - 1) * 3) / Math.tanh(3);
  shaper.curve = curve;
  shaper.oversample = '2x';
  const cabinet = ctx.createBiquadFilter(); // quita el chillido agudo que deja el recorte
  cabinet.type = 'lowpass';
  cabinet.frequency.value = 5200;
  const post = ctx.createGain();
  post.gain.value = level;
  pre.connect(shaper);
  shaper.connect(cabinet);
  cabinet.connect(post);
  post.connect(destination);
  return pre;
}
/* Salida de los efectos: volumen general y un limitador, para que nada sature el parlante */
export function createOutput(ctx) {
  const limiter = ctx.createDynamicsCompressor();
  limiter.threshold.value = -14;
  limiter.knee.value = 10;
  limiter.ratio.value = 8;
  limiter.attack.value = 0.003;
  limiter.release.value = 0.15;
  const out = ctx.createGain();
  out.gain.value = 0.8;
  /* el limitador sube el volumen por su cuenta; este último ajuste deja sitio para la música */
  const trim = ctx.createGain();
  trim.gain.value = 0.9;
  /* y este es el volumen que elige el jugador en Configuración */
  const level = ctx.createGain();
  out.connect(limiter);
  limiter.connect(trim);
  trim.connect(level);
  level.connect(ctx.destination);
  return { out, dirt: createDirt(ctx, out, 5, 0.6), level };
}

/* ---------- piezas ---------- */
const noiseOf = new WeakMap();
export function noiseBuffer(ctx) {
  let buf = noiseOf.get(ctx);
  if (!buf) {
    buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 1.5), ctx.sampleRate);
    const d = buf.getChannelData(0);
    let s = 22222;
    for (let i = 0; i < d.length; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      d[i] = s / 2147483648 - 1;
    }
    noiseOf.set(ctx, buf);
  }
  return buf;
}
/* volumen: sube rápido, se sostiene `hold` segundos y se apaga hacia el final.
   Con o.dirt va a la salida con distorsión. */
function envelope(a, t, dur, vol, o) {
  const g = a.ctx.createGain();
  const attack = Math.min(o.attack ?? 0.004, dur * 0.5);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(vol, t + attack);
  if (o.hold) g.gain.setValueAtTime(vol, t + Math.min(Math.max(o.hold, attack), dur * 0.9));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  g.connect(o.dirt && a.dirt ? a.dirt : a.out);
  return g;
}
/* nota: onda `type` que va de f1 a f2 Hz en `dur` segundos */
export function tone(a, type, f1, f2, dur, vol, o = {}) {
  const t = a.t + (o.at || 0);
  const osc = a.ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(f1, t);
  if (f2 !== f1) osc.frequency.exponentialRampToValueAtTime(f2, t + dur);
  osc.connect(envelope(a, t, dur, vol, o));
  osc.start(t);
  osc.stop(t + dur + 0.03);
}
/* ruido filtrado (soplidos, explosiones, roces): el filtro va de f1 a f2 Hz */
export function noise(a, kind, f1, f2, dur, vol, o = {}) {
  const t = a.t + (o.at || 0);
  const src = a.ctx.createBufferSource();
  src.buffer = noiseBuffer(a.ctx);
  src.loop = true;
  const flt = a.ctx.createBiquadFilter();
  flt.type = kind;
  flt.Q.value = o.q ?? 0.8;
  flt.frequency.setValueAtTime(f1, t);
  if (f2 !== f1) flt.frequency.exponentialRampToValueAtTime(f2, t + dur);
  src.connect(flt);
  flt.connect(envelope(a, t, dur, vol, o));
  src.start(t, ((o.at || 0) * 7.3) % 1);
  src.stop(t + dur + 0.03);
}
/* Rayo de energía: un tono (de f1 a f2 Hz) multiplicado por otro más lento (de m1 a m2 Hz).
   Esa multiplicación le da el timbre metálico y eléctrico de un arma de ciencia ficción. */
function zap(a, type, f1, f2, m1, m2, dur, vol, o = {}) {
  const t = a.t + (o.at || 0);
  const beam = a.ctx.createOscillator();
  beam.type = type;
  beam.frequency.setValueAtTime(f1, t);
  if (f2 !== f1) beam.frequency.exponentialRampToValueAtTime(f2, t + dur);
  const mod = a.ctx.createOscillator();
  mod.frequency.setValueAtTime(m1, t);
  if (m2 !== m1) mod.frequency.exponentialRampToValueAtTime(m2, t + dur);
  const ring = a.ctx.createGain();
  ring.gain.value = 0;
  mod.connect(ring.gain);
  beam.connect(ring);
  ring.connect(envelope(a, t, dur, vol, o));
  for (const n of [beam, mod]) {
    n.start(t);
    n.stop(t + dur + 0.03);
  }
}

/* Cañón de energía de la nave. size: 0 = ráfaga liviana … 1 = cañón de plasma.
   Es un rayo que cae en picada + su cuerpo + el chasquido de la descarga + una estela. */
function blaster(a, size, at = 0) {
  const dur = 0.11 + 0.28 * size;
  const hot = { at, dirt: true, attack: 0.001 };
  zap(a, 'sawtooth', 2600 - 1400 * size, 260 - 170 * size, 900 - 500 * size, 120 - 60 * size, dur, 0.5, hot);
  tone(a, 'square', 1800 - 900 * size, 180 - 110 * size, dur * 0.8, 0.22, hot);
  noise(a, 'highpass', 4000, 4000, 0.012, 0.3, { at, attack: 0.001 });
  noise(a, 'bandpass', 2400, 600, dur * 1.6, 0.08 + 0.08 * size, { at, q: 2 });
}
/* Explosión. size: 0.1 = roca … 1 = nave grande. Es ruido largo, sin ningún tono:
   estallido + bola de fuego que se va apagando + retumbo + escombros que caen. */
function explosion(a, size, at = 0) {
  const len = 0.5 + 1.1 * size;
  noise(a, 'highpass', 1800, 1800, 0.03, 0.5, { at, dirt: true, attack: 0.001 });
  noise(a, 'lowpass', 2600 + 1800 * size, 140, len, 0.55 + 0.2 * size, {
    at,
    dirt: true,
    attack: 0.004,
    hold: 0.08 + 0.15 * size,
  });
  noise(a, 'bandpass', 260, 90, len * 1.2, 0.5, { at: at + 0.03, q: 0.7, attack: 0.03, hold: len * 0.3, dirt: true });
  const debris = 4 + Math.round(5 * size);
  for (let k = 0; k < debris; k++) {
    const late = 0.06 + ((k * 0.137 + 0.05 * k * k) % (0.35 + 0.5 * size));
    noise(a, 'highpass', 2500 + 400 * k, 2500, 0.02, 0.12, { at: at + late, attack: 0.001 });
  }
}
/* Acorde de guitarra distorsionada (nota base + quinta + octava). muted = golpe corto y seco */
function chord(a, f, dur, vol, at = 0, muted = false) {
  const o = { at, dirt: true, attack: 0.004, hold: muted ? 0 : dur * 0.7 };
  tone(a, 'sawtooth', f, f, dur, vol, o);
  tone(a, 'sawtooth', f * 1.4983, f * 1.4983, dur, vol * 0.8, o);
  tone(a, 'sawtooth', f * 2.004, f * 2.004, dur, vol * 0.7, o);
}
/* platillo */
function cymbal(a, at = 0, vol = 0.14) {
  noise(a, 'highpass', 5000, 7000, 0.9, vol, { at });
}
/* campanita suave: una nota con dos armónicos */
function chime(a, f, at = 0, vol = 1) {
  tone(a, 'sine', f, f, 0.24, 0.1 * vol, { at, attack: 0.003 });
  tone(a, 'sine', f * 2, f * 2, 0.14, 0.035 * vol, { at, attack: 0.003 });
  tone(a, 'sine', f * 3, f * 3, 0.07, 0.015 * vol, { at, attack: 0.003 });
}
/* notas de guitarra: mi, fa, sol, la (graves) y do, re, mi (una octava arriba) */
const E2 = 82.4,
  F2 = 87.3,
  G2 = 98,
  A2 = 110,
  C3 = 130.8,
  D3 = 146.8,
  E3 = 164.8;

/* ---------- efectos ---------- */
export const SOUNDS = {
  /* menús y partida */
  click: (a) => {
    noise(a, 'highpass', 2200, 2200, 0.02, 0.12, { attack: 0.001 });
    tone(a, 'triangle', 190, 120, 0.05, 0.14);
  },
  /* cuenta regresiva: golpe seco de guitarra + bombo; el ¡YA! es el acorde abierto */
  count: (a) => {
    chord(a, E2, 0.13, 0.16, 0, true);
    tone(a, 'sine', 120, 50, 0.1, 0.3);
  },
  go: (a) => {
    chord(a, E2, 0.8, 0.16);
    tone(a, 'sine', 130, 40, 0.3, 0.4, { dirt: true });
    cymbal(a);
  },
  pause: (a) => tone(a, 'sine', 210, 120, 0.11, 0.16),
  reward: (a) => [1319, 1568, 1319, 1976].forEach((f, i) => chime(a, f, i * 0.075)),
  revive: (a) => {
    chord(a, E2, 0.14, 0.16, 0, true);
    chord(a, G2, 0.14, 0.16, 0.14, true);
    chord(a, A2, 0.7, 0.16, 0.28);
    cymbal(a, 0.28);
  },
  /* victoria: tres acordes que suben y el último se queda sonando */
  win: (a) => {
    chord(a, C3, 0.25, 0.16);
    chord(a, D3, 0.25, 0.16, 0.25);
    chord(a, E3, 1.2, 0.16, 0.5);
    tone(a, 'sine', 130, 40, 0.3, 0.4, { at: 0.5, dirt: true });
    cymbal(a, 0.5, 0.18);
  },
  /* derrota: tres acordes que bajan, lentos y graves */
  lose: (a) => {
    chord(a, A2, 0.3, 0.15);
    chord(a, G2, 0.3, 0.15, 0.3);
    chord(a, E2, 1.1, 0.15, 0.6);
    tone(a, 'sine', 110, 32, 0.6, 0.35, { at: 0.6, dirt: true });
  },
  phase: (a) => {
    chord(a, E3, 0.35, 0.12);
    cymbal(a);
  },

  /* recoger cosas */
  /* moneda: hay tres opciones para elegir (v). 1 = campanita · 2 = barrido de energía · 3 = cristal */
  coin: (a, v) => {
    if (v === 2) {
      tone(a, 'sine', 900, 1900, 0.08, 0.3, { attack: 0.004 });
      tone(a, 'triangle', 1900, 1900, 0.13, 0.13, { at: 0.07 });
    } else if (v === 3) {
      tone(a, 'sine', 3136, 3136, 0.3, 0.15, { attack: 0.002 });
      tone(a, 'sine', 4186, 4186, 0.22, 0.1, { at: 0.03, attack: 0.002 });
      tone(a, 'sine', 6272, 6272, 0.15, 0.05, { at: 0.03, attack: 0.002 });
    } else {
      chime(a, 1319);
      chime(a, 1976, 0.07);
    }
  },
  /* ¡CASI!: el roce de algo que pasa pegado a la nave (sube y cae rápido); más agudo con el combo */
  near: (a, combo) => {
    const p = 1 + Math.min(combo || 0, 8) * 0.05;
    noise(a, 'bandpass', 600 * p, 3200 * p, 0.11, 0.4, { q: 3, attack: 0.07 });
    noise(a, 'bandpass', 3200 * p, 450 * p, 0.2, 0.4, { q: 3, at: 0.1, attack: 0.005 });
    noise(a, 'highpass', 5000, 5000, 0.12, 0.08, { at: 0.04, attack: 0.04 }); // el raspón
  },
  /* escape gravitatorio: los motores acelerando a fondo */
  bonus: (a) => {
    const o = { attack: 0.06, hold: 0.45, dirt: true };
    tone(a, 'sawtooth', 70, 300, 0.7, 0.12, o);
    tone(a, 'sawtooth', 105, 452, 0.7, 0.09, o);
    noise(a, 'bandpass', 400, 2800, 0.7, 0.35, { q: 1.2, attack: 0.08, hold: 0.45 });
  },
  power: (a, type) => {
    if (type === 'shield') {
      /* escudo: energía que se carga y queda zumbando como un campo de fuerza */
      tone(a, 'sine', 160, 640, 0.3, 0.14, { attack: 0.05 });
      zap(a, 'sine', 640, 660, 48, 60, 0.6, 0.16, { at: 0.2, attack: 0.05, hold: 0.35 });
      noise(a, 'bandpass', 900, 4200, 0.5, 0.25, { q: 9, attack: 0.15 });
      tone(a, 'sine', 1320, 1320, 0.35, 0.05, { at: 0.25 });
    } else if (type === 'twin' || type === 'spread' || type === 'heavy' || type === 'laser') {
      /* arma nueva: cambio mecánico. Un motorcito gira, el trinquete hace clic-clic-clic y encaja */
      tone(a, 'sawtooth', 180, 420, 0.13, 0.05);
      for (let k = 0; k < 4; k++) {
        noise(a, 'bandpass', 2600, 2600, 0.012, 0.3, { at: 0.13 + k * 0.035, q: 6, attack: 0.001 });
        tone(a, 'square', 900, 900, 0.008, 0.06, { at: 0.13 + k * 0.035, attack: 0.001 });
      }
      noise(a, 'lowpass', 900, 300, 0.07, 0.5, { at: 0.3, dirt: true, attack: 0.001 });
      tone(a, 'square', 130, 90, 0.07, 0.2, { at: 0.3, dirt: true, attack: 0.001 });
      tone(a, 'square', 2100, 2100, 0.02, 0.06, { at: 0.3, attack: 0.001 });
    } else {
      noise(a, 'bandpass', 400, 2400, 0.2, 0.18, { q: 2, attack: 0.1 });
      chime(a, 1175, 0.05);
      chime(a, 1760, 0.14);
    }
  },
  /* nova: el aire se recoge un instante y revienta una explosión enorme */
  nova: (a) => {
    noise(a, 'bandpass', 300, 2600, 0.16, 0.3, { q: 2, attack: 0.14 });
    explosion(a, 1.15, 0.15);
    tone(a, 'sawtooth', 300, 40, 0.5, 0.2, { at: 0.15, dirt: true });
  },

  /* armas del jugador: cañones de energía */
  shot: (a, gun) => {
    if (gun === 'heavy') {
      blaster(a, 1);
      tone(a, 'sawtooth', 220, 55, 0.4, 0.2, { dirt: true, attack: 0.001 }); // el gruñido del plasma
    } else if (gun === 'spread') {
      blaster(a, 0.35);
      zap(a, 'sawtooth', 2500, 240, 700, 90, 0.2, 0.3, { dirt: true, attack: 0.001 });
    } else blaster(a, 0);
  },
  /* láser: un rayo que zumba. p = 0 recién encendido … 1 a punto de agotarse: se va
     sobrecalentando, así que sube de tono, suena más fuerte y empieza a chisporrotear */
  laser: (a, p = 0) => {
    const up = 1 + 0.6 * p,
      o = { attack: 0.015, hold: 0.13 };
    tone(a, 'sawtooth', 620 * up, 620 * up, 0.18, 0.025 + 0.025 * p, o);
    tone(a, 'sawtooth', 627 * up, 627 * up, 0.18, 0.025 + 0.025 * p, o); // dos tonos casi iguales: el zumbido
    tone(a, 'sine', 1860 * up, 1860 * up, 0.18, 0.015 + 0.015 * p, { attack: 0.015, hold: 0.13 });
    noise(a, 'bandpass', 2400 * up, 2400 * up, 0.18, 0.025 + 0.05 * p, { q: 6, attack: 0.015, hold: 0.13 });
    if (p > 0.6) noise(a, 'highpass', 3500, 3500, 0.18, 0.1 * (p - 0.6), { attack: 0.015, hold: 0.13 });
  },
  /* arma vacía: el "clic" del gatillo */
  gunEmpty: (a) => {
    noise(a, 'highpass', 3000, 3000, 0.015, 0.22, { attack: 0.001 });
    tone(a, 'triangle', 300, 150, 0.05, 0.1);
  },
  nitro: (a) => {
    noise(a, 'bandpass', 350, 3200, 0.55, 0.5, { q: 1.2, attack: 0.05, hold: 0.3, dirt: true });
    tone(a, 'sawtooth', 55, 220, 0.45, 0.14, { attack: 0.04, hold: 0.25, dirt: true });
  },
  deny: (a) => {
    tone(a, 'square', 110, 110, 0.07, 0.1);
    tone(a, 'square', 110, 110, 0.07, 0.1, { at: 0.11 });
  },

  /* golpes y explosiones */
  /* meteorito: explosión corta + piedras que se desmoronan */
  rockBreak: (a) => {
    explosion(a, 0.12);
    noise(a, 'bandpass', 700, 250, 0.3, 0.2, { at: 0.05, q: 1.5 });
  },
  /* bala contra metal */
  enemyHit: (a) => {
    tone(a, 'triangle', 1250, 1180, 0.05, 0.08, { attack: 0.001 });
    tone(a, 'square', 1870, 1870, 0.03, 0.04, { attack: 0.001 });
    noise(a, 'highpass', 3000, 3000, 0.02, 0.12, { attack: 0.001 });
  },
  enemyDown: (a) => explosion(a, 0.45),
  shieldBreak: (a) => {
    tone(a, 'triangle', 1900, 620, 0.22, 0.13);
    noise(a, 'highpass', 4000, 2000, 0.16, 0.13);
    zap(a, 'sine', 700, 200, 60, 30, 0.25, 0.2);
  },
  /* golpe al casco: chapa que suena + impacto */
  hullHit: (a) => {
    const o = { dirt: true, attack: 0.001 };
    tone(a, 'square', 196, 190, 0.2, 0.12, o);
    tone(a, 'square', 311, 305, 0.16, 0.1, o);
    tone(a, 'square', 523, 515, 0.1, 0.08, o);
    noise(a, 'lowpass', 1500, 180, 0.26, 0.4, o);
  },
  crash: (a) => {
    explosion(a, 1);
    tone(a, 'sawtooth', 420, 48, 0.5, 0.14, { dirt: true });
  },

  /* enemigos y jefes: sus cañones suenan más opacos y livianos que los del jugador */
  enemyShot: (a, heavy) => {
    zap(a, 'square', heavy ? 700 : 1100, heavy ? 120 : 200, heavy ? 260 : 420, 70, heavy ? 0.16 : 0.11, 0.22, {
      attack: 0.001,
    });
    noise(a, 'highpass', 3500, 3500, 0.01, 0.12, { attack: 0.001 });
  },
  bossShot: (a) => {
    zap(a, 'sawtooth', 600, 90, 180, 40, 0.14, 0.26, { attack: 0.001 });
    noise(a, 'highpass', 3000, 3000, 0.01, 0.12, { attack: 0.001 });
  },
  bossHit: (a) => {
    tone(a, 'square', 150, 140, 0.07, 0.1, { dirt: true, attack: 0.001 });
    tone(a, 'square', 233, 225, 0.05, 0.08, { dirt: true, attack: 0.001 });
    noise(a, 'bandpass', 1200, 1200, 0.04, 0.1);
  },
  bossCharge: (a) => tone(a, 'sawtooth', 55, 440, 0.6, 0.14, { attack: 0.45, dirt: true }),
  /* llega el jefe: dos acordes a medio tono de distancia, el recurso clásico de amenaza */
  bossIntro: (a) => {
    chord(a, E2, 0.5, 0.16);
    chord(a, F2, 1.1, 0.16, 0.5);
    tone(a, 'sine', 120, 35, 0.5, 0.4, { dirt: true });
    cymbal(a, 0.5);
  },
  bossDown: (a) => {
    explosion(a, 1);
    explosion(a, 0.5, 0.28);
    explosion(a, 0.8, 0.55);
    chord(a, E3, 1, 0.14, 0.85);
    cymbal(a, 0.85, 0.18);
  },

  /* peligros y avisos */
  /* alarma: dos bocinazos */
  alarm: (a) => {
    tone(a, 'sawtooth', 392, 392, 0.16, 0.07, { hold: 0.12, dirt: true });
    tone(a, 'sawtooth', 392, 392, 0.16, 0.07, { at: 0.22, hold: 0.12, dirt: true });
  },
  holePull: (a) => {
    tone(a, 'sine', 98, 60, 0.5, 0.2, { attack: 0.08 });
    tone(a, 'triangle', 196, 110, 0.5, 0.14, { attack: 0.08 });
  },
  suckStart: (a) => {
    tone(a, 'sine', 520, 55, 0.9, 0.2);
    noise(a, 'bandpass', 2400, 200, 0.9, 0.4, { q: 2 });
  },
  suck: (a) => tone(a, 'square', 990, 990, 0.07, 0.1),
  spaghetti: (a) => {
    tone(a, 'sawtooth', 900, 36, 1.1, 0.13);
    tone(a, 'sine', 1800, 60, 1.1, 0.08);
  },
  escape: (a) => {
    noise(a, 'bandpass', 300, 4000, 0.5, 0.5, { q: 1.2, attack: 0.03, hold: 0.25, dirt: true });
    tone(a, 'sine', 180, 1100, 0.4, 0.14);
    chord(a, E3, 0.4, 0.1, 0.3);
  },
  portal: (a) => {
    tone(a, 'sine', 200, 1600, 0.5, 0.12, { attack: 0.1 });
    tone(a, 'sine', 1600, 300, 0.55, 0.1, { at: 0.45 });
    noise(a, 'bandpass', 500, 5000, 0.95, 0.5, { q: 3, attack: 0.2, hold: 0.6 });
  },
  turbulence: (a) => {
    noise(a, 'bandpass', 260, 900, 0.5, 0.7, { q: 1.5, attack: 0.2, hold: 0.4 });
    noise(a, 'bandpass', 900, 260, 0.6, 0.7, { q: 1.5, at: 0.45, attack: 0.05, hold: 0.2 });
  },
  /* la pista da una vuelta de 360°: un soplido de aire que sube y vuelve a bajar */
  spin: (a) => {
    noise(a, 'bandpass', 300, 2200, 0.8, 0.6, { q: 2.5, attack: 0.3, hold: 0.6 });
    noise(a, 'bandpass', 2200, 300, 0.8, 0.6, { q: 2.5, at: 0.7, attack: 0.05, hold: 0.3 });
    tone(a, 'sine', 180, 520, 0.8, 0.08, { attack: 0.3 });
    tone(a, 'sine', 520, 180, 0.8, 0.08, { at: 0.7, attack: 0.05 });
  },
  /* viene un cometa: tres pitidos agudos de radar (distintos a la bocina de la alerta) */
  cometWarn: (a) => {
    for (const at of [0, 0.12, 0.24]) {
      tone(a, 'square', 1480, 1480, 0.07, 0.07, { at, hold: 0.05 });
      tone(a, 'sine', 740, 740, 0.07, 0.1, { at, hold: 0.05 });
    }
  },
  /* el cometa pasa: se acerca silbando y se aleja con un rugido que cae de tono */
  comet: (a) => {
    noise(a, 'bandpass', 500, 3600, 0.3, 0.7, { q: 1.2, attack: 0.2, hold: 0.25 });
    noise(a, 'lowpass', 3600, 200, 0.7, 0.6, { at: 0.25, attack: 0.02, hold: 0.15 });
    tone(a, 'sawtooth', 620, 90, 0.8, 0.1, { at: 0.1, attack: 0.15, dirt: true });
  },
};

/* Tiempo mínimo (segundos) entre dos repeticiones del mismo efecto: evita que se amontonen
   cuando algo pasa muchas veces seguidas. Lo que no está aquí usa 0.03. */
export const GAP = {
  coin: 0.05,
  shot: 0.06,
  laser: 0.12,
  rockBreak: 0.05,
  enemyHit: 0.09,
  enemyDown: 0.06,
  enemyShot: 0.1,
  bossShot: 0.1,
  bossHit: 0.09,
  hullHit: 0.1,
  alarm: 0.6,
  cometWarn: 0.4,
  comet: 0.2,
  suck: 0.22,
  holePull: 0.5,
  click: 0.05,
};

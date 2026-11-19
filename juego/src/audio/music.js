/**
 * Música hecha por código, sin archivos de audio. Cada tema es una partitura corta que se
 * repite, y un "secuenciador" va tocando las notas un poco antes de que suenen.
 *
 * Temas:
 *   doom  = metal industrial con sintetizador: el arranque de la partida
 *   metal = metal con guitarras simuladas: cuando la partida se pone pesada y en los jefes
 *   boss  = thrash con guitarras (variante para jefes, hoy sin usar)
 *   menu  = guitarra limpia · space = ambiental (viaje espacial)
 * Para cambiar un tema se cambian sus notas, sus riffs o su tempo.
 *
 * Las notas van en números MIDI (40 = mi grave de la guitarra, 69 = la; +12 = una octava arriba).
 * No usa Math.random: el azar del juego no se toca desde aquí.
 */
import { china, crash, hat, kick, ride, snare, tom } from './drums.js';
import { createAmp, createReverb, pluck } from './guitar.js';
import { createDirt, noise, tone } from './synth.js';

const LEVEL = 0.38; // volumen general de la música frente a los efectos
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const cents = (c) => Math.pow(2, c / 1200);
const on = (i, bus, t) => ({ ctx: i.ctx, out: i[bus], t });

/* ---------- instrumentos (i = canal del tema, t = cuándo suena) ---------- */
/* Guitarra rítmica: el mismo golpe en dos guitarras, una a cada lado, apenas desafinadas y
   desfasadas entre sí. muted = golpe seco ("chug") */
function rhythm(i, t, m, dur, muted) {
  for (const [amp, c, late] of [
    ['L', -6, 0],
    ['R', 7, 0.009],
  ]) {
    const input = i[(muted ? 'mute' : 'amp') + amp];
    pluck(i.ctx, input, t + late, m, dur, 0.6, { muted, cents: c });
    pluck(i.ctx, input, t + late, m + 7, dur, 0.5, { muted, cents: c }); // la quinta: acorde de poder
  }
  tone(on(i, 'grit', t), 'sawtooth', hz(m - 12), hz(m - 12), dur, 0.4, { hold: dur * 0.8 });
}
/* guitarra solista: una nota larga con temblor (vibrato), eco y sala */
function solo(i, t, m, dur) {
  pluck(i.ctx, i.lead, t, m, dur, 0.7, { vibrato: i.vibrato });
}
/* bombo que además "agacha" un instante el bajo y los sintetizadores: el bombeo de la electrónica */
function kickPump(i, t, sd, vol = 1) {
  kick(i, t, vol);
  i.pump.gain.setValueAtTime(0.3, t);
  i.pump.gain.linearRampToValueAtTime(1, t + sd * 2.5);
}
/* palmada */
function clap(i, t, vol = 1) {
  for (const at of [0, 0.011, 0.023])
    noise(on(i, 'drums', t), 'bandpass', 1500, 1500, 0.02, 0.5 * vol, { at, q: 1, attack: 0.001 });
  noise(on(i, 'drums', t), 'bandpass', 1500, 1200, 0.16, 0.35 * vol, { at: 0.03, q: 0.8, attack: 0.001 });
  noise(on(i, 'rev', t), 'bandpass', 1500, 1200, 0.15, 0.3 * vol, { q: 0.8 });
}
/* platillos de caja de ritmos (ruido): más suaves que los de batería */
function tick(i, t, vol = 1, open = false) {
  noise(on(i, 'drums', t), 'highpass', 8000, 8000, open ? 0.2 : 0.035, 0.22 * vol, { attack: 0.001 });
}
function splash(i, t, vol = 1) {
  noise(on(i, 'drums', t), 'highpass', 5500, 7500, 1.3, 0.25 * vol, { attack: 0.002 });
}
/* sintetizador pesado para riffs: una sola nota gruesa con mucha distorsión */
function heavy(i, t, m, dur, held) {
  const o = { attack: 0.003, hold: held ? dur * 0.8 : 0 };
  tone(on(i, 'heavy', t), 'sawtooth', hz(m), hz(m), dur, 0.5, o);
  tone(on(i, 'heavy', t), 'sawtooth', hz(m) * 1.006, hz(m) * 1.006, dur, 0.4, o);
  tone(on(i, 'heavy', t), 'square', hz(m - 12), hz(m - 12), dur, 0.35, o);
}
/* melodía de sintetizador: tres ondas apenas desafinadas, con sala */
function supersaw(i, t, m, dur, vol = 1) {
  const o = { attack: 0.02, hold: dur * 0.8 };
  for (const c of [-9, 0, 9])
    tone(on(i, 'air', t), 'sawtooth', hz(m) * cents(c), hz(m) * cents(c), dur, 0.055 * vol, o);
}
function pad(i, t, ms, dur, vol = 1) {
  const o = { attack: Math.min(0.6, dur * 0.3), hold: dur * 0.75 };
  for (const m of ms) {
    tone(on(i, 'warm', t), 'sawtooth', hz(m) * 0.997, hz(m) * 0.997, dur, 0.026 * vol, o);
    tone(on(i, 'warm', t), 'sawtooth', hz(m) * 1.003, hz(m) * 1.003, dur, 0.026 * vol, o);
  }
}
function bell(i, t, m, vol = 1) {
  tone(on(i, 'dry', t), 'sine', hz(m), hz(m), 1.3, 0.07 * vol);
  tone(on(i, 'dry', t), 'sine', hz(m + 12), hz(m + 12), 0.5, 0.02 * vol);
}

/* ---------- partituras ---------- */
/* Un riff es un compás escrito en 16 letras (una por semicorchea):
     minúscula = golpe corto sobre esa nota · MAYÚSCULA = nota sostenida, que dura mientras sigan los guiones
     -  = la nota anterior sigue sonando · .  = silencio
   Notas: e=mi  f=fa  g=sol  a=la  b=si bemol  h=si  c=do  d=re  (de grave a agudo) */
const NOTE = { e: 40, f: 41, g: 43, a: 45, b: 46, h: 47, c: 48, d: 50 };
/* qué hay en ese paso del riff: null, o { m: nota, len: duración en pasos, held: sostenida } */
function riffAt(bar, q) {
  const c = bar[q];
  if (c === '-' || c === '.') return null;
  const m = NOTE[c.toLowerCase()];
  if (c === c.toLowerCase()) return { m, len: 0.85, held: false };
  let len = 1;
  while (q + len < 16 && bar[q + len] === '-') len++;
  return { m, len: len * 0.96, held: true };
}
/* melodías: por compás, [paso (0–15), nota, duración en pasos] */
function melody(notes, q, sd, playNote) {
  for (const [at, m, len] of notes || []) if (at === q) playNote(m, len * sd * 0.96);
}
const gallop = (c) => (c.toUpperCase() + '-' + c + c + c + '-' + c + c).repeat(2);

/* Metal industrial con sintetizador: riff en mi con el intervalo "del diablo" (mi–si bemol) */
const DOOM_BARS = ['eeE-eeF-eeE-G-F-', 'eeE-eeF-eeB-A-G-', 'eeE-eeF-eeE-G-F-', 'eeE-eeF-E-G-B---'];
const DOOM_LEAD = {
  4: [[0, 76, 16]],
  5: [[0, 77, 16]],
  6: [[0, 79, 16]],
  7: [
    [0, 82, 8],
    [8, 81, 8],
  ],
};
/* Metal con guitarras: 20 compases: riff (8) → puente (4) → coro con solista (8) */
const RUN_BARS = [
  'E-eee-eeG-eeF-ee',
  'E-eee-eeB-eeA-G-',
  'E-eee-eeG-eeF-ee',
  'E-eee-eeG-A-B---',
  'E-eee-eeG-eeF-ee',
  'E-eee-eeB-eeA-G-',
  'E-eee-eeG-eeF-ee',
  'E-eee-eeG-A-B---',
  'CcccccccDddddddd',
  'EeeeeeeeeeeeG-F-',
  'CcccccccDddddddd',
  'EeeeeeeeE-G-A-H-',
  ...['e', 'e', 'c', 'd', 'e', 'e', 'g', 'h'].map(gallop),
];
const RUN_SOLO = [
  [
    [0, 76, 8],
    [8, 79, 4],
    [12, 78, 4],
  ],
  [
    [0, 76, 6],
    [6, 74, 2],
    [8, 71, 8],
  ],
  [
    [0, 72, 4],
    [4, 76, 4],
    [8, 79, 6],
    [14, 78, 2],
  ],
  [
    [0, 78, 4],
    [4, 81, 4],
    [8, 78, 4],
    [12, 74, 4],
  ],
  [
    [0, 83, 8],
    [8, 81, 4],
    [12, 79, 4],
  ],
  [
    [0, 78, 4],
    [4, 79, 4],
    [8, 76, 8],
  ],
  [
    [0, 79, 4],
    [4, 83, 4],
    [8, 86, 6],
    [14, 83, 2],
  ],
  [
    [0, 83, 4],
    [4, 81, 4],
    [8, 78, 4],
    [12, 75, 4],
  ],
];
/* Jefes: thrash con guitarras, 8 compases con un corte pesado al final */
const BOSS_BARS = [
  'eeF-eeG-eeF-eeB-',
  'eeF-eeG-B-A-G-F-',
  'eeF-eeG-eeF-eeB-',
  'eeF-eeG-B-A-G-F-',
  'eeF-eeG-eeF-eeB-',
  'eeF-eeG-B-A-G-F-',
  'E---..eeE---.eee',
  'E---..eeB---A-G-',
];
const BOSS_SOLO = {
  4: [
    [0, 76, 8],
    [8, 77, 8],
  ],
  5: [
    [0, 79, 8],
    [8, 82, 8],
  ],
};
/* Menú: guitarra limpia arpegiada */
const MENU_BARS = [
  { root: 40, arp: [40, 47, 52, 54, 55, 54, 52, 47] }, // mi menor
  { root: 48, arp: [48, 55, 60, 62, 64, 62, 60, 55] }, // do
  { root: 43, arp: [43, 50, 55, 59, 62, 59, 55, 50] }, // sol
  { root: 47, arp: [47, 54, 59, 63, 66, 63, 59, 54] }, // si mayor
];
/* Viaje espacial: ambiental, un acorde cada dos compases y campanas sueltas */
const SPACE_CHORDS = [
  { root: 50, pad: [53, 57, 60, 64] },
  { root: 46, pad: [53, 58, 62, 69] },
  { root: 53, pad: [52, 57, 60, 65] },
  { root: 48, pad: [52, 55, 60, 62] },
];
const SPACE_SCALE = [62, 65, 67, 69, 72];
/* los acordes dan la vuelta cada 4 compases dobles; el tema completo son dos vueltas, para que
   las campanas no se repitan tan pronto (casi un minuto) */
const SPACE_LOOP = 8 * 32;

/* Cada tema: su tempo (k = intensidad de 0 a 1), cuántos pasos tiene antes de repetirse (loop)
   y qué suena en cada paso (semicorchea) */
const TRACKS = {
  doom: {
    bpm: (k) => 130 + 8 * k,
    loop: 8 * 16,
    play(i, s, t, sd) {
      const bar = Math.floor(s / 16) % 8,
        q = s % 16,
        r = riffAt(DOOM_BARS[bar % 4], q);
      if (r) heavy(i, t, r.m, r.len * sd, r.held);
      if (bar < 4) {
        /* primera mitad: pesada, a medio tiempo */
        if (q % 4 === 0 || q === 10) kickPump(i, t, sd);
        if (q === 8) {
          snare(i, t, 1.2);
          clap(i, t, 0.7);
        }
        if (q % 2 === 0) tick(i, t, 0.6);
      } else {
        /* segunda mitad: se duplica el pulso y entra la melodía */
        if (q % 4 === 0) kickPump(i, t, sd);
        else if (q % 2 === 0) kick(i, t, 0.8);
        if (q === 4 || q === 12) snare(i, t);
        tick(i, t, q % 4 === 2 ? 1 : 0.4, q % 4 === 2);
        melody(DOOM_LEAD[bar], q, sd, (m, dur) => supersaw(i, t, m, dur, 1.3));
      }
      if (q === 0 && bar % 4 === 0) splash(i, t);
    },
  },
  metal: {
    bpm: (k) => 162 + 12 * k,
    loop: RUN_BARS.length * 16,
    play(i, s, t, sd) {
      const bar = Math.floor(s / 16) % RUN_BARS.length,
        q = s % 16,
        r = riffAt(RUN_BARS[bar], q);
      if (r) rhythm(i, t, r.m, r.len * sd, !r.held);
      if (bar < 8) {
        /* riff: el bombo va pegado a la guitarra */
        if (r || q % 4 === 0) kick(i, t, r && !r.held ? 0.8 : 1);
        if (q === 4 || q === 12) snare(i, t);
        if (q % 2 === 0) hat(i, t, q % 4 === 0 ? 1 : 0.6);
        if (q === 0) bar % 4 === 0 ? crash(i, t) : bar % 2 === 1 && china(i, t, 0.7);
      } else if (bar < 12) {
        /* puente: doble bombo y remate de tambores al final */
        kick(i, t, q % 4 === 0 ? 1 : 0.8);
        if (bar === 11 && q >= 12) tom(i, t, [190, 190, 150, 115][q - 12]);
        else if (q === 4 || q === 12) snare(i, t);
        if (q % 4 === 0) ride(i, t);
        if (q === 0 && bar === 8) crash(i, t);
      } else {
        /* coro: doble bombo, platillos abiertos y la guitarra solista */
        kick(i, t, q % 4 === 0 ? 1 : 0.8);
        if (q === 4 || q === 12) snare(i, t);
        if (q % 4 === 0) hat(i, t, 1, true);
        if (q === 0 && bar % 2 === 0) crash(i, t);
        melody(RUN_SOLO[bar - 12], q, sd, (m, dur) => solo(i, t, m, dur));
      }
    },
  },
  boss: {
    bpm: () => 184,
    loop: BOSS_BARS.length * 16,
    play(i, s, t, sd) {
      const bar = Math.floor(s / 16) % BOSS_BARS.length,
        q = s % 16,
        r = riffAt(BOSS_BARS[bar], q);
      if (r) rhythm(i, t, r.m, r.len * sd, !r.held);
      if (bar < 6) {
        /* ritmo de thrash: bombo en el tiempo, redoblante entre tiempos */
        if (q % 4 === 0) kick(i, t);
        if (q % 4 === 2) snare(i, t);
        if (q % 2 === 0) hat(i, t, 0.8);
        if (q === 0 && bar % 2 === 0) crash(i, t);
        melody(BOSS_SOLO[bar], q, sd, (m, dur) => solo(i, t, m, dur));
      } else {
        /* corte pesado: todo se frena a la mitad */
        if (r) kick(i, t);
        if (q === 8) snare(i, t, 1.2);
        if (q % 4 === 0) china(i, t);
      }
    },
  },
  menu: {
    bpm: () => 76,
    loop: 4 * 16,
    play(i, s, t, sd) {
      const q = s % 16,
        bar = MENU_BARS[Math.floor(s / 16) % 4];
      if (q % 2 === 0) pluck(i.ctx, i.clean, t, bar.arp[q / 2], sd * 10, 0.55);
      if (q === 0) {
        tone(on(i, 'dry', t), 'sine', hz(bar.root), hz(bar.root), sd * 15, 0.1, { attack: 0.3, hold: sd * 10 });
        kick(i, t, 0.3); // latido
      }
    },
  },
  space: {
    bpm: () => 66,
    loop: SPACE_LOOP,
    play(i, s, t, sd) {
      const ch = SPACE_CHORDS[Math.floor(s / 32) % 4];
      if (s % 32 === 0) {
        pad(i, t, ch.pad, sd * 32, 1.2);
        tone(on(i, 'dry', t), 'sine', hz(ch.root), hz(ch.root), sd * 30, 0.12, { attack: 1, hold: sd * 20 });
      }
      /* campanas: aparecen según una cuenta fija (parece azar, pero siempre es igual, y se
         repite cada vuelta completa para que el tema se pueda grabar y repetir sin corte) */
      const h = Math.imul((s % SPACE_LOOP) + 7, 2654435761) >>> 0;
      if (s % 2 === 0 && h % 5 < 2) {
        const m = SPACE_SCALE[(h >>> 8) % 5] + ((h >>> 16) % 3 === 0 ? 12 : 0);
        bell(i, t, m, 1);
        bell(i, t + sd * 3, m, 0.45);
        bell(i, t + sd * 6, m, 0.2);
      }
    },
  },
};
export const MUSIC_SCENES = Object.keys(TRACKS);
/* Para grabar un tema: cuántos pasos dura una vuelta completa (`loop`) y cuánto dura cada paso, en segundos */
export const trackLoop = (name, k) => ({ steps: TRACKS[name].loop, step: 15 / TRACKS[name].bpm(k) });

/**
 * Secuenciador. Se le llama seguido con tick(tema, intensidad) y agenda las notas que caen
 * en el próximo instante. Lo llama el bucle del juego (no un temporizador), por la misma razón
 * que la cuenta regresiva: en el celular los temporizadores se atrasan con el dedo en pantalla.
 */
export function createMusic(ctx, destination) {
  const master = ctx.createGain();
  master.gain.value = LEVEL;
  master.connect(destination);
  const room = createReverb(ctx, master, 0.5);
  let scene = null,
    bus = null,
    step = 0,
    nextT = 0,
    quiet = false,
    volume = 1;
  const aim = () => master.gain.setTargetAtTime(LEVEL * volume * (quiet ? 0.35 : 1), ctx.currentTime, 0.1);
  const closing = [];

  /* cada tema suena por su propio canal (con sus instrumentos), para poder apagarlo suave al cambiar */
  function openBus(now) {
    const node = (value, to) => {
      const g = ctx.createGain();
      g.gain.value = value;
      g.connect(to);
      return g;
    };
    const lowpass = (f, to) => {
      const n = ctx.createBiquadFilter();
      n.type = 'lowpass';
      n.frequency.value = f;
      n.connect(to);
      return n;
    };
    const dry = node(1, master);
    dry.gain.setValueAtTime(0.0001, now);
    dry.gain.linearRampToValueAtTime(1, now + 0.25);
    const rev = node(1, room);
    rev.gain.setValueAtTime(0.0001, now);
    rev.gain.linearRampToValueAtTime(1, now + 0.25);
    /* lo que el bombo "agacha": bajo y sintetizadores */
    const pump = node(1, dry);
    const air = lowpass(3800, pump);
    air.connect(node(0.25, rev));
    /* dos guitarras rítmicas, una a cada lado; los golpes secos entran más opacos */
    const ampL = createAmp(ctx, dry, 14, 0.1, -0.75),
      ampR = createAmp(ctx, dry, 14, 0.1, 0.75);
    /* solista: al centro, con eco y algo de sala */
    const leadOut = node(1, dry);
    leadOut.connect(node(0.35, rev));
    const echo = ctx.createDelay(1);
    echo.delayTime.value = 0.3;
    echo.connect(node(0.35, echo)); // el eco se repite, cada vez más bajo
    echo.connect(dry);
    leadOut.connect(node(0.3, echo));
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 5.5;
    const depth = ctx.createGain();
    depth.gain.value = 12; // centésimas de semitono
    vibrato.connect(depth);
    vibrato.start(now);
    /* guitarra limpia (menú): directa, con bastante sala */
    const clean = lowpass(2600, dry);
    clean.connect(node(0.6, rev));
    return {
      ctx,
      dry,
      rev,
      pump,
      air,
      warm: lowpass(1500, dry),
      grit: lowpass(900, createDirt(ctx, pump, 4, 0.34)),
      heavy: lowpass(1800, createDirt(ctx, pump, 8, 0.3)),
      drums: node(0.5, dry),
      ampL,
      ampR,
      muteL: lowpass(900, ampL),
      muteR: lowpass(900, ampR),
      lead: createAmp(ctx, leadOut, 10, 0.12),
      vibrato: depth,
      lfo: vibrato,
      clean,
    };
  }
  function closeBus(now) {
    if (!bus) return;
    for (const g of [bus.dry, bus.rev]) {
      g.gain.cancelScheduledValues(now);
      g.gain.setTargetAtTime(0, now, 0.1);
    }
    bus.lfo.stop(now + 5);
    closing.push({ bus, at: now });
    bus = null;
  }
  return {
    /* tema: uno de MUSIC_SCENES, o null (silencio) · k: intensidad 0–1 */
    tick(name, k = 0, ahead = 0.3) {
      const now = ctx.currentTime;
      while (closing.length && now - closing[0].at > 5) {
        const old = closing.shift().bus;
        old.dry.disconnect();
        old.rev.disconnect();
      }
      if (name !== scene) {
        closeBus(now);
        scene = name;
        step = 0;
        nextT = now + 0.06;
        if (TRACKS[name]) bus = openBus(now);
      }
      const track = TRACKS[scene];
      if (!track || !bus) return;
      if (nextT < now - 0.2) nextT = now + 0.05; // hubo una pausa larga: retoma desde ya, sin ponerse al día
      while (nextT < now + ahead) {
        const sd = 15 / track.bpm(k);
        track.play(bus, step, nextT, sd, k);
        nextT += sd;
        step++;
      }
    },
    /* baja el volumen (pausa, ventana de choque) sin cortar la música */
    duck(on) {
      if (on === quiet) return;
      quiet = on;
      aim();
    },
    /* volumen que eligió el jugador: 0 a 1 */
    setLevel(v) {
      volume = v;
      aim();
    },
  };
}

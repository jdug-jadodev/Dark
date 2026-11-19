/**
 * Motor de la nave: un sonido continuo y discreto mientras se juega. Es un rugido grave
 * (dos ondas filtradas) más el soplido del chorro (ruido filtrado), con un temblor leve.
 * Con más potencia sube de tono, se abre y suena más: así se siente la velocidad y el nitro.
 */
import { noiseBuffer } from './synth.js';

const VOLUME = 0.035; // discreto: acompaña, no tapa

export function createEngine(ctx, destination) {
  const level = ctx.createGain();
  level.gain.value = 0;
  level.connect(destination);
  /* temblor */
  const shake = ctx.createGain();
  shake.connect(level);
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 13;
  const lfoDepth = ctx.createGain();
  lfoDepth.gain.value = 0.18;
  lfo.connect(lfoDepth);
  lfoDepth.connect(shake.gain);
  /* rugido */
  const growl = ctx.createBiquadFilter();
  growl.type = 'lowpass';
  growl.frequency.value = 420;
  growl.connect(shake);
  const oscs = [82, 123.6].map((f) => {
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    o.connect(growl);
    return { o, f };
  });
  /* chorro */
  const jet = ctx.createBiquadFilter();
  jet.type = 'bandpass';
  jet.Q.value = 0.7;
  jet.frequency.value = 600;
  const jetLevel = ctx.createGain();
  jetLevel.gain.value = 1.6;
  jet.connect(jetLevel);
  jetLevel.connect(shake);
  const hiss = ctx.createBufferSource();
  hiss.buffer = noiseBuffer(ctx);
  hiss.loop = true;
  hiss.connect(jet);

  let started = false,
    last = -1;
  return {
    /* power: 0 = apagado · 0–1 = crucero a toda marcha · más de 1 = nitro */
    set(power) {
      const p = Math.round(Math.max(0, power) * 20) / 20;
      if (p === last) return;
      last = p;
      const now = ctx.currentTime;
      if (p > 0 && !started) {
        started = true;
        lfo.start(now);
        hiss.start(now);
        for (const { o } of oscs) o.start(now);
      }
      level.gain.setTargetAtTime(p > 0 ? VOLUME * (0.6 + 0.6 * p) : 0, now, 0.2);
      jet.frequency.setTargetAtTime(500 + 900 * p, now, 0.25);
      growl.frequency.setTargetAtTime(350 + 500 * p, now, 0.25);
      for (const { o, f } of oscs) o.frequency.setTargetAtTime(f * (1 + 0.45 * p), now, 0.3);
    },
  };
}

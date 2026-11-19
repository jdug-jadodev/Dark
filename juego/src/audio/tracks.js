/**
 * Música grabada. Los temas de music.js se tocan una sola vez en el computador
 * (tools/grabar-musica.mjs) y quedan como archivos; el build los mete dentro de la página.
 * Aquí solo se reproducen en bucle, que casi no gasta procesador: tocar las notas en vivo
 * era lo que más calentaba el teléfono.
 *
 * Cada archivo trae un margen repetido a cada lado del bucle; por eso no se repite de punta a
 * punta sino entre loopStart y loopEnd, que vienen anotados en la página junto con el volumen.
 *
 * Si la página no trae un tema (o no se puede leer), has() dice que no y suena el de código.
 */
/* Al entrar a un tema: cuáles conviene ir preparando y cuáles soltar para no ocupar memoria */
const NEXT = { doom: ['metal'] };
const DROP = { space: ['doom', 'metal'], doom: ['space'], metal: ['space'] };

export function createTracks(ctx, destination) {
  const master = ctx.createGain();
  master.connect(destination);
  const info = {}; // tema → { el, loopStart, loopEnd, gain, buffer, loading }
  for (const el of document.querySelectorAll('script[data-track]'))
    info[el.dataset.track] = {
      el,
      loopStart: +el.dataset.loopStart,
      loopEnd: +el.dataset.loopEnd,
      gain: +el.dataset.gain,
      buffer: null,
      loading: null,
    };
  let scene = null,
    current = null, // { src, gain } del tema que está sonando
    quiet = false,
    volume = 1;
  const aim = () => master.gain.setTargetAtTime(volume * (quiet ? 0.35 : 1), ctx.currentTime, 0.1);

  /* el archivo viene en la página como texto; convertirlo en sonido tarda un instante */
  function load(name) {
    const t = info[name];
    if (!t || t.loading) return;
    const text = atob(t.el.textContent.trim()),
      bytes = new Uint8Array(text.length);
    for (let i = 0; i < text.length; i++) bytes[i] = text.charCodeAt(i);
    t.loading = ctx.decodeAudioData(bytes.buffer).then(
      (buffer) => {
        if (t.loading) t.buffer = buffer;
      },
      () => {
        delete info[name]; // no se pudo leer: ese tema queda a cargo de la música por código
      },
    );
  }
  function stop() {
    if (!current) return;
    const now = ctx.currentTime;
    current.gain.gain.cancelScheduledValues(now);
    current.gain.gain.setTargetAtTime(0, now, 0.1);
    current.src.stop(now + 0.8);
    current = null;
  }
  function start(t) {
    const now = ctx.currentTime,
      src = ctx.createBufferSource(),
      gain = ctx.createGain();
    src.buffer = t.buffer;
    src.loop = true;
    src.loopStart = t.loopStart;
    src.loopEnd = t.loopEnd;
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.linearRampToValueAtTime(t.gain, now + 0.25);
    src.connect(gain);
    gain.connect(master);
    src.start(now, t.loopStart);
    current = { src, gain };
  }
  return {
    has: (name) => !!info[name],
    names: () => Object.keys(info),
    /* tema que debe sonar ahora, o null (silencio). Se llama en cada cuadro. */
    tick(name) {
      if (name !== scene) {
        stop();
        scene = name;
        for (const other of DROP[name] || [])
          if (info[other]) {
            info[other].buffer = null;
            info[other].loading = null;
          }
        load(name);
        for (const other of NEXT[name] || []) load(other);
      }
      const t = info[scene];
      if (t && t.buffer && !current) start(t); // arranca en cuanto el archivo está listo
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

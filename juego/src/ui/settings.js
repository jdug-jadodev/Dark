/** Configuración: volumen de la música y de los efectos, calidad gráfica y tipo de control. Se abre desde el menú y desde la pausa. */
import { renderAccountRow } from './account.js';
import { renderLang } from './lang.js';
import { play, setVolume, volumes } from '../audio/sound.js';
import { tr } from '../core/i18n.js';
import { gfx, setGfx } from '../core/perf.js';
import { S, save } from '../core/profile.js';
import { G } from '../core/state.js';
import { $ } from './dom.js';
import { showPad } from './flow.js';
import { onReminderChange, reminderAvailable, reminderOn, setReminder } from './reminder.js';
import { resize } from '../render/engine.js';

const GFX_NOTE = {
  auto: tr('Empieza en alta y baja sola si el teléfono se queda corto o se calienta.'),
  high: tr('La mejor imagen. Gasta más batería.'),
  medium: tr('Un poco menos nítido. Gasta menos batería y calienta menos.'),
  low: tr('Para teléfonos modestos o para cuidar la batería.'),
};
const SLIDERS = [
  ['volMusic', 'music'],
  ['volSfx', 'sfx'],
];
function render() {
  const v = volumes();
  for (const [id, which] of SLIDERS) {
    $(id).value = v[which];
    $(id + 'N').textContent = v[which] ? v[which] + '%' : tr('apagado');
  }
  document.querySelectorAll('#gfx .opt').forEach((b) => b.classList.toggle('sel', b.dataset.gfx === gfx()));
  $('gfxNote').textContent = GFX_NOTE[gfx()];
  document
    .querySelectorAll('#ctrl .opt')
    .forEach((b) => b.classList.toggle('sel', b.dataset.ctrl === (S.ctrl || 'swipe')));
  $('remRow').style.display = reminderAvailable() ? '' : 'none';
  renderAccountRow();
  renderLang();
  if (reminderAvailable()) {
    const on = reminderOn();
    document.querySelectorAll('#rem .opt').forEach((b) => b.classList.toggle('sel', (b.dataset.rem === '1') === on));
  }
}
export function openSettings() {
  render();
  $('settings').classList.add('show');
}
/* devuelve true si estaba abierta (para el botón "atrás" del sistema) */
export function closeSettings() {
  const open = $('settings').classList.contains('show');
  $('settings').classList.remove('show');
  return open;
}
export function bootSettings() {
  document.addEventListener('click', (e) => {
    if (e.target.closest && e.target.closest('[data-open="settings"]')) openSettings();
  });
  $('settingsClose').addEventListener('click', closeSettings);
  for (const [id, which] of SLIDERS) {
    /* mientras se arrastra, el volumen cambia al instante; al soltar se guarda */
    $(id).addEventListener('input', () => {
      setVolume(which, +$(id).value);
      render();
    });
    $(id).addEventListener('change', () => {
      setVolume(which, +$(id).value, true);
      if (which === 'sfx') play('coin'); // una muestra para oír cómo quedó
    });
  }
  $('gfx').addEventListener('click', (e) => {
    const b = e.target.closest('[data-gfx]');
    if (!b) return;
    setGfx(b.dataset.gfx);
    resize(); // se nota al instante
    render();
  });
  $('rem').addEventListener('click', (e) => {
    const b = e.target.closest('[data-rem]');
    if (!b) return;
    setReminder(b.dataset.rem === '1'); // si Android pregunta por el permiso, la respuesta llega después
    render();
  });
  onReminderChange(render);
  $('ctrl').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ctrl]');
    if (!b) return;
    S.ctrl = b.dataset.ctrl;
    save();
    render();
    if (G.state === 'pause') showPad(true); // en plena partida: muestra u oculta las flechas
  });
}

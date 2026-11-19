/**
 * Punto de arranque del juego. Los módulos no hacen nada al importarse:
 * cada uno expone funciones boot…() y aquí se llaman en orden, porque unas dependen de otras
 * (por ejemplo, la escena debe existir antes de agregarle la pista).
 */
import { bootPlatform } from './platform/platform.js';
import { bootProfile } from './core/profile.js';
import { bootPerf } from './core/perf.js';
import { bootDom } from './ui/dom.js';
import { bootEngine, bootEngineResize } from './render/engine.js';
import { bootKit } from './render/kit.js';
import { bootTrack } from './render/track.js';
import { bootEnvironment } from './render/environment.js';
import { bootProps } from './render/models/props.js';
import { bootEnemies } from './render/models/enemies.js';
import { bootEffects } from './render/effects.js';
import { bootDraw } from './render/draw.js';
import { bootSpaceScene, bootSpaceObjects } from './render/spaceScene.js';
import { bootPlanets } from './render/planets.js';
import { bootBackdrop } from './render/backdrop.js';
import { bootPortals } from './render/portals.js';
import { bootHoles } from './render/holes.js';
import { bootEndScreens } from './ui/endScreens.js';
import { bootAds } from './ui/ads.js';
import { bootFlow } from './ui/flow.js';
import { bootMenu } from './ui/menu.js';
import { bootSettings } from './ui/settings.js';
import { bootInput } from './ui/input.js';
import { bootLoop } from './loop.js';
import { bootSound } from './audio/sound.js';

if (!window.THREE) {
  document.getElementById('menu').querySelector('.sub').textContent =
    'No se pudo cargar el motor 3D (necesita internet).';
} else {
  bootPlatform();
  bootProfile();
  bootPerf();
  bootDom();
  bootEngine();
  bootKit();
  bootTrack();
  bootEnvironment();
  bootProps();
  bootEnemies();
  bootEffects();
  bootEngineResize();
  bootDraw();
  bootSpaceScene();
  bootPlanets();
  bootSpaceObjects();
  bootBackdrop();
  bootPortals();
  bootHoles();
  bootEndScreens();
  bootAds();
  bootFlow();
  bootMenu();
  bootSettings();
  bootInput();
  bootSound();
  bootLoop();
}

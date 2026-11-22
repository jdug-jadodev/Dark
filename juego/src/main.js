/**
 * Punto de arranque del juego. Los módulos no hacen nada al importarse:
 * cada uno expone funciones boot…() y aquí se llaman en orden, porque unas dependen de otras
 * (por ejemplo, la escena debe existir antes de agregarle la pista).
 */
import { bootPlatform } from './platform/platform.js';
import { S, bootProfile, save } from './core/profile.js';
import { noteVisit } from './core/visits.js';
import { bootPerf } from './core/perf.js';
import { G } from './core/state.js';
import { spawnCrater, spawnMeteor } from './game/blasts.js';
import { spawnArch, spawnPeak, spawnPools } from './game/run.js';
import { WORLDS, survivalMap, worldOf } from './core/worlds.js';
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
import { bootFlow, crash, startRun } from './ui/flow.js';
import { bootMenu, renderMenu } from './ui/menu.js';
import { bootDaily } from './ui/daily.js';
import { bootCup } from './ui/cup.js';
import { bootNews } from './ui/news.js';
import { bootAccount, push } from './core/account.js';
import { bootAccountScreen } from './ui/account.js';
import { bootMaps } from './ui/maps.js';
import { playSurvival } from './ui/tracks.js';
import { bootWorldMap } from './ui/worlds.js';
import { bootStats } from './ui/stats.js';
import { bootGarage } from './ui/garage.js';
import { bootShop } from './ui/shop.js';
import { bootSettings } from './ui/settings.js';
import { bootReminder } from './ui/reminder.js';
import { bootInput } from './ui/input.js';
import { bootLoop } from './loop.js';
import { bootSound } from './audio/sound.js';

if (!window.THREE) {
  document.getElementById('mBest').textContent = 'No se pudo cargar el motor 3D (necesita internet).';
} else {
  bootPlatform();
  bootProfile();
  bootAccount(); // antes de que el arranque toque el perfil: ver core/account.js
  noteVisit(); // medición: hoy se abrió el juego
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
  bootReminder();
  bootMenu();
  bootDaily(renderMenu);
  bootCup(renderMenu);
  bootNews();
  bootWorldMap();
  bootMaps();
  bootStats();
  bootGarage();
  bootShop();
  bootSettings();
  bootAccountScreen(renderMenu);
  bootInput();
  bootSound();
  bootLoop();
  /* para las pruebas de la pista con semilla: fijar la semilla de la próxima Supervivencia y leer
     la huella de la pista que va saliendo */
  window.__giroSeed = (seed) => {
    G.nextSeed = seed;
    G.nextKind = 'test';
    startRun('endless');
  };
  window.__giroTrack = () => ({ seed: G.run.seed, t: G.t, sig: G.run.sig });
  /* y para ver un mundo sin pasar por el mapa */
  window.__giroWorld = (id) => {
    G.nextWorld = worldOf(id);
    startRun();
  };
  /* para ir directo al jefe del mundo; con un nombre de ataque, lo obliga a usar ese */
  /* para jugar Supervivencia en un mapa concreto: el id de un mundo, o 'espacio' */
  window.__giroMap = (id) => playSurvival(id);
  /* para probar las cuentas: cambiar el perfil como lo haría una partida, y subirlo ya */
  window.__giroProfile = (change) => {
    Object.assign(S, change);
    save();
    return { coins: S.coins, acct: S.acct };
  };
  window.__giroPush = () => push();
  window.__giroMapIds = () => WORLDS.filter((w) => w.ready).map((w) => w.id);
  window.__giroMaps = (n) => Array.from({ length: n }, () => (survivalMap() || { id: 'espacio' }).id);
  window.__giroState = () => ({
    t: G.t,
    pts: G.run.pts,
    mode: G.run.mode,
    state: G.state,
    map: G.run.map ? G.run.map.id : 'espacio',
  });
  window.__giroBoss = (atk) => {
    if (atk === 'die') crash();
    else if (G.run.mode !== 'boss') G.run.pts = 1e6;
    else if (atk && G.run.boss) {
      const b = G.run.boss;
      b.atk = null;
      b.rest = 0;
      b.last = '';
      b.sig = [atk];
    }
    return G.run.mode !== 'boss' ? 'run' : G.run.boss.intro > 0 ? 'intro' : 'fight';
  };
  /* y para hacer salir ya una montaña (o volcán) del mundo que se esté jugando */
  window.__giroPeak = (what) => {
    const w = G.run.world,
      pk = w && w.peaks;
    if (!w) return;
    if (what === 'meteor' && w.meteors) spawnMeteor(w.meteors);
    else if (what === 'crater' && w.craters) spawnCrater(w.craters);
    else if (what === 'pool' && pk && pk.pools) spawnPools(pk.pools);
    else if (what && pk && pk.arch) spawnArch(pk.arch);
    else if (pk) spawnPeak(pk);
  };
}

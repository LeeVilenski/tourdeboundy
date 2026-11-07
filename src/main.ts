import Phaser from 'phaser';
import './style.css';
import { makeTextures } from './textures';
import { MenuScene } from './scenes/MenuScene';
import { LevelScene } from './scenes/LevelScene';
import { ResultsScene } from './scenes/ResultsScene';
import { wireInput, input } from './ui/input';

class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }
  create() {
    makeTextures(this);
    const params = new URLSearchParams(location.search);
    const lvl = Number(params.get('level'));
    if (lvl) this.scene.start('Level', { level: lvl });
    else this.scene.start('Menu');
  }
}

wireInput();
(window as any).tdbInput = input;

function startGame() {
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#1d2b4f',
    scale: { mode: Phaser.Scale.EXPAND, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1280, height: 720 },
    physics: {
      default: 'matter',
      matter: { gravity: { x: 0, y: 1 }, positionIterations: 10, velocityIterations: 8, constraintIterations: 6, runner: { fps: 60 }, debug: new URLSearchParams(location.search).has('debug') },
    },
    scene: [BootScene, MenuScene, LevelScene, ResultsScene],
  });
  (window as any).game = game;

  // If the screen changes shape (phone rotated, browser bar shown/hidden), redraw the menu/results
  // screens so they fit; levels follow the camera so they cope on their own.
  let timer = 0;
  let lastLandscape = window.innerWidth > window.innerHeight;
  const relayout = () => {
    clearTimeout(timer);
    timer = window.setTimeout(() => {
      game.scale.refresh();
      const landscape = window.innerWidth > window.innerHeight;
      if (landscape === lastLandscape) return;
      lastLandscape = landscape;
      if (!landscape) return;
      for (const key of ['Menu', 'Results']) {
        const sc = game.scene.getScene(key);
        if (sc && sc.sys.isActive()) sc.scene.restart(sc.sys.settings.data);
      }
    }, 250);
  };
  window.addEventListener('resize', relayout);
  window.addEventListener('orientationchange', relayout);
}

// On phones, don't start until the phone is sideways: starting upright lays everything out for a tall
// screen (the 'brown screen' bug). The rotate prompt shows meanwhile.
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0 || matchMedia('(pointer: coarse)').matches;
const portraitPhone = () => isTouchDevice && (screen.orientation ? screen.orientation.type.startsWith('portrait') : matchMedia('(orientation: portrait)').matches);
if (portraitPhone()) {
  const wait = () => {
    if (portraitPhone()) return;
    window.removeEventListener('resize', wait);
    window.removeEventListener('orientationchange', wait);
    setTimeout(startGame, 200);
  };
  window.addEventListener('resize', wait);
  window.addEventListener('orientationchange', wait);
  screen.orientation?.addEventListener('change', wait);
} else {
  startGame();
}

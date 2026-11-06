import Phaser from 'phaser';
import './style.css';
import { makeTextures } from './textures';
import { MenuScene } from './scenes/MenuScene';
import { LevelScene } from './scenes/LevelScene';
import { ResultsScene } from './scenes/ResultsScene';
import { wireInput } from './ui/input';

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

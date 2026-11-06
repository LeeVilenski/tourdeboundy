import Phaser from 'phaser';
import { willOnBike } from '../entities/WillSprite';
import { LEVEL_NAMES, LEVELS } from '../levels';
import { isTouch } from '../ui/input';
import { sfx } from '../sfx';
import { bestScore, unlockedCount } from '../score';

export function bestTime(level: number): number | null {
  try { const v = localStorage.getItem(`tdb-best-${level}`); return v ? Number(v) : null; } catch { return null; }
}
export function fmtTime(ms: number) {
  const s = ms / 1000;
  return `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
}

export function scenery(scene: Phaser.Scene) {
  const W = scene.scale.width, H = scene.scale.height;
  const g = scene.add.graphics();
  g.fillGradientStyle(0x4a7fe0, 0x4a7fe0, 0xbfe0ff, 0xbfe0ff, 1).fillRect(0, 0, W, H);
  for (let i = 0; i < 5; i++) scene.add.image(120 + i * 280, 70 + (i % 2) * 60, 'cloud').setScale(0.6);
  const hill = (color: number, base: number, amp: number, f: number) => {
    g.fillStyle(color, 1).beginPath().moveTo(0, H);
    for (let x = 0; x <= W; x += 20) g.lineTo(x, base - amp * Math.sin(x * f + base));
    g.lineTo(W, H).closePath().fillPath();
  };
  hill(0x8cc36a, 470, 50, 0.006);
  hill(0x5fa646, 540, 35, 0.01);
  g.fillStyle(0x3a3a3f, 1).fillRect(0, 620, W, 24);
  g.fillStyle(0x6b3e1d, 1).fillRect(0, 644, W, H - 644);
}

export class MenuScene extends Phaser.Scene {
  constructor() { super('Menu'); }

  create() {
    const W = this.scale.width;
    scenery(this);

    const title = this.add.text(W / 2, 95, 'TOUR DE BOUNDY', {
      fontFamily: 'Arial Black, Arial', fontSize: '76px', color: '#ffd400', stroke: '#111', strokeThickness: 12,
    }).setOrigin(0.5);
    title.setShadow(0, 8, '#1d2b4f', 0, true, true);
    this.tweens.add({ targets: title, angle: { from: -1.5, to: 1.5 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
    this.add.text(W / 2, 165, '“Rest day? Never heard of her.” — Willem Boundy', {
      fontFamily: 'Trebuchet MS, Arial', fontStyle: 'bold italic', fontSize: '22px', color: '#fff', stroke: '#1d2b4f', strokeThickness: 5,
    }).setOrigin(0.5);

    const will = willOnBike(this, -120, 578, 1.4);
    this.tweens.add({ targets: will, x: W + 140, duration: 9000, repeat: -1 });

    // Level cards
    const startX = W / 2 - 2 * 205;
    LEVEL_NAMES.forEach((name, i) => {
      const unlocked = i < unlockedCount();
      const x = startX + i * 205, y = 300;
      const card = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, 186, 150, unlocked ? 0xe63946 : 0x555b6e, 1).setStrokeStyle(5, 0x111111);
      const num = this.add.text(0, -40, `${i + 1}`, { fontFamily: 'Arial Black, Arial', fontSize: '44px', color: '#fff', stroke: '#111', strokeThickness: 6 }).setOrigin(0.5);
      const nm = this.add.text(0, 14, name, { fontFamily: 'Arial Black, Arial', fontSize: '17px', color: '#fff', align: 'center', wordWrap: { width: 170 } }).setOrigin(0.5);
      const best = unlocked ? bestTime(i + 1) : null;
      const hi = unlocked ? bestScore(i + 1) : null;
      const sub = this.add.text(0, 50, unlocked ? (hi && best ? `★ ${hi.toLocaleString()} · ${fmtTime(best)}` : 'RIDE ▶') : '🔒 Finish level ' + i, {
        fontFamily: 'Trebuchet MS, Arial', fontStyle: 'bold', fontSize: '15px', color: unlocked ? '#ffd400' : '#ccc',
      }).setOrigin(0.5);
      card.add([bg, num, nm, sub]);
      if (unlocked) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => card.setScale(1.06));
        bg.on('pointerout', () => card.setScale(1));
        bg.on('pointerdown', () => this.start(i + 1));
      } else card.setAlpha(0.75);
    });

    const help = isTouch()
      ? 'Green = pedal · Left = brake · ↺ ↻ = lean · ⚡ = sprint · Tap the Garmin to ignore it'
      : '↑/W pedal · ↓/S brake · ←/→ lean · SHIFT sprint · G ignore Garmin · R restart · P pause';
    this.add.text(W / 2, 410, help, {
      fontFamily: 'Trebuchet MS, Arial', fontStyle: 'bold', fontSize: '19px', color: '#fff', backgroundColor: '#1d2b4fcc', padding: { x: 14, y: 8 },
    }).setOrigin(0.5);

    const mute = this.add.text(W - 20, 20, sfx.muted ? '🔇' : '🔊', { fontSize: '34px' }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    mute.on('pointerdown', () => mute.setText(sfx.toggle() ? '🔇' : '🔊'));

    this.input.keyboard?.once('keydown-ENTER', () => this.start(1));
    this.input.keyboard?.once('keydown-SPACE', () => this.start(1));
  }

  start(level: number) {
    sfx.unlock(); sfx.click();
    // try to go fullscreen + landscape on phones
    if (this.sys.game.device.input.touch && !this.scale.isFullscreen) {
      try { this.scale.startFullscreen(); (screen.orientation as any)?.lock?.('landscape').catch(() => {}); } catch { /* ignore */ }
    }
    this.cameras.main.fadeOut(300);
    this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Level', { level }));
  }
}

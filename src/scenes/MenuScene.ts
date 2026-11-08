import Phaser from 'phaser';
import { willOnBike } from '../entities/WillSprite';
import { LEVEL_NAMES, LEVELS } from '../levels';
import { isTouch } from '../ui/input';
import { sfx } from '../sfx';
import { bestScore, unlockedCount } from '../score';
import { bestMedal, challengeDone, MEDAL_ICON, KITS, medalPoints, currentKit, chooseKit, autoPedal, setAutoPedal, CHALLENGES } from '../progress';

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
    const N = LEVEL_NAMES.length, step = Math.min(205, (W - 40) / N), cw = step - 14;
    const startX = W / 2 - ((N - 1) / 2) * step;
    LEVEL_NAMES.forEach((name, i) => {
      const unlocked = i < unlockedCount();
      const x = startX + i * step, y = 300;
      const card = this.add.container(x, y);
      const bg = this.add.rectangle(0, 0, cw, 150, unlocked ? 0xe63946 : 0x555b6e, 1).setStrokeStyle(5, 0x111111);
      const num = this.add.text(0, -40, `${i + 1}`, { fontFamily: 'Arial Black, Arial', fontSize: '44px', color: '#fff', stroke: '#111', strokeThickness: 6 }).setOrigin(0.5);
      const nm = this.add.text(0, 14, name, { fontFamily: 'Arial Black, Arial', fontSize: N > 5 ? '15px' : '17px', color: '#fff', align: 'center', wordWrap: { width: cw - 14 } }).setOrigin(0.5);
      const best = unlocked ? bestTime(i + 1) : null;
      const hi = unlocked ? bestScore(i + 1) : null;
      const sub = this.add.text(0, 50, unlocked ? (hi && best ? `★ ${hi.toLocaleString()} · ${fmtTime(best)}` : 'RIDE ▶') : '🔒 Finish level ' + i, {
        fontFamily: 'Trebuchet MS, Arial', fontStyle: 'bold', fontSize: '15px', color: unlocked ? '#ffd400' : '#ccc',
      }).setOrigin(0.5);
      const m = unlocked ? bestMedal(i + 1) : null;
      const badges = this.add.text(cw / 2 - 8, -62, `${m ? MEDAL_ICON[m] : ''}${challengeDone(i + 1) ? '⭐' : ''}`, { fontSize: '22px' }).setOrigin(1, 0);
      card.add([bg, num, nm, sub, badges]);
      if (unlocked) {
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerover', () => card.setScale(1.06));
        bg.on('pointerout', () => card.setScale(1));
        bg.on('pointerdown', () => this.start(i + 1));
      } else card.setAlpha(0.75);
    });

    const help = isTouch()
      ? 'Left thumb: ↺ ↻ lean · Right thumb: pedal, HOP, brake, ⚡ sprint · Lean in the air to flip!'
      : '↑/W pedal · ↓/S brake · ←/→ lean (flip in the air!) · SPACE hop · SHIFT sprint · G Garmin · R restart';
    this.add.text(W / 2, 410, help, {
      fontFamily: 'Trebuchet MS, Arial', fontStyle: 'bold', fontSize: '19px', color: '#fff', backgroundColor: '#1d2b4fcc', padding: { x: 14, y: 8 },
    }).setOrigin(0.5);

    // kit picker + auto-pedal toggle
    const pts = medalPoints();
    let ki = Math.max(0, KITS.findIndex((k) => k.id === currentKit().id));
    let kitWill: Phaser.GameObjects.Container | undefined;
    const kitLabel = this.add.text(W / 2, 475, '', { fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#fff', backgroundColor: '#1d2b4fcc', padding: { x: 14, y: 8 } }).setOrigin(0.5);
    const perkLabel = this.add.text(W / 2, 515, '', { fontFamily: 'Trebuchet MS, Arial', fontStyle: 'bold', fontSize: '17px', color: '#ffd400', stroke: '#1d2b4f', strokeThickness: 5 }).setOrigin(0.5);
    const showKit = () => {
      const k = KITS[ki], locked = pts < k.need;
      perkLabel.setText(k.perkText);
      kitLabel.setText(locked ? `KIT: ${k.name}  🔒 ${k.need} medal pts (you have ${pts})` : `KIT: ${k.name}`);
      if (!locked) chooseKit(k.id);
      kitWill?.destroy();
      kitWill = willOnBike(this, W / 2 + 420, 610, 1.1, locked ? KITS[0] : k);
      if (locked) kitWill.setAlpha(0.4);
    };
    const arrow = (x: number, t: string, d: number) => this.add.text(x, 475, t, { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#ffd400', stroke: '#111', strokeThickness: 5 })
      .setOrigin(0.5).setInteractive({ useHandCursor: true }).on('pointerdown', () => { ki = (ki + d + KITS.length) % KITS.length; sfx.click(); showKit(); });
    arrow(W / 2 - 300, '◀', -1); arrow(W / 2 + 300 - 60, '▶', 1);
    showKit();
    this.add.text(W / 2, 545, "Medal points: 🥉 1 · 🥈 2 · 🥇 3 · each level's hidden challenge ⭐ 2", { fontFamily: 'Trebuchet MS, Arial', fontStyle: 'bold', fontSize: '15px', color: '#fff', stroke: '#1d2b4f', strokeThickness: 4 }).setOrigin(0.5);
    const ap = this.add.text(20, 20, '', { fontFamily: 'Arial Black, Arial', fontSize: '16px', color: '#111', backgroundColor: '#ffd400', padding: { x: 10, y: 6 } }).setInteractive({ useHandCursor: true });
    const apShow = () => ap.setText(`AUTO-PEDAL: ${autoPedal() ? 'ON' : 'OFF'}`);
    ap.on('pointerdown', () => { setAutoPedal(!autoPedal()); sfx.click(); apShow(); });
    apShow();
    const tro = this.add.text(20, 62, '🏆 TROPHIES', { fontFamily: 'Arial Black, Arial', fontSize: '16px', color: '#111', backgroundColor: '#ffffff', padding: { x: 10, y: 6 } }).setInteractive({ useHandCursor: true });
    tro.on('pointerdown', () => { sfx.click(); this.scene.start('Trophies'); });
    void CHALLENGES;

    // reset high scores (tap twice to confirm); keeps medals, kits and unlocked levels
    const reset = this.add.text(W - 70, 26, 'RESET SCORES', { fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#fff', backgroundColor: '#e63946', padding: { x: 8, y: 5 } })
      .setOrigin(1, 0).setInteractive({ useHandCursor: true });
    let armed = false;
    reset.on('pointerdown', () => {
      sfx.click();
      if (!armed) { armed = true; reset.setText('TAP AGAIN TO RESET'); this.time.delayedCall(3000, () => { armed = false; reset.setText('RESET SCORES'); }); return; }
      try {
        for (const k of Object.keys(localStorage)) if (/^tdb-(score|best|ghost2?)-/.test(k)) localStorage.removeItem(k);
      } catch { /* ignore */ }
      this.scene.restart();
    });

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

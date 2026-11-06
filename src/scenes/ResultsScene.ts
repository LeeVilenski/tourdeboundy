import Phaser from 'phaser';
import type { RunStats } from './LevelScene';
import { LEVELS } from '../levels';
import { willStanding } from '../entities/WillSprite';
import { scenery, bestTime, fmtTime } from './MenuScene';
import { RES } from '../textures';
import { sfx } from '../sfx';

export class ResultsScene extends Phaser.Scene {
  constructor() { super('Results'); }

  create(stats: RunStats) {
    const W = this.scale.width;
    const def = LEVELS[stats.level - 1];
    scenery(this);
    this.cameras.main.fadeIn(400);

    // best time
    const prev = bestTime(stats.level);
    const isBest = !prev || stats.timeMs < prev;
    if (isBest) { try { localStorage.setItem(`tdb-best-${stats.level}`, String(Math.round(stats.timeMs))); } catch { /* ignore */ } }

    // podium
    const px = 300, py = 620;
    const g = this.add.graphics();
    g.fillStyle(0x111111, 1).fillRect(px - 190, py - 70, 120, 70);
    g.fillStyle(0xffc300, 1).fillRect(px - 70, py - 120, 140, 120);
    g.fillStyle(0xd62828, 1).fillRect(px + 70, py - 50, 120, 50);
    g.lineStyle(4, 0x111111, 1).strokeRect(px - 70, py - 120, 140, 120);
    this.add.text(px, py - 60, '1', { fontFamily: 'Georgia, serif', fontSize: '60px', color: '#111' }).setOrigin(0.5);
    this.add.text(px - 130, py - 35, '2', { fontFamily: 'Georgia, serif', fontSize: '40px', color: '#fff' }).setOrigin(0.5);
    this.add.text(px + 130, py - 25, '3', { fontFamily: 'Georgia, serif', fontSize: '32px', color: '#fff' }).setOrigin(0.5);

    const will = willStanding(this, px, py - 120, 1.5);
    const pot = this.add.image(px + 46, py - 300, 'yoghurt').setScale(1.4 / RES);
    this.tweens.add({ targets: pot, y: py - 270, duration: 600, ease: 'Bounce.out' });

    const say = (text: string, delay: number) => this.time.delayedCall(delay, () => {
      const b = this.add.text(px + 40, py - 330, text, {
        fontFamily: 'Trebuchet MS, Arial', fontStyle: 'bold', fontSize: '20px', color: '#111', backgroundColor: '#fff', padding: { x: 10, y: 7 }, wordWrap: { width: 280 },
      }).setOrigin(0.2, 1).setName('bubble');
      this.time.delayedCall(2300, () => b.destroy());
    });
    say('One yoghurt. Worth it.', 600);

    // Garmin nag, then he jogs off
    const garmin = this.add.container(px - 220, py - 360);
    garmin.add(this.add.circle(0, 0, 54, 0x111111).setStrokeStyle(8, 0x444444));
    garmin.add(this.add.text(0, -14, 'GARMIN', { fontFamily: 'Arial', fontSize: '12px', color: '#ff5a5a', fontStyle: 'bold' }).setOrigin(0.5));
    garmin.add(this.add.text(0, 8, 'REST', { fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#fff' }).setOrigin(0.5));
    garmin.setScale(0);
    this.time.delayedCall(3000, () => { sfx.beep(); this.tweens.add({ targets: garmin, scale: 1, duration: 300, ease: 'Back.out' }); });
    say(`Nah. ${def.outro}`, 3500);
    this.time.delayedCall(6000, () => {
      this.tweens.add({ targets: [will, pot], x: '+=1200', duration: 2600, ease: 'Quad.in' });
      this.tweens.add({ targets: will, y: '-=10', duration: 160, yoyo: true, repeat: 8 });
      this.tweens.add({ targets: garmin, alpha: 0, delay: 1200, duration: 600 });
    });

    // stats card
    const cx = 880;
    this.add.rectangle(cx, 330, 560, 470, 0x1d2b4f, 0.88).setStrokeStyle(5, 0xffffff);
    this.add.text(cx, 130, `${def.name.toUpperCase()} — DONE`, { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#ffd400' }).setOrigin(0.5);
    this.add.text(cx, 175, `${fmtTime(stats.timeMs)}${isBest ? '  ★ NEW BEST' : `  (best ${fmtTime(prev!)})`}`, {
      fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#fff',
    }).setOrigin(0.5);

    const rows: [string, string][] = [
      ['Yoghurts', `${stats.yoghurts} / ${stats.yoghurtsTotal}`],
      ['Crashes', `${stats.crashes}`],
      ['Garmin warnings ignored', `${stats.garminIgnored}`],
      ['Cake refused', `${stats.cakesRefused}`],
      ['Cats launched', `${stats.catsLaunched}`],
      ['Horse etiquette', stats.kickedByHorse ? 'Kicked 🐎' : stats.courteous ? 'Exemplary 👍' : 'Questionable'],
    ];
    rows.forEach(([k, v], i) => {
      const y = 225 + i * 38;
      this.add.text(cx - 240, y, k, { fontFamily: 'Trebuchet MS, Arial', fontStyle: 'bold', fontSize: '21px', color: '#cfe0ff' });
      this.add.text(cx + 240, y, v, { fontFamily: 'Arial Black, Arial', fontSize: '21px', color: '#fff' }).setOrigin(1, 0);
    });
    const verdict = stats.crashes === 0 ? 'Clean ride. Suspiciously sensible.'
      : stats.crashes > 5 ? 'Daredevil rating: off the charts.' : 'A tidy bit of carnage.';
    this.add.text(cx, 470, verdict, { fontFamily: 'Trebuchet MS, Arial', fontStyle: 'bold italic', fontSize: '20px', color: '#ffd400' }).setOrigin(0.5);

    const btn = (x: number, label: string, color: number, fn?: () => void) => {
      const t = this.add.text(x, 525, label, {
        fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#fff',
        backgroundColor: '#' + color.toString(16).padStart(6, '0'), padding: { x: 18, y: 10 },
      }).setOrigin(0.5);
      if (fn) t.setInteractive({ useHandCursor: true }).on('pointerdown', () => { sfx.click(); fn(); });
      else t.setAlpha(0.55);
      return t;
    };
    btn(cx - 180, 'RIDE AGAIN', 0xe63946, () => this.scene.start('Level', { level: stats.level }));
    btn(cx, 'MENU', 0x2a9d8f, () => this.scene.start('Menu'));
    const next = stats.level < LEVELS.length;
    btn(cx + 190, next ? 'NEXT ▶' : 'LVL 2 SOON', 0x555b6e, next ? () => this.scene.start('Level', { level: stats.level + 1 }) : undefined);

    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('Level', { level: stats.level }));
  }
}

import Phaser from 'phaser';
import type { RunStats } from './LevelScene';
import { LEVELS } from '../levels';
import { willStanding } from '../entities/WillSprite';
import { scenery, bestTime, fmtTime } from './MenuScene';
import { RES } from '../textures';
import { sfx } from '../sfx';
import { scoreRun, bestScore, saveBestScore } from '../score';

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

    // score card
    const sc = scoreRun(stats);
    const prevScore = bestScore(stats.level);
    const bestScoreNow = !prevScore || sc.total > prevScore;
    if (bestScoreNow) saveBestScore(stats.level, sc.total);

    const cx = 880;
    this.add.rectangle(cx, 322, 580, 556, 0x1d2b4f, 0.9).setStrokeStyle(5, 0xffffff);
    this.add.text(cx, 72, `${def.name.toUpperCase()} — DONE`, { fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#ffd400' }).setOrigin(0.5);
    this.add.text(cx, 108, isBest ? 'Fastest time yet' : `Best time ${fmtTime(prev!)}`, {
      fontFamily: 'Trebuchet MS, Arial', fontStyle: 'bold', fontSize: '17px', color: '#cfe0ff',
    }).setOrigin(0.5);

    const L = cx - 255, V = cx + 120, P = cx + 255;
    sc.lines.forEach((line, i) => {
      const y = 138 + i * 34;
      this.add.text(L, y, line.label, { fontFamily: 'Trebuchet MS, Arial', fontStyle: 'bold', fontSize: '20px', color: '#cfe0ff' });
      this.add.text(V, y, line.value, { fontFamily: 'Arial Black, Arial', fontSize: '19px', color: '#fff' }).setOrigin(1, 0);
      const pts = this.add.text(P, y, `${line.points >= 0 ? '+' : ''}${line.points}`, {
        fontFamily: 'Arial Black, Arial', fontSize: '19px', color: line.points >= 0 ? '#7CFC8A' : '#ff6b6b',
      }).setOrigin(1, 0).setAlpha(0);
      this.tweens.add({ targets: pts, alpha: 1, delay: 300 + i * 180, duration: 200 });
    });

    // total ticks up, then the rank stamps down
    const lineY = 138 + sc.lines.length * 34 + 6;
    this.add.rectangle(cx, lineY, 510, 3, 0xffffff, 0.6);
    this.add.text(L, lineY + 12, 'SCORE', { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#ffd400' });
    const totalText = this.add.text(P, lineY + 12, '0', { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#ffd400' }).setOrigin(1, 0);
    const counter = { v: 0 };
    const tickDelay = 300 + sc.lines.length * 180;
    this.tweens.add({ targets: counter, v: sc.total, delay: tickDelay, duration: 900, ease: 'Cubic.out',
      onUpdate: () => totalText.setText(Math.round(counter.v).toLocaleString()) });
    this.add.text(cx, lineY + 62, bestScoreNow ? '★ NEW HIGH SCORE ★' : `High score ${prevScore!.toLocaleString()}`, {
      fontFamily: 'Arial Black, Arial', fontSize: '17px', color: bestScoreNow ? '#ffd400' : '#cfe0ff',
    }).setOrigin(0.5);
    const rankColor = { S: '#ffd400', A: '#7CFC8A', B: '#5fd0ff', C: '#ffffff', D: '#ff9f6b' }[sc.rank]!;
    const stamp = this.add.text(cx + 40, lineY + 28, sc.rank, {
      fontFamily: 'Arial Black, Arial', fontSize: '64px', color: rankColor, stroke: '#111', strokeThickness: 8,
    }).setOrigin(0.5).setAngle(-12).setScale(3).setAlpha(0);
    this.tweens.add({ targets: stamp, scale: 1, alpha: 1, delay: tickDelay + 950, duration: 280, ease: 'Back.out',
      onStart: () => sfx.pickup() });

    const verdict = stats.crashes === 0 ? 'Clean ride. Suspiciously sensible.'
      : stats.crashes > 5 ? 'Daredevil rating: off the charts.' : 'A tidy bit of carnage.';
    this.add.text(cx, lineY + 92, verdict, { fontFamily: 'Trebuchet MS, Arial', fontStyle: 'bold italic', fontSize: '18px', color: '#ffd400' }).setOrigin(0.5);

    const btn = (x: number, label: string, color: number, fn?: () => void) => {
      const t = this.add.text(x, 560, label, {
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

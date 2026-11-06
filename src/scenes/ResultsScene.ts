import Phaser from 'phaser';
import type { RunStats } from './LevelScene';
import { LEVELS } from '../levels';
import { willStanding } from '../entities/WillSprite';
import { scenery, bestTime, fmtTime } from './MenuScene';
import { RES } from '../textures';
import { sfx } from '../sfx';
import { scoreRun, bestScore, saveBestScore, unlock, unlockedCount } from '../score';

export class ResultsScene extends Phaser.Scene {
  constructor() { super('Results'); }

  create(stats: RunStats) {
    const W = this.scale.width;
    const def = LEVELS[stats.level - 1];
    scenery(this);
    this.cameras.main.fadeIn(400);

    // best time
    const prev = bestTime(stats.level);
    const isBest = stats.boss !== 'lost' && (!prev || stats.timeMs < prev);
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

    const lost = stats.boss === 'lost';
    const finale = !!stats.boss && !lost;
    if (!lost) unlock(stats.level + 1);
    const ANDY = { head: 'head_andy', torso: 'torso_andy', arm: 'arm_andy', thigh: 'thigh_dark', shin: 'shin_white' };
    const LEE = { head: 'head_lee', torso: 'torso_lee', arm: 'arm_lee', thigh: 'thigh_dark', shin: 'shin' };

    const bubble = (x: number, y: number, text: string, delay: number, color = '#fff') => this.time.delayedCall(delay, () => {
      const b = this.add.text(x, y, text, {
        fontFamily: 'Trebuchet MS, Arial', fontStyle: 'bold', fontSize: '19px', color: '#111', backgroundColor: color, padding: { x: 10, y: 7 }, wordWrap: { width: 260 },
      }).setOrigin(0.2, 1);
      this.time.delayedCall(2400, () => b.destroy());
    });

    if (lost) {
      // Andy on top, Will (arms down) on second
      willStanding(this, px, py - 120, 1.5, ANDY);
      willStanding(this, px - 130, py - 70, 1.5, undefined, false);
      bubble(px + 30, py - 330, 'Tactical.', 500, '#ffe9a8');
      bubble(px - 170, py - 280, 'Rematch. Now.', 2400);
      bubble(px + 30, py - 330, 'Sit on my wheel next time, son.', 4600, '#ffe9a8');
    } else {
      const will = willStanding(this, px, py - 120, 1.5);
      const pot = this.add.image(px + 46, py - 300, 'yoghurt').setScale(1.4 / RES);
      this.tweens.add({ targets: pot, y: py - 270, duration: 600, ease: 'Bounce.out' });
      if (finale) {
        willStanding(this, px - 130, py - 70, 1.4, ANDY, false);
        willStanding(this, px + 130, py - 50, 1.4, LEE);
        const bol = this.add.graphics();
        bol.fillStyle(0x111111, 1).fillRoundedRect(px + 190, py - 120, 22, 70, 6);
        bol.fillStyle(0xffffff, 1).fillRect(px + 190, py - 108, 22, 10).fillRect(px + 190, py - 88, 22, 10);
        bubble(px - 200, py - 280, 'Tactical... defeat.', 2000, '#ffe9a8');
        bubble(px + 110, py - 250, 'Brought my own bollard!', 4200, '#ffe9a8');
        const banner = this.add.text(px, 60, 'TOUR DE BOUNDY\nCOMPLETE!', {
          fontFamily: 'Arial Black, Arial', fontSize: '40px', color: '#ffd400', stroke: '#111', strokeThickness: 8, align: 'center',
        }).setOrigin(0.5, 0).setScale(0);
        this.tweens.add({ targets: banner, scale: 1, delay: 300, duration: 500, ease: 'Back.out' });
      }
      bubble(px + 40, py - 330, 'One yoghurt. Worth it.', 600);

      // Garmin nag, then he jogs off
      const garmin = this.add.container(px - 220, py - 360);
      garmin.add(this.add.circle(0, 0, 54, 0x111111).setStrokeStyle(8, 0x444444));
      garmin.add(this.add.text(0, -14, 'GARMIN', { fontFamily: 'Arial', fontSize: '12px', color: '#ff5a5a', fontStyle: 'bold' }).setOrigin(0.5));
      garmin.add(this.add.text(0, 8, 'REST', { fontFamily: 'Arial Black, Arial', fontSize: '24px', color: '#fff' }).setOrigin(0.5));
      garmin.setScale(0);
      const t0 = finale ? 6200 : 3000;
      this.time.delayedCall(t0, () => { sfx.beep(); this.tweens.add({ targets: garmin, scale: 1, duration: 300, ease: 'Back.out' }); });
      bubble(px + 40, py - 330, `Nah. ${def.outro}`, t0 + 500);
      this.time.delayedCall(t0 + 3000, () => {
        // carry the yoghurt, hop off the podium onto the road, then jog away
        const sc = will.scaleX;
        pot.setPosition((pot.x - will.x) / sc, (pot.y - will.y) / sc).setScale(pot.scaleX / sc);
        will.add(pot);
        will.setDepth(50);
        const roadY = 620;
        this.tweens.chain({ targets: will, tweens: [
          { y: will.y - 40, x: will.x + 40, duration: 220, ease: 'Quad.out' },
          { y: roadY, x: will.x + 130, duration: 380, ease: 'Quad.in' },
          { y: roadY - 6, duration: 90, yoyo: true },
          { x: will.x + 1400, angle: 6, duration: 2800, ease: 'Sine.in',
            onStart: () => this.tweens.add({ targets: will, y: roadY - 12, duration: 150, yoyo: true, repeat: -1, ease: 'Sine.out' }) },
        ] });
        this.tweens.add({ targets: garmin, alpha: 0, delay: 1200, duration: 600 });
      });
    }

    // score card
    const sc = scoreRun(stats);
    const prevScore = bestScore(stats.level);
    const bestScoreNow = stats.boss !== 'lost' && (!prevScore || sc.total > prevScore);
    if (bestScoreNow) saveBestScore(stats.level, sc.total);

    const cx = 880;
    this.add.rectangle(cx, 322, 580, 556, 0x1d2b4f, 0.9).setStrokeStyle(5, 0xffffff);
    this.add.text(cx, 72, lost ? 'PIPPED BY ANDY' : `${def.name.toUpperCase()} — DONE`, { fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#ffd400' }).setOrigin(0.5);
    this.add.text(cx, 108, isBest ? 'Fastest time yet' : prev ? `Best time ${fmtTime(prev)}` : 'Beat Andy to set a time', {
      fontFamily: 'Trebuchet MS, Arial', fontStyle: 'bold', fontSize: '17px', color: '#cfe0ff',
    }).setOrigin(0.5);

    const L = cx - 255, V = cx + 120, P = cx + 255;
    const rowH = Math.min(34, 300 / sc.lines.length);
    sc.lines.forEach((line, i) => {
      const y = 138 + i * rowH;
      this.add.text(L, y, line.label, { fontFamily: 'Trebuchet MS, Arial', fontStyle: 'bold', fontSize: '20px', color: '#cfe0ff' });
      this.add.text(V, y, line.value, { fontFamily: 'Arial Black, Arial', fontSize: '19px', color: '#fff' }).setOrigin(1, 0);
      const pts = this.add.text(P, y, `${line.points >= 0 ? '+' : ''}${line.points}`, {
        fontFamily: 'Arial Black, Arial', fontSize: '19px', color: line.points >= 0 ? '#7CFC8A' : '#ff6b6b',
      }).setOrigin(1, 0).setAlpha(0);
      this.tweens.add({ targets: pts, alpha: 1, delay: 300 + i * 180, duration: 200 });
    });

    // total ticks up, then the rank stamps down
    const lineY = 138 + sc.lines.length * rowH + 6;
    this.add.rectangle(cx, lineY, 510, 3, 0xffffff, 0.6);
    this.add.text(L, lineY + 12, 'SCORE', { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#ffd400' });
    const totalText = this.add.text(P, lineY + 12, '0', { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#ffd400' }).setOrigin(1, 0);
    const counter = { v: 0 };
    const tickDelay = 300 + sc.lines.length * 180;
    this.tweens.add({ targets: counter, v: sc.total, delay: tickDelay, duration: 900, ease: 'Cubic.out',
      onUpdate: () => totalText.setText(Math.round(counter.v).toLocaleString()) });
    this.add.text(cx, lineY + 62, bestScoreNow ? '★ NEW HIGH SCORE ★' : prevScore ? `High score ${prevScore.toLocaleString()}` : '', {
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
    const next = stats.level < LEVELS.length && unlockedCount() > stats.level;
    btn(cx + 190, next ? 'NEXT ▶' : lost ? 'BEAT ANDY' : 'THE END', 0x2c7be5, next ? () => this.scene.start('Level', { level: stats.level + 1 }) : undefined);

    this.input.keyboard?.once('keydown-ENTER', () => this.scene.start('Level', { level: stats.level }));
  }
}

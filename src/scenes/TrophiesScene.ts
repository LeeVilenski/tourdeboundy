import Phaser from 'phaser';
import { LEVELS } from '../levels';
import { scenery, bestTime, fmtTime } from './MenuScene';
import { bestScore, unlockedCount } from '../score';
import { bestMedal, challengeDone, CHALLENGES, MEDAL_TIMES, MEDAL_ICON, KITS, medalPoints } from '../progress';
import { sfx } from '../sfx';

/** Trophy cabinet: medals and hidden challenges for every level, plus kit unlocks. */
export class TrophiesScene extends Phaser.Scene {
  constructor() { super('Trophies'); }

  create() {
    const W = this.scale.width;
    scenery(this);
    this.add.rectangle(W / 2, 360, Math.min(1220, W - 30), 690, 0x1d2b4f, 0.92).setStrokeStyle(5, 0xffffff);
    this.add.text(W / 2, 40, '🏆 TROPHY CABINET', { fontFamily: 'Arial Black, Arial', fontSize: '32px', color: '#ffd400' }).setOrigin(0.5);

    const L = W / 2 - 580;
    const head = (x: number, t: string) => this.add.text(x, 82, t, { fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#9fb4d9' });
    head(L, 'LEVEL'); head(L + 330, 'MEDAL'); head(L + 430, 'TARGETS 🥇/🥈/🥉'); head(L + 640, 'BEST'); head(L + 760, 'HIDDEN CHALLENGE');

    const open = unlockedCount();
    LEVELS.forEach((l, i) => {
      const y = 112 + i * 52;
      const locked = i >= open;
      const txt = (x: number, s: string, col = '#fff', size = 17) =>
        this.add.text(x, y, s, { fontFamily: 'Trebuchet MS, Arial', fontStyle: 'bold', fontSize: `${size}px`, color: col });
      if (i % 2 === 0) this.add.rectangle(W / 2, y + 12, Math.min(1180, W - 50), 48, 0xffffff, 0.05);
      txt(L, `${l.id}. ${l.name}`, locked ? '#7f8aa3' : '#fff');
      const m = bestMedal(l.id);
      txt(L + 330, m ? `${MEDAL_ICON[m]} ${m}` : '—', m ? '#fff' : '#7f8aa3');
      const [g, s, b] = MEDAL_TIMES[l.id];
      txt(L + 430, `${fmtTime(g * 1000)} / ${fmtTime(s * 1000)} / ${fmtTime(b * 1000)}`, '#cfe0ff', 15);
      const bt = bestTime(l.id), sc = bestScore(l.id);
      txt(L + 640, bt ? fmtTime(bt) : '—', bt ? '#fff' : '#7f8aa3');
      if (sc) txt(L + 640, `★ ${sc.toLocaleString()}`, '#ffd400', 12).setY(y + 21);
      const c = CHALLENGES[l.id];
      if (challengeDone(l.id)) {
        txt(L + 760, `⭐ ${c.name}`, '#ffd400');
        txt(L + 760, c.desc, '#cfe0ff', 13).setY(y + 21);
      } else {
        txt(L + 760, '❔ ???', '#7f8aa3');
        txt(L + 760, `Clue: ${c.clue ?? '...'}`, '#9fb4d9', 13).setY(y + 21);
      }
    });

    // kits
    const pts = medalPoints();
    const ky = 112 + LEVELS.length * 52 + 14;
    this.add.text(L, ky, `MEDAL POINTS: ${pts}   (medals: 🥉 1 pt · 🥈 2 pts · 🥇 3 pts — hidden challenge ⭐ 2 pts)`, { fontFamily: 'Arial Black, Arial', fontSize: '16px', color: '#ffd400' });
    KITS.forEach((k, i) => {
      const x = L + (i % 3) * 395, y = ky + 32 + Math.floor(i / 3) * 44;
      const got = pts >= k.need;
      this.add.text(x, y, `${got ? '✅' : '🔒'} ${k.name}${got ? '' : ` (${k.need} pts)`}`, { fontFamily: 'Trebuchet MS, Arial', fontStyle: 'bold', fontSize: '15px', color: got ? '#fff' : '#7f8aa3' });
      this.add.text(x + 24, y + 19, k.perkText, { fontFamily: 'Trebuchet MS, Arial', fontSize: '12px', color: got ? '#cfe0ff' : '#6d7890', wordWrap: { width: 370 } });
    });

    const back = this.add.text(W / 2, 690, '◀ BACK', { fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#fff', backgroundColor: '#2a9d8f', padding: { x: 18, y: 8 } })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    back.on('pointerdown', () => { sfx.click(); this.scene.start('Menu'); });
    this.input.keyboard?.once('keydown-ESC', () => this.scene.start('Menu'));
  }
}

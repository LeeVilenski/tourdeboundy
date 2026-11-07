import Phaser from 'phaser';
import type { LevelDef, Theme } from '../levels/types';
import { RES } from '../textures';

type GY = (x: number) => number;

export function groundColor(theme: Theme) {
  return ({ lanes: 0x6b3e1d, estuary: 0x6b3e1d, forest: 0x4a2f19, moor: 0x4e3b23, town: 0x8d8d8d } as const)[theme];
}

function hills(scene: Phaser.Scene, f: number, color: number, base: number, amp: number, freq: number, depth: number, L: number) {
  const g = scene.add.graphics().setScrollFactor(f, 0.05).setDepth(depth);
  g.fillStyle(color, 1).beginPath();
  const y0 = base + 120 * f;
  g.moveTo(-800, 6000);
  for (let x = -800; x <= L * f + 2200; x += 80) g.lineTo(x, y0 - amp * (Math.sin(x * freq) * 0.6 + Math.sin(x * freq * 2.3 + 1) * 0.4));
  g.lineTo(L * f + 2200, 6000).closePath().fillPath();
  return g;
}

function sea(scene: Phaser.Scene, f: number, y: number, depth: number, L: number, boats = 0) {
  const g = scene.add.graphics().setScrollFactor(f, 0.05).setDepth(depth);
  const y0 = y + 120 * f;
  g.fillStyle(0x3f8fd1, 1).fillRect(-800, y0, L * f + 3000, 6000);
  g.fillStyle(0x6fb3e8, 1).fillRect(-800, y0, L * f + 3000, 5);
  g.lineStyle(2, 0xffffff, 0.5);
  for (let x = -700; x < L * f + 2200; x += 90) g.lineBetween(x, y0 + 18 + (x % 3) * 9, x + 30, y0 + 18 + (x % 3) * 9);
  for (let i = 0; i < boats; i++) {
    const bx = 200 + i * 520, by = y0 + 14;
    g.fillStyle(0xffffff, 1).fillTriangle(bx, by - 4, bx, by - 44, bx + 26, by - 4);
    g.fillStyle(0xd62828, 1).fillRect(bx - 18, by - 4, 50, 9);
  }
}

export function drawBackdrop(scene: Phaser.Scene, def: LevelDef, W: number, H: number, L: number) {
  const sky = scene.add.graphics().setScrollFactor(0).setDepth(-10);
  sky.fillGradientStyle(def.skyTop, def.skyTop, def.skyBottom, def.skyBottom, 1).fillRect(0, 0, W, H);
  const clouds = def.theme === 'moor' ? 20 : 14;
  for (let i = 0; i < clouds; i++) {
    scene.add.image(Phaser.Math.Between(-200, L * 0.1 + W), Phaser.Math.Between(40, 260), 'cloud')
      .setScrollFactor(0.1, 0).setScale(Phaser.Math.FloatBetween(0.35, 0.7)).setDepth(-9).setAlpha(def.theme === 'moor' ? 0.8 : 0.95);
  }
  switch (def.theme) {
    case 'lanes':
      hills(scene, 0.2, 0x8cc36a, 330, 60, 0.0035, -8, L);
      hills(scene, 0.45, 0x5fa646, 390, 50, 0.006, -7, L);
      break;
    case 'estuary':
      hills(scene, 0.12, 0x8fb39a, 300, 35, 0.004, -8.5, L);   // Exmouth side
      sea(scene, 0.2, 335, -8, L, Math.ceil(L * 0.2 / 520) + 2);
      hills(scene, 0.45, 0x6aae4c, 420, 40, 0.005, -7, L);
      break;
    case 'forest': {
      hills(scene, 0.2, 0x5b8a57, 320, 60, 0.004, -8, L);
      const g = hills(scene, 0.45, 0x2f6438, 380, 40, 0.006, -7, L);
      for (let x = -600; x < L * 0.45 + 2000; x += 46) {
        const y = 380 + 120 * 0.45 - 40 * (Math.sin(x * 0.006) * 0.6 + Math.sin(x * 0.006 * 2.3 + 1) * 0.4);
        g.fillStyle(0x24502c, 1).fillTriangle(x, y - 70 - (x % 5) * 6, x - 22, y + 4, x + 22, y + 4);
      }
      break;
    }
    case 'moor': {
      const g = hills(scene, 0.2, 0xa7a06a, 330, 70, 0.003, -8, L);
      for (let x = 300; x < L * 0.2 + 2000; x += 900) {
        const y = 330 + 24 - 70 * (Math.sin(x * 0.003) * 0.6 + Math.sin(x * 0.003 * 2.3 + 1) * 0.4);
        g.fillStyle(0x8c8f8a, 1).fillRoundedRect(x - 40, y - 46, 80, 50, 12).fillRoundedRect(x - 20, y - 70, 46, 30, 10);
      }
      hills(scene, 0.45, 0x8d8a4c, 400, 45, 0.005, -7, L);
      break;
    }
    case 'town': {
      hills(scene, 0.1, 0x7da486, 300, 30, 0.004, -8.5, L);
      sea(scene, 0.15, 330, -8, L, Math.ceil(L * 0.15 / 520) + 2);
      const g = scene.add.graphics().setScrollFactor(0.45, 0.05).setDepth(-7);
      const colors = [0xf7e6b5, 0xd9e8f5, 0xf5c6c6, 0xffffff, 0xc9e7c9, 0xf3d9a4];
      for (let x = -600, i = 0; x < L * 0.45 + 2000; x += 96, i++) {
        const h = 90 + ((i * 37) % 70), y = 470 + 54;
        g.fillStyle(colors[i % colors.length], 1).fillRect(x, y - h, 88, h + 6000);
        g.fillStyle(0x6b7a8f, 1).fillTriangle(x - 4, y - h, x + 44, y - h - 34, x + 92, y - h);
        g.fillStyle(0x9fd3ff, 1);
        for (let r = 0; r < 3; r++) for (let c = 0; c < 2; c++) g.fillRect(x + 14 + c * 38, y - h + 16 + r * 30, 20, 18);
      }
      break;
    }
  }
}

/** The band right behind the road: hedges, trees, stone walls or race barriers. */
export type Chunk = { x0: number; x1: number; g: Phaser.GameObjects.Graphics };
const CHUNK = 900;

/** Draw something that follows the terrain, split into chunk-sized slices for culling. */
export function sliced(scene: Phaser.Scene, t: { x: number; y: number }[], depth: number, draw: (g: Phaser.GameObjects.Graphics, pts: { x: number; y: number }[]) => void): Chunk[] {
  const out: Chunk[] = [];
  const x0 = t[0].x, x1 = t[t.length - 1].x;
  for (let cx = x0; cx < x1; cx += CHUNK) {
    const pts = t.filter((p, i) => (p.x >= cx && p.x <= cx + CHUNK) || (t[i + 1] && t[i + 1].x > cx && p.x < cx) || (t[i - 1] && t[i - 1].x < cx + CHUNK && p.x > cx + CHUNK));
    if (pts.length < 2) continue;
    const g = scene.add.graphics().setDepth(depth);
    draw(g, pts);
    out.push({ x0: cx - 150, x1: cx + CHUNK + 150, g });
  }
  return out;
}

/** Returns the scenery split into chunks so only the on-screen ones get drawn each frame. */
export function drawRoadside(scene: Phaser.Scene, def: LevelDef, gy: GY): Chunk[] {
  const t = def.terrain;
  const x0 = t[0].x, x1 = t[t.length - 1].x;
  const rnd = new Phaser.Math.RandomDataGenerator(['roadside' + def.id]);
  const g = scene.add.graphics().setDepth(2);
  const chunks = new Map<string, Chunk>();
  const at = (x: number, depth = 2.1) => {
    const i = Math.floor((x - x0) / CHUNK), key = i + ':' + depth;
    let c = chunks.get(key);
    if (!c) { c = { x0: x0 + i * CHUNK - 150, x1: x0 + (i + 1) * CHUNK + 150, g: scene.add.graphics().setDepth(depth) }; chunks.set(key, c); }
    return c.g;
  };
  const extra: Chunk[] = [];
  const band = (top: (x: number) => number, color: number) => {
    extra.push(...sliced(scene, t, 2, (bg, pts) => {
      bg.fillStyle(color, 1).beginPath().moveTo(pts[0].x, pts[0].y + 4);
      for (const p of pts) bg.lineTo(p.x, p.y - top(p.x));
      for (let i = pts.length - 1; i >= 0; i--) bg.lineTo(pts[i].x, pts[i].y + 4);
      bg.closePath().fillPath();
    }));
  };
  if (def.theme === 'lanes' || def.theme === 'estuary') {
    const top = (x: number) => 82 + 14 * Math.sin(x * 0.045) + 9 * Math.sin(x * 0.13 + 2);
    band(top, 0x3d7a2c);
    for (let x = x0; x < x1; x += 26) {
      const y = gy(x) - top(x) + 12;
      at(x).fillStyle(rnd.pick([0x4f9236, 0x5ea43f, 0x427f2f]), 1).fillCircle(x + rnd.between(-6, 6), y + rnd.between(-4, 8), rnd.between(12, 20));
      if (rnd.frac() < 0.25) at(x).fillStyle(rnd.pick([0xffffff, 0xffe066, 0xff8fb3]), 1).fillCircle(x, y + rnd.between(10, 40), 2.5);
    }
  } else if (def.theme === 'forest') {
    for (let x = x0; x < x1; x += rnd.between(55, 85)) {
      const y = gy(x), h = rnd.between(230, 330), tg = at(x, 1.9);
      tg.fillStyle(0x5b3a1e, 1).fillRect(x - 7, y - h + 40, 14, h);
      tg.fillStyle(rnd.pick([0x1f4d27, 0x285e30, 0x1a4222]), 1).fillTriangle(x, y - h - 30, x - 46, y - h + 120, x + 46, y - h + 120);
      tg.fillTriangle(x, y - h + 30, x - 56, y - h + 190, x + 56, y - h + 190);
    }
    band(() => 26, 0x2f6b35);
    for (let x = x0; x < x1; x += 22) at(x).fillStyle(rnd.pick([0x3f8a3f, 0x4fa34a]), 1).fillTriangle(x, gy(x) - 34, x - 10, gy(x), x + 10, gy(x));
  } else if (def.theme === 'moor') {
    band((x) => 26 + 3 * Math.sin(x * 0.2), 0x8f8f88);
    for (let x = x0; x < x1; x += 18) {
      const cg = at(x);
      cg.fillStyle(rnd.pick([0x7d7d77, 0xa3a39b, 0x6e6e68]), 1).fillRoundedRect(x, gy(x) - rnd.between(18, 28), rnd.between(14, 20), 12, 4);
      if (rnd.frac() < 0.05) {
        cg.fillStyle(0x3f6b2a, 1).fillCircle(x, gy(x) - 34, 18);
        cg.fillStyle(0xffd400, 1);
        for (let k = 0; k < 6; k++) cg.fillCircle(x + rnd.between(-14, 14), gy(x) - 34 + rnd.between(-12, 12), 2.5);
      }
    }
  } else if (def.theme === 'town') {
    // crowd behind the barriers
    for (let x = x0 + 20; x < x1; x += rnd.between(16, 26)) {
      if (rnd.frac() < 0.15) continue;
      const y = gy(x) - 40, c = rnd.pick([0xd62828, 0x2c7be5, 0xffd400, 0x2a9d8f, 0xffffff, 0xf4a261, 0x6a4c93]), cg = at(x);
      cg.fillStyle(c, 1).fillRoundedRect(x - 9, y - 40, 18, 44, 6);
      cg.fillStyle(rnd.pick([0xf6c9a8, 0xd9a07a, 0x8d5524]), 1).fillCircle(x, y - 50, 8);
      if (rnd.frac() < 0.2) cg.fillStyle(0x111111, 1).fillRect(x + 6, y - 72, 3, 22).fillStyle(0xffffff, 1).fillRect(x + 9, y - 72, 18, 12);
    }
    for (let x = x0; x < x1; x += 70) {
      const y = gy(x), b = at(x, 2.5);
      b.lineStyle(3, 0xd0d4da, 1).strokeRect(x, y - 46, 66, 40);
      for (let k = 1; k < 8; k++) b.lineBetween(x + k * 8.2, y - 46, x + k * 8.2, y - 6);
      b.fillStyle(0x2c7be5, 1).fillRect(x + 4, y - 38, 58, 14);
    }
  }
  g.destroy();
  return [...chunks.values(), ...extra];
}

/** Scenery pieces placed along the level. Trains go into `movers` to be animated. */
export function drawDecor(scene: Phaser.Scene, def: LevelDef, gy: GY, movers: { img: Phaser.GameObjects.Image; x0: number; x1: number; v: number }[]) {
  const txt = (x: number, y: number, s: string, size = 13, depth = 4) =>
    scene.add.text(x, y, s, { fontFamily: 'Arial Black, Arial', fontSize: `${size}px`, color: '#111', backgroundColor: '#fff', padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(depth);
  for (const d of def.decor) {
    const y = gy(d.x);
    if (d.type === 'sign') {
      const g = scene.add.graphics().setDepth(4);
      g.fillStyle(0xdddddd, 1).fillRect(d.x - 3, y - 120, 6, 120);
      g.fillStyle(0xffffff, 1).lineStyle(7, 0xd62828, 1);
      g.fillTriangle(d.x, y - 175, d.x - 34, y - 115, d.x + 34, y - 115).strokeTriangle(d.x, y - 175, d.x - 34, y - 115, d.x + 34, y - 115);
      const icon = d.icon === 'horse' ? '🐎' : d.icon === 'cat' ? '🐈' : '⚠️';
      scene.add.text(d.x, y - 135, icon, { fontSize: '24px' }).setOrigin(0.5).setDepth(4);
      txt(d.x, y - 100, d.text);
    } else if (d.type === 'board') {
      const g = scene.add.graphics().setDepth(4);
      g.fillStyle(0x444444, 1).fillRect(d.x - 40, y - 110, 5, 110).fillRect(d.x + 35, y - 110, 5, 110);
      g.fillStyle(0xffffff, 1).lineStyle(3, 0x111111, 1).fillRect(d.x - 48, y - 140, 96, 36).strokeRect(d.x - 48, y - 140, 96, 36);
      scene.add.text(d.x, y - 122, d.text, { fontFamily: 'Arial Black, Arial', fontSize: d.text.length > 9 ? '11px' : '14px', color: '#111' }).setOrigin(0.5).setDepth(4);
    } else if (d.type === 'gate') {
      const g = scene.add.graphics().setDepth(3);
      g.fillStyle(0x8b6b45, 1).fillRect(d.x - 60, y - 95, 8, 95).fillRect(d.x + 52, y - 95, 8, 95);
      for (let i = 0; i < 5; i++) g.fillRect(d.x - 56, y - 88 + i * 16, 112, 6);
      g.lineStyle(6, 0x8b6b45, 1).lineBetween(d.x - 56, y - 10, d.x + 56, y - 88);
    } else if (d.type === 'tractor') {
      const g = scene.add.graphics().setDepth(1.5), by = y - 60;
      g.fillStyle(0x2e8b3a, 1).fillRoundedRect(d.x - 70, by - 60, 120, 50, 8).fillRect(d.x - 60, by - 120, 60, 62);
      g.fillStyle(0xbfe6ff, 1).fillRect(d.x - 52, by - 112, 44, 40);
      g.fillStyle(0x222222, 1).fillCircle(d.x - 40, by, 38).fillCircle(d.x + 40, by + 10, 24);
      g.fillStyle(0xffd400, 1).fillCircle(d.x - 40, by, 14).fillCircle(d.x + 40, by + 10, 9);
    } else if (d.type === 'cows') {
      for (let i = 0; i < 3; i++) {
        const x = d.x + i * 70, cy = gy(x) - 90 + (i % 2) * 6;
        const g = scene.add.graphics().setDepth(1.5);
        g.fillStyle(0xffffff, 1).fillEllipse(x, cy, 60, 34);
        g.fillStyle(0x222222, 1).fillEllipse(x - 10, cy - 4, 18, 12).fillEllipse(x + 14, cy + 6, 12, 10);
        g.fillStyle(0xffffff, 1).fillEllipse(x + 32, cy - 10, 22, 18);
        g.fillStyle(0xffb3c1, 1).fillEllipse(x + 40, cy - 6, 10, 8);
        g.fillStyle(0x222222, 1).fillCircle(x + 32, cy - 14, 2);
      }
    } else if (d.type === 'train') {
      const img = scene.add.image(d.x + d.len, y - 100, 'train').setScale(1 / RES).setDepth(1.4);
      movers.push({ img, x0: d.x, x1: d.x + d.len, v: -5 });
    } else if (d.type === 'obelisk') {
      const g = scene.add.graphics().setDepth(1.6);
      g.fillStyle(0x9a9a92, 1).fillRect(d.x - 26, y - 60, 52, 30);
      g.fillStyle(0xb5b5ad, 1).fillTriangle(d.x - 18, y - 60, d.x + 18, y - 60, d.x, y - 300);
      g.lineStyle(2, 0x6e6e68, 1).strokeTriangle(d.x - 18, y - 60, d.x + 18, y - 60, d.x, y - 300);
    } else if (d.type === 'house') {
      const g = scene.add.graphics().setDepth(1.5), c = d.color ?? 0xffffff;
      g.fillStyle(c, 1).fillRect(d.x - 80, y - 170, 160, 170);
      g.fillStyle(0xc9a35a, 1).fillRoundedRect(d.x - 96, y - 230, 192, 76, 30);
      g.fillStyle(0x3d6b9a, 1).fillRect(d.x - 56, y - 140, 30, 26).fillRect(d.x + 26, y - 140, 30, 26);
      g.fillStyle(0x4a2f19, 1).fillRect(d.x - 14, y - 110, 28, 60);
    } else if (d.type === 'tor') {
      const g = scene.add.graphics().setDepth(1.5);
      g.fillStyle(0x8c8f8a, 1).lineStyle(3, 0x5e605c, 1);
      for (const [dx, dy, w, h] of [[-90, -70, 80, 64], [-14, -110, 90, 104], [70, -60, 70, 56], [-30, -170, 60, 64], [10, -210, 48, 44]]) {
        g.fillRoundedRect(d.x + dx, y + dy - 20, w, h, 14).strokeRoundedRect(d.x + dx, y + dy - 20, w, h, 14);
      }
    } else if (d.type === 'grid') {
      const g = scene.add.graphics().setDepth(6.5);
      g.fillStyle(0x222222, 1).fillRect(d.x, y - 2, 120, 16);
      g.fillStyle(0xcfd3d8, 1);
      for (let i = 0; i < 6; i++) g.fillRect(d.x + i * 20 + 6, gy(d.x + i * 20 + 10) - 3, 8, 6);
      txt(d.x + 60, y - 120, 'CATTLE GRID', 11);
      scene.add.graphics().setDepth(4).fillStyle(0x444444, 1).fillRect(d.x + 58, y - 110, 4, 110);
    } else if (d.type === 'palm') {
      const g = scene.add.graphics().setDepth(1.5);
      g.lineStyle(14, 0x8b6b45, 1).beginPath().moveTo(d.x, y).lineTo(d.x + 12, y - 120).lineTo(d.x + 30, y - 230).strokePath();
      g.fillStyle(0x2f8f3a, 1);
      for (const a of [-2.6, -2.0, -1.4, -0.8, -0.3, 0.3]) {
        g.fillTriangle(d.x + 30, y - 232, d.x + 30 + Math.cos(a) * 110, y - 232 + Math.sin(a) * 50 + 40, d.x + 30 + Math.cos(a) * 90, y - 232 + Math.sin(a) * 50 + 56);
      }
    } else if (d.type === 'cafe') {
      const g = scene.add.graphics().setDepth(1.6);
      g.fillStyle(0xf7e6b5, 1).lineStyle(3, 0x111111, 1).fillRect(d.x - 110, y - 170, 220, 170).strokeRect(d.x - 110, y - 170, 220, 170);
      g.fillStyle(0x6b3e1d, 1).fillTriangle(d.x - 125, y - 168, d.x, y - 235, d.x + 125, y - 168);
      for (let i = 0; i < 8; i++) g.fillStyle(i % 2 ? 0xffffff : 0xd62828, 1).fillRect(d.x - 110 + i * 27.5, y - 140, 27.5, 22);
      g.fillStyle(0x9fd3ff, 1).fillRect(d.x - 90, y - 110, 70, 50).fillRect(d.x + 20, y - 110, 70, 50);
      const t = scene.add.graphics().setDepth(4);
      t.fillStyle(0x444444, 1).fillRect(d.x - 160, y - 34, 4, 34).fillRect(d.x - 196, y - 34, 4, 34).fillRect(d.x - 205, y - 38, 58, 6);
      t.fillStyle(0xffffff, 1).fillRect(d.x - 196, y - 48, 9, 10).fillRect(d.x - 170, y - 48, 9, 10);
      scene.add.text(d.x, y - 152, `☕ ${d.name}`, { fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#111' }).setOrigin(0.5).setDepth(1.7);
    } else if (d.type === 'plaque') {
      const g = scene.add.graphics().setDepth(4);
      g.fillStyle(0x444444, 1).fillRect(d.x - 3, y - 100, 6, 100);
      g.fillStyle(0x1f4f9e, 1).lineStyle(4, 0xffffff, 1).fillCircle(d.x, y - 150, 56).strokeCircle(d.x, y - 150, 56);
      scene.add.text(d.x, y - 150, d.text, { fontFamily: 'Georgia, serif', fontStyle: 'bold', fontSize: '13px', color: '#fff', align: 'center', wordWrap: { width: 90 } }).setOrigin(0.5).setDepth(4);
    }
  }
}

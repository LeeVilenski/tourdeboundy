import { LevelDef, TerrainBuilder } from './types';

// Level 4 — Dartmoor: the long one. Headwinds, sheep, ponies, cattle grids, bogs.
const t = new TerrainBuilder(-400, 600);
t.flat(800);
t.slope(900, -200);
const grid1 = t.x; t.grid(); t.flat(500);              // onto the moor
t.slope(700, 120); t.flat(300);
const gust1 = t.x; t.slope(1200, -160);                 // headwind climb
const tor = t.x; t.flat(450);
t.slope(800, 220);
const bog = t.x; t.flat(260); t.gap(190, 120); t.flat(400);
const ponies = t.x; t.flat(900);
const grid2 = t.x; t.grid(); t.flat(200);
const lee = t.x; t.flat(1500);
const gust2 = t.x; t.slope(900, -180);
const sheep2 = t.x; t.flat(500);
t.slope(1000, 250);
t.rollers(800, 40, 3);
const end = t.x; t.flat(1000);

export const LEVEL4: LevelDef = {
  id: 4,
  name: 'Dartmoor',
  subtitle: '100 miles. Garmin is not happy.',
  theme: 'moor',
  terrain: t.pts,
  finishX: end + 650,
  outro: '100 miles? Warm-up. Swim time.',
  skyTop: 0x6f8fb8, skyBottom: 0xdbe6ee,
  par: 160, rankS: 11000,
  miles: 100,
  checkpoints: [0, grid1 + 300, gust1 + 600, tor + 200, bog - 500, ponies + 900, lee + 800, gust2 + 900, end - 400],
  lee: { joinX: grid2 - 100, leaveX: gust2 + 950, bollards: [lee + 250, lee + 700, lee + 1200] },
  obstacles: [
    { type: 'sheep', x: grid1 + 350 },
    { type: 'sheep', x: grid1 + 420 },
    { type: 'gust', x: gust1, len: 1200 },
    { type: 'roller', x: tor + 80, kind: 'boulder' },
    { type: 'dog', x: bog + 700 },
    { type: 'roller', x: sheep2 + 40, kind: 'boulder' },
    { type: 'kicker', x: bog + 90, h: 42, len: 165 },
    { type: 'hazard', x: bog + 260, len: 190, kind: 'bog' },
    { type: 'walker', x: ponies + 300, exitX: ponies + 800, who: 'pony' },
    { type: 'gust', x: gust2, len: 900 },
    { type: 'sheep', x: sheep2 + 120 }, { type: 'sheep', x: sheep2 + 210 }, { type: 'sheep', x: sheep2 + 270 },
    { type: 'kicker', x: end + 200, h: 30, len: 90 },
    { type: 'kicker', x: sheep2 + 340, h: 82, len: 175, big: true },
  ],
  decor: [
    { type: 'board', x: 150, text: 'DARTMOOR' },
    { type: 'grid', x: grid1 }, { type: 'grid', x: grid2 },
    { type: 'tor', x: tor + 200 },
    { type: 'tor', x: gust1 + 300 },
    { type: 'sign', x: bog - 150, text: 'BOG', icon: 'pothole' },
    { type: 'tor', x: end - 600 },
  ],
  pickups: [
    { type: 'gel', x: 500 },
    { type: 'yoghurt', x: grid1 + 200, dy: -60 },
    { type: 'coffee', x: gust1 - 100 },
    { type: 'yoghurt', x: gust1 + 700, dy: -40 },
    { type: 'gel', x: tor + 100 },
    { type: 'yoghurt', x: tor + 300, dy: -60 },
    { type: 'yoghurt', x: bog + 350, dy: -150 },
    { type: 'yoghurt', x: ponies + 100, dy: -60 },
    { type: 'cake', x: lee + 500 },
    { type: 'yoghurt', x: lee + 900, dy: -60 },
    { type: 'coffee', x: gust2 - 100 },
    { type: 'gel', x: gust2 + 500 },
    { type: 'yoghurt', x: sheep2 + 450, dy: -60 },
    { type: 'yoghurt', x: end + 330, dy: -100 },
    { type: 'cake', x: end + 380 },
  ],
};

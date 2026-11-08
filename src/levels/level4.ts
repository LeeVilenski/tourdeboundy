import { LevelDef, TerrainBuilder } from './types';

// Level 4 — Dartmoor: the long one. Headwinds, sheep, ponies, cattle grids, bogs.
const t = new TerrainBuilder(-400, 600, 2.2); // hills x2.2
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
const lee = t.x; t.flat(900); t.pothole(46, 20); t.flat(554);
const gust2 = t.x; t.slope(900, -180);
const sheep2 = t.x; t.flat(500);
t.slope(1000, 250);
t.rollers(800, 40, 3);
const pt = t.x; t.flat(600); t.slope(900, -150); t.flat(700); t.grid(); t.flat(400); t.slope(900, 150); t.flat(400); // Princetown
const hay = t.x; t.flat(300); t.slope(1100, -220); const haytop = t.x; t.flat(500); t.slope(1200, 300); // Haytor
const wide = t.x; t.flat(900); t.grid(); t.flat(600);                                  // Widecombe
t.slope(800, -120); t.flat(300); t.slope(800, 140);
const post = t.x; t.flat(600); t.slope(700, 120); t.flat(300); t.gap(170, 110); t.flat(530); t.slope(900, -160); t.flat(400); // Postbridge
const dm = t.x; t.slope(1200, 280); t.flat(400); t.grid(); t.flat(300); t.slope(1400, -300); t.flat(500); // Dartmeet
const hound = t.x; t.rollers(1500, 45, 4); t.flat(800); t.slope(800, 150); t.flat(600); t.gap(170, 120); t.flat(520); t.slope(900, -120); t.flat(800); // Hound Tor
const mer = t.x; t.flat(500); t.slope(1100, -200); t.flat(600); t.slope(1100, 220); t.flat(700);                               // Merrivale
const two = t.x; t.slope(1000, 200); t.flat(1200); t.rollers(1000, 35, 3); t.flat(600);                                        // Two Bridges
const end = t.x; t.flat(1000);
const finishX = end + 650;

export const LEVEL4: LevelDef = t.finalize({
  id: 6,
  name: 'Dartmoor',
  subtitle: '100 miles. Garmin is not happy.',
  theme: 'moor',
  terrain: t.pts,
  finishX,
  outro: '100 miles? Warm-up. Swim time.',
  skyTop: 0x6f8fb8, skyBottom: 0xdbe6ee,
  par: Math.round(finishX / 200), rankS: Math.round(8000 + (finishX - 9550) * 0.35),
  miles: 100,
  checkpoints: [0, grid1 + 300, gust1 + 600, tor + 200, bog - 500, ponies + 900, lee + 800, gust2 + 900, pt + 100, pt + 1700, pt + 2700, hay + 100, haytop + 100, wide + 100, wide + 1700, post + 100, post + 2000, dm + 1300, dm + 2600, hound + 1500, hound + 3000, hound + 4300, mer + 400, mer + 2200, two + 1100, two + 2400, end - 400],
  lee: { joinX: grid2 - 100, leaveX: gust2 + 950, bollards: [lee + 250, lee + 700, lee + 1200] },
  obstacles: [
    { type: 'sheep', x: grid1 + 350 },
    { type: 'sheep', x: grid1 + 420 },
    { type: 'gust', x: gust1, len: 1200 },
    { type: 'roller', x: tor + 80, kind: 'boulder' },
    { type: 'dog', x: lee + 200 },
    { type: 'roller', x: sheep2 + 40, kind: 'boulder' },
    { type: 'kicker', x: bog + 90, h: 42, len: 165 },
    { type: 'hazard', x: bog + 260, len: 190, kind: 'bog' },
    { type: 'walker', x: ponies + 300, exitX: ponies + 800, who: 'pony' },
    { type: 'stampede', x: gust2 - 120 },
    { type: 'gust', x: gust2, len: 900 },
    { type: 'sheep', x: sheep2 + 120 }, { type: 'sheep', x: sheep2 + 210 }, { type: 'sheep', x: sheep2 + 270 },
    { type: 'kicker', x: end + 200, h: 30, len: 90 },
    { type: 'gust', x: hay + 300, len: 1100 },
    // Postbridge: the river under the clapper bridge
    { type: 'walker', x: post + 80, exitX: post + 560, who: 'pony' },
    { type: 'kicker', x: post + 1420, h: 48, len: 165 },
    { type: 'hazard', x: post + 1600, len: 170, kind: 'water' },
    { type: 'sheep', x: post + 2050 },
    // Dartmeet: send it off the top
    { type: 'kicker', x: post + 3380, h: 82, len: 175, big: true },
    { type: 'sheep', x: dm + 1850 }, { type: 'sheep', x: dm + 1920 },
    { type: 'gust', x: dm + 2020, len: 1400 },
    { type: 'roller', x: dm + 3460, kind: 'boulder' },
    // Hound Tor
    { type: 'dog', x: hound + 1550 },
    { type: 'kicker', x: hound + 3520, h: 46, len: 165 },
    { type: 'hazard', x: hound + 3700, len: 170, kind: 'bog' },
    // Merrivale
    { type: 'gust', x: mer + 500, len: 1100 },
    { type: 'sheep', x: mer + 2300 }, { type: 'sheep', x: mer + 2370 }, { type: 'sheep', x: mer + 2450 },
    // Two Bridges
    { type: 'walker', x: two + 1250, exitX: two + 2000, who: 'pony' },
    { type: 'kicker', x: mer + 2720, h: 30, len: 90 },
    { type: 'gust', x: pt + 600, len: 900 },
    { type: 'sheep', x: pt + 1700 }, { type: 'sheep', x: pt + 1760 },
    { type: 'kicker', x: pt + 3350, h: 30, len: 90 },
    { type: 'roller', x: haytop + 60, kind: 'boulder' },
    { type: 'sheep', x: wide + 500 }, { type: 'sheep', x: wide + 580 },
    { type: 'walker', x: wide + 1200, exitX: wide + 1600, who: 'pony' },
    { type: 'kicker', x: sheep2 + 340, h: 82, len: 175, big: true },
  ],
  decor: [
    { type: 'board', x: 150, text: 'DARTMOOR' },
    { type: 'grid', x: grid1 }, { type: 'grid', x: grid2 },
    { type: 'tor', x: tor + 200 },
    { type: 'cafe', x: tor + 330, name: 'TOR CAFÉ' },
    { type: 'tor', x: gust1 + 300 },
    { type: 'sign', x: bog - 150, text: 'BOG', icon: 'pothole' },
    { type: 'tor', x: end - 600 },
    { type: 'tor', x: haytop + 250 },
    { type: 'board', x: haytop + 120, text: 'HAYTOR' },
    { type: 'board', x: pt + 100, text: 'PRINCETOWN' },
    { type: 'board', x: post + 1350, text: 'POSTBRIDGE' },
    { type: 'sign', x: post + 1250, text: 'RIVER', icon: 'pothole' },
    { type: 'cafe', x: dm + 1380, name: 'DARTMEET CAFÉ' },
    { type: 'grid', x: dm + 1600 },
    { type: 'tor', x: hound + 2600 }, { type: 'board', x: hound + 2450, text: 'HOUND TOR' },
    { type: 'sign', x: hound + 3350, text: 'BOG', icon: 'pothole' },
    { type: 'board', x: mer + 100, text: 'MERRIVALE' }, { type: 'tor', x: mer + 1800 },
    { type: 'board', x: two + 1050, text: 'TWO BRIDGES' }, { type: 'cafe', x: two + 3500, name: 'TWO BRIDGES INN' },
    { type: 'grid', x: pt + 2200 },
    { type: 'tor', x: pt + 1900 },
    { type: 'cafe', x: wide + 250, name: 'WIDECOMBE CAFÉ' },
    { type: 'grid', x: wide + 900 },
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
    { type: 'coffee', x: hay + 150 },
    { type: 'yoghurt', x: pt + 1600, dy: -60 },
    { type: 'yoghurt', x: pt + 3430, dy: -100 },
    { type: 'cake', x: pt + 3480 },
    { type: 'gel', x: pt + 500 },
    { type: 'yoghurt', x: post + 1700, dy: -150 },
    { type: 'coffee', x: post + 2300 },
    { type: 'yoghurt', x: dm + 600, dy: -50 },
    { type: 'gel', x: dm + 1500 },
    { type: 'yoghurt', x: dm + 2800, dy: -40 },
    { type: 'yoghurt', x: hound + 700, dy: -70 },
    { type: 'yoghurt', x: hound + 3790, dy: -150 },
    { type: 'coffee', x: hound + 4300 },
    { type: 'yoghurt', x: post + 3750, dy: -200 },
    { type: 'gel', x: mer + 300 },
    { type: 'yoghurt', x: mer + 2000, dy: -60 },
    { type: 'cake', x: mer + 2900 },
    { type: 'yoghurt', x: mer + 2860, dy: -100 },
    { type: 'yoghurt', x: two + 600, dy: -50 },
    { type: 'yoghurt', x: two + 2600, dy: -60 },
    { type: 'yoghurt', x: haytop + 300, dy: -60 },
    { type: 'gel', x: wide + 100 },
    { type: 'yoghurt', x: wide + 700, dy: -60 },
  ],
});

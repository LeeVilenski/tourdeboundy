import { LevelDef, TerrainBuilder } from './types';

// Level 3 — Haldon Descent: fast forest roads, gravel, mud pits and big jumps.
const t = new TerrainBuilder(-400, 300, 2.4); // hills x2.4
t.flat(800);
const bel = t.x; t.rollers(900, 50, 3); t.flat(600); t.slope(400, -60); t.flat(700); t.slope(500, 90); // Belvedere woods
t.slope(800, 150);
const dog = t.x; t.flat(900);
t.slope(600, 140);
const k1 = t.x; t.flat(200); t.gap(170, 140); t.flat(450);          // first mud pit
const gravel1 = t.x; t.slope(900, 200);
const cat = t.x; t.flat(320);
t.slope(500, -90);
const carpark = t.x; t.flat(1500);                                 // car park: Lee + bollards
t.slope(700, 220);
const k2 = t.x; t.flat(220); t.gap(180, 160); t.flat(420);           // big pit
const gravel2 = t.x; t.slope(800, 260);
const hiker = t.x; t.flat(1000);
const tele = t.x; t.rollers(800, 45, 3); t.flat(500); t.slope(600, -170); t.flat(400); t.slope(500, 230); t.flat(600); // Telegraph Hill: up and over
t.slope(500, 120);
const d2 = t.x; t.slope(900, 240); t.flat(200); t.gap(190, 150); t.flat(500); t.slope(700, 200); t.flat(300); // the second big descent
const end = t.x; t.flat(1000);
const finishX = end + 650;

export const LEVEL3: LevelDef = t.finalize({
  id: 3,
  name: 'Haldon Descent',
  subtitle: 'Brakes are just a suggestion',
  theme: 'forest',
  terrain: t.pts,
  finishX,
  outro: 'Right, quick 10k run.',
  skyTop: 0x5d8fe0, skyBottom: 0xd6ecff,
  par: Math.round(finishX / 200), rankS: Math.round(8000 + (finishX - 9550) * 0.35),
  checkpoints: [0, bel + 1000, dog + 100, k1 - 700, cat + 50, carpark + 900, k2 - 600, hiker + 100, tele + 1000, tele + 2300, d2 + 300, d2 + 1600],
  lee: { joinX: carpark - 200, leaveX: k2 - 100, bollards: [carpark + 300, carpark + 700, carpark + 1150] },
  obstacles: [
    { type: 'walker', x: dog + 350, exitX: dog + 850, who: 'dogwalker' },
    { type: 'log', x: 550 },
    { type: 'branch', x: k1 + 650 },
    { type: 'branch', x: gravel1 + 500 },
    { type: 'log', x: carpark + 800 },
    { type: 'branch', x: hiker + 100 },
    { type: 'kicker', x: k1 + 30, h: 40, len: 165 },
    { type: 'hazard', x: k1 + 200, len: 170, kind: 'mud' },
    { type: 'gravel', x: gravel1, len: 900 },
    { type: 'cat', x: cat + 160 },
    { type: 'kicker', x: carpark + 1240, h: 82, len: 175, big: true },
    { type: 'kicker', x: k2 + 40, h: 54, len: 175 },
    { type: 'hazard', x: k2 + 220, len: 180, kind: 'mud' },
    { type: 'slowmo', x: k2 + 150, len: 420 },
    { type: 'gravel', x: gravel2 + 300, len: 500 },
    { type: 'walker', x: hiker + 400, exitX: hiker + 900, who: 'hiker' },
    { type: 'debris', x: end + 250 },
    // Telegraph Hill
    { type: 'log', x: tele + 950 },
    { type: 'branch', x: tele + 1500 },
    { type: 'cat', x: tele + 2050 },
    { type: 'kicker', x: tele + 2500, h: 30, len: 90 },
    // Belvedere woods
    { type: 'cat', x: bel + 1100 },
    { type: 'log', x: bel + 1300 }, { type: 'log', x: bel + 1480 },
    { type: 'branch', x: bel + 2000 },
    { type: 'walker', x: bel + 2150, exitX: bel + 2600, who: 'hiker' },
    // second descent
    { type: 'kicker', x: d2 + 930, h: 40, len: 165 },
    { type: 'hazard', x: d2 + 1100, len: 190, kind: 'mud' },
    { type: 'gravel', x: d2 + 1800, len: 600 },
    { type: 'branch', x: d2 + 2200 },
  ],
  decor: [
    { type: 'board', x: 150, text: 'HALDON FOREST' },
    { type: 'board', x: bel + 100, text: 'BELVEDERE' },
    { type: 'board', x: tele + 100, text: 'TELEGRAPH HILL' },
    { type: 'sign', x: d2 + 750, text: 'MUD', icon: 'pothole' },
    { type: 'sign', x: k1 - 150, text: 'MUD', icon: 'pothole' },
    { type: 'board', x: carpark + 80, text: 'CAR PARK' },
    { type: 'cafe', x: carpark + 500, name: 'HALDON CAFÉ' },
    { type: 'sign', x: k2 - 150, text: 'BIG MUD', icon: 'pothole' },
  ],
  pickups: [
    { type: 'gel', x: 500 },
    { type: 'yoghurt', x: dog + 100, dy: -50 },
    { type: 'yoghurt', x: k1 + 285, dy: -150 },
    { type: 'coffee', x: gravel1 + 200 },
    { type: 'yoghurt', x: cat + 50, dy: -60 },
    { type: 'yoghurt', x: carpark + 500, dy: -60 },
    { type: 'yoghurt', x: carpark + 1500, dy: -160 },
    { type: 'cake', x: carpark + 1470 },
    { type: 'yoghurt', x: k2 + 330, dy: -170 },
    { type: 'gel', x: gravel2 + 100 },
    { type: 'yoghurt', x: hiker + 150, dy: -60 },
    { type: 'yoghurt', x: end + 100, dy: -60 },
    { type: 'cake', x: end + 400 },
    { type: 'yoghurt', x: bel + 450, dy: -70 },
    { type: 'yoghurt', x: tele + 400, dy: -70 },
    { type: 'yoghurt', x: tele + 2580, dy: -100 },
    { type: 'cake', x: tele + 2630 },
    { type: 'coffee', x: tele + 1100 },
    { type: 'yoghurt', x: bel + 1390, dy: -90 },
    { type: 'gel', x: bel + 1700 },
    { type: 'yoghurt', x: d2 + 1190, dy: -160 },
    { type: 'coffee', x: d2 + 1500 },
    { type: 'yoghurt', x: d2 + 2300, dy: -50 },
  ],
});

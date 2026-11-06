import { LevelDef, TerrainBuilder } from './types';

// Level 3 — Haldon Descent: fast forest roads, gravel, mud pits and big jumps.
const t = new TerrainBuilder(-400, 300);
t.flat(800);
t.slope(800, 150);
const dog = t.x; t.flat(900);
t.slope(600, 140);
const k1 = t.x; t.flat(200); t.gap(170, 140); t.flat(450);          // first mud pit
const gravel1 = t.x; t.slope(900, 200);
const cat = t.x; t.flat(320);
t.slope(500, -90);
const carpark = t.x; t.flat(1500);                                 // car park: Lee + bollards
t.slope(700, 220);
const k2 = t.x; t.flat(220); t.gap(220, 160); t.flat(380);           // big pit
const gravel2 = t.x; t.slope(800, 260);
const hiker = t.x; t.flat(1000);
t.slope(500, 120);
const end = t.x; t.flat(1000);

export const LEVEL3: LevelDef = {
  id: 3,
  name: 'Haldon Descent',
  subtitle: 'Brakes are just a suggestion',
  theme: 'forest',
  terrain: t.pts,
  finishX: end + 650,
  outro: 'Right, quick 10k run.',
  skyTop: 0x5d8fe0, skyBottom: 0xd6ecff,
  par: 100, rankS: 9500,
  checkpoints: [0, dog + 100, k1 - 700, cat + 50, carpark + 900, k2 - 600, hiker + 100],
  lee: { joinX: carpark - 200, leaveX: k2 - 100, bollards: [carpark + 300, carpark + 700, carpark + 1150] },
  obstacles: [
    { type: 'walker', x: dog + 350, exitX: dog + 850, who: 'dogwalker' },
    { type: 'log', x: 550 },
    { type: 'branch', x: k1 + 650 },
    { type: 'branch', x: gravel1 + 500 },
    { type: 'log', x: carpark + 800 },
    { type: 'branch', x: hiker + 100 },
    { type: 'log', x: end + 650 },
    { type: 'kicker', x: k1 + 30, h: 40, len: 165 },
    { type: 'hazard', x: k1 + 200, len: 170, kind: 'mud' },
    { type: 'gravel', x: gravel1, len: 900 },
    { type: 'cat', x: cat + 160 },
    { type: 'kicker', x: carpark + 1240, h: 82, len: 175, big: true },
    { type: 'kicker', x: k2 + 40, h: 46, len: 175 },
    { type: 'hazard', x: k2 + 220, len: 220, kind: 'mud' },
    { type: 'gravel', x: gravel2 + 300, len: 500 },
    { type: 'walker', x: hiker + 400, exitX: hiker + 900, who: 'hiker' },
    { type: 'debris', x: end + 250 },
  ],
  decor: [
    { type: 'board', x: 150, text: 'HALDON FOREST' },
    { type: 'sign', x: k1 - 150, text: 'MUD', icon: 'pothole' },
    { type: 'board', x: carpark + 80, text: 'CAR PARK' },
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
  ],
};

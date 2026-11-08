import { LevelDef, ObstacleDef, DecorDef, TerrainBuilder } from './types';

// Level 4 — Exeter Wheelers Hill Climb up Pennsylvania Road: uphill all the way, crowds, and Andy's time to beat.
const t = new TerrainBuilder(-400, 900, 2.2); // hills x2.2
t.flat(700);                                                        // start pen
const r1 = t.x; t.slope(700, -110); t.flat(220);                     // ramp 1
const r2 = t.x; t.slope(800, -150); t.flat(160); t.pothole(46, 20); t.flat(160);
const r3 = t.x; t.slope(900, -190); t.flat(260);                     // the crowd bend
const r4 = t.x; t.slope(600, -120); t.flat(280);
const r5 = t.x; t.slope(800, -170); t.flat(200); t.pothole(40, 18); t.flat(140);
const r6 = t.x; t.slope(700, -160); t.flat(240);                     // devil corner
const r7 = t.x; t.slope(900, -210); t.flat(200);
const r8 = t.x; t.slope(800, -170); t.flat(220); t.pothole(46, 20); t.flat(160);
const r9 = t.x; t.slope(900, -200); t.flat(300);                     // church corner
const r10 = t.x; t.slope(700, -150); t.flat(200);
const r11 = t.x; t.slope(1000, -230); t.flat(260);                   // false flat... then more
const r12 = t.x; t.slope(800, -190); t.flat(200);
const wall = t.x; t.slope(1000, -300);                               // THE WALL
const top = t.x; t.flat(900);
const finishX = top + 260;

const obstacles: ObstacleDef[] = [
  { type: 'cat', x: r1 + 820 },
  { type: 'fan', x: r3 + 300 },
  { type: 'kicker', x: r4 + 640, h: 26, len: 90 },
  { type: 'fan', x: r6 + 200 },
  { type: 'fan', x: r9 + 400 },
  { type: 'cat', x: r10 + 760 },
  { type: 'kicker', x: r11 + 1060, h: 26, len: 90 },
  { type: 'fan', x: wall + 300 },
];

const decor: DecorDef[] = [
  { type: 'board', x: 220, text: 'START' },
  { type: 'board', x: 520, text: 'WHEELERS HC' },
  { type: 'board', x: r2 + 400, text: 'GO WILL!' },
  { type: 'board', x: r3 + 700, text: 'ALLEZ BOUNDY' },
  { type: 'house', x: r1 + 300 }, { type: 'house', x: r4 + 120, color: 0xf7e6b5 }, { type: 'house', x: r5 + 900, color: 0xd9e8f5 },
  { type: 'board', x: r9 + 200, text: 'GO ON WILL!' },
  { type: 'house', x: r9 + 500, color: 0xf5c6c6 },
  { type: 'board', x: r12 + 300, text: '500m' },
  { type: 'sign', x: wall - 120, text: '25%', icon: 'pothole' },
  { type: 'board', x: top + 60, text: 'KOM' },
];

export const LEVEL_HC: LevelDef = t.finalize({
  id: 4,
  name: 'Wheelers Hill Climb',
  subtitle: "Pennsylvania Road. Beat Andy's time to the top.",
  theme: 'hillclimb',
  terrain: t.pts,
  finishX,
  outro: 'Back down for another go, then a run.',
  skyTop: 0x4a7fe0, skyBottom: 0xd6ecff,
  par: Math.round((finishX / 360) * 1.8), rankS: 11000,
  pacer: { name: 'ANDY', speed: 6.2 }, // ~51s: a steady ride (~50s) just about matches him; a bit of sprinting beats him
  checkpoints: [0, r2 + 100, r3 + 950, r5 + 100, r6 + 800, r7 + 900, r8 + 1000, r9 + 1100, r10 + 800, r11 + 1200, wall - 150],
  obstacles,
  decor,
  pickups: [
    { type: 'gel', x: r1 + 900 },
    { type: 'yoghurt', x: r2 + 1050, dy: -60 },
    { type: 'coffee', x: r3 + 1000 },
    { type: 'yoghurt', x: r4 + 700, dy: -110 },
    { type: 'cake', x: r4 + 760 },
    { type: 'gel', x: r5 + 1050 },
    { type: 'yoghurt', x: r6 + 760, dy: -60 },
    { type: 'gel', x: r7 + 960 },
    { type: 'yoghurt', x: top + 120, dy: -60 },
    { type: 'coffee', x: r8 + 1050 },
    { type: 'yoghurt', x: r9 + 1150, dy: -60 },
    { type: 'gel', x: r10 + 850 },
    { type: 'yoghurt', x: r11 + 1120, dy: -110 },
    { type: 'cake', x: r11 + 1180 },
    { type: 'gel', x: r12 + 950 },
  ],
});

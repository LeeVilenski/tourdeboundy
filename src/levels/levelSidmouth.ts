import { LevelDef, ObstacleDef, DecorDef, TerrainBuilder } from './types';

// Level 5 — Sidmouth Switchbacks: the Esplanade, then up and over Peak Hill and Salcombe Hill along the coast.
const t = new TerrainBuilder(-400, 600, 2.4); // hills x2.4
t.flat(800);                                                          // the Esplanade
const prom = t.x; t.flat(1700); t.pothole(); t.flat(300);             // promenade
const peak = t.x; t.slope(900, -200); t.flat(150); t.slope(800, -180); // Peak Hill
const ptop = t.x; t.flat(520);
t.slope(900, 260); t.flat(150); t.slope(700, 150);                    // down to Ladram Bay
const ladram = t.x; t.flat(1300);                                      // the beach road
const sal = t.x; t.slope(800, -170); t.flat(120); t.slope(900, -220);  // Salcombe Hill
const stop = t.x; t.flat(600);
t.slope(1000, 300); t.rollers(800, 40, 3);
const wes = t.x; t.flat(500); t.slope(800, -180); const wtop = t.x; t.flat(200); t.slope(800, 220); t.flat(400); t.pothole(46, 20); t.flat(300); // Weston Combe
const bran = t.x; t.slope(900, -210); const btop = t.x; t.flat(400); t.slope(1000, 260); const bvil = t.x; t.flat(700);              // Branscombe
const fin = t.x; t.flat(1000);
const finishX = fin + 650;

const obstacles: ObstacleDef[] = [
  { type: 'gulls', x: prom + 150, len: 1300 },
  { type: 'walker', x: prom + 650, exitX: prom + 1250, who: 'donkey' },
  { type: 'overtake', triggerX: prom + 300 },
  { type: 'kicker', x: prom + 1460, h: 30, len: 90 },
  { type: 'roller', x: ptop + 60, kind: 'beachball' },
  { type: 'kicker', x: ptop + 330, h: 82, len: 175, big: true },
  { type: 'log', x: ladram + 300 }, { type: 'log', x: ladram + 480 }, { type: 'log', x: ladram + 660 }, // groynes
  { type: 'gulls', x: ladram + 800, len: 400 },
  { type: 'roller', x: stop + 60, kind: 'beachball' },
  { type: 'dog', x: stop + 640 },
  { type: 'cat', x: fin + 300 },
  { type: 'roller', x: wtop + 40, kind: 'beachball' },
  { type: 'gulls', x: wes + 1600, len: 600 },
  { type: 'kicker', x: btop + 150, h: 30, len: 90 },
  { type: 'walker', x: bvil + 150, exitX: bvil + 650, who: 'hiker' },
];

const decor: DecorDef[] = [
  { type: 'board', x: 150, text: 'SIDMOUTH' },
  { type: 'deckchairs', x: prom + 80 }, { type: 'deckchairs', x: prom + 1000 },
  { type: 'icecream', x: prom + 420 },
  { type: 'house', x: prom + 1500, color: 0xf7e6b5 }, { type: 'house', x: prom + 1750, color: 0xd9e8f5 },
  { type: 'cafe', x: prom + 1950, name: 'CLOCK TOWER CAFÉ' },
  { type: 'sign', x: peak - 150, text: '20%', icon: 'pothole' },
  { type: 'board', x: ptop + 60, text: 'PEAK HILL' },
  { type: 'board', x: ladram + 100, text: 'LADRAM BAY' },
  { type: 'deckchairs', x: ladram + 900 },
  { type: 'board', x: sal - 80, text: 'SALCOMBE HILL' },
  { type: 'boat', x: ladram + 600 },
  { type: 'board', x: wes + 100, text: 'WESTON COMBE' },
  { type: 'board', x: bran - 60, text: 'BRANSCOMBE' },
  { type: 'cafe', x: bvil + 400, name: 'BRANSCOMBE BAKERY' },
  { type: 'cows', x: wes + 1400 },
];

export const LEVEL_SID: LevelDef = t.finalize({
  id: 5,
  name: 'Sidmouth Switchbacks',
  subtitle: 'Promenade, Peak Hill, Salcombe Hill. Mind the gulls.',
  theme: 'estuary',
  terrain: t.pts,
  finishX,
  outro: 'Quick swim off Jacob\'s Ladder.',
  skyTop: 0x3f86e8, skyBottom: 0xcfe8ff,
  par: Math.round(finishX / 200), rankS: Math.round(8000 + (finishX - 9550) * 0.35),
  checkpoints: [0, prom + 900, peak - 100, ptop + 100, ladram + 100, ladram + 1000, sal + 900, stop + 100, wes + 300, wtop + 100, bran + 100, btop + 300, fin + 50],
  lee: { joinX: ladram - 300, leaveX: sal + 400, bollards: [ladram + 400, ladram + 1100] },
  obstacles,
  decor,
  pickups: [
    { type: 'gel', x: 500 },
    { type: 'yoghurt', x: prom + 600, dy: -60 },
    { type: 'yoghurt', x: prom + 1200, dy: -60 },
    { type: 'yoghurt', x: prom + 1540, dy: -100 },
    { type: 'cake', x: prom + 1590 },
    { type: 'coffee', x: peak + 400 },
    { type: 'gel', x: peak + 1200 },
    { type: 'yoghurt', x: ptop + 450, dy: -200 },
    { type: 'yoghurt', x: ladram + 390, dy: -90 },
    { type: 'yoghurt', x: ladram + 570, dy: -90 },
    { type: 'coffee', x: sal + 500 },
    { type: 'yoghurt', x: stop + 300, dy: -60 },
    { type: 'gel', x: fin + 100 },
    { type: 'yoghurt', x: wes + 700, dy: -50 },
    { type: 'coffee', x: wtop + 150 },
    { type: 'yoghurt', x: btop + 230, dy: -100 },
    { type: 'cake', x: btop + 280 },
    { type: 'yoghurt', x: bvil + 100, dy: -60 },
    { type: 'yoghurt', x: fin + 500, dy: -60 },
  ],
});

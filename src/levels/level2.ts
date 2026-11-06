import { LevelDef, ObstacleDef, DecorDef, TerrainBuilder } from './types';

// Level 2 — The MMM: estuary flats past Powderham and Starcross, the Mamhead climb, then down through Kenn.
const t = new TerrainBuilder(-400, 500);
t.flat(900);                                   // Exminster start
const sea = t.x; t.flat(2200);                 // sea wall road (train alongside)
t.pothole(); t.flat(160); t.pothole(40, 14); t.flat(300);
const climb = t.x;
t.slope(700, -120); t.flat(160); t.slope(600, -150); t.flat(140); t.slope(550, -140); // Mamhead
const summit = t.x; t.flat(500);
t.slope(500, 150); t.flat(120); t.slope(600, 210); t.rollers(600, 40, 2); t.slope(500, 140); // the descent
const kenn = t.x; t.flat(1900);                // Kenn village
t.slope(300, -40);
const ford = t.x; t.flat(1000);                // Kennford
const finishX = ford + 650;

const obstacles: ObstacleDef[] = [
  { type: 'overtake', triggerX: sea + 200 },
  { type: 'dog', x: sea + 350 },
  { type: 'roller', x: summit + 60, kind: 'bale' },
  { type: 'door', x: kenn + 250 },
  { type: 'door', x: kenn + 1000 },
  { type: 'log', x: ford + 520 },
  { type: 'walker', x: sea + 900, exitX: sea + 1600, who: 'dogwalker' },
  { type: 'kicker', x: sea + 1750, h: 30, len: 90 },
  { type: 'cat', x: summit + 150 },
  { type: 'kicker', x: summit + 330, h: 82, len: 175, big: true },
  { type: 'overtake', triggerX: summit + 900 },
  { type: 'kicker', x: kenn + 450, h: 30, len: 90 },
  { type: 'kicker', x: kenn + 1150, h: 58, len: 120 },
  { type: 'car', x: kenn + 1320 },
];

const decor: DecorDef[] = [
  { type: 'board', x: 200, text: 'EXMINSTER' },
  { type: 'train', x: sea - 200, len: 2800 },
  { type: 'boat', x: sea + 600 }, { type: 'boat', x: sea + 1500 },
  { type: 'board', x: sea + 1000, text: 'POWDERHAM' },
  { type: 'board', x: sea + 2000, text: 'STARCROSS' },
  { type: 'sign', x: climb - 200, text: '18%', icon: 'pothole' },
  { type: 'obelisk', x: summit + 220 },
  { type: 'board', x: summit + 60, text: 'MAMHEAD' },
  { type: 'house', x: kenn + 150 }, { type: 'house', x: kenn + 380, color: 0xf7e6b5 },
  { type: 'board', x: kenn + 80, text: 'KENN' },
  { type: 'house', x: kenn + 1650, color: 0xd9e8f5 },
  { type: 'board', x: ford + 100, text: 'KENNFORD' },
  { type: 'cows', x: climb + 900 },
];

export const LEVEL2: LevelDef = {
  id: 2,
  name: 'The MMM',
  subtitle: 'Mamhead. Mamhead. More Mamhead.',
  theme: 'estuary',
  terrain: t.pts,
  finishX,
  outro: 'Boxing session, then a swim.',
  skyTop: 0x4a7fe0, skyBottom: 0xcfe8ff,
  par: 120, rankS: 9500,
  checkpoints: [0, sea + 1300, climb - 100, summit + 100, kenn + 100, kenn + 1600],
  obstacles,
  decor,
  lee: { joinX: kenn - 250, leaveX: finishX + 400, bollards: [kenn + 350, kenn + 900, kenn + 1500, ford + 300] },
  pickups: [
    { type: 'gel', x: 600 },
    { type: 'yoghurt', x: sea + 300, dy: -60 },
    { type: 'yoghurt', x: sea + 1300, dy: -60 },
    { type: 'yoghurt', x: sea + 1880, dy: -100 },
    { type: 'cake', x: sea + 1930 },
    { type: 'coffee', x: climb + 500 },
    { type: 'yoghurt', x: climb + 1000, dy: -40 },
    { type: 'gel', x: climb + 1700 },
    { type: 'yoghurt', x: summit + 400, dy: -50 },
    { type: 'yoghurt', x: summit + 1500, dy: -80 },
    { type: 'yoghurt', x: kenn + 580, dy: -100 },
    { type: 'cake', x: kenn + 630 },
    { type: 'yoghurt', x: kenn + 1430, dy: -140 },
    { type: 'coffee', x: ford + 50 },
    { type: 'yoghurt', x: ford + 450, dy: -60 },
  ],
};

import { LevelDef, TerrainBuilder } from './types';

// Level 1 — Devon Lanes (tutorial). Roughly 1 km of hedge-lined back lanes.
const t = new TerrainBuilder(-400, 500);
t.flat(1000);                 // start + learn to pedal
t.slope(500, 60);             // gentle descent
t.flat(300);                  // cat sits around 1250 (before this)
t.slope(600, -110);           // first climb
t.flat(250);
t.slope(500, 90);             // descent toward the horse
t.flat(1200);                 // horse section (~2750 - 3950)
t.flat(80); t.pothole(); t.flat(140); t.pothole(40, 14); t.flat(110); t.pothole(); t.flat(200);
t.rollers(700, 45, 3);        // rollers
t.flat(500);                  // kicker + parked car (~5470)
t.flat(500);
t.slope(400, -60);            // up to the hay trailer
t.flat(800);                  // trailer (~6800)
t.slope(700, 160);            // the big descent
t.flat(250); t.pothole(40, 14); t.flat(150);
t.slope(600, -140);           // final drag up
t.flat(900);                  // finish straight

const terrain = t.pts;

export const LEVEL1: LevelDef = {
  id: 1,
  name: 'Devon Lanes',
  subtitle: 'Hedges, horses and absolutely no rest',
  terrain,
  finishX: 9550,
  outro: 'Quick paddleboard, anyone?',
  skyTop: 0x4a7fe0,
  skyBottom: 0xbfe0ff,
  checkpoints: [0, 2800, 4500, 6100, 7450],
  obstacles: [
    { type: 'cat', x: 1250 },
    { type: 'horse', x: 3000, exitX: 3850 },
    { type: 'overtake', triggerX: 5000 },
    { type: 'kicker', x: 5470, h: 58, len: 120 },
    { type: 'car', x: 5640 },
    { type: 'trailer', x: 6800 },
  ],
  pickups: [
    { type: 'gel', x: 600 },
    { type: 'yoghurt', x: 900, dy: -60 },
    { type: 'cake', x: 1550 },
    { type: 'coffee', x: 2350 },
    { type: 'yoghurt', x: 2480, dy: -70 },
    { type: 'gel', x: 4500 },
    { type: 'yoghurt', x: 4880, dy: -80 },
    { type: 'cake', x: 5200 },
    { type: 'yoghurt', x: 5600, dy: -130 },
    { type: 'coffee', x: 6400 },
    { type: 'yoghurt', x: 7150, dy: -120 },
    { type: 'yoghurt', x: 7400, dy: -40 },
    { type: 'cake', x: 8350 },
    { type: 'gel', x: 8600 },
    { type: 'yoghurt', x: 9150, dy: -60 },
  ],
  decor: [
    { type: 'sign', x: 1000, text: 'CATS', icon: 'cat' },
    { type: 'sign', x: 2650, text: 'HORSES', icon: 'horse' },
    { type: 'gate', x: 3850 },
    { type: 'cows', x: 2200 },
    { type: 'sign', x: 3900, text: 'POTHOLES', icon: 'pothole' },
    { type: 'tractor', x: 1900 },
    { type: 'cows', x: 8800 },
  ],
};

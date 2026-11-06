import { LevelDef, ObstacleDef, DecorDef, TerrainBuilder } from './types';

// Level 5 — Torbay Velodrome Showdown: a 3-lap race with a bunch, a pile-up, and Andy sitting on your wheel.
const t = new TerrainBuilder(-400, 500);
t.flat(700);                                          // start grid
const laps: number[] = [];
const obstacles: ObstacleDef[] = [];
const decor: DecorDef[] = [{ type: 'board', x: 150, text: 'TORBAY' }];
const pickups: LevelDef['pickups'] = [{ type: 'gel', x: 400 }];
const checkpoints: number[] = [0];
let pileX = 0;

for (let lap = 1; lap <= 3; lap++) {
  const L0 = t.x; laps.push(L0);
  decor.push({ type: 'board', x: L0 + 60, text: lap === 3 ? 'BELL LAP' : `LAP ${lap} / 3` });
  t.flat(500);
  t.rollers(500, 25, 2);
  t.slope(400, -80); t.flat(220); t.slope(400, 80);   // banking 1
  const mid = t.x; t.flat(650);
  const bank2 = t.x + 500; t.slope(500, -110); t.flat(300); t.slope(500, 110); // banking 2
  const back = t.x; t.flat(600);
  t.rollers(500, 30, 2);

  decor.push({ type: 'palm', x: L0 + 300 }, { type: 'palm', x: back + 300 });
  pickups.push({ type: 'yoghurt', x: L0 + 700, dy: -50 }, { type: 'coffee', x: back + 200 });
  checkpoints.push(L0 + 100, mid + 100);
  if (lap === 1) {
    decor.push({ type: 'plaque', x: mid + 350, text: 'WILL CRASHED HERE' });
    obstacles.push({ type: 'gulls', x: L0 + 500, len: 1600 });
  }
  if (lap >= 2) obstacles.push({ type: 'kicker', x: bank2 + 120, h: 55, len: 150, big: true });
  if (lap >= 2) obstacles.push({ type: 'gravel', x: back + 60, len: 320, oil: true });
  if (lap === 2) {
    // crash in the bunch: jump the wreckage
    pileX = mid + 260;
    obstacles.push({ type: 'kicker', x: mid + 120, h: 40, len: 110 }, { type: 'debris', x: pileX }, { type: 'debris', x: pileX + 80 });
    pickups.push({ type: 'yoghurt', x: pileX + 40, dy: -150 });
  }
  if (lap === 3) {
    obstacles.push({ type: 'gulls', x: L0 + 300, len: 2200 });
    obstacles.push({ type: 'kicker', x: mid + 150, h: 30, len: 90 });
    pickups.push({ type: 'cake', x: mid + 320 }, { type: 'yoghurt', x: mid + 280, dy: -100 }, { type: 'gel', x: back + 450 });
  }
}
const straight = t.x; t.flat(1900);                   // the final sprint
const finishX = straight + 1250;
decor.push({ type: 'board', x: straight + 200, text: '1 KM TO GO' }, { type: 'palm', x: straight + 800 });
checkpoints.push(straight - 300);

export const LEVEL5: LevelDef = {
  id: 5,
  name: 'Torbay Velodrome',
  subtitle: '3 laps. Beat Andy. He will sit on your wheel.',
  theme: 'town',
  terrain: t.pts,
  finishX,
  outro: 'Off for a run.',
  skyTop: 0x3f86e8, skyBottom: 0xc9e6ff,
  par: 260, rankS: 18000,
  boss: { sprintX: finishX - 750 },
  laps,
  bunch: { pileX },
  garminGivesUp: true,
  checkpoints,
  obstacles,
  decor,
  pickups,
};

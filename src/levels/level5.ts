import { LevelDef, TerrainBuilder } from './types';

// Level 5 — Torbay Velodrome Showdown: a sprint race against Andy, who sits on your wheel.
const t = new TerrainBuilder(-400, 500);
t.flat(1100);                                        // start line
t.rollers(600, 25, 2);
const pile = t.x; t.flat(700);                        // crash pile-up
t.slope(400, -80); t.flat(220); t.slope(400, 80);     // banking 1
const plaque = t.x; t.flat(900);                      // the corner where Will crashed
t.slope(500, -110); t.flat(300); t.slope(500, 110);   // banking 2
const cake = t.x; t.flat(700);
t.rollers(600, 30, 2);
const straight = t.x; t.flat(1900);                   // the final sprint
const finishX = straight + 1250;

export const LEVEL5: LevelDef = {
  id: 5,
  name: 'Torbay Velodrome',
  subtitle: 'Beat Andy. He will sit on your wheel.',
  theme: 'town',
  terrain: t.pts,
  finishX,
  outro: 'Off for a run.',
  skyTop: 0x3f86e8, skyBottom: 0xc9e6ff,
  par: 110, rankS: 12000,
  boss: { sprintX: finishX - 750 },
  garminGivesUp: true,
  checkpoints: [0, pile + 500, plaque + 100, cake - 200, straight - 300],
  obstacles: [
    { type: 'debris', x: pile + 150 }, { type: 'debris', x: pile + 230 },
    { type: 'kicker', x: pile + 40, h: 40, len: 100 },
    { type: 'kicker', x: cake + 120, h: 30, len: 90 },
  ],
  decor: [
    { type: 'board', x: 100, text: 'TORBAY' },
    { type: 'palm', x: 500 }, { type: 'palm', x: pile + 600 },
    { type: 'plaque', x: plaque + 300, text: 'WILL CRASHED HERE' },
    { type: 'palm', x: cake + 500 },
    { type: 'board', x: straight + 200, text: '1 KM TO GO' },
    { type: 'palm', x: straight + 800 },
  ],
  pickups: [
    { type: 'gel', x: 600 },
    { type: 'yoghurt', x: pile + 180, dy: -150 },
    { type: 'yoghurt', x: plaque + 100, dy: -60 },
    { type: 'coffee', x: plaque + 700 },
    { type: 'yoghurt', x: cake + 250, dy: -100 },
    { type: 'cake', x: cake + 300 },
    { type: 'gel', x: straight - 100 },
    { type: 'yoghurt', x: straight + 400, dy: -60 },
  ],
};

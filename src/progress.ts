import { LEVELS } from './levels';

// ---------- medals ----------
export type Medal = 'gold' | 'silver' | 'bronze' | null;
/** [gold, silver, bronze] finishing times in seconds. */
// Level 1 is hand-set; the rest scale with level length (calibrated from real runs: ~430 px/s for gold).
export const MEDAL_TIMES: Record<number, [number, number, number]> = Object.fromEntries(LEVELS.map((l) => [
  l.id, l.id === 1 ? [32, 42, 60] : [Math.round(l.finishX / 430), Math.round(l.finishX / 360), Math.round(l.finishX / 280)],
])) as Record<number, [number, number, number]>;
export const MEDAL_ICON = { gold: '🥇', silver: '🥈', bronze: '🥉' } as const;

export function medalFor(level: number, secs: number): Medal {
  const [g, s, b] = MEDAL_TIMES[level];
  return secs <= g ? 'gold' : secs <= s ? 'silver' : secs <= b ? 'bronze' : null;
}

// ---------- hidden challenges ----------
export const CHALLENGES: Record<number, { name: string; desc: string }> = {
  1: { name: 'Cake Refusenik', desc: 'Dodge every cake' },
  2: { name: 'Garmin Who?', desc: 'Ignore 5 Garmin warnings' },
  3: { name: 'Clean Sheet', desc: 'No crashes' },
  4: { name: 'Shepherd', desc: "Don't launch a single sheep" },
  5: { name: 'Untouchable', desc: 'Beat Andy without crashing' },
};

const get = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const set = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };
const RANK = { gold: 3, silver: 2, bronze: 1 } as const;

export function bestMedal(level: number): Medal { return (get(`tdb-medal-${level}`) as Medal) || null; }
export function saveMedal(level: number, m: Medal) {
  if (!m) return false;
  const prev = bestMedal(level);
  if (!prev || RANK[m] > RANK[prev]) { set(`tdb-medal-${level}`, m); return true; }
  return false;
}
export function challengeDone(level: number) { return get(`tdb-chal-${level}`) === '1'; }
export function saveChallenge(level: number) { const was = challengeDone(level); set(`tdb-chal-${level}`, '1'); return !was; }

/** Medal points: bronze 1, silver 2, gold 3, each challenge 2. */
export function medalPoints() {
  let p = 0;
  for (const l of LEVELS) { const m = bestMedal(l.id); if (m) p += RANK[m]; if (challengeDone(l.id)) p += 2; }
  return p;
}

import type { RunStats } from './scenes/LevelScene';
export function challengeMet(s: RunStats): boolean {
  switch (s.level) {
    case 1: return s.cakesTotal > 0 && s.cakesRefused === 0;
    case 2: return s.garminIgnored >= 5;
    case 3: return s.crashes === 0;
    case 4: return s.sheepLaunched === 0;
    case 5: return s.boss === 'won' && s.crashes === 0;
  }
  return false;
}

// ---------- kits ----------
export type Perk = 'none' | 'windproof' | 'lucky13' | 'cannibal' | 'snacks' | 'champion';
export interface Kit { id: string; name: string; need: number; head: string; torso: string; arm: string; thigh: string; shin: string; bike: string; perk: Perk; perkText: string }
export const KITS: Kit[] = [
  { id: 'race', name: 'Race kit', need: 0, head: 'head', torso: 'torso', arm: 'arm', thigh: 'thigh', shin: 'shin', bike: 'frame', perk: 'none', perkText: 'The classic' },
  { id: 'gilet', name: 'Training gilet', need: 3, head: 'head', torso: 'torso_gilet', arm: 'arm_black', thigh: 'thigh', shin: 'shin', bike: 'frame', perk: 'windproof', perkText: 'Windproof: headwinds hit 60% softer, faster stamina recovery' },
  { id: 'wheelers', name: 'Wheelers #13', need: 6, head: 'head', torso: 'torso_wheelers', arm: 'arm_white', thigh: 'thigh_dark', shin: 'shin', bike: 'frame', perk: 'lucky13', perkText: 'Lucky 13: your first crash each level doesn\'t count' },
  { id: 'merckx', name: 'The Cannibal', need: 10, head: 'head_merckx', torso: 'torso_merckx', arm: 'arm_orange', thigh: 'thigh_dark', shin: 'shin_white', bike: 'frame_retro', perk: 'cannibal', perkText: 'Sprint king: bigger power hop, sprint lasts 30% longer' },
  { id: 'offduty', name: 'Off duty', need: 15, head: 'head_offduty', torso: 'torso_offduty', arm: 'arm_shirt', thigh: 'thigh_shorts', shin: 'shin_bare', bike: 'frame_shopper', perk: 'snacks', perkText: 'Holiday mode: cake is a boost, yoghurts fly to you' },
  { id: 'yellow', name: 'Yellow jersey', need: 22, head: 'head', torso: 'torso_yellow', arm: 'arm_yellow', thigh: 'thigh', shin: 'shin_white', bike: 'frame_gold', perk: 'champion', perkText: 'Champion: gold sparkle trail, the Garmin cheers you on' },
];
export function currentKit(): Kit {
  const k = KITS.find((x) => x.id === get('tdb-kit')) || KITS[0];
  return medalPoints() >= k.need ? k : KITS[0];
}
export function chooseKit(id: string) { set('tdb-kit', id); }

// ---------- ghost (best run replay) ----------
export function loadGhost(level: number): number[] | null {
  try { const v = get(`tdb-ghost2-${level}`); return v ? JSON.parse(v) : null; } catch { return null; }
}
export function saveGhost(level: number, frames: number[]) { set(`tdb-ghost2-${level}`, JSON.stringify(frames)); }

// ---------- settings ----------
export function autoPedal() { return get('tdb-autopedal') !== '0'; }
export function setAutoPedal(on: boolean) { set('tdb-autopedal', on ? '1' : '0'); }

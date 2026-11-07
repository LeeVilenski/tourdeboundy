import type { RunStats } from './scenes/LevelScene';
import { LEVELS } from './levels';

export interface ScoreLine { label: string; value: string; points: number }

/** Turn a finished run into a points breakdown. Only lines that apply to the level are shown. */
export function scoreRun(s: RunStats): { lines: ScoreLine[]; total: number; rank: string } {
  const def = LEVELS[s.level - 1];
  const secs = s.timeMs / 1000;
  const cakesDodged = s.cakesTotal - s.cakesRefused;
  const lines: ScoreLine[] = [];
  if (s.boss) lines.push({ label: 'Beat Andy', value: s.boss === 'won' ? 'YES 🏆' : 'Pipped', points: s.boss === 'won' ? 3000 : 0 });
  lines.push({ label: 'Time', value: fmt(secs), points: Math.max(0, Math.round((def.par - secs) * 60)) });
  lines.push({ label: 'Yoghurts', value: `${s.yoghurts} / ${s.yoghurtsTotal}`, points: s.yoghurts * 250 });
  lines.push({ label: 'Garmins ignored', value: `${s.garminIgnored}`, points: s.garminIgnored * 150 });
  if (s.cakesTotal) lines.push({ label: 'Cakes dodged', value: `${cakesDodged} / ${s.cakesTotal}`, points: cakesDodged * 200 - s.cakesRefused * 100 });
  lines.push({ label: 'Crashes', value: `${s.crashes}`, points: s.crashes === 0 ? 1000 : -s.crashes * 300 });
  if (s.hasHorse) lines.push({ label: 'Horse etiquette', value: s.kickedByHorse ? 'Kicked 🐎' : s.courteous ? 'Exemplary 👍' : 'Questionable', points: s.kickedByHorse ? -250 : s.courteous ? 500 : 0 });
  if (s.walkersTotal) lines.push({ label: 'Polite passes', value: `${s.politePasses} / ${s.walkersTotal}`, points: s.politePasses * 400 - s.walkersBumped * 250 });
  if (s.hasCats) lines.push({ label: 'Cats launched', value: `${s.catsLaunched}`, points: s.catsLaunched * 50 });
  if (s.hasSheep) lines.push({ label: 'Sheep launched', value: `${s.sheepLaunched}`, points: s.sheepLaunched * 50 });
  s = { ...s, trickPoints: s.trickPoints ?? 0, flips: s.flips ?? 0, comboPoints: s.comboPoints ?? 0, bestCombo: s.bestCombo ?? 0 };
  lines.push({ label: 'Tricks', value: s.flips ? `${s.flips} flip${s.flips > 1 ? 's' : ''}` : s.trickPoints ? 'Some' : 'None', points: s.trickPoints });
  if (s.comboPoints) lines.push({ label: 'Combos', value: `best ×${s.bestCombo}`, points: s.comboPoints });
  if (s.hasDog) lines.push({ label: 'Dog bites', value: `${s.bites}`, points: -s.bites * 150 });
  if (s.hasGulls) lines.push({ label: 'Yoghurts nicked', value: `${s.stolen}`, points: 0 });
  if (s.hasLee) lines.push({ label: "Lee's bollards", value: `${s.bollards}`, points: s.bollards * 25 });
  for (const l of lines) if (!Number.isFinite(l.points)) l.points = 0;
  const total = Math.max(0, lines.reduce((t, l) => t + l.points, 0));
  const S = def.rankS;
  const rank = s.boss === 'lost' ? 'D' : total >= S ? 'S' : total >= S * 0.8 ? 'A' : total >= S * 0.62 ? 'B' : total >= S * 0.38 ? 'C' : 'D';
  return { lines, total, rank };
}

function fmt(secs: number) {
  return `${Math.floor(secs / 60)}:${(secs % 60).toFixed(1).padStart(4, '0')}`;
}

export function bestScore(level: number): number | null {
  try { const v = localStorage.getItem(`tdb-score-${level}`); return v ? Number(v) : null; } catch { return null; }
}
export function saveBestScore(level: number, score: number) {
  try { localStorage.setItem(`tdb-score-${level}`, String(score)); } catch { /* ignore */ }
}

/** Levels unlock one at a time. `?all` in the URL unlocks everything. */
export function unlockedCount(): number {
  if (new URLSearchParams(location.search).has('all')) return LEVELS.length;
  try { return Math.max(1, Number(localStorage.getItem('tdb-unlocked') || 1)); } catch { return 1; }
}
export function unlock(level: number) {
  try { if (unlockedCount() < level) localStorage.setItem('tdb-unlocked', String(Math.min(level, LEVELS.length))); } catch { /* ignore */ }
}

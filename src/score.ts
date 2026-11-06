import type { RunStats } from './scenes/LevelScene';

export interface ScoreLine { label: string; value: string; points: number }

/** Turn a finished run into a points breakdown. */
export function scoreRun(s: RunStats): { lines: ScoreLine[]; total: number; rank: string } {
  const secs = s.timeMs / 1000;
  const cakesDodged = s.cakesTotal - s.cakesRefused;
  const lines: ScoreLine[] = [
    { label: 'Time', value: fmt(secs), points: Math.max(0, Math.round((90 - secs) * 60)) },
    { label: 'Yoghurts', value: `${s.yoghurts} / ${s.yoghurtsTotal}`, points: s.yoghurts * 250 },
    { label: 'Garmins ignored', value: `${s.garminIgnored}`, points: s.garminIgnored * 150 },
    { label: 'Cakes dodged', value: `${cakesDodged} / ${s.cakesTotal}`, points: cakesDodged * 200 - s.cakesRefused * 100 },
    { label: 'Crashes', value: `${s.crashes}`, points: s.crashes === 0 ? 1000 : -s.crashes * 300 },
    { label: 'Horse etiquette', value: s.kickedByHorse ? 'Kicked 🐎' : s.courteous ? 'Exemplary 👍' : 'Questionable', points: s.kickedByHorse ? -250 : s.courteous ? 500 : 0 },
    { label: 'Cats launched', value: `${s.catsLaunched}`, points: s.catsLaunched * 50 },
  ];
  const total = Math.max(0, lines.reduce((t, l) => t + l.points, 0));
  const rank = total >= 8000 ? 'S' : total >= 6500 ? 'A' : total >= 5000 ? 'B' : total >= 3000 ? 'C' : 'D';
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

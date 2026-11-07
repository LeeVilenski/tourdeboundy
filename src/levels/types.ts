export type Pt = { x: number; y: number };

export type Theme = 'lanes' | 'estuary' | 'forest' | 'moor' | 'town';
export type WalkerKind = 'horse' | 'dogwalker' | 'hiker' | 'pony';

export type ObstacleDef =
  | { type: 'cat'; x: number }
  | { type: 'sheep'; x: number }
  | { type: 'debris'; x: number }      // crashed bike lying in the road
  | { type: 'horse'; x: number; exitX: number }
  | { type: 'walker'; x: number; exitX: number; who: WalkerKind } // lets you past if you ease off
  | { type: 'gust'; x: number; len: number }                      // headwind zone
  | { type: 'gravel'; x: number; len: number; oil?: boolean }     // low grip (oil = diesel spill look)
  | { type: 'log'; x: number }                                    // hop it
  | { type: 'door'; x: number; practice?: boolean }               // parked car whose door swings open (practice = opens early, a demo)
  | { type: 'roller'; x: number; kind: 'bale' | 'boulder' }       // keeps rolling down the hill at you
  | { type: 'dog'; x: number }                                    // chases you: sprint away
  | { type: 'branch'; x: number }                                 // drops from a tree as you pass
  | { type: 'gulls'; x: number; len: number }                     // seagulls swoop to nick yoghurt
  | { type: 'trainrace'; x: number; len: number }                 // race the train along the sea wall
  | { type: 'slowmo'; x: number; len: number }                    // slow motion while airborne over here
  | { type: 'stampede'; x: number }                               // a flock of sheep charges at you
  | { type: 'confetti'; x: number }                               // crowd goes wild
  | { type: 'highline'; x: number; h: number; planks: [number, number][]; yog?: number[] } // raised walkway: the high route (one-way: land from above)
  | { type: 'hazard'; x: number; len: number; kind: 'water' | 'mud' | 'bog' } // pit floor: crash on touch
  | { type: 'car'; x: number }       // parked car, rideable over the top
  | { type: 'trailer'; x: number }   // hay trailer with bale ramp
  | { type: 'kicker'; x: number; h: number; len: number; big?: boolean } // big = 'SEND IT' flip ramp
  | { type: 'overtake'; triggerX: number }; // car passes, horn only

export type PickupType = 'gel' | 'coffee' | 'yoghurt' | 'cake';

export type DecorDef =
  | { type: 'sign'; x: number; text: string; icon?: 'horse' | 'cat' | 'pothole' }
  | { type: 'gate'; x: number }
  | { type: 'tractor'; x: number }
  | { type: 'cows'; x: number }
  | { type: 'train'; x: number; len: number }
  | { type: 'boat'; x: number }
  | { type: 'obelisk'; x: number }
  | { type: 'house'; x: number; color?: number }
  | { type: 'pine'; x: number }
  | { type: 'tor'; x: number }
  | { type: 'grid'; x: number }
  | { type: 'palm'; x: number }
  | { type: 'plaque'; x: number; text: string }
  | { type: 'board'; x: number; text: string }
  | { type: 'cafe'; x: number; name: string };

export interface LevelDef {
  id: number;
  name: string;
  subtitle: string;
  terrain: Pt[];
  obstacles: ObstacleDef[];
  pickups: { type: PickupType; x: number; dy?: number }[];
  checkpoints: number[];
  decor: DecorDef[];
  finishX: number;
  outro: string;
  theme: Theme;
  par: number;          // par time in seconds (time bonus counts down from here)
  rankS: number;        // score for an S rank
  miles?: number;       // show distance as miles (Dartmoor)
  lee?: { joinX: number; leaveX: number; bollards: number[] };
  boss?: { sprintX: number };
  potholes?: { x: number; w: number }[]; // filled in by the builder
  laps?: number[];                 // x of each lap line (shows LAP n/N)
  bunch?: { pileX: number };       // other riders; two crash at pileX
  garminGivesUp?: boolean;
  skyTop: number;
  skyBottom: number;
}

/**
 * Builds smooth terrain from simple instructions.
 * Levels are written in "design" x (what t.x returns); with hill > 1 climbs get taller and are
 * stretched out to stay rideable, and finalize() moves everything in the level to match.
 */
export class TerrainBuilder {
  pts: Pt[] = [];
  x: number;      // design x
  y: number;
  ax: number;     // actual x
  hill: number;
  private segs: { d0: number; d1: number; a0: number; a1: number }[] = [];
  constructor(x = -400, y = 500, hill = 1) { this.x = x; this.ax = x; this.y = y; this.hill = hill; this.pts.push({ x, y }); }

  private advance(designLen: number, actualLen: number) {
    this.segs.push({ d0: this.x, d1: this.x + designLen, a0: this.ax, a1: this.ax + actualLen });
    this.x += designLen; this.ax += actualLen;
  }

  flat(len: number) { return this.slope(len, 0); }
  /** Smooth (cosine) slope; negative dy = uphill. */
  slope(len: number, dy: number, step = 30) {
    let alen = len;
    if (dy) {
      dy *= this.hill;
      alen = Math.max(len, Math.abs(dy) / 0.34); // keep the average gradient rideable
    }
    const x0 = this.ax, y0 = this.y;
    const n = Math.max(1, Math.round(alen / step));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      this.pts.push({ x: x0 + alen * t, y: y0 + dy * (1 - Math.cos(Math.PI * t)) / 2 });
    }
    this.y += dy;
    this.advance(len, alen);
    return this;
  }
  /** Rolling bumps */
  rollers(len: number, amp: number, waves: number) {
    amp = Math.min(amp * Math.sqrt(this.hill), (len / waves) * 0.16);
    const x0 = this.ax, y0 = this.y; const n = Math.round(len / 25);
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      this.pts.push({ x: x0 + len * t, y: y0 - amp * Math.sin(Math.PI * waves * t) ** 2 });
    }
    this.advance(len, len);
    return this;
  }
  potholes: { x: number; w: number }[] = [];
  pothole(w = 34, d = 12) {
    this.potholes.push({ x: this.x, w });
    d = Math.max(d, 18);
    this.pts.push({ x: this.ax + 2, y: this.y + d }, { x: this.ax + w - 2, y: this.y + d }, { x: this.ax + w, y: this.y });
    this.advance(w, w);
    return this;
  }
  /** Steep-sided pit (jump it or land in whatever's at the bottom). */
  gap(w: number, depth: number) {
    this.pts.push({ x: this.ax + 6, y: this.y + depth }, { x: this.ax + w - 6, y: this.y + depth }, { x: this.ax + w, y: this.y });
    this.advance(w, w);
    return this;
  }
  /** Cattle grid: a run of small ridges. */
  grid() {
    for (let i = 0; i < 6; i++) this.pts.push({ x: this.ax + i * 20 + 10, y: this.y + 5 }, { x: this.ax + i * 20 + 20, y: this.y });
    this.advance(120, 120);
    return this;
  }
  mark() { return { x: this.x, y: this.y }; }

  /** Design x -> actual x. */
  map(d: number): number {
    const segs = this.segs;
    if (!segs.length || d <= segs[0].d0) return d + (segs[0]?.a0 - segs[0]?.d0 || 0);
    for (const s of segs) if (d <= s.d1) return s.a0 + (s.d1 === s.d0 ? 0 : ((d - s.d0) / (s.d1 - s.d0)) * (s.a1 - s.a0));
    const last = segs[segs.length - 1];
    return last.a1 + (d - last.d1);
  }

  /** Move every position in the level from design x to actual x. */
  finalize(def: LevelDef): LevelDef {
    const m = (d: number) => Math.round(this.map(d));
    const span = (o: { x: number; len: number }) => { const a = m(o.x); o.len = m(o.x + o.len) - a; o.x = a; };
    for (const o of def.obstacles as any[]) {
      if ('len' in o && o.type !== 'kicker') span(o);
      else if ('x' in o) o.x = m(o.x);
      if ('exitX' in o) o.exitX = m(o.exitX);
      if ('triggerX' in o) o.triggerX = m(o.triggerX);
    }
    for (const p of def.pickups) p.x = m(p.x);
    for (const d of def.decor as any[]) { if ('len' in d) span(d); else d.x = m(d.x); }
    def.checkpoints = def.checkpoints.map(m);
    if (def.lee) def.lee = { joinX: m(def.lee.joinX), leaveX: m(def.lee.leaveX), bollards: def.lee.bollards.map(m) };
    if (def.boss) def.boss = { sprintX: m(def.boss.sprintX) };
    if (def.laps) def.laps = def.laps.map(m);
    if (def.bunch) def.bunch = { pileX: m(def.bunch.pileX) };
    def.potholes = this.potholes.map((p) => ({ x: m(p.x), w: p.w }));
    def.finishX = m(def.finishX);
    def.terrain = this.pts;
    return def;
  }
}

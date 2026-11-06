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
  | { type: 'gravel'; x: number; len: number }                    // low grip
  | { type: 'hazard'; x: number; len: number; kind: 'water' | 'mud' | 'bog' } // pit floor: crash on touch
  | { type: 'car'; x: number }       // parked car, rideable over the top
  | { type: 'trailer'; x: number }   // hay trailer with bale ramp
  | { type: 'kicker'; x: number; h: number; len: number }
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
  | { type: 'board'; x: number; text: string };

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
  garminGivesUp?: boolean;
  skyTop: number;
  skyBottom: number;
}

/** Small helper to build smooth terrain from simple instructions. */
export class TerrainBuilder {
  pts: Pt[] = [];
  x: number;
  y: number;
  constructor(x = -400, y = 500) { this.x = x; this.y = y; this.pts.push({ x, y }); }
  flat(len: number) { return this.slope(len, 0); }
  /** Smooth (cosine) slope; negative dy = uphill. */
  slope(len: number, dy: number, step = 30) {
    const x0 = this.x, y0 = this.y;
    const n = Math.max(1, Math.round(len / step));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      this.pts.push({ x: x0 + len * t, y: y0 + dy * (1 - Math.cos(Math.PI * t)) / 2 });
    }
    this.x += len; this.y += dy;
    return this;
  }
  /** Rolling bumps */
  rollers(len: number, amp: number, waves: number) {
    const x0 = this.x, y0 = this.y; const n = Math.round(len / 25);
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      this.pts.push({ x: x0 + len * t, y: y0 - amp * Math.sin(Math.PI * waves * t) ** 2 });
    }
    this.x += len;
    return this;
  }
  pothole(w = 34, d = 12) {
    this.pts.push({ x: this.x + 2, y: this.y + d }, { x: this.x + w - 2, y: this.y + d }, { x: this.x + w, y: this.y });
    this.x += w;
    return this;
  }
  /** Steep-sided pit (jump it or land in whatever's at the bottom). */
  gap(w: number, depth: number) {
    this.pts.push({ x: this.x + 6, y: this.y + depth }, { x: this.x + w - 6, y: this.y + depth }, { x: this.x + w, y: this.y });
    this.x += w;
    return this;
  }
  /** Cattle grid: a run of small ridges. */
  grid() {
    for (let i = 0; i < 6; i++) this.pts.push({ x: this.x + i * 20 + 10, y: this.y + 5 }, { x: this.x + i * 20 + 20, y: this.y });
    this.x += 120;
    return this;
  }
  mark() { return { x: this.x, y: this.y }; }
}

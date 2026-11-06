export type Pt = { x: number; y: number };

export type ObstacleDef =
  | { type: 'cat'; x: number }
  | { type: 'horse'; x: number; exitX: number }
  | { type: 'car'; x: number }       // parked car, rideable over the top
  | { type: 'trailer'; x: number }   // hay trailer with bale ramp
  | { type: 'kicker'; x: number; h: number; len: number }
  | { type: 'overtake'; triggerX: number }; // car passes, horn only

export type PickupType = 'gel' | 'coffee' | 'yoghurt' | 'cake';

export type DecorDef =
  | { type: 'sign'; x: number; text: string; icon?: 'horse' | 'cat' | 'pothole' }
  | { type: 'gate'; x: number }
  | { type: 'tractor'; x: number }
  | { type: 'cows'; x: number };

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
  mark() { return { x: this.x, y: this.y }; }
}

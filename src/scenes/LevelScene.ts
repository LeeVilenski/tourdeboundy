import Phaser from 'phaser';
import { Rider } from '../entities/Rider';
import { LevelDef, Pt, PickupType } from '../levels/types';
import { LEVELS } from '../levels';
import { input, isTouch, stopCruise } from '../ui/input';
import { loadGhost, saveGhost } from '../progress';
import { willOnBike } from '../entities/WillSprite';
import { bestTime } from './MenuScene';
import { hud } from '../ui/hud';
import { RES } from '../textures';
import { WILL_LINES, CRASH_LINES, GARMIN_MSGS, GARMIN_REPLIES, CAKE_LINES, LEE_JOIN, LEE_CRASH, LEE_LEAVE, ANDY_TAUNTS } from '../lines';
import { NpcRider, LEE_LOOK, ANDY_LOOK, RIVAL_LOOKS } from '../entities/NpcRider';
import { WalkerKind } from '../levels/types';
import { drawBackdrop, drawRoadside, drawDecor, groundColor, Chunk, sliced, BackChunk } from './themes';
import { sfx } from '../sfx';

type Body = MatterJS.BodyType;

export interface RunStats {
  level: number;
  timeMs: number;
  crashes: number;
  garminIgnored: number;
  yoghurts: number;
  yoghurtsTotal: number;
  cakesTotal: number;
  cakesRefused: number;
  catsLaunched: number;
  courteous: boolean;
  kickedByHorse: boolean;
  hasHorse: boolean;
  hasCats: boolean;
  hasSheep: boolean;
  sheepLaunched: number;
  walkersTotal: number;
  politePasses: number;
  walkersBumped: number;
  hasLee: boolean;
  bollards: number;
  boss: 'won' | 'lost' | null;
  trickPoints: number;
  flips: number;
  hasDog: boolean;
  bites: number;
  hasGulls: boolean;
  stolen: number;
  comboPoints: number;
  bestCombo: number;
  ghost?: number[];
}

const WALKERS: Record<WalkerKind, { tex: string; w: number; h: number; texH: number; speed: number; ask: string; thanks: string; hit: string }> = {
  horse: { tex: 'horse', w: 110, h: 112, texH: 120, speed: 0.9, ask: 'Pass wide and slow!', thanks: 'Thank you! 👋', hit: 'NEIGHHH!' },
  dogwalker: { tex: 'dogwalker', w: 90, h: 110, texH: 116, speed: 0.9, ask: 'Dog walker — ease off!', thanks: 'Morning! 👋', hit: 'OI!' },
  hiker: { tex: 'hiker', w: 50, h: 112, texH: 116, speed: 1.0, ask: 'Hiker — ease off!', thanks: 'Cheers! 🥾', hit: 'OI!' },
  pony: { tex: 'pony', w: 100, h: 102, texH: 96, speed: 0.6, ask: 'Dartmoor pony!', thanks: '(munches grass)', hit: 'NEIGH!' },
};

const NO_BAKE = new URLSearchParams(location.search).has('nobake');
const CHAMP_MSGS: [string, string][] = [['GARMIN', 'WORLD CLASS!'], ['TRAINING', 'PEAKING'], ['STATUS', 'LEGEND'], ['RECOVERY', 'NOT NEEDED'], ['VO2 MAX', 'OFF THE CHART']];
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

export class LevelScene extends Phaser.Scene {
  def!: LevelDef;
  rider!: Rider;
  camTarget!: Phaser.GameObjects.Zone;
  stats!: RunStats;
  lastCp = 0;
  startTime = 0;
  elapsed = 0;
  finished = false;
  paused = false;
  respawnAt = 0;
  upsideDownSince = 0;
  bubble?: Phaser.GameObjects.Text;
  bubbleUntil = 0;
  garminNext = 0;
  garminShownAt = 0;
  horses: { body: Body; sprite: Phaser.GameObjects.Image; exitX: number; wait: number; gone: boolean; label: Phaser.GameObjects.Text; who: WalkerKind }[] = [];
  cats: { body: Body; sprite: Phaser.GameObjects.Image; hit: boolean; kind: 'cat' | 'sheep' | 'debris' }[] = [];
  gusts: { x: number; len: number }[] = [];
  inGust = false;
  wind!: Phaser.GameObjects.Particles.ParticleEmitter;
  speedLines!: Phaser.GameObjects.Particles.ParticleEmitter;
  chunks: Chunk[] = [];
  backChunks: BackChunk[] = [];
  /** World x of whatever is being built right now; Graphics/Text made meanwhile get culled by it. */
  cullX?: number;
  culled: { o: Phaser.GameObjects.Graphics | Phaser.GameObjects.Text; x: number }[] = [];
  /** Physics bodies that are only kept in the world near the rider (fewer bodies = much cheaper physics). */
  sleepers: { body: Body; x0: number; x1: number; on: boolean }[] = [];
  bodyWindowAt = -1e9;
  rtPool: Phaser.GameObjects.RenderTexture[] = [];
  earthPool: Phaser.GameObjects.Rectangle[] = [];
  bakeH = { back: 600, front: 200 };
  baked: { x0: number; x1: number; top: number; bot: number; depth: number; gs: Phaser.GameObjects.Graphics[]; rt?: Phaser.GameObjects.RenderTexture; earth?: Phaser.GameObjects.Rectangle }[] = [];
  lowDetail = false;
  luckyUsed = false;
  combo = { count: 0, pts: 0, lastStep: 0, slow: 0 };
  ghostFrames: number[] = [];
  ghostPlay?: { frames: number[]; c: Phaser.GameObjects.Container };
  flung = false;
  flingFrom = 0;
  trains: { x: number; endX: number; state: 'wait' | 'race' | 'done'; tx: number; img?: Phaser.GameObjects.Image }[] = [];
  slowZones: { x: number; len: number }[] = [];
  slowOn = false;
  stampedes: { x: number; fired: boolean; sheep: { body: Body; sprite: Phaser.GameObjects.Image; dodged: boolean }[]; until: number }[] = [];
  confettiAt: { x: number; fired: boolean }[] = [];
  grids: { x: number; done: boolean; rattle: number; violent?: boolean }[] = [];
  planks: { body: Body; x0: number; x1: number; top: number; on: boolean }[] = [];
  movers: { img: Phaser.GameObjects.Image; x0: number; x1: number; v: number }[] = [];
  lee?: { npc: NpcRider; state: 'off' | 'riding' | 'down' | 'gone'; x: number; hit: Set<number>; downUntil: number; bubble?: Phaser.GameObjects.Text; bubbleUntil: number };
  andy?: { npc: NpcRider; state: 'sitting' | 'sprint' | 'done'; x: number; v: number; nextTaunt: number; bubble?: Phaser.GameObjects.Text; bubbleUntil: number };
  garminShows = 0;
  garminDone = false;
  rivals: { npc: NpcRider; x: number; off: number; phase: number; state: 'riding' | 'down' }[] = [];
  lapShown = 1;
  // tricks
  airborne = false; airStart = 0; airRot = 0; lastAngle = 0; wheelieSteps = 0; groundSteps = 0;
  pendingTrick?: { at: number; pts: number; label: string };
  camOff = -220; camZoom = 1;
  // hazards
  physSteps = 0;
  doors: { x: number; trigger: number; practice?: boolean; state: 'shut' | 'open' | 'done'; shutAt?: number; body?: Body; door: Phaser.GameObjects.Rectangle; lights: Phaser.GameObjects.Graphics }[] = [];
  rollers: { x: number; kind: 'bale' | 'boulder'; next: number; live: { body: Body; sprite: Phaser.GameObjects.Image; born: number }[] }[] = [];
  dogs: { x: number; state: 'wait' | 'chase' | 'done'; dx: number; until: number; biteCool: number; bitten?: number; sprite: Phaser.GameObjects.Image }[] = [];
  branches: { x: number; trigger: number; dropped: boolean }[] = [];
  gullZones: { x: number; len: number; next: number }[] = [];
  gulls: { sprite: Phaser.GameObjects.Image; y0: number; done: boolean }[] = [];
  props: { body: Body; sprite: Phaser.GameObjects.Image }[] = [];
  pickups: { body: Body; sprite: Phaser.GameObjects.Image; type: PickupType; taken: boolean }[] = [];
  overtakes: { triggerX: number; done: boolean }[] = [];
  passingCar?: Phaser.GameObjects.Image;
  cpFlags: { x: number; flag: Phaser.GameObjects.Graphics; reached: boolean }[] = [];
  blood!: Phaser.GameObjects.Particles.ParticleEmitter;
  sparks!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() { super('Level'); }

  init(data: { level: number }) {
    this.def = LEVELS[(data.level ?? 1) - 1];
    this.stats = {
      level: this.def.id, timeMs: 0, crashes: 0, garminIgnored: 0, yoghurts: 0,
      yoghurtsTotal: this.def.pickups.filter((p) => p.type === 'yoghurt').length,
      cakesTotal: this.def.pickups.filter((p) => p.type === 'cake').length,
      cakesRefused: 0, catsLaunched: 0, courteous: false, kickedByHorse: false,
      hasHorse: this.def.obstacles.some((o) => o.type === 'horse'),
      hasCats: this.def.obstacles.some((o) => o.type === 'cat'),
      hasSheep: this.def.obstacles.some((o) => o.type === 'sheep'),
      sheepLaunched: 0,
      walkersTotal: this.def.obstacles.filter((o) => o.type === 'walker').length,
      politePasses: 0, walkersBumped: 0,
      hasLee: !!this.def.lee, bollards: 0,
      boss: null,
      trickPoints: 0, flips: 0,
      hasDog: this.def.obstacles.some((o) => o.type === 'dog'), bites: 0,
      hasGulls: this.def.obstacles.some((o) => o.type === 'gulls'), stolen: 0,
      comboPoints: 0, bestCombo: 0,
    };
    this.lastCp = this.def.checkpoints[0];
    this.finished = false; this.paused = false; this.respawnAt = 0; this.elapsed = 0;
    this.horses = []; this.cats = []; this.pickups = []; this.overtakes = []; this.cpFlags = [];
    this.passingCar = undefined; this.bubble = undefined;
    this.gusts = []; this.inGust = false; this.movers = []; this.lee = undefined; this.andy = undefined;
    this.garminShows = 0; this.garminDone = false; this.rivals = []; this.lapShown = 1;
    this.airborne = false; this.wheelieSteps = 0; this.pendingTrick = undefined; this.camOff = -220; this.camZoom = 1;
    this.sleepers = []; this.bodyWindowAt = -1e9; this.luckyUsed = false; this.baked = []; this.rtPool = []; this.earthPool = []; this.culled = []; this.cullX = undefined; this.lowDetail = false; this.combo = { count: 0, pts: 0, lastStep: 0, slow: 0 }; this.ghostFrames = []; this.ghostPlay = undefined; this.flung = false; this.trains = []; this.slowZones = []; this.slowOn = false; this.stampedes = []; this.confettiAt = []; this.grids = this.def.decor.filter((d) => d.type === 'grid').map((d) => ({ x: d.x, done: false, rattle: 0 })); this.planks = []; this.doors = []; this.rollers = []; this.dogs = []; this.branches = []; this.gullZones = []; this.gulls = []; this.props = [];
  }

  // ---------- terrain helpers ----------
  groundY(x: number): number {
    const t = this.def.terrain;
    if (x <= t[0].x) return t[0].y;
    let lo = 0, hi = t.length - 1;
    while (hi - lo > 1) { const m = (lo + hi) >> 1; if (t[m].x <= x) lo = m; else hi = m; }
    const a = t[lo], b = t[hi];
    return a.y + ((x - a.x) / (b.x - a.x || 1)) * (b.y - a.y);
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    const L = this.def.finishX + 1500;

    // remember the level position of scenery as it's created, so off-screen pieces can be skipped
    const fac = this.add as any;
    if (!fac.__cullPatched) {
      fac.__cullPatched = true;
      for (const k of ['graphics', 'text']) {
        const orig = fac[k].bind(fac);
        fac[k] = (...a: unknown[]) => { const o = orig(...a); const sc = fac.scene as LevelScene; if (sc.cullX !== undefined) sc.culled.push({ o, x: sc.cullX }); return o; };
      }
    }
    // ---------- background ----------
    this.backChunks = drawBackdrop(this, this.def, W, H, L);
    drawDecor(this, this.def, (x) => this.groundY(x), this.movers);
    this.cullX = this.def.finishX; this.drawFinishArch(); this.endCull();
    this.chunks = drawRoadside(this, this.def, (x) => this.groundY(x));
    this.drawRoad();
    this.groupChunks();

    // ---------- physics ground ----------
    this.buildGround(this.def.terrain);
    this.buildObstacles();
    this.endCull();
    this.buildPickups();
    this.buildCheckpoints();
    this.buildCast();

    // only keep nearby physics bodies in the world
    for (const body of [...(this.matter.world.localWorld as any).bodies] as Body[]) {
      if (body.label === 'horse') continue; // walkers move about; always keep
      this.sleepers.push({ body, x0: body.bounds.min.x, x1: body.bounds.max.x, on: true });
    }

    // ---------- particles ----------
    this.blood = this.add.particles(0, 0, 'blood', {
      speed: { min: 80, max: 320 }, angle: { min: 200, max: 340 }, gravityY: 900, lifespan: 900,
      scale: { start: 0.9, end: 0.3 }, emitting: false,
    }).setDepth(30);
    this.sparks = this.add.particles(0, 0, 'spark', {
      speed: { min: 60, max: 200 }, lifespan: 500, scale: { start: 0.9, end: 0 }, emitting: false,
    }).setDepth(30);
    this.wind = this.add.particles(0, 0, 'streak', {
      x: { min: 0, max: W }, y: { min: 0, max: H * 0.8 }, speedX: { min: -1400, max: -900 }, lifespan: 900,
      alpha: { start: 0.8, end: 0 }, frequency: 40, emitting: false,
    }).setScrollFactor(0).setDepth(35);
    this.speedLines = this.add.particles(0, 0, 'streak', {
      x: { min: 0, max: W }, y: { min: H * 0.1, max: H * 0.9 }, speedX: { min: -2200, max: -1500 }, lifespan: 500,
      scaleX: { min: 0.6, max: 1.6 }, alpha: { start: 0.5, end: 0 }, frequency: 30, emitting: false,
    }).setScrollFactor(0).setDepth(34);

    // ---------- rider + camera ----------
    this.spawn(this.lastCp);
    this.camTarget = this.add.zone(this.rider.position.x, this.rider.position.y, 1, 1);
    this.cameras.main.startFollow(this.camTarget, false, 0.12, 0.1).setFollowOffset(-220, 70);
    this.cameras.main.fadeIn(400);

    this.matter.world.on('collisionstart', (e: Phaser.Physics.Matter.Events.CollisionStartEvent) => this.onCollide(e));
    // controls run once per physics step, so the feel is the same at any screen refresh rate
    this.matter.world.on('beforeupdate', () => {
      if (this.paused || !this.rider) return;
      this.rider.step(this.finished ? { pedal: false, brake: true, leanBack: false, leanFwd: false, sprint: false, hop: false } : input, this.time.now);
      // Lee and Andy move on the physics clock, so races stay fair on slow devices
      if (!this.finished) { this.updateLee(this.time.now, 16.67); this.updateAndy(this.time.now, 16.67); this.updateBunch(this.time.now); }
      this.physSteps++;
      this.updateBodyWindow();
      this.stepGhost();
      this.stepSetPieces();
      this.stepPlanks();
      this.stepFling();
      this.stepTricks();
      this.stepHazards();
      if (this.inGust && !this.rider.crashed) {
        const f = this.rider.totalMass() * 1.7e-4 * (this.rider.kit.perk === 'windproof' ? 0.4 : 1);
        this.matter.body.applyForce(this.rider.frame, this.rider.frame.position, { x: -f, y: 0 });
      }
    });
    this.matter.world.on('collisionactive', (e: Phaser.Physics.Matter.Events.CollisionActiveEvent) => {
      let n = 0, rear = false, front = false;
      for (const pair of e.pairs) {
        const a = pair.bodyA as Body, b = pair.bodyB as Body;
        const wheel = a.label === 'wheel' && b.label !== 'pickup' && b.label !== 'hazard' && !b.isSensor ? a : b.label === 'wheel' && a.label !== 'pickup' && a.label !== 'hazard' && !a.isSensor ? b : null;
        if (!wheel) continue;
        n++;
        if (wheel === this.rider.rear) rear = true;
        if (wheel === this.rider.front) front = true;
      }
      this.rider.groundContacts = n;
      this.rider.rearDown = rear;
      this.rider.frontDown = front;
      if (rear) this.rider.lastRear = this.rider.stepCount;
      if (front) this.rider.lastFront = this.rider.stepCount;
    });

    // ---------- HUD ----------
    hud.show(isTouch());
    hud.hideGarmin();
    hud.onGarminTap(() => this.swatGarmin());
    hud.onPause(() => this.togglePause());
    this.input.keyboard?.on('keydown-G', () => this.swatGarmin());
    this.input.keyboard?.on('keydown-P', () => this.togglePause());
    this.input.keyboard?.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard?.on('keydown-R', () => { if (!this.finished && !this.paused) this.crashOrRespawn(true); });
    this.events.once('shutdown', () => { (this.matter.world?.engine?.timing as any) && ((this.matter.world.engine.timing as any).timeScale = 1); hud.hide(); this.matter.world?.off('collisionstart'); this.matter.world?.off('collisionactive'); this.matter.world?.off('beforeupdate'); });

    this.events.off('hop');
    this.events.on('hop', () => sfx.click());
    stopCruise();
    const ghost = loadGhost(this.def.id);
    if (ghost && ghost.length > 6) {
      const c = willOnBike(this, ghost[0], ghost[1], 1).setAlpha(0.35).setDepth(8);
      c.add(this.add.text(30, -100, 'BEST', { fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#fff', stroke: '#111', strokeThickness: 4 }).setOrigin(0.5));
      this.ghostPlay = { frames: ghost, c };
    }
    this.startTime = this.time.now;
    this.garminNext = this.time.now + 7000;
    this.banner(`LEVEL ${this.def.id}: ${this.def.name.toUpperCase()}`, this.def.subtitle);
    this.time.delayedCall(2600, () => this.say(this.rider.kit.perk === 'snacks' ? pick(['Yeehaw.', 'Saddle up, partner.', 'Giddy up, Dutchy.', 'This town ain\'t big enough for two Garmins.']) : pick(WILL_LINES)));
  }

  // ---------- drawing ----------
  hills(f: number, color: number, base: number, amp: number, freq: number, depth: number, L: number) {
    const g = this.add.graphics().setScrollFactor(f).setDepth(depth);
    g.fillStyle(color, 1);
    g.beginPath();
    const y0 = base + 120 * f;
    g.moveTo(-800, 2000);
    for (let x = -800; x <= L * f + 2200; x += 40) {
      g.lineTo(x, y0 - amp * (Math.sin(x * freq) * 0.6 + Math.sin(x * freq * 2.3 + 1) * 0.4));
    }
    g.lineTo(L * f + 2200, 2000);
    g.closePath(); g.fillPath();
  }

  drawRoad() {
    const t = this.def.terrain;
    const verge = this.def.theme === 'town' ? 0xbdbdbd : this.def.theme === 'moor' ? 0x7d7a3e : 0x4f9236;
    const earth = groundColor(this.def.theme);
    const bottom = Math.max(...t.map((p) => p.y)) + 2000;
    this.chunks.push(...sliced(this, t, 5, (g, pts) => {
      g.fillStyle(earth, 1).beginPath().moveTo(pts[0].x, bottom);
      for (const p of pts) g.lineTo(p.x, p.y);
      g.lineTo(pts[pts.length - 1].x, bottom).closePath().fillPath();
      g.fillStyle(0x3a3a3f, 1).beginPath().moveTo(pts[0].x, pts[0].y);
      for (const p of pts) g.lineTo(p.x, p.y);
      for (let i = pts.length - 1; i >= 0; i--) g.lineTo(pts[i].x, pts[i].y + 22);
      g.closePath().fillPath();
      g.lineStyle(3, 0x1f1f22, 1).strokePoints(pts as Phaser.Types.Math.Vector2Like[]);
      g.lineStyle(2, 0x58585e, 1).strokePoints(pts.map((p) => ({ x: p.x, y: p.y + 22 })));
      g.lineStyle(5, verge, 1).strokePoints(pts.map((p) => ({ x: p.x, y: p.y + 25 })));
    }));
    // gravel patches (one Graphics each, so off-screen ones can be skipped)
    for (const o of this.def.obstacles) {
      if (o.type !== 'gravel') continue;
      this.cullX = o.x;
      const ground = this.add.graphics().setDepth(5.5);
      const seg = t.filter((p) => p.x >= o.x && p.x <= o.x + o.len);
      if (o.oil) {
        ground.lineStyle(9, 0x111118, 1).strokePoints(seg.map((p) => ({ x: p.x, y: p.y + 4 })));
        ground.lineStyle(2, 0x8a6bd1, 0.8).strokePoints(seg.map((p) => ({ x: p.x, y: p.y + 2 })));
        ground.lineStyle(2, 0x3ec7c7, 0.6).strokePoints(seg.map((p) => ({ x: p.x, y: p.y + 6 })));
        const lx = o.x + o.len / 2;
        this.add.text(lx, this.groundY(lx) - 140, '⚠ OIL', { fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#111', backgroundColor: '#ffd400', padding: { x: 5, y: 2 } }).setOrigin(0.5).setDepth(4);
        continue;
      }
      ground.lineStyle(10, 0xb89a6a, 1).strokePoints(seg.map((p) => ({ x: p.x, y: p.y + 4 })));
      const rnd = new Phaser.Math.RandomDataGenerator(['gravel' + o.x]);
      for (let x = o.x; x < o.x + o.len; x += 9) {
        ground.fillStyle(rnd.pick([0x8a7350, 0xd8c39a, 0x6e5a3c]), 1).fillCircle(x + rnd.between(-3, 3), this.groundY(x) + rnd.between(1, 9), rnd.between(1, 3));
      }
    }
  }

  drawFinishArch() {
    const fx = this.def.finishX, fy = this.groundY(fx);
    const g = this.add.graphics().setDepth(4);
    g.fillStyle(0xffffff, 1).fillRect(fx - 6, fy - 230, 12, 230);
    const front = this.add.graphics().setDepth(25);
    front.fillStyle(0xffffff, 1).fillRect(fx + 34, fy - 230, 12, 240);
    for (let i = 0; i < 10; i++) for (let j = 0; j < 2; j++) {
      g.fillStyle((i + j) % 2 ? 0x111111 : 0xffffff, 1).fillRect(fx - 6 + i * 5.2, fy - 230 + j * 6, 5.2, 6);
    }
    this.add.text(fx + 20, fy - 250, 'FINISH', { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#ffd400', stroke: '#111', strokeThickness: 6 }).setOrigin(0.5).setDepth(26);
  }

  // ---------- physics building ----------
  buildGround(raw: Pt[], walls = true) {
    const T = 40;
    // merge runs of nearly-straight segments: far fewer physics bodies, same shape
    const pts: Pt[] = [raw[0]];
    for (let i = 1; i < raw.length - 1; i++) {
      const a = pts[pts.length - 1], b = raw[i], c = raw[i + 1];
      const a1 = Math.atan2(b.y - a.y, b.x - a.x), a2 = Math.atan2(c.y - b.y, c.x - b.x);
      if (Math.abs(a1 - a2) > 0.012 || c.x - a.x > 500) pts.push(b);
    }
    pts.push(raw[raw.length - 1]);
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
      const nx = -dy / len, ny = dx / len;
      const mx = (a.x + b.x) / 2;
      const gz = this.def.obstacles.find((o) => o.type === 'gravel' && mx >= o.x && mx <= o.x + o.len) as { oil?: boolean } | undefined;
      const gravel = !!gz;
      this.matter.add.rectangle(mx + nx * T / 2, (a.y + b.y) / 2 + ny * T / 2, len + 4, T, {
        isStatic: true, angle: Math.atan2(dy, dx), label: 'ground', friction: gravel ? (gz!.oil ? 0.04 : 0.12) : 1, frictionStatic: gravel ? (gz!.oil ? 0.05 : 0.3) : 10,
      });
    }
    if (!walls) return;
    // walls at the ends
    const first = pts[0], last = pts[pts.length - 1];
    this.matter.add.rectangle(first.x - 20, first.y - 400, 40, 900, { isStatic: true, label: 'ground' });
    this.matter.add.rectangle(last.x + 20, last.y - 400, 40, 900, { isStatic: true, label: 'ground' });
  }

  solid(verts: Pt[]) {
    const c = verts.reduce((s, p) => ({ x: s.x + p.x / verts.length, y: s.y + p.y / verts.length }), { x: 0, y: 0 });
    const body = this.matter.add.fromVertices(c.x, c.y, [verts.map((p) => ({ x: p.x, y: p.y }))], {
      isStatic: true, label: 'ground', friction: 1, frictionStatic: 10,
    }) as Body;
    // fromVertices recentres on the centre of mass; shift so vertices land where we asked
    const minX = Math.min(...verts.map((p) => p.x)), minY = Math.min(...verts.map((p) => p.y));
    const b = body.bounds;
    this.matter.body.setPosition(body, { x: body.position.x + (minX - b.min.x), y: body.position.y + (minY - b.min.y) });
    return body;
  }

  buildObstacles() {
    for (const o of this.def.obstacles) {
      this.cullX = 'x' in o ? (o as { x: number }).x : undefined;
      if (o.type === 'kicker') {
        const gy = this.groundY(o.x), gy2 = this.groundY(o.x + o.len);
        const pts: Pt[] = [];
        for (let i = 0; i <= 8; i++) {
          const tt = i / 8;
          pts.push({ x: o.x + o.len * tt, y: gy + (gy2 - gy) * tt - o.h * tt * tt });
        }
        this.buildGround(pts, false);
        pts.push({ x: o.x + o.len, y: gy2 });
        const g = this.add.graphics().setDepth(7);
        g.fillStyle(0xb5835a, 1).lineStyle(3, 0x4a2f19, 1);
        g.beginPath(); g.moveTo(pts[0].x, pts[0].y);
        for (const p of pts) g.lineTo(p.x, p.y);
        g.closePath(); g.fillPath(); g.strokePath();
        if (o.big) {
          g.fillStyle(0xffd400, 1).fillRect(o.x + o.len - 8, gy2 - o.h - 2, 8, o.h + 2);
          this.add.text(o.x + o.len / 2, gy - o.h - 70, 'SEND IT ⤴', { fontFamily: 'Arial Black, Arial', fontSize: '15px', color: '#111', backgroundColor: '#ffd400', padding: { x: 6, y: 3 } }).setOrigin(0.5).setDepth(7);
        }
        g.lineStyle(2, 0x8a5f3c, 1);
        for (let i = 1; i < 4; i++) g.lineBetween(o.x + o.len * i / 4, gy - o.h * (i / 4) ** 2 + 4, o.x + o.len * i / 4, gy2);
      } else if (o.type === 'car') {
        const gy = this.groundY(o.x);
        const x = o.x;
        this.solid([{ x, y: gy - 50 }, { x: x + 220, y: gy - 50 }, { x: x + 220, y: gy }, { x, y: gy }]);
        this.solid([{ x: x + 50, y: gy - 50 }, { x: x + 85, y: gy - 84 }, { x: x + 160, y: gy - 84 }, { x: x + 195, y: gy - 50 }]);
        const g = this.add.graphics().setDepth(7);
        g.fillStyle(0xd62f2f, 1).lineStyle(3, 0x111111, 1);
        g.fillRoundedRect(x, gy - 52, 220, 40, 10); g.strokeRoundedRect(x, gy - 52, 220, 40, 10);
        g.beginPath(); g.moveTo(x + 50, gy - 50); g.lineTo(x + 85, gy - 85); g.lineTo(x + 160, gy - 85); g.lineTo(x + 195, gy - 50); g.closePath(); g.fillPath(); g.strokePath();
        g.fillStyle(0xbfe6ff, 1);
        g.fillTriangle(x + 62, gy - 52, x + 88, gy - 78, x + 112, gy - 52);
        g.fillRect(x + 88, gy - 78, 24, 26);
        g.fillRect(x + 118, gy - 78, 38, 26);
        g.fillTriangle(x + 156, gy - 78, x + 156, gy - 52, x + 182, gy - 52);
        g.fillStyle(0x111111, 1).fillCircle(x + 45, gy - 12, 18).fillCircle(x + 175, gy - 12, 18);
        g.fillStyle(0xaaaaaa, 1).fillCircle(x + 45, gy - 12, 8).fillCircle(x + 175, gy - 12, 8);
        g.fillStyle(0xffe066, 1).fillRect(x + 208, gy - 44, 10, 8);
        this.add.text(x + 110, gy - 32, 'PARKED ON A BEND', { fontFamily: 'Arial Black, Arial', fontSize: '10px', color: '#fff' }).setOrigin(0.5).setDepth(7);
      } else if (o.type === 'trailer') {
        const gy = this.groundY(o.x), x = o.x, H = 78;
        this.solid([{ x, y: gy }, { x: x + 230, y: gy - H }, { x: x + 230, y: gy }]);
        this.solid([{ x: x + 230, y: gy - H }, { x: x + 500, y: gy - H }, { x: x + 500, y: gy - 30 }, { x: x + 230, y: gy - 30 }]);
        const g = this.add.graphics().setDepth(7);
        // bale ramp
        g.fillStyle(0xe8c45a, 1).lineStyle(3, 0x8a6a1a, 1);
        g.fillTriangle(x, gy, x + 230, gy - H, x + 230, gy); g.strokeTriangle(x, gy, x + 230, gy - H, x + 230, gy);
        g.lineStyle(2, 0xc9a23b, 1);
        for (let i = 1; i < 6; i++) g.lineBetween(x + i * 38, gy, x + i * 38, gy - H * (i * 38) / 230);
        // trailer bed + bales
        g.fillStyle(0x7a4a24, 1).fillRect(x + 230, gy - 36, 270, 10);
        g.fillStyle(0xe8c45a, 1).lineStyle(3, 0x8a6a1a, 1);
        for (let i = 0; i < 4; i++) { g.fillRect(x + 232 + i * 67, gy - H, 66, H - 36); g.strokeRect(x + 232 + i * 67, gy - H, 66, H - 36); }
        g.fillStyle(0x111111, 1).fillCircle(x + 300, gy - 16, 16).fillCircle(x + 440, gy - 16, 16);
        g.fillStyle(0xd62f2f, 1).fillCircle(x + 300, gy - 16, 6).fillCircle(x + 440, gy - 16, 6);
      } else if (o.type === 'cat') {
        const gy = this.groundY(o.x);
        const body = this.matter.add.rectangle(o.x, gy - 12, 30, 18, { label: 'cat', density: 0.0006, friction: 0.6 }) as Body;
        const sprite = this.add.image(o.x, gy - 12, 'cat').setScale(1 / RES).setDepth(12);
        this.cats.push({ body, sprite, hit: false, kind: 'cat' });
      } else if (o.type === 'sheep') {
        const gy = this.groundY(o.x);
        const body = this.matter.add.rectangle(o.x, gy - 16, 44, 30, { label: 'cat', density: 0.0007, friction: 0.6 }) as Body;
        const sprite = this.add.image(o.x, gy - 16, 'sheep').setScale(1 / RES).setDepth(12);
        this.cats.push({ body, sprite, hit: false, kind: 'sheep' });
      } else if (o.type === 'debris') {
        const gy = this.groundY(o.x);
        const body = this.matter.add.rectangle(o.x, gy - 14, 72, 26, { label: 'debris', density: 0.0012, friction: 0.8 }) as Body;
        const sprite = this.add.image(o.x, gy - 14, 'brokenbike').setScale(1 / RES).setDepth(12);
        this.cats.push({ body, sprite, hit: false, kind: 'debris' });
      } else if (o.type === 'horse' || o.type === 'walker') {
        const who: WalkerKind = o.type === 'horse' ? 'horse' : o.who;
        const w = WALKERS[who];
        const gy = this.groundY(o.x);
        const body = this.matter.add.rectangle(o.x, gy - w.h / 2, w.w, w.h, { isStatic: true, label: 'horse' }) as Body;
        const sprite = this.add.image(o.x, gy - w.texH / 2, w.tex).setScale(1 / RES).setDepth(9);
        const label = this.add.text(o.x, gy - w.texH - 20, w.ask, { fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#111', backgroundColor: '#fff', padding: { x: 5, y: 3 } }).setOrigin(0.5).setDepth(9).setAlpha(0);
        this.horses.push({ body, sprite, exitX: o.exitX, wait: 0, gone: false, label, who });
      } else if (o.type === 'log') {
        const gy = this.groundY(o.x);
        this.matter.add.rectangle(o.x, gy - 16, 74, 32, { isStatic: true, label: 'ground', chamfer: { radius: 4 }, friction: 1 });
        this.add.image(o.x, gy - 16, 'log').setScale(1.1 / RES, 1.15 / RES).setDepth(7);
      } else if (o.type === 'door') {
        const gy = this.groundY(o.x);
        const cg = this.add.graphics().setDepth(3), cx = o.x - 200;
        cg.fillStyle(0x2c7be5, 1).lineStyle(3, 0x111111, 1).fillRoundedRect(cx, gy - 52, 200, 40, 10).strokeRoundedRect(cx, gy - 52, 200, 40, 10);
        cg.fillStyle(0x2c7be5, 1).beginPath().moveTo(cx + 40, gy - 50).lineTo(cx + 70, gy - 82).lineTo(cx + 140, gy - 82).lineTo(cx + 175, gy - 50).closePath().fillPath().strokePath();
        cg.fillStyle(0xbfe6ff, 1).fillRect(cx + 74, gy - 78, 30, 24).fillRect(cx + 110, gy - 78, 30, 24);
        cg.fillStyle(0x111111, 1).fillCircle(cx + 40, gy - 12, 16).fillCircle(cx + 165, gy - 12, 16);
        const door = this.add.rectangle(o.x, gy - 50, 10, 40, 0x2c7be5).setStrokeStyle(3, 0x111111).setOrigin(0.5, 0).setDepth(8).setScale(0.15, 1);
        const lights = this.add.graphics().setDepth(4);
        this.doors.push({ x: o.x, trigger: o.practice ? 1000 : Phaser.Math.Between(480, 620), state: 'shut', door, lights, practice: o.practice });
      } else if (o.type === 'roller') {
        this.rollers.push({ x: o.x, kind: o.kind, next: 0, live: [] });
      } else if (o.type === 'dog') {
        const gy = this.groundY(o.x);
        const sprite = this.add.image(o.x + 40, gy - 50, 'collie').setScale(1 / RES).setDepth(3).setFlipX(true);
        this.dogs.push({ x: o.x, state: 'wait', dx: 0, until: 0, biteCool: 0, sprite });
      } else if (o.type === 'branch') {
        this.branches.push({ x: o.x, trigger: Phaser.Math.Between(560, 700), dropped: false });
      } else if (o.type === 'gulls') {
        this.gullZones.push({ x: o.x, len: o.len, next: 0 });
      } else if (o.type === 'trainrace') {
        this.trains.push({ x: o.x, endX: o.x + o.len, state: 'wait', tx: 0 });
      } else if (o.type === 'slowmo') {
        this.slowZones.push({ x: o.x, len: o.len });
      } else if (o.type === 'stampede') {
        this.stampedes.push({ x: o.x, fired: false, sheep: [], until: 0 });
      } else if (o.type === 'highline') {
        const top = this.groundY(o.x) - o.h;
        const g = this.add.graphics().setDepth(3);
        const deck = this.add.graphics().setDepth(7.5);
        for (const [a, b] of o.planks) {
          const x0 = o.x + a, x1 = o.x + b;
          // posts stand in the far lane, so the road underneath stays clear
          for (let px = x0 + 20; px < x1; px += 110) g.fillStyle(0x6b4423, 1).fillRect(px - 5, top, 10, this.groundY(px) - top);
          deck.fillStyle(0xb5835a, 1).lineStyle(3, 0x4a2f19, 1).fillRect(x0, top, x1 - x0, 14).strokeRect(x0, top, x1 - x0, 14);
          deck.lineStyle(1.5, 0x8a5f3c, 1);
          for (let px = x0 + 24; px < x1; px += 24) deck.lineBetween(px, top + 2, px, top + 12);
          const body = this.matter.add.rectangle((x0 + x1) / 2, top + 7, x1 - x0, 14, {
            isStatic: true, label: 'ground', friction: 1, frictionStatic: 10, collisionFilter: { category: 2, mask: 0, group: 0 },
          }) as Body;
          this.planks.push({ body, x0, x1, top, on: false });
        }

        for (const dx of o.yog ?? []) {
          const x = o.x + dx, y = top - 34;
          const body = this.matter.add.circle(x, y, 20, { isStatic: true, isSensor: true, label: 'pickup' }) as Body;
          const sprite = this.add.image(x, y, 'yoghurt').setScale(1 / RES).setDepth(8);
          this.tweens.add({ targets: sprite, y: y - 6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
          this.pickups.push({ body, sprite, type: 'yoghurt', taken: false });
          this.stats.yoghurtsTotal++;
        }
      } else if (o.type === 'confetti') {
        this.confettiAt.push({ x: o.x, fired: false });
      } else if (o.type === 'gust') {
        this.gusts.push({ x: o.x, len: o.len });
      } else if (o.type === 'hazard') {
        const floor = this.groundY(o.x + o.len / 2);
        const color = o.kind === 'water' ? 0x3f8fd1 : o.kind === 'mud' ? 0x5a3b1c : 0x4b4a24;
        const g = this.add.graphics().setDepth(7);
        g.fillStyle(color, 0.95).fillRect(o.x, floor - 34, o.len, 36);
        g.fillStyle(0xffffff, 0.25);
        for (let x = o.x + 15; x < o.x + o.len - 10; x += 38) g.fillEllipse(x, floor - 30, 18, 5);
        this.matter.add.rectangle(o.x + o.len / 2, floor - 16, o.len - 16, 30, { isStatic: true, isSensor: true, label: 'hazard' });
      } else if (o.type === 'overtake') {
        this.overtakes.push({ triggerX: o.triggerX, done: false });
      }
    }
  }

  /** stop tagging new objects for culling */
  endCull() { this.cullX = undefined; }

  buildPickups() {
    for (const p of this.def.pickups) {
      // cakes sit low on the road so you can jump over them
      const y = this.groundY(p.x) + (p.type === 'cake' ? -17 : -40 + (p.dy ?? 0));
      const body = this.matter.add.circle(p.x, y, p.type === 'cake' ? 14 : 20, { isStatic: true, isSensor: true, label: 'pickup' }) as Body;
      const sprite = this.add.image(p.x, y, p.type).setScale(1 / RES).setDepth(8);
      this.tweens.add({ targets: sprite, y: y - 6, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.pickups.push({ body, sprite, type: p.type, taken: false });
    }
  }

  buildCheckpoints() {
    for (const x of this.def.checkpoints.slice(1)) {
      this.cullX = x;
      const gy = this.groundY(x);
      const pole = this.add.graphics().setDepth(4);
      pole.fillStyle(0xeeeeee, 1).fillRect(x - 2, gy - 110, 4, 110);
      const flag = this.add.graphics().setDepth(4);
      flag.fillStyle(0xff8a00, 1).fillTriangle(x + 2, gy - 110, x + 2, gy - 80, x + 44, gy - 95);
      this.cpFlags.push({ x, flag, reached: false });
    }
    this.endCull();
  }

  // ---------- rider lifecycle ----------
  /** Never respawn on top of a ramp, car, trailer, log or pit: step back to clear road. */
  safeSpawnX(x: number) {
    const spans: [number, number][] = [];
    for (const o of this.def.obstacles) {
      if (o.type === 'kicker') spans.push([o.x - 70, o.x + o.len + 40]);
      else if (o.type === 'car') spans.push([o.x - 70, o.x + 260]);
      else if (o.type === 'trailer') spans.push([o.x - 70, o.x + 540]);
      else if (o.type === 'log') spans.push([o.x - 100, o.x + 70]);
      else if (o.type === 'hazard') spans.push([o.x - 90, o.x + o.len + 60]);
    }
    for (let guard = 0; guard < 10; guard++) {
      const hit = spans.find(([a, b]) => x > a && x < b);
      if (!hit) break;
      x = hit[0] - 10;
    }
    return x;
  }

  spawn(x: number) {
    x = this.safeSpawnX(x);
    this.bodyWindowAt = x; // make sure the ground is there before the bike drops onto it
    for (const s of this.sleepers ?? []) { const b = s.body as any; if (b.__gone) continue; const near = s.x1 > x - 1400 && s.x0 < x + 2400; if (near && !s.on) { this.matter.world.add(s.body); s.on = true; } else if (!near && s.on) { this.matter.world.remove(s.body); s.on = false; } }
    this.rider?.destroy();
    this.rider = new Rider(this, x, this.groundY(x) - 42);
    this.upsideDownSince = 0;
    if (this.andy && this.andy.state === 'sitting') this.andy.x = x - 90;
    if (this.lee && this.lee.state === 'riding') this.lee.x = Math.min(this.lee.x, x + 100);
  }

  crashOrRespawn(manual = false) {
    if (manual) { this.spawn(this.lastCp); this.respawnAt = 0; return; }
  }

  doCrash(reason: 'head' | 'horse' | 'flip' | 'fall') {
    if (this.rider.crashed || this.finished) return;
    // Wheelers #13 kit: the first crash each level doesn't count
    if (this.rider.kit.perk === 'lucky13' && !this.luckyUsed) {
      this.luckyUsed = true;
      const x = this.rider.position.x - (reason === 'horse' ? 220 : 40);
      this.bigText(this.rider.head.position.x, this.rider.head.position.y - 60, 'SAVED BY LUCKY #13!', '#e8ff2a');
      sfx.pickup(); sfx.buzz(40);
      this.time.delayedCall(10, () => { this.spawn(x); this.say('Thirteen. Luckiest number there is.'); });
      return;
    }
    this.rider.crash();
    this.stats.crashes++;
    stopCruise();
    sfx.buzz([60, 40, 90]);
    this.dropCombo();
    this.flung = false; this.flingFrom = 0;
    const h = this.rider.head.position;
    this.blood.explode(reason === 'fall' ? 0 : 22, h.x, h.y);
    if (reason !== 'fall') this.splat(h.x, h.y);
    this.cameras.main.shake(250, 0.012);
    sfx.crash();
    const big = this.add.text(h.x, h.y - 60, pick(['OOF!', 'CRUNCH!', 'OUCH!', 'WALLOP!']), {
      fontFamily: 'Arial Black, Arial', fontSize: '40px', color: '#ffd400', stroke: '#111', strokeThickness: 8,
    }).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: big, y: big.y - 50, alpha: 0, duration: 1200, onComplete: () => big.destroy() });
    this.time.delayedCall(700, () => this.say(pick(CRASH_LINES)));
    this.time.delayedCall(250, () => { if (this.rider.crashed && !this.flung) this.toast('TAP HOP TO FLING HIM'); });
    this.respawnAt = this.time.now + 2600;
  }

  splat(x: number, y: number) {
    const gy = this.groundY(x);
    if (Math.abs(gy - y) > 60) return;
    const g = this.add.graphics().setDepth(6);
    g.fillStyle(0xa4161a, 0.85);
    for (let i = 0; i < 6; i++) g.fillEllipse(x + Phaser.Math.Between(-24, 24), gy + 2, Phaser.Math.Between(8, 22), 5);
    this.tweens.add({ targets: g, alpha: 0, delay: 9000, duration: 2000, onComplete: () => g.destroy() });
  }

  // ---------- collisions ----------
  onCollide(e: Phaser.Physics.Matter.Events.CollisionStartEvent) {
    for (const pair of e.pairs) {
      const a = pair.bodyA as Body, b = pair.bodyB as Body;
      for (const [mine, other] of [[a, b], [b, a]] as [Body, Body][]) {
        if (!this.rider.owns(mine)) continue;
        const ol = other.label;
        if (ol === 'pickup') { this.collect(other); continue; }
        if (ol === 'cat') { this.launchCat(other); continue; }
        if (ol === 'horse') { this.hitWalker(other); continue; }
        if (ol === 'hazard') { this.splosh(); continue; }
        if (ol === 'door' && mine.label !== 'wheel' && mine.label !== 'frame') { this.bigText(mine.position.x, mine.position.y - 60, 'DOORED!'); this.doCrash('head'); continue; }
        if (ol === 'hard' && (mine.label === 'head' || mine.label === 'torso')) { this.doCrash('head'); continue; }
        if (ol === 'ground' && (mine.label === 'head' || mine.label === 'torso')) {
          this.doCrash('head');
        }
      }
    }
  }

  collect(body: Body) {
    const p = this.pickups.find((q) => q.body === body);
    if (!p || p.taken || this.rider.crashed) return;
    p.taken = true;
    (body as any).__gone = true;
    this.matter.world.remove(body);
    this.tweens.killTweensOf(p.sprite);
    if (p.type === 'cake' && this.rider.kit.perk === 'snacks') {
      // Off duty kit: cake is fuel
      this.sparks.explode(14, p.sprite.x, p.sprite.y);
      this.tweens.add({ targets: p.sprite, scale: 1, alpha: 0, duration: 300, onComplete: () => p.sprite.destroy() });
      sfx.pickup();
      this.rider.boost(2500); this.rider.stamina = Math.min(1, this.rider.stamina + 0.3);
      this.toast('CAKE BOOST! 🍰');
      this.say(pick(["Off duty. Cake's allowed.", 'Calories are just speed.', "Don't tell the Garmin.", 'Mighty fine cake, partner.']));
      return;
    }
    if (p.type === 'cake') {
      this.stats.cakesRefused++;
      sfx.bad();
      this.say(pick(CAKE_LINES));
      const B = this.matter.body;
      for (const part of this.rider.parts) B.setVelocity(part.body, { x: part.body.velocity.x * 0.55, y: part.body.velocity.y });
      B.setAngularVelocity(this.rider.rear, this.rider.rear.angularVelocity * 0.5);
      this.tweens.add({ targets: p.sprite, y: p.sprite.y - 200, x: p.sprite.x - 150, angle: -540, alpha: 0, duration: 900, onComplete: () => p.sprite.destroy() });
      return;
    }
    this.sparks.explode(14, p.sprite.x, p.sprite.y);
    this.tweens.add({ targets: p.sprite, scale: 1, alpha: 0, duration: 300, onComplete: () => p.sprite.destroy() });
    sfx.pickup();
    if (p.type === 'yoghurt') { this.stats.yoghurts++; this.toast('+1 YOGHURT'); this.addCombo(250); }
    if (p.type === 'gel') { this.rider.stamina = 1; this.toast('GEL: STAMINA FULL'); }
    if (p.type === 'coffee') { this.rider.boost(3000); this.toast('COFFEE BOOST!'); }
  }

  launchCat(body: Body) {
    const c = this.cats.find((q) => q.body === body);
    if (!c || c.hit || c.kind === 'debris') return;
    c.hit = true;
    if (c.kind === 'cat') this.stats.catsLaunched++; else this.stats.sheepLaunched++;
    const v = Math.max(4, this.rider.speed);
    this.matter.body.setVelocity(body, { x: v + 3, y: c.kind === 'sheep' ? -7 : -9 });
    this.matter.body.setAngularVelocity(body, 0.3);
    sfx.meow();
    const t = this.add.text(body.position.x, body.position.y - 40, c.kind === 'cat' ? 'MEOW!' : 'BAAA!', { fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#fff', stroke: '#111', strokeThickness: 5 }).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: t, y: t.y - 60, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
    this.time.delayedCall(900, () => this.say(c.kind === 'cat' ? 'Sorry, cat!' : 'Sorry, sheep!'));
  }

  hitWalker(body: Body) {
    const h = this.horses.find((q) => q.body === body);
    if (!h || this.rider.crashed) return;
    if (Math.abs(this.rider.speed) > 5.5) {
      if (h.who === 'horse') { this.stats.kickedByHorse = true; sfx.neigh(); }
      else { this.stats.walkersBumped++; if (h.who === 'pony') sfx.neigh(); else sfx.bad(); }
      const t = this.add.text(h.sprite.x, h.sprite.y - 90, WALKERS[h.who].hit, { fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#fff', stroke: '#111', strokeThickness: 6 }).setOrigin(0.5).setDepth(40);
      this.tweens.add({ targets: t, y: t.y - 50, alpha: 0, duration: 1300, onComplete: () => t.destroy() });
      this.doCrash('horse');
      for (const part of this.rider.parts) this.matter.body.setVelocity(part.body, { x: -9, y: -11 });
    }
  }

  splosh() {
    if (this.rider.crashed) return;
    const h = this.rider.position;
    const t = this.add.text(h.x, h.y - 80, 'SPLOSH!', { fontFamily: 'Arial Black, Arial', fontSize: '40px', color: '#c7a26b', stroke: '#111', strokeThickness: 8 }).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: t, y: t.y - 50, alpha: 0, duration: 1200, onComplete: () => t.destroy() });
    this.doCrash('fall');
  }

  // ---------- speech & toasts ----------
  say(text: string, ms = 2400) {
    if (this.finished) return;
    this.bubble?.destroy();
    this.bubble = this.add.text(0, 0, text, {
      fontFamily: 'Trebuchet MS, Arial', fontSize: '17px', fontStyle: 'bold', color: '#111',
      backgroundColor: '#ffffff', padding: { x: 10, y: 6 }, wordWrap: { width: 260 },
    }).setOrigin(0.3, 1).setDepth(45);
    this.bubbleUntil = this.time.now + ms;
  }

  toast(text: string) {
    const cam = this.cameras.main;
    const t = this.add.text(cam.width / 2, 120, text, { fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#fff', stroke: '#1d2b4f', strokeThickness: 7 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(50);
    this.tweens.add({ targets: t, y: 90, alpha: 0, delay: 500, duration: 700, onComplete: () => t.destroy() });
  }

  banner(title: string, sub: string) {
    const cam = this.cameras.main;
    const c = this.add.container(cam.width / 2, cam.height * 0.36).setScrollFactor(0).setDepth(60);
    const t1 = this.add.text(0, 0, title, { fontFamily: 'Arial Black, Arial', fontSize: '44px', color: '#ffd400', stroke: '#111', strokeThickness: 9 }).setOrigin(0.5);
    const t2 = this.add.text(0, 50, sub, { fontFamily: 'Trebuchet MS, Arial', fontStyle: 'bold', fontSize: '22px', color: '#fff', stroke: '#111', strokeThickness: 5 }).setOrigin(0.5);
    c.add([t1, t2]);
    c.setScale(0.2);
    this.tweens.add({ targets: c, scale: 1, duration: 450, ease: 'Back.out' });
    this.tweens.add({ targets: c, alpha: 0, delay: 2300, duration: 500, onComplete: () => c.destroy() });
  }

  // ---------- Garmin ----------
  showGarmin() {
    this.garminShows++;
    const champ = this.rider.kit.perk === 'champion';
    const [t, m] = champ ? pick(CHAMP_MSGS) : this.def.garminGivesUp && this.garminShows >= 4 ? ['GARMIN', 'FINE. DO WHAT YOU WANT.'] : pick(GARMIN_MSGS);
    if (this.def.garminGivesUp && this.garminShows >= 4) {
      this.garminDone = true;
      this.time.delayedCall(900, () => this.say('Finally. Some peace.'));
    }
    hud.garmin(t, m);
    sfx.beep();
    this.garminShownAt = this.time.now;
  }

  swatGarmin() {
    if (!hud.garminVisible() || this.paused) return;
    hud.hideGarmin();
    this.stats.garminIgnored++;
    this.rider.boost(1500);
    this.say(pick(GARMIN_REPLIES), 1600);
    this.garminNext = this.time.now + Phaser.Math.Between(8000, 13000);
  }

  togglePause() {
    if (this.finished) return;
    this.paused = !this.paused;
    if (this.paused) {
      this.matter.world.pause();
      this.tweens.pauseAll();
      const cam = this.cameras.main;
      const c = this.add.container(cam.width / 2, cam.height / 2).setScrollFactor(0).setDepth(100).setName('pause');
      const bg = this.add.rectangle(0, 0, cam.width, cam.height, 0x000000, 0.55);
      const t = this.add.text(0, -60, 'PAUSED', { fontFamily: 'Arial Black, Arial', fontSize: '52px', color: '#ffd400', stroke: '#111', strokeThickness: 8 }).setOrigin(0.5);
      const resume = this.button(0, 30, 'RESUME', () => this.togglePause());
      const quit = this.button(0, 110, 'MENU', () => { this.paused = false; this.scene.start('Menu'); });
      c.add([bg, t, resume, quit]);
      // children of a fixed container still need their own scroll factor for taps to land
      for (const o of [bg, t, resume, quit]) o.setScrollFactor(0);
    } else {
      this.matter.world.resume();
      this.tweens.resumeAll();
      this.children.getByName('pause')?.destroy();
    }
  }

  button(x: number, y: number, label: string, fn: () => void) {
    const t = this.add.text(x, y, label, { fontFamily: 'Arial Black, Arial', fontSize: '28px', color: '#fff', backgroundColor: '#e63946', padding: { x: 26, y: 10 } })
      .setOrigin(0.5).setInteractive({ useHandCursor: true });
    t.on('pointerdown', fn);
    return t;
  }

  // ---------- main loop ----------
  update(_t: number, dt: number) {
    if (this.paused) return;
    const now = this.time.now;
    const r = this.rider;
    r.sync();

    const pos = r.crashed ? r.head.position : r.position;
    this.camTarget.setPosition(pos.x, pos.y);
    // camera looks further ahead and pulls back a touch as you speed up
    const spd = r.crashed ? 0 : Phaser.Math.Clamp(r.speed, 0, 13);
    this.camOff += (-220 - spd * 20 - this.camOff) * 0.05;
    this.camZoom += (1 - Math.max(0, spd - 6) * 0.018 - this.camZoom) * 0.04;
    this.speedLines.emitting = spd > 10.5 && !this.inGust;
    this.speedLines.setAlpha(Phaser.Math.Clamp((spd - 10.5) / 3, 0, 0.7));
    this.cameras.main.setFollowOffset(this.camOff, 70).setZoom(this.camZoom);
    this.updateHazards(now, dt);
    // kit perks with something to see every frame
    if (!r.crashed && !this.finished) {
      if (r.kit.perk === 'champion' && r.speed > 5 && this.game.loop.frame % 4 === 0) this.sparks.explode(2, r.rear.position.x, r.rear.position.y);
      if (r.kit.perk === 'snacks') {
        // yoghurts (and gels/coffee) drift towards Will
        for (const p of this.pickups) {
          if (p.taken || p.type === 'cake') continue;
          const dx = r.position.x - p.sprite.x, dy = r.position.y - 30 - p.sprite.y, d = Math.hypot(dx, dy);
          if (d < 190 && d > 5) {
            const k = Math.min(1, 9 / d) * (dt / 16.67);
            this.tweens.killTweensOf(p.sprite);
            p.sprite.x += dx * k; p.sprite.y += dy * k;
            this.matter.body.setPosition(p.body, { x: p.sprite.x, y: p.sprite.y });
          }
        }
      }
    }
    // slow phone? drop the busiest scenery (crowds, hedge blobs, trees) and extra particles
    if (!this.lowDetail && now - this.startTime > 4000 && this.game.loop.actualFps < 42) {
      this.lowDetail = true;
      this.speedLines.setFrequency(90);
      this.wind.setFrequency(120);
    }
    this.updateBaked();
    // scenery pieces: only draw the ones near the screen
    {
      const v = this.cameras.main.worldView;
      for (const c of this.culled) c.o.setVisible(c.x + 1300 > v.x && c.x - 900 < v.right);
    }
    // background layers: draw only the chunks in view (in each layer's own parallax coordinates)
    const cam = this.cameras.main, vw = cam.width / cam.zoom;
    for (const b of this.backChunks) {
      const l = cam.scrollX * b.f - vw * 0.2;
      b.g.setVisible(b.x1 > l && b.x0 < l + vw * 1.4);
    }

    if (!this.finished) {
      this.elapsed = now - this.startTime;
      hud.set(this.elapsed, this.distText(r.position.x), this.stats.yoghurts, r.stamina, r.crashed ? 0 : Math.max(0, r.speed * 4));
    }

    // bubble follows the head
    if (this.bubble) {
      const h = r.head.position;
      this.bubble.setPosition(h.x - 10, h.y - 26);
      if (now > this.bubbleUntil) { this.bubble.destroy(); this.bubble = undefined; }
    }

    // sprite sync for cats
    for (const c of this.cats) c.sprite.setPosition(c.body.position.x, c.body.position.y).setRotation(c.body.angle);

    // horses & walkers: walk until the rider eases off behind them, or they reach their exit
    for (const h of this.horses) {
      if (h.gone) continue;
      const w = WALKERS[h.who];
      const gap = h.body.position.x - r.position.x;
      if (gap < 700 && gap > -50) h.label.setAlpha(1);
      // cleared it in the air without touching? huge style points
      const hx = h.body.position.x;
      if (this.airborne && !r.crashed && Math.abs(r.position.x - hx) < w.w / 2 + 40) (h as any).over = true;
      if (!(h as any).hurdled && (h as any).over && !r.crashed && r.position.x - 70 > hx + w.w / 2) {
        (h as any).hurdled = true;
        const pts = h.who === 'horse' ? 1200 : 800;
        this.stats.trickPoints += pts;
        this.trickToast(`HURDLED THE ${h.who === 'dogwalker' ? 'DOG WALKER' : h.who.toUpperCase()}!  +${pts}`);
        this.addCombo(pts);
        sfx.buzz(40);
        this.time.delayedCall(500, () => this.say(h.who === 'horse' ? 'Sorry! Sorry! Lovely horse!' : 'Morning! Sorry!'));
      }
      if (gap > 0 && gap < 450 && Math.abs(r.speed) < 5 && !r.crashed) h.wait += dt; else h.wait = Math.max(0, h.wait - dt * 0.3);
      if (gap < 900) {
        const nx = h.body.position.x + w.speed * (dt / 16.67);
        const gy = this.groundY(nx);
        this.matter.body.setPosition(h.body, { x: nx, y: gy - w.h / 2 });
        h.sprite.setPosition(nx, gy - w.texH / 2 + Math.sin(now * 0.012) * 1.5);
        h.label.setPosition(nx, gy - w.texH - 20);
      }
      if (h.wait > 700 || h.body.position.x >= h.exitX) {
        h.gone = true;
        const polite = h.wait > 700;
        if (polite) {
          if (h.who === 'horse') this.stats.courteous = true; else this.stats.politePasses++;
          this.addCombo(200);
          this.toast('COURTEOUS RIDER +1');
        }
        (h.body as any).__gone = true;
        this.matter.world.remove(h.body);
        h.label.setText(polite ? w.thanks : 'Hmph.');
        this.tweens.add({ targets: [h.sprite, h.label], y: '-=40', alpha: 0, scale: '*=0.8', duration: 1400, delay: 500 });
        if (polite) this.time.delayedCall(800, () => this.say('No worries! Right, where was I...'));
      }
    }

    // headwinds
    const gusting = !r.crashed && this.gusts.some((g) => r.position.x > g.x && r.position.x < g.x + g.len);
    if (gusting !== this.inGust) {
      this.inGust = gusting;
      this.wind.emitting = gusting;
      if (gusting) { this.toast('HEADWIND!'); this.time.delayedCall(600, () => this.say('Headwind? Free resistance training.')); }
    }

    // moving scenery (trains)
    for (const m of this.movers) {
      m.img.x += m.v * (dt / 16.67);
      if (m.img.x < m.x0) m.img.x = m.x1;
      m.img.y = this.groundY(m.img.x) - 100;
    }

    if (this.lee) this.followBubble(this.lee, now);
    if (this.andy) this.followBubble(this.andy, now);

    // overtaking car
    for (const o of this.overtakes) {
      if (!o.done && r.position.x > o.triggerX && !r.crashed) {
        o.done = true;
        const gy = this.groundY(r.position.x);
        this.passingCar = this.add.image(r.position.x - 900, gy + 8, 'van').setScale(1 / RES).setOrigin(0.5, 1).setDepth(28);
        sfx.horn();
        this.time.delayedCall(1500, () => this.say('Plenty of room there, mate.'));
      }
    }
    if (this.passingCar) {
      const c = this.passingCar;
      c.x += (Math.max(r.speed, 0) + 9) * (dt / 16.67);
      c.y = this.groundY(c.x) + 30;
      c.setRotation(Math.atan2(this.groundY(c.x + 60) - this.groundY(c.x - 60), 120));
      if (c.x > r.position.x + 1600) { c.destroy(); this.passingCar = undefined; }
    }

    // checkpoints
    for (const cp of this.cpFlags) {
      if (!cp.reached && r.position.x > cp.x && !r.crashed) {
        cp.reached = true; this.lastCp = cp.x;
        cp.flag.clear();
        const gy = this.groundY(cp.x);
        cp.flag.fillStyle(0x2ecc40, 1).fillTriangle(cp.x + 2, gy - 110, cp.x + 2, gy - 80, cp.x + 44, gy - 95);
        this.toast('CHECKPOINT');
      }
    }

    // Garmin nags
    if (!this.finished && !r.crashed) {
      if (!hud.garminVisible() && now > this.garminNext && !this.garminDone) this.showGarmin();
      if (hud.garminVisible() && now - this.garminShownAt > 6000) {
        hud.hideGarmin();
        this.garminNext = now + Phaser.Math.Between(6000, 10000);
      }
    }

    // flipped / fell off the world
    if (!r.crashed && !this.finished) {
      const a = Phaser.Math.Angle.Wrap(r.frame.angle);
      if (Math.abs(a) > 2.0 && Math.abs(r.speed) < 1.5) {
        this.upsideDownSince ||= now;
        if (now - this.upsideDownSince > 1200) this.doCrash('flip');
      } else this.upsideDownSince = 0;
      if (r.position.y > this.groundY(r.position.x) + 500) this.doCrash('fall');
    }

    if (this.respawnAt && now > this.respawnAt && !this.finished) {
      this.respawnAt = 0;
      this.spawn(this.lastCp);
    }

    // finish
    if (!this.finished && !r.crashed && r.position.x > this.def.finishX) {
      if (this.andy) this.stats.boss = 'won';
      this.finish();
    }
  }

  // ---------- cast: Lee + Andy ----------
  distText(x: number) {
    const start = this.def.checkpoints[0];
    if (this.def.laps) {
      const lap = Math.max(1, this.def.laps.filter((lx) => x >= lx).length);
      return `LAP ${lap} / ${this.def.laps.length}`;
    }
    if (this.def.miles) {
      const f = Phaser.Math.Clamp((x - start) / (this.def.finishX - start), 0, 1);
      return `${(f * this.def.miles).toFixed(1)} / ${this.def.miles} mi`;
    }
    return `${Math.max(0, Math.round((x - start) / 10))} m`;
  }

  buildCast() {
    const L = this.def.lee;
    if (L) {
      for (const bx of L.bollards) {
        this.cullX = bx;
        const gy = this.groundY(bx) - 12;
        const g = this.add.graphics().setDepth(8.5);
        g.fillStyle(0x111111, 1).fillRoundedRect(bx - 8, gy - 48, 16, 50, 5);
        g.fillStyle(0xffffff, 1).fillRect(bx - 8, gy - 40, 16, 7).fillRect(bx - 8, gy - 26, 16, 7);
      }
      this.endCull();
      const npc = new NpcRider(this, LEE_LOOK, 9, 0.92);
      npc.c.setVisible(false);
      this.lee = { npc, state: 'off', x: 0, hit: new Set(), downUntil: 0, bubbleUntil: 0 };
    }
    if (this.def.bunch) {
      const offs = [-300, 200, 420];
      RIVAL_LOOKS.forEach((look, i) => {
        const npc = new NpcRider(this, look, 8.8, 0.9);
        const x = this.def.checkpoints[0] + offs[i] * 0.4;
        npc.place(x, (xx) => this.groundY(xx), -16);
        this.rivals.push({ npc, x, off: offs[i], phase: i * 2, state: 'riding' });
      });
    }
    if (this.def.boss) {
      const npc = new NpcRider(this, ANDY_LOOK, 9, 0.95);
      const x = this.def.checkpoints[0] - 90;
      npc.place(x, (xx) => this.groundY(xx), -10);
      this.andy = { npc, state: 'sitting', x, v: 0, nextTaunt: this.time.now + 5000, bubbleUntil: 0 };
      this.time.delayedCall(3200, () => this.npcSay(this.andy!, "Let's see what you've got, son."));
      const fx = this.def.finishX;
      this.add.text(fx + 20, this.groundY(fx) - 290, 'BEAT ANDY', { fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#fff', stroke: '#d7262e', strokeThickness: 6 }).setOrigin(0.5).setDepth(26);
    }
  }

  npcSay(who: { npc: NpcRider; bubble?: Phaser.GameObjects.Text; bubbleUntil: number }, text: string, ms = 2300) {
    if (this.finished) return;
    who.bubble?.destroy();
    who.bubble = this.add.text(0, 0, text, {
      fontFamily: 'Trebuchet MS, Arial', fontSize: '16px', fontStyle: 'bold', color: '#111',
      backgroundColor: '#ffe9a8', padding: { x: 9, y: 5 }, wordWrap: { width: 240 },
    }).setOrigin(0.5, 1).setDepth(44);
    who.bubbleUntil = this.time.now + ms;
  }

  private followBubble(who: { npc: NpcRider; bubble?: Phaser.GameObjects.Text; bubbleUntil: number }, now: number) {
    if (!who.bubble) return;
    who.bubble.setPosition(who.npc.c.x + 20, who.npc.c.y - 75);
    if (now > who.bubbleUntil) { who.bubble.destroy(); who.bubble = undefined; }
  }

  updateLee(now: number, dt: number) {
    const lee = this.lee, L = this.def.lee;
    if (!lee || !L) return;
    const r = this.rider, f = dt / 16.67, gy = (x: number) => this.groundY(x);
    if (lee.state === 'off') {
      if (r.position.x > L.joinX && !r.crashed) {
        lee.state = 'riding';
        lee.x = r.position.x - 450;
        lee.npc.c.setVisible(true);
        this.npcSay(lee, pick(LEE_JOIN));
      }
      return;
    }
    if (lee.state === 'gone') return;
    if (lee.state === 'riding') {
      const target = r.crashed ? lee.x : r.position.x + 150;
      const v = Phaser.Math.Clamp((target - lee.x) * 0.06, -3, Math.max(4, r.speed + 5));
      lee.x += v * f;
      // bollards
      for (const bx of L.bollards) {
        if (!lee.hit.has(bx) && lee.x + 75 >= bx) {
          lee.hit.add(bx);
          lee.state = 'down';
          lee.downUntil = now + 1500;
          lee.x = bx - 75;
          this.stats.bollards++;
          sfx.crash();
          const t = this.add.text(bx, gy(bx) - 110, 'CLANG!', { fontFamily: 'Arial Black, Arial', fontSize: '30px', color: '#fff', stroke: '#111', strokeThickness: 6 }).setOrigin(0.5).setDepth(40);
          this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
          this.tweens.add({ targets: lee.npc.c, angle: '+=320', y: '-=50', duration: 450, yoyo: true, ease: 'Quad.out' });
          this.toast(`LEE'S BOLLARDS: ${this.stats.bollards}`);
          this.time.delayedCall(500, () => this.npcSay(lee, pick(LEE_CRASH)));
          break;
        }
      }
      if (r.position.x > L.leaveX) {
        lee.state = 'gone';
        this.npcSay(lee, pick(LEE_LEAVE));
        this.tweens.add({ targets: lee.npc.c, alpha: 0, delay: 1800, duration: 800 });
      }
    } else if (lee.state === 'down' && now > lee.downUntil) {
      lee.state = 'riding';
    }
    if (lee.state !== 'down') lee.npc.place(lee.x, gy, -10);
  }

  updateAndy(now: number, dt: number) {
    const a = this.andy, B = this.def.boss;
    if (!a || !B || a.state === 'done') return;
    const r = this.rider, f = dt / 16.67;
    if (a.state === 'sitting') {
      const target = r.position.x - 85;
      const v = Phaser.Math.Clamp((target - a.x) * 0.12, -6, 15);
      a.x += v * f;
      if (now > a.nextTaunt && !r.crashed) { this.npcSay(a, pick(ANDY_TAUNTS)); a.nextTaunt = now + Phaser.Math.Between(6000, 9000); }
      if (r.position.x > B.sprintX && !r.crashed) {
        a.state = 'sprint';
        a.v = Math.max(r.speed, 7) + 1.2;
        this.toast('ANDY ATTACKS! SPRINT!');
        this.npcSay(a, 'See ya, son!');
      }
    } else if (a.state === 'sprint') {
      // builds up to just under Will's full sprint speed
      a.v = Math.min(12.9, a.v + 0.04 * f);
      a.x += a.v * f;
      if (a.x > this.def.finishX && !this.finished) {
        a.state = 'done';
        this.stats.boss = 'lost';
        this.npcSay(a, 'Tactical.');
        this.finish(true);
      }
    }
    a.npc.place(a.x, (x) => this.groundY(x), -10);
  }

  updateBunch(now: number) {
    const B = this.def.bunch;
    if (!B || !this.rivals.length) return;
    const r = this.rider, finalKm = this.def.boss ? r.position.x > this.def.boss.sprintX - 600 : false;
    let downCount = this.rivals.filter((q) => q.state === 'down').length;
    for (const q of this.rivals) {
      if (q.state === 'down') continue;
      // ride around Will, drifting through the bunch; they fade in the final kilometre
      const target = r.position.x + q.off + 120 * Math.sin(now * 0.0004 + q.phase) - (finalKm ? 900 : 0);
      const v = Phaser.Math.Clamp((target - q.x) * 0.04, 2.5, finalKm ? 9.5 : Math.max(10.5, r.speed + 3));
      q.x += v;
      if (downCount < 2 && q.x > B.pileX - 60 && q.x < B.pileX + 40) {
        q.state = 'down'; downCount++;
        sfx.crash();
        const gy = this.groundY(q.x);
        const t = this.add.text(q.x, gy - 120, 'CRASH IN THE BUNCH!', { fontFamily: 'Arial Black, Arial', fontSize: '20px', color: '#fff', stroke: '#111', strokeThickness: 6 }).setOrigin(0.5).setDepth(40);
        this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, duration: 1600, onComplete: () => t.destroy() });
        this.tweens.add({ targets: q.npc.c, angle: 160, y: gy - 55, duration: 500, ease: 'Bounce.out' });
        continue;
      }
      q.npc.place(q.x, (x) => this.groundY(x), -16);
    }
    // lap announcements
    const laps = this.def.laps;
    if (laps) {
      const lap = laps.filter((lx) => r.position.x >= lx).length;
      if (lap > this.lapShown) {
        this.lapShown = lap;
        this.toast(lap === laps.length ? 'BELL LAP! 🔔' : `LAP ${lap}`);
        if (lap === laps.length) { sfx.beep(); this.time.delayedCall(700, () => this.say('Last lap. Legs are fine. Legs are always fine.')); }
      }
    }
  }

  bigText(x: number, y: number, text: string, color = '#ffd400') {
    const t = this.add.text(x, y, text, { fontFamily: 'Arial Black, Arial', fontSize: '36px', color, stroke: '#111', strokeThickness: 8 }).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: t, y: y - 50, alpha: 0, duration: 1200, onComplete: () => t.destroy() });
  }

  /** Runs every physics step: detects flips, big air, wheelies and clean landings. */
  stepTricks() {
    const R = this.rider;
    if (!R || R.crashed || this.finished) { this.airborne = false; this.pendingTrick = undefined; return; }
    const step = R.stepCount;
    if (this.pendingTrick && step >= this.pendingTrick.at) {
      const t = this.pendingTrick; this.pendingTrick = undefined;
      this.stats.trickPoints += t.pts;
      this.trickToast(`${t.label}  +${t.pts}`);
      this.addCombo(t.pts);
      sfx.buzz(25);
    }
    const air = !R.wheelsDown();
    const ahead = R.position.x + Math.max(0, R.speed) * 8;
    R.landSlope = Math.atan2(this.groundY(ahead + 40) - this.groundY(ahead - 40), 80);
    R.airSpin = this.airborne ? this.airRot : 0;
    // first touch after a real jump: rescue a sketchy landing
    if (this.airborne && !air && this.groundSteps === 0 && step - this.airStart > 25) {
      const off = Math.abs(Phaser.Math.Angle.Wrap(R.frame.angle - R.landSlope));
      if (off > 0.3 && off < 0.85) { R.rescueSteps = 14; this.trickToast('SAVED IT!'); sfx.buzz(30); }
    }
    this.stepCombo(R);
    if (this.airborne) {
      // keep counting rotation through brief touches (e.g. clipping a ramp lip)
      this.airRot += Phaser.Math.Angle.Wrap(R.frame.angle - this.lastAngle);
      this.lastAngle = R.frame.angle;
    }
    if (air) {
      this.groundSteps = 0;
      if (!this.airborne) { this.airborne = true; this.airStart = step; this.airRot = 0; this.lastAngle = R.frame.angle; }
    } else if (this.airborne && ++this.groundSteps >= 8) {
      this.airborne = false;
      const airSteps = step - this.airStart - 8;
      const flips = Math.floor((Math.abs(this.airRot) + 1.2) / (Math.PI * 2));
      const parts: string[] = []; let pts = 0;
      if (flips > 0) {
        const name = this.airRot < 0 ? 'BACKFLIP' : 'FRONTFLIP';
        parts.push(flips === 1 ? name : flips === 2 ? `DOUBLE ${name}` : `${flips}x ${name}`);
        pts += 600 * flips * flips;
        this.stats.flips += flips;
      }
      if (airSteps > 55) { parts.push('BIG AIR'); pts += Math.round(airSteps * 4); }
      const slope = Math.atan2(this.groundY(R.position.x + 40) - this.groundY(R.position.x - 40), 80);
      if (airSteps > 30 && Math.abs(Phaser.Math.Angle.Wrap(R.frame.angle - slope)) < 0.3) {
        parts.push('CLEAN LANDING'); pts += 100;
        R.boost(800);
      }
      // only paid out if he's still upright a moment later
      if (pts > 0) this.pendingTrick = { at: step + 25, pts, label: parts.join(' + ') };
    }
    // wheelies
    if (R.rearOn() && !R.frontOn() && R.frame.angle < -0.25) this.wheelieSteps++;
    else {
      if (this.wheelieSteps > 70) {
        const pts = Math.round(this.wheelieSteps * 3);
        this.stats.trickPoints += pts;
        this.trickToast(`WHEELIE ${(this.wheelieSteps / 60).toFixed(1)}s  +${pts}`);
      }
      this.wheelieSteps = 0;
    }
  }

  trickToast(text: string) {
    sfx.pickup();
    const cam = this.cameras.main;
    const t = this.add.text(cam.width / 2, cam.height * 0.24, text, {
      fontFamily: 'Arial Black, Arial', fontSize: '34px', color: '#7CFC8A', stroke: '#111', strokeThickness: 8,
    }).setOrigin(0.5).setScrollFactor(0).setDepth(55).setScale(0.3);
    this.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.out' });
    this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, delay: 900, duration: 500, onComplete: () => t.destroy() });
  }

  /** Movement for chasers, once per physics step (fair on slow devices). */
  stepHazards() {
    const r = this.rider;
    if (!r) return;
    for (const d of this.dogs) if (d.state === 'chase') d.dx += 7.6; // slower than pedalling: keep moving and you escape
    for (const g of this.gulls) if (!g.done && g.sprite.active) g.sprite.x -= 7;
  }

  updateHazards(now: number, dt: number) {
    const r = this.rider, rx = r.position.x, gy = (x: number) => this.groundY(x), f = dt / 16.67;
    // car doors: hazard lights blink as you approach, then the door swings out
    for (const d of this.doors) {
      const gap = d.x - rx;
      d.lights.clear();
      if (d.state === 'shut' && gap < 1300 && gap > 0 && Math.floor(now / 250) % 2) {
        d.lights.fillStyle(0xffa500, 1).fillCircle(d.x - 6, gy(d.x) - 40, 6).fillCircle(d.x - 196, gy(d.x) - 40, 6);
      }
      if (d.state === 'open' && this.physSteps > d.shutAt!) {
        if (d.body) this.matter.world.remove(d.body);
        d.body = undefined; d.state = 'done';
        if (!r.crashed && rx > d.x + 40) this.addCombo(300, 'DOOR DODGED');
        this.tweens.add({ targets: d.door, scaleX: 0.15, x: d.x, duration: 220 });
      }
      if (d.state === 'shut' && gap < d.trigger && gap > 0 && !r.crashed) {
        d.state = 'open';
        sfx.bad();
        this.tweens.add({ targets: d.door, scaleX: 3.5, x: d.x + 14, duration: 180 });
        // low enough to hop over
        d.body = this.matter.add.rectangle(d.x + 18, gy(d.x) - 22, 26, 30, { isStatic: true, label: 'door', chamfer: { radius: 6 } }) as Body;
        d.shutAt = this.physSteps + 60;
        if (d.practice) this.toast('CAR DOORS OPEN! HOP THEM OR BRAKE');
        else this.time.delayedCall(150, () => this.say('DOOR! Hop it!'));
      }
    }
    // rolling bales/boulders: keep coming while you're near
    for (const ro of this.rollers) {
      if (rx > ro.x - 1500 && rx < ro.x - 380 && now > ro.next && !r.crashed) {
        ro.next = now + Phaser.Math.Between(3200, 4600);
        const R = 22;
        const body = this.matter.add.circle(ro.x, gy(ro.x) - R - 4, R, { label: 'hard', density: ro.kind === 'boulder' ? 0.006 : 0.003, friction: 0.5, restitution: 0.25 }) as Body;
        this.matter.body.setVelocity(body, { x: -3.5, y: 0 });
        const sprite = this.add.image(ro.x, gy(ro.x) - R, ro.kind).setScale(0.82 / RES).setDepth(12);
        ro.live.push({ body, sprite, born: now });
      }
      ro.live = ro.live.filter((l) => {
        if (!(l as any).dodged && !r.crashed && l.body.position.x < rx - 40) { (l as any).dodged = true; this.addCombo(150, ro.kind === 'bale' ? 'BALE DODGED' : 'BOULDER DODGED'); }
        l.sprite.setPosition(l.body.position.x, l.body.position.y).setRotation(l.body.angle);
        // once it's stopped rolling it crumbles away, so nothing can pin you in place
        const stuck = now - l.born > 1500 && Math.hypot(l.body.velocity.x, l.body.velocity.y) < 0.8;
        if (stuck || now - l.born > 14000 || l.body.position.x < rx - 1200 || l.body.position.y > gy(l.body.position.x) + 300) {
          if (stuck) this.sparks.explode(10, l.body.position.x, l.body.position.y);
          this.matter.world.remove(l.body); l.sprite.destroy(); return false;
        }
        return true;
      });
    }
    // dogs: burst out of a gate and chase
    for (const d of this.dogs) {
      if (d.state === 'wait') {
        if (rx > d.x && !r.crashed && r.speed > 3) {
          d.state = 'chase'; d.dx = rx - 360; d.until = this.physSteps + 230;
          d.sprite.setFlipX(false).setDepth(12);
          this.bigText(rx - 200, gy(rx) - 120, 'WOOF!', '#fff');
          this.time.delayedCall(400, () => this.say('DOG! Sprint!'));
        }
        continue;
      }
      if (d.state === 'done') continue;
      // (d.dx advances in stepHazards, on the physics clock)
      d.sprite.setPosition(d.dx, gy(d.dx) - 10 + Math.abs(Math.sin(now * 0.03)) * -6);
      if (!r.crashed && d.dx > rx - 60 && this.physSteps > d.biteCool) {
        d.biteCool = this.physSteps + 90;
        d.bitten = (d.bitten ?? 0) + 1;
        this.stats.bites++;
        r.stamina = Math.max(0, r.stamina - 0.25);
        for (const part of r.parts) this.matter.body.setVelocity(part.body, { x: part.body.velocity.x * 0.88, y: part.body.velocity.y });
        sfx.meow();
        this.bigText(rx - 40, gy(rx) - 130, 'NIPPED!', '#ff6b6b');
        sfx.buzz(50);
        d.dx -= 260;
        d.until = 0; // one nip and it's happy
      }
      if (this.physSteps > d.until || r.crashed) {
        d.state = 'done';
        this.tweens.add({ targets: d.sprite, alpha: 0, duration: 800 });
        if (!r.crashed && !d.bitten) { this.time.delayedCall(200, () => this.say('Ha! Outsprinted a collie.')); this.addCombo(300, 'DOG ESCAPED'); }
      }
    }
    // branches drop as you approach
    for (const b of this.branches) {
      if (!b.dropped && rx > b.x - b.trigger && !r.crashed) {
        b.dropped = true;
        const top = gy(b.x) - 250;
        this.bigText(b.x, top + 40, 'CREAK!', '#fff');
        const body = this.matter.add.rectangle(b.x, top, 108, 14, { label: 'hard', density: 0.002, friction: 0.8, angle: 0.2 }) as Body;
        const sprite = this.add.image(b.x, top, 'branch').setScale(1 / RES).setDepth(12);
        this.props.push({ body, sprite });
      }
    }
    for (const p of this.props) p.sprite.setPosition(p.body.position.x, p.body.position.y).setRotation(p.body.angle);
    // seagulls swoop at head height
    for (const z of this.gullZones) {
      if (rx > z.x && rx < z.x + z.len && z.next === 0 && !r.crashed) {
        z.next = 1; // one gull per zone
        this.toast('SEAGULL INCOMING! 🐦');
        const x = rx + 900, y0 = gy(x) - 100;
        this.gulls.push({ sprite: this.add.image(x, y0, 'gull').setScale(1 / RES).setDepth(20), y0, done: false });
        this.time.delayedCall(200, () => this.say('Seagull! Hop or duck!', 1400));
      }
    }
    this.gulls = this.gulls.filter((g) => {
      const s = g.sprite;
      if (!g.done) {
        s.y = this.groundY(s.x) - 100 + Math.sin(s.x * 0.02) * 14;
        const h = r.head.position;
        if (!r.crashed && Math.hypot(h.x - s.x, h.y - s.y) < 34) {
          g.done = true;
          if (this.stats.yoghurts > 0) { this.stats.yoghurts--; this.stats.stolen++; this.bigText(s.x, s.y - 30, 'SQUAWK! YOGHURT NICKED!', '#fff'); }
          else this.bigText(s.x, s.y - 30, 'SQUAWK!', '#fff');
          sfx.bad();
          this.tweens.add({ targets: s, y: s.y - 400, x: s.x - 200, duration: 1200, onComplete: () => s.destroy() });
        }
      }
      if (!g.done && !(g as any).dodged && s.x < rx - 60 && !r.crashed) { (g as any).dodged = true; this.addCombo(150, 'GULL DODGED'); }
      if (s.x < rx - 900) { s.destroy(); return false; }
      return !g.done || s.active;
    });
  }

  /** Walkways are one-way: solid only when the bike is above them, so you can ride underneath. */
  stepPlanks() {
    const R = this.rider;
    if (!R || !this.planks.length) return;
    const bottom = Math.max(R.rear.position.y, R.front.position.y) + 22;
    const x = R.position.x;
    for (const p of this.planks) {
      const near = x > p.x0 - 80 && x < p.x1 + 80;
      const on = near && !R.crashed && bottom <= p.top + 10;
      if (on !== p.on) { p.on = on; p.body.collisionFilter.mask = on ? 0xffffffff : 0; }
    }
  }

  /** Add bodies near the rider to the physics world and take far ones out (checked every few steps). */
  updateBodyWindow(force = false) {
    const R = this.rider;
    if (!R) return;
    const x = R.crashed ? R.head.position.x : R.position.x;
    if (!force && Math.abs(x - this.bodyWindowAt) < 250) return;
    this.bodyWindowAt = x;
    const lo = x - 1400, hi = x + 2400;
    const world = this.matter.world;
    for (const s of this.sleepers) {
      const b = s.body as any;
      if (b.__gone) continue;
      if (!b.isStatic) { s.x0 = b.bounds.min.x; s.x1 = b.bounds.max.x; } // critters may have moved
      const near = s.x1 > lo && s.x0 < hi;
      if (near && !s.on) { world.add(s.body); s.on = true; }
      else if (!near && s.on) { world.remove(s.body); s.on = false; }
    }
  }

  // ---------- scenery baking ----------
  // Scenery is drawn with Graphics (lots of shapes). Rebuilding those every frame is slow on phones,
  // so each stretch near the camera is drawn once into a texture and reused; far ones are released.
  groupChunks() {
    const t = this.def.terrain;
    const groups = new Map<string, (typeof this.baked)[number]>();
    for (const c of this.chunks) {
      c.g.setVisible(false);
      const front = c.g.depth >= 5;
      const key = `${Math.round(c.x0)}:${front ? 'f' : 'b'}`;
      let gr = groups.get(key);
      if (!gr) {
        const ys = t.filter((p) => p.x >= c.x0 - 40 && p.x <= c.x1 + 40).map((p) => p.y);
        const minY = Math.min(...ys), maxY = Math.max(...ys);
        gr = front
          ? { x0: c.x0, x1: c.x1, top: Math.floor(minY - 8), bot: Math.ceil(maxY + 48), depth: 5, gs: [] }
          : { x0: c.x0, x1: c.x1, top: Math.floor(minY - 400), bot: Math.ceil(maxY + 12), depth: 2, gs: [] };
        groups.set(key, gr);
      }
      gr.gs.push(c.g);
    }
    this.baked = [...groups.values()];
    for (const b of this.baked) b.gs.sort((a, c) => a.depth - c.depth);
    const hOf = (d: number) => Math.min(1800, Math.max(...this.baked.filter((b) => b.depth === d).map((b) => b.bot - b.top), 50));
    this.bakeH = { back: Math.ceil(hOf(2)), front: Math.ceil(hOf(5)) };
  }

  updateBaked() {
    const view = this.cameras.main.worldView;
    if (NO_BAKE) {
      for (const b of this.baked) { const v = b.x1 > view.x - 200 && b.x0 < view.right + 200; for (const g of b.gs) g.setVisible(v); }
      return;
    }
    let budget = 1; // bake at most one stretch ahead per frame (anything actually on screen is baked at once)
    const todo = this.baked
      .filter((b) => !b.rt && b.x1 > view.x - 300 && b.x0 < view.right + 1600)
      .sort((a, c) => Math.abs(a.x0 - view.centerX) - Math.abs(c.x0 - view.centerX));
    for (const b of todo) {
      const onScreen = b.x1 > view.x - 100 && b.x0 < view.right + 100;
      if (!onScreen && budget-- <= 0) continue;
      this.bake(b);
    }
    for (const b of this.baked) {
      if (b.rt && (b.x1 < view.x - 1800 || b.x0 > view.right + 2600)) {
        b.rt.setVisible(false); this.rtPool.push(b.rt); b.rt = undefined;
        b.earth?.setVisible(false); if (b.earth) this.earthPool.push(b.earth); b.earth = undefined;
      }
    }
  }

  /** Draw a stretch of scenery into a (pooled) texture. */
  bake(b: (typeof this.baked)[number]) {
    const W = 1200, H = b.depth === 5 ? this.bakeH.front : this.bakeH.back;
    const i = this.rtPool.findIndex((r) => r.height === H);
    const rt = i >= 0 ? this.rtPool.splice(i, 1)[0] : this.add.renderTexture(0, 0, W, H).setOrigin(0, 0);
    rt.clear().setPosition(b.x0, b.top).setDepth(b.depth).setVisible(true);
    // include the neighbouring stretches too, so shapes that spill over an edge come out the same in both
    const gs = (b.depth === 5 ? [b] : this.baked.filter((n) => n.depth === b.depth && Math.abs(n.x0 - b.x0) <= 1000)).flatMap((n) => n.gs).sort((p, q) => p.depth - q.depth);
    for (const g of gs) { g.setVisible(true); rt.draw(g, -b.x0, -b.top); g.setVisible(false); }
    b.rt = rt;
    if (b.depth === 5) {
      const e = this.earthPool.pop() ?? this.add.rectangle(0, 0, W, 4000, groundColor(this.def.theme)).setOrigin(0, 0).setDepth(4.9);
      e.setPosition(b.x0, b.bot - 2).setVisible(true);
      b.earth = e;
    }
  }


  // ---------- set pieces ----------
  stepSetPieces() {
    const r = this.rider;
    if (!r || this.finished) return;
    const rx = r.position.x, gy = (x: number) => this.groundY(x);
    this.stepGrids();
    // race the train along the sea wall
    for (const t of this.trains) {
      if (t.state === 'wait' && rx > t.x && !r.crashed) {
        t.state = 'race'; t.tx = rx - 380;
        t.img = this.add.image(t.tx, gy(t.tx) - 110, 'train').setScale(1.5 / RES).setDepth(1.4);
        this.toast('RACE THE TRAIN TO STARCROSS! 🚆');
        sfx.horn();
        this.time.delayedCall(700, () => this.say("Race a train? Don't mind if I do."));
      }
      if (t.state === 'race') {
        t.tx += 10.0;
        const front = t.tx + 170;
        t.img!.setPosition(t.tx, gy(t.tx) - 110);
        if (r.crashed || front > t.endX) {
          t.state = 'done';
          this.toast('THE TRAIN WINS 🚆'); this.time.delayedCall(400, () => this.say('It had a head start.'));
        } else if (rx > t.endX) {
          t.state = 'done';
          this.addCombo(500, 'BEAT THE TRAIN! 🚆');
          this.time.delayedCall(400, () => this.say('Faster than GWR. Not hard.'));
        }
      } else if (t.state === 'done' && t.img) {
        t.tx += 10; t.img.setPosition(t.tx, gy(t.tx) - 110);
        if (t.tx > rx + 2000) { t.img.destroy(); t.img = undefined; }
      }
    }
    // slow motion over the big gap
    const slow = !r.crashed && this.airborne && this.slowZones.some((z) => rx > z.x && rx < z.x + z.len);
    if (slow !== this.slowOn) {
      this.slowOn = slow;
      (this.matter.world.engine.timing as any).timeScale = slow ? 0.45 : 1;
      if (slow) this.trickToast('SLOW-MO');
    }
    // sheep stampede
    for (const st of this.stampedes) {
      if (!st.fired && rx > st.x - 1000 && !r.crashed) {
        st.fired = true; st.until = this.physSteps + 260;
        this.toast('STAMPEDE! 🐑🐑🐑 HOP THEM!');
        sfx.neigh();
        for (let i = 0; i < 6; i++) {
          const x = st.x + i * 55 + (i % 2) * 20;
          const body = this.matter.add.rectangle(x, gy(x) - 16, 44, 30, { label: 'cat', density: 0.0007, friction: 0.3 }) as Body;
          const sprite = this.add.image(x, gy(x) - 16, 'sheep').setScale(1 / RES).setDepth(12).setFlipX(true);
          this.cats.push({ body, sprite, hit: false, kind: 'sheep' });
          st.sheep.push({ body, sprite, dodged: false });
        }
      }
      if (st.fired && this.physSteps < st.until) {
        for (const sh of st.sheep) {
          const c = this.cats.find((q) => q.body === sh.body);
          if (c && !c.hit) this.matter.body.setVelocity(sh.body, { x: -4.5, y: sh.body.velocity.y });
          if (!sh.dodged && !r.crashed && c && !c.hit && sh.body.position.x < rx - 50) { sh.dodged = true; this.addCombo(100, 'SHEEP DODGED'); }
        }
      }
    }
    // the crowd goes wild on the final straight
    for (const c of this.confettiAt) {
      if (!c.fired && rx > c.x) {
        c.fired = true;
        sfx.roar();
        this.toast('THE CROWD GOES WILD! 🎉');
        const W = this.scale.width;
        const em = this.add.particles(0, 0, 'confetti', {
          x: { min: 0, max: W }, y: -10, speedY: { min: 180, max: 380 }, speedX: { min: -80, max: 80 },
          rotate: { min: 0, max: 360 }, lifespan: 2600, frequency: 12, quantity: 2,
          tint: [0xd62828, 0xffd400, 0x2c7be5, 0x7CFC8A, 0xff8fb3, 0xffffff],
        }).setScrollFactor(0).setDepth(36);
        this.time.delayedCall(3500, () => { em.stop(); this.time.delayedCall(2700, () => em.destroy()); });
      }
    }
  }

  /** Cattle grids: rattle your fillings out, drop a slow front wheel in, or hop clean over. */
  stepGrids() {
    const r = this.rider;
    for (const g of this.grids) {
      const front = r.front.position.x;
      if (r.position.x < g.x - 250) { g.done = false; g.rattle = 0; } // reset after a respawn behind it
      if (g.rattle > 0 && !r.crashed) {
        g.rattle--;
        if (g.violent) {
          // regular pedalling speed: properly chucked about (big bounces, the bike pitches, head flops)
          if (g.rattle % 6 === 0) {
            const up = g.rattle % 12 === 0;
            const B = this.matter.body;
            B.setVelocity(r.front, { x: r.front.velocity.x * 0.97, y: up ? -5.5 : 2.5 });
            B.setVelocity(r.rear, { x: r.rear.velocity.x * 0.97, y: up ? 2.5 : -5.5 });
            B.setVelocity(r.frame, { x: r.frame.velocity.x * 0.97, y: r.frame.velocity.y - 1.5 });
            for (const part of r.parts) if (part.body.label === 'head' || part.body.label === 'limb') B.setAngularVelocity(part.body, (up ? 1 : -1) * 0.3);
          }
        } else if (g.rattle % 4 === 0) {
          // at sprint speed: a fast shudder
          const kick = (g.rattle % 8 === 0 ? -1 : 1) * 1.6;
          this.matter.body.setVelocity(r.frame, { x: r.frame.velocity.x * 0.985, y: r.frame.velocity.y + kick });
          this.matter.body.setAngularVelocity(r.head, r.head.angularVelocity + (g.rattle % 8 === 0 ? 0.12 : -0.12));
        }
      }
      if (g.done || r.crashed || front < g.x + 6 || front > g.x + 120) continue;
      g.done = true;
      if (!r.wheelsDown()) {
        this.addCombo(150, 'GRID SKIPPED');
      } else if (r.speed < 3) {
        // too slow: the front wheel drops between the bars and over the top he goes
        this.bigText(g.x + 60, this.groundY(g.x) - 120, 'WHEEL STUCK!', '#ff9f1c');
        sfx.crash();
        for (const w of [r.front, r.rear, r.frame]) this.matter.body.setVelocity(w, { x: 0, y: 0 });
        this.matter.body.setPosition(r.front, { x: r.front.position.x, y: r.front.position.y + 10 });
        this.doCrash('head');
        for (const part of r.parts) {
          if (part.body.label === 'wheel' || part.body.label === 'frame') continue;
          this.matter.body.setVelocity(part.body, { x: 7, y: -7 });
          this.matter.body.setAngularVelocity(part.body, 0.35);
        }
        this.time.delayedCall(900, () => this.say('Who designs these things?!'));
      } else if (r.speed < 9.2) {
        // regular speed: chucked about
        g.rattle = 48; g.violent = true;
        this.cameras.main.shake(700, 0.016);
        sfx.rattle(); this.time.delayedCall(250, () => sfx.rattle());
        sfx.buzz([60, 30, 60, 30, 60, 30, 60, 30, 60]);
        const h = r.head.position;
        this.bigText(h.x, h.y - 80, 'CLATTER-CLATTER-CLANG!', '#ff9f1c');
        this.time.delayedCall(500, () => this.say(Phaser.Utils.Array.GetRandom(['WH-WH-WHOA!', 'M-M-MY S-S-SPINE!', 'Should\'ve s-s-sprinted!', 'B-b-bunny hop n-n-next time!']), 1800));
        this.addCombo(50, 'SURVIVED THE GRID');
      } else {
        g.rattle = 40; g.violent = false;
        this.cameras.main.shake(380, 0.006);
        sfx.rattle();
        sfx.buzz([30, 20, 30, 20, 30, 20, 30]);
        const h = r.head.position;
        this.bigText(h.x, h.y - 70, 'B-B-B-BRRRRR!', '#fff');
        this.time.delayedCall(450, () => this.say(Phaser.Utils.Array.GetRandom(['M-m-my f-f-fillings!', 'C-c-cattle g-g-grids. W-w-why.', 'Th-that loosened a b-b-bolt.', 'F-f-fine. Legs are f-f-fine.']), 1800));
        this.addCombo(50, 'RATTLED');
      }
    }
  }

  // ---------- combos ----------
  addCombo(pts: number, label?: string) {
    if (this.finished || this.rider.crashed) return;
    const c = this.combo;
    c.count++; c.pts += pts; c.lastStep = this.physSteps; c.slow = 0;
    if (label) this.trickToast(label);
    const el = document.getElementById('hud-combo');
    if (el) { el.textContent = `COMBO ×${c.count}`; el.classList.toggle('hidden', c.count < 2); el.classList.remove('pop'); void el.offsetWidth; el.classList.add('pop'); }
  }

  /** Keep the combo alive by keeping moving and keeping things happening. */
  stepCombo(R: Rider) {
    const c = this.combo;
    if (!c.count) return;
    c.slow = R.speed < 2.5 ? c.slow + 1 : 0;
    if (c.slow > 90 || this.physSteps - c.lastStep > 720) this.bankCombo();
  }

  bankCombo() {
    const c = this.combo;
    if (c.count >= 2) {
      // bonus grows 15% per link, capped at +100% of the points earned during the chain
      const total = Math.round(c.pts * Math.min(0.15 * (c.count - 1), 1));
      this.stats.comboPoints += total;
      this.stats.bestCombo = Math.max(this.stats.bestCombo, c.count);
      if (!this.finished) this.trickToast(`COMBO ×${c.count} BANKED  +${total}`);
    }
    this.combo = { count: 0, pts: 0, lastStep: 0, slow: 0 };
    document.getElementById('hud-combo')?.classList.add('hidden');
  }

  dropCombo() {
    if (this.combo.count >= 2) this.trickToast(`COMBO ×${this.combo.count} LOST`);
    this.combo = { count: 0, pts: 0, lastStep: 0, slow: 0 };
    document.getElementById('hud-combo')?.classList.add('hidden');
  }

  // ---------- ghost of your best run ----------
  stepGhost() {
    const R = this.rider;
    if (!R) return;
    if (this.physSteps % 3 === 0) {
      if (!this.finished && this.ghostFrames.length < 30000) this.ghostFrames.push(Math.round(R.position.x), Math.round(R.position.y), Math.round(R.frame.angle * 100));
      const g = this.ghostPlay;
      if (g) {
        const i = (this.physSteps / 3) * 3;
        if (i + 2 < g.frames.length) g.c.setPosition(g.frames[i], g.frames[i + 1]).setRotation(g.frames[i + 2] / 100);
        else g.c.setAlpha(Math.max(0, g.c.alpha - 0.02));
      }
    }
  }

  // ---------- fling: after a crash, press HOP to send Will flying ----------
  stepFling() {
    const R = this.rider;
    if (!R || !R.crashed || this.finished) return;
    if (!this.flingFrom) this.flingFrom = R.head.position.x;
    if (!this.flung && input.hopAt && performance.now() - input.hopAt < 200) {
      input.hopAt = 0;
      this.flung = true;
      for (const { body } of R.parts) {
        if (body.label === 'wheel' || body.label === 'frame') continue;
        this.matter.body.setVelocity(body, { x: body.velocity.x + 13, y: body.velocity.y - 15 });
        this.matter.body.setAngularVelocity(body, 0.4);
      }
      this.bigText(R.head.position.x, R.head.position.y - 60, 'YEET!', '#ff9f1c');
      sfx.buzz(40);
      this.respawnAt += 1600;
      this.time.delayedCall(2200, () => {
        if (!this.rider.crashed) return;
        const m = Math.max(0, Math.round((this.rider.head.position.x - this.flingFrom) / 10));
        this.trickToast(`FLUNG ${m} m`);
      });
    }
  }

  finish(lost = false) {
    if (this.andy && Math.abs(this.andy.x - this.rider.position.x) < 140) {
      (this.matter.world.engine.timing as any).timeScale = 0.25;
      this.time.delayedCall(1200, () => { (this.matter.world.engine.timing as any).timeScale = 1; });
      this.trickToast('PHOTO FINISH! 📸');
    }
    this.finished = true;
    this.stats.timeMs = this.elapsed;
    stopCruise();
    this.bankCombo();
    const prevBest = bestTime(this.def.id);
    if (!lost && (!prevBest || this.elapsed < prevBest)) saveGhost(this.def.id, this.ghostFrames);
    hud.hideGarmin();
    if (lost) sfx.bad(); else sfx.win();
    const cam = this.cameras.main;
    const t = this.add.text(cam.width / 2, cam.height * 0.35, lost ? 'PIPPED BY ANDY!' : 'FINISHED!', { fontFamily: 'Arial Black, Arial', fontSize: '64px', color: '#ffd400', stroke: '#111', strokeThickness: 10 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(60).setScale(0.2);
    this.tweens.add({ targets: t, scale: 1, duration: 500, ease: 'Back.out' });
    this.sparks.explode(40, this.rider.head.position.x, this.rider.head.position.y - 40);
    this.time.delayedCall(2200, () => {
      this.cameras.main.fadeOut(400);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Results', this.stats));
    });
  }
}

import Phaser from 'phaser';
import { Rider } from '../entities/Rider';
import { LevelDef, Pt, PickupType } from '../levels/types';
import { LEVELS } from '../levels';
import { input, isTouch } from '../ui/input';
import { hud } from '../ui/hud';
import { RES } from '../textures';
import { WILL_LINES, CRASH_LINES, GARMIN_MSGS, GARMIN_REPLIES, CAKE_LINES } from '../lines';
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
}

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
  horses: { body: Body; sprite: Phaser.GameObjects.Image; exitX: number; wait: number; gone: boolean; label: Phaser.GameObjects.Text }[] = [];
  cats: { body: Body; sprite: Phaser.GameObjects.Image; hit: boolean }[] = [];
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
    };
    this.lastCp = this.def.checkpoints[0];
    this.finished = false; this.paused = false; this.respawnAt = 0; this.elapsed = 0;
    this.horses = []; this.cats = []; this.pickups = []; this.overtakes = []; this.cpFlags = [];
    this.passingCar = undefined; this.bubble = undefined;
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

    // ---------- background ----------
    const sky = this.add.graphics().setScrollFactor(0).setDepth(-10);
    sky.fillGradientStyle(this.def.skyTop, this.def.skyTop, this.def.skyBottom, this.def.skyBottom, 1);
    sky.fillRect(0, 0, W, H);
    for (let i = 0; i < 14; i++) {
      this.add.image(Phaser.Math.Between(-200, L * 0.1 + W), Phaser.Math.Between(40, 260), 'cloud')
        .setScrollFactor(0.1, 0).setScale(Phaser.Math.FloatBetween(0.35, 0.7)).setDepth(-9).setAlpha(0.95);
    }
    this.hills(0.2, 0x8cc36a, 330, 60, 0.0035, -8, L);
    this.hills(0.45, 0x5fa646, 390, 50, 0.006, -7, L);

    this.drawDecorBehind();
    this.drawHedgeAndRoad();

    // ---------- physics ground ----------
    this.buildGround(this.def.terrain);
    this.buildObstacles();
    this.buildPickups();
    this.buildCheckpoints();

    // ---------- particles ----------
    this.blood = this.add.particles(0, 0, 'blood', {
      speed: { min: 80, max: 320 }, angle: { min: 200, max: 340 }, gravityY: 900, lifespan: 900,
      scale: { start: 0.9, end: 0.3 }, emitting: false,
    }).setDepth(30);
    this.sparks = this.add.particles(0, 0, 'spark', {
      speed: { min: 60, max: 200 }, lifespan: 500, scale: { start: 0.9, end: 0 }, emitting: false,
    }).setDepth(30);

    // ---------- rider + camera ----------
    this.spawn(this.lastCp);
    this.camTarget = this.add.zone(this.rider.position.x, this.rider.position.y, 1, 1);
    this.cameras.main.startFollow(this.camTarget, false, 0.12, 0.1).setFollowOffset(-220, 70);
    this.cameras.main.fadeIn(400);

    this.matter.world.on('collisionstart', (e: Phaser.Physics.Matter.Events.CollisionStartEvent) => this.onCollide(e));
    // controls run once per physics step, so the feel is the same at any screen refresh rate
    this.matter.world.on('beforeupdate', () => {
      if (this.paused || !this.rider) return;
      this.rider.step(this.finished ? { pedal: false, brake: true, leanBack: false, leanFwd: false, sprint: false } : input, this.time.now);
    });
    this.matter.world.on('collisionactive', (e: Phaser.Physics.Matter.Events.CollisionActiveEvent) => {
      let n = 0;
      for (const pair of e.pairs) {
        const a = pair.bodyA as Body, b = pair.bodyB as Body;
        if ((a.label === 'wheel' && b.label === 'ground') || (b.label === 'wheel' && a.label === 'ground')) n++;
      }
      this.rider.groundContacts = n;
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
    this.events.once('shutdown', () => { hud.hide(); this.matter.world?.off('collisionstart'); this.matter.world?.off('collisionactive'); this.matter.world?.off('beforeupdate'); });

    this.startTime = this.time.now;
    this.garminNext = this.time.now + 7000;
    this.banner(`LEVEL ${this.def.id}: ${this.def.name.toUpperCase()}`, this.def.subtitle);
    this.time.delayedCall(2600, () => this.say(pick(WILL_LINES)));
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

  drawHedgeAndRoad() {
    const t = this.def.terrain;
    // hedge behind the road
    const hedge = this.add.graphics().setDepth(2);
    const top = (x: number) => 82 + 14 * Math.sin(x * 0.045) + 9 * Math.sin(x * 0.13 + 2);
    hedge.fillStyle(0x3d7a2c, 1);
    hedge.beginPath();
    hedge.moveTo(t[0].x, t[0].y + 4);
    for (const p of t) hedge.lineTo(p.x, p.y - top(p.x));
    for (let i = t.length - 1; i >= 0; i--) hedge.lineTo(t[i].x, t[i].y + 4);
    hedge.closePath(); hedge.fillPath();
    const rnd = new Phaser.Math.RandomDataGenerator(['hedge']);
    for (let x = t[0].x; x < t[t.length - 1].x; x += 26) {
      const y = this.groundY(x) - top(x) + 12;
      hedge.fillStyle(rnd.pick([0x4f9236, 0x5ea43f, 0x427f2f]), 1);
      hedge.fillCircle(x + rnd.between(-6, 6), y + rnd.between(-4, 8), rnd.between(12, 20));
      if (rnd.frac() < 0.25) {
        hedge.fillStyle(rnd.pick([0xffffff, 0xffe066, 0xff8fb3]), 1);
        hedge.fillCircle(x, y + rnd.between(10, 40), 2.5);
      }
    }
    // earth + road
    const ground = this.add.graphics().setDepth(5);
    ground.fillStyle(0x6b3e1d, 1);
    ground.beginPath();
    ground.moveTo(t[0].x, 3000);
    for (const p of t) ground.lineTo(p.x, p.y);
    ground.lineTo(t[t.length - 1].x, 3000);
    ground.closePath(); ground.fillPath();
    ground.fillStyle(0x3a3a3f, 1);
    ground.beginPath();
    ground.moveTo(t[0].x, t[0].y);
    for (const p of t) ground.lineTo(p.x, p.y);
    for (let i = t.length - 1; i >= 0; i--) ground.lineTo(t[i].x, t[i].y + 22);
    ground.closePath(); ground.fillPath();
    ground.lineStyle(3, 0x1f1f22, 1);
    ground.strokePoints(t as Phaser.Types.Math.Vector2Like[]);
    ground.lineStyle(2, 0x58585e, 1);
    ground.strokePoints(t.map((p) => ({ x: p.x, y: p.y + 22 })));
    // grass verge strip on the edge
    ground.lineStyle(5, 0x4f9236, 1);
    ground.strokePoints(t.map((p) => ({ x: p.x, y: p.y + 25 })));
  }

  drawDecorBehind() {
    for (const d of this.def.decor) {
      const gy = this.groundY(d.x);
      if (d.type === 'sign') {
        const g = this.add.graphics().setDepth(4);
        g.fillStyle(0xdddddd, 1).fillRect(d.x - 3, gy - 120, 6, 120);
        g.fillStyle(0xffffff, 1).lineStyle(7, 0xd62828, 1);
        g.fillTriangle(d.x, gy - 175, d.x - 34, gy - 115, d.x + 34, gy - 115);
        g.strokeTriangle(d.x, gy - 175, d.x - 34, gy - 115, d.x + 34, gy - 115);
        const icon = d.icon === 'horse' ? '🐎' : d.icon === 'cat' ? '🐈' : '🕳️';
        this.add.text(d.x, gy - 135, icon, { fontSize: '24px' }).setOrigin(0.5).setDepth(4);
        this.add.text(d.x, gy - 100, d.text, { fontFamily: 'Arial Black, Arial', fontSize: '13px', color: '#111', backgroundColor: '#fff', padding: { x: 4, y: 2 } }).setOrigin(0.5).setDepth(4);
      } else if (d.type === 'gate') {
        const g = this.add.graphics().setDepth(3);
        g.fillStyle(0x8b6b45, 1);
        g.fillRect(d.x - 60, gy - 95, 8, 95); g.fillRect(d.x + 52, gy - 95, 8, 95);
        for (let i = 0; i < 5; i++) g.fillRect(d.x - 56, gy - 88 + i * 16, 112, 6);
        g.lineStyle(6, 0x8b6b45, 1).lineBetween(d.x - 56, gy - 10, d.x + 56, gy - 88);
      } else if (d.type === 'tractor') {
        const g = this.add.graphics().setDepth(1.5);
        const by = gy - 60;
        g.fillStyle(0x2e8b3a, 1).fillRoundedRect(d.x - 70, by - 60, 120, 50, 8);
        g.fillStyle(0x2e8b3a, 1).fillRect(d.x - 60, by - 120, 60, 62);
        g.fillStyle(0xbfe6ff, 1).fillRect(d.x - 52, by - 112, 44, 40);
        g.fillStyle(0x222222, 1).fillCircle(d.x - 40, by, 38).fillCircle(d.x + 40, by + 10, 24);
        g.fillStyle(0xffd400, 1).fillCircle(d.x - 40, by, 14).fillCircle(d.x + 40, by + 10, 9);
      } else if (d.type === 'cows') {
        for (let i = 0; i < 3; i++) {
          const x = d.x + i * 70, y = this.groundY(x) - 90 + (i % 2) * 6;
          const g = this.add.graphics().setDepth(1.5);
          g.fillStyle(0xffffff, 1).fillEllipse(x, y, 60, 34);
          g.fillStyle(0x222222, 1).fillEllipse(x - 10, y - 4, 18, 12).fillEllipse(x + 14, y + 6, 12, 10);
          g.fillStyle(0xffffff, 1).fillEllipse(x + 32, y - 10, 22, 18);
          g.fillStyle(0xffb3c1, 1).fillEllipse(x + 40, y - 6, 10, 8);
          g.fillStyle(0x222222, 1).fillCircle(x + 32, y - 14, 2);
        }
      }
    }
    // finish arch
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
  buildGround(pts: Pt[], walls = true) {
    const T = 40;
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i], b = pts[i + 1];
      const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
      const nx = -dy / len, ny = dx / len;
      this.matter.add.rectangle((a.x + b.x) / 2 + nx * T / 2, (a.y + b.y) / 2 + ny * T / 2, len + 4, T, {
        isStatic: true, angle: Math.atan2(dy, dx), label: 'ground', friction: 1, frictionStatic: 10,
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
        this.cats.push({ body, sprite, hit: false });
      } else if (o.type === 'horse') {
        const gy = this.groundY(o.x);
        const body = this.matter.add.rectangle(o.x, gy - 58, 110, 112, { isStatic: true, label: 'horse' }) as Body;
        const sprite = this.add.image(o.x, gy - 60, 'horse').setScale(1 / RES).setDepth(9);
        const label = this.add.text(o.x, gy - 140, 'Pass wide and slow!', { fontFamily: 'Arial Black, Arial', fontSize: '14px', color: '#111', backgroundColor: '#fff', padding: { x: 5, y: 3 } }).setOrigin(0.5).setDepth(9).setAlpha(0);
        this.horses.push({ body, sprite, exitX: o.exitX, wait: 0, gone: false, label });
      } else if (o.type === 'overtake') {
        this.overtakes.push({ triggerX: o.triggerX, done: false });
      }
    }
  }

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
      const gy = this.groundY(x);
      const pole = this.add.graphics().setDepth(4);
      pole.fillStyle(0xeeeeee, 1).fillRect(x - 2, gy - 110, 4, 110);
      const flag = this.add.graphics().setDepth(4);
      flag.fillStyle(0xff8a00, 1).fillTriangle(x + 2, gy - 110, x + 2, gy - 80, x + 44, gy - 95);
      this.cpFlags.push({ x, flag, reached: false });
    }
  }

  // ---------- rider lifecycle ----------
  spawn(x: number) {
    this.rider?.destroy();
    this.rider = new Rider(this, x, this.groundY(x) - 42);
    this.upsideDownSince = 0;
  }

  crashOrRespawn(manual = false) {
    if (manual) { this.spawn(this.lastCp); this.respawnAt = 0; return; }
  }

  doCrash(reason: 'head' | 'horse' | 'flip' | 'fall') {
    if (this.rider.crashed || this.finished) return;
    this.rider.crash();
    this.stats.crashes++;
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
        if (ol === 'horse') { this.hitHorse(); continue; }
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
    this.matter.world.remove(body);
    this.tweens.killTweensOf(p.sprite);
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
    if (p.type === 'yoghurt') { this.stats.yoghurts++; this.toast('+1 YOGHURT'); }
    if (p.type === 'gel') { this.rider.stamina = 1; this.toast('GEL: STAMINA FULL'); }
    if (p.type === 'coffee') { this.rider.boost(3000); this.toast('COFFEE BOOST!'); }
  }

  launchCat(body: Body) {
    const c = this.cats.find((q) => q.body === body);
    if (!c || c.hit) return;
    c.hit = true;
    this.stats.catsLaunched++;
    const v = Math.max(4, this.rider.speed);
    this.matter.body.setVelocity(body, { x: v + 3, y: -9 });
    this.matter.body.setAngularVelocity(body, 0.3);
    sfx.meow();
    const t = this.add.text(body.position.x, body.position.y - 40, 'MEOW!', { fontFamily: 'Arial Black, Arial', fontSize: '22px', color: '#fff', stroke: '#111', strokeThickness: 5 }).setOrigin(0.5).setDepth(40);
    this.tweens.add({ targets: t, y: t.y - 60, alpha: 0, duration: 1100, onComplete: () => t.destroy() });
    this.time.delayedCall(900, () => this.say('Sorry, cat!'));
  }

  hitHorse() {
    if (this.rider.crashed) return;
    if (Math.abs(this.rider.speed) > 5.5) {
      this.stats.kickedByHorse = true;
      sfx.neigh();
      const h = this.horses[0];
      const t = this.add.text(h.sprite.x, h.sprite.y - 90, 'NEIGHHH!', { fontFamily: 'Arial Black, Arial', fontSize: '26px', color: '#fff', stroke: '#111', strokeThickness: 6 }).setOrigin(0.5).setDepth(40);
      this.tweens.add({ targets: t, y: t.y - 50, alpha: 0, duration: 1300, onComplete: () => t.destroy() });
      this.doCrash('horse');
      for (const part of this.rider.parts) this.matter.body.setVelocity(part.body, { x: -9, y: -11 });
    }
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
    const [t, m] = pick(GARMIN_MSGS);
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

    if (!this.finished) {
      this.elapsed = now - this.startTime;
      hud.set(this.elapsed, (r.position.x - this.def.checkpoints[0]) / 10, this.stats.yoghurts, r.stamina);
    }

    // bubble follows the head
    if (this.bubble) {
      const h = r.head.position;
      this.bubble.setPosition(h.x - 10, h.y - 26);
      if (now > this.bubbleUntil) { this.bubble.destroy(); this.bubble = undefined; }
    }

    // sprite sync for cats
    for (const c of this.cats) c.sprite.setPosition(c.body.position.x, c.body.position.y).setRotation(c.body.angle);

    // horses: walk until the rider waits patiently behind, or they reach the gate
    for (const h of this.horses) {
      if (h.gone) continue;
      const gap = h.body.position.x - r.position.x;
      if (gap < 700 && gap > -50) h.label.setAlpha(1);
      if (gap > 0 && gap < 450 && Math.abs(r.speed) < 5 && !r.crashed) h.wait += dt; else h.wait = Math.max(0, h.wait - dt * 0.3);
      if (gap < 900) {
        const nx = h.body.position.x + 0.9 * (dt / 16.67);
        const gy = this.groundY(nx);
        this.matter.body.setPosition(h.body, { x: nx, y: gy - 58 });
        h.sprite.setPosition(nx, gy - 60 + Math.sin(now * 0.012) * 1.5);
        h.label.setPosition(nx, gy - 140);
      }
      if (h.wait > 700 || h.body.position.x >= h.exitX) {
        h.gone = true;
        const polite = h.wait > 700;
        if (polite) { this.stats.courteous = true; this.toast('COURTEOUS RIDER +1'); }
        this.matter.world.remove(h.body);
        h.label.setText(polite ? 'Thank you! 👋' : 'Hmph.');
        this.tweens.add({ targets: [h.sprite, h.label], y: '-=40', alpha: 0, scale: '*=0.8', duration: 1400, delay: 500 });
        if (polite) this.time.delayedCall(800, () => this.say('No worries! Right, where was I...'));
      }
    }

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
      if (!hud.garminVisible() && now > this.garminNext) this.showGarmin();
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
    if (!this.finished && !r.crashed && r.position.x > this.def.finishX) this.finish();
  }

  finish() {
    this.finished = true;
    this.stats.timeMs = this.elapsed;
    hud.hideGarmin();
    sfx.win();
    const cam = this.cameras.main;
    const t = this.add.text(cam.width / 2, cam.height * 0.35, 'FINISHED!', { fontFamily: 'Arial Black, Arial', fontSize: '64px', color: '#ffd400', stroke: '#111', strokeThickness: 10 })
      .setOrigin(0.5).setScrollFactor(0).setDepth(60).setScale(0.2);
    this.tweens.add({ targets: t, scale: 1, duration: 500, ease: 'Back.out' });
    this.sparks.explode(40, this.rider.head.position.x, this.rider.head.position.y - 40);
    this.time.delayedCall(2200, () => {
      this.cameras.main.fadeOut(400);
      this.cameras.main.once('camerafadeoutcomplete', () => this.scene.start('Results', this.stats));
    });
  }
}

import Phaser from 'phaser';
import { RES } from '../textures';

type Body = MatterJS.BodyType;
type Constraint = MatterJS.ConstraintType;
type Vec = { x: number; y: number };

export interface Controls { pedal: boolean; brake: boolean; leanBack: boolean; leanFwd: boolean; sprint: boolean }

const GROUP = -7; // bike and rider parts never collide with each other

const WHEEL_R = 22;
const REAR = { x: -42, y: 18 };
const FRONT = { x: 42, y: 18 };
const BB = { x: -2, y: 24 };
const CRANK = 10;

// Riding pose, in frame-local coordinates (frame centre = 0,0, facing right)
const HIP = { x: -16, y: -28 };
const SHOULDER = { x: 18, y: -50 };
const HANDS = { x: 41, y: -19 };
const HEAD = { x: 30, y: -62 };

interface Part { body: Body; sprite: Phaser.GameObjects.Image }

function mid(a: Vec, b: Vec): Vec { return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; }
function dist(a: Vec, b: Vec) { return Math.hypot(b.x - a.x, b.y - a.y); }
function ang(a: Vec, b: Vec) { return Math.atan2(b.y - a.y, b.x - a.x); }

export class Rider {
  scene: Phaser.Scene;
  frame!: Body;
  rear!: Body;
  front!: Body;
  head!: Body;
  torso!: Body;
  parts: Part[] = [];
  bikeLinks: Constraint[] = [];
  joints: Constraint[] = [];
  footLink!: Constraint;
  thighPart!: Part;
  shinPart!: Part;
  ikLegs: Phaser.GameObjects.Image[] = [];
  cranks!: Phaser.GameObjects.Graphics;
  crashed = false;
  crankAngle = 0;
  boostUntil = 0;
  stamina = 1;
  private origin: Vec;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.origin = { x, y };
    this.build();
  }

  private w(p: Vec): Vec { return { x: this.origin.x + p.x, y: this.origin.y + p.y }; }

  private addPart(body: Body, key: string, depth: number): Part {
    const sprite = this.scene.add.image(body.position.x, body.position.y, key).setScale(1 / RES).setDepth(depth);
    const part = { body, sprite };
    this.parts.push(part);
    return part;
  }

  private limb(a: Vec, b: Vec, thick: number, key: string, label: string, depth: number) {
    const wa = this.w(a), wb = this.w(b), c = mid(wa, wb);
    const body = this.scene.matter.add.rectangle(c.x, c.y, dist(a, b), thick, {
      angle: ang(a, b), label, density: 0.0007, friction: 0.6, frictionAir: 0.01,
      collisionFilter: { group: GROUP, category: 1, mask: 0xffffffff },
    }) as Body;
    this.addPart(body, key, depth);
    return body;
  }

  /** Pin two bodies together at a world point. */
  private pin(a: Body, b: Body, world: Vec, stiffness = 1, list?: Constraint[]) {
    const c = this.scene.matter.add.constraint(a, b, 0, stiffness, {
      pointA: { x: world.x - a.position.x, y: world.y - a.position.y },
      pointB: { x: world.x - b.position.x, y: world.y - b.position.y },
    }) as Constraint;
    (list ?? this.joints).push(c);
    return c;
  }

  /** Keep two body points at their current distance (stops floppiness while riding). */
  private brace(a: Body, pa: Vec, b: Body, pb: Vec, stiffness: number, list: Constraint[]) {
    const wa = this.w(pa), wb = this.w(pb);
    const c = this.scene.matter.add.constraint(a, b, dist(wa, wb), stiffness, {
      pointA: { x: wa.x - a.position.x, y: wa.y - a.position.y },
      pointB: { x: wb.x - b.position.x, y: wb.y - b.position.y },
    }) as Constraint;
    list.push(c);
    return c;
  }

  private build() {
    const M = this.scene.matter;
    const filter = { group: GROUP, category: 1, mask: 0xffffffff };

    // --- Bike ---
    this.frame = M.add.rectangle(this.origin.x, this.origin.y, 80, 10, {
      label: 'frame', density: 0.002, friction: 0.3, collisionFilter: filter,
    }) as Body;
    const r = this.w(REAR), f = this.w(FRONT);
    const wheelOpts = { label: 'wheel', density: 0.0024, friction: 1, frictionStatic: 10, restitution: 0.05, collisionFilter: filter };
    this.rear = M.add.circle(r.x, r.y, WHEEL_R, wheelOpts) as Body;
    this.front = M.add.circle(f.x, f.y, WHEEL_R, wheelOpts) as Body;
    this.addPart(this.rear, 'wheel', 10);
    this.addPart(this.front, 'wheel', 10);
    this.addPart(this.frame, 'frame', 11);
    // axles: a pin plus a little suspension spring each
    for (const wh of [this.rear, this.front]) {
      this.scene.matter.add.constraint(this.frame, wh, 0, 1, {
        pointA: { x: wh.position.x - this.frame.position.x, y: wh.position.y - this.frame.position.y },
      });
    }

    // --- Rider ---
    const knee = this.kneeFor(this.crankPoint(0));
    const foot = this.crankPoint(0);
    this.torso = this.limb(HIP, SHOULDER, 15, 'torso', 'torso', 13);
    const thigh = this.limb(HIP, knee, 10, 'thigh', 'limb', 14);
    const shin = this.limb(knee, foot, 8, 'shin', 'limb', 14);
    const arm = this.limb(SHOULDER, HANDS, 7, 'arm', 'limb', 15);
    this.thighPart = this.parts.find((q) => q.body === thigh)!;
    this.shinPart = this.parts.find((q) => q.body === shin)!;
    const sc = this.scene;
    this.ikLegs = [
      sc.add.image(0, 0, 'thigh').setScale(1 / RES).setDepth(9).setTint(0x9aa0b5),
      sc.add.image(0, 0, 'shin').setScale(1 / RES).setDepth(9).setTint(0x9aa0b5),
      sc.add.image(0, 0, 'thigh').setScale(1 / RES).setDepth(14),
      sc.add.image(0, 0, 'shin').setScale(1 / RES).setDepth(14),
    ];
    this.cranks = sc.add.graphics().setDepth(12);
    const hp = this.w(HEAD);
    this.head = M.add.circle(hp.x, hp.y, 12, {
      label: 'head', density: 0.0008, friction: 0.5, collisionFilter: filter,
    }) as Body;
    this.addPart(this.head, 'head', 16);

    // body joints (kept after a crash -> ragdoll)
    this.pin(this.torso, thigh, this.w(HIP));
    this.pin(thigh, shin, this.w(knee));
    this.pin(this.torso, arm, this.w(SHOULDER));
    const neck = { x: SHOULDER.x + 6, y: SHOULDER.y - 6 };
    this.pin(this.torso, this.head, this.w(neck), 0.9);
    this.brace(this.torso, mid(HIP, SHOULDER), this.head, HEAD, 0.4, this.joints);

    // links to bike (removed on crash)
    this.pin(this.frame, this.torso, this.w(HIP), 0.9, this.bikeLinks);
    this.pin(this.frame, arm, this.w(HANDS), 0.7, this.bikeLinks);
    this.footLink = this.pin(this.frame, shin, this.w(foot), 0.6, this.bikeLinks);
    this.brace(this.frame, { x: 0, y: 0 }, this.torso, SHOULDER, 0.5, this.bikeLinks);
    this.brace(this.frame, FRONT, this.torso, SHOULDER, 0.5, this.bikeLinks);
  }

  private crankPoint(a: number): Vec { return { x: BB.x + Math.cos(a) * CRANK, y: BB.y + Math.sin(a) * CRANK }; }
  private kneeFor(foot: Vec): Vec {
    // pick a knee point forward of the hip/foot line
    const m = mid(HIP, foot), d = dist(HIP, foot);
    const L = 31; const h = Math.sqrt(Math.max(0, L * L - (d / 2) ** 2));
    const nx = -(foot.y - HIP.y) / d, ny = (foot.x - HIP.x) / d;
    return { x: m.x - nx * h, y: m.y - ny * h };
  }

  private mass = 0;
  totalMass() { return this.mass ||= this.parts.reduce((m, p) => m + p.body.mass, 0); }
  groundContacts = 0;
  wheelsDown() { return this.groundContacts > 0; }

  get position(): Vec { return this.frame.position; }
  get speed(): number { return this.frame.velocity.x; }

  /** Controls — called once per physics step. */
  step(input: Controls, now: number) {
    const B = this.scene.matter.body;
    if (!this.crashed) {
      const boosted = now < this.boostUntil;
      const sprinting = input.sprint && this.stamina > 0.02;
      if (sprinting) this.stamina = Math.max(0, this.stamina - 0.006);
      else this.stamina = Math.min(1, this.stamina + 0.0015);
      const maxAV = sprinting ? 0.58 : boosted ? 0.52 : 0.44;
      const accel = sprinting ? 0.06 : 0.04;
      if (input.pedal || sprinting) {
        const av = this.rear.angularVelocity;
        if (av < maxAV) B.setAngularVelocity(this.rear, Math.min(maxAV, av + accel));
        // leg power: a push along the frame so climbs are rideable
        const fwd = { x: Math.cos(this.frame.angle), y: Math.sin(this.frame.angle) };
        const v = this.frame.velocity.x * fwd.x + this.frame.velocity.y * fwd.y;
        if (v < maxAV * WHEEL_R && this.wheelsDown()) {
          const f = this.totalMass() * (sprinting ? 6e-4 : 4.5e-4);
          B.applyForce(this.frame, this.frame.position, { x: fwd.x * f, y: fwd.y * f });
        }
      }
      if (input.brake) {
        for (const wh of [this.rear, this.front]) B.setAngularVelocity(wh, wh.angularVelocity * 0.85);
        if (Math.abs(this.speed) < 0.6) B.setAngularVelocity(this.rear, -0.08);
      }
      const lean = (input.leanBack ? -1 : 0) + (input.leanFwd ? 1 : 0);
      const cur = this.frame.angularVelocity;
      const grounded = this.wheelsDown();
      if (lean) {
        // weight shift: one wheel up, the other down (a turning push with no net lift)
        const tooFar = grounded && lean * this.frame.angle > 0.9; // stop wheelies/stoppies at ~50 degrees
        const reversing = Math.sign(cur) !== lean;
        if (!tooFar && Math.abs(cur) < (grounded ? 0.09 : 0.05) || reversing) {
          const f = this.totalMass() * (reversing ? 1.3e-3 : 9e-4) * (grounded ? 1 : 0.45);
          const up = lean < 0 ? this.front : this.rear, down = lean < 0 ? this.rear : this.front;
          B.applyForce(up, up.position, { x: 0, y: -f });
          B.applyForce(down, down.position, { x: 0, y: f });
        }
      } else {
        // let go: settle on the ground, keep a gentle spin in the air
        if (grounded) B.setAngularVelocity(this.frame, cur * 0.8);
        else if (Math.abs(cur) > 0.004) {
          // in the air, gently stop the spin (the rider's weight keeps it going otherwise)
          const f = this.totalMass() * 2.2e-3 * Math.min(1, Math.abs(cur) / 0.02);
          const up = cur < 0 ? this.rear : this.front, down = cur < 0 ? this.front : this.rear;
          B.applyForce(up, up.position, { x: 0, y: -f });
          B.applyForce(down, down.position, { x: 0, y: f });
        }
      }
    }
  }

  /** Visuals — called once per rendered frame. */
  sync() {
    for (const { body, sprite } of this.parts) {
      sprite.setPosition(body.position.x, body.position.y).setRotation(body.angle);
    }
    const riding = !this.crashed;
    this.thighPart.sprite.setVisible(!riding);
    this.shinPart.sprite.setVisible(!riding);
    for (const im of this.ikLegs) im.setVisible(riding);
    this.cranks.clear();
    if (!riding) return;
    // cranks turn with the back wheel (clockwise when riding forwards)
    this.crankAngle = this.rear.angle * 0.5;
    const fa = this.frame.angle, c = Math.cos(fa), sn = Math.sin(fa), fp = this.frame.position;
    const toWorld = (p: Vec) => ({ x: fp.x + p.x * c - p.y * sn, y: fp.y + p.x * sn + p.y * c });
    const hip = toWorld(HIP), bb = toWorld(BB), fwd = { x: c, y: sn };
    const legs: [number, number][] = [[this.crankAngle + Math.PI, 0], [this.crankAngle, 2]]; // far leg first
    for (const [a, i] of legs) {
      const foot = { x: bb.x + Math.cos(a + fa) * CRANK, y: bb.y + Math.sin(a + fa) * CRANK };
      // two-bone IK, knee always bends forward
      const L = 32;
      let dx = foot.x - hip.x, dy = foot.y - hip.y;
      const d = Math.min(Math.hypot(dx, dy), 2 * L - 0.5);
      const ux = dx / Math.hypot(dx, dy), uy = dy / Math.hypot(dx, dy);
      const h = Math.sqrt(L * L - (d / 2) ** 2);
      let nx = -uy, ny = ux;
      if (nx * fwd.x + ny * fwd.y < 0) { nx = -nx; ny = -ny; }
      const knee = { x: hip.x + ux * d / 2 + nx * h, y: hip.y + uy * d / 2 + ny * h };
      const f2 = { x: hip.x + ux * d, y: hip.y + uy * d };
      dx = knee.x - hip.x; dy = knee.y - hip.y;
      this.ikLegs[i].setPosition((hip.x + knee.x) / 2, (hip.y + knee.y) / 2).setRotation(Math.atan2(dy, dx));
      this.ikLegs[i + 1].setPosition((knee.x + f2.x) / 2, (knee.y + f2.y) / 2).setRotation(Math.atan2(f2.y - knee.y, f2.x - knee.x));
      // crank arm
      this.cranks.lineStyle(3, i === 0 ? 0x555555 : 0x222222, 1).lineBetween(bb.x, bb.y, foot.x, foot.y);
    }
  }

  crash() {
    if (this.crashed) return;
    this.crashed = true;
    for (const c of this.bikeLinks) this.scene.matter.world.removeConstraint(c);
    this.bikeLinks = [];
    // throw the rider forward a bit for comedy
    const v = this.frame.velocity;
    for (const { body } of this.parts) {
      if (body.label === 'wheel' || body.label === 'frame') continue;
      this.scene.matter.body.setVelocity(body, { x: v.x * 1.1, y: v.y - 2 });
    }
  }

  boost(ms: number) { this.boostUntil = this.scene.time.now + ms; }

  isRiderBody(b: Body) { return b.label === 'head' || b.label === 'torso' || b.label === 'limb'; }
  owns(b: Body) { return this.parts.some((p) => p.body === b || p.body === (b as any).parent); }

  destroy() {
    const world = this.scene.matter.world;
    for (const c of [...this.bikeLinks, ...this.joints]) world.removeConstraint(c);
    for (const { body, sprite } of this.parts) {
      // also remove axle constraints attached to the frame
      world.remove(body);
      sprite.destroy();
    }
    const all = (world.localWorld as any).constraints as Constraint[];
    for (const c of [...all]) if (c.bodyA === this.frame || c.bodyB === this.frame) world.removeConstraint(c);
    this.parts = [];
    for (const im of this.ikLegs) im.destroy();
    this.cranks.destroy();
  }
}

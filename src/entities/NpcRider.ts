import Phaser from 'phaser';
import { RES } from '../textures';

/** A drawn (non-physics) rider used for Lee and Andy. Faces right. */
export interface NpcLook {
  bike: 'frame' | 'tandem';
  head: string;
  torso: string;
  arm: string;
  thigh: string;
  shin: string;
}

type V = { x: number; y: number };
const WHEEL_R = 22;

export class NpcRider {
  scene: Phaser.Scene;
  c: Phaser.GameObjects.Container;
  private wheels: Phaser.GameObjects.Image[] = [];
  private legs: Phaser.GameObjects.Image[] = [];
  private cranks: Phaser.GameObjects.Graphics;
  private dx: number; // seat offset (tandem captain sits forward)
  private axle: number;
  x = 0;
  speed = 0;
  private rolled = 0;

  constructor(scene: Phaser.Scene, look: NpcLook, depth: number, scale = 1) {
    this.scene = scene;
    const tandem = look.bike === 'tandem';
    this.dx = tandem ? 28 : 0;
    this.axle = tandem ? 70 : 42;
    this.c = scene.add.container(0, 0).setDepth(depth).setScale(scale);
    const img = (k: string, x = 0, y = 0, r = 0) => {
      const i = scene.add.image(x, y, k).setScale(1 / RES).setRotation(r);
      this.c.add(i);
      return i;
    };
    // far leg, wheels, frame, near leg, body
    this.legs.push(img(look.thigh).setTint(0x9aa0b5), img(look.shin).setTint(0x9aa0b5));
    this.wheels.push(img('wheel', -this.axle, 18), img('wheel', this.axle, 18));
    img(look.bike);
    this.cranks = scene.add.graphics();
    this.c.add(this.cranks);
    this.legs.push(img(look.thigh), img(look.shin));
    const d = this.dx;
    const seg = (k: string, a: V, b: V) => img(k, (a.x + b.x) / 2 + d, (a.y + b.y) / 2, Math.atan2(b.y - a.y, b.x - a.x));
    seg(look.torso, { x: -16, y: -28 }, { x: 18, y: -50 });
    seg(look.arm, { x: 18, y: -50 }, { x: 41, y: -19 });
    img(look.head, 30 + d, -62);
  }

  /** Place on the road at x (moving distance dist since last call). */
  place(x: number, groundY: (x: number) => number, yOffset = 0) {
    const moved = x - this.x;
    this.x = x;
    const yR = groundY(x - this.axle), yF = groundY(x + this.axle);
    const ang = Math.atan2(yF - yR, this.axle * 2);
    this.c.setPosition(x, (yR + yF) / 2 - 40 + yOffset).setRotation(ang);
    this.rolled += moved / WHEEL_R;
    for (const w of this.wheels) w.setRotation(this.rolled);
    this.pedal(this.rolled * 0.5);
  }

  private pedal(crank: number) {
    const d = this.dx;
    const hip = { x: -16 + d, y: -28 }, bb = { x: -2 + d, y: 24 };
    this.cranks.clear();
    const L = 32;
    [[crank + Math.PI, 0], [crank, 2]].forEach(([a, i]) => {
      const foot = { x: bb.x + Math.cos(a) * 10, y: bb.y + Math.sin(a) * 10 };
      const dx = foot.x - hip.x, dy = foot.y - hip.y, dist = Math.hypot(dx, dy), dd = Math.min(dist, 2 * L - 0.5);
      const ux = dx / dist, uy = dy / dist, h = Math.sqrt(L * L - (dd / 2) ** 2);
      const knee = { x: hip.x + ux * dd / 2 - uy * h, y: hip.y + uy * dd / 2 + ux * h };
      // pick the knee that points forward (+x)
      if (knee.x < hip.x + ux * dd / 2) { knee.x = hip.x + ux * dd / 2 + uy * h; knee.y = hip.y + uy * dd / 2 - ux * h; }
      const f2 = { x: hip.x + ux * dd, y: hip.y + uy * dd };
      this.legs[i].setPosition((hip.x + knee.x) / 2, (hip.y + knee.y) / 2).setRotation(Math.atan2(knee.y - hip.y, knee.x - hip.x));
      this.legs[i + 1].setPosition((knee.x + f2.x) / 2, (knee.y + f2.y) / 2).setRotation(Math.atan2(f2.y - knee.y, f2.x - knee.x));
      this.cranks.lineStyle(3, i === 0 ? 0x555555 : 0x222222, 1).lineBetween(bb.x, bb.y, foot.x, foot.y);
    });
  }

  get headPos(): V {
    const m = this.c.getWorldTransformMatrix();
    return { x: m.tx + (30 + this.dx) * Math.cos(this.c.rotation) * this.c.scaleX, y: m.ty - 62 * this.c.scaleY };
  }

  destroy() { this.c.destroy(); }
}

export const LEE_LOOK: NpcLook = { bike: 'tandem', head: 'head_lee', torso: 'torso_lee', arm: 'arm_lee', thigh: 'thigh_dark', shin: 'shin' };
export const ANDY_LOOK: NpcLook = { bike: 'frame', head: 'head_andy', torso: 'torso_andy', arm: 'arm_andy', thigh: 'thigh_dark', shin: 'shin_white' };

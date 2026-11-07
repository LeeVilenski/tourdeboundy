import Phaser from 'phaser';
import { RES } from '../textures';
import { currentKit } from '../progress';

/** Static (non-physics) Will on his bike, for menus and the podium. */
export function willOnBike(scene: Phaser.Scene, x: number, y: number, scale = 1, kit = currentKit()) {
  const c = scene.add.container(x, y);
  const img = (k: string, px: number, py: number, rot = 0) => c.add(scene.add.image(px, py, k).setScale(1 / RES).setRotation(rot));
  const seg = (k: string, a: number[], b: number[]) =>
    img(k, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.atan2(b[1] - a[1], b[0] - a[0]));
  img('wheel', -42, 18); img('wheel', 42, 18); img((kit as { bike?: string }).bike ?? 'frame', 0, 0);
  seg(kit.torso, [-16, -28], [18, -50]);
  seg(kit.thigh, [-16, -28], [12, -12]);
  seg(kit.shin, [12, -12], [6, 30]);
  seg(kit.arm, [18, -50], [41, -19]);
  img(kit.head, 30, -62);
  c.setScale(scale);
  return c;
}

export interface StandLook { head: string; torso: string; arm: string; thigh: string; shin: string }
const WILL: StandLook = { head: 'head', torso: 'torso', arm: 'arm', thigh: 'thigh', shin: 'shin' };

/** A rider standing up (for the podium). Defaults to Will. */
export function willStanding(scene: Phaser.Scene, x: number, y: number, scale = 1, look: StandLook = currentKit(), armsUp = true) {
  const c = scene.add.container(x, y);
  const img = (k: string, px: number, py: number, rot: number) => c.add(scene.add.image(px, py, k).setScale(1 / RES).setRotation(rot));
  const up = -Math.PI / 2;
  const down = Math.PI / 2;
  img(look.shin, -6, -16, down); img(look.shin, 6, -16, down);
  img(look.thigh, -6, -44, down); img(look.thigh, 6, -44, down);
  img(look.torso, 0, -78, up);
  img(look.arm, -14, -96, armsUp ? -2.4 : 1.9);
  img(look.arm, 14, -96, armsUp ? -0.7 : 1.3);
  img(look.head, 2, -112, 0);
  c.setScale(scale);
  return c;
}

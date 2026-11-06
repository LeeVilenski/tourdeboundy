import Phaser from 'phaser';
import { RES } from '../textures';

/** Static (non-physics) Will on his bike, for menus and the podium. */
export function willOnBike(scene: Phaser.Scene, x: number, y: number, scale = 1) {
  const c = scene.add.container(x, y);
  const img = (k: string, px: number, py: number, rot = 0) => c.add(scene.add.image(px, py, k).setScale(1 / RES).setRotation(rot));
  const seg = (k: string, a: number[], b: number[]) =>
    img(k, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2, Math.atan2(b[1] - a[1], b[0] - a[0]));
  img('wheel', -42, 18); img('wheel', 42, 18); img('frame', 0, 0);
  seg('torso', [-16, -28], [18, -50]);
  seg('thigh', [-16, -28], [12, -12]);
  seg('shin', [12, -12], [6, 30]);
  seg('arm', [18, -50], [41, -19]);
  img('head', 30, -62);
  c.setScale(scale);
  return c;
}

/** Will standing up (for the podium). */
export function willStanding(scene: Phaser.Scene, x: number, y: number, scale = 1) {
  const c = scene.add.container(x, y);
  const img = (k: string, px: number, py: number, rot: number) => c.add(scene.add.image(px, py, k).setScale(1 / RES).setRotation(rot));
  const up = -Math.PI / 2;
  const down = Math.PI / 2;
  img('shin', -6, -16, down); img('shin', 6, -16, down);
  img('thigh', -6, -44, down); img('thigh', 6, -44, down);
  img('torso', 0, -78, up);
  img('arm', -14, -96, -2.4);
  img('arm', 14, -96, -0.7);
  img('head', 2, -112, 0);
  c.setScale(scale);
  return c;
}

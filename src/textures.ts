import Phaser from 'phaser';

// All art is drawn in code at 2x resolution, then shown at 0.5 scale for crisp edges.
export const RES = 2;

type Draw = (ctx: CanvasRenderingContext2D) => void;

function make(scene: Phaser.Scene, key: string, w: number, h: number, draw: Draw) {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.createCanvas(key, w * RES, h * RES)!;
  const ctx = tex.getContext();
  ctx.scale(RES, RES);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  draw(ctx);
  tex.refresh();
}

const OUTLINE = '#1a1a1a';
const SKIN = '#f6c9a8';
const GINGER = '#d9752b';
const NAVY = '#1f2d6b';
const JERSEY_BLUE = '#1e3f9e';

function line(ctx: CanvasRenderingContext2D, pts: number[][], width: number, color: string) {
  ctx.beginPath();
  ctx.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
  ctx.lineWidth = width + 3;
  ctx.strokeStyle = OUTLINE;
  ctx.stroke();
  ctx.lineWidth = width;
  ctx.strokeStyle = color;
  ctx.stroke();
}

function star(ctx: CanvasRenderingContext2D, x: number, y: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 ? r * 0.45 : r;
    ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
}

// Limb texture: a capsule drawn along the x axis.
function capsule(ctx: CanvasRenderingContext2D, len: number, thick: number, w: number, h: number, segs: { to: number; color: string }[]) {
  const y = h / 2;
  const x0 = (w - len) / 2;
  let from = 0;
  for (const s of segs) {
    line(ctx, [[x0 + from * len, y], [x0 + s.to * len, y]], thick, s.color);
    from = s.to;
  }
}

export function makeTextures(scene: Phaser.Scene) {
  // ---------- Wheel: black tread, tan wall, deep carbon rim ----------
  make(scene, 'wheel', 54, 54, (ctx) => {
    const c = 27;
    ctx.fillStyle = OUTLINE; ctx.beginPath(); ctx.arc(c, c, 25, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c99a5b'; ctx.beginPath(); ctx.arc(c, c, 22.5, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#2b2b2e'; ctx.beginPath(); ctx.arc(c, c, 20, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#d8e6f5'; ctx.beginPath(); ctx.arc(c, c, 13, 0, Math.PI * 2); ctx.fill();
    // rim lettering marks
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.arc(c, c, 16.5, -0.6, 0.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(c, c, 16.5, Math.PI - 0.6, Math.PI + 0.5); ctx.stroke();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 0.8;
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      ctx.beginPath(); ctx.moveTo(c, c); ctx.lineTo(c + Math.cos(a) * 13, c + Math.sin(a) * 13); ctx.stroke();
    }
    ctx.fillStyle = '#888'; ctx.beginPath(); ctx.arc(c, c, 3, 0, Math.PI * 2); ctx.fill();
  });

  // ---------- Frame (local origin = texture centre 65,40) ----------
  make(scene, 'frame', 130, 80, (ctx) => {
    const o = (x: number, y: number) => [x + 65, y + 40];
    const RA = o(-42, 18), BB = o(-2, 24), ST = o(-16, -18), STT = o(-14, -14), HT = o(30, -14), HB = o(33, -1), FA = o(42, 18);
    // chainring + chain
    ctx.strokeStyle = '#999'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(RA[0], RA[1] - 5); ctx.lineTo(BB[0], BB[1] - 9); ctx.moveTo(RA[0], RA[1] + 5); ctx.lineTo(BB[0], BB[1] + 9); ctx.stroke();
    ctx.fillStyle = '#b8bcc4'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(BB[0], BB[1], 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const black = '#202024';
    line(ctx, [RA, BB], 4, black);
    line(ctx, [RA, STT], 3.5, black);
    line(ctx, [BB, ST], 5, black);
    line(ctx, [STT, HT], 5, black);
    line(ctx, [BB, HB], 6, black);
    line(ctx, [HT, HB], 6, black);
    line(ctx, [HB, FA], 4, black);
    // silver accent on down tube
    ctx.strokeStyle = '#c0c4cc'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(BB[0] + 6, BB[1] - 4); ctx.lineTo(HB[0] - 6, HB[1] + 3); ctx.stroke();
    // seatpost + saddle
    line(ctx, [ST, o(-17, -24)], 3, '#333');
    ctx.fillStyle = black; ctx.beginPath(); ctx.ellipse(...(o(-17, -26) as [number, number]), 10, 3, 0, 0, Math.PI * 2); ctx.fill();
    // stem + drop bars
    line(ctx, [HT, o(34, -19), o(40, -20)], 3, '#333');
    line(ctx, [o(40, -20), o(45, -17), o(45, -10), o(40, -8)], 3, '#333');
    // "TREKK" decal on down tube
    ctx.save();
    const ang = Math.atan2(HB[1] - BB[1], HB[0] - BB[0]);
    ctx.translate((BB[0] + HB[0]) / 2, (BB[1] + HB[1]) / 2);
    ctx.rotate(ang);
    ctx.fillStyle = '#fff'; ctx.font = 'italic 900 7px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('TREKK', 0, 0.5);
    ctx.restore();
  });

  // ---------- Will's head (r=12 body) — facing right ----------
  make(scene, 'head', 40, 40, (ctx) => {
    const c = 20;
    // hair tuft at back
    ctx.fillStyle = GINGER; ctx.beginPath(); ctx.ellipse(c - 10, c + 2, 4, 6, 0.3, 0, Math.PI * 2); ctx.fill();
    // face
    ctx.fillStyle = SKIN; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(c, c + 1, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // ear
    ctx.beginPath(); ctx.ellipse(c - 3, c + 2, 2.5, 3.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // nose
    ctx.beginPath(); ctx.moveTo(c + 10, c + 1); ctx.quadraticCurveTo(c + 15, c + 4, c + 10, c + 6); ctx.fill(); ctx.stroke();
    // moustache
    ctx.fillStyle = GINGER; ctx.beginPath(); ctx.ellipse(c + 8, c + 7, 5, 2, -0.1, 0, Math.PI * 2); ctx.fill();
    // stubble
    ctx.fillStyle = 'rgba(217,117,43,.35)'; ctx.beginPath(); ctx.arc(c + 3, c + 7, 7, 0.2, Math.PI - 0.6); ctx.fill();
    // grin
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.arc(c + 6, c + 8, 3.5, 0.2, 1.7); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(c + 6, c + 8.5, 2.6, 0.1, 1.6); ctx.fill();
    // helmet (white aero)
    ctx.fillStyle = '#f4f6f8'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8;
    ctx.beginPath();
    ctx.moveTo(c - 14, c - 1);
    ctx.quadraticCurveTo(c - 12, c - 15, c + 2, c - 14);
    ctx.quadraticCurveTo(c + 13, c - 13, c + 13, c - 4);
    ctx.lineTo(c - 14, c - 1);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = '#9aa3ad'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(c - 8, c - 9); ctx.lineTo(c - 3, c - 8); ctx.moveTo(c + 1, c - 10); ctx.lineTo(c + 6, c - 8); ctx.stroke();
    // strap
    ctx.strokeStyle = '#333'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(c - 4, c - 2); ctx.lineTo(c, c + 10); ctx.stroke();
    // white wraparound glasses
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.roundRect(c + 1, c - 4, 12, 6, 2.5); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c7a6d8'; ctx.beginPath(); ctx.roundRect(c + 4, c - 3, 8, 4, 1.5); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.fillRect(c - 3, c - 3, 5, 2);
  });

  // ---------- Torso: stars-and-stripes champ jersey (len 42 along x, hip at left) ----------
  make(scene, 'torso', 52, 24, (ctx) => {
    const x0 = 5, y0 = 3, w = 42, h = 18;
    ctx.save();
    ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 8); ctx.clip();
    // lower half navy shorts (hip end)
    ctx.fillStyle = NAVY; ctx.fillRect(x0, y0, 12, h);
    // stripes
    for (let i = 0; i < 4; i++) { ctx.fillStyle = i % 2 ? '#fff' : '#d22630'; ctx.fillRect(x0 + 12, y0 + (h / 4) * i, 12, h / 4); }
    // blue star chest
    ctx.fillStyle = JERSEY_BLUE; ctx.fillRect(x0 + 24, y0, w - 24, h);
    ctx.fillStyle = '#fff';
    star(ctx, x0 + 30, y0 + 5, 2.6); star(ctx, x0 + 37, y0 + 12, 2.6); star(ctx, x0 + 29, y0 + 14, 2.2); star(ctx, x0 + 38, y0 + 4, 2);
    // yellow "LDL" badge
    ctx.fillStyle = '#ffe000'; ctx.fillRect(x0 + 16, y0 + 9, 9, 8);
    ctx.fillStyle = '#0050aa'; ctx.font = '900 4.5px Arial'; ctx.fillText('LDL', x0 + 16.5, y0 + 15);
    ctx.restore();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 8); ctx.stroke();
  });

  // Limbs (drawn along x; length matches physics)
  make(scene, 'arm', 50, 14, (ctx) => capsule(ctx, 38, 7, 50, 14, [{ to: 0.4, color: JERSEY_BLUE }, { to: 1, color: SKIN }]));
  make(scene, 'thigh', 42, 16, (ctx) => capsule(ctx, 31, 10, 42, 16, [{ to: 0.75, color: NAVY }, { to: 1, color: SKIN }]));
  make(scene, 'shin', 40, 14, (ctx) => {
    capsule(ctx, 28, 8, 40, 14, [{ to: 0.45, color: SKIN }, { to: 0.85, color: '#151515' }, { to: 1, color: '#2a2a2a' }]);
  });

  // ---------- Pickups ----------
  make(scene, 'gel', 24, 34, (ctx) => {
    ctx.fillStyle = '#ff7a00'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(4, 6); ctx.lineTo(20, 6); ctx.lineTo(18, 30); ctx.lineTo(6, 30); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.fillRect(9, 2, 6, 5); ctx.strokeRect(9, 2, 6, 5);
    ctx.fillStyle = '#fff'; ctx.font = '900 7px Arial'; ctx.textAlign = 'center'; ctx.fillText('GEL', 12, 21);
  });
  make(scene, 'coffee', 30, 34, (ctx) => {
    ctx.fillStyle = '#fff'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(4, 8); ctx.lineTo(24, 8); ctx.lineTo(21, 31); ctx.lineTo(7, 31); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7b4a26'; ctx.fillRect(6, 15, 17, 8);
    ctx.fillStyle = '#333'; ctx.beginPath(); ctx.roundRect(2, 4, 24, 5, 2); ctx.fill();
    ctx.strokeStyle = '#ccc'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(10, 2); ctx.quadraticCurveTo(13, -2, 12, 1); ctx.stroke();
  });
  make(scene, 'yoghurt', 30, 34, (ctx) => {
    ctx.fillStyle = '#ffffff'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(3, 8); ctx.lineTo(27, 8); ctx.lineTo(23, 32); ctx.lineTo(7, 32); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff8fb3'; ctx.fillRect(6, 15, 18, 9);
    ctx.fillStyle = '#c0c8d0'; ctx.beginPath(); ctx.roundRect(1, 4, 28, 6, 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '900 6px Arial'; ctx.textAlign = 'center'; ctx.fillText('YOG', 15, 22);
  });
  make(scene, 'cake', 38, 34, (ctx) => {
    ctx.fillStyle = '#c98a4b'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(3, 30); ctx.lineTo(35, 30); ctx.lineTo(35, 16); ctx.lineTo(3, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#fff6c9'; ctx.beginPath(); ctx.moveTo(3, 12); ctx.lineTo(35, 16); ctx.lineTo(35, 19); ctx.lineTo(3, 15); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ff5fa2'; ctx.fillRect(10, 11, 3, 2); ctx.fillStyle = '#5fd0ff'; ctx.fillRect(20, 13, 3, 2); ctx.fillStyle = '#ffd400'; ctx.fillRect(28, 14, 3, 2);
    ctx.fillStyle = '#cfe8ff'; ctx.fillRect(18, 2, 3, 11); ctx.fillStyle = '#ffb000'; ctx.beginPath(); ctx.ellipse(19.5, 1.5, 2, 3, 0, 0, Math.PI * 2); ctx.fill();
  });

  // ---------- Cat ----------
  make(scene, 'cat', 36, 28, (ctx) => {
    ctx.fillStyle = '#e8963a'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(16, 18, 12, 8, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.arc(27, 10, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(22, 6); ctx.lineTo(23, -1); ctx.lineTo(27, 4); ctx.moveTo(28, 4); ctx.lineTo(32, -1); ctx.lineTo(33, 7); ctx.fill(); ctx.stroke();
    ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(5, 17); ctx.quadraticCurveTo(-2, 8, 4, 3); ctx.stroke();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(29, 9, 1.4, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#b5651d'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(12, 11); ctx.lineTo(12, 16); ctx.moveTo(17, 10); ctx.lineTo(17, 16); ctx.stroke();
  });

  // ---------- Horse + rider (facing right, walking away) ----------
  make(scene, 'horse', 130, 120, (ctx) => {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
    const brown = '#8a5a34';
    // legs
    ctx.fillStyle = brown;
    for (const lx of [30, 42, 86, 98]) { ctx.beginPath(); ctx.roundRect(lx, 78, 9, 40, 3); ctx.fill(); ctx.stroke(); }
    // tail
    ctx.fillStyle = '#3b2414'; ctx.beginPath(); ctx.moveTo(22, 58); ctx.quadraticCurveTo(4, 70, 10, 98); ctx.quadraticCurveTo(20, 80, 26, 64); ctx.fill(); ctx.stroke();
    // body
    ctx.fillStyle = brown; ctx.beginPath(); ctx.ellipse(66, 66, 46, 22, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // neck + head
    ctx.beginPath(); ctx.moveTo(96, 58); ctx.lineTo(110, 22); ctx.lineTo(126, 30); ctx.lineTo(118, 40); ctx.lineTo(108, 72); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#3b2414'; ctx.beginPath(); ctx.moveTo(98, 52); ctx.lineTo(108, 22); ctx.lineTo(104, 22); ctx.lineTo(93, 50); ctx.fill();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(116, 28, 1.8, 0, Math.PI * 2); ctx.fill();
    // rider: hi-vis jacket, riding hat
    ctx.fillStyle = '#d8ff2a'; ctx.beginPath(); ctx.roundRect(58, 20, 20, 30, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c0c0c0'; ctx.fillRect(58, 34, 20, 3);
    ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(70, 12, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(70, 10, 9, Math.PI, 0); ctx.fill(); ctx.fillRect(70, 8, 13, 2.5);
    ctx.fillStyle = '#2a2a2a'; ctx.beginPath(); ctx.roundRect(62, 46, 10, 26, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d8ff2a'; ctx.beginPath(); ctx.moveTo(77, 26); ctx.lineTo(96, 40); ctx.lineWidth = 6; ctx.strokeStyle = '#d8ff2a'; ctx.stroke();
  });


  // ---------- White van (overtakes in the foreground) ----------
  make(scene, 'van', 260, 120, (ctx) => {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
    ctx.fillStyle = '#f2f2f2';
    ctx.beginPath(); ctx.moveTo(10, 100); ctx.lineTo(10, 20); ctx.quadraticCurveTo(10, 10, 20, 10); ctx.lineTo(180, 10);
    ctx.lineTo(215, 50); ctx.lineTo(248, 60); ctx.quadraticCurveTo(255, 64, 255, 75); ctx.lineTo(255, 100); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#bfe6ff'; ctx.beginPath(); ctx.moveTo(185, 18); ctx.lineTo(210, 50); ctx.lineTo(185, 50); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#888'; ctx.fillRect(20, 70, 160, 4);
    ctx.fillStyle = '#d62828'; ctx.font = '900 18px Arial'; ctx.fillText('PIP PIP LTD', 30, 50);
    ctx.fillStyle = '#ffe066'; ctx.fillRect(246, 70, 9, 10);
    for (const wx of [60, 205]) { ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(wx, 100, 18, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#aaa'; ctx.beginPath(); ctx.arc(wx, 100, 8, 0, Math.PI * 2); ctx.fill(); }
  });

  // ---------- Misc ----------
  make(scene, 'blood', 8, 8, (ctx) => { ctx.fillStyle = '#c1121f'; ctx.beginPath(); ctx.arc(4, 4, 3.5, 0, Math.PI * 2); ctx.fill(); });
  make(scene, 'spark', 8, 8, (ctx) => { ctx.fillStyle = '#fff4a3'; ctx.beginPath(); ctx.arc(4, 4, 3.5, 0, Math.PI * 2); ctx.fill(); });
  make(scene, 'cloud', 200, 90, (ctx) => {
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    for (const [x, y, r] of [[50, 55, 30], [90, 40, 38], [135, 50, 32], [165, 62, 22], [70, 66, 26], [120, 66, 28]]) {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  });
}

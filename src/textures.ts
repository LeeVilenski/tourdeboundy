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
  const frameTex = (key: string, tube: string, accent: string, decal: string, decalColor = '#fff') => make(scene, key, 130, 80, (ctx) => {
    const o = (x: number, y: number) => [x + 65, y + 40];
    const RA = o(-42, 18), BB = o(-2, 24), ST = o(-16, -18), STT = o(-14, -14), HT = o(30, -14), HB = o(33, -1), FA = o(42, 18);
    // chainring + chain
    ctx.strokeStyle = '#999'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(RA[0], RA[1] - 5); ctx.lineTo(BB[0], BB[1] - 9); ctx.moveTo(RA[0], RA[1] + 5); ctx.lineTo(BB[0], BB[1] + 9); ctx.stroke();
    ctx.fillStyle = '#b8bcc4'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(BB[0], BB[1], 9, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    const black = tube;
    line(ctx, [RA, BB], 4, black);
    line(ctx, [RA, STT], 3.5, black);
    line(ctx, [BB, ST], 5, black);
    line(ctx, [STT, HT], 5, black);
    line(ctx, [BB, HB], 6, black);
    line(ctx, [HT, HB], 6, black);
    line(ctx, [HB, FA], 4, black);
    // silver accent on down tube
    ctx.strokeStyle = accent; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(BB[0] + 6, BB[1] - 4); ctx.lineTo(HB[0] - 6, HB[1] + 3); ctx.stroke();
    // seatpost + saddle
    line(ctx, [ST, o(-17, -24)], 3, '#333');
    ctx.fillStyle = '#202024'; ctx.beginPath(); ctx.ellipse(...(o(-17, -26) as [number, number]), 10, 3, 0, 0, Math.PI * 2); ctx.fill();
    // stem + drop bars
    line(ctx, [HT, o(34, -19), o(40, -20)], 3, '#333');
    line(ctx, [o(40, -20), o(45, -17), o(45, -10), o(40, -8)], 3, '#333');
    // "TREKK" decal on down tube
    ctx.save();
    const ang = Math.atan2(HB[1] - BB[1], HB[0] - BB[0]);
    ctx.translate((BB[0] + HB[0]) / 2, (BB[1] + HB[1]) / 2);
    ctx.rotate(ang);
    ctx.fillStyle = decalColor; ctx.font = 'italic 900 7px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(decal, 0, 0.5);
    ctx.restore();
  });
  frameTex('frame', '#202024', '#c0c4cc', 'TREKK');
  frameTex('frame_lee', '#1d8fb0', '#0c4f63', 'GIANNT');   // Lee's teal road bike
  frameTex('frame_andy', '#c8202a', '#ffd400', 'BIANKY');
  frameTex('frame_r1', '#f2f2f2', '#d62828', 'CANYUN', '#111');
  frameTex('frame_r2', '#ffcc00', '#111', 'PINARELO', '#111');
  frameTex('frame_r3', '#2a9d8f', '#fff', 'SPESHAL');

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


  // ================= Cast: Andy + Lee =================
  type HeadOpts = { hair: string; helmet: string; glasses: string; lens: string; mouth: 'flat' | 'smile'; stubble: string; cap?: string };
  const npcHead = (key: string, o: HeadOpts) => make(scene, key, 40, 40, (ctx) => {
    const c = 20;
    ctx.fillStyle = o.hair; ctx.beginPath(); ctx.ellipse(c - 10, c + 2, 4, 6, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = SKIN; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(c, c + 1, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(c - 3, c + 2, 2.5, 3.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(c + 10, c + 1); ctx.quadraticCurveTo(c + 15, c + 4, c + 10, c + 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = o.stubble; ctx.beginPath(); ctx.arc(c + 3, c + 7, 7, 0.2, Math.PI - 0.6); ctx.fill();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.4; ctx.beginPath();
    if (o.mouth === 'flat') { ctx.moveTo(c + 4, c + 9); ctx.lineTo(c + 9, c + 8.5); }
    else ctx.arc(c + 6, c + 7.5, 3, 0.3, 1.6);
    ctx.stroke();
    if (o.cap) { ctx.fillStyle = o.cap; ctx.beginPath(); ctx.ellipse(c + 11, c - 3, 6, 2, -0.15, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = o.helmet; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.moveTo(c - 14, c - 1); ctx.quadraticCurveTo(c - 12, c - 15, c + 2, c - 14);
    ctx.quadraticCurveTo(c + 13, c - 13, c + 13, c - 4); ctx.lineTo(c - 14, c - 1); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,.35)'; ctx.fillRect(c - 7, c - 11, 4, 6); ctx.fillRect(c + 1, c - 12, 4, 6);
    ctx.fillStyle = o.glasses; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.roundRect(c + 1, c - 4, 12, 6, 2.5); ctx.fill(); ctx.stroke();
    const gr = ctx.createLinearGradient(c + 4, c - 3, c + 12, c + 1);
    gr.addColorStop(0, o.lens); gr.addColorStop(1, '#ffffff');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.roundRect(c + 4, c - 3, 8, 4, 1.5); ctx.fill();
    ctx.fillStyle = o.glasses; ctx.fillRect(c - 3, c - 3, 5, 2);
  });
  npcHead('head_andy', { hair: '#9a9a9a', helmet: '#4a4f57', glasses: '#222', lens: '#7fb4ff', mouth: 'flat', stubble: 'rgba(120,120,120,.35)' });
  npcHead('head_lee', { hair: '#5a3a22', helmet: '#3a8de0', glasses: '#111', lens: '#333', mouth: 'smile', stubble: 'rgba(90,58,34,.3)', cap: '#111' });

  const npcTorso = (key: string, paint: (ctx: CanvasRenderingContext2D, x0: number, y0: number, w: number, h: number) => void) =>
    make(scene, key, 52, 24, (ctx) => {
      const x0 = 5, y0 = 3, w = 42, h = 18;
      ctx.save(); ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 8); ctx.clip();
      paint(ctx, x0, y0, w, h);
      ctx.restore();
      ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.roundRect(x0, y0, w, h, 8); ctx.stroke();
    });
  // Andy: red club jersey with black + yellow bands
  npcTorso('torso_andy', (ctx, x0, y0, w, h) => {
    ctx.fillStyle = '#151515'; ctx.fillRect(x0, y0, 12, h);
    ctx.fillStyle = '#d7262e'; ctx.fillRect(x0 + 12, y0, w - 12, h);
    ctx.fillStyle = '#151515'; ctx.fillRect(x0 + 24, y0, 3, h);
    ctx.fillStyle = '#ffd400'; ctx.fillRect(x0 + 27, y0, 4, h);
    ctx.fillStyle = '#151515'; ctx.fillRect(x0 + 31, y0, 3, h);
    ctx.fillStyle = '#fff'; ctx.font = '900 4.5px Arial'; ctx.fillText('MDC', x0 + 14, y0 + 11);
  });
  // Lee: black jersey with green dots
  npcTorso('torso_lee', (ctx, x0, y0, w, h) => {
    ctx.fillStyle = '#151515'; ctx.fillRect(x0, y0, w, h);
    ctx.fillStyle = '#2bb24c';
    for (let i = 0; i < 4; i++) for (let j = 0; j < 3; j++) { ctx.beginPath(); ctx.arc(x0 + 22 + i * 5, y0 + 4 + j * 5, 1.4, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#fff'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(x0 + 16, y0 + 4 + i * 5, 1, 0, Math.PI * 2); ctx.fill(); }
  });
  make(scene, 'arm_andy', 50, 14, (ctx) => capsule(ctx, 38, 7, 50, 14, [{ to: 0.4, color: '#d7262e' }, { to: 1, color: SKIN }]));
  make(scene, 'arm_lee', 50, 14, (ctx) => capsule(ctx, 38, 7, 50, 14, [{ to: 0.4, color: '#151515' }, { to: 1, color: SKIN }]));
  make(scene, 'thigh_dark', 42, 16, (ctx) => capsule(ctx, 31, 10, 42, 16, [{ to: 0.75, color: '#151515' }, { to: 1, color: SKIN }]));
  make(scene, 'shin_white', 40, 14, (ctx) => capsule(ctx, 28, 8, 40, 14, [{ to: 0.45, color: SKIN }, { to: 0.85, color: '#f2f2f2' }, { to: 1, color: '#f2f2f2' }]));

  // Lee's navy + light blue "VIKNG" tandem (origin = texture centre 100,40)
  make(scene, 'tandem', 200, 80, (ctx) => {
    const o = (x: number, y: number) => [x + 100, y + 40];
    const RA = o(-70, 18), FA = o(70, 18), BB1 = o(26, 24), BB2 = o(-46, 24);
    const S1 = o(12, -16), S2 = o(-56, -16), HT = o(56, -14), HB = o(59, -1);
    for (const bb of [BB1, BB2]) { ctx.fillStyle = '#b8bcc4'; ctx.strokeStyle = OUTLINE; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(bb[0], bb[1], 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); }
    const navy = '#22307e', light = '#6ec1ff';
    line(ctx, [RA, BB2], 4, navy); line(ctx, [RA, S2], 3.5, navy);
    line(ctx, [BB2, S2], 5, navy); line(ctx, [BB1, S1], 5, navy);
    line(ctx, [S2, S1], 5, navy); line(ctx, [S1, HT], 5, navy);
    line(ctx, [BB2, BB1], 4.5, light); line(ctx, [BB2, HB], 4.5, light);
    line(ctx, [HT, HB], 6, navy); line(ctx, [HB, FA], 4, navy);
    line(ctx, [S2, o(-57, -24)], 3, '#333'); line(ctx, [S1, o(11, -24)], 3, '#333');
    ctx.fillStyle = '#111';
    ctx.beginPath(); ctx.ellipse(...(o(-58, -26) as [number, number]), 10, 3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(...(o(10, -26) as [number, number]), 10, 3, 0, 0, Math.PI * 2); ctx.fill();
    line(ctx, [o(8, -20), o(-30, -22), o(-32, -15)], 2.5, '#333'); // stoker bars off the captain's seatpost
    line(ctx, [HT, o(60, -19), o(66, -20)], 3, '#333');
    line(ctx, [o(66, -20), o(71, -17), o(71, -10), o(66, -8)], 3, '#333');
    ctx.save(); ctx.translate((S2[0] + S1[0]) / 2, S1[1] + 0.5);
    ctx.fillStyle = '#fff'; ctx.font = 'italic 900 7px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('VIKNG', 0, 0);
    ctx.restore();
  });


  // Bunch riders (level 5)
  const rivals: [string, string, string][] = [['#2c7be5', '#ffffff', '#2c7be5'], ['#ff7a1a', '#111111', '#ff7a1a'], ['#6a4c93', '#ffd400', '#6a4c93']];
  rivals.forEach(([main, band, sleeve], i) => {
    npcTorso(`torso_r${i + 1}`, (ctx, x0, y0, w, h) => {
      ctx.fillStyle = '#151515'; ctx.fillRect(x0, y0, 12, h);
      ctx.fillStyle = main; ctx.fillRect(x0 + 12, y0, w - 12, h);
      ctx.fillStyle = band; ctx.fillRect(x0 + 22, y0 + h / 2 - 2, w - 22, 4);
    });
    make(scene, `arm_r${i + 1}`, 50, 14, (ctx) => capsule(ctx, 38, 7, 50, 14, [{ to: 0.4, color: sleeve }, { to: 1, color: SKIN }]));
    npcHead(`head_r${i + 1}`, { hair: ['#2b1a0e', '#d9a066', '#111'][i], helmet: ['#ffffff', '#ff7a1a', '#222'][i], glasses: '#111', lens: ['#ff5fa2', '#5fd0ff', '#ffd400'][i], mouth: 'flat', stubble: 'rgba(0,0,0,.08)' });
  });

  // ================= Critters + people =================
  make(scene, 'sheep', 52, 38, (ctx) => {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2;
    ctx.fillStyle = '#222'; for (const lx of [12, 20, 32, 40]) ctx.fillRect(lx, 26, 4, 11);
    ctx.fillStyle = '#f4f1ea';
    for (const [x, y, r] of [[14, 18, 9], [24, 13, 10], [34, 17, 9], [22, 22, 9], [32, 23, 8], [12, 23, 7]]) { ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#222'; ctx.beginPath(); ctx.ellipse(44, 16, 7, 6, 0.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(46, 14, 1.5, 0, Math.PI * 2); ctx.fill();
  });
  make(scene, 'pony', 120, 96, (ctx) => {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5; const b = '#5a3a22';
    ctx.fillStyle = b; for (const lx of [26, 36, 74, 84]) { ctx.beginPath(); ctx.roundRect(lx, 58, 8, 36, 3); ctx.fill(); ctx.stroke(); }
    ctx.fillStyle = '#2b1a0e'; ctx.beginPath(); ctx.moveTo(18, 44); ctx.quadraticCurveTo(4, 56, 10, 78); ctx.quadraticCurveTo(18, 62, 22, 50); ctx.fill();
    ctx.fillStyle = b; ctx.beginPath(); ctx.ellipse(56, 50, 40, 18, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(84, 44); ctx.lineTo(98, 16); ctx.lineTo(114, 24); ctx.lineTo(106, 34); ctx.lineTo(94, 58); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2b1a0e'; for (let i = 0; i < 6; i++) { ctx.beginPath(); ctx.ellipse(88 + i * 2, 22 + i * 5, 4, 3, 0.5, 0, Math.PI * 2); ctx.fill(); }
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(104, 22, 1.8, 0, Math.PI * 2); ctx.fill();
  });
  make(scene, 'dogwalker', 100, 116, (ctx) => {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.2;
    // person (walking right) — waxed jacket + flat cap
    ctx.fillStyle = '#2f3b2a'; ctx.beginPath(); ctx.roundRect(28, 76, 9, 38, 3); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.roundRect(40, 76, 9, 38, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#5d6b3a'; ctx.beginPath(); ctx.roundRect(24, 34, 30, 48, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(40, 22, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#7a6a4f'; ctx.beginPath(); ctx.ellipse(41, 13, 13, 5, -0.1, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    // lead + dog
    ctx.strokeStyle = '#c0392b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(52, 58); ctx.quadraticCurveTo(66, 80, 78, 82); ctx.stroke();
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.2; ctx.fillStyle = '#1d1d1d';
    ctx.beginPath(); ctx.ellipse(76, 96, 16, 8, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(92, 88, 7, 0, Math.PI * 2); ctx.fill();
    for (const lx of [64, 70, 82, 88]) ctx.fillRect(lx, 100, 3, 13);
    ctx.beginPath(); ctx.moveTo(60, 94); ctx.lineTo(54, 86); ctx.lineWidth = 3; ctx.strokeStyle = '#1d1d1d'; ctx.stroke();
  });
  make(scene, 'hiker', 70, 116, (ctx) => {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.2;
    ctx.fillStyle = '#4a4a55'; ctx.beginPath(); ctx.roundRect(22, 74, 9, 40, 3); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.roundRect(34, 74, 9, 40, 3); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ff7a1a'; ctx.beginPath(); ctx.roundRect(6, 34, 18, 36, 6); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#2c7be5'; ctx.beginPath(); ctx.roundRect(18, 32, 30, 46, 8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = SKIN; ctx.beginPath(); ctx.arc(34, 20, 11, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(34, 14, 11, Math.PI, 0); ctx.fill();
    ctx.strokeStyle = '#999'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(48, 54); ctx.lineTo(60, 114); ctx.stroke();
  });
  make(scene, 'brokenbike', 84, 46, (ctx) => {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 3;
    ctx.fillStyle = 'rgba(0,0,0,0)';
    ctx.beginPath(); ctx.ellipse(20, 26, 17, 12, 0.5, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(64, 28, 16, 0, Math.PI * 2); ctx.stroke();
    line(ctx, [[20, 26], [40, 30], [52, 12], [64, 28]], 4, '#e5e5e5');
    line(ctx, [[40, 30], [34, 10]], 3, '#e5e5e5');
    ctx.fillStyle = '#111'; ctx.fillRect(28, 6, 12, 4);
  });
  make(scene, 'streak', 60, 4, (ctx) => { ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fillRect(0, 1, 60, 2); });
  make(scene, 'train', 460, 70, (ctx) => {
    ctx.strokeStyle = OUTLINE; ctx.lineWidth = 2.5;
    for (let i = 0; i < 3; i++) {
      const x = 4 + i * 150;
      ctx.fillStyle = '#1f4f8f'; ctx.beginPath(); ctx.roundRect(x, 8, 146, 52, i === 0 ? [20, 6, 6, 6] : 6); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e8e8e8'; ctx.fillRect(x + 2, 40, 142, 6);
      ctx.fillStyle = '#bfe6ff'; for (let w = 0; w < 5; w++) ctx.fillRect(x + 14 + w * 26, 18, 18, 14);
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(x + 24, 62, 7, 0, Math.PI * 2); ctx.arc(x + 122, 62, 7, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#ffd400'; ctx.fillRect(4, 22, 10, 30);
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

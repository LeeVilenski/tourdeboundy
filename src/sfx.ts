// Tiny synthesised sound effects (no audio files needed).
let ctx: AudioContext | null = null;
let muted = false;
try { muted = localStorage.getItem('tdb-muted') === '1'; } catch { /* ignore */ }

function ac() {
  if (!ctx) { try { ctx = new AudioContext(); } catch { return null; } }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq: number, dur: number, type: OscillatorType = 'square', vol = 0.08, slide = 0, delay = 0) {
  if (muted) return;
  const a = ac(); if (!a) return;
  const t = a.currentTime + delay;
  const o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(a.destination); o.start(t); o.stop(t + dur);
}

function noise(dur: number, vol = 0.2) {
  if (muted) return;
  const a = ac(); if (!a) return;
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 2;
  const s = a.createBufferSource(), g = a.createGain();
  g.gain.value = vol; s.buffer = buf; s.connect(g).connect(a.destination); s.start();
}

export const sfx = {
  get muted() { return muted; },
  toggle() { muted = !muted; try { localStorage.setItem('tdb-muted', muted ? '1' : '0'); } catch { /* ignore */ } return muted; },
  unlock() { ac(); },
  crash() { noise(0.35, 0.35); tone(120, 0.3, 'sawtooth', 0.1, -80); },
  pickup() { tone(880, 0.08, 'square', 0.06); tone(1320, 0.12, 'square', 0.06, 0, 0.07); },
  bad() { tone(300, 0.25, 'sawtooth', 0.07, -150); },
  beep() { tone(1500, 0.07, 'square', 0.05); tone(1500, 0.07, 'square', 0.05, 0, 0.12); tone(1500, 0.07, 'square', 0.05, 0, 0.24); },
  meow() { tone(700, 0.35, 'triangle', 0.1, 500); },
  neigh() { for (let i = 0; i < 6; i++) tone(900 - i * 60, 0.08, 'sawtooth', 0.06, 200, i * 0.07); },
  horn() { tone(420, 0.15, 'square', 0.07); tone(420, 0.2, 'square', 0.07, 0, 0.22); },
  win() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.2, 'square', 0.07, 0, i * 0.13)); },
  buzz(ms: number | number[]) { if (!muted) try { navigator.vibrate?.(ms); } catch { /* ignore */ } },
  roar() { noise(1.6, 0.25); [392, 523, 659].forEach((f, i) => tone(f, 0.5, 'triangle', 0.05, 0, 0.3 + i * 0.12)); },
  click() { tone(600, 0.05, 'square', 0.05); },
};

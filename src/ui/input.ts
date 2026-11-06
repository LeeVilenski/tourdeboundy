import type { Controls } from '../entities/Rider';

export const input: Controls = { pedal: false, brake: false, leanBack: false, leanFwd: false, sprint: false, hop: false };

const KEYMAP: Record<string, keyof Controls> = {
  ArrowUp: 'pedal', KeyW: 'pedal',
  ArrowDown: 'brake', KeyS: 'brake',
  ArrowLeft: 'leanBack', KeyA: 'leanBack',
  ArrowRight: 'leanFwd', KeyD: 'leanFwd',
  ShiftLeft: 'sprint', ShiftRight: 'sprint', Space: 'hop', KeyJ: 'hop',
};

export const isTouch = () => 'ontouchstart' in window || matchMedia('(pointer: coarse)').matches;

let wired = false;
export function wireInput() {
  if (wired) return;
  wired = true;
  window.addEventListener('keydown', (e) => {
    const k = KEYMAP[e.code];
    if (k) { if (k === 'hop' && !input.hop) input.hopAt = performance.now(); (input as any)[k] = true; e.preventDefault(); }
  });
  window.addEventListener('keyup', (e) => { const k = KEYMAP[e.code]; if (k) (input as any)[k] = false; });
  window.addEventListener('blur', () => { for (const k in input) (input as any)[k] = false; });

  document.querySelectorAll<HTMLButtonElement>('#touch button').forEach((btn) => {
    const key = btn.dataset.key as string;
    const on = (e: Event) => { e.preventDefault(); if (key === 'hop') input.hopAt = performance.now(); (input as any)[key] = true; btn.classList.add('down'); };
    const off = (e: Event) => { e.preventDefault(); (input as any)[key] = false; btn.classList.remove('down'); };
    btn.addEventListener('pointerdown', (e) => { btn.setPointerCapture(e.pointerId); on(e); });
    btn.addEventListener('pointerup', off);
    btn.addEventListener('pointercancel', off);
    btn.addEventListener('lostpointercapture', off);
    btn.addEventListener('contextmenu', (e) => e.preventDefault());
  });
}

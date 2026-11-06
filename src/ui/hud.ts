const $ = (id: string) => document.getElementById(id)!;

export const hud = {
  show(touch: boolean) {
    $('hud').classList.remove('hidden');
    $('touch').classList.toggle('hidden', !touch);
  },
  hide() {
    $('hud').classList.add('hidden');
    $('touch').classList.add('hidden');
    $('garmin').classList.add('hidden');
  },
  set(timeMs: number, dist: string, yog: number, stamina: number, kmh = 0) {
    $('hud-speed').textContent = `${Math.round(kmh)} km/h`;
    $('hud-speed').classList.toggle('fast', kmh > 46);
    const s = timeMs / 1000;
    $('hud-time').textContent = `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, '0')}`;
    $('hud-dist').textContent = dist;
    $('hud-yog').textContent = `🥛 ${yog}`;
    ($('stamina-fill') as HTMLElement).style.width = `${Math.round(stamina * 100)}%`;
  },
  garmin(title: string, msg: string) {
    $('garmin-title').textContent = title;
    $('garmin-msg').textContent = msg;
    const g = $('garmin');
    g.classList.remove('hidden', 'shake');
    void g.offsetWidth;
    g.classList.add('shake');
  },
  hideGarmin() { $('garmin').classList.add('hidden'); },
  garminVisible() { return !$('garmin').classList.contains('hidden'); },
  onGarminTap(fn: () => void) {
    const g = $('garmin');
    g.onpointerdown = (e) => { e.preventDefault(); fn(); };
  },
  onPause(fn: () => void) { ($('btn-pause') as HTMLElement).onclick = fn; },
};

# Tour de Boundy

A cartoon physics cycling game starring Will Boundy. See [DESIGN.md](DESIGN.md) for the full plan.

## Run locally
```bash
npm install
npm run dev
```
Open the printed URL. Add `?level=3` to jump straight into a level, `?all` to unlock every level (normally they unlock one at a time), or `?debug` to see physics outlines.

## Deploy (Vercel)
Import the repo in Vercel. It detects Vite automatically: build command `npm run build`, output folder `dist`.

## Controls
- Desktop: ↑/W pedal · ↓/S brake · ←/→ lean · Space hop · Shift sprint · G ignore Garmin · R restart · P pause
- Mobile: on-screen buttons (landscape)

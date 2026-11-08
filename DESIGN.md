# Tour de Boundy — Design Plan

A cartoon physics cycling game starring Willem "Will" Boundy. It's a ragdoll side-scroller with slapstick crashes and a touch of blood, set on Devon roads. It runs in the browser on mobile and desktop and is hosted on Vercel.

The game is an original design in the ragdoll-physics genre. All art is drawn for this game, and real brand logos are swapped for parody versions (for example, "LDL" instead of Lidl and "TREKK" instead of Trek).

---

## 1. Characters

### Will Boundy (player)
- **Look:** ginger hair and moustache, big grin, white aero helmet, white wraparound glasses.
- **Race kit:** blue jersey with white stars over red and white stripes, a yellow sponsor badge (parody Lidl-Trek US champion kit), navy bib shorts, black socks.
- **Bike:** black and silver carbon "TREKK", deep carbon wheels, tan-wall tyres.
- **Unlockable skins:**
  - Olive gilet with black arm warmers (training kit).
  - Exeter Wheelers bib #13.
  - Off-duty look: backwards cap, aviators and patterned shirt.
  - Eddy Merckx cycling cap under the helmet.
- **Personality:** a daredevil who never rests. Every line is about racing, never about recovery.

### Garmin (running gag)
- A watch widget in the corner of the HUD. It keeps popping up messages like "RECOVERY TIME: 72 HRS", "Consider resting", or "Your body needs sleep". Tapping it swats it away and gives a small speed boost, and Will answers back with a line.
- The number of times it was ignored is shown on the results screen.
- On the final level it gives up: "Fine. Do what you want."

### Lee Pollard (sidekick cameo, levels 2–4)
- **Look:** tall and slim, dark shades, blue helmet with a cap underneath, black kit.
- **Bike:** a teal "GIANNT" road bike.
- **Gag:** he rides alongside Will and keeps hitting bollards. He cartwheels off, dusts himself down and catches back up. The results screen shows a "Bollards hit: N" counter.
- He can also act as an obstacle if Will is following him too closely.

### Andy Friend (final boss, level 5)
- **Look:** short grey hair, stern face, mirrored wraparound shades, dark grey helmet, red Mid-Devon CC-style jersey with black and yellow bands.
- **Behaviour:** he sits on Will's wheel and copies his speed. He never comes round to take a turn at the front. He launches his sprint near the line, so Will has to make him go early or out-time him.
- **Trash talk** (speech bubbles from behind):
  - "Cheers for the tow."
  - "Tactical racing, son."
  - "I'm just resting here, you do the work."
  - "Your Garmin's right, you look tired."
- **Easter egg:** he eats Haribo while sitting on Will's wheel.

### Will's catchphrases
- "Rest day? Never heard of her."
- "Garmin says recover. Garmin's not racing."
- "Legs are fine. Legs are always fine."
- "Is this a climb or a warm-up?"
- "Recovery is for people who stop."
- After a crash: "Flesh wound. Still on for the run later."
- After a crash: "That's a Strava segment, that is."

---

## 2. Controls

| Action | Desktop | Mobile |
|---|---|---|
| Pedal | ↑ / W | Right-side button |
| Brake / back pedal | ↓ / S | Left-side button |
| Lean back | ← / A | Tilt buttons (left) |
| Lean forward | → / D | Tilt buttons (right) |
| Sprint (uses stamina) | Shift / Space | Big "SPRINT" button |
| Restart from checkpoint | R | Restart button |

- **Stamina bar:** sprinting drains it, and gels and coffee refill it.
- **Crashing:** Will turns into a ragdoll when his head or body hits something hard or the bike lands badly. Blood is kept small and slapstick: a splat effect, a plaster afterwards, and a short respawn at the last checkpoint.
- **Tricks:** big air and flips earn "Daredevil" bonus points.

## 3. Pickups

| Item | Effect |
|---|---|
| Energy gel | Restores stamina |
| Coffee | Short speed boost |
| Yoghurt | Bonus points, and the main joke prize |
| **Cake** | **Trap:** Will refuses it and loses momentum ("Not a chance.") |

---

## 4. Levels (5)

Each level ends at a finish line. Will is handed a single pot of yoghurt as his prize, then announces another workout and leaves:

| # | Level | Based on | Terrain and obstacles | Post-level gag |
|---|---|---|---|---|
| 1 | **Devon Lanes** (tutorial) | Hedge-lined back lanes | Gentle hills, horse riders (with a warning sign), a tractor, potholes, a cat | "Quick paddleboard, anyone?" |
| 2 | **The MMM** | Mamhead loop: Exminster → Powderham → Starcross/Cockwood → climb to Mamhead → down through Kenn and Kennford | Flat estuary section with trains and the sea wall, then a brutal Mamhead climb and a steep wooded descent. Cars on blind bends. Lee joins and hits bollards in Kenn. | "Right, boxing session." |
| 3 | **Haldon Descent** | Haldon Hill and forest | Long fast descent with gravel, dog walkers, pedestrians and cats, plus big jumps | "Just a quick 10k run." |
| 4 | **Wheelers Hill Climb** | Exeter Wheelers club event up Pennsylvania Road | Uphill all the way to a 25% wall, crowds and a devil superfan; beat a see-through Andy's time for the KOM | — |
| 5 | **Sidmouth Switchbacks** | Esplanade, Peak Hill, Ladram Bay, Salcombe Hill, Weston, Branscombe | Donkeys, ice cream van, seagulls, beach balls rolling downhill, groynes to hop, cream-tea cakes | — |
| 6 | **Dartmoor (Nello-length)** | Open moor, endurance level | Cattle grids, sheep and ponies, wind gusts, rough tracks, a long run of climbs and descents. A distance counter ticks toward 100 miles. Lee shows up again. | "100 miles? Warm-up. Swim time." |
| 7 | **Torbay Velodrome Showdown** | The sprint race where Will crashed | A 3-lap race in a bunch, with banked corners, crowds and a lap-2 pile-up, ending in a sprint with Andy on his wheel. One corner has a "Will crashed here" plaque. | Final ending (see below) |

### Ending
Will beats Andy, stands on the podium and receives one pot of yoghurt. The Garmin flashes "REST", Will says "Nah, off for a run," and jogs out of shot. Andy mutters "tactical" in the background, and Lee hits one last bollard.

Results screen stats: time, crashes, Garmin warnings ignored, bollards hit by Lee, cake refused, yoghurts collected.

---

## 5. Art and audio

- **Style:** flat vector cartoon with bold outlines and bright colours. Will has a large head, a small body and expressive eyes.
- **Backgrounds:** parallax layers of Devon hedges, the Exe estuary, Haldon forest, Dartmoor tors and Torquay seafront.
- **Audio:** cheerful chiptune or acoustic loops, freewheel clicks, a crash "thwack", a horse neigh, and an angry "pip pip" from car horns.

## 6. Technology

- **Engine:** [Phaser 3](https://phaser.io) with Matter.js physics for the ragdoll and bike joints.
- **Build:** Vite and TypeScript, producing a static build that deploys to Vercel with no server.
- **Art:** SVG and canvas drawn in code at first, so there are no external asset dependencies. Hand-drawn sprites can replace them later.
- **Responsive:** landscape layout with on-screen touch controls on mobile. Portrait mode shows a "rotate your phone" prompt.
- **Saving:** level progress and best times are kept in localStorage.

### Repo layout (planned)
```
/src
  main.ts            game config and boot
  scenes/            Boot, Menu, LevelSelect, Level, Results
  entities/          Rider (ragdoll + bike), Lee, Andy, Obstacles, Pickups
  levels/            level1.ts … level5.ts (terrain points, obstacles, checkpoints)
  ui/                HUD, Garmin widget, touch controls
/public              icons, audio
DESIGN.md
```

## 7. Build order

1. Project scaffold with Vite, Phaser and the Vercel config.
2. Bike and rider physics with ragdoll crashes, on a test hill.
3. Level 1 with the HUD, Garmin widget, pickups, finish and results. **First playable version to share.**
4. Levels 2–4 and Lee's behaviour.
5. Level 5 and the Andy boss AI.
6. Polish: audio, skins, menu, mobile testing, and deployment to Vercel.

## 8. Open questions
- Should Lee ride the tandem (current plan) or a normal road bike?
- Any other cameos, such as clubmates appearing as background riders?

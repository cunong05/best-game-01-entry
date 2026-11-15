# Astro Post — Parcel Run

A complete, original 2D arcade game for the make.fun best-game-01 bounty.
You fly a courier ship through a busy orbital lane: pick up each colour-coded
parcel and dock it at the station of the same colour. Deliver all 10 parcels
to complete the route. Asteroids drift across the lane and patrol drones sweep
back and forth — three hull hits and the run is over.

## How to play

- **WASD / Arrow keys** — thrust
- **Space or mouse click** — boost (toward the mouse while it moves, else
  along the nose; costs boost meter, which recharges over time)
- **P** — pause, **M** — mute, **R** — restart, **Enter** — launch

Scoring: 1,000 points per delivery, plus a speed bonus for fast deliveries
and a combo bonus for consecutive deliveries without taking a hit. A parcel
left waiting too long (25 s) is lost and a fresh one is issued.

## Run it

```sh
node serve.ts        # serves game/ on http://localhost:8080
```

No build step, no network requests: every script, sound and pixel is a static
file under `game/` or generated at runtime (WebAudio synth for sound effects).

## Files

- `game/index.html` — the page; `game/src/` — the game itself:
  `config.js` (tuning), `random.js` (seeded RNG), `input.js` (keyboard and
  mouse), `audio.js` (WebAudio synth), `world.js` (simulation),
  `render.js` (canvas drawing and screens), `shots.js` (deterministic
  screenshot scenes), `main.js` (game loop).
- `main.ts` — the entrypoint: copies `game/` and `screenshots/` to `/output`
  and writes `/output/dossier.json` with the vendored make.fun library.
- `serve.ts` — tiny static server for local play.
- `screenshots/` — 4 real renders of the game (title, play, victory, loss).

## License

MIT — see `LICENSE`.

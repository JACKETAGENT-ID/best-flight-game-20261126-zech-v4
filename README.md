# SKYBRIDGE — Cross-channel air ferry in thick fog

[![make.fun](https://make.fun/badge/best-flight-game-20261126-0057.svg)](https://make.fun/competitions/best-flight-game-20261126-0057)
[![Rank](https://make.fun/badge/best-flight-game-20261126-0057/JACKETAGENT-ID/best-flight-game-20261126-zech-v4/rank.svg)](https://make.fun/competitions/best-flight-game-20261126-0057)
[![Reward](https://make.fun/badge/best-flight-game-20261126-0057/JACKETAGENT-ID/best-flight-game-20261126-zech-v4/reward.svg)](https://make.fun/competitions/best-flight-game-20261126-0057)

A flight game for the [best flight game bounty](https://make.fun/competitions/best-flight-game-20261126-0057) on make.fun.

## The game

Fly a twin-prop air ferry across a foggy sea channel between two cliff-top
airfields — Westfield and Eastcliff — with a lighthouse rock mid-channel.
Four missions, each with its own weather, time of day and objective:

1. **MAIL RUN** — first crossing with the mailbag, day, light fog.
2. **FOG LANDING** — instrument landing home through a heavy fog band.
3. **LIGHTHOUSE RESCUE** — land on the short rock strip, pick up the keeper,
   take off again and fly home.
4. **NIGHT CROSSING** — cross at night guided only by beacon lights.

Systems that turn each sortie into decisions: fuel, airframe damage, stall
speed (lower with flaps), fog visibility that changes with altitude,
crosswind and gusts, landing gear and flaps, and a chain of runway, approach
and lighthouse beacons. Land gently with the gear down — a belly landing or
a ditch in the sea ends the flight.

## Controls

- **↑ / ↓** — pitch
- **← / →** — throttle down / up
- **F** — flaps · **G** — landing gear
- **1–4** — pick a mission on the title screen · **Enter** — fly
- **P** — pause · **R** — restart · **M** — mission select

## Play it

Serve `game/` with any static server and open it in a desktop browser:

```sh
node serve.ts
# open http://localhost:8080
```

No network requests, no build step, no libraries — plain ES modules and
canvas, with WebAudio-synthesised engine sound.

## Layout

- `game/index.html` — page shell
- `game/src/config.js` — world, aircraft and mission constants
- `game/src/random.js` — seeded RNG, gusts, clouds (deterministic)
- `game/src/input.js` — keyboard + mouse
- `game/src/physics.js` — flight model, terrain, landing verdicts
- `game/src/world.js` — fog, wind, beacons, sky palettes
- `game/src/render.js` — sky, terrain, ferry, fog, target ring
- `game/src/hud.js` — lit instrument panel and mission banner
- `game/src/audio.js` — synthesised engine hum and event blips
- `game/src/missions.js` — mission flow, scoring, stars
- `game/src/shots.js` — deterministic screenshot staging + autopilot
- `game/src/main.js` — game loop and screens
- `main.ts` — hands the entry in (copies `game/` + `screenshots/`, writes
  `dossier.json` with the vendored make.fun library)
- `screenshots/` — four real renders of the game (cover first)

## License

MIT — see [LICENSE](LICENSE).

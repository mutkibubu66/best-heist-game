# MIDNIGHT VAULT

[![make.fun · best-heist-game-20261122-0559](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![rank](https://make.fun/badge/best-heist-game-20261122-0559/mutkibubu66/best-heist-game/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)
[![reward](https://make.fun/badge/best-heist-game-20261122-0559/mutkibubu66/best-heist-game/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559?utm_source=github&utm_medium=readme&utm_campaign=best-heist-game-20261122-0559)

A top-down heist game, built for the make.fun bounty **"Make the best heist game"** (`best-heist-game-20261122-0559`). Slip past the guards, dodge the sweeping security cameras, crack the vault, grab every last bit of loot — and get out before the alarm hits 100%.

## The job

Three heists, rising heat:

1. **The Gallery** — 2 guards, 2 cameras, 3 gold, 1 vault.
2. **The Bank Floor** — 3 guards, 2 cameras, 4 gold, 1 diamond, 1 vault.
3. **The Vault Row** — 4 guards, 3 cameras, 5 gold, 2 diamonds, 1 vault.

Guards patrol with vision cones and a detection meter — get spotted and they chase. Cameras sweep their cones and feed the alarm fast. Shadows hide you; sneaking slows you down but keeps you quiet. The exit only opens once every loot item is taken and the vault is cracked. Clear a level fast and unseen for time and ghost bonuses. Three lives; getting caught costs one and bumps the alarm.

## Controls

| Input | Action |
|---|---|
| WASD / Arrow keys | Move |
| Shift | Sneak (slower, harder to spot) |
| E (hold) | Crack the vault / disable a camera (stand beside it) |
| Mouse click | Walk to that spot |
| P | Pause |
| M | Mute |
| Enter | Start / next heist / retry |

## Play it

No build step, no network requests — plain static files under `game/`:

```sh
node serve.ts
# open http://localhost:8080
```

Or serve `game/` with any static HTTP server and open `game/index.html`.

## Shots

`screenshots/` holds 4 real renders of the game's own code (taken with
`node scripts/shot-game.mjs` against the local server, `?shot=start|play|alert|end`):
`1-start.jpg` is the cover — the thief crossing a room under the guards' cones,
cameras sweeping, the vault and the alarm meter all in one frame.

## Checks

```sh
node scripts/validate-levels.mjs   # grid shape, reachable objectives, walkable patrols
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts   # writes out/dossier.json
```

`main.ts` is the entry program: it copies `game/` and `screenshots/` to
`/output` and writes `/output/dossier.json` with the vendored make.fun library.

## License

MIT — see [LICENSE](LICENSE).

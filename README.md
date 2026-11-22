[![make.fun](https://make.fun/badge/best-heist-game-20261122-0559.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![Rank](https://make.fun/badge/best-heist-game-20261122-0559/oponopon31/best-heist-game-20261122-0559/rank.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)
[![Reward](https://make.fun/badge/best-heist-game-20261122-0559/oponopon31/best-heist-game-20261122-0559/reward.svg)](https://make.fun/bounty/best-heist-game-20261122-0559)

# MIDNIGHT VAULT

A top-down 2D stealth heist game, built for make.fun's **best heist game** bounty. Cross a night gallery, lift the loot, crack the vault, and slip out to the getaway van — without the guards or their cameras catching you.

## How to play

- **WASD / arrow keys** — move the thief
- **Shift** — sneak (slower, harder to spot)
- **Mouse click** — throw the selected tool at the cursor
- **E / Space** — grab loot, pick the vault, slip out the exit
- **1 / 2 / 3** or **Q** — choose / cycle tools: smoke pellet, EMP dart, lockpick
- **P / Esc** — pause · **R** — restart the level · **Enter** — start / continue

## The heist

Three galleries, rising difficulty: more guards, more cameras, tighter patrols. Guards sweep vision cones across the floor; cameras sweep from the walls. Being seen raises the **alarm meter** — it decays when you break line of sight, but a full meter brings every guard converging on you, and a guard who touches you ends the run. A fair grace window and a visible **SPOTTED!** warning come first.

Tools cost you nothing but their limited count: smoke blinds cones and stuns nearby guards, an EMP dart shuts one camera down for six seconds, and the lockpick cracks the vault holding each gallery's star piece. Steal the star piece, then reach the van. Your haul and rating (up to **S — GHOST**) are shown on the getaway screen.

All art is drawn on canvas and all sound is synthesised with WebAudio — no assets, no network, no build step.

## Run it

```sh
node serve.ts   # serves game/ at http://localhost:8080
```

Open `game/index.html` in desktop Chrome. Screenshots are staged with `?shot=cover|play|escape&seed=1`.

## Hand in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

`main.ts` copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the vendored make.fun library.

## License

MIT — see [LICENSE](LICENSE).

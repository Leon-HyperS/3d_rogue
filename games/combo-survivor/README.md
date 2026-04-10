# Combo Survivor

`Combo Survivor` is a compact 3D action-roguelike prototype that mixes wave-survival pressure, a fixed Hades-like camera, and a fighting-game-inspired combo core.

## Folder Layout

- `docs/` contains the game-specific art direction, PRD, TDD, and implementation plan
- `public/` contains the runnable static game
- `public/assets/` contains the curated runtime asset subset for this prototype

## Run Locally

Serve the `public/` folder over HTTP.

Example:

```powershell
python -m http.server 4173 --directory "C:\Program Files\code\game_8_cursor\games\combo-survivor\public"
```

Then open:

- `http://127.0.0.1:4173/`

## Smoke Test

With the local server running, execute the focused browser smoke test:

```powershell
node "C:\Program Files\code\game_8_cursor\games\combo-survivor\tests\smoke.cdp.mjs"
```

## Controls

- `WASD` or arrows: move
- `Space`: attack / advance combo
- `F`: special burst
- `Shift`: dodge / wave-dash
- `Enter`: choose highlighted level-up draft
- `1`, `2`, `3`: choose level-up draft card directly
- `R`: restart

## Purpose

This game exists to validate:

- the 3D workflow in `GAME_DEV_SKILLS_WORKFLOW.md`
- local curated asset use from `Free_Assets/`
- Three.js combat implementation with camera-relative movement
- a mixed combat model with manual combo strings and auto-triggered drafted skills
- future smoke-test seams for browser verification


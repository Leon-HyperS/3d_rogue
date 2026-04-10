# Relic Run

`Relic Run` is a small 3D test game built to exercise the repo's game-creation workflow, local asset library, and Three.js skill guidance.

## Folder Layout

- `docs/` contains the game-specific art direction, PRD, TDD, and implementation plan
- `public/` contains the runnable static game
- `public/assets/` contains the curated runtime asset subset for this prototype

## Run Locally

Serve the `public/` folder over HTTP.

Example:

```powershell
python -m http.server 4173 --directory "C:\Program Files\code\game_8_cursor\games\relic-run\public"
```

Then open:

- `http://127.0.0.1:4173/`

## Controls

- `WASD` or arrows: move
- `Shift`: sprint
- `E`: interact
- `R`: restart

## Purpose

This game is intentionally small and exists primarily to validate:

- the playbook in `GAME_DEV_SKILLS_WORKFLOW.md`
- curated asset use from `Free_Assets/`
- Three.js gameplay implementation with local GLTF assets
- future iterative improvement and testability


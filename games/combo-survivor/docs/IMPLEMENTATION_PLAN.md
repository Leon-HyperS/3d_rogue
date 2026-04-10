# Implementation Plan

## Goal

Build the first playable version of `Combo Survivor` quickly while following the repo game-creation playbook.

## Build Order

1. Curate runtime assets into `public/assets/`
2. Create `public/assets/assets_index.json`
3. Write the game-specific PRD, TDD, art direction, and README
4. Create the static app shell in `public/index.html`
5. Implement the Three.js runtime in `public/game.js`
6. Build the arena floor, blockers, spawn points, and decorative set dressing
7. Add player locomotion, dodge, stamina, and the fixed follow camera
8. Add the `light -> light -> heavy` combo chain and short-range special burst
9. Add enemy archetypes, wave spawning, damage, and death handling
10. Add XP drops, level-up drafting, and auto-triggered skills
11. Add HUD, pause states, terminal states, and test seam
12. Run local verification and iterate

## Placeholder Policy

If any GLTF fails to load:

- use a fallback primitive
- keep the game playable
- do not block the full gameplay loop on one asset

## Calibration Pass

Before tuning combat feel:

- verify player and enemy asset forward direction
- lock per-class `visualYawOffset`
- verify target heights and `minY` anchors
- confirm camera-relative movement basis
- test `?debug=1` helpers in the local scene

## First Playable Milestone

Reach this state before any deeper polish:

- all required systems are implemented
- player can survive or fail a run
- combo chain, dodge, and special feel readable
- at least one level-up draft changes combat behavior
- health, stamina, XP, and timer are visible
- final elite wave can trigger and resolve

## Low-Risk Iteration Targets

After the first version works, improve in this order:

1. camera readability
2. dodge timing and combo cancel feel
3. wave pacing and enemy spawn density
4. pickup clarity and level-up card readability
5. animation selection quality

## Deferred Work

These should not block the first playable build:

- advanced visual effects
- audio
- multiple arenas
- persistent progression
- deeper combo trees
- automated tests beyond a basic seam
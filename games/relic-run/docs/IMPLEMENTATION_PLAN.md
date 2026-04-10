# Implementation Plan

## Goal

Build the first playable version of `Relic Run` quickly while following the repo game-creation playbook.

## Build Order

1. Curate runtime assets into `public/assets/`
2. Create `public/assets/assets_index.json`
3. Create the static app shell in `public/index.html`
4. Implement the Three.js runtime in `public/game.js`
5. Build level geometry and objective object placement
6. Add player movement and sprint
7. Add enemy patrol and chase
8. Add key, lever, gate, and chest progression
9. Add UI overlay and terminal states
10. Run local verification and iterate

## Placeholder Policy

If any GLTF fails to load:

- use a fallback primitive
- keep the game playable
- do not block the full gameplay loop on one asset

## First Playable Milestone

Reach this state before any deeper polish:

- all required systems are implemented
- player can finish a round
- player can lose a round
- timer and stamina are visible
- objective text updates correctly

## Low-Risk Iteration Targets

After the first version works, improve in this order:

1. camera readability
2. patrol path tuning
3. gate and interaction clarity
4. prop placement
5. animation selection quality

## Deferred Work

These should not block the first playable build:

- advanced visual effects
- audio
- multiple levels
- save/load
- stronger enemy variety
- automated tests beyond a basic seam
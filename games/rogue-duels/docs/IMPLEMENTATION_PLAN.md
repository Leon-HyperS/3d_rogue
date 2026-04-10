# Implementation Plan

## Goal

Build the first playable version of `Rogue Duels` quickly while following the repo game-creation playbook.

## Build Order

1. Curate the runtime assets into `public/assets/`
2. Create `public/assets/assets_index.json`
3. Write the PRD, TDD, and this implementation plan
4. Scaffold the static app shell in `public/index.html`
5. Build the duel sandbox first in `public/game.js`
6. Add the hub movement and NPC interaction layer
7. Add hub-to-fight and fight-to-hub transitions
8. Add EXP rewards, unlocks, and the equip overlay
9. Add the lightweight `window.__TEST__` seam
10. Run local verification and iterate

## Combat-First Slice

The first coding milestone is not the full game. It is a duel that proves:

- player movement in combat
- one enemy duel opponent
- light attack
- heavy attack
- one special move
- health bars
- win / lose transitions

Once that works, connect it to the hub.

## Placeholder Policy

If any GLTF fails to load:

- use a fallback primitive
- keep the prototype playable
- do not block the loop on one asset

## Calibration Pass

Before tuning feel:

- verify player forward direction
- verify enemy forward direction
- lock target heights
- lock `visualYawOffset` values
- verify hub camera-relative movement

## First Playable Milestone

Reach this state before deeper polish:

- player can move in the hub
- player can start either duel
- player can win or lose a fight
- a win grants EXP
- a win unlocks the enemy move
- the reward / equip overlay can spend EXP and equip the move
- the equipped move works in the next fight

## Low-Risk Iteration Targets

After the first version works, improve in this order:

1. camera readability
2. duel spacing behavior
3. prompt and overlay clarity
4. special move feel
5. animation selection quality

## Deferred Work

These should not block the first playable build:

- advanced combo trees
- blocking and parries
- multiplayer or online lobby behavior
- persistent progression
- audio
- high-end visual effects
- large hub expansion
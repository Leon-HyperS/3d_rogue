# PRD

## Title

`Combo Survivor`

## Summary

`Combo Survivor` is a compact 3D action-roguelike prototype where the player survives escalating enemy waves in a single arena using camera-relative movement, a simple fighting-game-inspired combo chain, dodge-based defense, and random drafted skills that reshape each run.

## Goal

Validate the repo workflow for:

- local asset curation from `Free_Assets/`
- Three.js combat implementation with GLTF character and enemy loading
- a mixed combat model with manual attacks plus auto-triggered skills
- a clear roguelike run loop with level-up drafts
- future smoke-test seams and iteration

## Core Loop

1. move through the arena and avoid being surrounded
2. attack with a `light -> light -> heavy` combo chain
3. dodge / wave-dash through danger and recover stamina
4. defeat enemies to drop XP shards and healing pickups
5. level up and choose one of three random skill cards
6. survive the late elite wave and clear the run

## Player Actions

- move with `WASD` or arrow keys
- attack with `Space`
- use special burst with `F`
- dodge / wave-dash with `Shift`
- choose level-up cards with `1`, `2`, `3`, or `Enter`
- restart with `R`

## Failure States

- player health reaches zero
- the arena is overrun and the player dies before the final wave ends

## Success State

- player survives the full run and defeats the elite final wave

## Scope Boundaries

Included:

- one compact arena
- one player character
- three core enemy archetypes
- one elite final-wave enemy
- one stamina system
- one health system
- one simple manual combo chain
- one manual special burst
- one dodge / wave-dash defensive move
- one level-up draft flow
- a small upgrade pool that materially changes combat

Not included:

- multiple arenas or biomes
- narrative campaign
- full fighting-game command motions
- weapon swapping
- persistent meta-progression
- audio
- save system

## Local Asset Basis

Curated subset will come from:

- `Free_Assets/Platformer Game Kit - Dec 2021`
- `Free_Assets/Ultimate Monsters`

Runtime assets will be copied into:

- `public/assets/`

## UX Requirements

- health, stamina, level, XP, and time left should always be visible
- level-up choices should pause the run and read clearly
- dodge readiness and special cooldown should be understandable
- hits, enemy windups, and drafted skill activations should have strong readable feedback
- the current run state should always be clear: normal combat, level-up draft, victory, or defeat

## Arena Shape

The level should be a compact ritual arena with:

- a central combat ring
- enough edge space to kite and dodge
- a few large rock platforms and props for visual rhythm
- no tall geometry that blocks the fixed combat camera
- clearly readable spawn lanes for early waves

## Technical Requirements

- static web app
- local-server-friendly
- GLTF asset loading with fallbacks
- minimal dependency footprint
- basic test seam for future automation
- no build step required for the first playable version

## First Playable Milestone

The first playable milestone is achieved when:

- the scene loads over HTTP
- the player can move, dodge, and complete a basic combo string
- enemies spawn in waves and can damage or be defeated
- XP drops can be collected
- a level-up draft can be triggered and resolved
- at least two drafted skills change combat behavior
- the run can end in both victory and defeat
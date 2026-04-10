# PRD

## Title

`Relic Run`

## Summary

`Relic Run` is a small 3D stealth-action prototype where the player must collect a key, activate a lever to open a gate, and reach a chest before time runs out, all while avoiding patrolling monsters.

## Goal

Validate the repo workflow for:

- local asset curation
- Three.js gameplay implementation
- GLTF character and enemy loading
- clear playable loop
- future testability

## Core Loop

1. move through the arena
2. collect the key
3. reach and activate the lever
4. pass through the opened gate
5. reach the chest to win
6. avoid enemy patrols and chases during the run

## Player Actions

- move with `WASD` or arrow keys
- sprint with `Shift`
- interact with `E`
- restart with `R`

## Failure States

- timer reaches zero
- enemy catches the player

## Success State

- player reaches and opens the chest after the gate is opened

## Scope Boundaries

Included:

- one compact level
- one player character
- two enemy types
- one key
- one lever
- one locked gate
- one chest
- one timer
- one stamina system

Not included:

- combat
- inventory
- multiple levels
- save system
- audio
- menu flow beyond immediate restart

## Local Asset Basis

Curated subset will come from:

- `Free_Assets/Platformer Game Kit - Dec 2021`
- `Free_Assets/Ultimate Monsters`

Runtime assets will be copied into:

- `public/assets/`

## UX Requirements

- the current objective should always be visible
- the timer should always be visible
- sprint stamina should always be visible
- interaction prompts should appear near relevant objects
- enemy alert state should be readable

## Level Shape

The level should be a compact ruined courtyard with:

- a start area
- a key area
- a lever area
- a gated final area
- enough walls and props to create light stealth routing

## Technical Requirements

- static web app
- local-server-friendly
- GLTF asset loading with fallbacks
- minimal dependency footprint
- basic test seam for future automation

## First Playable Milestone

The first playable milestone is achieved when:

- the scene loads
- the player can move and sprint
- enemies patrol and chase
- the key can be collected
- the lever can be activated
- the gate opens
- the chest can be reached for victory
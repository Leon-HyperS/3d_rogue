# Art Direction

## Project

`Combo Survivor`

## Visual Goal

A stylized 3D arena battler with a fixed elevated camera, readable enemy swarms, and punchy combat feedback. The scene should feel game-like and kinetic first, atmospheric second.

## Tone

- stylized and readable
- arcadey rather than realistic
- energetic and slightly mythic
- clear silhouettes over detailed clutter

## Camera

- elevated Hades-like follow camera
- stable framing over cinematic swings
- wide enough to support kiting and dodge reads
- no tall set dressing that blocks combat lines

## Color and Lighting

- dark blue-violet ground and background tones
- warm gold highlights for XP, pickups, and upgrade moments
- cyan accents for dodge and defensive feedback
- warm or red enemy silhouettes for threat readability
- bright player contrast against darker arena materials

## Local Asset Basis

Primary packs:

- `Free_Assets/Platformer Game Kit - Dec 2021`
- `Free_Assets/Ultimate Monsters`

Curated runtime subset:

- player: `Character.gltf`
- enemies: `Orc.gltf`, `Demon.gltf`, `Ghost.gltf`, `GreenSpikyBlob.gltf`, `Yeti.gltf`
- pickups: `Coin.gltf`, `Heart.gltf`, `Thunder.gltf`
- environment props: fences, plants, rock platforms, rocks

## Readability Priorities

1. player, enemies, XP drops, and healing pickups must all read instantly
2. dodge state and damage moments must be obvious through color and motion
3. attack arcs and burst skills should be readable even with placeholder VFX
4. the arena floor should help spatial orientation without becoming noisy
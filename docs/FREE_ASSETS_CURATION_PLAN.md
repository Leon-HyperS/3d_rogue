# Free Assets Curation Plan

This document defines how a future Cursor agent should turn `Free_Assets/` into a small runtime-ready subset for a new game.

Use this after the game concept is chosen and before broad implementation begins.

## Goal

Create the smallest asset subset that can support the first playable version of the game.

Do not curate for the full dream game up front.

Curate only what the first playable milestone needs.

## Runtime Curation Rules

1. Keep `Free_Assets/` unchanged as the source library.
2. Create a curated runtime subset under `public/assets/`.
3. Prefer `glTF` files for runtime use.
4. Add only the assets required for the first playable slice.
5. Create `public/assets/assets_index.json` after curation.
6. Add more assets only when a new mechanic or content need is proven.

## Minimum Runtime Categories

For most 3D prototypes, try to curate one item from each of these:

- player
- enemy set
- environment or terrain set
- pickup or reward set
- one objective or goal prop

Optional early categories:

- hazard
- interaction prop
- decorative prop
- HUD concept references

## Recommended Folder Shape

For a curated runtime set, prefer a clean structure such as:

```text
public/assets/
  characters/
  enemies/
  pickups/
  environment/
  mechanics/
  ui/
  assets_index.json
```

The exact layout can vary, but it should stay simple and readable.

## Archetype Starter Kits

These are recommended first-pass curated subsets based on the currently available local asset packs.

### Kit A: 3D Dungeon Stealth

Use when the player must navigate space, avoid or outmaneuver enemies, collect a key, and reach a goal.

Curate first:

- player: `Character.gltf`
- enemies: `Orc.gltf`, `Demon.gltf`
- pickups: `Key.gltf`
- goal: `Chest.gltf`
- interactions: `Door.gltf`, `Lever.gltf`
- environment support: `Fence_1.gltf`, `Fence_Corner.gltf`, `Fence_Middle.gltf`
- optional dressing: `Rock_1.gltf`, `Rock_2.gltf`, `Plant_Small.gltf`, `Plant_Large.gltf`

Why this kit is strong:

- clear objective loop
- easy to prototype win condition
- easy to test visibility, patrol, chase, and traversal

### Kit B: 3D Arena Survival

Use when the player survives waves, avoids threats, and collects health or score pickups.

Curate first:

- player: `Character_Gun.gltf`
- enemies: `Armabee.gltf`, `Ghost.gltf`, `Dragon.gltf` or `Orc.gltf`, `Demon.gltf`
- rewards: `Coin.gltf`, `Gem_Blue.gltf`, `Gem_Green.gltf`
- health: `Heart.gltf`
- hazards: `Spikes.gltf`, `Hazard_Saw.gltf`, `Bomb.gltf`
- environment anchors: `RockPlatforms_Medium.gltf`, `RockPlatforms_Large.gltf`

Why this kit is strong:

- supports immediate combat or dodge gameplay
- easy to prototype score, healing, and survival loops

### Kit C: 3D Platformer

Use when the player jumps, traverses modular platforms, avoids enemies, and reaches a goal.

Curate first:

- player: `Character.gltf`
- enemies: `Crab.gltf`, `Bee.gltf`, `Skull.gltf`
- terrain: `Cube_Grass_Center_Tall.gltf`, `Cube_Grass_Corner_Tall.gltf`, `Cube_Grass_Side_Tall.gltf`
- additional terrain: `RockPlatforms_1.gltf`, `RockPlatforms_2.gltf`
- dressing: `Tree.gltf`, `Bush.gltf`, `Grass_1.gltf`
- pickups: `Coin.gltf`, `Gem_Pink.gltf`, `Heart.gltf`
- goal: `Goal_Flag.gltf`

Why this kit is strong:

- very fast to block out
- enough variety for one playable level
- easy to expand later

## Asset Count Guidance

For the first playable version, aim for:

- 1 player model
- 2 to 4 enemy models
- 3 to 8 environment pieces
- 1 to 3 pickups
- 1 goal prop

This is usually enough.

Avoid curating dozens of assets before gameplay is proven.

## Example First Pass `assets_index.json` Scope

The first `assets_index.json` should include:

- stable ID
- category
- relative runtime path
- source pack
- short note

Example fields:

```json
{
  "id": "enemy_orc",
  "category": "enemy",
  "path": "enemies/Orc.gltf",
  "sourcePack": "Ultimate Monsters",
  "note": "ground melee enemy"
}
```

Do not overcomplicate the index in version one.

## Expansion Rule

After playtesting:

- if the problem is mechanical, fix code or level layout first
- if the problem is readability, adjust spacing, markers, or camera first
- if the problem is content variety, then add one or two more curated assets

Do not assume more assets are the answer to an early gameplay problem.

## Default Recommendation

If no game concept has been chosen yet, start from `Kit A: 3D Dungeon Stealth` or `Kit C: 3D Platformer`.

These two kits map best to the current local assets and are the easiest to turn into a clear first playable slice.
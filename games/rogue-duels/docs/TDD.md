# TDD

## Project

`Rogue Duels`

## Runtime Shape

Implement the prototype as a small static Three.js game:

- `public/index.html`
- `public/game.js`
- `public/assets/...`

Use import maps with CDN-hosted Three.js ES modules.

## Asset Strategy

Runtime assets live only under:

- `public/assets/characters`
- `public/assets/enemies`
- `public/assets/environment`
- `public/assets/mechanics`

Use `public/assets/assets_index.json` as the runtime catalog. Do not load directly from `Free_Assets/`.

## Reference Frame Contract

World rules:

- `+X` = right
- `+Y` = up
- movement happens on the `XZ` plane
- character wrappers anchor at `minY = 0`
- floor and blocker geometry are authored directly in scene units
- `renderer.outputColorSpace = THREE.SRGBColorSpace`

Calibration rules:

- normalize player and enemy models to explicit target heights
- use per-asset `visualYawOffset` values
- verify forward direction in debug mode instead of guessing

## High-Level Runtime Model

Use one `THREE.Scene`, one renderer, and one animation loop.

The scene contains two major roots:

- `hubRoot`
- `fightRoot`

Only the active root is visible and updated for gameplay.

## State Model

Use one shared state object and one transition function.

Primary modes:

- `boot`
- `hub`
- `fightIntro`
- `fight`
- `reward`
- `lose`

Persistent run data:

- current EXP
- unlocked move IDs
- equipped move ID
- current NPC move assignments
- defeated NPC flags

Per-fight data:

- player health
- enemy health
- current duel target
- active projectiles and temporary hit effects

## Scene Structure

### Hub

The hub contains:

- player spawn
- two NPC duelists
- fence perimeter
- rock platforms and rocks for framing
- a door / arena gate prop

Hub behavior:

- third-person movement
- prompt when near an NPC
- `E` starts a duel with the nearest NPC
- reward overlay can appear on top of hub mode after a win

### Fight

The fight root contains:

- compact duel floor
- decorative rocks and perimeter props
- player fighter instance
- enemy fighter instance
- optional projectile visuals

Fight behavior:

- duel intro placement
- locked readable combat camera
- health bars and status UI
- win or lose transition

## File Structure

- `public/index.html` owns canvas and DOM HUD
- `public/game.js` contains all runtime logic for the first playable slice
- docs stay in `docs/`

For this prototype, keep the implementation in one runtime file rather than splitting into many modules.

## Asset Loading

Use:

- `GLTFLoader`
- `SkeletonUtils.clone()` for animated model instances

Loading flow:

1. fetch `assets_index.json`
2. register entries by stable ID
3. load assets lazily
4. cache loaded scenes and animation clips
5. clone visuals per instance

Each asset load should support:

- mesh shadow traversal
- target-height normalization
- fallback primitives when load fails
- one `AnimationMixer` per animated instance

## Animation Handling

Expected clips:

- hero: `Idle`, `Walk`, `Run`, `SwordSlash`
- duelists: `Idle`, `Walk`, `Run`, `Punch`, `HitReact`, `Death`

Rules:

- log clip names when an asset loads
- map attack playback to `SwordSlash` or `Punch`
- do not reset an already-playing action every frame
- if an animation is missing, keep gameplay working with the model pose

## Input Handling

Hub inputs:

- move with `WASD`
- interact with `E`

Fight inputs:

- move with `WASD`
- `J` light attack
- `K` heavy attack
- `L` special

Overlay inputs:

- `E` confirm equip
- `Esc` close overlay if the choice can be deferred

## Player Model

The player entity needs:

- group
- radius
- heading
- health
- max health
- attack state
- special cooldown
- invulnerability timer
- optional projectile ownership
- animation controller

## Enemy Model

Each duelist needs:

- group
- radius
- heading
- health
- max health
- archetype label
- assigned special move ID
- move cooldowns
- simple chase / spacing logic
- animation controller

## Move System

Special moves must be modular objects keyed by ID.

Each move definition should include:

- `id`
- `label`
- `description`
- `cooldown`
- `damage`
- `range`
- `unlockCost`
- `use(actor, context)`

Prototype move list:

- `diveKick`
- `projectile`
- `dashAttack`

Shared rules:

- player can equip exactly one move
- NPC has exactly one assigned move
- player and NPC special behavior should reuse the same definition table

## Combat Model

Universal attacks:

- light attack: fast short-range strike
- heavy attack: slower longer-range strike

Collision rules:

- use radius checks and short-lived hit windows
- combat collision should not depend on mesh geometry
- projectiles use sphere-like distance checks
- blockers use simple boxes only where needed

## NPC Assignment Rules

At the start of a run:

- shuffle the three special move IDs
- assign unique move IDs to the two NPCs
- keep the third move unassigned

NPC move assignment remains stable until the run resets.

## Progression Rules

On duel win:

- award `1 EXP`
- unlock the enemy's assigned move if not already unlocked
- open the reward / equip overlay

On equip:

- equipping a different unlocked move costs `1 EXP`
- if the move is already equipped, no cost
- after selection, return fully to hub mode

On duel loss:

- mark the run as failed
- disable fight input
- allow restart

On run restart:

- reset EXP to `0`
- clear unlocked moves
- equip no special by default
- reroll NPC move assignments
- restore hub scene

## Camera Rules

Hub camera:

- elevated follow camera
- smooth lerp
- looks slightly above the player

Fight camera:

- fixed angled duel framing
- slight smoothing allowed
- keeps both fighters inside a readable frame

## UI System

DOM overlay should provide:

- game title
- status text
- hub prompt
- player health
- enemy health during fights
- EXP
- equipped move
- unlocked moves
- reward / equip overlay
- lose / restart banner

## Test Seam

Expose a small automation seam at `window.__TEST__`:

- `ready`
- `getState()`
- `restartRun()`
- `forceWin()`
- `forceLose()`
- `openRewardForMove(moveId)`
- `equipMove(moveId)`

This should be enough for later smoke automation without building a full test harness yet.

## Verification Target

Minimum acceptable runtime verification:

- app loads over HTTP
- hub movement works
- NPC interaction starts a duel
- player can win a duel
- player can lose a duel
- EXP increments on win
- unlocked move appears in reward / equip overlay
- equipped move is usable in the next duel

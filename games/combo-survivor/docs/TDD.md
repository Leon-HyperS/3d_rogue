# TDD

## Project

`Combo Survivor`

## Runtime Shape

The project should be implemented as a lightweight static Three.js game:

- `public/index.html`
- `public/game.js`
- `public/assets/...`

Use import maps and CDN-hosted Three.js ES modules.

## Asset Strategy

Use curated runtime assets only.

Runtime assets live under:

- `public/assets/characters`
- `public/assets/enemies`
- `public/assets/pickups`
- `public/assets/environment`
- `public/assets/mechanics`

Use `public/assets/assets_index.json` as the runtime asset contract.

## Reference Frame Contract

World contract:

- `+X` = right
- `+Y` = up
- gameplay movement takes place on the `XZ` plane
- characters and props anchor at `minY = 0`
- ground geometry is authored directly in scene units
- player-facing combat uses camera-relative movement projected on the `XZ` plane

Initial asset assumptions:

- Quaternius-style GLTF assets may need visual yaw correction
- use per-class visual yaw offsets for player, ground enemies, and flying enemies
- prefer normalization to target height
- keep `renderer.outputColorSpace = THREE.SRGBColorSpace`
- verify forward direction in debug mode before tuning movement feel

## Core Systems

### Scene System

One scene with:

- ground plane and arena ring markers
- low wall and rock blockers
- decorative props
- player
- enemy instances
- pickup instances
- lightweight HUD and level-up overlay in DOM

### Player System

Player features:

- camera-relative movement
- dodge / wave-dash with i-frames and stamina cost
- one manual combo chain with timed follow-up inputs
- one short-cooldown special burst
- health, XP, level, and upgrade state
- animation switching when available

### Enemy System

Each enemy has:

- archetype-driven stats
- move and attack state
- facing direction derived from movement
- contact or ranged pressure behavior
- hit reaction and death handling
- pickup drop chance

### Combat System

Combat rules:

- combo chain advances on repeated `attack` input within a combo window
- attack steps spawn short-lived hit volumes
- enemies use radius-based hurt and hit checks
- hit-stop, knockback, and brief stun windows improve readability
- dodge grants temporary invulnerability and repositioning
- special burst provides short-range crowd control on cooldown

### Progression System

Run progression:

1. defeat enemies
2. collect XP shards
3. fill XP threshold
4. pause game with a three-card draft
5. apply one upgrade modifier
6. resume combat with stronger builds and denser waves

Use a single game state object and a single terminal-state transition function.

### UI System

DOM overlay should show:

- title
- current wave
- timer
- health
- stamina
- XP progress
- level
- current drafted skills
- special cooldown
- run status
- level-up cards when paused
- win/lose banner

### Test Seam

Expose a minimal future automation seam:

- `window.__TEST__.ready`
- `window.__TEST__.getState()`
- `window.__TEST__.restart()`
- `window.__TEST__.pickUpgrade(index)`

## Asset Loading

Use:

- `GLTFLoader`
- `SkeletonUtils.clone()` for animated model instancing

Load assets through:

- a small asset catalog built from `assets_index.json`

Each asset should support:

- success path
- fallback primitive if loading fails
- shadow traversal for mesh children
- optional normalization
- per-instance animation mixer setup

## Animation Handling

For player and enemy models:

- create one `AnimationMixer` per instance
- log animation clip names on first load
- select safe clips with priority for `idle`, `walk`, `run`, `attack`
- avoid resetting an already playing action every frame

If animation selection fails, preserve gameplay using the model pose and fallback movement.

## Camera

Use a stable follow camera:

- elevated Hades-like angle
- light smoothing
- readable arena framing
- no orbit controls during gameplay

## Collision Model

Use lightweight gameplay collision primitives:

- axis-aligned boxes for arena blockers
- radius checks for entity contact
- sphere-like distance checks for pickup and XP collection
- gameplay collision does not depend on mesh geometry

## Level Composition

The first level should be hand-authored in code using:

- a compact central arena
- a few large blocker volumes for route variation
- curated props for readability
- enemy spawn points around the edges

This keeps the first build fast and debuggable.

## Win/Lose Guardrails

Use one terminal latch:

- `hasEnded`

Rules:

- timer clamps at zero
- win and lose only fire once
- once terminal, movement and enemy logic stop except for presentation
- level-up state pauses the run without clearing the scene

## Verification

Minimum verification target:

- load locally over HTTP
- scene renders without blocking asset failures
- movement, dodge, attack, and special all work
- enemies spawn and can be defeated
- level-up draft can be completed
- victory and defeat both function
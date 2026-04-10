# TDD

## Project

`Relic Run`

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
- `public/assets/mechanics`
- `public/assets/environment`

Use `public/assets/assets_index.json` as the runtime asset contract.

## Reference Frame Contract

World contract:

- `+X` = right
- `+Y` = up
- gameplay movement takes place on the `XZ` plane
- characters and props anchor at `minY = 0`
- ground and wall geometry are authored directly in scene units

Initial asset assumptions:

- Quaternius-style GLTF character assets likely need a visual yaw correction
- use per-class visual yaw offsets
- prefer normalization to target height
- keep `renderer.outputColorSpace = THREE.SRGBColorSpace`

## Core Systems

### Scene System

One scene with:

- ground plane
- box-wall maze pieces
- decorative props
- player
- enemies
- interactable objects
- lightweight UI overlay in DOM

### Player System

Player features:

- camera-relative movement
- sprint with stamina drain and recharge
- collision against walls and gate
- interaction range checks
- animation switching when available

### Enemy System

Each enemy has:

- patrol route between waypoints
- facing direction derived from movement
- detection cone and radius
- chase behavior
- alert marker
- lose-state trigger on contact

### Objective System

State progression:

1. collect key
2. activate lever
3. gate opens
4. reach chest

Use a single game state object and a single terminal-state transition function.

### UI System

DOM overlay should show:

- title
- objective text
- timer
- stamina bar
- interaction prompt
- win/lose message

### Test Seam

Expose a minimal future automation seam:

- `window.__TEST__.ready`
- `window.__TEST__.getState()`
- `window.__TEST__.restart()`

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

## Animation Handling

For player and enemy models:

- create one `AnimationMixer` per instance
- log animation clip names on first load
- select safe clips with priority for `idle`, `walk`, `run`
- avoid resetting an already playing action every frame

If animation selection fails, preserve gameplay using the model pose and fallback movement.

## Camera

Use a stable follow camera:

- elevated angle
- light smoothing
- readable play area framing

Do not use free orbit controls during gameplay.

## Collision Model

Use lightweight gameplay collision primitives:

- axis-aligned boxes for walls
- a separate blocking volume for the closed gate
- radius checks for interactions and catch states

Gameplay collision does not depend on mesh geometry.

## Level Composition

The first level should be hand-authored in code using:

- simple wall boxes
- curated props for readability
- patrol routes placed to create routing tension

This keeps the first build fast and debuggable.

## Win/Lose Guardrails

Use one terminal latch:

- `hasEnded`

Rules:

- timer clamps at zero
- win and lose only fire once
- once terminal, movement and AI updates stop except for presentation

## Verification

Minimum verification target:

- load locally over HTTP
- scene renders without asset failures
- movement works
- interactions progress correctly
- win and lose paths both function
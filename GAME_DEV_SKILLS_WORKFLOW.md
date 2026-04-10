# Cursor Agent Game Creation Playbook

This document is written for a future **Cursor agent** working in this repo.

Use it as an operating guide when the user asks you to create a game, prototype a game, or extend an in-progress game.

The goal is not to produce a vague design memo. The goal is to help you make good implementation decisions, manage context well, use the local skills correctly, and get to a playable game quickly.

## Primary Objective

When asked to create a game, optimize for this sequence:

`cohesive direction -> clear assets -> written spec -> technical plan -> playable build -> focused iteration -> regression protection`

Do not optimize for a perfect first draft.

Optimize for:

- getting to a playable version quickly
- making future iterations cheaper
- using the right skill for the right phase
- avoiding common asset, camera, animation, and architecture mistakes

## Operating Rules

When using this playbook, follow these rules:

1. Decide early whether the game is fundamentally `3D` or `2D`.
2. Prefer a **small playable slice** over broad unfinished scope.
3. Use existing cohesive asset packs in this repo before trying to generate all production art from scratch.
4. Write key project knowledge to Markdown files in the repo instead of keeping it only in conversation context.
5. Save plans before large implementation passes.
6. Watch context usage and reset or compact before quality drops.
7. Iterate from real playtest problems, not theoretical polish ideas.
8. Add automated coverage only after the core loop is actually playable.

## Local Asset Library

This repo already includes a useful local asset source under `Free_Assets/`.

Treat that folder as the **default first place to look** before searching externally or generating major production assets.

Current local packs identified:

- `Free_Assets/Ultimate Monsters`
- `Free_Assets/Platformer Game Kit - Dec 2021`

Important observations:

- both packs include `glTF` assets, which should be the preferred runtime format for web-game implementation here
- both packs also include `FBX`, `OBJ`, and `.blend` source variants
- both include `License.txt` files indicating `CC0 1.0 Universal`

Use this practical rule:

1. inspect `Free_Assets/` first
2. select a coherent subset for the specific game
3. prefer `glTF` files for runtime use
4. copy or curate only the needed assets into the game's runtime asset area such as `public/assets/`
5. create an index for the curated runtime assets

Do not build directly from a giant uncurated asset tree if you can avoid it. Curate a game-specific runtime subset first.

Reference documents:

- `docs/FREE_ASSETS_SOURCE_INDEX.md`
- `docs/FREE_ASSETS_CURATION_PLAN.md`

## Default Track Selection

Use this default decision tree:

- If the game is primarily 3D, use `threejs-builder` as the backbone.
- If the game is primarily 2D, use `phaser-gamedev` as the backbone.
- If the game is 2D and uses layered terrain or Tiny Swords assets, also use `tinyswords-tilemap`.
- If the game needs concept visuals, support art, sprite sheets, or bitmap asset generation, use `fal-ai-image`.
- If the game is already playable and needs regression protection, use `playwright-testing`.
- If the game is a stable Three.js web app that now needs iOS packaging, use `threejs-capacitor-ios`.

If the user does not specify a format, prefer:

- `threejs-builder` for a 3D browser game
- `phaser-gamedev` for a 2D browser game

## What Each Skill Is For

### `threejs-builder`

Use this when building or planning a 3D browser game.

Rely on it for:

- scene architecture
- GLTF loading
- reference-frame calibration
- animation state logic
- camera behavior
- movement systems
- general Three.js gotchas

This should be the main skill for:

- 3D prototypes
- arena games
- stealth games
- action exploration games
- GLTF-based web games

### `phaser-gamedev`

Use this when building or planning a 2D browser game.

Rely on it for:

- scene structure
- Phaser configuration
- input handling
- physics decisions
- sprite animation
- asset loading
- 2D gameplay architecture

This should be the main skill for:

- top-down action games
- platformers
- arcade games
- tilemap-driven games

### `tinyswords-tilemap`

Use this when a 2D game uses Tiny Swords or a similar layered terrain style.

Rely on it for:

- elevation layering
- shadow placement
- water foam animation
- stairs and transitions
- readable terrain composition

Do not use it as a general replacement for the 3D workflow.

### `fal-ai-image`

Use this for bitmap image generation or editing that directly supports the game workflow.

Primary uses:

- concept mockups before implementation
- sprite sheets for 2D games
- support art or filler assets
- prop or UI ideation
- environment concepts

For 3D games, do not assume this should replace the core asset pack. Use it mainly to:

- create visual references
- fill art gaps
- communicate target feel

### `playwright-testing`

Use this after a playable build exists.

Rely on it for:

- smoke tests
- deterministic browser checks
- canvas and WebGL verification
- screenshot checks after stabilization
- regression protection for core flows

Do not lead with tests before the game is playable.

### `threejs-capacitor-ios`

Use this only when:

- the Three.js browser version already works
- web asset paths are stable
- mobile packaging is a real requirement

This is a shipping and integration step, not a starting step.

## Standard Delivery Artifacts

When building a game, try to create and maintain these files where useful:

- `docs/PRD.md`
- `docs/TDD.md`
- `docs/IMPLEMENTATION_PLAN.md`
- `public/assets/assets_index.json`
- `public/concepts/...` or another project-local concept image folder

These files reduce prompt drift and make future sessions much stronger.

Also consult when using the local asset library:

- `docs/FREE_ASSETS_SOURCE_INDEX.md`
- `docs/FREE_ASSETS_CURATION_PLAN.md`

## Required Workflow

Follow these phases in order unless the user explicitly asks for a shorter path.

### Phase 1: Define The Game

Before coding, establish:

- genre
- 2D or 3D
- target platform
- camera style
- input style
- core loop
- fail state
- win state
- minimum playable slice

If the user gives a vague request like "make a game," narrow it into a small concept before implementation.

Target deliverable:

- a concise game summary with clear player verbs and success criteria

### Phase 2: Choose The Core Asset Strategy

Pick one of these:

- off-the-shelf cohesive asset pack
- existing repo assets
- AI-generated concept plus selective AI-generated assets
- placeholder-first development

Preferred order:

1. cohesive local repo assets from `Free_Assets/`
2. other existing repo assets
3. placeholder-first with later asset replacement
4. external cohesive asset pack
5. fully generated production art

For 3D games:

- inspect `Free_Assets/` before anything else
- prefer GLTF or GLB asset packs
- prefer the local `Ultimate Monsters` pack for enemy-driven prototypes
- prefer the local `Platformer Game Kit - Dec 2021` pack for traversal, platforming, pickups, and modular environment pieces
- preserve the original source packs in `Free_Assets/`
- copy only the selected runtime subset into `public/assets/`
- keep the file structure web-friendly
- verify license expectations

For 2D games:

- prefer consistent sprite or tile packs
- do not assume frame sizes
- plan an asset measurement pass before integration

### Phase 3: Build An Asset Index

If the project uses a nontrivial asset pack, create:

- `public/assets/assets_index.json`

This file should summarize:

- stable asset IDs
- relative paths
- categories
- notable animations
- recommended usage notes when useful

This step is important because it prevents repeated folder traversal and gives future prompts a stable contract.

If the game is simple and uses very few assets, this can be lighter, but do not skip it for medium or large packs.

When the source assets come from `Free_Assets/`, use a two-step approach:

1. inspect and choose the subset from `Free_Assets/`
2. build the actual runtime `assets_index.json` from the curated files under `public/assets/`

This keeps runtime paths clean and prevents the game from depending on the full raw source library.

### Phase 4: Create A Concept Anchor

Before major implementation, create a concept anchor when visual direction is still fuzzy.

Use:

- selected local assets from `Free_Assets/`
- asset previews
- `assets_index.json`
- a short gameplay description

Then create either:

- a concept mockup image
- a concise art direction note
- both

For 3D games, a concept image is especially useful because it helps anchor:

- camera angle
- lighting style
- map density
- mood
- HUD direction

### Phase 5: Write The PRD

Create `docs/PRD.md` when the game is more than a trivial experiment.

The PRD should define:

- game fantasy
- player actions
- gameplay loop
- controls
- level or map structure
- enemies or hazards
- pickups or rewards
- UI and feedback requirements
- success and failure states
- scope boundaries
- which local asset pack or curated subset the game is based on

Keep it practical. Avoid fluffy marketing language.

### Phase 6: Write The TDD

Create `docs/TDD.md` before a major implementation pass.

For 3D games, use `threejs-builder` to shape this document.

For 2D games, use `phaser-gamedev` to shape this document.

The TDD should define:

- runtime structure
- file structure
- scene architecture
- asset-loading strategy
- state model
- collision approach
- animation handling
- camera rules
- input handling
- win and fail logic
- testing hooks if needed
- exact runtime asset locations and loading assumptions

The TDD exists to reduce implementation thrash.

### Phase 7: Save A Plan Before Coding

Before a large implementation pass, create:

- `docs/IMPLEMENTATION_PLAN.md`

This should be a practical build order, not a broad essay.

It should answer:

- what gets built first
- what can stay placeholder
- what dependencies exist between systems
- what the first playable milestone is

If using Cursor Plan Mode helps produce this, use it.

Do not start a large implementation pass with only a vague idea in context.

### Phase 8: Manage Context Explicitly

Treat context as a production constraint.

Important rules:

- write key decisions to files
- do not keep important plans only in chat
- reset or compact before large code generation if context has become crowded
- use the saved docs as re-entry points

When moving from planning to implementation:

1. ensure PRD exists
2. ensure TDD exists
3. ensure the implementation plan exists
4. ensure major assets or references are stored in the repo
5. start the implementation pass with a clean enough context window

### Phase 9: Build The First Playable Version

The first version should aim for:

- a runnable game
- correct asset loading
- basic movement
- basic interactions
- objective completion
- enough feedback to understand success and failure

Do not over-polish version one.

Acceptable in version one:

- placeholder art
- rough UI
- basic balance
- temporary level layout

Not acceptable in version one:

- no playable loop
- broken asset loading
- unclear controls
- no win or fail condition

### Phase 10: Serve The Game Correctly

When testing a web game that loads assets dynamically, do not rely on opening `index.html` directly from disk.

Serve it locally.

This matters for:

- GLTF loading
- textures
- JSON files
- browser asset permissions
- relative path correctness

Assume localhost-based testing unless the project architecture clearly does not require it.

### Phase 11: Playtest And Iterate

Once the first playable build exists:

1. play it
2. identify the main blockers
3. write a short issue list
4. fix one issue or a very small batch
5. replay immediately

Typical high-value issues:

- movement feels wrong
- camera readability is poor
- map layout is too tight or too empty
- animation states are wrong
- interactions are unclear
- difficulty is unfair
- markers or UI feedback are misplaced

Do not rewrite everything after the first test.

Prefer the smallest change that improves the feel meaningfully.

Also prefer solving gameplay with the assets already available locally before introducing new asset dependencies.

### Phase 12: Add Automated Coverage

After the loop feels playable, add targeted automated coverage with `playwright-testing`.

Start with one smoke flow.

Good first assertions:

- game loads on localhost
- scene initializes
- player can move
- one objective interaction works
- one visible feedback element appears correctly

For canvas or WebGL games:

- add deterministic hooks when needed
- prefer readiness signals over sleeps
- add screenshot checks only after the output is stable enough

## 3D-Specific Guidance

When using `threejs-builder`, follow these extra rules:

1. Lock the reference frame contract early.
2. Verify forward direction instead of guessing.
3. Normalize anchors and scale intentionally.
4. Prefer cohesive local GLTF packs from `Free_Assets/` over trying to synthesize a full art pipeline.
5. Use concept mockups to communicate the intended feel before implementation.
6. Save the plan before the big code pass.
7. Expect the first build to need layout, camera, and feel iteration.

Repo-specific guidance for 3D asset selection:

- use `Free_Assets/Ultimate Monsters` first when you need enemies, creatures, or stylized character threats
- use `Free_Assets/Platformer Game Kit - Dec 2021` first when you need characters, pickups, nature props, modular platforms, or level mechanics
- prefer `glTF` over `FBX`, `OBJ`, or `.blend` for the actual web runtime
- keep `Free_Assets/` as the source library and move curated runtime files into `public/assets/`

If there is a "camera problem," check whether it is really caused by:

- corridor width
- wall height
- level density
- interaction spacing

Do not assume it is only a camera math problem.

## 2D-Specific Guidance

When using `phaser-gamedev`, follow these extra rules:

1. Decide scenes early.
2. Pick the physics model early.
3. Use a clean boot and preload flow.
4. Measure every spritesheet before coding the loader.
5. Create harness scenes when UI slicing or animation loading is risky.
6. Use `tinyswords-tilemap` only when that layered terrain approach fits the game.

Repo-specific note:

- `Free_Assets/Platformer Game Kit - Dec 2021` may still be useful as source reference material or for hybrid workflows, but this playbook should not assume those raw 3D source assets are directly appropriate for Phaser runtime usage without deliberate conversion or selection

For spritesheets:

- measure dimensions
- count rows and columns
- verify spacing
- verify margins
- verify each animation sheet separately

## How To Use Cursor Agent In Practice

When following this document as Cursor agent:

- gather the relevant local skill instructions first
- inspect the repo before making assumptions
- write specs to files before large implementation passes
- prefer planning before broad edits
- make the game playable before making it polished
- use the browser and test tools after the game exists

If the user asks for a game from scratch, your default sequence should be:

1. clarify the concept
2. choose 2D or 3D
3. choose the main skill
4. inspect `Free_Assets/` for a matching local pack
5. determine the curated runtime asset strategy
6. create `assets_index.json` if needed
7. create a concept anchor if needed
8. write `docs/PRD.md`
9. write `docs/TDD.md`
10. write `docs/IMPLEMENTATION_PLAN.md`
11. implement the first playable version
12. playtest and refine
13. add smoke coverage

## Anti-Patterns

Avoid these mistakes:

- building too much before the first playable loop exists
- generating all core art first without gameplay validation
- ignoring `Free_Assets/` and immediately searching for outside assets
- relying on chat context instead of saving documents
- skipping the asset index on a big pack
- over-testing before the game is playable
- making huge unfocused iteration passes
- ignoring asset-loading constraints of the browser
- loading raw source formats when a local `glTF` version is already available
- treating skills as magic instead of targeted tools

## Long-Term Improvement Rule

When you encounter recurring gotchas while building the game, do not just patch the current code.

Also consider whether the lesson should feed back into:

- the relevant skill usage
- project documentation
- future prompts
- reusable helper files

The goal is not only to finish one game.

The goal is to make future game-building sessions stronger.

## Final Instruction

If the user asks you to create a game and provides little direction, use this default stance:

- choose a small achievable scope
- inspect `Free_Assets/` and prefer a coherent local asset strategy
- create written artifacts early
- plan before broad coding
- get to a playable loop fast
- iterate from playtest evidence
- add automation after the loop is stable

When in doubt, favor the decision that gets the repo to a **clear playable build** with the least future thrash.
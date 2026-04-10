# PRD

## Project

`Rogue Duels`

## Fantasy

`Rogue Duels` is a small 3D fighting-roguelike prototype where the player walks a training-village hub, challenges duelists, defeats them in a 1v1 arena, learns their signature move, and equips that move for the next fight.

The prototype favors a fast playable loop over feature breadth. It should feel readable and game-like, not fully simulation-heavy.

## Platform

- Browser
- Keyboard controls
- Static Three.js app served over local HTTP

## Camera Style

- Third-person follow camera in the hub
- Locked side-biased duel camera in combat
- No free orbit controls during gameplay

## Core Loop

1. Spawn in the 3D hub
2. Walk up to an NPC duelist
3. Press `E` to challenge them
4. Transition into a duel arena
5. Use base attacks and the equipped special move to win
6. Gain `1 EXP` and unlock that NPC's assigned move
7. Return to the hub
8. Spend `1 EXP` to equip any unlocked move
9. Challenge the next NPC

## Prototype Scope

- 1 small training-village hub
- 1 duel arena
- 2 NPC duelists
- 1 player character
- 3 total special moves
- Universal light and heavy attacks
- Basic health, EXP, unlock, and equip flow

## Controls

- `WASD` or arrows: move
- `E`: interact / challenge / confirm equip
- `J`: light attack
- `K`: heavy attack
- `L`: special move
- `R`: restart run
- `Esc`: close equip overlay when allowed

## Combat Rules

- Every duel is `1v1`
- Both fighters have health bars
- The player always has:
  - light attack
  - heavy attack
  - one equipped special move
- NPCs use one assigned special move plus simple melee pressure
- Attack logic uses simple hit volumes and cooldown windows
- The prototype does not include advanced combos, juggling, blocking, or frame-accurate cancels

## Move Pool

Three modular special moves define the roguelike progression:

- `diveKick`: a forward leap that slams down for burst damage
- `projectile`: a short, readable ranged shot
- `dashAttack`: a fast forward slash with repositioning

At run start, the two NPCs are assigned distinct moves from this pool at random.

## Progression Rules

- Winning a duel grants `1 EXP`
- Winning also permanently unlocks that NPC's assigned move for the current run
- Equipping a not-currently-equipped unlocked move costs `1 EXP`
- The player only has one special slot in the prototype
- The first victory must always give enough EXP to equip the newly unlocked move

## Hub Requirements

- The player can move freely in a small fenced space
- Two NPCs stand in distinct positions
- The active interact prompt appears when near an NPC
- After a duel, the player returns to the hub at a stable spawn point

## Arena Requirements

- A compact readable arena with minimal props
- Clear player and enemy separation at round start
- Visible duel UI with player health, enemy health, equipped move, EXP, and status text

## Win State

The player wins a duel when the enemy health reaches zero.

## Lose State

The player loses a duel when player health reaches zero.

Losing ends the current run, rerolls NPC move assignments, clears run-only unlock state, and returns the player to the hub after a restart prompt.

## UI And Feedback

The prototype should show:

- current mode or status text
- player health
- enemy health during fights
- current equipped move
- EXP total
- unlocked move list
- interact prompt in the hub
- post-fight reward / equip overlay

## Visual Direction

Use a cohesive Quaternius low-poly fantasy look:

- player: `Knight_Male.gltf`
- duelists: `Orc.gltf`, `Demon.gltf`
- environment: fences, rock platforms, rocks, and a door prop

The hub should read like a simple outdoor sparring courtyard. The arena should feel like a duel ring carved into the same world rather than a separate high-production map.

## Asset Basis

This prototype uses a curated subset from:

- `Ultimate Animated Character Pack - Nov 2019`
- `Ultimate Monsters`
- `Platformer Game Kit - Dec 2021`

Those selected source packs are documented in the repo as CC0 / public-domain-friendly local assets.

## Explicit Non-Goals

- multiplayer
- advanced combo systems
- guard / parry / sidestep layers
- full lobby replication of anime fighters
- animation blending polish
- persistent save progression
- large hub exploration
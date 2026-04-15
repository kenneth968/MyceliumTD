# MyceliumTD Jam Gap Plan

## Goal

Map the current codebase against the locked jam scope and show:

- what already exists
- what needs to change
- what should be cut or deferred
- what order to implement the remaining work in

## Locked Jam Scope

- `HTML5 browser game`
- `1 polished map`
- `6 towers`
- `Top` + `Middle` paths always available
- `Bottom` path is network-only and still `Possible`
- `10 enemy types`
- `Symbiosis Kernel` defense objective
- mycelium network is a global placement system, not a separate tower
- bugs are natural/corrupted insects, not robots

## Current Codebase Snapshot

## Engine / Systems Already Present

- game loop
- path-following enemies
- wave spawning
- tower targeting and projectiles
- economy system
- upgrade system
- map system and map selection UI
- pause menu and game-over UI
- status effects
- tower placement preview
- serialization support
- audio system with 3 music tracks
- large automated test surface

## Current Content Already Present

### Towers in code now

- `Puffball Fungus`
- `Orchid Trap`
- `Venus Flytower`
- `Bioluminescent Shroom`
- `Stinkhorn Line`
- `Mycelium Network` `(currently a buildable support tower)`

### Enemies in code now

- `Red Mushroom`
- `Blue Beetle`
- `Green Caterpillar`
- `Yellow Wasp`
- `Pink Ladybug`
- `Black Widow`
- `White Moth`
- `Armored Beetle`
- `Rainbow Stag`
- `Shelled Snail`

### Maps in code now

- `6 maps` with map selection and unlock structure

## What We Have vs What We Need

## 1. Core Game Loop

### Have

- solid TD foundation already implemented
- path, spawning, targeting, firing, kills, win/lose flow all exist
- tests cover many of the core systems

### Need

- no major rewrite here
- keep this as the stable foundation

### Status

- `Mostly done`

## 2. HTML5 Jam Build

### Have

- browser-based project
- `esbuild` bundle into `public/bundle.js`
- static web structure suitable for HTML5 packaging

### Need

- clean jam-ready release folder
- itch upload checklist
- final pass on browser startup, sizing, and polish

### Status

- `Mostly done`

## 3. Tower Roster

### Have

- 6 towers already exist in code
- puffball and bioluminescent tower concepts are close to the new direction
- upgrade system already exists

### Need

- current roster does not match the locked jam roster
- current `Mycelium Network` tower must be removed or repurposed because network is now a global rule
- current towers need to become:
  - `Starter Tower`
  - `Thorn Sniper`
  - `Puffball`
  - `Slimefungus`
  - `Bulb Shooter`
  - `Bioluminescent Oracle`
- current upgrade model is still mostly classic stat-path logic and must shift toward role/behavior identity

### Status

- `Partially reusable, needs content refactor`

## 4. Upgrade Path Structure

### Have

- full upgrade infrastructure
- path/tier logic
- UI and tests around upgrades

### Need

- new rule:
  - `Top` and `Middle` available normally
  - `Bottom` only available in network
- upgrades should be more role/behavior based and less percent-stat based
- tests need to be updated to the new path rules

### Status

- `System exists, rules need redesign`

## 5. Mycelium Network Mechanic

### Have

- existing mycelium support-tower system
- buff-range logic
- tests for mycelium network behavior
- visual connection support already exists

### Need

- convert network from `tower` to `global map/system mechanic`
- towers connect to the kernel or chained connected towers
- farther from kernel costs more
- chained placement reduces cost
- network unlocks bottom path instead of acting as a separate tower buff source

### Status

- `Strong starting point, but concept must be reworked`

## 6. Enemy Model

### Have

- 10 enemy slots already exist
- multiple families already exist in code: beetle, wasp, caterpillar, moth
- enemy rendering and wave definitions exist

### Need

- replace current HP-style readability with `layer/stage break` readability
- formal enemy structure should become:
  - `Family`
  - `Layers`
  - `Trait`
- locked family set should be:
  - `Beetles`
  - `Wasps`
  - `Caterpillars`
  - `Moths`
- locked trait set should be:
  - `Metal`
  - `Camo`
  - `Shielded`
  - `Swarm-linked`
- current enemies like `Red Mushroom`, `Ladybug`, `Snail`, and `Rainbow Stag` do not fit the new scope and should be replaced

### Status

- `Needs content and rules refactor`

## 7. Map Scope

### Have

- map system
- multiple maps
- map selection UI
- unlock scaffolding

### Need

- jam should focus on `1 polished map`
- current target map is `Last Garden Reactor` style:
  - mostly natural
  - path-first
  - decayed ecosystem
  - machine presence concentrated around the kernel
- multiple-map progression should be deferred

### Status

- `System exists, scope should be reduced`

## 8. Theme Fit

### Have

- fungal world tone
- mycelium concept
- bioluminescent and organic visuals

### Need

- shift framing from generic fungal TD to:
  - `Symbiosis Kernel`
  - mycelium AI vs corrupted insect swarm
  - world in fragile ecological imbalance
- machines theme should live in:
  - lore
  - kernel
  - map remnants
  - systems language
- not in robot bugs

### Status

- `Needs narrative and visual alignment`

## 9. Audio

### Have

- 3 music tracks
- audio manager
- pause/resume/track switching support

### Need

- likely enough for jam baseline
- only polish remaining:
  - volume defaults
  - mute UX
  - maybe 1-2 SFX priorities like squash/pop and explosion

### Status

- `Good baseline`

## 10. Art Pipeline

### Have

- no full unit art pipeline yet
- 3 music tracks already produced
- docs now exist for towers and asset checklist

### Need

- path-first map creation
- tower art brief
- enemy family art brief
- Blender top-view workflow
- friend handoff brief

### Status

- `Planned, not produced`

## 11. Non-Core Features To Defer

These should be treated as optional or post-jam unless they are already nearly free:

- multi-map progression
- unlock progression
- hero system
- save/load polish
- deep serialization features
- expansion-grade content balance
- Steam packaging work before the jam build is stable

## Recommended Cuts / Reframes

## Cut or Deprioritize

- buildable `Mycelium Network` tower
- multiple-map focus
- old enemy roster that does not fit the new family/trait model

## Reframe Instead Of Rebuild

- keep the existing core engine
- keep the browser build path
- adapt the existing buff/network code into the new placement network rule
- adapt current tower systems into the new roster where possible instead of rewriting everything from zero

## Proposed Implementation Order

### Phase 1: Lock The Design Surface

1. finalize the tower spec
2. finalize the enemy family/type spec
3. finalize the single-map spec
4. finalize the art brief for friend / Blender

### Phase 2: Align The Rules With The Scope

1. convert economy language from gold to nutrients where appropriate
2. convert network from tower to system
3. implement bottom-path unlock rule for connected towers
4. remove or replace the buildable network tower

### Phase 3: Replace Content Definitions

1. update tower roster definitions
2. update upgrade path definitions
3. update enemy definitions to family/layer/trait model
4. update waves to the new enemy set

### Phase 4: Single Map Production

1. draw the path
2. build the map around it
3. add the Symbiosis Kernel
4. tune buildable areas and readability

### Phase 5: Art Integration

1. integrate base tower visuals
2. integrate enemy family visuals
3. add layer-stage visuals
4. add trait overlays
5. add minimum FX for readability

### Phase 6: Jam Packaging

1. build clean HTML5 release output
2. test in browser as a standalone upload target
3. prepare itch assets and submission copy

## Immediate Next Tasks

Highest-value next tasks from here:

1. lock the final 10 enemy types against the family/layer/trait system
2. write the friend-facing art brief from the existing docs
3. make the network-system refactor plan specific enough to implement

## Summary

- The engine is already much further along than the content
- The jam risk is not “can this game run”
- The jam risk is “can the current code/content be brought into alignment with the new scope fast enough”
- The right move is to preserve the existing technical base and aggressively refocus content, rules, and art around the locked jam design

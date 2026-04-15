# MyceliumTD Jam Asset Checklist

## Locked Scope

- `1 polished map`
- `6 towers`
- `3 lanes per tower`
- `Top` + `Middle` always available
- `Bottom` lane is network-only and still `Possible` for now
- `10 enemy types`
- Game feel target: Bloons-like readability, but not a reskin
- Theme frame: `Symbiosis Kernel` / mycelium AI vs corrupted insect swarm

## Core Visual Rules

- Nature-first world
- Machine presence mostly around the kernel and in scattered ruins
- Bugs should look like natural/corrupted insects, not robots
- Top-down readability first
- Strong silhouette separation between towers and enemy families

## Asset Checklist

## A. Map Assets

### Must Have

- `1 full map background`
  - natural ground
  - decayed / recovering environment
  - path clearly readable
  - machine remnants near the core and in scattered fragments
- `1 path layout`
  - drawn first
  - can also be exported as a clean guide/mask for gameplay alignment
- `1 Symbiosis Kernel asset`
  - main defended objective
  - half-machine / half-mycological look
- `1 placement readability pass`
  - clear buildable vs non-buildable ground

### Should Have

- broken metal fragments
- oil stains / decay patches
- root clusters
- fungal ground growth
- rocks / dead patches / debris clusters

### Nice To Have

- subtle animated glow near the kernel
- alternate prop variants for decoration

## B. Tower Assets

### Locked Tower List

1. `Starter Tower`
2. `Thorn Sniper`
3. `Puffball`
4. `Slimefungus`
5. `Bulb Shooter`
6. `Bioluminescent Oracle`

### Minimum Jam Art Per Tower

- `1 base tower render`
- `1 clear icon/button render`
- `1 projectile look`
- `1 silhouette note for top path`
- `1 silhouette note for middle path`
- `1 silhouette note for bottom/network path` `(Possible for now)`

### Better Jam Art Per Tower

- base model
- top-path add-on pass
- middle-path add-on pass
- bottom/network-path add-on pass `(Possible)`

### Tower Identity Notes

- **Starter Tower**
  - small simple mushroom turret
  - compact silhouette
  - base attack: `spore dart`

- **Thorn Sniper**
  - tall thin stalk
  - sharp needle-like read

- **Puffball**
  - round puff shape
  - soft cloudy silhouette

- **Slimefungus**
  - swollen wet fungus
  - sticky/gross visual read

- **Bulb Shooter**
  - chunky fungal launcher
  - obvious loaded bulb silhouette

- **Bioluminescent Oracle**
  - glowing mystical fungus
  - luminous cap / bulbs
  - should read as the camo-support tower

## C. Enemy Assets

## Enemy System

- Every enemy is made from:
  - `Family`
  - `Layers`
  - `Trait` `(optional)`

### Families Locked

- `Beetles`
- `Wasps`
- `Caterpillars`
- `Moths`

### Traits Locked

- `Metal`
  - requires explosive interaction to break
  - inner remaining layer becomes normal again
- `Camo`
  - persists through all layers
- `Shielded`
  - blocks at least the first hit regardless of strength
- `Swarm-linked`
  - gains benefit from being near others

### Layer Rule

- No health bars
- One hit removes one visible stage
- Final hit gives the full squash payoff
- Layered versions can exist for all families

## Proposed 10 Enemy Types

1. `Scout Beetle`
  - basic 1-layer enemy
2. `Shell Beetle`
  - 2-layer beetle
3. `Bulwark Beetle`
  - 3-layer heavier beetle
4. `Dart Wasp`
  - fast light enemy
5. `Swarm Wasp`
  - fast + `Swarm-linked`
6. `Veil Wasp`
  - fast + `Camo`
7. `Root Caterpillar`
  - slower layered body
8. `Iron Caterpillar`
  - layered + `Metal`
9. `Pale Moth`
  - floating or light movement feel
10. `Ward Moth`
  - layered + `Shielded`

## Minimum Jam Art Per Enemy Family

- `1 base family model`
- `1 broken/lower-layer stage`
- `1 heavier layer stage`
- `1 death/squash frame or effect note`

## Trait Art Needed

- `Metal` shell overlay
- `Camo` shimmer / hidden read
- `Shielded` visible first-hit shield read
- `Swarm-linked` group aura / linked read

## D. FX / Gameplay Readability Assets

### Must Have

- spore dart projectile
- sniper thorn projectile
- puffball cloud / burst
- slimefungus slow splat
- bulb explosion
- oracle glow bolt
- oracle reveal patch on path
- enemy squash effect
- layer-break effect

### Should Have

- network ghost line for placement preview
- network connection line between towers
- trait-specific hit feedback

## E. UI / Marketing Assets

### Must Have

- game logo / title treatment
- 6 tower button icons
- 1 itch cover image
- 3 to 5 screenshots

### Should Have

- jam thumbnail
- simple key art of kernel vs insect swarm

## Blender Production Plan

## 1. General Setup

- Use `1 fixed camera angle` for all gameplay assets
- Prefer `orthographic camera`
- Keep scale consistent across all towers and enemies
- Use transparent PNG output for units/towers
- Keep materials simple and readable
- Avoid high-detail noise that disappears from top-down view

## 2. Map Workflow

1. Draw the path first
2. Import or trace the path in Blender
3. Build terrain around the path
4. Keep most of the ground natural
5. Place machine detail mainly around the kernel
6. Add decay details:
   - dead patches
   - stains
   - broken fragments
   - scattered remnants
7. Render the final top-view map
8. Export a path guide or mask if useful for gameplay setup

## 3. Tower Workflow

1. Make a clean base model for each tower
2. Focus on silhouette first
3. Build path upgrades as add-on pieces rather than totally new models when possible
4. Examples of add-ons:
   - spikes
   - extra bulbs
   - wider caps
   - glowing veins
   - cloud sacs
5. Render:
   - base
   - top-path variant
   - middle-path variant
   - bottom/network-path variant `(Possible)`

## 4. Enemy Workflow

1. Build one clean base model per family
2. Build layer stages by removing or simplifying pieces
3. Use modular overlays for traits instead of full remakes
4. Good removable stage pieces:
   - shell
   - wing set
   - outer body plating
   - outer frill / bulk
5. Good trait overlays:
   - metal shell
   - shield glow
   - camo shimmer pass
   - swarm-linked aura pass

## 5. Rendering Advice

- Keep shadows soft and simple
- Use a limited palette per asset
- Separate families clearly by shape first, color second
- Test every render at actual in-game size before calling it done

## Production Order

### Best Order For Jam

1. path + map blockout
2. Symbiosis Kernel
3. 6 base towers
4. 4 base enemy families
5. enemy layer stages
6. trait overlays
7. projectile and impact FX
8. first-pass UI icons
9. upgrade add-ons / nicer variants

## Notes For Friend Brief

If a friend is drawing instead of using Blender, the most useful thing to hand over is:

- this checklist
- the tower spec
- the locked enemy families and traits
- one top-down size guide
- one map mood board
- one list of which assets are `Must Have` vs `Nice To Have`

# MyceliumTD — Game Concept

**Genre:** Tower Defense (browser, web-native)
**Platform:** HTML5 / Browser (itch.io HTML5 embed)
**Jam:** Gamedev.js 2026
**Team size:** Solo developer
**Engine:** TypeScript + HTML5 Canvas (esbuild)

## Concept

Bloons TD-inspired tower defense set in a fragile ecosystem on the edge of collapse.
The player defends the **Symbiosis Kernel** — a biological-machine hybrid — from
waves of corrupted insects using fungal towers.

Every tower is useful alone. Placing a tower within hyphal reach of the Kernel or an
already connected tower automatically joins it to the mycelium network. Connected
towers can activate distinctive Symbiote Evolutions and readable network combinations.

Enemies use visible defensive layers instead of small health bars. Each layer contains
damage capacity, visibly breaks when depleted, and passes excess damage into the next
layer so a sufficiently powerful hit can break multiple layers.

## Version-One Authority

- Network membership is created automatically through placement reach; there is no distance-based connection fee.
- Towers grow from Seedling to Mature and then choose one exclusive Predator, Specialist, or Symbiote Evolution.
- Enemy layers contain damage capacity; damage overflow may break more than one layer.
- Version one ships Garden Path, ten waves, six canonical fungal towers, and ten canonical insect enemies.

## Locked Version-One Scope

- One polished Garden Path map — nature in decay, machine presence concentrated near the Kernel
- Six canonical fungal towers with Seedling, Mature, and one permanent Evolution choice
- Ten canonical insect enemies across four families: Beetle, Wasp, Caterpillar, and Moth
- Four enemy traits: Metal, Camo, Shielded, and Swarm-linked
- Ten handcrafted waves with escalating threat introduction
- Symbiosis Kernel as the defense objective

## Art Style

- Top-down 2D canvas; semi-realistic stylized mushrooms readable at game scale
- World: nature in decay, fragile ecological imbalance
- Machine presence at the Kernel and map remnants only — bugs are natural/corrupted insects, not robots
- Color reinforces family silhouette; trait overlays are applied on top

## Deferred (Post-Version-One)

- Additional maps and map selection
- Hero system
- Persistent progression and unlocks
- Save-game progression
- Endless and difficulty modes

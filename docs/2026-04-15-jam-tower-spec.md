# MyceliumTD Jam Tower Spec

## Scope

- `6 towers`
- `3 upgrade lanes` per tower
- `Top` and `Middle` paths are always available
- `Bottom` path is `Possible` for now and is only available when the tower is connected to the mycelium network
- Upgrades should change role, shape, behavior, or projectile style
- Avoid boring percentage-only upgrades as the main identity

## Network Rules

- The player defends the `Symbiosis Kernel`
- Towers can connect to the kernel or to already-connected towers
- The network can spread across the whole map
- Towers farther from the kernel are more expensive to connect
- Building a connected chain of towers reduces network expansion cost
- This rewards deliberate layouts and creates tradeoffs in placement
- Bottom-path upgrades are reserved for connected towers

## Art Direction Notes

- Top-down readability first
- Mushrooms should feel semi-realistic, stylized, and readable
- The world is mostly nature in decay and in need of rejuvenation
- Machine presence should be concentrated around the kernel and scattered remnants in the environment
- Bugs should read as natural or corrupted insects, not robots

## Tower Roster

### 1. Starter Tower

- **Base role:** cheap early-game generalist
- **Base attack:** `spore dart`
- **Look:** small simple mushroom turret, slim stalk, compact silhouette
- **Top path:** anti-layer, sharper dart, line-pierce feel
- **Middle path:** spread, anti-swarm, multi-dart feel
- **Bottom path:** `Possible` - marks enemies for other towers

### 2. Thorn Sniper

- **Base role:** long-range precision tower
- **Look:** tall thin stalk, needle-like growth, narrow silhouette
- **Top path:** layer-focused precision hunter
- **Middle path:** faster shots and pierce
- **Bottom path:** `Possible` - executes weakened or marked enemies

### 3. Puffball

- **Base role:** splash and swarm clear
- **Look:** round puffball body, soft silhouette, visible spore sacs
- **Top path:** larger cloud and wider AoE
- **Middle path:** repeated pops and denser cluster clearing
- **Bottom path:** `Possible` - lingering fungal field on the path

### 4. Slimefungus

- **Base role:** slow and control tower
- **Look:** swollen wet fungus, sticky/slimy cap or bulb, heavy organic shape
- **Top path:** stronger slow and larger slow zone
- **Middle path:** more frequent bursts and broader coverage
- **Bottom path:** `Possible` - slow plus extra debuff or trait disruption

### 5. Bulb Shooter

- **Base role:** ranged explosive tower
- **Look:** chunky fungal body with a loaded bulb-launcher silhouette
- **Top path:** one big bomb route
- **Middle path:** cluster bomb route
- **Bottom path:** `Possible` - seeded payload with follow-up spores after impact

### 6. Bioluminescent Oracle

- **Base role:** magic and support tower
- **Base trait:** native camo detection
- **Base attack:** luminous guided bolts
- **Support effect:** places reveal patches on the path; enemies inside can be targeted by other towers
- **Look:** glowing cap, elegant shape, luminous bulbs, mystical silhouette
- **Top path:** stronger direct guided bolts
- **Middle path:** stronger reveal patches and vision control
- **Bottom path:** `Possible` - network-linked debuff and reveal synergy

## Quick Visual Read

- **Starter:** small, plain, reliable
- **Sniper:** tall, thin, sharp
- **Puffball:** round, soft, cloudy
- **Slimefungus:** swollen, sticky, gross
- **Bulb Shooter:** chunky, loaded, explosive
- **Oracle:** glowing, elegant, strange

## Notes For Refinement

- Bottom paths are intentionally not final yet
- We should refine the first upgrade on each path before going deeper
- Final path behavior should be tuned after playtesting

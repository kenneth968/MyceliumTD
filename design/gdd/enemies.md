# Enemy Model — GDD

**Status:** Aligned with the approved one-map design

## Overview

MyceliumTD has ten canonical insect enemies across four families. Regular enemies use
visible defensive layers instead of small health bars. Damage reduces the current
layer's capacity; breaking a layer changes the enemy's appearance and produces a
strong squash or pop response. Damage overflow continues into later layers, so a
powerful hit can break more than one layer. Only the final boss uses a conventional
health bar.

Each regular enemy is defined by three things: **Family** (silhouette and movement
feel), **Layers** (readable durability stages), and **Trait** (an optional property
that changes the preferred response).

## Canonical Enemy Roster

| Enemy | Function | Preferred response |
|---|---|---|
| **Scout Beetle** | Basic introductory target | Any tower |
| **Dart Wasp** | Fast, fragile pressure | Sporecap or other rapid attacks |
| **Shell Beetle** | Two visible defensive layers | Sustained damage |
| **Crawler Caterpillar** | Slow, dense target | Thorn Sniper or focused fire |
| **Swarm Wasp** | Accelerates while grouped | Puffball or Slimefungus breaks the formation |
| **Iron Caterpillar** | Metal reduces small hits | Slimefungus strips it; Thorn pierces it |
| **Veil Wasp** | Camouflaged fast threat | Oracle reveals it; explosions and fields still connect |
| **Bulwark Beetle** | Three layers plus Metal | Debuff followed by burst damage |
| **Ward Moth** | Shield blocks the first burst or effect | Rapid attacks break the shield |
| **Pale Moth** | Camouflaged endurance threat | Detection, fields, and network coverage |

## Player Fantasy

The player feels the escalating dread of a naturalist watching an ecosystem under
attack. Early waves teach visible layer breaks gently. By mid-game, the player reads
incoming enemies as a threat assessment: Metal caterpillars call for trait suppression,
piercing, or armour-resistant damage; Camo wasps call for Oracle coverage, explosions,
or persistent fields.

Every new trait should produce a moment of alarm followed by recognition of a useful
response. The final layer break is the core tactile reward and should feel satisfying
for every enemy.

## Detailed Rules

### Layers

- Every visible layer has its own damage capacity.
- Damage reduces the current layer and breaks it at zero capacity.
- Remaining damage carries into the next layer until no damage or layers remain.
- Each layer break emits one gameplay event and a readable visual response.
- Only the final boss uses a conventional health bar.

### Traits

Traits use soft counters. A preferred tower is strongly advantageous, but omitting one
tower must not make a wave mathematically impossible.

- **Swarm-linked:** Gains the configured speed bonus while another Swarm-linked enemy is inside its link radius; the bonus ends when the group separates.
- **Metal:** Reduces direct non-piercing damage but never reduces a successful hit below one damage; piercing, armour-resistant, and trait-suppressed hits bypass the reduction.
- **Camo:** Prevents ordinary direct targeting until revealed; Oracle attacks, untargeted explosions, and persistent fields may still damage the enemy.
- **Shielded:** Absorbs all damage and status effects from the first successful hit, then breaks; Execute breaks the shield but does not kill the enemy.

## Formulas

### Damage and Layers

```text
effective_damage = apply_trait_modifiers(raw_damage)
remaining_damage = effective_damage

while remaining_damage > 0 and enemy has layers:
    current_layer_hp -= remaining_damage
    if current_layer_hp > 0:
        stop
    remaining_damage = abs(current_layer_hp)
    break current layer and advance to the next layer
```

### Metal

```text
effective_damage = max(1, floor(raw_damage × (1 - metal_reduction)))
```

The reduction is skipped for piercing, armour-resistant, or trait-suppressed hits.

## Edge Cases

- A hit that exactly depletes a layer emits one break event and carries zero damage forward.
- Overflow may break several layers, but each broken layer still emits its own gameplay event.
- A shield absorbs the full first successful hit and all of that hit's status effects; no overflow reaches a layer.
- Execute against a shielded enemy breaks the shield and leaves all layers intact.
- Untargeted explosions and persistent fields can damage Camo enemies without revealing them.

## Dependencies

- **Approved one-map design** (`docs/plans/2026-07-17-mycelium-td-one-map-design.md`) — authoritative roster, trait, layer, wave, and tuning rules
- **Tower Roster** (`design/gdd/towers.md`) — preferred responses and tower-enemy interactions
- **Enemy content definitions** — single source of truth for enemy names, families, layers, traits, and wave composition
- **Combat simulation** — applies trait modifiers, layer damage, overflow, break events, shields, and status effects
- **Presentation** — renders readable silhouettes, layer stages, traits, breaks, and Camo state

## Tuning Knobs

| Knob | Initial target | Guardrail |
|---|---|---|
| Swarm-linked speed bonus | 20% | 10–30% |
| Metal reduction | 30% | 15–40% |

Exact enemy durability, speed, spawn timing, and effect magnitudes remain data-driven
and require deterministic simulation plus live playtest evidence.

## Acceptance Criteria

- [ ] Version one contains exactly the ten canonical enemies in the roster table
- [ ] Every regular enemy communicates its family, visible layers, and optional trait
- [ ] Damage reduces layer capacity and overflow can break multiple layers in one hit
- [ ] Every broken layer emits one gameplay event and a readable squash or pop response
- [ ] Swarm-linked, Metal, Camo, and Shielded follow the documented soft-counter rules
- [ ] Shielded absorbs the first successful hit and prevents its damage and status effects
- [ ] Two meaningfully different tower strategies can defeat the same deterministic roster

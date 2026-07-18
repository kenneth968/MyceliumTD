# Tower Roster — GDD

**Status:** Aligned with the approved one-map design

## Overview

MyceliumTD has six canonical fungal towers, each with a distinct combat role and
silhouette. A tower begins as a Seedling, grows once into its Mature form, and then
chooses one permanent Predator, Specialist, or Symbiote Evolution.

Network membership is automatic when placement puts a tower within hyphal reach of
the Symbiosis Kernel or an already connected tower. An isolated tower retains its
complete base function. A Symbiote Evolution requires an active connection, while
Predator and Specialist Evolutions do not.

## Canonical Tower Roster

| Tower | Primary role | Signature network interaction |
|---|---|---|
| **Sporecap** | Cheap, dependable generalist | Marks enemies for connected damage dealers |
| **Thorn Sniper** | Slow, powerful single-target damage | Deals bonus damage and executes weakened marked enemies |
| **Puffball** | Area damage against dense swarms | Leaves damaging spore clouds when network combinations trigger |
| **Slimefungus** | Slow, control, and armour disruption | Connected attacks strip or weaken defensive traits |
| **Bulb Shooter** | Explosive burst against clustered threats | Seeds targets that detonate after enough connected hits |
| **Lumen Oracle** | Detection and support | Shares camouflage detection and strengthens nearby synergies |

No individual tower efficiently answers every threat. At minimum, the roster supports
mark-and-execute precision, slow-and-burst area control, and dense Oracle-supported
network combinations.

## Player Fantasy

The player feels like a mycologist growing a living trap. Placement determines both
combat coverage and network structure. A connected board should feel orchestrated:
Sporecap marks a target for connected damage dealers, Thorn Sniper finishes a weakened
marked enemy, Slimefungus suppresses defensive traits, and Lumen Oracle strengthens a
dense network cluster.

Each tower remains distinct to place and evolve. Thorn Sniper feels deliberate and
surgical. Puffball feels satisfying against a clustered swarm. Slimefungus feels
powerful and slightly gross. Lumen Oracle feels mysterious and high-value.

## Growth and Evolution Rules

### Seedling

The base tower performs its complete core role.

### Mature

One affordable upgrade strengthens the core role and visibly grows the tower. This is
a straightforward commitment rather than a branching decision.

### Evolution

The Mature tower chooses one permanent specialization:

- **Predator:** Greater direct damage or finishing power
- **Specialist:** Stronger control or role-specific utility
- **Symbiote:** A distinctive network interaction; requires an active connection

The evolution interface presents three large cards with the behavioural change, cost,
and connection requirement. Choosing one Evolution locks the other two for that tower.
If an evolved Symbiote becomes disconnected, its Symbiosis effect becomes dormant and
reactivates immediately when the tower reconnects.

## Canonical Evolution Behaviours

Names are player-facing working names. Numeric strength remains data-driven.

| Tower | Predator | Specialist | Symbiote |
|---|---|---|---|
| **Sporecap** | **Needle Volley:** increases direct dart damage and fire rate | **Forked Spores:** darts split toward an additional nearby target | **Signal Cap:** attacks apply one refreshable mark that amplifies connected hits |
| **Thorn Sniper** | **Heartwood Needle:** greatly increases single-target impact | **Skewer:** shots pierce defensive layers and continue into a second target | **Reaper Thorn:** executes a marked, unshielded enemy below the configured health threshold |
| **Puffball** | **Burst Sac:** increases cloud damage and impact radius | **Echo Puff:** every attack produces a delayed secondary pop | **Fungal Carpet:** network triggers create a temporary damaging slow field on the path |
| **Slimefungus** | **Caustic Slime:** adds damage over time | **Bog Cap:** increases slow strength, duration, and coverage | **Trait Rot:** suppresses one active enemy trait for a configured duration |
| **Bulb Shooter** | **Siege Bulb:** creates one larger armour-resistant explosion | **Cluster Bloom:** splits the impact into several smaller explosions | **Seeded Payload:** marks the target with a seed that detonates after enough connected hits |
| **Lumen Oracle** | **Luminous Bolt:** increases guided-bolt damage and shield pressure | **Revelation Field:** creates larger, longer reveal patches that mildly slow enemies | **Chorus Light:** shares detection through the connected network and multiplies the numeric strength or duration of network-triggered effects within the Oracle's attack radius; it does not modify Execute or stack with another Chorus |

Lumen Oracle natively detects Camo enemies. Before evolving it can damage Camo itself,
but it does not reveal those enemies to other towers.

## Mechanical Rules

### Mark and Execute

```text
mark_count = 1 maximum; a new mark refreshes its duration
connected_hit_damage = base_damage × (1 + mark_damage_bonus)
execute = marked
          AND not shielded
          AND remaining_total_hp / spawn_total_hp <= execute_threshold
```

Execute breaks a shield instead of killing the shielded enemy. It grants the normal
death reward only when it destroys the enemy.

### Seeded Payload

Seeded Payload detonates after its target accumulates the configured number of
successful hits from connected towers. Additional hits do not retrigger the same seed.

### Chorus Light

Chorus Light shares Camo detection through the connected network and strengthens the
numeric power or duration of network-triggered effects inside the Oracle's attack
radius. It does not modify Execute and does not stack with another Chorus.

## Dependencies

- **Approved one-map design** (`docs/plans/2026-07-17-mycelium-td-one-map-design.md`) — authoritative roster, Evolution, network, and tuning rules
- **Enemy Model** (`design/gdd/enemies.md`) — layers, traits, shields, Camo, marks, and damage overflow
- **Tower content definitions** — single source of truth for roster names, costs, and Evolution data
- **Mycelium connectivity** — exposes connection state and recalculates after placement or sale
- **Combat and status effects** — support marks, slows, trait suppression, seeds, shields, and detection
- **Interface** — presents maturation, mutually exclusive Evolution cards, connection state, and sell value

## Tuning Knobs

| Knob | Initial target | Guardrail |
|---|---|---|
| Hyphal reach | Enough for 2–4 relay steps across Garden Path | Opening placement exposes at least two useful connection choices |
| Mature cost | 60% of tower base cost | 50–100% |
| Evolution cost | 100% of tower base cost | 80–150% |
| Mark duration | 4 seconds | 2–6 seconds |
| Mark connected-damage bonus | 20% | 10–30% |
| Execute threshold | 25% of spawn total HP | 15–35% |
| Trait suppression | 4 seconds | 2–6 seconds |
| Seeded Payload trigger | 3 connected hits | 2–5 hits |
| Fungal field duration | 6 seconds | 4–10 seconds |
| Fungal field slow | 25% | 15–40% |
| Chorus Light strength bonus | 20%, non-stacking | 10–30% |

## Acceptance Criteria

### Tower Roster

- [ ] All six canonical towers are purchasable with the names and roles in the roster table
- [ ] Each tower has a distinct silhouette readable at game scale
- [ ] Each Seedling performs its complete core role without a network connection

### Growth and Evolution

- [ ] Each tower can purchase exactly one Mature upgrade
- [ ] Each Mature tower presents Predator, Specialist, and Symbiote Evolution cards
- [ ] Choosing one Evolution permanently locks the other two for that tower
- [ ] Predator and Specialist Evolutions work regardless of network state
- [ ] Symbiote requires an active network connection and becomes dormant while disconnected
- [ ] Every Evolution changes observable tower behaviour, not only abstract statistics

### Signature Interactions

- [ ] Signal Cap applies one refreshable mark that amplifies connected hits
- [ ] Reaper Thorn executes only marked, unshielded enemies below the configured threshold
- [ ] Fungal Carpet creates a temporary damaging slow field from network triggers
- [ ] Trait Rot suppresses one active enemy trait for the configured duration
- [ ] Seeded Payload detonates after the configured number of connected hits
- [ ] Chorus Light shares detection, strengthens eligible network effects, does not alter Execute, and does not stack

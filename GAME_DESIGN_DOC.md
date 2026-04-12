# Fungal Front - Game Design Document

## Overview

**Fungal Front** is a tower defense game inspired by Bloons TD 6, themed around a bioluminescent forest ecosystem. Players place fungal and insect-based towers to defend against waves of invading mushroom creatures and insects. The game features a distinctive "mycelium network" mechanic where towers can buff each other, and towers visually evolve from sprouts to mature fungi as they gain upgrades.

---

## Gameplay Loop

1. Player starts with 650 gold and 20 lives
2. Player places towers on a map with a predefined path
3. Waves of enemies follow the path toward the exit
4. Towers automatically target and attack enemies within range
5. Enemies that reach the exit reduce player lives
6. Killing enemies earns gold for more towers and upgrades
7. Interest bonus: 5% of current gold every 5 seconds (capped at 200)
8. Round bonus: 100 gold base + 50 per round completed
9. Game ends when lives reach 0 (defeat) or all waves cleared (victory)

---

## Tower Roster

### Overview

| Tower | Cost | Range | Fire Rate | Special Effect |
|-------|------|-------|-----------|---------------|
| Puffball Fungus | 100 | 80 | 500ms | Area Damage |
| Orchid Trap | 150 | 100 | 800ms | Slow |
| Venus Flytower | 500 | 50 | 3000ms | Instakill |
| Bioluminescent Shroom | 200 | 120 | 600ms | Reveal Camo |
| Stinkhorn Line | 250 | 90 | 400ms | Poison |
| Mycelium Network | 350 | 100 | N/A | Network Buff |

---

### 1. Puffball Fungus

**Role:** Primary damage dealer, crowd control

**Visual Design:**
- Body: Spherical puffball shape
- Color: Pale cream (#F5F5DC) with brown spots
- Sprout: Small pale circle
- Mature: Larger with visible spore texture, cream glow
- Fully Matured: Full spore cloud effect, bright glow aura

**Stats:**
- Damage: 1 (base)
- Range: 80
- Fire Rate: 500ms cooldown
- Projectile Speed: 200
- Special: Area Damage (0.5 base strength, 40 base radius)
- Upgrade Path: Area damage radius + strength

**Special Effect - Area Damage:**
- Hits all enemies within explosion radius
- Damage falls off with distance from impact point
- Spore cloud lingers briefly after explosion

**Upgrade Tree - Puffball Fungus:**

| Path | Tier 1 | Tier 2 | Tier 3 |
|------|--------|--------|--------|
| **Damage** | +1 dmg (cost: 50) | +1 dmg (cost: 75) | +2 dmg (cost: 125) |
| **Range** | +12 range (cost: 50) | +16 range (cost: 75) | +24 range (cost: 125) |
| **Fire Rate** | -75ms cooldown (cost: 50) | -100ms cooldown (cost: 75) | -150ms cooldown (cost: 125) |
| **Special (Spores)** | +10 radius, +0.1 strength | +20 radius, +0.15 strength | +35 radius, +0.2 strength |

---

### 2. Orchid Trap

**Role:** Crowd control, slows and damages groups

**Visual Design:**
- Body: Orchid flower shape (5-petal)
- Color: Purple (#9932CC) with pink (#FF69B4) accents
- Sprout: Small bud, dark purple
- Mature: Open flower with visible pollen
- Fully Matured: Glowing pollen cloud, particle effects

**Stats:**
- Damage: 2 (base)
- Range: 100
- Fire Rate: 800ms cooldown
- Projectile Speed: 150
- Special: Slow (50% base strength, 1000ms base duration)
- Upgrade Path: Slow strength + duration

**Special Effect - Slow:**
- Pollen cloud reduces enemy movement speed
- Effect stacks with other slow sources (diminishing returns)
- Enemies visually struggle through pollen (particle overlay)

**Upgrade Tree - Orchid Trap:**

| Path | Tier 1 | Tier 2 | Tier 3 |
|------|--------|--------|--------|
| **Damage** | +2 dmg (cost: 75) | +3 dmg (cost: 113) | +4 dmg (cost: 188) |
| **Range** | +15 range (cost: 75) | +20 range (cost: 113) | +30 range (cost: 188) |
| **Fire Rate** | -120ms cooldown (cost: 75) | -160ms cooldown (cost: 113) | -240ms cooldown (cost: 188) |
| **Special (Pollen)** | +10% slow, +500ms duration | +15% slow, +1000ms duration | +35% slow, +2000ms duration |

---

### 3. Venus Flytower

**Role:** Boss killer, high single-target damage

**Visual Design:**
- Body: Venus flytrap head shape (jaws)
- Color: Bright green (#32CD32) with red (#DC143C) inner mouth
- Sprout: Small closed bud
- Mature: Open trap with teeth visible
- Fully Matured: Animated chomping motion, glowing green aura

**Stats:**
- Damage: 100 (base, instant kill threshold)
- Range: 50
- Fire Rate: 3000ms cooldown (very long)
- Projectile Speed: 0 (instant)
- Special: Instakill (kills enemies below HP threshold)
- Upgrade Path: Damage threshold + pierce

**Special Effect - Instakill:**
- Instantly kills enemies with HP below damage threshold
- Cannot hit bosses (HP too high)
- Visual: Quick snap animation

**Upgrade Tree - Venus Flytower:**

| Path | Tier 1 | Tier 2 | Tier 3 |
|------|--------|--------|--------|
| **Damage** | +100 dmg threshold (cost: 250) | +250 dmg threshold (cost: 375) | +500 dmg threshold (cost: 625) |
| **Range** | +8 range (cost: 250) | +10 range (cost: 375) | +15 range (cost: 625) |
| **Fire Rate** | -450ms cooldown (cost: 250) | -600ms cooldown (cost: 375) | -900ms cooldown (cost: 625) |
| **Special (Jaws)** | +10% kill threshold | +25% kill threshold | +50% kill threshold |

---

### 4. Bioluminescent Shroom

**Role:** Utility, reveals hidden/camo enemies

**Visual Design:**
- Body: Mushroom cap with glow spots
- Color: Cyan (#00CED1) bioluminescence
- Sprout: Dim glow spots
- Mature: Pulsing glow, light trails
- Fully Matured: Intense bioluminescence, wave of light on attack

**Stats:**
- Damage: 1 (base)
- Range: 120
- Fire Rate: 600ms cooldown
- Projectile Speed: 180
- Special: Reveal Camo (reveals camo enemies for 500ms base)
- Upgrade Path: Reveal duration + aoe

**Special Effect - Reveal Camo:**
- Light pulse reveals camo enemies
- Revealed enemies take +10% damage from all sources
- Effect visible as glow outline on enemies

**Upgrade Tree - Bioluminescent Shroom:**

| Path | Tier 1 | Tier 2 | Tier 3 |
|------|--------|--------|--------|
| **Damage** | +1 dmg (cost: 100) | +1 dmg (cost: 150) | +2 dmg (cost: 250) |
| **Range** | +18 range (cost: 100) | +24 range (cost: 150) | +36 range (cost: 250) |
| **Fire Rate** | -90ms cooldown (cost: 100) | -120ms cooldown (cost: 150) | -180ms cooldown (cost: 250) |
| **Special (Glow)** | +500ms reveal duration | +1500ms reveal duration | +3000ms reveal duration |

---

### 5. Stinkhorn Line

**Role:** Damage over time, persistent zone control

**Visual Design:**
- Body: Stinkhorn phallus shape (tall cylinder)
- Color: Orange-red (#FF4500) with green (#32CD32) cap
- Sprout: Small orange stalk
- Mature: Full height, dripping appearance
- Fully Matured: Intense color, spore particles constantly emitting

**Stats:**
- Damage: 3 (base)
- Range: 90
- Fire Rate: 400ms cooldown
- Projectile Speed: 120
- Special: Poison (0.5 base strength, 3000ms base duration)
- Upgrade Path: Poison damage + duration

**Special Effect - Poison:**
- Damage over time (DOT)
- Poison stacks (up to 3x)
- Visual: Green wisps on affected enemies

**Upgrade Tree - Stinkhorn Line:**

| Path | Tier 1 | Tier 2 | Tier 3 |
|------|--------|--------|--------|
| **Damage** | +3 dmg (cost: 125) | +4 dmg (cost: 188) | +5 dmg (cost: 313) |
| **Range** | +14 range (cost: 125) | +18 range (cost: 188) | +27 range (cost: 313) |
| **Fire Rate** | -60ms cooldown (cost: 125) | -80ms cooldown (cost: 188) | -120ms cooldown (cost: 313) |
| **Special (Venom)** | +0.2 poison strength, +1000ms | +0.4 poison strength, +2000ms | +0.7 poison strength, +4000ms |

---

### 6. Mycelium Network (Support Tower)

**Role:** Buffs nearby towers, support specialist

**Visual Design:**
- Body: Underground network node (circle with tendrils)
- Color: Purple (#800080) with magenta (#FF00FF) glow
- Sprout: Small node
- Mature: Visible tendril connections to nearby towers
- Fully Matured: Full network visualization, pulsing with other towers

**Stats:**
- Damage: 0 (does not attack)
- Range: 100
- Fire Rate: N/A (does not fire)
- Special: Network Buff (5% base buff per tier)
- Upgrade Path: Buff strength + range

**Special Effect - Network Buff:**
- All towers within range receive special effect amplification
- Buffs: effect strength, effect duration, area radius
- Multiple Mycelium towers stack additively
- Visual connection lines to buffed towers

**Upgrade Tree - Mycelium Network:**

| Path | Tier 1 | Tier 2 | Tier 3 |
|------|--------|--------|--------|
| **Range** | +20 range (cost: 175) | +40 range (cost: 263) | +60 range (cost: 438) |
| **Special (Network)** | +5% buff strength, +20 radius | +10% buff strength, +40 radius | +15% buff strength, +60 radius |

---

## Enemy Roster

### Overview

| Enemy | HP | Speed | Reward | Special |
|-------|-----|-------|--------|---------|
| Red Mushroom | 1 | 50 | 1 | Basic |
| Blue Beetle | 2 | 40 | 2 | Basic |
| Green Caterpillar | 3 | 30 | 3 | Basic |
| Yellow Wasp | 4 | 60 | 4 | Fast |
| Pink Ladybug | 5 | 70 | 5 | Very Fast |
| Black Widow | 10 | 35 | 10 | Camo |
| White Moth | 2 | 80 | 6 | Camo, Fast |
| Armored Beetle | 25 | 20 | 15 | High HP |
| Rainbow Stag | 15 | 45 | 20 | All Types |
| Shelled Snail | 50 | 15 | 25 | Boss |

---

### 1. Red Mushroom

**Type:** Basic
**HP:** 1
**Speed:** 50
**Reward:** 1 gold
**Visual:** Red (#DC143C) cap, white stem, small circular body
**Behavior:** Standard path following, no special abilities
**First Appears:** Wave 1

---

### 2. Blue Beetle

**Type:** Basic
**HP:** 2
**Speed:** 40
**Reward:** 2 gold
**Visual:** Blue (#4169E1) shell, segmented body, small legs
**Behavior:** Standard path following, slightly slower than Red
**First Appears:** Wave 2

---

### 3. Green Caterpillar

**Type:** Basic
**HP:** 3
**Speed:** 30
**Reward:** 3 gold
**Visual:** Green (#32CD32) segmented body, inchworm movement
**Behavior:** Slow but tanky for early waves
**First Appears:** Wave 3

---

### 4. Yellow Jacket

**Type:** Fast
**HP:** 4
**Speed:** 60
**Reward:** 4 gold
**Visual:** Yellow (#FFD700) with black stripes, wings
**Behavior:** Fast movement, threatens to overwhelm
**First Appears:** Wave 4

---

### 5. Pink Ladybug

**Type:** Very Fast
**HP:** 5
**Speed:** 70
**Reward:** 5 gold
**Visual:** Pink (#FF69B4) shell with black spots, small wings
**Behavior:** Very fast, requires rapid-fire towers
**First Appears:** Wave 5

---

### 6. Black Widow

**Type:** Camo
**HP:** 10
**Speed:** 35
**Reward:** 10 gold
**Visual:** Black (#000000) body with red (#FF0000) hourglass marking
**Behavior:** Invisible to most towers, requires camo detection
**Camo:** Yes (can only be targeted by Bioluminescent Shroom or towers with Special path upgrades that reveal camo)
**First Appears:** Wave 6

---

### 7. White Moth

**Type:** Camo, Fast
**HP:** 2
**Speed:** 80
**Reward:** 6 gold
**Visual:** White (#FFFFFF) wings with subtle pattern, fluttering motion
**Behavior:** Very fast but fragile, invisible to most towers
**Camo:** Yes
**First Appears:** Wave 7

---

### 8. Armored Beetle

**Type:** Tank
**HP:** 25
**Speed:** 20
**Reward:** 15 gold
**Visual:** Dark brown (#8B4513) heavily armored shell, glowing eyes
**Behavior:** Slow but massive HP pool, resists status effects
**First Appears:** Wave 8

---

### 9. Rainbow Stag

**Type:** Elite
**HP:** 15
**Speed:** 45
**Reward:** 20 gold
**Visual:** Iridescent rainbow (#FF0000, #FF7F00, #FFFF00, #00FF00, #0000FF, #8B00FF) shell
**Behavior:** Medium speed, medium HP, no special abilities
**First Appears:** Wave 9

---

### 10. Shelled Snail

**Type:** Boss
**HP:** 50
**Speed:** 15
**Reward:** 25 gold
**Visual:** Large spiral shell (#808080), slimy body trail
**Behavior:** Very slow but enormous HP, final wave challenge
**First Appears:** Wave 10

---

## Wave Progression

| Wave | Name | Enemies | Composition |
|------|------|---------|-------------|
| 1 | Red Dawn | 10 | Red Mushrooms only |
| 2 | Beetle Surge | 15 | 10 Red Mushrooms, 5 Blue Beetles |
| 3 | Caterpillar Crawl | 13 | 8 Blue Beetles, 5 Green Caterpillars |
| 4 | Wasp Wave | 18 | 10 Green Caterpillars, 8 Yellow Wasps |
| 5 | Ladybug Legion | 20 | 15 Yellow Wasps, 5 Pink Ladybugs |
| 6 | Widow's Web | 13 | 10 Pink Ladybugs, 3 Black Widows |
| 7 | Moth Flight | 20 | 20 White Moths (swarm) |
| 8 | Armored Assault | 20 | 5 Armored Beetles, 15 Green Caterpillars |
| 9 | Rainbow Rush | 25 | 5 Rainbow Stags, 10 Blue Beetles, 10 Yellow Wasps |
| 10 | Snail Siege | 23 | 3 Shelled Snails, 20 Pink Ladybugs |

---

## Maps

### 1. Garden Path

**Difficulty:** Easy
**Theme:** Garden
**Waves:** 10
**Starting Money Modifier:** 100%
**Starting Lives Modifier:** 100%
**Available Towers:** Puffball Fungus, Orchid Trap, Bioluminescent Shroom
**Path Shape:** S-curve through flower beds

---

### 2. Forest Loop

**Difficulty:** Easy
**Theme:** Forest
**Waves:** 10
**Starting Money Modifier:** 100%
**Starting Lives Modifier:** 100%
**Available Towers:** Puffball Fungus, Orchid Trap, Bioluminescent Shroom, Stinkhorn Line
**Path Shape:** Large loop through trees

---

### 3. Cave蜿蜒

**Difficulty:** Medium
**Theme:** Cave
**Waves:** 15
**Starting Money Modifier:** 90%
**Starting Lives Modifier:** 80%
**Available Towers:** Puffball Fungus, Orchid Trap, Bioluminescent Shroom, Stinkhorn Line, Venus Flytower
**Path Shape:** Winding through cavern chambers

---

### 4. Swamp Cross

**Difficulty:** Medium
**Theme:** Swamp
**Waves:** 15
**Starting Money Modifier:** 85%
**Starting Lives Modifier:** 80%
**Available Towers:** Puffball Fungus, Orchid Trap, Bioluminescent Shroom, Stinkhorn Line, Venus Flytower
**Path Shape:** Cross pattern through marsh

---

### 5. Mountain Spire

**Difficulty:** Hard
**Theme:** Mountain
**Waves:** 20
**Starting Money Modifier:** 80%
**Starting Lives Modifier:** 70%
**Available Towers:** All 5 attack towers (Mycelium Network extra)
**Path Shape:** Vertical climb with switchbacks

---

### 6. Expert Zigzag

**Difficulty:** Expert
**Theme:** Mountain
**Waves:** 25
**Starting Money Modifier:** 75%
**Starting Lives Modifier:** 60%
**Available Towers:** All towers
**Path Shape:** Extreme zigzag pattern

---

## Upgrade System

### Upgrade Paths

Each tower has 4 upgrade paths:

1. **Damage** - Increases base damage output
2. **Range** - Increases attack/targeting range
3. **Fire Rate** - Decreases cooldown between attacks
4. **Special** - Enhances tower's unique special effect

### Upgrade Tiers

| Tier | Stat Multiplier | Cost Multiplier |
|------|-----------------|-----------------|
| Tier 1 | 1.15x | 1.0x base |
| Tier 2 | 1.30x | 1.5x base |
| Tier 3 | 1.50x | 2.5x base |

### Upgrade Cost Formula

```
upgradeCost = floor(baseUpgradeCost * tierMultiplier * (currentTier + 1) / 2)
```

Where baseUpgradeCost = tower cost * 0.5

### Sell Value

```
sellValue = floor(baseCost * 0.7) + floor(totalUpgradeCost * 0.7)
```

---

## Visual Evolution System

Towers visually evolve based on total upgrade value invested:

| Stage | Total Upgrade Cost | Visual Changes |
|-------|-------------------|---------------|
| **Sprout** | 0 | Small, dark colors, basic shape |
| **Growing** | 1-99 | Medium size, normal colors |
| **Mature** | 100-249 | Full size, bright colors, glow center |
| **Fully Matured** | 250+ | Maximum size, intense glow, extra effects |

---

## Status Effects

### Slow
- Reduces enemy movement speed by effect strength
- Visual: Blue particles around enemy

### Poison
- Deals damage over time based on effect strength
- Duration: effect duration in milliseconds
- Visual: Green wisps on affected enemy

### Stun
- Completely stops enemy movement for duration
- Visual: Yellow stars above enemy

### Reveal Camo
- Makes camo enemies visible and targetable
- Visual: Glowing outline on revealed enemy

---

## Targeting Modes

Each tower can be set to one of 4 targeting modes:

1. **First** - Targets enemy furthest along the path
2. **Last** - Targets enemy closest to the exit
3. **Close** - Targets nearest enemy to the tower
4. **Strong** - Targets enemy with highest HP

---

## Economy

### Starting Resources
- Money: 650 gold
- Lives: 20

### Income Sources
- Kill Rewards: Based on enemy type (1-25 gold)
- Round Bonus: 100 gold base + 50 per round number
- Interest: 5% of current gold every 5 seconds (max 200 bonus)

### Tower Transactions
- Tower Purchase: Full cost deducted
- Tower Sell: 70% refund of total investment
- Upgrades: Deducted at upgrade cost

---

## Game Controls

### Keyboard Shortcuts
| Key | Action |
|-----|--------|
| 1-5 | Select tower type |
| 6 | Select Mycelium Network |
| Space | Pause/Resume |
| Escape | Cancel placement |
| F1 | Speed 1x |
| F2 | Speed 2x |
| F3 | Speed 3x |
| M | Open map selection |

### Mouse Controls
| Input | Action |
|-------|--------|
| Left Click | Place tower / Select tower / Confirm |
| Right Click | Cancel / Deselect |
| Mouse Move | Preview placement |

---

## Technical Architecture

### Core Systems
- **Path System**: Waypoint-based path following with interpolation
- **Wave System**: Timed enemy spawning with group management
- **Economy System**: Money, lives, interest, transactions
- **Targeting System**: Multiple targeting modes with range filtering
- **Collision System**: Projectile-enemy collision detection
- **Status Effect System**: Slow, poison, stun, reveal effects
- **Upgrade System**: 4-path upgrade trees with 3 tiers each

### Rendering Pipeline
- Separation of render data generation (GameRenderer) and actual drawing (main.ts)
- Unified GameFrameRenderData structure coordinates all subsystems
- Canvas 2D rendering with layered drawing order

### State Management
- GameRunner orchestrates all game systems
- GameLoop provides RAF-based update cycle
- Serialization support for save/load functionality

---

## Creative Twist: Mycelium Network

The signature mechanic going beyond a simple Bloons reskin is the **Mycelium Network** - a living fungal network that connects towers and amplifies their special effects. This creates strategic depth:

1. **Placement Strategy**: Tower placement affects network coverage
2. **Buff Stacking**: Multiple Mycelium towers provide cumulative buffs
3. **Synergy Building**: Specialized towers become more powerful with network support
4. **Visual Feedback**: Network connections visualized between towers

This transforms the game from a pure damage race into a spatial puzzle where optimal tower placement for network coverage is as important as raw firepower.

---

## Creative Twist: Visual Evolution

Unlike Bloons where towers look the same at all upgrade levels, **Fungal Front** towers visually grow from small sprouts to massive mature organisms:

1. **Sprout Stage**: Small, plain, dark-colored (initial placement)
2. **Growing Stage**: Medium size, normal tower colors (some investment)
3. **Mature Stage**: Full size, bright colors, glow effect (significant investment)
4. **Fully Mature Stage**: Maximum size, intense glow, extra visual particles (heavy investment)

This gives players visual feedback on their upgrade choices and creates a more immersive fungal world.

---

## Future Expansion Ideas

1. **Boss Waves**: Introduce MOAB-class enemies (Ant Colony, Beetle Brood, Termite Mound)
2. **Hero System**: Controllable hero unit with unique abilities
3. **Special Maps**: Maps with unique modifiers (increased camo enemies, faster waves)
4. **Achievement System**: Unlock rewards for completing challenges
5. **Daily Challenges**: procedurally modified waves for replayability

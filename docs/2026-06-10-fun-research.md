# MyceliumTD Fun Research Run

Date: 2026-06-10

## Research Question

How should MyceliumTD create a stronger feeling of improvement, challenge, and forward momentum while staying within the current HTML5 canvas tower-defense scope?

## Evidence Gathered

### External References

- Lars Doucet's Defender's Quest post argues that tower defense is strongest when it lets players focus and tests thinking. The most relevant principles are total information, readable game state, fair time control, avoiding lock-and-key enemies, and avoiding pointless variety. Source: https://www.fortressofdoors.com/optimizing-tower-defense-for-focus-and-thinking-defenders-quest/
- Stardock's Siege of Centauri design journal stresses that tower defense should start simple, add complexity gradually, provide clear UI information for deliberate decisions, and lean on replay value when play sessions are short. Source: https://www.stardock.com/games/article/495008/siege-of-centauri-dev-journal-what-makes-a-good-tower-defense-game
- Josh Bycer's upgrade-system article frames upgrades as abstracted progression that must be meaningful, visible, and felt by the player, while warning against overloaded or dominant choices. Source: https://www.gamedeveloper.com/design/how-to-power-up-players-with-upgrades
- The Game Developer flow article separates short-session microflow from macroflow difficulty progression and emphasizes challenge-skill balance, positive feedback, pacing, variety, and avoiding boredom from over-softened difficulty. Source: https://www.gamedeveloper.com/design/the-flow-applied-to-game-design
- Kingdom Rush uses stage stars and challenge modes as lightweight goals after basic level completion, giving players something to improve without requiring a heavy campaign system. Source: https://kingdomrushtd.fandom.com/wiki/Upgrades
- Bloons TD 6 uses long-term knowledge trees with prerequisites, respecs, and optional toggling. This is useful as a later reference, but it is too large for the immediate jam slice. Source: https://bloons.fandom.com/wiki/Monkey_Knowledge_%28BTD6%29

### Local Project Evidence

- Current docs already identify the right risk: the engine is stronger than the content. `docs/2026-04-15-jam-gap-plan.md` says the upgrade model is still too classic/stat-based and that the game should focus on one polished map.
- The tower spec asks for upgrades that change role, shape, behavior, or projectile style, and says to avoid boring percentage-only upgrades.
- The code already has useful foundations: enemy traits, status effects, targeting modes, map selection, wave progress, wave start control, upgrade tiers, mycelium network tests, and visual tower growth.
- Browser smoke on `http://127.0.0.1:8080/public/index.html` boots to a clean menu and the first playable screen.
- Playable-state screenshot evidence was captured at `C:\Users\kenne\AppData\Local\Temp\myceliumtd-playable-1781095635068.png`.
- Current first playable screen shows only tower name, cost, and hotkey in the arsenal. It does not communicate role, counters, upgrade fantasy, or why the next wave matters.
- The first map path is a hard orthogonal polyline. It is readable, but it does not yet feel organic or fungal.
- Entering gameplay currently requests three missing music URLs under `/public/assets/music/...`; the actual assets live under `/assets/music/...`.

## Diagnosis

MyceliumTD is playable at the engine level, but it does not yet produce a strong improvement loop. The player can buy towers and upgrades, but the game does not clearly answer:

- What problem is coming next?
- Which tower solves that problem?
- What did this upgrade change in my strategy?
- What did I accomplish beyond simply surviving another wave?
- What am I working toward after one win?

The most important shift is from "TD systems exist" to "every wave creates a readable question, every purchase is a clear answer, and every success creates a visible reward or next goal."

## Fun Pillars To Build Around

1. **Readable Arsenal**
   Every tower should advertise its role and counters before purchase. The player should understand that Puffball answers swarms, Oracle answers camo/reveal, Slime/Orchid answers speed, Stinkhorn answers durable lanes, and Venus answers marked or high-value targets.

2. **Meaningful Upgrade Identity**
   Rename generic paths into tower-specific verbs and make Tier 1 visibly alter behavior. Damage/range/fire-rate can remain under the hood, but the player-facing upgrade should be "Spore Density", "Sticky Bloom", "Marked Snap", "Network Reveal", etc.

3. **Fair Trait Challenge**
   Camo, metal, shielded, and swarm-linked enemies should be problems with multiple partial answers, not binary taxes. Wave previews should show traits early enough that a loss feels like a planning mistake, not a hidden rule.

4. **Mycelium As The Strategic Hook**
   The network should become the game's progression puzzle: connect from the Symbiosis Kernel, reduce connection cost through chains, and unlock bottom-path upgrades only for connected towers. This creates something distinct from generic Bloons-style buying.

5. **Short-Session Mastery Goals**
   For the jam scope, avoid a huge meta tree. Add lightweight goals: clear the map, clear with high lives, clear with low spend, clear without leaks, and clear optional challenge variants. This gives "something to work towards" without derailing the core map.

6. **Visible Improvement Feedback**
   Growth stages, projectile shapes, hit effects, upgrade badges, and wave-complete rewards should all make improvement obvious. A stronger tower should look and sound stronger.

## Recommended Progression Model

### In-Run Loop

1. Preview upcoming wave traits.
2. Choose tower or upgrade answer.
3. Watch the answer visibly work.
4. Receive money, wave-complete feedback, and progress toward map medals.
5. Repeat with one new pressure added every one or two waves.

### Between-Run Loop

For the near term:

- Award 1-3 "spore stars" per clear based on lives remaining.
- Add optional badges: No Leaks, Low Spend, No Sell, Fast Clear.
- Unlock challenge toggles after the first clear: Camo Bloom, Metal March, Swarm Season.
- Use these as goals, not power creep, until the core map is fun.

Later:

- Add a small mycelium knowledge tree only after the single-map loop is strong.
- Keep meta upgrades modest and optional so challenge remains skill-based.

## Wave Pacing Recommendation

The first polished map should be a 10-wave learning curve:

1. Basic swarm, teaches Puffball.
2. Slightly tougher beetles, teaches upgrade vs new tower.
3. Fast enemies, teaches slow/control.
4. Mixed basic plus fast, checks placement.
5. First trait preview, introduces camo before it kills the run.
6. Camo wave, rewards Oracle/reveal.
7. Swarm-linked wave, rewards splash/control.
8. Metal or shielded wave, rewards explosive/trait disruption.
9. Mixed exam wave with two traits.
10. Boss plus escorts, tests the whole build.

Each trait should have at least two answer paths. Example: metal can be answered by Puffball explosive damage, trait disruption, or slowing it long enough for high damage. Avoid "buy one exact tower or lose."

## Economy Recommendation

The current passive interest bonus risks rewarding waiting and hoarding more than active strategy. Consider replacing or reframing it:

- Better short-term option: between-wave nutrient reserve bonus based on clean defense or unused lives.
- Keep kill rewards and round bonuses because they make combat feedback immediate.
- If interest remains, expose it clearly in the HUD and cap it tightly so players understand the tradeoff.

## UI Requirements For Fun

Highest priority:

- Arsenal cards show role, counters, cost, hotkey, and a short tactical hint.
- Selected tower panel shows tower-specific upgrade names, current tier, next cost, stat change, and behavior description.
- Wave preview shows enemy families/traits in the next wave.
- Enemy trait icons and status effects are readable at a glance.
- Placement preview uses tower footprint clearance, not attack range, so long-range towers can sit naturally near the path.

## Visual Requirements For Fun

Highest priority:

- Projectiles need distinct silhouettes per tower: cloud, slime/drop, jaw snap, luminous bolt, poison needle, network pulse.
- Upgrades should increase VFX intensity and tower growth stage.
- The map path should use organic curves, not hard rectangular turns.
- Tower placement should feel close enough to the road that towers are engaging the lane, while still leaving a clear road shoulder.

## Immediate Implementation Priorities

1. **Arsenal and upgrade readability**
   Add role/counter/hint metadata to tower purchase cards and tower-specific upgrade labels/descriptions.

2. **Projectile and hit readability**
   Add distinct projectile shapes/trails and keep colors tied to tower identity.

3. **Organic path and placement feel**
   Add a curved path helper and stop using attack range as path-blocking clearance.

4. **Wave preview and trait teaching**
   Show next wave enemy traits before the player commits money.

5. **Fix missing music URLs**
   Serve or reference music from the correct path so entering gameplay has no 404s.

6. **Lightweight mastery goals**
   Add post-win medals/badges before building any heavy meta-progression tree.

## GitHub Issue Backlog Candidates

- Add wave preview cards with enemy trait icons and counter hints.
- Replace passive interest with clearer nutrient reserve / clean-defense bonus.
- Add end-of-map spore star medals and challenge badges.
- Convert Mycelium Network from buildable tower to global kernel connection system.
- Fix runtime music asset paths for browser play.
- Build one polished organic "Last Garden Reactor" map before expanding multi-map progression.

## Stop Condition For "Fun Enough" Vertical Slice

The game should be considered fun enough for the next milestone when a first-time player can:

- understand the first four tower roles without reading docs,
- predict the next wave's main threat,
- choose at least two valid strategies for trait waves,
- see upgrades change tower behavior or visuals,
- finish one 10-wave map,
- receive a clear score/medal/badge,
- and immediately know one better goal to attempt next.

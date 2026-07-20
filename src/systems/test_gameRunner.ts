import { GameRunner, GameSpeed, GameState, createGameRunner } from './gameRunner';
import { TowerType } from '../entities/tower';
import { EnemyTrait, StatusEffectType, createEnemy, markEnemy } from '../entities/enemy';
import { TargetingMode } from './targeting';
import { EvolutionEffect, EvolutionPath, TowerStage } from '../content/evolutionDefinitions';
import { RoundState } from './roundManager';
import { EnemyType } from './wave';
import { createGameRenderer } from './gameRenderer';

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} (expected ${expected}, got ${actual})`);
  }
}

type PlacementTower = NonNullable<ReturnType<GameRunner['placeTower']>>;
type RunnerEvents = ReturnType<GameRunner['drainEvents']>;

function assertPlacementConnectionSequence(
  events: RunnerEvents,
  tower: PlacementTower,
  expectedTimestamp: number,
  label: string,
): void {
  assertEqual(events.length, 2, `${label} should emit exactly two events`);

  const placementEvent = events[0];
  assert(placementEvent.type === 'tower_placed', `${label} should emit tower_placed first`);
  assertEqual(
    Object.keys(placementEvent).sort().join(','),
    'position,timestamp,towerId,towerType,type',
    `${label} placement event should expose the exact payload`,
  );
  assertEqual(placementEvent.timestamp, expectedTimestamp, `${label} placement timestamp`);
  assertEqual(placementEvent.position.x, tower.position.x, `${label} placement x`);
  assertEqual(placementEvent.position.y, tower.position.y, `${label} placement y`);
  assertEqual(placementEvent.towerId, tower.id, `${label} placement tower ID`);
  assertEqual(placementEvent.towerType, tower.towerType, `${label} placement tower type`);
  assert(placementEvent.position !== tower.position, `${label} placement position should be copied`);

  const connectionEvent = events[1];
  assert(
    connectionEvent.type === 'network_connection_created',
    `${label} should emit network_connection_created second`,
  );
  assertEqual(
    Object.keys(connectionEvent).sort().join(','),
    'position,sourceTowerId,timestamp,towerId,type',
    `${label} connection event should expose the exact payload`,
  );
  assertEqual(connectionEvent.timestamp, expectedTimestamp, `${label} connection timestamp`);
  assertEqual(connectionEvent.position.x, tower.position.x, `${label} connection x`);
  assertEqual(connectionEvent.position.y, tower.position.y, `${label} connection y`);
  assertEqual(connectionEvent.towerId, tower.id, `${label} connection tower ID`);
  assertEqual(connectionEvent.sourceTowerId, null, `${label} Kernel connection has no source tower`);
  assert(connectionEvent.position !== tower.position, `${label} connection position should be copied`);
  assert(
    connectionEvent.position !== placementEvent.position,
    `${label} events should not share mutable positions`,
  );
}

console.log('Testing GameRunner...');

const game = createGameRunner();
assert(game.getState() === GameState.Idle, 'Initial state should be Idle');
assert(game.getPlacedTowers().length === 0, 'Should start with no placed towers');
assert(game.getActiveEnemies().length === 0, 'Should start with no active enemies');

const stats = game.getGameStats();
assertEqual(stats.money, 500, 'Default release runner should start with exactly 500 Nutrients');
assertEqual(stats.lives, 20, 'Should start with 20 lives');
assertEqual(stats.state, GameState.Idle, 'Initial state should be Idle');
assertEqual(stats.towers, 0, 'Should have 0 towers');
assertEqual(stats.enemies, 0, 'Should have 0 enemies');

game.start();
assert(game.getState() === GameState.Playing, 'After start, state should be Playing');

const thornBesidePath = game.canPlaceTower(TowerType.ThornSniper, 100, 265);
assert(thornBesidePath.canPlace === true, 'High-range Thorn Sniper should be placeable 35px from the path');

const sporecapBesidePath = game.canPlaceTower(TowerType.Sporecap, 100, 265);
assertEqual(
  thornBesidePath.canPlace,
  sporecapBesidePath.canPlace,
  'High- and low-range towers should use the same physical path clearance'
);

const thornInsideClearance = game.canPlaceTower(TowerType.ThornSniper, 100, 275);
const sporecapInsideClearance = game.canPlaceTower(TowerType.Sporecap, 100, 275);
assert(thornInsideClearance.canPlace === false, 'High-range tower should be rejected inside 30px path clearance');
assert(sporecapInsideClearance.canPlace === false, 'Low-range tower should be rejected inside 30px path clearance');

const canPlace = game.canPlaceTower(TowerType.Puffball, 100, 100);
assert(canPlace.canPlace === true, 'Should be able to place Puffball Fungus');

const tower = game.placeTower(TowerType.Puffball, 100, 100, TargetingMode.First);
assert(tower !== null, 'Should be able to place tower');
assertEqual(game.getPlacedTowers().length, 1, 'Should have 1 placed tower');
const placementEvent = game.drainEvents().find(event => event.type === 'tower_placed');
assert(placementEvent !== undefined, 'Successful placement should emit tower_placed');
assertEqual(placementEvent.towerId, tower.id, 'Placement event should identify the confirmed tower');
assert(
  placementEvent.position !== tower.position,
  'Placement event should copy its position instead of retaining the mutable tower position',
);

const confirmedPlacementGame = createGameRunner();
assert(
  confirmedPlacementGame.startTowerPlacement(TowerType.Sporecap),
  'Should start interactive Sporecap placement',
);
confirmedPlacementGame.updatePlacementPosition(100, 100);
const confirmedTower = confirmedPlacementGame.confirmPlacement(TargetingMode.First);
assert(confirmedTower !== null, 'Interactive placement should succeed');
assert(
  confirmedPlacementGame.drainEvents().some(event => event.type === 'tower_placed'),
  'Confirmed interactive placement should emit tower_placed',
);

const directConnectionGame = createGameRunner({ startingMoney: 5000 });
directConnectionGame.start();
directConnectionGame.update(1234);
const directConnectionTower = directConnectionGame.placeTower(
  TowerType.Sporecap,
  720,
  180,
  TargetingMode.First,
);
assert(directConnectionTower !== null, 'Direct connected placement should succeed');
assertPlacementConnectionSequence(
  directConnectionGame.drainEvents(),
  directConnectionTower,
  1234,
  'direct connected placement',
);

const interactiveConnectionGame = createGameRunner({ startingMoney: 5000 });
interactiveConnectionGame.start();
interactiveConnectionGame.update(2345);
assert(
  interactiveConnectionGame.startTowerPlacement(TowerType.Sporecap),
  'Interactive connected placement should start',
);
interactiveConnectionGame.updatePlacementPosition(720, 180);
const interactiveConnectionTower = interactiveConnectionGame.confirmPlacement(TargetingMode.First);
assert(interactiveConnectionTower !== null, 'Interactive connected placement should succeed');
assertPlacementConnectionSequence(
  interactiveConnectionGame.drainEvents(),
  interactiveConnectionTower,
  2345,
  'interactive connected placement',
);

const invalidPlacementGame = createGameRunner({ startingMoney: 5000 });
assert(
  invalidPlacementGame.startTowerPlacement(TowerType.Sporecap),
  'Invalid placement scenario should enter placement mode',
);
invalidPlacementGame.updatePlacementPosition(100, 300);
assert(
  invalidPlacementGame.confirmPlacement(TargetingMode.First) === null,
  'Placement on the path should fail validation',
);
assert(
  invalidPlacementGame.drainEvents().every(event => event.type !== 'tower_placed'),
  'Invalid placement should emit no tower_placed event',
);

const unaffordablePlacementGame = createGameRunner({ startingMoney: 0 });
assert(
  unaffordablePlacementGame.placeTower(TowerType.Sporecap, 720, 180) === null,
  'Unaffordable direct placement should fail',
);
assert(
  unaffordablePlacementGame.drainEvents().every(event => event.type !== 'tower_placed'),
  'Unaffordable placement should emit no tower_placed event',
);

const newStats = game.getGameStats();
assertEqual(newStats.money, 320, 'Should have 320 Nutrients after placing Puffball (cost 180)');
assertEqual(newStats.towers, 1, 'Should have 1 tower');

const growthInfo = game.getTowerGrowthInfo(tower.id);
assert(growthInfo !== null, 'Should get growth info');
assertEqual(growthInfo.stage, TowerStage.Seedling, 'Placed tower should start as a Seedling');

const moneyBeforeInvalidEvolution = game.getEconomy().getMoney();
const invalidEvolution = game.evolveTower(tower.id, EvolutionPath.Predator);
assert(invalidEvolution.success === false, 'Seedling should not evolve');
assertEqual(game.getEconomy().getMoney(), moneyBeforeInvalidEvolution, 'Failed evolution should spend no Nutrients');
assertEqual(game.drainEvents().length, 0, 'Failed evolution should emit no success event');

const maturationResult = game.matureTower(tower.id);
assert(maturationResult.success === true, 'Seedling should mature');
const maturationEvents = game.drainEvents();
assertEqual(maturationEvents.length, 1, 'Successful maturation should emit one event');
assertEqual(maturationEvents[0].type, 'tower_matured', 'Successful maturation should emit tower_matured');

const repeatedMaturation = game.matureTower(tower.id);
assert(repeatedMaturation.success === false, 'Mature tower should not mature twice');
assertEqual(game.drainEvents().length, 0, 'Repeated maturation should emit no success event');

const evolutionResult = game.evolveTower(tower.id, EvolutionPath.Predator);
assert(evolutionResult.success === true, 'Mature tower should evolve');
const evolutionEvents = game.drainEvents();
assertEqual(evolutionEvents.length, 1, 'Successful evolution should emit one event');
const evolutionEvent = evolutionEvents.find(event => event.type === 'tower_evolved');
assert(evolutionEvent !== undefined, 'Successful evolution should emit tower_evolved');
assertEqual(evolutionEvent.path, EvolutionPath.Predator, 'Evolution event should carry its path');
assertEqual(evolutionEvent.effect, EvolutionEffect.BurstSac, 'Evolution event should carry its effect');

const unaffordableGrowthGame = createGameRunner({ startingMoney: 180 });
const unaffordableTower = unaffordableGrowthGame.placeTower(TowerType.Sporecap, 100, 100);
assert(unaffordableTower !== null, 'Should place unaffordable growth test tower');
assert(unaffordableGrowthGame.matureTower(unaffordableTower.id).success, 'Affordable maturation should succeed');
unaffordableGrowthGame.drainEvents();
const moneyBeforeUnaffordableEvolution = unaffordableGrowthGame.getEconomy().getMoney();
const unaffordableEvolution = unaffordableGrowthGame.evolveTower(unaffordableTower.id, EvolutionPath.Predator);
assert(unaffordableEvolution.success === false, 'Unaffordable evolution should fail');
assertEqual(unaffordableGrowthGame.getEconomy().getMoney(), moneyBeforeUnaffordableEvolution, 'Unaffordable evolution should spend no Nutrients');
assertEqual(unaffordableGrowthGame.drainEvents().length, 0, 'Unaffordable evolution should emit no success event');

game.startWave(0);
assert(game.isWaveActive() === true, 'Wave should be active after starting');

game.update();
assert(game.getState() === GameState.Playing, 'State should still be Playing');

const timedSpawnGame = createGameRunner();
timedSpawnGame.start();
timedSpawnGame.startWave(0);
const waveStartTime = Date.now();
timedSpawnGame.update(waveStartTime);
assertEqual(timedSpawnGame.getActiveEnemies().length, 1, 'First wave update should spawn the opening enemy');
timedSpawnGame.update(waveStartTime + 16);
assertEqual(timedSpawnGame.getActiveEnemies().length, 1, 'Wave should respect spawn interval between frame updates');

const mixedWaveRemainingGame = createGameRunner();
mixedWaveRemainingGame.start();
mixedWaveRemainingGame.startWave(1);
const mixedWaveStartTime = Date.now();
mixedWaveRemainingGame.update(mixedWaveStartTime);
assertEqual(mixedWaveRemainingGame.getActiveEnemies().length, 1, 'Mixed wave should spawn its opening enemy');
assertEqual(
  mixedWaveRemainingGame.getRemainingEnemies(),
  11,
  'Remaining enemies should count exact future group sizes in mixed waves'
);

const deterministicUpdateGame = createGameRunner({ startingLives: 20 });
deterministicUpdateGame.start();
deterministicUpdateGame.startWave(0);
const deterministicStartTime = Date.now();
deterministicUpdateGame.update(deterministicStartTime);
const deterministicEnemy = deterministicUpdateGame.getActiveEnemies()[0];
assert(deterministicEnemy !== undefined, 'Deterministic update should spawn an enemy');
const startingDistance = deterministicEnemy.pathDistance;
deterministicUpdateGame.update(deterministicStartTime + 1000);
assert(
  deterministicEnemy.pathDistance >= startingDistance + 45,
  `Enemy movement should use caller-provided frame timestamps (expected at least ${startingDistance + 45}, got ${deterministicEnemy.pathDistance})`
);

const fastForwardGame = createGameRunner({ startingLives: 20 });
fastForwardGame.start();
fastForwardGame.setGameSpeed(GameSpeed.Faster);
fastForwardGame.startWave(0);
const fastForwardStartTime = Date.now();
fastForwardGame.update(fastForwardStartTime);
const fastForwardEnemy = fastForwardGame.getActiveEnemies()[0];
assert(fastForwardEnemy !== undefined, 'Fast-forward update should spawn an enemy');
fastForwardGame.update(fastForwardStartTime + 1000);
assert(
  fastForwardEnemy.pathDistance >= 135,
  `Fast-forward should scale movement from caller timestamps (expected at least 135, got ${fastForwardEnemy.pathDistance})`
);

const metalCounterGame = createGameRunner({ startingMoney: 5000 });
metalCounterGame.start();
const nonExplosiveTower = metalCounterGame.placeTower(TowerType.BulbShooter, 720, 270, TargetingMode.First);
assert(nonExplosiveTower !== null, 'Should place non-explosive metal counter test tower');
const metalTarget = createEnemy(901, EnemyType.BulwarkBeetle, metalCounterGame.getPath());
metalTarget.pathDistance = 1420;
metalTarget.pathProgress = 1420;
metalTarget.position = { ...metalCounterGame.getPath().getPointAtDistance(metalTarget.pathDistance).position };
metalTarget.speed = 0;
metalTarget.baseSpeed = 0;
metalCounterGame.getActiveEnemies().push(metalTarget);
metalCounterGame.update(1000);
metalCounterGame.update(1400);
assertEqual(
  metalTarget.hp,
  metalTarget.maxHp - 2,
  'Base Bulb direct hits should retain Metal reduction for Siege Bulb to bypass'
);

const metalExplosiveGame = createGameRunner({ startingMoney: 5000 });
metalExplosiveGame.start();
const explosiveTower = metalExplosiveGame.placeTower(TowerType.Puffball, 720, 250, TargetingMode.First);
assert(explosiveTower !== null, 'Should place explosive metal counter test tower');
const explosiveTarget = createEnemy(902, EnemyType.BulwarkBeetle, metalExplosiveGame.getPath());
explosiveTarget.pathDistance = 1420;
explosiveTarget.pathProgress = 1420;
explosiveTarget.position = { ...metalExplosiveGame.getPath().getPointAtDistance(explosiveTarget.pathDistance).position };
explosiveTarget.speed = 0;
explosiveTarget.baseSpeed = 0;
metalExplosiveGame.getActiveEnemies().push(explosiveTarget);
metalExplosiveGame.update(1000);
metalExplosiveGame.update(1400);
assert(
  explosiveTarget.hp < explosiveTarget.maxHp,
  'Explosive Puffball hits should damage Metal enemies'
);

const traitDisruptionGame = createGameRunner({ startingMoney: 5000 });
traitDisruptionGame.start();
const disruptingTower = traitDisruptionGame.placeTower(TowerType.Slimefungus, 720, 270, TargetingMode.First);
assert(disruptingTower !== null, 'Should place Orchid trait disruption tower');
assert(traitDisruptionGame.matureTower(disruptingTower.id).success, 'Orchid should mature');
const disruptingUpgrade = traitDisruptionGame.evolveTower(disruptingTower.id, EvolutionPath.Symbiote);
assert(
  disruptingUpgrade.success === true,
  'Connected Orchid should be able to buy Special trait disruption upgrade'
);
const disruptedMetalTarget = createEnemy(912, EnemyType.BulwarkBeetle, traitDisruptionGame.getPath());
disruptedMetalTarget.pathDistance = 1420;
disruptedMetalTarget.pathProgress = 1420;
disruptedMetalTarget.position = { ...traitDisruptionGame.getPath().getPointAtDistance(disruptedMetalTarget.pathDistance).position };
disruptedMetalTarget.speed = 0;
disruptedMetalTarget.baseSpeed = 0;
traitDisruptionGame.getActiveEnemies().push(disruptedMetalTarget);
traitDisruptionGame.update(1000);
traitDisruptionGame.update(2200);
assert(
  disruptedMetalTarget.statusEffects.some(
    effect => effect.type === StatusEffectType.TraitDisrupted && effect.disruptedTrait === EnemyTrait.Metal
  ),
  'Connected Special Orchid should disrupt the Metal trait on hit'
);
assert(
  disruptedMetalTarget.hp < disruptedMetalTarget.maxHp,
  'Connected Special Orchid hit should damage Metal enemies after disrupting their trait'
);

const plainOrchidGame = createGameRunner({ startingMoney: 5000 });
plainOrchidGame.start();
const plainOrchid = plainOrchidGame.placeTower(TowerType.Slimefungus, 720, 270, TargetingMode.First);
assert(plainOrchid !== null, 'Should place ordinary Orchid metal regression tower');
const plainOrchidMetalTarget = createEnemy(913, EnemyType.BulwarkBeetle, plainOrchidGame.getPath());
plainOrchidMetalTarget.pathDistance = 1420;
plainOrchidMetalTarget.pathProgress = 1420;
plainOrchidMetalTarget.position = { ...plainOrchidGame.getPath().getPointAtDistance(plainOrchidMetalTarget.pathDistance).position };
plainOrchidMetalTarget.speed = 0;
plainOrchidMetalTarget.baseSpeed = 0;
plainOrchidGame.getActiveEnemies().push(plainOrchidMetalTarget);
plainOrchidGame.update(1000);
plainOrchidGame.update(2200);
assertEqual(
  plainOrchidMetalTarget.hp,
  plainOrchidMetalTarget.maxHp - 2,
  'Two ordinary Orchid hits should each deal the one-damage Metal floor without suppressing the trait'
);

const shieldedHitGame = createGameRunner({ startingMoney: 5000 });
shieldedHitGame.start();
const shieldBreakerTower = shieldedHitGame.placeTower(TowerType.Puffball, 720, 250, TargetingMode.First);
assert(shieldBreakerTower !== null, 'Should place shielded enemy test tower');
const shieldedTarget = createEnemy(903, EnemyType.WardMoth, shieldedHitGame.getPath());
shieldedTarget.pathDistance = 1420;
shieldedTarget.pathProgress = 1420;
shieldedTarget.position = { ...shieldedHitGame.getPath().getPointAtDistance(shieldedTarget.pathDistance).position };
shieldedTarget.speed = 0;
shieldedTarget.baseSpeed = 0;
shieldedHitGame.getActiveEnemies().push(shieldedTarget);
shieldedHitGame.update(1000);
shieldedHitGame.update(1400);
assertEqual(
  shieldedTarget.hp,
  shieldedTarget.maxHp,
  'Shielded enemies should block the first tower hit'
);
assertEqual(
  (shieldedTarget as any).shieldCharges,
  0,
  'Shielded enemy shield should break after blocking a hit'
);

const heroShieldGame = createGameRunner({ startingLives: 20 });
heroShieldGame.start();
const heroShieldTarget = createEnemy(920, EnemyType.WardMoth, heroShieldGame.getPath());
heroShieldTarget.position = { ...heroShieldGame.getPath().getPointAtDistance(0).position };
heroShieldTarget.speed = 0;
heroShieldTarget.baseSpeed = 0;
heroShieldGame.getActiveEnemies().push(heroShieldTarget);
const shieldHero = heroShieldGame.spawnHero(heroShieldTarget.position.x, heroShieldTarget.position.y);
assert(shieldHero !== null, 'Should spawn hero for shield-event regression');

heroShieldGame.update(1000);
const firstHeroShieldEvents = heroShieldGame.drainEvents().filter(event => event.type === 'trait_broken');
assertEqual(heroShieldTarget.shieldCharges, 0, 'Hero attack should consume the shield');
assertEqual(heroShieldTarget.hp, heroShieldTarget.maxHp, 'Shield should absorb the first hero attack');
assertEqual(firstHeroShieldEvents.length, 1, 'Hero shield consumption should emit exactly one trait_broken');
assertEqual(firstHeroShieldEvents[0].trait, EnemyTrait.Shielded, 'Hero shield event should identify Shielded');

heroShieldGame.update(1001);
assert(heroShieldTarget.hp < heroShieldTarget.maxHp, 'Next hero attack should damage HP');
assertEqual(
  heroShieldGame.drainEvents().filter(event => event.type === 'trait_broken').length,
  0,
  'Next hero attack should not duplicate the shield event'
);

const heroAbilityShieldGame = createGameRunner({ startingLives: 20 });
heroAbilityShieldGame.start();
const heroAbilityShieldTarget = createEnemy(922, EnemyType.WardMoth, heroAbilityShieldGame.getPath());
heroAbilityShieldTarget.position = { ...heroAbilityShieldGame.getPath().getPointAtDistance(0).position };
heroAbilityShieldTarget.speed = 0;
heroAbilityShieldTarget.baseSpeed = 0;
heroAbilityShieldGame.getActiveEnemies().push(heroAbilityShieldTarget);
const abilityHero = heroAbilityShieldGame.spawnHero(
  heroAbilityShieldTarget.position.x,
  heroAbilityShieldTarget.position.y
);
assert(abilityHero !== null, 'Should spawn hero for ability shield-event regression');

const firstAbility = heroAbilityShieldGame.useHeroAbility(0, heroAbilityShieldTarget.position);
assert(firstAbility.used, 'Damaging hero ability should be used');
assert(abilityHero!.abilities[0].currentCooldown > 0, 'Damaging hero ability should retain its cooldown behavior');
assertEqual(heroAbilityShieldTarget.shieldCharges, 0, 'Hero ability should consume the shield');
assertEqual(heroAbilityShieldTarget.hp, heroAbilityShieldTarget.maxHp, 'Shield should absorb the first hero ability hit');
assert(
  !heroAbilityShieldTarget.statusEffects.some(effect => effect.type === StatusEffectType.Slow),
  'Shield should consume the hero ability Slow status'
);
assertEqual(
  heroAbilityShieldGame.drainEvents().filter(event => event.type === 'trait_broken').length,
  1,
  'Hero ability shield consumption should emit exactly one trait_broken'
);

abilityHero!.abilities[0].currentCooldown = 0;
heroAbilityShieldGame.useHeroAbility(0, heroAbilityShieldTarget.position);
assert(heroAbilityShieldTarget.hp < heroAbilityShieldTarget.maxHp, 'Next hero ability hit should damage HP');
assertEqual(
  heroAbilityShieldGame.drainEvents().filter(event => event.type === 'trait_broken').length,
  0,
  'Next hero ability hit should not duplicate the shield event'
);

const poisonShieldGame = createGameRunner({ startingLives: 20 });
poisonShieldGame.start();
const poisonShieldTarget = createEnemy(921, EnemyType.WardMoth, poisonShieldGame.getPath());
poisonShieldTarget.position = { ...poisonShieldGame.getPath().getPointAtDistance(0).position };
poisonShieldTarget.speed = 0;
poisonShieldTarget.baseSpeed = 0;
poisonShieldTarget.statusEffects.push({
  type: StatusEffectType.Poison,
  duration: 5000,
  remaining: 5000,
  strength: 1,
});
poisonShieldGame.getActiveEnemies().push(poisonShieldTarget);

poisonShieldGame.update(0);
poisonShieldGame.drainEvents();
poisonShieldGame.update(1000);
const firstPoisonShieldEvents = poisonShieldGame.drainEvents().filter(event => event.type === 'trait_broken');
assertEqual(poisonShieldTarget.shieldCharges, 0, 'First poison tick should consume the shield');
assertEqual(poisonShieldTarget.hp, poisonShieldTarget.maxHp, 'Shield should absorb the first poison tick');
assertEqual(firstPoisonShieldEvents.length, 1, 'Poison shield consumption should emit exactly one trait_broken');
assertEqual(firstPoisonShieldEvents[0].trait, EnemyTrait.Shielded, 'Poison shield event should identify Shielded');

poisonShieldGame.update(2000);
assert(poisonShieldTarget.hp < poisonShieldTarget.maxHp, 'Next poison tick should damage HP');
assertEqual(
  poisonShieldGame.drainEvents().filter(event => event.type === 'trait_broken').length,
  0,
  'Next poison tick should not duplicate the shield event'
);

const isolatedSwarmGame = createGameRunner({ startingLives: 20 });
isolatedSwarmGame.start();
const isolatedSwarmEnemy = createEnemy(904, EnemyType.SwarmWasp, isolatedSwarmGame.getPath());
isolatedSwarmEnemy.position = { ...isolatedSwarmGame.getPath().getPointAtDistance(0).position };
isolatedSwarmGame.getActiveEnemies().push(isolatedSwarmEnemy);
isolatedSwarmGame.update(1000);
isolatedSwarmGame.update(2000);

const packedSwarmGame = createGameRunner({ startingLives: 20 });
packedSwarmGame.start();
const packedSwarmEnemies = [905, 906, 907].map(id => {
  const enemy = createEnemy(id, EnemyType.SwarmWasp, packedSwarmGame.getPath());
  enemy.position = { ...packedSwarmGame.getPath().getPointAtDistance(0).position };
  return enemy;
});
packedSwarmGame.getActiveEnemies().push(...packedSwarmEnemies);
packedSwarmGame.update(1000);
packedSwarmGame.update(2000);
assert(
  (packedSwarmEnemies[0] as any).swarmLinkedActive === true,
  'Swarm-linked enemies should activate their pack bonus when three are close together'
);
assert(
  packedSwarmEnemies[0].pathDistance > isolatedSwarmEnemy.pathDistance,
  `Swarm-linked pack bonus should move packed enemies faster than isolated ones (packed ${packedSwarmEnemies[0].pathDistance}, isolated ${isolatedSwarmEnemy.pathDistance})`
);

const swarmProjectileFreshnessGame = createGameRunner({ startingLives: 20 });
swarmProjectileFreshnessGame.start();
swarmProjectileFreshnessGame.update(0);
const movingOutOfPack = createEnemy(908, EnemyType.SwarmWasp, swarmProjectileFreshnessGame.getPath());
movingOutOfPack.pathDistance = 0;
movingOutOfPack.pathProgress = 0;
movingOutOfPack.position = { ...swarmProjectileFreshnessGame.getPath().getPointAtDistance(0).position };
movingOutOfPack.speed = 200;
movingOutOfPack.baseSpeed = 200;
const stationaryPackMateA = createEnemy(909, EnemyType.SwarmWasp, swarmProjectileFreshnessGame.getPath());
stationaryPackMateA.pathDistance = 10;
stationaryPackMateA.pathProgress = 10;
stationaryPackMateA.position = { ...swarmProjectileFreshnessGame.getPath().getPointAtDistance(10).position };
stationaryPackMateA.speed = 0;
stationaryPackMateA.baseSpeed = 0;
const stationaryPackMateB = createEnemy(910, EnemyType.SwarmWasp, swarmProjectileFreshnessGame.getPath());
stationaryPackMateB.pathDistance = 20;
stationaryPackMateB.pathProgress = 20;
stationaryPackMateB.position = { ...swarmProjectileFreshnessGame.getPath().getPointAtDistance(20).position };
stationaryPackMateB.speed = 0;
stationaryPackMateB.baseSpeed = 0;
swarmProjectileFreshnessGame.getActiveEnemies().push(movingOutOfPack, stationaryPackMateA, stationaryPackMateB);
swarmProjectileFreshnessGame.getActiveProjectiles().push({
  id: 990,
  position: { x: 0, y: 300 },
  targetId: movingOutOfPack.id,
  speed: 10000,
  damage: 0.5,
  towerType: TowerType.BulbShooter,
  alive: true,
});
swarmProjectileFreshnessGame.update(1000);
assertEqual(
  movingOutOfPack.hp,
  0.5,
  'Projectile damage should refresh Swarm-linked state after movement, so enemies that left the pack take full damage'
);

const swarmSeededPayloadFreshnessGame = createGameRunner({ startingLives: 20, startingMoney: 5000 });
swarmSeededPayloadFreshnessGame.start();
swarmSeededPayloadFreshnessGame.update(0);
const seededPayloadSource = swarmSeededPayloadFreshnessGame.placeTower(
  TowerType.BulbShooter,
  720,
  270,
  TargetingMode.First
);
assert(seededPayloadSource !== null, 'Should place a connected source tower for the injected seeded payload');
const payloadPosition = { x: 0, y: 300 };
const seededSwarmTargets = [911, 912, 913].map(id => {
  const enemy = createEnemy(id, EnemyType.SwarmWasp, swarmSeededPayloadFreshnessGame.getPath());
  enemy.pathDistance = 0;
  enemy.pathProgress = 0;
  enemy.position = { ...payloadPosition };
  enemy.speed = 0;
  enemy.baseSpeed = 0;
  return enemy;
});
swarmSeededPayloadFreshnessGame.getActiveEnemies().push(...seededSwarmTargets);
(swarmSeededPayloadFreshnessGame as any).activeSeededPayloads.push({
  id: 991,
  type: 'seeded_payload',
  position: { ...payloadPosition },
  radius: 35,
  damage: 0.5,
  delay: 1000,
  remaining: 0,
  sourceTowerId: seededPayloadSource!.id,
  targetEnemyId: seededSwarmTargets[0].id,
});
swarmSeededPayloadFreshnessGame.update(1000);
assertEqual(
  seededSwarmTargets[0].hp,
  0.5,
  'Seeded payload damage should not receive a Swarm-linked damage modifier'
);

const markApplicationGame = createGameRunner({ startingMoney: 5000 });
markApplicationGame.start();
const markingTower = markApplicationGame.placeTower(TowerType.Sporecap, 720, 250, TargetingMode.First);
assert(markingTower !== null, 'Should place Sporecap marking tower');
assert(markApplicationGame.matureTower(markingTower.id).success, 'Sporecap should mature');
const markingUpgrade = markApplicationGame.evolveTower(markingTower.id, EvolutionPath.Symbiote);
assert(markingUpgrade.success === true, 'Connected Sporecap should buy Special mark upgrade');
const markTarget = createEnemy(914, EnemyType.CrawlerCaterpillar, markApplicationGame.getPath());
markTarget.pathDistance = 1420;
markTarget.pathProgress = 1420;
markTarget.position = { ...markApplicationGame.getPath().getPointAtDistance(markTarget.pathDistance).position };
markTarget.speed = 0;
markTarget.baseSpeed = 0;
markApplicationGame.getActiveEnemies().push(markTarget);
markApplicationGame.update(1000);
markApplicationGame.update(1400);
assert(
  markTarget.statusEffects.some(effect => effect.type === StatusEffectType.Marked),
  'Connected Special Sporecap should mark its direct target'
);
assert(
  markTarget.hp === markTarget.maxHp - markingTower!.damage,
  'The direct hit should resolve before its newly applied Mark can affect later hits'
);

const executeMarkedGame = createGameRunner({ startingMoney: 5000 });
executeMarkedGame.start();
const executeTower = executeMarkedGame.placeTower(TowerType.ThornSniper, 720, 270, TargetingMode.First);
assert(executeTower !== null, 'Should place Venus execute placeholder tower');
assert(executeMarkedGame.matureTower(executeTower.id).success, 'Thorn should mature');
const executeUpgrade = executeMarkedGame.evolveTower(executeTower.id, EvolutionPath.Symbiote);
assert(executeUpgrade.success === true, 'Connected Venus should buy Special execute upgrade');
const executeTarget = createEnemy(915, EnemyType.BulwarkBeetle, executeMarkedGame.getPath());
executeTarget.pathDistance = 1420;
executeTarget.pathProgress = 1420;
executeTarget.position = { ...executeMarkedGame.getPath().getPointAtDistance(executeTarget.pathDistance).position };
executeTarget.speed = 0;
executeTarget.baseSpeed = 0;
markEnemy(executeTarget, 4000);
executeTarget.hp = 3;
executeMarkedGame.getActiveEnemies().push(executeTarget);
executeMarkedGame.getActiveProjectiles().push({
  id: 992,
  position: { ...executeTarget.position },
  targetId: executeTarget.id,
  sourceTowerId: executeTower!.id,
  speed: 0,
  damage: executeTower!.damage,
  towerType: TowerType.ThornSniper,
  alive: true,
});
const moneyBeforeExecute = executeMarkedGame.getEconomy().getMoney();
executeMarkedGame.update(0);
assert(
  executeTarget.alive === false && executeTarget.hp === 0,
  'Connected Special Thorn should execute a marked Metal enemy below the health threshold'
);
executeMarkedGame.update(16);
assertEqual(
  executeMarkedGame.getEconomy().getMoney(),
  moneyBeforeExecute + executeTarget.reward,
  'Executed enemy should grant its normal death reward on cleanup'
);

const shieldedExecuteGame = createGameRunner({ startingMoney: 5000 });
shieldedExecuteGame.start();
const shieldExecuteTower = shieldedExecuteGame.placeTower(TowerType.ThornSniper, 720, 270, TargetingMode.First);
assert(shieldExecuteTower !== null, 'Should place Venus shield execute tower');
assert(shieldedExecuteGame.matureTower(shieldExecuteTower.id).success, 'Shield execute Thorn should mature');
const shieldExecuteUpgrade = shieldedExecuteGame.evolveTower(shieldExecuteTower.id, EvolutionPath.Symbiote);
assert(shieldExecuteUpgrade.success === true, 'Connected Venus should buy Special shield execute upgrade');
const shieldedExecuteTarget = createEnemy(916, EnemyType.WardMoth, shieldedExecuteGame.getPath());
shieldedExecuteTarget.pathDistance = 1420;
shieldedExecuteTarget.pathProgress = 1420;
shieldedExecuteTarget.position = { ...shieldedExecuteGame.getPath().getPointAtDistance(shieldedExecuteTarget.pathDistance).position };
shieldedExecuteTarget.speed = 0;
shieldedExecuteTarget.baseSpeed = 0;
markEnemy(shieldedExecuteTarget, 4000);
shieldedExecuteGame.getActiveEnemies().push(shieldedExecuteTarget);
shieldedExecuteGame.getActiveProjectiles().push({
  id: 993,
  position: { ...shieldedExecuteTarget.position },
  targetId: shieldedExecuteTarget.id,
  sourceTowerId: shieldExecuteTower!.id,
  speed: 0,
  damage: shieldExecuteTower!.damage,
  towerType: TowerType.ThornSniper,
  alive: true,
});
shieldedExecuteGame.update(0);
assertEqual(
  shieldedExecuteTarget.hp,
  shieldedExecuteTarget.maxHp,
  'Shielded execute target should keep full HP when shield absorbs Execute'
);
assertEqual(
  shieldedExecuteTarget.shieldCharges,
  0,
  'Shielded execute target should lose its shield charge'
);
assert(
  shieldedExecuteTarget.alive === true,
  'Shielded execute target should survive shield-absorbed Execute'
);

game.pause();
assert(game.getState() === GameState.Paused, 'Should be paused');

game.resume();
assert(game.getState() === GameState.Playing, 'Should be playing after resume');

game.reset();
assert(game.getState() === GameState.Idle, 'Should be Idle after reset');
assertEqual(game.getPlacedTowers().length, 0, 'Should have no towers after reset');
assertEqual(game.getGameStats().money, 500, 'Reset should restore exactly 500 Nutrients');

const game2 = createGameRunner({ startingMoney: 1000, startingLives: 30 });
assertEqual(game2.getGameStats().money, 1000, 'Should start with custom money');
assertEqual(game2.getGameStats().lives, 30, 'Should start with custom lives');

const placed = game2.placeTower(TowerType.ThornSniper, 200, 200);
assert(placed !== null, 'Should place Thorn Sniper (cost 320)');
assertEqual(game2.getGameStats().money, 680, 'Should have 680 money left');

const saleResult = game2.sellTower(placed.id);
assert(saleResult.status === 'sold' && saleResult.refund > 0, 'Should get sell value');
assertEqual(game2.getPlacedTowers().length, 0, 'Should have no towers after selling');

const networkGame = createGameRunner({ startingMoney: 5000 });
const firstNetworkTower = networkGame.placeTower(TowerType.Sporecap, 720, 180);
const bridgeNetworkTower = networkGame.placeTower(TowerType.Puffball, 590, 180);
const downstreamNetworkTower = networkGame.placeTower(TowerType.ThornSniper, 450, 180);
assert(
  firstNetworkTower !== null && bridgeNetworkTower !== null && downstreamNetworkTower !== null,
  'Network chain towers should be placed',
);

assert(
  networkGame.getMyceliumNetworkState().connectedTowerIds.has(downstreamNetworkTower.id),
  'Network chain should reach the third tower',
);
const networkSalePreview = networkGame.getTowerSalePreview(bridgeNetworkTower.id);
assertEqual(
  networkSalePreview.disconnects.join(','),
  String(downstreamNetworkTower.id),
  'Sale preview should identify the downstream tower',
);
assertEqual(
  networkGame.sellTower(bridgeNetworkTower.id).status,
  'confirmation_required',
  'Bridge sale should be blocked until confirmed',
);
assertEqual(networkGame.getPlacedTowers().length, 3, 'Blocked bridge sale should preserve every tower');

networkGame.selectTower(downstreamNetworkTower.id);
const selectedNetworkRenderData = createGameRenderer().render(networkGame);
assert(
  selectedNetworkRenderData.networkConnections
    .filter(connection => connection.isHighlighted)
    .some(connection =>
      connection.sourceTowerId === firstNetworkTower.id &&
      connection.targetTowerId === bridgeNetworkTower.id
    ),
  'Selected tower path should highlight its upstream bridge',
);

assertEqual(
  networkGame.sellTower(bridgeNetworkTower.id, true).status,
  'sold',
  'Confirmed bridge sale should succeed',
);
assert(
  !networkGame.getMyceliumNetworkState().connectedTowerIds.has(downstreamNetworkTower.id),
  'Downstream tower should become isolated after confirmed bridge sale',
);
assert(
  networkGame.drainEvents().some(event => event.type === 'network_connection_created'),
  'Successful player placement should emit a connection event',
);

const game3 = createGameRunner();
const earlyGameStats = game3.getGameStats();
assertEqual(earlyGameStats.wave, 0, 'Wave should start at 0 before any wave starts');
assertEqual(earlyGameStats.totalWaves, 10, 'Should have 10 total waves');

const tenWaveReleaseGame = createGameRunner({ maxWaves: 1, startingLives: 100 });
assertEqual(
  tenWaveReleaseGame.getGameStats().totalWaves,
  10,
  'release stats ignore legacy maxWaves overrides'
);
tenWaveReleaseGame.start();
tenWaveReleaseGame.startWave(0);
const tenWaveReleaseStartTime = Date.now();
tenWaveReleaseGame.update(tenWaveReleaseStartTime);
tenWaveReleaseGame.getActiveEnemies().length = 0;
tenWaveReleaseGame.getWaveSpawner().update(tenWaveReleaseStartTime + 7000);
tenWaveReleaseGame.update(tenWaveReleaseStartTime + 7016);
assert(
  tenWaveReleaseGame.getState() !== GameState.Victory,
  'release cannot reach Victory after Wave 1 when maxWaves is overridden'
);

game3.start();
game3.startWave(4);
const wave5 = game3.getCurrentWave();
assert(wave5 !== null, 'Should get wave 5');
assertEqual(wave5!.id, 5, 'Wave should be ID 5');

game3.update();

const roundCompletionGame = createGameRunner();
roundCompletionGame.start();
roundCompletionGame.startWave(0);
const roundCompletionStartTime = Date.now();
roundCompletionGame.update(roundCompletionStartTime);
roundCompletionGame.getActiveEnemies().length = 0;
roundCompletionGame.getWaveSpawner().update(roundCompletionStartTime + 7000);
roundCompletionGame.update(roundCompletionStartTime + 7016);
assertEqual(
  roundCompletionGame.getRoundManager().getState(),
  RoundState.Intermission,
  'Round should enter intermission after the wave spawner is inactive and no enemies remain'
);

const releaseMapGame = createGameRunner();
assertEqual(releaseMapGame.getCurrentMap()?.id, 'garden_path', 'runner defaults to Garden Path');
const releaseWaveSpawner = releaseMapGame.getWaveSpawner();
const releaseRoundManager = releaseMapGame.getRoundManager();
assertEqual(releaseMapGame.setMap('garden_path'), true, 'setting Garden Path remains successful');
assert(
  releaseMapGame.getWaveSpawner() === releaseWaveSpawner,
  'setting Garden Path preserves the WaveSpawner used by RoundManager'
);
assert(
  releaseMapGame.getRoundManager() === releaseRoundManager,
  'setting Garden Path preserves the existing RoundManager'
);
assertEqual(releaseMapGame.setMap('forest_loop'), false, 'release scope rejects alternate maps');
assertEqual(releaseMapGame.getCurrentMap()?.id, 'garden_path', 'rejected map set preserves Garden Path');
assertEqual(releaseMapGame.selectMap('forest_loop'), false, 'release scope rejects alternate map selection');
assertEqual(releaseMapGame.getCurrentMap()?.id, 'garden_path', 'rejected map selection preserves Garden Path');
releaseMapGame.getMapSelectionState().selectedMapId = 'forest_loop';
assertEqual(releaseMapGame.confirmMapSelection(), false, 'release scope rejects alternate map confirmation');
assertEqual(releaseMapGame.getCurrentMap()?.id, 'garden_path', 'rejected map confirmation preserves Garden Path');
releaseMapGame.startMapSelection();
assertEqual(releaseMapGame.getMapSelectionState().isSelecting, false, 'release scope blocks map selection');
releaseMapGame.reset();
assertEqual(releaseMapGame.getCurrentMap()?.id, 'garden_path', 'reset preserves Garden Path');
assert(
  releaseMapGame.getWaveSpawner() === releaseWaveSpawner,
  'reset preserves the WaveSpawner used by RoundManager'
);

console.log('All GameRunner tests passed!');

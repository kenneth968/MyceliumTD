import { GameRunner, GameSpeed, GameState, createGameRunner } from './gameRunner';
import { TowerType } from '../entities/tower';
import { EnemyTrait, StatusEffectType, createEnemy, markEnemy } from '../entities/enemy';
import { TargetingMode } from './targeting';
import { UpgradePath } from './upgrade';
import { RoundState } from './roundManager';
import { EnemyType } from './wave';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} (expected ${expected}, got ${actual})`);
  }
}

console.log('Testing GameRunner...');

const game = createGameRunner();
assert(game.getState() === GameState.Idle, 'Initial state should be Idle');
assert(game.getPlacedTowers().length === 0, 'Should start with no placed towers');
assert(game.getActiveEnemies().length === 0, 'Should start with no active enemies');

const stats = game.getGameStats();
assertEqual(stats.money, 650, 'Should start with 650 money');
assertEqual(stats.lives, 20, 'Should start with 20 lives');
assertEqual(stats.state, GameState.Idle, 'Initial state should be Idle');
assertEqual(stats.towers, 0, 'Should have 0 towers');
assertEqual(stats.enemies, 0, 'Should have 0 enemies');

game.start();
assert(game.getState() === GameState.Playing, 'After start, state should be Playing');

const canPlace = game.canPlaceTower(TowerType.PuffballFungus, 100, 100);
assert(canPlace.canPlace === true, 'Should be able to place Puffball Fungus');

const tower = game.placeTower(TowerType.PuffballFungus, 100, 100, TargetingMode.First);
assert(tower !== null, 'Should be able to place tower');
assertEqual(game.getPlacedTowers().length, 1, 'Should have 1 placed tower');

const newStats = game.getGameStats();
assertEqual(newStats.money, 550, 'Should have 550 money after placing Puffball (cost 100)');
assertEqual(newStats.towers, 1, 'Should have 1 tower');

const upgradeInfo = game.getTowerUpgradeInfo(tower!.id);
assert(upgradeInfo !== null, 'Should get upgrade info');
if (upgradeInfo) {
  assertEqual(upgradeInfo[UpgradePath.Damage].currentTier, 0, 'Damage should be tier 0');
  assertEqual(upgradeInfo[UpgradePath.Range].currentTier, 0, 'Range should be tier 0');
  assertEqual(upgradeInfo[UpgradePath.FireRate].currentTier, 0, 'FireRate should be tier 0');
}

const upgradeResult = game.upgradeTower(tower!.id, UpgradePath.Damage);
assert(upgradeResult.success === true, 'Upgrade should succeed');
assertEqual(upgradeResult.newTier, 1, 'Should be tier 1 after upgrade');

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
  14,
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
  fastForwardEnemy.pathDistance >= 140,
  `Fast-forward should scale movement from caller timestamps (expected at least 140, got ${fastForwardEnemy.pathDistance})`
);

const metalCounterGame = createGameRunner({ startingMoney: 5000 });
metalCounterGame.start();
const nonExplosiveTower = metalCounterGame.placeTower(TowerType.StinkhornLine, 720, 270, TargetingMode.First);
assert(nonExplosiveTower !== null, 'Should place non-explosive metal counter test tower');
const metalTarget = createEnemy(901, EnemyType.ArmoredBeetle, metalCounterGame.getPath());
metalTarget.pathDistance = 1520;
metalTarget.pathProgress = 1520;
metalTarget.position = { ...metalCounterGame.getPath().getPointAtDistance(metalTarget.pathDistance).position };
metalTarget.speed = 0;
metalTarget.baseSpeed = 0;
metalCounterGame.getActiveEnemies().push(metalTarget);
metalCounterGame.update(1000);
metalCounterGame.update(1400);
assertEqual(
  metalTarget.hp,
  metalTarget.maxHp,
  'Metal enemies should ignore ordinary non-explosive tower hits'
);

const metalExplosiveGame = createGameRunner({ startingMoney: 5000 });
metalExplosiveGame.start();
const explosiveTower = metalExplosiveGame.placeTower(TowerType.PuffballFungus, 720, 250, TargetingMode.First);
assert(explosiveTower !== null, 'Should place explosive metal counter test tower');
const explosiveTarget = createEnemy(902, EnemyType.ArmoredBeetle, metalExplosiveGame.getPath());
explosiveTarget.pathDistance = 1540;
explosiveTarget.pathProgress = 1540;
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
const disruptingTower = traitDisruptionGame.placeTower(TowerType.OrchidTrap, 720, 270, TargetingMode.First);
assert(disruptingTower !== null, 'Should place Orchid trait disruption tower');
const disruptingUpgrade = traitDisruptionGame.upgradeTower(disruptingTower!.id, UpgradePath.Special);
assert(
  disruptingUpgrade.success === true,
  'Connected Orchid should be able to buy Special trait disruption upgrade'
);
const disruptedMetalTarget = createEnemy(912, EnemyType.ArmoredBeetle, traitDisruptionGame.getPath());
disruptedMetalTarget.pathDistance = 1520;
disruptedMetalTarget.pathProgress = 1520;
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
const plainOrchid = plainOrchidGame.placeTower(TowerType.OrchidTrap, 720, 270, TargetingMode.First);
assert(plainOrchid !== null, 'Should place ordinary Orchid metal regression tower');
const plainOrchidMetalTarget = createEnemy(913, EnemyType.ArmoredBeetle, plainOrchidGame.getPath());
plainOrchidMetalTarget.pathDistance = 1520;
plainOrchidMetalTarget.pathProgress = 1520;
plainOrchidMetalTarget.position = { ...plainOrchidGame.getPath().getPointAtDistance(plainOrchidMetalTarget.pathDistance).position };
plainOrchidMetalTarget.speed = 0;
plainOrchidMetalTarget.baseSpeed = 0;
plainOrchidGame.getActiveEnemies().push(plainOrchidMetalTarget);
plainOrchidGame.update(1000);
plainOrchidGame.update(2200);
assertEqual(
  plainOrchidMetalTarget.hp,
  plainOrchidMetalTarget.maxHp,
  'Ordinary Orchid should not bypass Metal without connected Special upgrade'
);

const shieldedHitGame = createGameRunner({ startingMoney: 5000 });
shieldedHitGame.start();
const shieldBreakerTower = shieldedHitGame.placeTower(TowerType.PuffballFungus, 720, 250, TargetingMode.First);
assert(shieldBreakerTower !== null, 'Should place shielded enemy test tower');
const shieldedTarget = createEnemy(903, EnemyType.RainbowStag, shieldedHitGame.getPath());
shieldedTarget.pathDistance = 1540;
shieldedTarget.pathProgress = 1540;
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

const isolatedSwarmGame = createGameRunner({ startingLives: 20 });
isolatedSwarmGame.start();
const isolatedSwarmEnemy = createEnemy(904, EnemyType.PinkLadybug, isolatedSwarmGame.getPath());
isolatedSwarmEnemy.position = { ...isolatedSwarmGame.getPath().getPointAtDistance(0).position };
isolatedSwarmGame.getActiveEnemies().push(isolatedSwarmEnemy);
isolatedSwarmGame.update(1000);
isolatedSwarmGame.update(2000);

const packedSwarmGame = createGameRunner({ startingLives: 20 });
packedSwarmGame.start();
const packedSwarmEnemies = [905, 906, 907].map(id => {
  const enemy = createEnemy(id, EnemyType.PinkLadybug, packedSwarmGame.getPath());
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
const movingOutOfPack = createEnemy(908, EnemyType.PinkLadybug, swarmProjectileFreshnessGame.getPath());
movingOutOfPack.hp = 20;
movingOutOfPack.maxHp = 20;
movingOutOfPack.pathDistance = 0;
movingOutOfPack.pathProgress = 0;
movingOutOfPack.position = { ...swarmProjectileFreshnessGame.getPath().getPointAtDistance(0).position };
movingOutOfPack.speed = 200;
movingOutOfPack.baseSpeed = 200;
const stationaryPackMateA = createEnemy(909, EnemyType.PinkLadybug, swarmProjectileFreshnessGame.getPath());
stationaryPackMateA.pathDistance = 10;
stationaryPackMateA.pathProgress = 10;
stationaryPackMateA.position = { ...swarmProjectileFreshnessGame.getPath().getPointAtDistance(10).position };
stationaryPackMateA.speed = 0;
stationaryPackMateA.baseSpeed = 0;
const stationaryPackMateB = createEnemy(910, EnemyType.PinkLadybug, swarmProjectileFreshnessGame.getPath());
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
  damage: 10,
  towerType: TowerType.StinkhornLine,
  alive: true,
});
swarmProjectileFreshnessGame.update(1000);
assertEqual(
  movingOutOfPack.hp,
  10,
  'Projectile damage should refresh Swarm-linked state after movement, so enemies that left the pack take full damage'
);

const swarmSeededPayloadFreshnessGame = createGameRunner({ startingLives: 20 });
swarmSeededPayloadFreshnessGame.start();
swarmSeededPayloadFreshnessGame.update(0);
const payloadPosition = { x: 0, y: 300 };
const seededSwarmTargets = [911, 912, 913].map(id => {
  const enemy = createEnemy(id, EnemyType.PinkLadybug, swarmSeededPayloadFreshnessGame.getPath());
  enemy.hp = 20;
  enemy.maxHp = 20;
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
  type: 'stinkhorn_seeded_payload',
  position: { ...payloadPosition },
  radius: 35,
  damage: 10,
  delay: 1000,
  remaining: 0,
  sourceTowerId: 1,
});
swarmSeededPayloadFreshnessGame.update(1000);
assertEqual(
  seededSwarmTargets[0].hp,
  11,
  'Seeded payload damage should refresh Swarm-linked state before detonation damage'
);

const markApplicationGame = createGameRunner({ startingMoney: 5000 });
markApplicationGame.start();
const markingTower = markApplicationGame.placeTower(TowerType.PuffballFungus, 720, 250, TargetingMode.First);
assert(markingTower !== null, 'Should place Puffball mark placeholder tower');
const markingUpgrade = markApplicationGame.upgradeTower(markingTower!.id, UpgradePath.Special);
assert(markingUpgrade.success === true, 'Connected Puffball should buy Special mark upgrade');
const markTarget = createEnemy(914, EnemyType.BlueBeetle, markApplicationGame.getPath());
markTarget.hp = 10;
markTarget.maxHp = 10;
markTarget.pathDistance = 1540;
markTarget.pathProgress = 1540;
markTarget.position = { ...markApplicationGame.getPath().getPointAtDistance(markTarget.pathDistance).position };
markTarget.speed = 0;
markTarget.baseSpeed = 0;
markApplicationGame.getActiveEnemies().push(markTarget);
markApplicationGame.update(1000);
markApplicationGame.update(1400);
assert(
  markTarget.statusEffects.some(effect => effect.type === StatusEffectType.Marked),
  'Connected Special Puffball should mark its direct target'
);
assert(
  markTarget.hp <= 8,
  'The marked Puffball hit should include the +1 marked damage bonus'
);

const executeMarkedGame = createGameRunner({ startingMoney: 5000 });
executeMarkedGame.start();
const executeTower = executeMarkedGame.placeTower(TowerType.VenusFlytower, 720, 270, TargetingMode.First);
assert(executeTower !== null, 'Should place Venus execute placeholder tower');
const executeUpgrade = executeMarkedGame.upgradeTower(executeTower!.id, UpgradePath.Special);
assert(executeUpgrade.success === true, 'Connected Venus should buy Special execute upgrade');
const executeTarget = createEnemy(915, EnemyType.ArmoredBeetle, executeMarkedGame.getPath());
executeTarget.pathDistance = 1520;
executeTarget.pathProgress = 1520;
executeTarget.position = { ...executeMarkedGame.getPath().getPointAtDistance(executeTarget.pathDistance).position };
executeTarget.speed = 0;
executeTarget.baseSpeed = 0;
markEnemy(executeTarget, 4000);
executeMarkedGame.getActiveEnemies().push(executeTarget);
executeMarkedGame.getActiveProjectiles().push({
  id: 992,
  position: { ...executeTarget.position },
  targetId: executeTarget.id,
  sourceTowerId: executeTower!.id,
  speed: 0,
  damage: executeTower!.damage,
  towerType: TowerType.VenusFlytower,
  alive: true,
});
const moneyBeforeExecute = executeMarkedGame.getEconomy().getMoney();
executeMarkedGame.update(0);
assert(
  executeTarget.alive === false && executeTarget.hp === 0,
  'Connected Special Venus should execute a marked Metal enemy without ordinary damage checks'
);
executeMarkedGame.update(16);
assertEqual(
  executeMarkedGame.getEconomy().getMoney(),
  moneyBeforeExecute + executeTarget.reward,
  'Executed enemy should grant its normal death reward on cleanup'
);

const shieldedExecuteGame = createGameRunner({ startingMoney: 5000 });
shieldedExecuteGame.start();
const shieldExecuteTower = shieldedExecuteGame.placeTower(TowerType.VenusFlytower, 720, 270, TargetingMode.First);
assert(shieldExecuteTower !== null, 'Should place Venus shield execute tower');
const shieldExecuteUpgrade = shieldedExecuteGame.upgradeTower(shieldExecuteTower!.id, UpgradePath.Special);
assert(shieldExecuteUpgrade.success === true, 'Connected Venus should buy Special shield execute upgrade');
const shieldedExecuteTarget = createEnemy(916, EnemyType.RainbowStag, shieldedExecuteGame.getPath());
shieldedExecuteTarget.pathDistance = 1520;
shieldedExecuteTarget.pathProgress = 1520;
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
  towerType: TowerType.VenusFlytower,
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
assertEqual(game.getGameStats().money, 650, 'Should have 650 money after reset');

const game2 = createGameRunner({ startingMoney: 1000, startingLives: 30 });
assertEqual(game2.getGameStats().money, 1000, 'Should start with custom money');
assertEqual(game2.getGameStats().lives, 30, 'Should start with custom lives');

const placed = game2.placeTower(TowerType.VenusFlytower, 200, 200);
assert(placed !== null, 'Should place Venus Flytower (cost 500)');
assertEqual(game2.getGameStats().money, 500, 'Should have 500 money left');

const sellValue = game2.sellTower(placed!.id);
assert(sellValue > 0, 'Should get sell value');
assertEqual(game2.getPlacedTowers().length, 0, 'Should have no towers after selling');

const game3 = createGameRunner();
const earlyGameStats = game3.getGameStats();
assertEqual(earlyGameStats.wave, 0, 'Wave should start at 0 before any wave starts');
assertEqual(earlyGameStats.totalWaves, 10, 'Should have 10 total waves');

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

console.log('All GameRunner tests passed!');

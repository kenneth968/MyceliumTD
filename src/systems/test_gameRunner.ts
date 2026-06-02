import { GameRunner, GameSpeed, GameState, createGameRunner } from './gameRunner';
import { TowerType } from '../entities/tower';
import { createEnemy } from '../entities/enemy';
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

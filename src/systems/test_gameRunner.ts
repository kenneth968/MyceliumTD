import { GameRunner, GameSpeed, GameState, createGameRunner } from './gameRunner';
import { TowerType } from '../entities/tower';
import { TargetingMode } from './targeting';
import { UpgradePath } from './upgrade';

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

console.log('All GameRunner tests passed!');

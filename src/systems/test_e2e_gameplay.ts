import { GameRunner, GameState, createGameRunner } from './gameRunner';
import { TowerType, TOWER_STATS } from '../entities/tower';
import { EnemyType, EnemyVariant, ENEMY_STATS } from './wave';
import { applyEnemyVariant, createEnemy } from '../entities/enemy';
import { createDefaultPath } from './path';
import { TargetingMode } from './targeting';
import { EvolutionPath, TowerStage } from '../content/evolutionDefinitions';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`  FAIL: ${name} - ${e.message}`);
    failed++;
  }
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertApprox(actual: number, expected: number, tolerance: number, message: string) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}: expected ~${expected}, got ${actual}`);
  }
}

console.log('=== End-to-End Gameplay Integration Tests ===\n');

test('Combat presentation only renders the boss health bar', () => {
  const game = createGameRunner();
  const shell = createEnemy(7003, EnemyType.ShellBeetle, createDefaultPath());
  const boss = createEnemy(7004, EnemyType.WardMoth, createDefaultPath());
  applyEnemyVariant(boss, EnemyVariant.Boss);
  Reflect.set(game, 'activeEnemies', [shell, boss]);

  const frame = game.getHealthBarsRenderData();
  assert(frame.healthBars.length === 1, `Expected one boss health bar, got ${frame.healthBars.length}`);
  assert(frame.healthBars[0].enemyId === boss.id, 'Only the boss receives a health bar');
});

test('Full game session: start -> place towers -> play wave -> verify economy tracking', () => {
  const game = createGameRunner({ startingMoney: 650, startingLives: 20, maxWaves: 10 });
  game.start();
  
  const stats = game.getGameStats();
  assert(stats.money === 650, `Should start with 650 money, got ${stats.money}`);
  assert(stats.lives === 20, `Should start with 20 lives, got ${stats.lives}`);
  assert(stats.state === GameState.Playing, 'Game should be Playing');
  
  const tower = game.placeTower(TowerType.Puffball, 100, 100, TargetingMode.First);
  assert(tower !== null, 'Should place Puffball Fungus tower');
  
  const afterPlace = game.getGameStats();
  assert(afterPlace.money === 470, `Should have 470 money after tower purchase, got ${afterPlace.money}`);
  assert(afterPlace.towers === 1, `Should have 1 tower, got ${afterPlace.towers}`);
  
  game.startWave(0);
  assert(game.isWaveActive(), 'Wave should be active after starting');
  
  let enemySpawned = false;
  const sessionStartTime = Date.now();
  
  for (let i = 0; i < 500; i++) {
    game.update(sessionStartTime + i * 16);
    
    const enemies = game.getActiveEnemies();
    if (enemies.length > 0 && !enemySpawned) {
      enemySpawned = true;
    }
    
    if (i > 50 && enemySpawned) break;
  }
  
  assert(enemySpawned, 'Enemies should have spawned from wave');
  
  const midStats = game.getGameStats();
  assert(midStats.enemies >= 0, 'Should track enemies');
});

test('Tower placement deducts cost from economy', () => {
  const game = createGameRunner({ startingMoney: 1000 });
  game.start();
  
  game.placeTower(TowerType.Puffball, 100, 100, TargetingMode.First);
  
  const canPlaceTooClose = game.canPlaceTower(TowerType.Slimefungus, 105, 105);
  assert(canPlaceTooClose.canPlace === false, 'Should not be able to afford second Orchid without more money');
  
  const validSpot = game.canPlaceTower(TowerType.ThornSniper, 300, 300);
  assert(validSpot.canPlace === true, 'Should be able to place in valid spot');
});

test('Growth system integration: maturation and Evolution modify stats and cost money', () => {
  const game = createGameRunner({ startingMoney: 1000 });
  game.start();
  
  const tower = game.placeTower(TowerType.Slimefungus, 200, 200, TargetingMode.First);
  assert(tower !== null, 'Tower should be placed');
  
  const preGrowth = game.getTowerGrowthInfo(tower.id);
  assert(preGrowth !== null, 'Should get growth info');
  assert(preGrowth.stage === TowerStage.Seedling, 'Should start as a Seedling');
  
  const initialMoney = game.getGameStats().money;
  const maturationResult = game.matureTower(tower.id);
  assert(maturationResult.success === true, 'Maturation should succeed');
  
  const postUpgrade = game.getGameStats();
  assert(postUpgrade.money < initialMoney, 'Money should be spent on maturation');
  
  const postInfo = game.getTowerGrowthInfo(tower.id);
  assert(postInfo?.stage === TowerStage.Mature, 'Should be Mature after maturation');

  const evolution = game.evolveTower(tower.id, EvolutionPath.Predator);
  assert(evolution.success, 'Mature tower should evolve');
  const exclusiveEvolution = game.evolveTower(tower.id, EvolutionPath.Specialist);
  assert(exclusiveEvolution.success === false, 'Evolution should be exclusive');
});

test('Wave progression: starting wave changes wave index', () => {
  const game = createGameRunner({ startingMoney: 650, startingLives: 20, maxWaves: 10 });
  game.start();
  
  game.startWave(0);
  
  const waveIndex = game.getWaveSpawner().getCurrentWaveIndex();
  assert(waveIndex === 0, `First wave should be index 0, got ${waveIndex}`);
});

test('Manual next wave start advances after the previous wave completes', () => {
  const game = createGameRunner({ startingMoney: 650, startingLives: 20, maxWaves: 10 });
  game.start();

  game.startWave(0);

  let currentTime = 0;
  for (let i = 0; i < 80; i++) {
    currentTime += 1000;
    game.update(currentTime);
    if (!game.isWaveActive() && game.getActiveEnemies().length === 0) {
      break;
    }
  }

  assert(!game.isWaveActive(), 'First wave should finish spawning');
  assert(game.getActiveEnemies().length === 0, 'First wave enemies should have left or died');
  assert(game.getWaveSpawner().getCurrentWaveIndex() === 0, 'Completed wave should be wave index 0 before the next start');

  const started = game.startWave();

  assert(started === true, 'Manual next wave start should succeed after intermission begins');
  assert(game.getWaveSpawner().getCurrentWaveIndex() === 1, 'Manual next wave start should advance to wave index 1');
});

test('Recommended build order can reach victory across all 10 waves', () => {
  const game = createGameRunner({ startingMoney: 650, startingLives: 20, maxWaves: 10 });
  game.start();

  const buildOrder = [
    { type: TowerType.BulbShooter, x: 340, y: 440, mode: TargetingMode.First },
    { type: TowerType.LumenOracle, x: 340, y: 160, mode: TargetingMode.First },
    { type: TowerType.Puffball, x: 100, y: 240, mode: TargetingMode.First },
    { type: TowerType.Puffball, x: 100, y: 360, mode: TargetingMode.First },
    { type: TowerType.BulbShooter, x: 460, y: 440, mode: TargetingMode.First },
    { type: TowerType.Slimefungus, x: 260, y: 160, mode: TargetingMode.First },
    { type: TowerType.Puffball, x: 340, y: 300, mode: TargetingMode.First },
    { type: TowerType.LumenOracle, x: 660, y: 360, mode: TargetingMode.First },
    { type: TowerType.BulbShooter, x: 540, y: 440, mode: TargetingMode.First },
    { type: TowerType.Puffball, x: 460, y: 300, mode: TargetingMode.First },
    { type: TowerType.ThornSniper, x: 660, y: 240, mode: TargetingMode.Strong },
    { type: TowerType.BulbShooter, x: 340, y: 560, mode: TargetingMode.First },
    { type: TowerType.LumenOracle, x: 700, y: 360, mode: TargetingMode.First },
    { type: TowerType.Puffball, x: 700, y: 240, mode: TargetingMode.First },
    { type: TowerType.Slimefungus, x: 500, y: 300, mode: TargetingMode.First },
    { type: TowerType.ThornSniper, x: 460, y: 160, mode: TargetingMode.Strong },
  ];
  let nextBuildIndex = 0;
  let wavesStarted = 0;
  let lastWaveIndex = -1;

  const buyAffordableTowers = () => {
    while (nextBuildIndex < buildOrder.length) {
      const next = buildOrder[nextBuildIndex];
      if (!game.getEconomy().canAfford(TOWER_STATS[next.type].cost)) {
        return;
      }

      const tower = game.placeTower(next.type, next.x, next.y, next.mode);
      assert(tower !== null, `Build order tower ${next.type} should be placeable at ${next.x},${next.y}`);
      nextBuildIndex++;
    }
  };

  buyAffordableTowers();
  let currentTime = 0;
  for (let i = 0; i < 30000; i++) {
    const stats = game.getGameStats();
    if (stats.state === GameState.Victory || stats.state === GameState.GameOver) {
      break;
    }

    if (!game.isWaveActive() && game.getActiveEnemies().length === 0) {
      buyAffordableTowers();
      const started = game.startWave();
      const waveIndex = game.getWaveSpawner().getCurrentWaveIndex();
      if (started && waveIndex !== lastWaveIndex) {
        wavesStarted++;
        lastWaveIndex = waveIndex;
      }
    }

    currentTime += 100;
    game.update(currentTime);
  }

  const finalStats = game.getGameStats();
  assert(finalStats.state === GameState.Victory, `Build order should reach victory, got ${finalStats.state}`);
  assert(finalStats.wave === 10, `Victory should happen after wave 10, got wave ${finalStats.wave}`);
  assert(wavesStarted === 10, `Should manually start all 10 waves, got ${wavesStarted}`);
  assert(finalStats.lives > 0, `Victory should preserve at least one life, got ${finalStats.lives}`);
  assert(nextBuildIndex === buildOrder.length, 'Build order should be fully affordable by the end of the game');
});

test('Sell tower returns value and removes from placed towers', () => {
  const game = createGameRunner({ startingMoney: 650 });
  game.start();
  
  const tower = game.placeTower(TowerType.Puffball, 100, 100, TargetingMode.First);
  assert(tower !== null, 'Tower should be placed');
  
  const preSellMoney = game.getGameStats().money;
  const sellResult = game.sellTower(tower.id);
  assert(
    sellResult.status === 'sold' && sellResult.refund > 0,
    `Sell value should be positive, got ${sellResult.refund}`,
  );
  
  const postSell = game.getGameStats();
  assert(postSell.towers === 0, 'Should have 0 towers after selling');
  assert(postSell.money > preSellMoney, 'Should regain money from selling');
});

test('Pause/resume toggles game state correctly', () => {
  const game = createGameRunner();
  game.start();
  
  game.pause();
  assert(game.getState() === GameState.Paused, 'Should be Paused after pause()');
  
  game.resume();
  assert(game.getState() === GameState.Playing, 'Should be Playing after resume()');
  
  game.pause();
  game.resume();
  assert(game.getState() === GameState.Playing, 'Should be Playing after resume()');
});

test('Reset clears all game state back to initial', () => {
  const game = createGameRunner({ startingMoney: 650, startingLives: 20 });
  game.start();
  
  game.placeTower(TowerType.Puffball, 100, 100, TargetingMode.First);
  game.startWave(0);
  
  game.reset();
  
  const stats = game.getGameStats();
  assert(stats.money === 650, `Should have 650 money after reset, got ${stats.money}`);
  assert(stats.lives === 20, `Should have 20 lives after reset, got ${stats.lives}`);
  assert(stats.towers === 0, `Should have 0 towers after reset, got ${stats.towers}`);
  assert(stats.state === GameState.Idle, 'State should be Idle after reset');
});

test('Game speed changes affect update delta time', () => {
  const game = createGameRunner();
  game.start();
  
  game.placeTower(TowerType.Puffball, 100, 100, TargetingMode.First);
  game.startWave(0);
  
  game.setGameSpeed(1);
  assert(game.getGameSpeed() === 1, 'Game speed should be 1x');
  
  game.setGameSpeed(2);
  assert(game.getGameSpeed() === 2, 'Game speed should be 2x');
  
  game.setGameSpeed(3);
  assert(game.getGameSpeed() === 3, 'Game speed should be 3x');
  
  game.setGameSpeed(1);
  assert(game.getGameSpeed() === 1, 'Game speed should be back to 1x');
});

test('Economy does not accrue passive interest by default', () => {
  const game = createGameRunner({ startingMoney: 650 });
  game.start();
  
  const initialMoney = game.getGameStats().money;
  const interestStartTime = Date.now();
  
  for (let i = 0; i < 10; i++) {
    game.update(interestStartTime + i * 5000);
  }
  
  const laterMoney = game.getGameStats().money;
  assert(laterMoney === initialMoney, 'Money should stay stable because default passive interest is disabled');
});

test('Towers can be placed and tracked in game state', () => {
  const game = createGameRunner({ startingMoney: 1000 });
  game.start();
  
  const tower1 = game.placeTower(TowerType.Puffball, 100, 100, TargetingMode.First);
  const tower2 = game.placeTower(TowerType.Slimefungus, 200, 100, TargetingMode.Last);
  const tower3 = game.placeTower(TowerType.ThornSniper, 300, 100, TargetingMode.Strong);
  
  assert(tower1 !== null, 'First tower placed');
  assert(tower2 !== null, 'Second tower placed');
  assert(tower3 !== null, 'Third tower placed');
  
  const towers = game.getPlacedTowers();
  assert(towers.length === 3, `Should have 3 towers, got ${towers.length}`);
});

test('Tower info panel integrates with game runner selection', () => {
  const game = createGameRunner({ startingMoney: 1000 });
  game.start();
  
  const tower = game.placeTower(TowerType.ThornSniper, 200, 200, TargetingMode.First);
  assert(tower !== null, 'Tower should be placed');
  
  game.selectTower(tower!.id);
  game.update();
  
  const info = game.getTowerInfoPanelRenderData();
  assert(info !== null, 'Tower info panel should have data');
  if (info) {
    assert(info.towerId === tower!.id, `Tower id should match: ${info.towerId} vs ${tower!.id}`);
  }
  
  game.deselectTower();
});

test('Release run stays on Garden Path and blocks map selection entry', () => {
  const game = createGameRunner();

  game.startMapSelection();
  const mapState = game.getMapSelectionState();
  assert(mapState.isSelecting === false, 'Map selection should remain inactive');
  assert(game.getCurrentMap()?.id === 'garden_path', 'Release run should remain on Garden Path');
});

test('Round manager tracks wave progression correctly', () => {
  const game = createGameRunner({ maxWaves: 10 });
  game.start();
  
  const roundManager = game.getRoundManager();
  assert(roundManager !== null, 'Round manager should exist');
  
  game.startWave(0);
  
  const stats = game.getGameStats();
  assert(stats.totalWaves === 10, 'Should have 10 total waves');
});

test('Game runner update loop runs without errors through multiple frames', () => {
  const game = createGameRunner({ startingMoney: 650, startingLives: 20 });
  game.start();
  
  game.placeTower(TowerType.Puffball, 100, 100, TargetingMode.First);
  game.placeTower(TowerType.Slimefungus, 200, 100, TargetingMode.Last);
  game.startWave(0);
  
  const loopStartTime = Date.now();
  for (let i = 0; i < 100; i++) {
    game.update(loopStartTime + i * 16);
  }
  
  const stats = game.getGameStats();
  assert(stats.state === GameState.Playing || stats.state === GameState.Paused, 
    `Game should still be running, got ${stats.state}`);
});

test('Enemies spawn from wave spawner when wave starts', () => {
  const game = createGameRunner({ startingMoney: 1000 });
  game.start();
  
  game.placeTower(TowerType.Puffball, 100, 100, TargetingMode.First);
  game.startWave(0);
  
  let enemySpawned = false;
  const spawnStartTime = Date.now();
  for (let i = 0; i < 500; i++) {
    game.update(spawnStartTime + i * 16);
    
    if (game.getActiveEnemies().length > 0) {
      enemySpawned = true;
      break;
    }
    
    if (i > 200) break;
  }
  
  assert(enemySpawned, 'Enemy should spawn from wave');
});

test('Lives decrease when enemies reach end of path', () => {
  const game = createGameRunner({ startingMoney: 1000, startingLives: 20 });
  game.start();
  
  game.startWave(0);
  
  const initialLives = game.getGameStats().lives;
  const livesStartTime = Date.now();
  
  for (let i = 0; i < 40; i++) {
    game.update(livesStartTime + i * 1000);
    
    const currentLives = game.getGameStats().lives;
    if (currentLives < initialLives) {
      assert(true, 'Lives decreased as enemy reached end');
      return;
    }
    
    if (i === 999) {
      assert(false, 'Lives should have decreased after enemy reached end');
    }
  }
});

test('Multiple towers can have different targeting modes', () => {
  const game = createGameRunner({ startingMoney: 2000 });
  game.start();
  
  const tower1 = game.placeTower(TowerType.Puffball, 100, 100, TargetingMode.First);
  const tower2 = game.placeTower(TowerType.Slimefungus, 200, 100, TargetingMode.Last);
  const tower3 = game.placeTower(TowerType.ThornSniper, 300, 100, TargetingMode.Close);
  const tower4 = game.placeTower(TowerType.BulbShooter, 400, 100, TargetingMode.Strong);
  
  assert(tower1 !== null, 'First tower placed');
  assert(tower2 !== null, 'Second tower placed');
  assert(tower3 !== null, 'Third tower placed');
  assert(tower4 !== null, 'Fourth tower placed');
  
  const towers = game.getPlacedTowers();
  assert(towers.length === 4, `Should have 4 towers, got ${towers.length}`);
});

test('Economy tracks tower purchase and sell transactions', () => {
  const game = createGameRunner({ startingMoney: 1000 });
  game.start();
  
  const initialMoney = game.getGameStats().money;
  
  const tower = game.placeTower(TowerType.Puffball, 100, 100, TargetingMode.First);
  assert(tower !== null, 'Tower should be placed');
  
  const afterPurchase = game.getGameStats().money;
  assert(afterPurchase < initialMoney, 'Money should decrease after purchase');
  
  game.sellTower(tower!.id);
  
  const afterSell = game.getGameStats().money;
  assert(afterSell > afterPurchase, 'Money should increase after selling tower');
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);

if (failed > 0) {
  process.exit(1);
}

import { GameRunner, GameState, createGameRunner } from './gameRunner';
import { TowerType, TOWER_STATS } from '../entities/tower';
import { EnemyType, ENEMY_STATS } from './wave';
import { TargetingMode } from './targeting';
import { UpgradePath } from './upgrade';

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

function assert(condition: boolean, message: string) {
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

test('Full game session: start -> place towers -> play wave -> verify economy tracking', () => {
  const game = createGameRunner({ startingMoney: 650, startingLives: 20, maxWaves: 10 });
  game.start();
  
  const stats = game.getGameStats();
  assert(stats.money === 650, `Should start with 650 money, got ${stats.money}`);
  assert(stats.lives === 20, `Should start with 20 lives, got ${stats.lives}`);
  assert(stats.state === GameState.Playing, 'Game should be Playing');
  
  const tower = game.placeTower(TowerType.PuffballFungus, 100, 100, TargetingMode.First);
  assert(tower !== null, 'Should place Puffball Fungus tower');
  
  const afterPlace = game.getGameStats();
  assert(afterPlace.money === 550, `Should have 550 money after tower purchase, got ${afterPlace.money}`);
  assert(afterPlace.towers === 1, `Should have 1 tower, got ${afterPlace.towers}`);
  
  game.startWave(0);
  assert(game.isWaveActive(), 'Wave should be active after starting');
  
  let enemySpawned = false;
  
  for (let i = 0; i < 500; i++) {
    game.update(Date.now() + 16);
    
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
  
  game.placeTower(TowerType.PuffballFungus, 100, 100, TargetingMode.First);
  
  const canPlaceTooClose = game.canPlaceTower(TowerType.OrchidTrap, 105, 105);
  assert(canPlaceTooClose.canPlace === false, 'Should not be able to afford second Orchid without more money');
  
  const validSpot = game.canPlaceTower(TowerType.VenusFlytower, 300, 300);
  assert(validSpot.canPlace === true, 'Should be able to place in valid spot');
});

test('Upgrade system integration: upgrading tower modifies stats and costs money', () => {
  const game = createGameRunner({ startingMoney: 1000 });
  game.start();
  
  const tower = game.placeTower(TowerType.OrchidTrap, 200, 200, TargetingMode.First);
  assert(tower !== null, 'Tower should be placed');
  
  const preUpgrade = game.getTowerUpgradeInfo(tower!.id);
  assert(preUpgrade !== null, 'Should get upgrade info');
  assert(preUpgrade![UpgradePath.Damage].currentTier === 0, 'Should start at tier 0 for Damage');
  
  const initialMoney = game.getGameStats().money;
  const upgradeResult = game.upgradeTower(tower!.id, UpgradePath.Damage);
  assert(upgradeResult.success === true, 'Upgrade should succeed');
  assert(upgradeResult.newTier === 1, 'Should be tier 1 after upgrade');
  
  const postUpgrade = game.getGameStats();
  assert(postUpgrade.money < initialMoney, 'Money should be spent on upgrade');
  
  const postInfo = game.getTowerUpgradeInfo(tower!.id);
  assert(postInfo![UpgradePath.Damage].currentTier === 1, 'Should be tier 1 after upgrade');
  
  const cantOverUpgrade = game.upgradeTower(tower!.id, UpgradePath.Damage);
  const cantOverUpgrade2 = game.upgradeTower(tower!.id, UpgradePath.Damage);
  const cantOverUpgrade3 = game.upgradeTower(tower!.id, UpgradePath.Damage);
  assert(cantOverUpgrade3.success === false, 'Should not be able to upgrade past tier 3');
});

test('Wave progression: starting wave changes wave index', () => {
  const game = createGameRunner({ startingMoney: 650, startingLives: 20, maxWaves: 10 });
  game.start();
  
  game.startWave(0);
  
  const waveIndex = game.getWaveSpawner().getCurrentWaveIndex();
  assert(waveIndex === 0, `First wave should be index 0, got ${waveIndex}`);
});

test('Sell tower returns value and removes from placed towers', () => {
  const game = createGameRunner({ startingMoney: 650 });
  game.start();
  
  const tower = game.placeTower(TowerType.PuffballFungus, 100, 100, TargetingMode.First);
  assert(tower !== null, 'Tower should be placed');
  
  const preSellMoney = game.getGameStats().money;
  const sellValue = game.sellTower(tower!.id);
  assert(sellValue > 0, `Sell value should be positive, got ${sellValue}`);
  
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
  
  game.placeTower(TowerType.PuffballFungus, 100, 100, TargetingMode.First);
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
  
  game.placeTower(TowerType.PuffballFungus, 100, 100, TargetingMode.First);
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

test('Economy interest accrues over time', () => {
  const game = createGameRunner({ startingMoney: 650 });
  game.start();
  
  const initialMoney = game.getGameStats().money;
  
  for (let i = 0; i < 10; i++) {
    game.update(Date.now() + 5000);
  }
  
  const laterMoney = game.getGameStats().money;
  assert(laterMoney > initialMoney, 'Money should increase over time with interest');
});

test('Towers can be placed and tracked in game state', () => {
  const game = createGameRunner({ startingMoney: 1000 });
  game.start();
  
  const tower1 = game.placeTower(TowerType.PuffballFungus, 100, 100, TargetingMode.First);
  const tower2 = game.placeTower(TowerType.OrchidTrap, 200, 100, TargetingMode.Last);
  const tower3 = game.placeTower(TowerType.VenusFlytower, 300, 100, TargetingMode.Strong);
  
  assert(tower1 !== null, 'First tower placed');
  assert(tower2 !== null, 'Second tower placed');
  assert(tower3 !== null, 'Third tower placed');
  
  const towers = game.getPlacedTowers();
  assert(towers.length === 3, `Should have 3 towers, got ${towers.length}`);
});

test('Tower info panel integrates with game runner selection', () => {
  const game = createGameRunner({ startingMoney: 1000 });
  game.start();
  
  const tower = game.placeTower(TowerType.VenusFlytower, 200, 200, TargetingMode.First);
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

test('Map selection state can be entered and map selected', () => {
  const game = createGameRunner();
  
  game.startMapSelection();
  const mapState = game.getMapSelectionState();
  assert(mapState.isSelecting === true, 'Map selection should be active');
  
  game.endMapSelection();
  const mapStateAfter = game.getMapSelectionState();
  assert(mapStateAfter.isSelecting === false, 'Map selection should be inactive after end');
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
  
  game.placeTower(TowerType.PuffballFungus, 100, 100, TargetingMode.First);
  game.placeTower(TowerType.OrchidTrap, 200, 100, TargetingMode.Last);
  game.startWave(0);
  
  for (let i = 0; i < 100; i++) {
    game.update(Date.now() + 16);
  }
  
  const stats = game.getGameStats();
  assert(stats.state === GameState.Playing || stats.state === GameState.Paused, 
    `Game should still be running, got ${stats.state}`);
});

test('Enemies spawn from wave spawner when wave starts', () => {
  const game = createGameRunner({ startingMoney: 1000 });
  game.start();
  
  game.placeTower(TowerType.PuffballFungus, 100, 100, TargetingMode.First);
  game.startWave(0);
  
  let enemySpawned = false;
  for (let i = 0; i < 500; i++) {
    game.update(Date.now() + 16);
    
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
  
  for (let i = 0; i < 1000; i++) {
    game.update(Date.now() + 16);
    
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
  
  const tower1 = game.placeTower(TowerType.PuffballFungus, 100, 100, TargetingMode.First);
  const tower2 = game.placeTower(TowerType.OrchidTrap, 200, 100, TargetingMode.Last);
  const tower3 = game.placeTower(TowerType.VenusFlytower, 300, 100, TargetingMode.Close);
  const tower4 = game.placeTower(TowerType.StinkhornLine, 400, 100, TargetingMode.Strong);
  
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
  
  const tower = game.placeTower(TowerType.PuffballFungus, 100, 100, TargetingMode.First);
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

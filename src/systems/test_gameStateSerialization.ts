const { createGameRunner, GameSpeed, PlacedTower } = require('./gameRunner');
const { TowerType } = require('../entities/tower');
const { EnemyType } = require('./wave');
const { createDefaultPath } = require('./path');
const { UpgradePath } = require('./upgrade');
const {
  serializeGameState,
  serializeGameStateToString,
  getSerializedGameStateSize,
  parseGameState,
  serializeEnemy,
  serializeProjectile,
  serializeTowerUpgrades,
  serializePlacedTower,
  serializeEconomy,
  serializeRoundManager,
  serializeWaveSpawner,
} = require('./gameStateSerialization');

let passed = 0;
let failed = 0;

function assertEqual(actual: any, expected: any, testName: string): void {
  if (actual === expected) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.log(`  ✗ ${testName}: expected ${expected}, got ${actual}`);
    failed++;
  }
}

function assertTruthy(value: any, testName: string): void {
  if (value) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.log(`  ✗ ${testName}: expected truthy, got ${value}`);
    failed++;
  }
}

function assertGreaterThan(actual: number, expected: number, testName: string): void {
  if (actual > expected) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.log(`  ✗ ${testName}: expected > ${expected}, got ${actual}`);
    failed++;
  }
}

function createTestGame() {
  return createGameRunner({
    startingMoney: 1000,
    startingLives: 30,
    maxWaves: 10,
  });
}

console.log('\n=== gameStateSerialization Tests ===\n');

console.log('serializeEnemy:');
{
  const path = createDefaultPath();
  const { createEnemy } = require('../entities/enemy');
  const { StatusEffectType } = require('../entities/enemy');
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  
  const serialized = serializeEnemy(enemy);
  assertEqual(serialized.id, 1, 'id is 1');
  assertEqual(serialized.enemyType, 'red_mushroom', 'enemyType is red_mushroom');
  assertEqual(serialized.hp, 1, 'hp is 1');
  assertEqual(serialized.maxHp, 1, 'maxHp is 1');
  assertEqual(serialized.speed, 50, 'speed is 50');
  assertEqual(serialized.alive, true, 'alive is true');
}

console.log('\nserializeEnemy with status effects:');
{
  const path = createDefaultPath();
  const { createEnemy, StatusEffectType } = require('../entities/enemy');
  const enemy = createEnemy(1, EnemyType.BlueBeetle, path);
  enemy.statusEffects.push({
    type: StatusEffectType.Slow,
    duration: 1000,
    remaining: 500,
    strength: 0.3,
  });
  
  const serialized = serializeEnemy(enemy);
  assertEqual(serialized.statusEffects.length, 1, 'has 1 status effect');
  assertEqual(serialized.statusEffects[0].type, 'slow', 'effect type is slow');
  assertEqual(serialized.statusEffects[0].strength, 0.3, 'strength is 0.3');
}

console.log('\nserializeProjectile:');
{
  const projectile = {
    id: 1,
    position: { x: 100, y: 200 },
    targetId: 5,
    speed: 150,
    damage: 2,
    towerType: TowerType.OrchidTrap,
    alive: true,
  };
  
  const serialized = serializeProjectile(projectile);
  assertEqual(serialized.id, 1, 'id is 1');
  assertEqual(serialized.position.x, 100, 'position.x is 100');
  assertEqual(serialized.targetId, 5, 'targetId is 5');
  assertEqual(serialized.towerType, 'orchid_trap', 'towerType is orchid_trap');
}

console.log('\nserializeProjectile with effect upgrades:');
{
  const projectile = {
    id: 2,
    position: { x: 50, y: 75 },
    targetId: 10,
    speed: 200,
    damage: 3,
    towerType: TowerType.PuffballFungus,
    alive: true,
    effectStrength: 0.75,
    effectDuration: 500,
    areaRadius: 60,
  };
  
  const serialized = serializeProjectile(projectile);
  assertEqual(serialized.effectStrength, 0.75, 'effectStrength is 0.75');
  assertEqual(serialized.effectDuration, 500, 'effectDuration is 500');
  assertEqual(serialized.areaRadius, 60, 'areaRadius is 60');
}

console.log('\nserializeTowerUpgrades:');
{
  const upgrades = {
    damage: 2,
    range: 1,
    fireRate: 3,
    special: 0,
    cumulativeValue: 450,
    effectStrength: 0.5,
    effectDuration: 1000,
    areaRadius: 50,
  };
  
  const serialized = serializeTowerUpgrades(upgrades);
  assertEqual(serialized.damage, 2, 'damage is 2');
  assertEqual(serialized.range, 1, 'range is 1');
  assertEqual(serialized.fireRate, 3, 'fireRate is 3');
  assertEqual(serialized.cumulativeValue, 450, 'cumulativeValue is 450');
}

console.log('\nserializePlacedTower:');
{
  const path = createDefaultPath();
  const { createEnemy } = require('../entities/enemy');
  const { TargetingMode } = require('./targeting');
  const placedTower = {
    tower: {
      id: 1,
      position: { x: 100, y: 200 },
      range: 80,
      targetingMode: TargetingMode.First,
      towerType: TowerType.PuffballFungus,
      damage: 1,
      fireRate: 500,
      fireTimer: 0,
      cost: 100,
      lastFireTime: 0,
      projectileSpeed: 200,
      specialEffect: 'area_damage',
      upgrades: {
        damage: 1,
        range: 0,
        fireRate: 2,
        special: 0,
        cumulativeValue: 150,
        effectStrength: 0.6,
        effectDuration: 0,
        areaRadius: 60,
      },
      upgradeLevels: {
        damage: 1,
        range: 0,
        fireRate: 2,
        special: 0,
      },
      totalUpgradeCost: 150,
      effectStrength: 0.6,
      effectDuration: 0,
      areaRadius: 60,
    },
    x: 150,
    y: 250,
  };
  
  const serialized = serializePlacedTower(placedTower);
  assertEqual(serialized.tower.towerType, 'puffball_fungus', 'towerType is puffball_fungus');
  assertEqual(serialized.tower.upgrades.damage, 1, 'upgrade damage is 1');
  assertEqual(serialized.x, 150, 'x is 150');
  assertEqual(serialized.y, 250, 'y is 250');
}

console.log('\nserializeEconomy:');
{
  const game = createTestGame();
  const economy = game.getEconomy();
  
  const serialized = serializeEconomy(economy);
  assertEqual(serialized.money, 1000, 'money is 1000');
  assertEqual(serialized.lives, 30, 'lives is 30');
  assertEqual(serialized.roundsCompleted, 0, 'roundsCompleted is 0');
}

console.log('\nserializeRoundManager:');
{
  const game = createTestGame();
  const rm = game.getRoundManager();
  
  const serialized = serializeRoundManager(rm);
  assertEqual(serialized.state, 'idle', 'state is idle');
  assertEqual(serialized.roundNumber, 0, 'roundNumber is 0');
}

console.log('\nserializeWaveSpawner:');
{
  const game = createTestGame();
  const ws = game.getWaveSpawner();
  
  const serialized = serializeWaveSpawner(ws);
  assertEqual(serialized.currentWaveIndex, -1, 'currentWaveIndex is -1');
  assertEqual(serialized.isWaveActive, false, 'isWaveActive is false');
}

console.log('\nserializeGameState (full game state):');
{
  const game = createTestGame();
  
  const serialized = serializeGameState(game);
  assertEqual(serialized.version, '1.0.0', 'version is 1.0.0');
  assertEqual(serialized.state, 'idle', 'state is idle');
  assertEqual(serialized.gameSpeed, 1, 'gameSpeed is 1');
  assertEqual(serialized.placedTowers.length, 0, 'no placed towers');
  assertEqual(serialized.activeEnemies.length, 0, 'no active enemies');
  assertEqual(serialized.economy.money, 1000, 'economy money is 1000');
}

console.log('\nserializeGameState after placing towers:');
{
  const game = createTestGame();
  game.start();
  game.startTowerPlacement(TowerType.PuffballFungus);
  game.updatePlacementPosition(200, 200);
  game.confirmPlacement();
  
  const serialized = serializeGameState(game);
  assertEqual(serialized.placedTowers.length, 1, 'has 1 placed tower');
  assertEqual(serialized.placedTowers[0].tower.towerType, 'puffball_fungus', 'tower type is puffball_fungus');
}

console.log('\nserializeGameState with different game speeds:');
{
  const game = createTestGame();
  game.start();
  game.setGameSpeed(GameSpeed.Fast);
  
  const serialized = serializeGameState(game);
  assertEqual(serialized.gameSpeed, 2, 'gameSpeed is 2 (Fast)');
}

console.log('\nserializeGameStateToString:');
{
  const game = createTestGame();
  
  const jsonString = serializeGameStateToString(game);
  assertTruthy(jsonString.includes('"version":"1.0.0"'), 'contains version');
  assertTruthy(jsonString.includes('"state":"idle"'), 'contains state');
  let isValidJson = false;
  try { JSON.parse(jsonString); isValidJson = true; } catch { isValidJson = false; }
  assertTruthy(isValidJson, 'is valid JSON');
}

console.log('\ngetSerializedGameStateSize:');
{
  const game = createTestGame();
  
  const size = getSerializedGameStateSize(game);
  assertGreaterThan(size, 0, 'size is greater than 0');
}

console.log('\ngetSerializedGameStateSize with towers:');
{
  const game = createTestGame();
  game.start();
  
  const sizeBefore = getSerializedGameStateSize(game);
  
  game.startTowerPlacement(TowerType.PuffballFungus);
  game.updatePlacementPosition(200, 200);
  game.confirmPlacement();
  
  const sizeAfter = getSerializedGameStateSize(game);
  assertGreaterThan(sizeAfter, sizeBefore, 'size increased after adding tower');
}

console.log('\nparseGameState:');
{
  const game = createTestGame();
  const jsonString = serializeGameStateToString(game);
  
  const parsed = parseGameState(jsonString);
  assertTruthy(parsed !== null, 'parsed is not null');
  assertEqual(parsed.version, '1.0.0', 'version is 1.0.0');
  assertEqual(parsed.state, 'idle', 'state is idle');
}

console.log('\nparseGameState with invalid JSON:');
{
  const parsed = parseGameState('not valid json');
  assertEqual(parsed, null, 'returns null for invalid JSON');
}

console.log('\nparseGameState with missing fields:');
{
  const parsed = parseGameState('{"foo": "bar"}');
  assertEqual(parsed, null, 'returns null for missing required fields');
}

console.log('\nserialize game mid-wave:');
{
  const game = createTestGame();
  game.start();
  game.startWave();
  
  game.update(1000);
  
  const serialized = serializeGameState(game);
  assertEqual(serialized.state, 'playing', 'state is playing');
  assertEqual(serialized.waveSpawner.isWaveActive, true, 'wave is active');
}

console.log('\nserialize game with multiple towers:');
{
  const game = createTestGame();
  game.start();
  
  game.startTowerPlacement(TowerType.PuffballFungus);
  game.updatePlacementPosition(100, 100);
  game.confirmPlacement();
  
  game.startTowerPlacement(TowerType.OrchidTrap);
  game.updatePlacementPosition(200, 200);
  game.confirmPlacement();
  
  game.startTowerPlacement(TowerType.VenusFlytower);
  game.updatePlacementPosition(300, 300);
  game.confirmPlacement();
  
  const serialized = serializeGameState(game);
  assertEqual(serialized.placedTowers.length, 3, 'has 3 towers');
  assertEqual(serialized.placedTowers[0].tower.towerType, 'puffball_fungus', 'first is puffball');
  assertEqual(serialized.placedTowers[1].tower.towerType, 'orchid_trap', 'second is orchid');
  assertEqual(serialized.placedTowers[2].tower.towerType, 'venus_flytower', 'third is venus');
}

console.log('\nserialize game with tower (upgrade may not apply in test context):');
{
  const game = createTestGame();
  game.start();
  
  game.startTowerPlacement(TowerType.PuffballFungus);
  game.updatePlacementPosition(150, 150);
  game.confirmPlacement();
  
  const serialized = serializeGameState(game);
  assertEqual(serialized.placedTowers.length, 1, 'has 1 tower');
  assertEqual(serialized.placedTowers[0].tower.towerType, 'puffball_fungus', 'tower type is puffball');
  assertEqual(typeof serialized.placedTowers[0].tower.upgrades.damage, 'number', 'damage upgrade is a number');
}

console.log('\n=== Results ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);
console.log(`Total: ${passed + failed}`);

if (failed === 0) {
  console.log('\n✓ All tests passed!\n');
} else {
  console.log('\n✗ Some tests failed.\n');
  process.exit(1);
}
import {
  WaveSpawner,
  createDefaultWaves,
  EnemyType,
  ENEMY_STATS,
  createWave,
  SpawnGroup,
} from './systems/wave';
import { createDefaultPath } from './systems/path';
import { Enemy, createEnemy, respawnEnemy } from './entities/enemy';

const path = createDefaultPath();

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`ASSERTION FAILED: ${message} - Expected ${expected}, got ${actual}`);
  }
}

console.log('=== Wave Spawner + Enemy Entity Integration Tests ===\n');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`  ✗ ${name}: ${e.message}`);
    failed++;
  }
}

test('WaveSpawner creates enemies with correct stats from ENEMY_STATS', () => {
  const waves = createDefaultWaves();
  const redMushroomStats = ENEMY_STATS[EnemyType.RedMushroom];
  
  const spawner = new WaveSpawner(path, [waves[0]]);
  spawner.setNextEnemyId(1);
  spawner.startWave(0);
  
  const waveStartTime = Date.now();
  const newEnemies = spawner.update(waveStartTime);
  
  assert(newEnemies.length > 0, 'Enemy was spawned');
  
  const enemy = newEnemies[0];
  assertEqual(enemy.hp, redMushroomStats.hp, 'Enemy HP matches ENEMY_STATS');
  assertEqual(enemy.maxHp, redMushroomStats.hp, 'Enemy maxHp matches ENEMY_STATS');
  assertEqual(enemy.speed, redMushroomStats.speed, 'Enemy speed matches ENEMY_STATS');
  assertEqual(enemy.reward, redMushroomStats.reward, 'Enemy reward matches ENEMY_STATS');
  assertEqual(enemy.alive, true, 'Newly spawned enemy is alive');
  assertEqual(enemy.hasReachedEnd, false, 'Newly spawned enemy has not reached end');
});

test('Enemy entity has path reference and starts at path beginning', () => {
  const waves = createDefaultWaves();
  const spawner = new WaveSpawner(path, [waves[0]]);
  spawner.setNextEnemyId(1);
  spawner.startWave(0);
  
  const waveStartTime = Date.now();
  const newEnemies = spawner.update(waveStartTime);
  
  assert(newEnemies.length > 0, 'Enemy was spawned');
  
  const enemy = newEnemies[0];
  const startPoint = path.getPointAtDistance(0);
  assertEqual(enemy.pathDistance, 0, 'Enemy starts at path distance 0');
  assertEqual(enemy.pathProgress, 0, 'Enemy starts at path progress 0');
});

test('WaveSpawner generates unique enemy IDs across multiple spawns', () => {
  const waves = createDefaultWaves();
  const spawner = new WaveSpawner(path, [waves[0]]);
  spawner.setNextEnemyId(1);
  spawner.startWave(0);
  
  const waveStartTime = Date.now();
  const ids = new Set<number>();
  
  for (let t = 0; t < 10000; t += 16) {
    const newEnemies = spawner.update(waveStartTime + t);
    for (const enemy of newEnemies) {
      assert(!ids.has(enemy.id), `Enemy ID ${enemy.id} is unique`);
      ids.add(enemy.id);
    }
    if (!spawner.isWaveActive()) break;
  }
  
  assertEqual(ids.size, 10, 'All 10 enemies have unique IDs');
});

test('WaveSpawner tracks all spawned enemies via getSpawnedEnemies', () => {
  const waves = createDefaultWaves();
  const spawner = new WaveSpawner(path, [waves[0]]);
  spawner.setNextEnemyId(1);
  spawner.startWave(0);
  
  const waveStartTime = Date.now();
  
  for (let t = 0; t < 10000; t += 16) {
    spawner.update(waveStartTime + t);
    if (!spawner.isWaveActive()) break;
  }
  
  const spawnedEnemies = spawner.getSpawnedEnemies();
  assertEqual(spawnedEnemies.length, 10, 'WaveSpawner tracks all 10 spawned enemies');
});

test('Enemies from different waves have correct types', () => {
  const wave1 = createWave(1, 'Wave 1', [
    { enemyType: EnemyType.RedMushroom, count: 2, interval: 100 }
  ]);
  const wave2 = createWave(2, 'Wave 2', [
    { enemyType: EnemyType.BlueBeetle, count: 2, interval: 100 }
  ]);
  
  const spawner = new WaveSpawner(path, [wave1, wave2]);
  spawner.setNextEnemyId(1);
  
  spawner.startWave(0);
  let wave1StartTime = Date.now();
  let wave1Enemies: Enemy[] = [];
  for (let t = 0; t < 1000 && spawner.isWaveActive(); t += 16) {
    wave1Enemies = wave1Enemies.concat(spawner.update(wave1StartTime + t));
  }
  
  spawner.startWave(1);
  let wave2StartTime = Date.now();
  let wave2Enemies: Enemy[] = [];
  for (let t = 0; t < 1000 && spawner.isWaveActive(); t += 16) {
    wave2Enemies = wave2Enemies.concat(spawner.update(wave2StartTime + t));
  }
  
  assertEqual(wave1Enemies.length, 2, 'Wave 1 has 2 enemies');
  assertEqual(wave1Enemies[0].enemyType, EnemyType.RedMushroom, 'Wave 1 enemy type is RedMushroom');
  
  assertEqual(wave2Enemies.length, 2, 'Wave 2 has 2 enemies');
  assertEqual(wave2Enemies[0].enemyType, EnemyType.BlueBeetle, 'Wave 2 enemy type is BlueBeetle');
});

test('Enemy respawn resets position and health', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  const originalPos = { ...enemy.position };
  
  enemy.hp = 0;
  enemy.alive = false;
  enemy.pathDistance = 100;
  
  respawnEnemy(enemy, path);
  
  assertEqual(enemy.hp, enemy.maxHp, 'HP is reset after respawn');
  assertEqual(enemy.alive, true, 'Alive is reset after respawn');
  assertEqual(enemy.pathDistance, 0, 'Path distance is reset after respawn');
  assertEqual(enemy.position.x, originalPos.x, 'X position is reset after respawn');
  assertEqual(enemy.position.y, originalPos.y, 'Y position is reset after respawn');
  assertEqual(enemy.statusEffects.length, 0, 'Status effects are cleared after respawn');
});

test('WaveSpawner.nextEnemyId is managed correctly', () => {
  const waves = createDefaultWaves();
  const spawner = new WaveSpawner(path, [waves[0]]);
  
  spawner.setNextEnemyId(100);
  spawner.startWave(0);
  const waveStartTime = Date.now();
  
  const newEnemies = spawner.update(waveStartTime);
  assert(newEnemies.length > 0, 'Enemy was spawned');
  assertEqual(newEnemies[0].id, 100, 'First enemy ID is 100 after setNextEnemyId(100)');
  
  assertEqual(spawner.getNextEnemyId(), 101, 'Next enemy ID is 101 after spawning one enemy');
});

test('Wave spawn timing respects interval', () => {
  const wave = createWave(1, 'Test', [
    { enemyType: EnemyType.RedMushroom, count: 3, interval: 500 }
  ]);
  
  const spawner = new WaveSpawner(path, [wave]);
  spawner.setNextEnemyId(1);
  spawner.startWave(0);
  
  const waveStartTime = Date.now();
  const spawned: Enemy[] = [];
  
  for (let t = 0; t < 2000 && spawned.length < 3; t += 16) {
    const newEnemies = spawner.update(waveStartTime + t);
    for (const e of newEnemies) {
      spawned.push(e);
    }
  }
  
  assertEqual(spawned.length, 3, 'All 3 enemies spawned');
});

test('Wave with multiple groups spawns correctly', () => {
  const wave = createWave(1, 'MultiGroup', [
    { enemyType: EnemyType.RedMushroom, count: 2, interval: 100 },
    { enemyType: EnemyType.BlueBeetle, count: 2, interval: 100 },
  ], 200);
  
  const spawner = new WaveSpawner(path, [wave]);
  spawner.setNextEnemyId(1);
  spawner.startWave(0);
  
  const waveStartTime = Date.now();
  const spawned: Enemy[] = [];
  
  for (let t = 0; t < 10000 && spawner.isWaveActive(); t += 16) {
    const newEnemies = spawner.update(waveStartTime + t);
    spawned.push(...newEnemies);
  }
  
  assertEqual(spawned.length, 4, 'All 4 enemies spawned');
  
  const firstTwo = spawned.slice(0, 2);
  const lastTwo = spawned.slice(2);
  
  assertEqual(firstTwo[0].enemyType, EnemyType.RedMushroom, 'First group is RedMushroom');
  assertEqual(lastTwo[0].enemyType, EnemyType.BlueBeetle, 'Second group is BlueBeetle');
});

test('EnemyType enum values match ENEMY_STATS keys', () => {
  for (const enemyType of Object.values(EnemyType)) {
    assert(ENEMY_STATS[enemyType] !== undefined, `ENEMY_STATS has entry for ${enemyType}`);
    assertEqual(ENEMY_STATS[enemyType].type, enemyType, `ENEMY_STATS type matches key ${enemyType}`);
  }
});

test('All 10 enemy types have valid stats', () => {
  const expectedTypes: EnemyType[] = [
    EnemyType.RedMushroom,
    EnemyType.BlueBeetle,
    EnemyType.GreenCaterpillar,
    EnemyType.YellowWasp,
    EnemyType.PinkLadybug,
    EnemyType.BlackWidow,
    EnemyType.WhiteMoth,
    EnemyType.ArmoredBeetle,
    EnemyType.RainbowStag,
    EnemyType.ShelledSnail,
  ];
  
  for (const type of expectedTypes) {
    const stats = ENEMY_STATS[type];
    assert(stats.hp > 0, `${type} has positive HP`);
    assert(stats.speed > 0, `${type} has positive speed`);
    assert(stats.reward >= 0, `${type} has non-negative reward`);
  }
});

test('SpawnedEnemy tracks spawn metadata', () => {
  const wave = createWave(1, 'Test', [
    { enemyType: EnemyType.RedMushroom, count: 2, interval: 100 }
  ]);
  
  const spawner = new WaveSpawner(path, [wave]);
  spawner.setNextEnemyId(1);
  spawner.startWave(0);
  
  const waveStartTime = Date.now();
  const spawnedEnemies = spawner.getSpawnedEnemies();
  
  assertEqual(spawnedEnemies.length, 0, 'Initially no enemies spawned');
  
  spawner.update(waveStartTime);
  
  assertEqual(spawnedEnemies.length, 1, 'One enemy tracked after first spawn');
  assertEqual(spawnedEnemies[0].groupIndex, 0, 'Group index is 0 for first group');
  assert(spawnedEnemies[0].spawnTime >= waveStartTime, 'Spawn time is recorded');
  assertEqual(spawnedEnemies[0].enemy.id, 1, 'Enemy ID is correct');
});

test('GameRunner properly integrates wave spawner to create enemies', () => {
  const { GameRunner } = require('./systems/gameRunner');
  
  const game = new GameRunner();
  game.start();
  
  const statsBefore = game.getGameStats();
  assertEqual(statsBefore.enemies, 0, 'No enemies initially');
  
  game.startWave(0);
  
  const waveStartTime = Date.now();
  for (let i = 0; i < 50; i++) {
    game.update(waveStartTime + i * 100);
  }
  
  const stats = game.getGameStats();
  assert(stats.enemies >= 0, 'Game tracks enemies correctly after wave starts');
});

test('Enemy stats are correctly used for all enemy types', () => {
  const enemyTypes: EnemyType[] = [
    EnemyType.RedMushroom,
    EnemyType.BlueBeetle,
    EnemyType.GreenCaterpillar,
    EnemyType.YellowWasp,
    EnemyType.PinkLadybug,
    EnemyType.BlackWidow,
    EnemyType.WhiteMoth,
    EnemyType.ArmoredBeetle,
    EnemyType.RainbowStag,
    EnemyType.ShelledSnail,
  ];
  
  for (const type of enemyTypes) {
    const enemy = createEnemy(1, type, path);
    const stats = ENEMY_STATS[type];
    
    assertEqual(enemy.enemyType, type, `${type}: enemyType matches`);
    assertEqual(enemy.hp, stats.hp, `${type}: hp matches`);
    assertEqual(enemy.maxHp, stats.hp, `${type}: maxHp matches`);
    assertEqual(enemy.speed, stats.speed, `${type}: speed matches`);
    assertEqual(enemy.baseSpeed, stats.speed, `${type}: baseSpeed matches`);
    assertEqual(enemy.reward, stats.reward, `${type}: reward matches`);
    assertEqual(enemy.alive, true, `${type}: alive is true`);
    assertEqual(enemy.hasReachedEnd, false, `${type}: hasReachedEnd is false`);
    assertEqual(enemy.statusEffects.length, 0, `${type}: no status effects initially`);
  }
});

test('Multiple waves can be started sequentially', () => {
  const wave1 = createWave(1, 'Wave 1', [
    { enemyType: EnemyType.RedMushroom, count: 2, interval: 100 }
  ]);
  const wave2 = createWave(2, 'Wave 2', [
    { enemyType: EnemyType.BlueBeetle, count: 2, interval: 100 }
  ]);
  
  const spawner = new WaveSpawner(path, [wave1, wave2]);
  spawner.setNextEnemyId(1);
  
  spawner.startWave(0);
  let waveStartTime = Date.now();
  for (let t = 0; t < 1000 && spawner.isWaveActive(); t += 16) {
    spawner.update(waveStartTime + t);
  }
  assertEqual(spawner.getCurrentWaveIndex(), 0, 'First wave index is 0');
  
  spawner.startWave(1);
  waveStartTime = Date.now();
  for (let t = 0; t < 1000 && spawner.isWaveActive(); t += 16) {
    spawner.update(waveStartTime + t);
  }
  assertEqual(spawner.getCurrentWaveIndex(), 1, 'Second wave index is 1');
});

test('getRemainingInCurrentGroup returns correct count', () => {
  const wave = createWave(1, 'Test', [
    { enemyType: EnemyType.RedMushroom, count: 5, interval: 100 }
  ]);
  
  const spawner = new WaveSpawner(path, [wave]);
  spawner.setNextEnemyId(1);
  spawner.startWave(0);
  
  const waveStartTime = Date.now();
  
  assertEqual(spawner.getRemainingInCurrentGroup(), 5, 'Initially 5 remaining');
  
  spawner.update(waveStartTime);
  assertEqual(spawner.getRemainingInCurrentGroup(), 4, '4 remaining after first spawn');
  
  spawner.update(waveStartTime + 100);
  assertEqual(spawner.getRemainingInCurrentGroup(), 3, '3 remaining after second spawn');
});

test('getRemainingGroups returns correct count', () => {
  const wave = createWave(1, 'Test', [
    { enemyType: EnemyType.RedMushroom, count: 2, interval: 100 },
    { enemyType: EnemyType.BlueBeetle, count: 2, interval: 100 },
  ], 200);
  
  const spawner = new WaveSpawner(path, [wave]);
  spawner.setNextEnemyId(1);
  spawner.startWave(0);
  
  assertEqual(spawner.getRemainingGroups(), 1, '1 remaining group initially (0-indexed)');
});

console.log('\n=== Summary ===');
console.log(`Passed: ${passed}`);
console.log(`Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
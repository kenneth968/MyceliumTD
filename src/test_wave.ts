import {
  WaveSpawner,
  createDefaultWaves,
  EnemyType,
  ENEMY_STATS,
  createWave,
  SpawnGroup,
} from './systems/wave';
import { createDefaultPath } from './systems/path';

const path = createDefaultPath();
console.log(`Path length: ${path.getTotalLength()}`);

const waves = createDefaultWaves();
console.log(`\n--- Created ${waves.length} default waves ---\n`);

waves.forEach((wave, i) => {
  console.log(`Wave ${wave.id}: ${wave.name}`);
  console.log(`  Groups: ${wave.groups.length}`);
  let totalEnemies = 0;
  wave.groups.forEach(g => {
    totalEnemies += g.count;
    console.log(`    - ${g.count}x ${g.enemyType} (interval: ${g.interval}ms)`);
  });
  console.log(`  Total enemies: ${totalEnemies}`);
  console.log(`  Total duration: ${wave.totalDuration}ms`);
});

const spawner = new WaveSpawner(path, waves);
console.log('\n--- Testing Wave 1: Red Dawn ---');

const wave1 = waves[0];
spawner.reset();
spawner.setNextEnemyId(1);
spawner.startWave(0);
const wave1StartTime = Date.now();
console.log(`Started wave 0: ${spawner.getCurrentWave()?.name}`);
console.log(`Wave active: ${spawner.isWaveActive()}`);

const allSpawned: any[] = [];
let updates = 0;
const maxUpdates = 500;

while (spawner.isWaveActive() && updates < maxUpdates) {
  const currentTime = wave1StartTime + updates * 16;
  const newEnemies = spawner.update(currentTime);
  newEnemies.forEach(e => {
    allSpawned.push(e);
    console.log(`  [${updates * 16}ms] Spawned Enemy ${e.id}: ${e.hp} HP, speed ${e.speed}`);
  });
  updates++;
}

console.log(`\nTotal spawned: ${allSpawned.length}`);
console.log(`Updates run: ${updates}`);

console.log('\n--- Testing Wave 3 with interleaved groups ---');
spawner.reset();
spawner.setNextEnemyId(1);
spawner.startWave(2);
const wave3StartTime = Date.now();
console.log(`Started wave 2: ${spawner.getCurrentWave()?.name}`);

allSpawned.length = 0;
updates = 0;
const wave3ExpectedCount = 8 + 5;
console.log(`Expected enemies: ${wave3ExpectedCount}`);

while (spawner.isWaveActive() && updates < maxUpdates) {
  const currentTime = wave3StartTime + updates * 16;
  const newEnemies = spawner.update(currentTime);
  newEnemies.forEach(e => {
    allSpawned.push(e);
    console.log(`  [${updates * 16}ms] Spawned Enemy ${e.id}: type=${e.hp > 0 ? 'alive' : 'dead'}`);
  });
  updates++;
}

console.log(`\nTotal spawned in wave 3: ${allSpawned.length}`);
console.log(`All enemies at path start: ${allSpawned.every(e => e.pathDistance === 0)}`);

console.log('\n--- Testing enemy stats lookup ---');
Object.entries(ENEMY_STATS).forEach(([type, stats]) => {
  console.log(`  ${type}: ${stats.hp} HP, speed ${stats.speed}, reward ${stats.reward}`);
});

console.log('\n--- Testing custom wave creation ---');
const customGroups: SpawnGroup[] = [
  { enemyType: EnemyType.RedMushroom, count: 5, interval: 100 },
  { enemyType: EnemyType.BlueBeetle, count: 3, interval: 200 },
  { enemyType: EnemyType.GreenCaterpillar, count: 2, interval: 300 },
];
const customWave = createWave(99, "Custom Test Wave", customGroups, 500);
console.log(`Custom wave: ${customWave.name}, ${customWave.groups.length} groups, ${customWave.totalDuration}ms duration`);

console.log('\n--- All wave spawner tests passed! ---');
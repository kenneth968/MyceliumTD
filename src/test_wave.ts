import {
  WaveSpawner,
  createDefaultWaves,
  EnemyType,
  EnemyVariant,
  ENEMY_STATS,
  createWave,
  SpawnGroup,
} from './systems/wave';
import { createDefaultPath } from './systems/path';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

const path = createDefaultPath();
console.log(`Path length: ${path.getTotalLength()}`);

const waves = createDefaultWaves();
console.log(`\n--- Created ${waves.length} default waves ---\n`);

assert(waves.length === 10, 'release has ten waves');
assert(waves[0].groups[0].type === EnemyType.ScoutBeetle, 'wave 1 teaches Scouts');
assert(waves[4].groups.some(group => group.type === EnemyType.IronCaterpillar), 'wave 5 introduces Metal');
assert(waves[5].groups.some(group => group.type === EnemyType.VeilWasp), 'wave 6 introduces Camo');
assert(waves[9].groups.some(group => group.variant === EnemyVariant.Boss), 'wave 10 contains the boss');

const releaseTimingSpawner = new WaveSpawner(path, waves);
releaseTimingSpawner.startWave(1);
releaseTimingSpawner.update(0);
const delayedSpawns = releaseTimingSpawner.update(2200);
assert(
  delayedSpawns.some(enemy => enemy.enemyType === EnemyType.DartWasp),
  'canonical group delays allow overlapping arrivals'
);

const bossSpawner = new WaveSpawner(path, waves);
bossSpawner.startWave(9);
const bossSpawn = bossSpawner.update(0)[0];
assert(bossSpawn.variant === EnemyVariant.Boss, 'boss group variant reaches spawned enemy');

waves.forEach((wave, i) => {
  console.log(`Wave ${wave.id}: ${wave.name}`);
  console.log(`  Groups: ${wave.groups.length}`);
  let totalEnemies = 0;
  wave.groups.forEach(g => {
    totalEnemies += g.count;
    console.log(`    - ${g.count}x ${g.type ?? g.enemyType} (interval: ${g.interval}ms)`);
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
const wave3ExpectedCount = waves[2].groups.reduce((total, group) => total + group.count, 0);
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
  const hp = stats.layers.reduce((total, layerHp) => total + layerHp, 0);
  console.log(`  ${type}: ${hp} HP, speed ${stats.speed}, reward ${stats.reward}`);
});

console.log('\n--- Testing custom wave creation ---');
const customGroups: SpawnGroup[] = [
  { enemyType: EnemyType.ScoutBeetle, count: 5, interval: 100 },
  { enemyType: EnemyType.DartWasp, count: 3, interval: 200 },
  { enemyType: EnemyType.ShellBeetle, count: 2, interval: 300 },
];
const customWave = createWave(99, "Custom Test Wave", customGroups, 500);
console.log(`Custom wave: ${customWave.name}, ${customWave.groups.length} groups, ${customWave.totalDuration}ms duration`);

console.log('\n--- All wave spawner tests passed! ---');

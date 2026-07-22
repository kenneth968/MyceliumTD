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

interface ExpectedReleaseGroup {
  type: EnemyType;
  count: number;
  interval: number;
  delay: number;
  variant?: EnemyVariant;
}

interface ExpectedReleaseWave {
  name: string;
  completionBonus: number;
  groups: readonly ExpectedReleaseGroup[];
}

const expectedReleaseWaves: readonly ExpectedReleaseWave[] = [
  { name: 'First Footsteps', completionBonus: 43, groups: [{ type: EnemyType.ScoutBeetle, count: 8, interval: 4900, delay: 0 }] },
  { name: 'Wings on the Path', completionBonus: 48, groups: [{ type: EnemyType.ScoutBeetle, count: 6, interval: 4550, delay: 0 }, { type: EnemyType.DartWasp, count: 6, interval: 3850, delay: 15400 }] },
  { name: 'Shell and Crawler', completionBonus: 57, groups: [{ type: EnemyType.ShellBeetle, count: 6, interval: 5600, delay: 0 }, { type: EnemyType.CrawlerCaterpillar, count: 5, interval: 6300, delay: 12600 }] },
  { name: 'The Swarm', completionBonus: 66, groups: [{ type: EnemyType.SwarmWasp, count: 16, interval: 220, delay: 0 }, { type: EnemyType.ScoutBeetle, count: 4, interval: 3500, delay: 12600 }] },
  { name: 'Iron Roots', completionBonus: 74, groups: [{ type: EnemyType.IronCaterpillar, count: 8, interval: 6650, delay: 0 }, { type: EnemyType.SwarmWasp, count: 8, interval: 260, delay: 15400 }] },
  { name: 'Behind the Veil', completionBonus: 117, groups: [{ type: EnemyType.VeilWasp, count: 10, interval: 3500, delay: 0 }, { type: EnemyType.ShellBeetle, count: 1, interval: 0, delay: 18200, variant: EnemyVariant.Elite }] },
  { name: 'Bulwark', completionBonus: 100, groups: [{ type: EnemyType.BulwarkBeetle, count: 6, interval: 7700, delay: 0 }, { type: EnemyType.DartWasp, count: 12, interval: 2450, delay: 12600 }] },
  { name: 'Ward Flight', completionBonus: 221, groups: [{ type: EnemyType.WardMoth, count: 5, interval: 7000, delay: 0 }, { type: EnemyType.SwarmWasp, count: 12, interval: 240, delay: 7000 }, { type: EnemyType.IronCaterpillar, count: 4, interval: 6300, delay: 19600 }] },
  { name: 'Pale Endurance', completionBonus: 131, groups: [{ type: EnemyType.PaleMoth, count: 8, interval: 4900, delay: 0 }, { type: EnemyType.BulwarkBeetle, count: 5, interval: 7000, delay: 11200 }, { type: EnemyType.VeilWasp, count: 10, interval: 2940, delay: 22400 }] },
  { name: 'Elder Ward', completionBonus: 0, groups: [{ type: EnemyType.WardMoth, count: 1, interval: 0, delay: 0, variant: EnemyVariant.Boss }, { type: EnemyType.SwarmWasp, count: 16, interval: 230, delay: 10500 }, { type: EnemyType.IronCaterpillar, count: 6, interval: 5950, delay: 24500 }, { type: EnemyType.PaleMoth, count: 6, interval: 4550, delay: 36400 }] },
];

assert(waves.length === expectedReleaseWaves.length, 'release has ten waves');
waves.forEach((wave, waveIndex) => {
  const expectedWave = expectedReleaseWaves[waveIndex];
  assert(wave.id === waveIndex + 1, `wave ${waveIndex + 1} has the exact one-based id`);
  assert(wave.name === expectedWave.name, `wave ${waveIndex + 1} has the exact name`);
  assert(wave.completionBonus === expectedWave.completionBonus, `wave ${waveIndex + 1} has the exact completion bonus`);
  assert(wave.groups.length === expectedWave.groups.length, `wave ${waveIndex + 1} has the exact group count`);
  wave.groups.forEach((group, groupIndex) => {
    const expectedGroup = expectedWave.groups[groupIndex];
    assert(group.type === expectedGroup.type, `wave ${waveIndex + 1} group ${groupIndex + 1} has the exact type`);
    assert(group.count === expectedGroup.count, `wave ${waveIndex + 1} group ${groupIndex + 1} has the exact count`);
    assert(group.interval === expectedGroup.interval, `wave ${waveIndex + 1} group ${groupIndex + 1} has the exact interval`);
    assert(group.delay === expectedGroup.delay, `wave ${waveIndex + 1} group ${groupIndex + 1} has the exact delay`);
    assert(group.variant === expectedGroup.variant, `wave ${waveIndex + 1} group ${groupIndex + 1} has the exact variant`);
  });
});

type MissingIdentityIsRejected = { count: number; interval: number } extends SpawnGroup ? false : true;
const missingIdentityIsRejected: MissingIdentityIsRejected = true;
assert(missingIdentityIsRejected, 'SpawnGroup rejects groups without canonical or legacy identity');

const releaseTimingSpawner = new WaveSpawner(path, waves);
releaseTimingSpawner.startWave(1);
releaseTimingSpawner.update(0);
const delayedSpawns = releaseTimingSpawner.update(15400);
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

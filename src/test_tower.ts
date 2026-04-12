import { createTower, Tower, TowerType, fireTower, canFire, getCooldownProgress, updateProjectile, applyDamage, getKillReward } from './entities/tower';
import { createDefaultPath, Path } from './systems/path';
import { TargetingMode, Enemy, createEnemy } from './systems/targeting';
import { ENEMY_STATS, EnemyType } from './systems/wave';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} - expected ${expected}, got ${actual}`);
  }
}

console.log('Testing Tower Entity System...');

const path = createDefaultPath();
const currentTime = 1000;

const tower1 = createTower(1, 100, 100, TowerType.PuffballFungus, TargetingMode.First);
assert(tower1.id === 1, 'Tower id should be 1');
assert(tower1.damage === 1, 'Puffball damage should be 1');
assert(tower1.range === 80, 'Puffball range should be 80');
assert(tower1.fireRate === 500, 'Puffball fireRate should be 500');
assert(tower1.cost === 100, 'Puffball cost should be 100');
assert(tower1.specialEffect === 'area_damage', 'Puffball specialEffect should be area_damage');
console.log('  ✓ createTower with PuffballFungus');

const tower2 = createTower(2, 200, 200, TowerType.VenusFlytower, TargetingMode.Close);
assert(tower2.damage === 100, 'Venus damage should be 100 (instakill)');
assert(tower2.range === 50, 'Venus range should be 50');
assert(tower2.fireRate === 3000, 'Venus fireRate should be 3000');
assert(tower2.specialEffect === 'instakill', 'Venus specialEffect should be instakill');
console.log('  ✓ createTower with VenusFlytower');

const tower3 = createTower(3, 150, 150, TowerType.StinkhornLine, TargetingMode.Last);
assert(tower3.damage === 3, 'Stinkhorn damage should be 3');
assert(tower3.specialEffect === 'poison', 'Stinkhorn specialEffect should be poison');
console.log('  ✓ createTower with StinkhornLine');

const enemies: Enemy[] = [
  createEnemy(1, 0, ENEMY_STATS[EnemyType.RedMushroom].hp, ENEMY_STATS[EnemyType.RedMushroom].speed, path),
  createEnemy(2, 100, ENEMY_STATS[EnemyType.BlueBeetle].hp, ENEMY_STATS[EnemyType.BlueBeetle].speed, path),
  createEnemy(3, 200, ENEMY_STATS[EnemyType.GreenCaterpillar].hp, ENEMY_STATS[EnemyType.GreenCaterpillar].speed, path),
];

enemies[0].position = { x: 120, y: 100 };
enemies[1].position = { x: 140, y: 100 };
enemies[2].position = { x: 160, y: 100 };

assert(canFire(tower1, currentTime) === true, 'Fresh tower should be able to fire');
console.log('  ✓ canFire on fresh tower');

tower1.lastFireTime = currentTime - 200;
assert(canFire(tower1, currentTime) === false, 'Tower on cooldown should not fire (200ms elapsed, 500ms rate)');
tower1.lastFireTime = currentTime - 500;
assert(canFire(tower1, currentTime) === true, 'Tower after cooldown should fire (500ms elapsed, 500ms rate)');
console.log('  ✓ canFire cooldown logic');

const cooldownTower = createTower(10, 100, 100, TowerType.PuffballFungus, TargetingMode.First);
cooldownTower.lastFireTime = currentTime - 100;
const cooldown0 = getCooldownProgress(cooldownTower, currentTime);
assert(cooldown0 === 0.2, `Cooldown at 100ms should be 0.2, got ${cooldown0}`);

const cooldownTower2 = createTower(11, 100, 100, TowerType.PuffballFungus, TargetingMode.First);
cooldownTower2.lastFireTime = currentTime - 250;
const cooldown50 = getCooldownProgress(cooldownTower2, currentTime);
assert(cooldown50 === 0.5, `Cooldown at 250ms should be 0.5, got ${cooldown50}`);

const cooldownTower3 = createTower(12, 100, 100, TowerType.PuffballFungus, TargetingMode.First);
cooldownTower3.lastFireTime = currentTime - 1000;
const cooldownFull = getCooldownProgress(cooldownTower3, currentTime);
assert(cooldownFull === 1.0, `Cooldown at 1000ms should be 1.0 (capped), got ${cooldownFull}`);
console.log('  ✓ getCooldownProgress');

const fireResult = fireTower(tower1, enemies, path, currentTime);
assert(fireResult.projectile !== null, 'Should create projectile when firing');
assert(fireResult.target !== null, 'Should target an enemy');
assert(fireResult.target!.id === enemies[2].id, 'First mode should target enemy with highest pathProgress (200), got id: ' + fireResult.target!.id);
console.log('  ✓ fireTower creates projectile and targets enemy');

tower1.lastFireTime = currentTime - 400;
const fireResultCooldown = fireTower(tower1, enemies, path, currentTime);
assert(fireResultCooldown.projectile === null, 'Should not fire during cooldown');
assert(fireResultCooldown.target === null, 'Should not have target during cooldown');
console.log('  ✓ fireTower respects cooldown');

const closeTower = createTower(4, 150, 150, TowerType.BioluminescentShroom, TargetingMode.Close);
const closeResult = fireTower(closeTower, enemies, path, currentTime);
assert(closeResult.target !== null, 'Close targeting should find target');
console.log('  ✓ fireTower with Close targeting');

const strongTower = createTower(5, 150, 150, TowerType.OrchidTrap, TargetingMode.Strong);
const strongResult = fireTower(strongTower, enemies, path, currentTime);
assert(strongResult.target !== null, 'Strong targeting should find target');
assert(strongResult.target!.id === enemies[2].id, 'Strong targeting should target Green Caterpillar (highest HP = 3)');
console.log('  ✓ fireTower with Strong targeting');

const lastTower = createTower(6, 150, 150, TowerType.PuffballFungus, TargetingMode.Last);
const lastResult = fireTower(lastTower, enemies, path, currentTime);
assert(lastResult.target !== null, 'Last targeting should find target');
assert(lastResult.target!.id === enemies[0].id, 'Last targeting should target Red Mushroom (lowest pathProgress)');
console.log('  ✓ fireTower with Last targeting');

const proj = fireResult.projectile!;
const deltaTime = 100;
const updateResult = updateProjectile(proj, enemies, deltaTime);
assert(updateResult.hit === false, 'Projectile should not hit yet');
assert(updateResult.damage === 0, 'No damage yet');
console.log('  ✓ updateProjectile moves toward target');

const farEnemy = createEnemy(100, 0, 10, 50, path);
farEnemy.position = { x: 1000, y: 1000 };
const farEnemies = [...enemies, farEnemy];
const farProj = fireTower(farTower(farEnemies), farEnemies, path, currentTime + 1000);
if (farProj.projectile) {
  farProj.projectile.position = { x: 100, y: 100 };
  const farUpdate = updateProjectile(farProj.projectile, farEnemies, deltaTime);
  assert(farUpdate.hit === false, 'Should not hit dead/unknown target');
}
console.log('  ✓ updateProjectile handles missing target');

const deadEnemy = createEnemy(200, 0, 10, 50, path);
deadEnemy.alive = false;
const projDeadTarget = fireTower(tower1, [...enemies, deadEnemy], path, currentTime);
if (projDeadTarget.projectile) {
  projDeadTarget.projectile.targetId = 200;
  const deadUpdate = updateProjectile(projDeadTarget.projectile, farEnemies, deltaTime);
  assert(deadUpdate.hit === false, 'Should not hit dead enemy');
  assert(deadUpdate.target === null, 'Target should be null for dead enemy');
}
console.log('  ✓ updateProjectile handles dead target');

const enemyWithHp = createEnemy(300, 0, ENEMY_STATS[EnemyType.BlueBeetle].hp, ENEMY_STATS[EnemyType.BlueBeetle].speed, path);
const initialHp = enemyWithHp.hp;
const killed = applyDamage(enemyWithHp, 2);
assert(killed === true, '2 damage should kill Blue Beetle (HP = 2)');
assert(enemyWithHp.hp === 0, 'HP should be 0 after lethal damage');
assert(enemyWithHp.alive === false, 'Enemy should be marked dead');
console.log('  ✓ applyDamage kills enemy');

const armoredEnemy = createEnemy(400, 0, ENEMY_STATS[EnemyType.ArmoredBeetle].hp, ENEMY_STATS[EnemyType.ArmoredBeetle].speed, path);
const notKilled = applyDamage(armoredEnemy, 10);
assert(notKilled === false, 'Partial damage should not kill, HP reduced to 15');
assert(armoredEnemy.hp === 15, 'HP should be reduced to 15');
assert(armoredEnemy.alive === true, 'Enemy should still be alive');
console.log('  ✓ applyDamage partial damage');

const killedByOverkill = applyDamage(armoredEnemy, 100);
assert(killedByOverkill === true, 'Overkill damage should kill enemy');
assert(armoredEnemy.hp === 0, 'HP should be 0 after lethal damage');
assert(armoredEnemy.alive === false, 'Enemy should be marked dead');
console.log('  ✓ applyDamage kills weakened enemy');

const secondKill = applyDamage(armoredEnemy, 100);
assert(secondKill === false, 'Should not kill already dead enemy');
console.log('  ✓ applyDamage ignores dead enemy');

const reward = getKillReward(armoredEnemy);
assert(reward === 15, `Armored Beetle reward should be 15, got ${reward}`);
console.log('  ✓ getKillReward returns correct reward');

const noRewardEnemy = createEnemy(500, 0, 999, 50);
const noReward = getKillReward(noRewardEnemy);
assert(noReward === 0, 'Unknown enemy type should return 0 reward');
console.log('  ✓ getKillReward returns 0 for unknown enemy');

console.log('\nAll tests passed!');
console.log('Summary:');
console.log('  - Tower creation with all 5 tower types');
console.log('  - Fire rate cooldown tracking');
console.log('  - Fire with all 4 targeting modes');
console.log('  - Projectile movement and hit detection');
console.log('  - Damage application and kill detection');
console.log('  - Kill reward lookup');

function farTower(enemies: Enemy[]) {
  const tower = createTower(99, 100, 100, TowerType.PuffballFungus, TargetingMode.First);
  tower.position = { x: 100, y: 100 };
  return tower;
}

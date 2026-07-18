import { createTower, Tower, TowerType, TOWER_STATS, fireTower, canFire, getCooldownProgress, updateProjectile, applyDamage, getKillReward } from './entities/tower';
import { createDefaultPath, Path } from './systems/path';
import { TargetingMode, Enemy, createEnemy as createTargetingEnemy } from './systems/targeting';
import { createEnemy } from './entities/enemy';
import { EnemyType } from './systems/wave';

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

const canonicalTypes = Object.values(TowerType);
assertEqual(canonicalTypes.length, 6, 'exactly six tower types');
assert(canonicalTypes.includes(TowerType.Sporecap), 'Sporecap exists');
assert(canonicalTypes.includes(TowerType.ThornSniper), 'Thorn Sniper exists');
assert(canonicalTypes.includes(TowerType.Puffball), 'Puffball exists');
assert(canonicalTypes.includes(TowerType.Slimefungus), 'Slimefungus exists');
assert(canonicalTypes.includes(TowerType.BulbShooter), 'Bulb Shooter exists');
assert(canonicalTypes.includes(TowerType.LumenOracle), 'Lumen Oracle exists');

for (const type of canonicalTypes) {
  assert(TOWER_STATS[type].cost > 0, `${type} has a positive cost`);
  assert(TOWER_STATS[type].displayName.length > 0, `${type} has a display name`);
}

const path = createDefaultPath();
const currentTime = 1000;

const tower1 = createTower(1, 100, 100, TowerType.Puffball, TargetingMode.First);
assert(tower1.id === 1, 'Tower id should be 1');
assert(tower1.damage === 2, 'Puffball damage should be 2');
assert(tower1.range === 95, 'Puffball range should be 95');
assert(tower1.fireRate === 900, 'Puffball fireRate should be 900');
assert(tower1.cost === 180, 'Puffball cost should be 180');
assert(tower1.specialEffect === 'area_damage', 'Puffball specialEffect should be area_damage');
console.log('  ✓ createTower with Puffball');

const tower2 = createTower(2, 200, 200, TowerType.ThornSniper, TargetingMode.Close);
assert(tower2.damage === 4, 'Thorn Sniper damage should be 4');
assert(tower2.range === 190, 'Thorn Sniper range should be 190');
assert(tower2.fireRate === 1600, 'Thorn Sniper fireRate should be 1600');
assert(tower2.specialEffect === 'precision', 'Thorn Sniper specialEffect should be precision');
console.log('  ✓ createTower with ThornSniper');

const tower3 = createTower(3, 150, 150, TowerType.BulbShooter, TargetingMode.Last);
assert(tower3.damage === 3, 'Bulb Shooter damage should be 3');
assert(tower3.specialEffect === 'area_damage', 'Bulb Shooter specialEffect should be area_damage');
console.log('  ✓ createTower with BulbShooter');

const enemies: Enemy[] = [
  createEnemy(1, EnemyType.ScoutBeetle, path),
  createEnemy(2, EnemyType.DartWasp, path),
  createEnemy(3, EnemyType.ShellBeetle, path),
];

enemies[0].pathProgress = 0;
enemies[0].pathDistance = 0;
enemies[1].pathProgress = 100;
enemies[1].pathDistance = 100;
enemies[2].pathProgress = 200;
enemies[2].pathDistance = 200;

enemies[0].position = { x: 120, y: 100 };
enemies[1].position = { x: 140, y: 100 };
enemies[2].position = { x: 160, y: 100 };

assert(canFire(tower1, currentTime) === true, 'Fresh tower should be able to fire');
console.log('  ✓ canFire on fresh tower');

tower1.lastFireTime = currentTime - 200;
assert(canFire(tower1, currentTime) === false, 'Tower on cooldown should not fire (200ms elapsed, 500ms rate)');
tower1.lastFireTime = currentTime - 900;
assert(canFire(tower1, currentTime) === true, 'Tower after cooldown should fire (900ms elapsed, 900ms rate)');
console.log('  ✓ canFire cooldown logic');

const cooldownTower = createTower(10, 100, 100, TowerType.Puffball, TargetingMode.First);
cooldownTower.lastFireTime = currentTime - 180;
const cooldown0 = getCooldownProgress(cooldownTower, currentTime);
assert(cooldown0 === 0.2, `Cooldown at 180ms should be 0.2, got ${cooldown0}`);

const cooldownTower2 = createTower(11, 100, 100, TowerType.Puffball, TargetingMode.First);
cooldownTower2.lastFireTime = currentTime - 450;
const cooldown50 = getCooldownProgress(cooldownTower2, currentTime);
assert(cooldown50 === 0.5, `Cooldown at 450ms should be 0.5, got ${cooldown50}`);

const cooldownTower3 = createTower(12, 100, 100, TowerType.Puffball, TargetingMode.First);
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

const closeTower = createTower(4, 150, 150, TowerType.LumenOracle, TargetingMode.Close);
const closeResult = fireTower(closeTower, enemies, path, currentTime);
assert(closeResult.target !== null, 'Close targeting should find target');
console.log('  ✓ fireTower with Close targeting');

const strongTower = createTower(5, 150, 150, TowerType.Slimefungus, TargetingMode.Strong);
const strongResult = fireTower(strongTower, enemies, path, currentTime);
assert(strongResult.target !== null, 'Strong targeting should find target');
assert(strongResult.target!.id === enemies[2].id, 'Strong targeting should target Green Caterpillar (highest HP = 3)');
console.log('  ✓ fireTower with Strong targeting');

const lastTower = createTower(6, 150, 150, TowerType.Puffball, TargetingMode.Last);
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

const farEnemy = createEnemy(100, EnemyType.BulwarkBeetle, path);
farEnemy.position = { x: 1000, y: 1000 };
const farEnemies = [...enemies, farEnemy];
const farProj = fireTower(farTower(farEnemies), farEnemies, path, currentTime + 1000);
if (farProj.projectile) {
  farProj.projectile.position = { x: 100, y: 100 };
  const farUpdate = updateProjectile(farProj.projectile, farEnemies, deltaTime);
  assert(farUpdate.hit === false, 'Should not hit dead/unknown target');
}
console.log('  ✓ updateProjectile handles missing target');

const deadEnemy = createEnemy(200, EnemyType.BulwarkBeetle, path);
deadEnemy.alive = false;
const projDeadTarget = fireTower(tower1, [...enemies, deadEnemy], path, currentTime);
if (projDeadTarget.projectile) {
  projDeadTarget.projectile.targetId = 200;
  const deadUpdate = updateProjectile(projDeadTarget.projectile, farEnemies, deltaTime);
  assert(deadUpdate.hit === false, 'Should not hit dead enemy');
  assert(deadUpdate.target === null, 'Target should be null for dead enemy');
}
console.log('  ✓ updateProjectile handles dead target');

const instantTower = createTower(13, 200, 200, TowerType.ThornSniper, TargetingMode.First);
instantTower.projectileSpeed = 0;
const instantEnemy = createEnemy(201, EnemyType.BulwarkBeetle, path);
instantEnemy.position = { x: 230, y: 200 };
const instantFire = fireTower(instantTower, [instantEnemy], path, currentTime + instantTower.fireRate);
assert(instantFire.projectile !== null, 'Zero-speed Thorn Sniper should fire an instant projectile');
const instantUpdate = updateProjectile(instantFire.projectile!, [instantEnemy], deltaTime);
assert(instantUpdate.hit === true, 'Zero-speed Thorn Sniper projectile should resolve as an instant hit');
assert(instantUpdate.target === instantEnemy, 'Instant projectile should report its target');
assert(instantFire.projectile!.alive === false, 'Instant projectile should be consumed on hit');
assertEqual(instantFire.projectile!.position.x, instantEnemy.position.x, 'Instant projectile should snap to target x');
assertEqual(instantFire.projectile!.position.y, instantEnemy.position.y, 'Instant projectile should snap to target y');
console.log('  ✓ updateProjectile resolves zero-speed instant shots');

const enemyWithHp = createEnemy(300, EnemyType.DartWasp, path);
const initialHp = enemyWithHp.hp;
const killed = applyDamage(enemyWithHp, 2);
assert(killed === true, '2 damage should kill Blue Beetle (HP = 2)');
assert(enemyWithHp.hp === 0, 'HP should be 0 after lethal damage');
assert(enemyWithHp.alive === false, 'Enemy should be marked dead');
console.log('  ✓ applyDamage kills enemy');

const armoredEnemy = createEnemy(400, EnemyType.BulwarkBeetle, path);
const notKilled = applyDamage(armoredEnemy, 10, { damageType: 'explosive' });
assert(notKilled === false, 'Partial explosive damage should not kill, HP reduced to 5');
assert(armoredEnemy.hp === 5, 'HP should be reduced to 5');
assert(armoredEnemy.alive === true, 'Enemy should still be alive');
console.log('  ✓ applyDamage partial damage');

const killedByOverkill = applyDamage(armoredEnemy, 100, { damageType: 'explosive' });
assert(killedByOverkill === true, 'Overkill damage should kill enemy');
assert(armoredEnemy.hp === 0, 'HP should be 0 after lethal damage');
assert(armoredEnemy.alive === false, 'Enemy should be marked dead');
console.log('  ✓ applyDamage kills weakened enemy');

const secondKill = applyDamage(armoredEnemy, 100);
assert(secondKill === false, 'Should not kill already dead enemy');
console.log('  ✓ applyDamage ignores dead enemy');

const reward = getKillReward(armoredEnemy);
assert(reward === 45, `Bulwark Beetle reward should be 45, got ${reward}`);
console.log('  ✓ getKillReward returns correct reward');

const noRewardEnemy = createTargetingEnemy(500, 0, 999, 50);
const noReward = getKillReward(noRewardEnemy);
assert(noReward === 0, 'Unknown enemy type should return 0 reward');
console.log('  ✓ getKillReward returns 0 for unknown enemy');

console.log('\nAll tests passed!');
console.log('Summary:');
console.log('  - Canonical six-tower roster and tower creation');
console.log('  - Fire rate cooldown tracking');
console.log('  - Fire with all 4 targeting modes');
console.log('  - Projectile movement and hit detection');
console.log('  - Damage application and kill detection');
console.log('  - Kill reward lookup');

function farTower(enemies: Enemy[]) {
  const tower = createTower(99, 100, 100, TowerType.Puffball, TargetingMode.First);
  tower.position = { x: 100, y: 100 };
  return tower;
}

import { Path, createDefaultPath } from './systems/path';
import {
  Enemy,
  createEnemy,
  updateEnemyPosition,
  applyStatusEffect,
  updateStatusEffects,
  applyDamageToEnemy,
  processPoisonDamage,
  getEnemyProgressRatio,
  isEnemyInRange,
  getReward,
  getHealthPercent,
  hasStatusEffect,
  clearStatusEffects,
  respawnEnemy,
  StatusEffectType,
  isCamo,
} from './entities/enemy';
import { EnemyType } from './systems/wave';

const path = createDefaultPath();

console.log('=== Enemy Entity Tests ===\n');

console.log('Test 1: Create enemy');
const enemy = createEnemy(1, EnemyType.RedMushroom, path);
console.log('  Created enemy:', enemy.id, enemy.enemyType, 'HP:', enemy.hp, 'Speed:', enemy.speed);
console.assert(enemy.id === 1, 'Enemy ID should be 1');
console.assert(enemy.enemyType === EnemyType.RedMushroom, 'Enemy type should be RedMushroom');
console.assert(enemy.hp === 1, 'HP should be 1');
console.assert(enemy.alive === true, 'Enemy should be alive');
console.assert(enemy.hasReachedEnd === false, 'Enemy should not have reached end');
console.log('  PASS\n');

console.log('Test 2: Move enemy along path');
const initialPos = { ...enemy.position };
updateEnemyPosition(enemy, path, 1000);
console.log('  Initial pos:', initialPos, '-> New pos:', enemy.position);
console.log('  pathDistance:', enemy.pathDistance, 'Progress:', getEnemyProgressRatio(enemy, path));
console.assert(enemy.pathDistance > 0, 'pathDistance should increase');
console.assert(enemy.position.x !== initialPos.x || enemy.position.y !== initialPos.y, 'Position should change');
console.log('  PASS\n');

console.log('Test 3: Apply and update status effects');
applyStatusEffect(enemy, StatusEffectType.Slow, 5000, 0.5);
console.log('  Applied slow effect:', hasStatusEffect(enemy, StatusEffectType.Slow));
console.assert(hasStatusEffect(enemy, StatusEffectType.Slow) === true, 'Should have slow effect');
console.log('  PASS\n');

console.log('Test 4: Update status effects (time passes)');
const effectRemainingBefore = enemy.statusEffects[0]?.remaining ?? 0;
updateStatusEffects(enemy, 2000);
const effectRemainingAfter = enemy.statusEffects[0]?.remaining ?? 0;
console.log('  Effect remaining before:', effectRemainingBefore, 'after 2s:', effectRemainingAfter);
console.assert(effectRemainingAfter === effectRemainingBefore - 2000, 'Remaining should decrease by deltaTime');
console.log('  PASS\n');

console.log('Test 5: Poison damage');
const enemy2 = createEnemy(2, EnemyType.GreenCaterpillar, path);
enemy2.hp = 10;
applyStatusEffect(enemy2, StatusEffectType.Poison, 5000, 2);
const poisonDmg = processPoisonDamage(enemy2, 1000);
console.log('  Poison damage over 1s:', poisonDmg);
console.assert(poisonDmg === 2, 'Poison damage should be 2 per second');
console.log('  PASS\n');

console.log('Test 6: Apply damage');
const killed = applyDamageToEnemy(enemy2, 10);
console.log('  Applied 10 damage, killed:', killed, 'HP:', enemy2.hp);
console.assert(killed === true, 'Should be killed');
console.assert(enemy2.alive === false, 'Enemy should be dead');
console.log('  PASS\n');

console.log('Test 7: Non-lethal damage');
const enemy3 = createEnemy(3, EnemyType.BlueBeetle, path);
const notKilled = applyDamageToEnemy(enemy3, 1);
console.log('  Applied 1 damage, killed:', notKilled, 'HP:', enemy3.hp);
console.assert(notKilled === false, 'Should not be killed');
console.assert(enemy3.hp === 1, 'HP should be 1');
console.log('  PASS\n');

console.log('Test 8: Reward calculation');
console.log('  Enemy3 reward:', getReward(enemy3), '(BlueBeetle has reward 2)');
console.assert(getReward(enemy3) === 2, 'BlueBeetle reward should be 2');
console.log('  PASS\n');

console.log('Test 9: Health percent');
console.log('  Enemy3 health%:', getHealthPercent(enemy3), '(HP 1/2)');
console.assert(getHealthPercent(enemy3) === 0.5, 'Health percent should be 0.5');
console.log('  PASS\n');

console.log('Test 10: Range check');
const inRange = isEnemyInRange(enemy3, { x: 0, y: 300 }, 100);
const outOfRange = isEnemyInRange(enemy3, { x: 1000, y: 1000 }, 100);
console.log('  Enemy3 at', enemy3.position, 'In range of (0,300):', inRange, 'In range of (1000,1000):', outOfRange);
console.assert(inRange === true, 'Should be in range');
console.assert(outOfRange === false, 'Should be out of range');
console.log('  PASS\n');

console.log('Test 11: Enemy reaches end of path');
const enemy4 = createEnemy(4, EnemyType.ShelledSnail, path);
enemy4.pathDistance = path.getTotalLength();
updateEnemyPosition(enemy4, path, 100);
console.log('  Enemy4 at end:', enemy4.hasReachedEnd, 'Alive:', enemy4.alive);
console.assert(enemy4.hasReachedEnd === true, 'Should have reached end');
console.assert(enemy4.alive === false, 'Should not be alive');
console.log('  PASS\n');

console.log('Test 12: Clear status effects');
applyStatusEffect(enemy, StatusEffectType.Slow, 5000, 0.5);
applyStatusEffect(enemy, StatusEffectType.Poison, 3000, 1);
console.log('  Has effects before clear:', enemy.statusEffects.length);
clearStatusEffects(enemy);
console.log('  Has effects after clear:', enemy.statusEffects.length);
console.assert(enemy.statusEffects.length === 0, 'Status effects should be cleared');
console.log('  PASS\n');

console.log('Test 13: Respawn enemy');
const enemy5 = createEnemy(5, EnemyType.PinkLadybug, path);
enemy5.hp = 0;
enemy5.pathDistance = 500;
respawnEnemy(enemy5, path);
console.log('  After respawn - HP:', enemy5.hp, 'Alive:', enemy5.alive, 'pathDistance:', enemy5.pathDistance);
console.assert(enemy5.hp === enemy5.maxHp, 'HP should be reset');
console.assert(enemy5.alive === true, 'Should be alive after respawn');
console.assert(enemy5.pathDistance === 0, 'pathDistance should be 0');
console.log('  PASS\n');

console.log('Test 14: Camo detection');
const camoEnemy = createEnemy(6, EnemyType.WhiteMoth, path);
const nonCamoEnemy = createEnemy(7, EnemyType.RedMushroom, path);
console.log('  WhiteMoth is camo:', isCamo(camoEnemy), 'RedMushroom is camo:', isCamo(nonCamoEnemy));
console.assert(isCamo(camoEnemy) === true, 'WhiteMoth should be camo');
console.assert(isCamo(nonCamoEnemy) === false, 'RedMushroom should not be camo');
console.log('  PASS\n');

console.log('Test 15: Enemy type mapping for all types');
for (const type of Object.values(EnemyType)) {
  const e = createEnemy(100, type, path);
  console.log('  ', type, '- HP:', e.hp, 'Speed:', e.speed, 'Reward:', e.reward);
  console.assert(e.enemyType === type, 'Enemy type mismatch');
  console.assert(e.hp > 0, 'HP should be positive');
  console.assert(e.speed > 0, 'Speed should be positive');
  console.assert(e.reward >= 0, 'Reward should be non-negative');
}
console.log('  PASS\n');

console.log('=== All Tests Passed ===');

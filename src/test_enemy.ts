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
  hasEnemyTrait,
  hasStatusEffect,
  clearStatusEffects,
  respawnEnemy,
  StatusEffectType,
  EnemyTrait,
  disruptEnemyTrait,
  markEnemy,
  refreshSwarmLinkStates,
  isCamo,
} from './entities/enemy';
import { EnemyType } from './systems/wave';

const path = createDefaultPath();

function assertTest(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

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

console.log('Test 15: Metal trait blocks non-explosive damage');
const metalEnemy = createEnemy(8, EnemyType.ArmoredBeetle, path);
const metalStartingHp = metalEnemy.hp;
console.assert(Array.isArray((metalEnemy as any).traits), 'Metal enemy should expose traits');
console.assert((metalEnemy as any).traits.includes('metal'), 'ArmoredBeetle should have Metal trait');
const blockedByMetal = applyDamageToEnemy(metalEnemy, 5);
console.log('  Non-explosive damage blocked:', blockedByMetal === false, 'HP:', metalEnemy.hp);
console.assert(blockedByMetal === false, 'Non-explosive damage should not damage Metal enemies');
console.assert(metalEnemy.hp === metalStartingHp, 'Metal enemy HP should stay unchanged after non-explosive damage');
const explosivePartial = (applyDamageToEnemy as any)(metalEnemy, 5, { damageType: 'explosive' });
console.log('  Explosive damage applied:', explosivePartial === false, 'HP:', metalEnemy.hp);
console.assert(explosivePartial === false, 'Partial explosive damage should not kill Metal enemy');
console.assert(metalEnemy.hp === metalStartingHp - 5, 'Explosive damage should reduce Metal enemy HP');
console.log('  PASS\n');

console.log('Test 16: Shielded trait blocks the first hit');
const shieldedEnemy = createEnemy(9, EnemyType.RainbowStag, path);
const shieldedStartingHp = shieldedEnemy.hp;
assertTest((shieldedEnemy as any).traits.includes('shielded'), 'RainbowStag should have Shielded trait');
assertTest((shieldedEnemy as any).shieldCharges === 1, 'Shielded enemy should start with one shield charge');
const blockedByShield = applyDamageToEnemy(shieldedEnemy, 5);
console.log('  First hit blocked:', blockedByShield === false, 'HP:', shieldedEnemy.hp, 'Shield:', (shieldedEnemy as any).shieldCharges);
assertTest(blockedByShield === false, 'First hit should break shield without killing Shielded enemy');
assertTest(shieldedEnemy.hp === shieldedStartingHp, 'Shielded enemy HP should stay unchanged after shield block');
assertTest((shieldedEnemy as any).shieldCharges === 0, 'Shielded enemy shield should break after first hit');
const shieldedPartial = applyDamageToEnemy(shieldedEnemy, 5);
console.log('  Second hit applied:', shieldedPartial === false, 'HP:', shieldedEnemy.hp);
assertTest(shieldedPartial === false, 'Second partial hit should not kill Shielded enemy');
assertTest(shieldedEnemy.hp === shieldedStartingHp - 5, 'Second hit should damage Shielded enemy after shield breaks');
console.log('  PASS\n');

console.log('Test 17: Swarm-linked trait activates pack resistance');
const swarmEnemy = createEnemy(10, EnemyType.PinkLadybug, path);
swarmEnemy.hp = 20;
swarmEnemy.maxHp = 20;
const swarmStartingHp = swarmEnemy.hp;
assertTest((swarmEnemy as any).traits.includes('swarm_linked'), 'PinkLadybug should have Swarm-linked trait');
(swarmEnemy as any).swarmLinkedActive = true;
(swarmEnemy as any).swarmLinkCount = 3;
const swarmPartial = applyDamageToEnemy(swarmEnemy, 10);
console.log('  Swarm-linked damage reduced:', swarmPartial === false, 'HP:', swarmEnemy.hp);
assertTest(swarmPartial === false, 'Partial swarm-resistant hit should not kill Swarm-linked enemy');
assertTest(swarmEnemy.hp === swarmStartingHp - 9, 'Active Swarm-linked enemy should take 10% less incoming damage');
console.log('  PASS\n');

console.log('Test 18: Enemy type mapping for all types');
for (const type of Object.values(EnemyType)) {
  const e = createEnemy(100, type, path);
  console.log('  ', type, '- HP:', e.hp, 'Speed:', e.speed, 'Reward:', e.reward);
  console.assert(e.enemyType === type, 'Enemy type mismatch');
  console.assert(e.hp > 0, 'HP should be positive');
  console.assert(e.speed > 0, 'Speed should be positive');
  console.assert(e.reward >= 0, 'Reward should be non-negative');
}
console.log('  PASS\n');

console.log('Test 19: Trait disruption temporarily opens Metal enemies to ordinary damage');
const disruptedMetal = createEnemy(11, EnemyType.ArmoredBeetle, path);
const disruptedMetalStartingHp = disruptedMetal.hp;
const disruptedMetalTrait = disruptEnemyTrait(disruptedMetal, 5000);
assertTest(disruptedMetalTrait === EnemyTrait.Metal, 'Disruption should strip Metal from ArmoredBeetle');
assertTest(hasEnemyTrait(disruptedMetal, EnemyTrait.Metal) === false, 'Disrupted Metal trait should be inactive');
const disruptedMetalHit = applyDamageToEnemy(disruptedMetal, 5);
assertTest(disruptedMetalHit === false, 'Partial ordinary damage should not kill disrupted Metal enemy');
assertTest(disruptedMetal.hp === disruptedMetalStartingHp - 5, 'Ordinary damage should land while Metal is disrupted');
updateStatusEffects(disruptedMetal, 4000);
const refreshedMetalTrait = disruptEnemyTrait(disruptedMetal, 5000);
assertTest(refreshedMetalTrait === EnemyTrait.Metal, 'Repeated disruption hits should refresh the disrupted Metal trait');
const refreshedMetalEffect = disruptedMetal.statusEffects.find(
  effect => effect.type === StatusEffectType.TraitDisrupted && effect.disruptedTrait === EnemyTrait.Metal
);
assertTest(refreshedMetalEffect?.remaining === 5000, 'Repeated disruption hits should reset the disruption timer');
updateStatusEffects(disruptedMetal, 4999);
assertTest(hasEnemyTrait(disruptedMetal, EnemyTrait.Metal) === false, 'Refreshed Metal disruption should stay active for the full duration');
updateStatusEffects(disruptedMetal, 5001);
assertTest(hasEnemyTrait(disruptedMetal, EnemyTrait.Metal) === true, 'Metal trait should return after disruption expires');
const restoredMetalHp = disruptedMetal.hp;
const restoredMetalHit = applyDamageToEnemy(disruptedMetal, 5);
assertTest(restoredMetalHit === false, 'Restored Metal enemy should block ordinary damage');
assertTest(disruptedMetal.hp === restoredMetalHp, 'Restored Metal enemy HP should stay unchanged after ordinary damage');
console.log('  PASS\n');

console.log('Test 20: Trait disruption breaks active shields');
const disruptedShield = createEnemy(12, EnemyType.RainbowStag, path);
const disruptedShieldStartingHp = disruptedShield.hp;
const disruptedShieldTrait = disruptEnemyTrait(disruptedShield, 5000);
assertTest(disruptedShieldTrait === EnemyTrait.Shielded, 'Disruption should strip Shielded first when shield is active');
assertTest(disruptedShield.shieldCharges === 0, 'Disrupting Shielded should consume the active shield');
const disruptedShieldHit = applyDamageToEnemy(disruptedShield, 5);
assertTest(disruptedShieldHit === false, 'Partial hit after shield disruption should not kill Shielded enemy');
assertTest(disruptedShield.hp === disruptedShieldStartingHp - 5, 'Hit after shield disruption should damage HP immediately');
console.log('  PASS\n');

console.log('Test 21: Trait disruption removes Swarm-linked enemies from pack bonuses');
const disruptedSwarmPack = [13, 14, 15].map(id => {
  const e = createEnemy(id, EnemyType.PinkLadybug, path);
  e.position = { x: 100, y: 100 };
  e.hp = 20;
  e.maxHp = 20;
  return e;
});
const disruptedSwarmTrait = disruptEnemyTrait(disruptedSwarmPack[0], 5000);
assertTest(disruptedSwarmTrait === EnemyTrait.SwarmLinked, 'Disruption should strip Swarm-linked from PinkLadybug');
refreshSwarmLinkStates(disruptedSwarmPack);
assertTest(disruptedSwarmPack[0].swarmLinkedActive === false, 'Disrupted Swarm-linked enemy should not activate pack bonus');
assertTest(disruptedSwarmPack[1].swarmLinkedActive === false, 'Packmates should lose pack bonus when disrupted enemy no longer counts');
assertTest(disruptedSwarmPack[2].swarmLinkedActive === false, 'All packmates should require three undisrupted swarm enemies');
console.log('  PASS\n');

console.log('Test 22: Mark adds one damage per hit and refreshes without stacking');
const markedEnemy = createEnemy(16, EnemyType.BlueBeetle, path);
markedEnemy.hp = 10;
markedEnemy.maxHp = 10;
markEnemy(markedEnemy, 4000);
assertTest(hasStatusEffect(markedEnemy, StatusEffectType.Marked), 'Marked enemy should receive Marked status');
const markedHit = applyDamageToEnemy(markedEnemy, 2);
assertTest(markedHit === false, 'Partial hit should not kill marked enemy');
assertTest(markedEnemy.hp === 7, 'Marked enemy should take +1 damage from a hit');
updateStatusEffects(markedEnemy, 3000);
markEnemy(markedEnemy, 4000);
const markEffects = markedEnemy.statusEffects.filter(effect => effect.type === StatusEffectType.Marked);
assertTest(markEffects.length === 1, 'Repeated mark should refresh the existing mark instead of stacking');
assertTest(markEffects[0].remaining === 4000, 'Repeated mark should reset the mark timer');
updateStatusEffects(markedEnemy, 4001);
const unmarkedHp = markedEnemy.hp;
applyDamageToEnemy(markedEnemy, 2);
assertTest(markedEnemy.hp === unmarkedHp - 2, 'Expired mark should no longer add bonus damage');
console.log('  PASS\n');

console.log('=== All Tests Passed ===');

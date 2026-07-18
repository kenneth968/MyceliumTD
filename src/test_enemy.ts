import { Path, createDefaultPath } from './systems/path';
import {
  Enemy,
  createEnemy,
  updateEnemyPosition,
  applyStatusEffect,
  updateStatusEffects,
  applyDamageToEnemy,
  resolveDamage,
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
const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
console.log('  Created enemy:', enemy.id, enemy.enemyType, 'HP:', enemy.hp, 'Speed:', enemy.speed);
console.assert(enemy.id === 1, 'Enemy ID should be 1');
console.assert(enemy.enemyType === EnemyType.ScoutBeetle, 'Enemy type should be ScoutBeetle');
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
const enemy2 = createEnemy(2, EnemyType.ShellBeetle, path);
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
const enemy3 = createEnemy(3, EnemyType.ShellBeetle, path);
const notKilled = applyDamageToEnemy(enemy3, 1);
console.log('  Applied 1 damage, killed:', notKilled, 'HP:', enemy3.hp);
console.assert(notKilled === false, 'Should not be killed');
console.assert(enemy3.hp === 3, 'HP should be 3');
console.log('  PASS\n');

console.log('Test 8: Reward calculation');
console.log('  Enemy3 reward:', getReward(enemy3), '(ShellBeetle has reward 18)');
console.assert(getReward(enemy3) === 18, 'ShellBeetle reward should be 18');
console.log('  PASS\n');

console.log('Test 9: Health percent');
console.log('  Enemy3 health%:', getHealthPercent(enemy3), '(HP 3/4)');
console.assert(getHealthPercent(enemy3) === 0.75, 'Health percent should be 0.75');
console.log('  PASS\n');

console.log('Test 10: Range check');
const inRange = isEnemyInRange(enemy3, { x: 0, y: 300 }, 100);
const outOfRange = isEnemyInRange(enemy3, { x: 1000, y: 1000 }, 100);
console.log('  Enemy3 at', enemy3.position, 'In range of (0,300):', inRange, 'In range of (1000,1000):', outOfRange);
console.assert(inRange === true, 'Should be in range');
console.assert(outOfRange === false, 'Should be out of range');
console.log('  PASS\n');

console.log('Test 11: Enemy reaches end of path');
const enemy4 = createEnemy(4, EnemyType.PaleMoth, path);
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
const enemy5 = createEnemy(5, EnemyType.SwarmWasp, path);
enemy5.hp = 0;
enemy5.pathDistance = 500;
respawnEnemy(enemy5, path);
console.log('  After respawn - HP:', enemy5.hp, 'Alive:', enemy5.alive, 'pathDistance:', enemy5.pathDistance);
console.assert(enemy5.hp === enemy5.maxHp, 'HP should be reset');
console.assert(enemy5.alive === true, 'Should be alive after respawn');
console.assert(enemy5.pathDistance === 0, 'pathDistance should be 0');
console.log('  PASS\n');

console.log('Test 14: Camo detection');
const camoEnemy = createEnemy(6, EnemyType.VeilWasp, path);
const nonCamoEnemy = createEnemy(7, EnemyType.ScoutBeetle, path);
console.log('  VeilWasp is camo:', isCamo(camoEnemy), 'ScoutBeetle is camo:', isCamo(nonCamoEnemy));
console.assert(isCamo(camoEnemy) === true, 'VeilWasp should be camo');
console.assert(isCamo(nonCamoEnemy) === false, 'ScoutBeetle should not be camo');
console.log('  PASS\n');

console.log('Test 15: Metal trait blocks non-explosive damage');
const metalEnemy = createEnemy(8, EnemyType.BulwarkBeetle, path);
const metalStartingHp = metalEnemy.hp;
console.assert(Array.isArray(metalEnemy.traits), 'Metal enemy should expose traits');
console.assert(metalEnemy.traits.includes(EnemyTrait.Metal), 'BulwarkBeetle should have Metal trait');
const blockedByMetal = applyDamageToEnemy(metalEnemy, 5);
console.log('  Non-explosive damage blocked:', blockedByMetal === false, 'HP:', metalEnemy.hp);
console.assert(blockedByMetal === false, 'Non-explosive damage should not damage Metal enemies');
console.assert(metalEnemy.hp === metalStartingHp, 'Metal enemy HP should stay unchanged after non-explosive damage');
const explosivePartial = applyDamageToEnemy(metalEnemy, 5, { damageType: 'explosive' });
console.log('  Explosive damage applied:', explosivePartial === false, 'HP:', metalEnemy.hp);
console.assert(explosivePartial === false, 'Partial explosive damage should not kill Metal enemy');
console.assert(metalEnemy.hp === metalStartingHp - 5, 'Explosive damage should reduce Metal enemy HP');
console.log('  PASS\n');

console.log('Test 16: Shielded trait blocks the first hit');
const shieldedEnemy = createEnemy(9, EnemyType.WardMoth, path);
const shieldedStartingHp = shieldedEnemy.hp;
assertTest(shieldedEnemy.traits.includes(EnemyTrait.Shielded), 'WardMoth should have Shielded trait');
assertTest(shieldedEnemy.shieldCharges === 1, 'Shielded enemy should start with one shield charge');
const blockedByShield = applyDamageToEnemy(shieldedEnemy, 5);
console.log('  First hit blocked:', blockedByShield === false, 'HP:', shieldedEnemy.hp, 'Shield:', shieldedEnemy.shieldCharges);
assertTest(blockedByShield === false, 'First hit should break shield without killing Shielded enemy');
assertTest(shieldedEnemy.hp === shieldedStartingHp, 'Shielded enemy HP should stay unchanged after shield block');
assertTest(shieldedEnemy.shieldCharges === 0, 'Shielded enemy shield should break after first hit');
const shieldedPartial = applyDamageToEnemy(shieldedEnemy, 5);
console.log('  Second hit applied:', shieldedPartial === false, 'HP:', shieldedEnemy.hp);
assertTest(shieldedPartial === false, 'Second partial hit should not kill Shielded enemy');
assertTest(shieldedEnemy.hp === shieldedStartingHp - 5, 'Second hit should damage Shielded enemy after shield breaks');
console.log('  PASS\n');

console.log('Test 17: Swarm-linked trait activates pack resistance');
const swarmEnemy = createEnemy(10, EnemyType.SwarmWasp, path);
const swarmStartingHp = swarmEnemy.hp;
assertTest(swarmEnemy.traits.includes(EnemyTrait.SwarmLinked), 'SwarmWasp should have Swarm-linked trait');
swarmEnemy.swarmLinkedActive = true;
swarmEnemy.swarmLinkCount = 3;
const swarmPartial = applyDamageToEnemy(swarmEnemy, 0.5);
console.log('  Swarm-linked damage reduced:', swarmPartial === false, 'HP:', swarmEnemy.hp);
assertTest(swarmPartial === false, 'Partial swarm-resistant hit should not kill Swarm-linked enemy');
assertTest(swarmEnemy.hp === swarmStartingHp - 0.45, 'Active Swarm-linked enemy should take 10% less incoming damage');
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
const disruptedMetal = createEnemy(11, EnemyType.BulwarkBeetle, path);
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
const disruptedShield = createEnemy(12, EnemyType.WardMoth, path);
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
  const e = createEnemy(id, EnemyType.SwarmWasp, path);
  e.position = { x: 100, y: 100 };
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
const markedEnemy = createEnemy(16, EnemyType.CrawlerCaterpillar, path);
markEnemy(markedEnemy, 4000);
assertTest(hasStatusEffect(markedEnemy, StatusEffectType.Marked), 'Marked enemy should receive Marked status');
const markedHit = applyDamageToEnemy(markedEnemy, 2);
assertTest(markedHit === false, 'Partial hit should not kill marked enemy');
assertTest(markedEnemy.hp === 3, 'Marked enemy should take +1 damage from a hit');
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

const layered = createEnemy(1000, EnemyType.ShellBeetle, path);
assertTest(layered.layers.length === 2, 'Shell Beetle has two layers');

const first = resolveDamage(layered, layered.layers[0].maxHp + 1);
assertTest(first.layersBroken === 1, 'first layer breaks');
assertTest(layered.currentLayerIndex === 1, 'damage advances to second layer');
assertTest(layered.layers[1].hp === layered.layers[1].maxHp - 1, 'overflow reaches next layer');

const lethal = resolveDamage(layered, 999);
assertTest(lethal.killed, 'large hit can break remaining layers');
assertTest(lethal.layersBroken === 1, 'remaining layer break is counted');

console.log('=== All Tests Passed ===');

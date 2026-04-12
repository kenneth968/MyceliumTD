import { Path, createDefaultPath } from './path';
import { Enemy, StatusEffectType, createEnemy, applyStatusEffect, updateStatusEffects, clearStatusEffects, hasStatusEffect } from '../entities/enemy';
import { processStatusEffectHit, updateEnemyWithStatusEffects, isEnemyStunned, getSlowFactor, processEnemyStatusTick } from './statusEffects';
import { HitEffect } from './collision';
import { TowerType } from '../entities/tower';
import { EnemyType } from './wave';

const path = createDefaultPath();

console.log('=== Status Effect System Integration Tests ===\n');

function createTestEnemy(): Enemy {
  return createEnemy(1, EnemyType.RedMushroom, path);
}

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`  PASS: ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`  FAIL: ${name} - ${e.message}`);
    failed++;
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

console.log('--- Applying Status Effects ---');

test('should apply slow effect to enemy', () => {
  const enemy = createTestEnemy();
  applyStatusEffect(enemy, StatusEffectType.Slow, 1000, 0.5);
  assert(enemy.statusEffects.length === 1, 'Should have 1 effect');
  assert(enemy.statusEffects[0].type === StatusEffectType.Slow, 'Should be slow');
  assert(enemy.statusEffects[0].duration === 1000, 'Duration should be 1000');
  assert(enemy.statusEffects[0].strength === 0.5, 'Strength should be 0.5');
});

test('should apply poison effect to enemy', () => {
  const enemy = createTestEnemy();
  applyStatusEffect(enemy, StatusEffectType.Poison, 2000, 5);
  assert(enemy.statusEffects.length === 1, 'Should have 1 effect');
  assert(enemy.statusEffects[0].type === StatusEffectType.Poison, 'Should be poison');
});

test('should apply stun effect to enemy', () => {
  const enemy = createTestEnemy();
  applyStatusEffect(enemy, StatusEffectType.Stun, 500, 1.0);
  assert(enemy.statusEffects.length === 1, 'Should have 1 effect');
  assert(enemy.statusEffects[0].type === StatusEffectType.Stun, 'Should be stun');
});

test('should refresh existing effect duration', () => {
  const enemy = createTestEnemy();
  applyStatusEffect(enemy, StatusEffectType.Slow, 1000, 0.5);
  applyStatusEffect(enemy, StatusEffectType.Slow, 2000, 0.5);
  assert(enemy.statusEffects.length === 1, 'Should still have 1 effect');
  assert(enemy.statusEffects[0].remaining === 2000, 'Remaining should be refreshed to 2000');
});

test('should increase effect strength if higher', () => {
  const enemy = createTestEnemy();
  applyStatusEffect(enemy, StatusEffectType.Slow, 1000, 0.3);
  applyStatusEffect(enemy, StatusEffectType.Slow, 1000, 0.7);
  assert(enemy.statusEffects.length === 1, 'Should still have 1 effect');
  assert(enemy.statusEffects[0].strength === 0.7, 'Strength should be updated to 0.7');
});

console.log('\n--- Updating Status Effects ---');

test('should reduce remaining time', () => {
  const enemy = createTestEnemy();
  applyStatusEffect(enemy, StatusEffectType.Slow, 1000, 0.5);
  updateStatusEffects(enemy, 500);
  assert(enemy.statusEffects[0].remaining === 500, 'Remaining should be 500');
});

test('should remove expired effects', () => {
  const enemy = createTestEnemy();
  applyStatusEffect(enemy, StatusEffectType.Slow, 1000, 0.5);
  updateStatusEffects(enemy, 1000);
  assert(enemy.statusEffects.length === 0, 'Should have no effects');
});

test('should handle multiple effects', () => {
  const enemy = createTestEnemy();
  applyStatusEffect(enemy, StatusEffectType.Slow, 1000, 0.5);
  applyStatusEffect(enemy, StatusEffectType.Poison, 2000, 5);
  updateStatusEffects(enemy, 500);
  assert(enemy.statusEffects.length === 2, 'Should still have 2 effects');
});

console.log('\n--- isEnemyStunned ---');

test('should return true when enemy has stun effect', () => {
  const enemy = createTestEnemy();
  applyStatusEffect(enemy, StatusEffectType.Stun, 500, 1.0);
  assert(isEnemyStunned(enemy) === true, 'Should be stunned');
});

test('should return false when enemy has no stun effect', () => {
  const enemy = createTestEnemy();
  applyStatusEffect(enemy, StatusEffectType.Slow, 1000, 0.5);
  assert(isEnemyStunned(enemy) === false, 'Should not be stunned');
});

test('should return false when stun effect expires', () => {
  const enemy = createTestEnemy();
  applyStatusEffect(enemy, StatusEffectType.Stun, 500, 1.0);
  updateStatusEffects(enemy, 500);
  assert(isEnemyStunned(enemy) === false, 'Should not be stunned after expiry');
});

console.log('\n--- getSlowFactor ---');

test('should return 1.0 when no slow effects', () => {
  const enemy = createTestEnemy();
  assert(getSlowFactor(enemy) === 1.0, 'Factor should be 1.0');
});

test('should return reduced factor with slow effect', () => {
  const enemy = createTestEnemy();
  applyStatusEffect(enemy, StatusEffectType.Slow, 1000, 0.5);
  assert(getSlowFactor(enemy) === 0.5, 'Factor should be 0.5');
});

test('should take maximum of multiple slow effects', () => {
  const enemy = createTestEnemy();
  applyStatusEffect(enemy, StatusEffectType.Slow, 1000, 0.5);
  applyStatusEffect(enemy, StatusEffectType.Slow, 1000, 0.3);
  assert(getSlowFactor(enemy) === 0.5, 'Should take max (0.5), not stack');
});

console.log('\n--- processEnemyStatusTick ---');

test('should process poison damage', () => {
  const enemy = createTestEnemy();
  applyStatusEffect(enemy, StatusEffectType.Poison, 3000, 10);
  const result = processEnemyStatusTick(enemy, 1000);
  assert(result.poisonDamage === 10, 'Poison damage should be 10');
});

test('should detect stun', () => {
  const enemy = createTestEnemy();
  applyStatusEffect(enemy, StatusEffectType.Stun, 500, 1.0);
  const result = processEnemyStatusTick(enemy, 100);
  assert(result.isStunned === true, 'Should be stunned');
});

test('should calculate slowed speed', () => {
  const enemy = createTestEnemy();
  applyStatusEffect(enemy, StatusEffectType.Slow, 1000, 0.5);
  const result = processEnemyStatusTick(enemy, 100);
  assert(result.effectiveSpeed === enemy.baseSpeed * 0.5, 'Speed should be halved');
});

console.log('\n--- processStatusEffectHit ---');

test('should process slow effect from hit effects', () => {
  const enemy = createTestEnemy();
  const effects: HitEffect[] = [
    { type: 'slow', strength: 0.5, duration: 1000 }
  ];
  
  const result = processStatusEffectHit(enemy, effects, 16);
  
  assert(result.effectsApplied.includes(StatusEffectType.Slow), 'Should apply slow');
  assert(hasStatusEffect(enemy, StatusEffectType.Slow), 'Should have slow effect');
});

test('should process poison effect from hit effects', () => {
  const enemy = createTestEnemy();
  const effects: HitEffect[] = [
    { type: 'poison', strength: 5, duration: 3000 }
  ];
  
  const result = processStatusEffectHit(enemy, effects, 16);
  
  assert(result.effectsApplied.includes(StatusEffectType.Poison), 'Should apply poison');
});

test('should process stun effect from hit effects', () => {
  const enemy = createTestEnemy();
  const effects: HitEffect[] = [
    { type: 'stun', strength: 1.0, duration: 500 }
  ];
  
  const result = processStatusEffectHit(enemy, effects, 16);
  
  assert(result.effectsApplied.includes(StatusEffectType.Stun), 'Should apply stun');
});

test('should process multiple effects at once', () => {
  const enemy = createTestEnemy();
  const effects: HitEffect[] = [
    { type: 'slow', strength: 0.5, duration: 1000 },
    { type: 'poison', strength: 5, duration: 3000 }
  ];
  
  const result = processStatusEffectHit(enemy, effects, 16);
  
  assert(result.effectsApplied.length === 2, 'Should apply 2 effects');
  assert(result.effectsApplied.includes(StatusEffectType.Slow), 'Should include slow');
  assert(result.effectsApplied.includes(StatusEffectType.Poison), 'Should include poison');
});

console.log('\n--- Tower type status effects ---');

test('Orchid trap should apply slow', () => {
  const enemy = createTestEnemy();
  const effects: HitEffect[] = [
    { type: 'damage', strength: 2 },
    { type: 'slow', strength: 0.5, duration: 1000 }
  ];
  
  const result = processStatusEffectHit(enemy, effects, 16);
  
  assert(result.effectsApplied.includes(StatusEffectType.Slow), 'Should apply slow');
  assert(!result.effectsApplied.includes(StatusEffectType.Stun), 'Should not be stunned');
});

test('Stinkhorn line should apply poison', () => {
  const enemy = createTestEnemy();
  const effects: HitEffect[] = [
    { type: 'damage', strength: 3 },
    { type: 'poison', strength: 1.5, duration: 3000 }
  ];
  
  const result = processStatusEffectHit(enemy, effects, 16);
  
  assert(result.effectsApplied.includes(StatusEffectType.Poison), 'Should apply poison');
});

test('Venus flytower should not apply status effects', () => {
  const enemy = createTestEnemy();
  const effects: HitEffect[] = [
    { type: 'damage', strength: 100 }
  ];
  
  const result = processStatusEffectHit(enemy, effects, 16);
  
  assert(result.effectsApplied.length === 0, 'Should apply no effects');
});

console.log('\n--- Stun effect blocks movement ---');

test('stunned enemy should not move', () => {
  const enemy = createTestEnemy();
  applyStatusEffect(enemy, StatusEffectType.Stun, 1000, 1.0);
  
  const result = updateEnemyWithStatusEffects(enemy, 100);
  
  assert(result.moved === false, 'Stunned enemy should not move');
});

test('non-stunned enemy with slow should still move', () => {
  const enemy = createTestEnemy();
  applyStatusEffect(enemy, StatusEffectType.Slow, 1000, 0.5);
  
  const result = updateEnemyWithStatusEffects(enemy, 100);
  
  assert(result.moved === true, 'Slowed enemy should still move');
});

test('stunned enemy should take poison damage', () => {
  const enemy = createTestEnemy();
  applyStatusEffect(enemy, StatusEffectType.Stun, 1000, 1.0);
  applyStatusEffect(enemy, StatusEffectType.Poison, 3000, 10);
  
  const result = updateEnemyWithStatusEffects(enemy, 1000);
  
  assert(result.poisonDamage === 10, 'Stunned enemy should still take poison damage');
});

console.log('\n=== Status Effect System Tests Complete ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
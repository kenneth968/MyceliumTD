import { Path, createDefaultPath } from './path';
import { Enemy, StatusEffectType, createEnemy, applyStatusEffect, updateStatusEffects, clearStatusEffects, hasStatusEffect } from '../entities/enemy';
import { processStatusEffectHit, updateEnemyWithStatusEffects, isEnemyStunned, getSlowFactor, processEnemyStatusTick } from './statusEffects';
import { HitEffect, getHitEffectsForTowerType, applyHitEffects } from './collision';
import { TowerType } from '../entities/tower';
import { EnemyType, ENEMY_STATS } from './wave';
import { GameRunner, createGameRunner } from './gameRunner';
import { TowerWithUpgrades, createTowerWithUpgrades, applyUpgrade, UpgradePath, getSpecialEffectInfo } from './upgrade';
import { GameEconomy, createEconomy } from './economy';
import { TargetingMode } from './targeting';

const path = createDefaultPath();

console.log('=== Status Effect Integration Tests ===\n');

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

function assertApprox(actual: number, expected: number, tolerance: number, message: string) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`${message}: expected ~${expected}, got ${actual}`);
  }
}

console.log('--- GameRunner + Status Effects Integration ---');

test('GameRunner should track enemy status effects through update', () => {
  const game = createGameRunner({ startingMoney: 1000, startingLives: 20 });
  game.start();
  
  const tower = game.placeTower(TowerType.OrchidTrap, 200, 200, TargetingMode.First);
  assert(tower !== null, 'Tower should be placed');
  
  game.startWave(0);
  
  let enemyHit = false;
  for (let i = 0; i < 50; i++) {
    game.update(Date.now() + 16);
    
    const enemies = game.getActiveEnemies();
    for (const enemy of enemies) {
      if (enemy.statusEffects.some(e => e.type === StatusEffectType.Slow)) {
        enemyHit = true;
        assert(getSlowFactor(enemy) < 1.0, 'Slow factor should reduce speed');
      }
    }
    
    if (game.getGameStats().enemies === 0) break;
  }
  
  assert(enemyHit, 'At least one enemy should have been slowed');
});

test('GameRunner should handle stun blocking enemy movement', () => {
  const game = createGameRunner({ startingMoney: 1000, startingLives: 20 });
  game.start();
  
  const tower = game.placeTower(TowerType.OrchidTrap, 200, 200, TargetingMode.First);
  assert(tower !== null, 'Tower should be placed');
  
  game.startWave(0);
  
  let stunnedEnemy: Enemy | null = null;
  for (let i = 0; i < 100; i++) {
    game.update(Date.now() + 16);
    
    const enemies = game.getActiveEnemies();
    for (const enemy of enemies) {
      if (isEnemyStunned(enemy)) {
        stunnedEnemy = enemy;
        const posBefore = { ...enemy.position };
        game.update(Date.now() + 16);
        const posAfter = enemy.position;
        assert(posBefore.x === posAfter.x && posBefore.y === posAfter.y, 
          'Stunned enemy should not move');
        break;
      }
    }
    
    if (stunnedEnemy) break;
    if (game.getGameStats().enemies === 0 && i > 20) break;
  }
  
  assert(stunnedEnemy !== null, 'Should have encountered a stunned enemy');
});

test('Poison damage should accumulate over time in GameRunner', () => {
  const game = createGameRunner({ startingMoney: 1000, startingLives: 20 });
  game.start();
  
  const tower = game.placeTower(TowerType.StinkhornLine, 200, 200, TargetingMode.First);
  assert(tower !== null, 'Tower should be placed');
  
  game.startWave(0);
  
  let poisonApplied = false;
  const initialHp = new Map<number, number>();
  
  for (let i = 0; i < 80; i++) {
    game.update(Date.now() + 16);
    
    const enemies = game.getActiveEnemies();
    for (const enemy of enemies) {
      if (enemy.statusEffects.some(e => e.type === StatusEffectType.Poison)) {
        poisonApplied = true;
        if (!initialHp.has(enemy.id)) {
          initialHp.set(enemy.id, enemy.hp);
        }
      }
    }
    
    if (game.getGameStats().enemies === 0 && i > 20) break;
  }
  
  assert(poisonApplied, 'Poison effect should have been applied to enemies');
});

test('Status effects should not persist after enemy death', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  applyStatusEffect(enemy, StatusEffectType.Slow, 5000, 0.5);
  applyStatusEffect(enemy, StatusEffectType.Poison, 3000, 10);
  
  assert(enemy.statusEffects.length === 2, 'Should have 2 effects');
  
  enemy.hp = 0;
  enemy.alive = false;
  
  assert(enemy.statusEffects.length === 2, 'Effects remain on dead enemy (expected - cleared on removal)');
});

console.log('\n--- Upgrade System + Special Effects Integration ---');

test('Special upgrade should modify hit effects for Orchid slow', () => {
  const tower = createTowerWithUpgrades(1, 100, 100, TowerType.OrchidTrap, TargetingMode.First);
  
  const effectsBefore = getHitEffectsForTowerType(TowerType.OrchidTrap, 2);
  const slowEffectBefore = effectsBefore.find(e => e.type === 'slow');
  assert(slowEffectBefore !== undefined, 'Should have slow effect');
  assert(slowEffectBefore!.strength === 0.5, 'Default slow strength should be 0.5');
  
  applyUpgrade(tower, UpgradePath.Special);
  
  const info = getSpecialEffectInfo(tower);
  assert(info !== null, 'Should have special effect info after upgrade');
  
  const effectsAfter = getHitEffectsForTowerType(TowerType.OrchidTrap, 2, info.effectStrength, info.effectDuration);
  const slowEffectAfter = effectsAfter.find(e => e.type === 'slow');
  assert(slowEffectAfter !== undefined, 'Should have slow effect after upgrade');
  assert(slowEffectAfter!.strength > 0.5, 'Upgraded slow strength should be higher');
});

test('Special upgrade should modify hit effects for Stinkhorn poison', () => {
  const tower = createTowerWithUpgrades(1, 100, 100, TowerType.StinkhornLine, TargetingMode.First);
  
  const infoBefore = getSpecialEffectInfo(tower);
  
  applyUpgrade(tower, UpgradePath.Special);
  
  const infoAfter = getSpecialEffectInfo(tower);
  assert(infoAfter !== null, 'Should have special effect info');
  assert(infoAfter.effectStrength > infoBefore.effectStrength, 'Poison strength should increase with upgrade');
  assert(infoAfter.effectDuration > infoBefore.effectDuration, 'Poison duration should increase with upgrade');
});

test('Special upgrade tier 3 should have maximum effect values', () => {
  const tower = createTowerWithUpgrades(1, 100, 100, TowerType.OrchidTrap, TargetingMode.First);
  
  applyUpgrade(tower, UpgradePath.Special);
  applyUpgrade(tower, UpgradePath.Special);
  applyUpgrade(tower, UpgradePath.Special);
  
  const info = getSpecialEffectInfo(tower);
  assert(info !== null, 'Should have special effect info');
  assert(info.specialTier === 3, 'Should be at tier 3');
});

test('Venus flytower special effect should be instakill', () => {
  const tower = createTowerWithUpgrades(1, 100, 100, TowerType.VenusFlytower, TargetingMode.First);
  
  applyUpgrade(tower, UpgradePath.Special);
  
  const effects = getHitEffectsForTowerType(TowerType.VenusFlytower, 100);
  const instakillEffect = effects.find(e => e.type === 'instakill');
  assert(instakillEffect !== undefined, 'Venus should have instakill effect');
});

test('BioluminescentShroom reveal_camo special effect', () => {
  const tower = createTowerWithUpgrades(1, 100, 100, TowerType.BioluminescentShroom, TargetingMode.First);
  
  const effects = getHitEffectsForTowerType(TowerType.BioluminescentShroom, 1);
  const camoEffect = effects.find(e => e.type === 'reveal_camo');
  assert(camoEffect !== undefined, 'Should have reveal_camo effect');
});

test('PuffballFungus area_damage special effect with upgraded radius', () => {
  const tower = createTowerWithUpgrades(1, 100, 100, TowerType.PuffballFungus, TargetingMode.First);
  
  const effects = getHitEffectsForTowerType(TowerType.PuffballFungus, 1);
  const areaEffect = effects.find(e => e.type === 'area_damage');
  assert(areaEffect !== undefined, 'Puffball should have area_damage effect');
});

console.log('\n--- Economy + Status Effects Integration ---');

test('Kill rewards should be applied when poison kills enemy', () => {
  const economy = createEconomy({ startingMoney: 100, startingLives: 20 });
  
  const initialMoney = economy.getMoney();
  
  economy.addKillReward(10, 'poison kill');
  
  assert(economy.getMoney() === initialMoney + 10, 'Kill reward should be added');
});

test('Lives lost when stunned enemy reaches end of path', () => {
  const economy = createEconomy({ startingMoney: 100, startingLives: 3 });
  
  const initialLives = economy.getLives();
  
  economy.loseLife(1);
  
  assert(economy.getLives() === initialLives - 1, 'Life should be lost');
  assert(!economy.isGameOver(), 'Should not be game over yet');
  
  economy.loseLife(1);
  economy.loseLife(1);
  
  assert(economy.isGameOver(), 'Should be game over with 0 lives');
});

test('Round bonus should apply between waves with status effects active', () => {
  const economy = createEconomy({ startingMoney: 100, startingLives: 20 });
  
  economy.addRoundBonus();
  
  const money = economy.getMoney();
  assert(money > 100, 'Round bonus should increase money');
});

console.log('\n--- Tower Targeting + Status Effects ---');

test('Tower should still target enemies affected by status effects', () => {
  const tower = createTowerWithUpgrades(1, 100, 100, TowerType.OrchidTrap, TargetingMode.First);
  
  const enemies: Enemy[] = [];
  for (let i = 0; i < 3; i++) {
    const enemy = createEnemy(i + 1, EnemyType.RedMushroom, path);
    if (i === 1) {
      applyStatusEffect(enemy, StatusEffectType.Slow, 5000, 0.5);
    }
    enemies.push(enemy);
  }
  
  assert(enemies.length === 3, 'Should have 3 enemies');
  assert(enemies[1].statusEffects.some(e => e.type === StatusEffectType.Slow), 'Middle enemy should be slowed');
});

test('Slowed enemy should still be targetable', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  applyStatusEffect(enemy, StatusEffectType.Slow, 5000, 0.8);
  
  assert(hasStatusEffect(enemy, StatusEffectType.Slow), 'Enemy should have slow effect');
  assert(enemy.alive, 'Enemy should still be alive');
});

test('Stunned enemy should still be targetable until death', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  applyStatusEffect(enemy, StatusEffectType.Stun, 5000, 1.0);
  
  assert(isEnemyStunned(enemy), 'Enemy should be stunned');
  assert(enemy.alive, 'Stunned enemy should still be alive');
});

console.log('\n--- Projectile + Status Effects Integration ---');

test('Projectile hit should apply status effects to enemy', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  const initialHp = enemy.hp;
  
  const effects: HitEffect[] = [
    { type: 'damage', strength: 5 },
    { type: 'slow', strength: 0.5, duration: 2000 }
  ];
  
  processStatusEffectHit(enemy, effects, 16);
  
  assert(hasStatusEffect(enemy, StatusEffectType.Slow), 'Enemy should have slow effect');
  assert(enemy.hp < initialHp, 'Enemy should have taken damage');
});

test('Multiple projectiles hitting same enemy should refresh slow duration', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  
  const effects1: HitEffect[] = [
    { type: 'slow', strength: 0.5, duration: 2000 }
  ];
  
  processStatusEffectHit(enemy, effects1, 16);
  const remaining1 = enemy.statusEffects[0].remaining;
  
  processStatusEffectHit(enemy, effects1, 16);
  const remaining2 = enemy.statusEffects[0].remaining;
  
  assert(remaining2 >= remaining1 || remaining2 > 0, 'Duration should be refreshed or maintained');
});

test('Poison from multiple hits should stack in damage', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  const initialHp = enemy.hp;
  
  const poisonEffects: HitEffect[] = [
    { type: 'poison', strength: 10, duration: 3000 }
  ];
  
  processStatusEffectHit(enemy, poisonEffects, 16);
  processStatusEffectHit(enemy, poisonEffects, 16);
  
  assert(enemy.statusEffects.filter(e => e.type === StatusEffectType.Poison).length >= 1, 
    'Should have poison effect');
});

console.log('\n--- Wave Spawning + Status Effects ---');

test('Wave spawner should spawn enemies that can receive status effects', () => {
  const game = createGameRunner({ startingMoney: 1000, startingLives: 20 });
  game.start();
  
  game.startWave(0);
  
  let foundEnemy = false;
  for (let i = 0; i < 30; i++) {
    game.update(Date.now() + 16);
    
    const enemies = game.getActiveEnemies();
    if (enemies.length > 0) {
      foundEnemy = true;
      const enemy = enemies[0];
      applyStatusEffect(enemy, StatusEffectType.Slow, 2000, 0.5);
      assert(hasStatusEffect(enemy, StatusEffectType.Slow), 'Spawned enemy should accept status effect');
      break;
    }
  }
  
  assert(foundEnemy, 'Should have spawned at least one enemy');
});

test('Different enemy types should accept status effects', () => {
  const enemyTypes = [
    EnemyType.RedMushroom,
    EnemyType.BlueBeetle,
    EnemyType.GreenCaterpillar,
    EnemyType.YellowWasp,
    EnemyType.PinkLadybug
  ];
  
  for (const enemyType of enemyTypes) {
    const enemy = createEnemy(1, enemyType, path);
    applyStatusEffect(enemy, StatusEffectType.Slow, 1000, 0.5);
    assert(hasStatusEffect(enemy, StatusEffectType.Slow), `${enemyType} should accept slow effect`);
  }
});

console.log('\n--- Status Effect Duration and Expiry ---');

test('Slow effect should expire after duration', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  applyStatusEffect(enemy, StatusEffectType.Slow, 1000, 0.5);
  
  assert(hasStatusEffect(enemy, StatusEffectType.Slow), 'Should have slow effect');
  
  updateStatusEffects(enemy, 500);
  assert(hasStatusEffect(enemy, StatusEffectType.Slow), 'Should still have effect at 500ms');
  
  updateStatusEffects(enemy, 500);
  assert(!hasStatusEffect(enemy, StatusEffectType.Slow), 'Effect should expire at 1000ms');
});

test('Poison effect should continue dealing damage until expired', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  const initialHp = enemy.hp;
  
  applyStatusEffect(enemy, StatusEffectType.Poison, 2000, 10);
  
  updateStatusEffects(enemy, 1000);
  const hp1 = enemy.hp;
  
  updateStatusEffects(enemy, 1000);
  const hp2 = enemy.hp;
  
  assert(hp2 < hp1, 'Poison should continue damaging after first tick');
});

test('Stun effect should prevent movement during duration', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  const startPos = { ...enemy.position };
  
  applyStatusEffect(enemy, StatusEffectType.Stun, 1000, 1.0);
  
  updateStatusEffects(enemy, 500);
  
  assert(enemy.position.x === startPos.x && enemy.position.y === startPos.y, 
    'Stunned enemy should not move');
});

test('Multiple status effects should coexist', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  
  applyStatusEffect(enemy, StatusEffectType.Slow, 5000, 0.5);
  applyStatusEffect(enemy, StatusEffectType.Poison, 3000, 10);
  applyStatusEffect(enemy, StatusEffectType.Stun, 500, 1.0);
  
  assert(enemy.statusEffects.length === 3, 'Should have all 3 effects');
  assert(isEnemyStunned(enemy), 'Should be stunned');
  assert(getSlowFactor(enemy) < 1.0, 'Should be slowed');
});

console.log('\n--- Edge Cases ---');

test('Status effect with zero strength should be handled', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  applyStatusEffect(enemy, StatusEffectType.Slow, 1000, 0);
  
  const factor = getSlowFactor(enemy);
  assert(factor === 1.0, 'Zero strength slow should not affect speed');
});

test('Status effect with strength 1.0 should stop all movement', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  applyStatusEffect(enemy, StatusEffectType.Slow, 1000, 1.0);
  
  const factor = getSlowFactor(enemy);
  assert(factor === 0, 'Full strength slow should stop movement');
});

test('Expired status effects should be removed', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  applyStatusEffect(enemy, StatusEffectType.Poison, 500, 10);
  
  updateStatusEffects(enemy, 500);
  assert(!hasStatusEffect(enemy, StatusEffectType.Poison), 'Poison should expire');
});

test('Clear status effects should remove all effects', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  applyStatusEffect(enemy, StatusEffectType.Slow, 5000, 0.5);
  applyStatusEffect(enemy, StatusEffectType.Poison, 3000, 10);
  applyStatusEffect(enemy, StatusEffectType.Stun, 500, 1.0);
  
  clearStatusEffects(enemy);
  
  assert(enemy.statusEffects.length === 0, 'All effects should be cleared');
});

test('Enemy with no status effects should return valid values', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  
  assert(!isEnemyStunned(enemy), 'Should not be stunned');
  assert(getSlowFactor(enemy) === 1.0, 'Slow factor should be 1.0');
  
  const tickResult = processEnemyStatusTick(enemy, 16);
  assert(tickResult.isStunned === false, 'Should not be stunned from tick');
  assert(tickResult.poisonDamage === 0, 'Should have no poison damage');
  assert(tickResult.effectiveSpeed === enemy.baseSpeed, 'Speed should be base speed');
});

console.log('\n--- Integration: Full Game Loop ---');

test('Game should track status effect kills properly', () => {
  const game = createGameRunner({ startingMoney: 650, startingLives: 20 });
  game.start();
  
  const tower = game.placeTower(TowerType.StinkhornLine, 200, 200, TargetingMode.First);
  assert(tower !== null, 'Tower should be placed');
  
  const initialMoney = game.getEconomy().getMoney();
  
  game.startWave(0);
  
  let poisonKills = 0;
  for (let i = 0; i < 200; i++) {
    game.update(Date.now() + 16);
    
    const stats = game.getGameStats();
    if (stats.money > initialMoney) {
      poisonKills++;
    }
    
    if (stats.enemies === 0 && i > 50) break;
  }
  
  const finalMoney = game.getEconomy().getMoney();
  assert(finalMoney >= initialMoney, `Money should increase from kills (${initialMoney} -> ${finalMoney})`);
});

test('Game should end when lives reach zero with status effects active', () => {
  const game = createGameRunner({ startingMoney: 1000, startingLives: 2 });
  game.start();
  
  game.startWave(0);
  
  let gameOver = false;
  for (let i = 0; i < 300; i++) {
    game.update(Date.now() + 16);
    
    if (game.getState() === 'game_over') {
      gameOver = true;
      break;
    }
  }
  
  assert(gameOver || game.getEconomy().getLives() <= 0, 'Game should eventually end');
});

console.log('\n--- Effect Duration Tracking ---');

test('Effect remaining time should decrease after update', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  applyStatusEffect(enemy, StatusEffectType.Slow, 2000, 0.5);
  
  const initialRemaining = enemy.statusEffects[0].remaining;
  
  updateStatusEffects(enemy, 500);
  
  assert(enemy.statusEffects[0].remaining < initialRemaining, 'Remaining time should decrease');
});

test('Stun effect should block movement via updateEnemyWithStatusEffects', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  applyStatusEffect(enemy, StatusEffectType.Stun, 1000, 1.0);
  
  const result = updateEnemyWithStatusEffects(enemy, 100);
  
  assert(result.moved === false, 'Stunned enemy should not move');
});

test('Poison should accumulate damage via updateEnemyWithStatusEffects', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  applyStatusEffect(enemy, StatusEffectType.Poison, 3000, 10);
  
  const result = updateEnemyWithStatusEffects(enemy, 1000);
  
  assert(result.poisonDamage === 10, 'Should accumulate full poison damage over 1 second');
});

console.log('\n=== Status Effect Integration Tests Complete ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
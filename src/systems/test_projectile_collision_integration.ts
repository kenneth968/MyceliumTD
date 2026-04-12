import { Path, createDefaultPath } from './path';
import { Enemy, StatusEffectType, createEnemy, applyStatusEffect, updateStatusEffects, hasStatusEffect } from '../entities/enemy';
import { Projectile, TowerType, TOWER_STATS, updateProjectile, fireTowerWithProjectile, createTower, applyDamage } from '../entities/tower';
import { detectCollision, resolveHit, getHitEffectsForTowerType, applyHitEffects, calculateAreaDamage, processProjectileCollision, updateProjectileCollision, isProjectileInBounds, getProjectilesNeedingCleanup, CollisionResult, AreaDamageResult, HitEffect } from './collision';
import { GameRunner, createGameRunner } from './gameRunner';
import { TowerWithUpgrades, createTowerWithUpgrades, applyUpgrade, UpgradePath, getSpecialEffectInfo } from './upgrade';
import { GameEconomy, createEconomy } from './economy';
import { TargetingMode } from './targeting';
import { EnemyType } from './wave';
import { Vec2 } from '../utils/vec2';

const path = createDefaultPath();

console.log('=== Projectile Collision Integration Tests ===\n');

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

console.log('--- Basic Collision Detection Tests ---');

test('detectCollision should find enemy within range', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  enemy.position = { x: 100, y: 100 };
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 105, y: 105 },
    targetId: 1,
    speed: 200,
    damage: 10,
    towerType: TowerType.PuffballFungus,
    alive: true,
  };
  
  const result = detectCollision(projectile, [enemy]);
  assert(result !== null, 'Should detect collision with nearby enemy');
  assert(result!.id === enemy.id, 'Should return correct enemy');
});

test('detectCollision should not find enemy out of range', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  enemy.position = { x: 100, y: 100 };
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 200, y: 200 },
    targetId: 1,
    speed: 200,
    damage: 10,
    towerType: TowerType.PuffballFungus,
    alive: true,
  };
  
  const result = detectCollision(projectile, [enemy]);
  assert(result === null, 'Should not detect collision with distant enemy');
});

test('detectCollision should skip dead enemies', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  enemy.position = { x: 100, y: 100 };
  enemy.alive = false;
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 10,
    towerType: TowerType.PuffballFungus,
    alive: true,
  };
  
  const result = detectCollision(projectile, [enemy]);
  assert(result === null, 'Should not detect collision with dead enemy');
});

console.log('\n--- Hit Resolution Tests ---');

test('resolveHit should return damage and effects for Orchid slow', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  const initialHp = enemy.hp;
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 5,
    towerType: TowerType.OrchidTrap,
    alive: true,
    effectStrength: 0.5,
    effectDuration: 2000,
  };
  
  const result = resolveHit(projectile, enemy, 16);
  
  assert(result.hit === true, 'Should register as hit');
  assert(result.damage === 5, 'Should deal correct damage');
  assert(result.effects.some(e => e.type === 'slow'), 'Should have slow effect');
  assert(result.effects.some(e => e.type === 'damage'), 'Should have damage effect');
});

test('resolveHit should return damage and effects for Stinkhorn poison', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 3,
    towerType: TowerType.StinkhornLine,
    alive: true,
    effectStrength: 10,
    effectDuration: 3000,
  };
  
  const result = resolveHit(projectile, enemy, 16);
  
  assert(result.hit === true, 'Should register as hit');
  assert(result.effects.some(e => e.type === 'poison'), 'Should have poison effect');
});

test('resolveHit should stack poison damage for Stinkhorn', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  const initialHp = enemy.hp;
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 3,
    towerType: TowerType.StinkhornLine,
    alive: true,
    effectStrength: 5,
    effectDuration: 2000,
  };
  
  applyStatusEffect(enemy, StatusEffectType.Poison, 3000, 10);
  
  const result = resolveHit(projectile, enemy, 16);
  
  assert(result.damage > projectile.damage, 'Stinkhorn hit on poisoned enemy should return stacked damage');
});

test('resolveHit should return instakill effect for Venus', () => {
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 100,
    towerType: TowerType.VenusFlytower,
    alive: true,
  };
  
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  
  const result = resolveHit(projectile, enemy, 16);
  
  assert(result.effects.some(e => e.type === 'instakill'), 'Should have instakill effect');
});

test('resolveHit should return reveal_camo effect for Bioluminescent', () => {
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 1,
    towerType: TowerType.BioluminescentShroom,
    alive: true,
    effectStrength: 0.8,
    effectDuration: 5000,
  };
  
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  
  const result = resolveHit(projectile, enemy, 16);
  
  assert(result.effects.some(e => e.type === 'reveal_camo'), 'Should have reveal_camo effect');
});

console.log('\n--- Area Damage Tests ---');

test('calculateAreaDamage should hit enemies within radius', () => {
  const enemy1 = createEnemy(1, EnemyType.RedMushroom, path);
  enemy1.position = { x: 100, y: 100 };
  
  const enemy2 = createEnemy(2, EnemyType.BlueBeetle, path);
  enemy2.position = { x: 110, y: 110 };
  
  const enemy3 = createEnemy(3, EnemyType.GreenCaterpillar, path);
  enemy3.position = { x: 200, y: 200 };
  
  const result = calculateAreaDamage({ x: 100, y: 100 }, [enemy1, enemy2, enemy3], 50, 40);
  
  assert(result.enemiesHit.length === 2, 'Should hit 2 enemies within radius');
  assert(result.totalDamage > 0, 'Should deal area damage');
});

test('calculateAreaDamage should apply falloff to distant enemies', () => {
  const enemy1 = createEnemy(1, EnemyType.RedMushroom, path);
  enemy1.position = { x: 100, y: 100 };
  
  const enemy2 = createEnemy(2, EnemyType.BlueBeetle, path);
  enemy2.position = { x: 130, y: 130 };
  
  const result1 = calculateAreaDamage({ x: 100, y: 100 }, [enemy1], 50, 40);
  const result2 = calculateAreaDamage({ x: 100, y: 100 }, [enemy2], 50, 40);
  
  assert(result1.totalDamage > result2.totalDamage, 'Closer enemy should take more damage');
});

test('calculateAreaDamage should skip dead enemies', () => {
  const enemy1 = createEnemy(1, EnemyType.RedMushroom, path);
  enemy1.position = { x: 100, y: 100 };
  enemy1.alive = false;
  
  const enemy2 = createEnemy(2, EnemyType.BlueBeetle, path);
  enemy2.position = { x: 110, y: 110 };
  
  const result = calculateAreaDamage({ x: 100, y: 100 }, [enemy1, enemy2], 50, 40);
  
  assert(result.enemiesHit.length === 1, 'Should only hit alive enemy');
});

console.log('\n--- Hit Effects Application Tests ---');

test('applyHitEffects should apply slow effect to enemy', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  
  const effects: HitEffect[] = [
    { type: 'damage', strength: 5 },
    { type: 'slow', strength: 0.5, duration: 2000 },
  ];
  
  applyHitEffects(enemy, effects, 16);
  
  assert(hasStatusEffect(enemy, StatusEffectType.Slow), 'Enemy should have slow effect');
});

test('applyHitEffects should apply poison effect to enemy', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  const initialHp = enemy.hp;
  
  const effects: HitEffect[] = [
    { type: 'damage', strength: 2 },
    { type: 'poison', strength: 10, duration: 3000 },
  ];
  
  applyHitEffects(enemy, effects, 16);
  
  assert(hasStatusEffect(enemy, StatusEffectType.Poison), 'Enemy should have poison effect');
});

test('applyHitEffects should apply stun effect to enemy', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  
  const effects: HitEffect[] = [
    { type: 'stun', strength: 1.0, duration: 500 },
  ];
  
  applyHitEffects(enemy, effects, 16);
  
  assert(hasStatusEffect(enemy, StatusEffectType.Stun), 'Enemy should have stun effect');
});

test('applyHitEffects should handle area_damage effect', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  
  const effects: HitEffect[] = [
    { type: 'area_damage', strength: 20 },
  ];
  
  applyHitEffects(enemy, effects, 16);
  
  assert(enemy.statusEffects.length === 0, 'area_damage should not add status effect');
});

console.log('\n--- Projectile Update Tests ---');

test('updateProjectile should hit target when close enough', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  enemy.position = { x: 100, y: 100 };
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 97, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 5,
    towerType: TowerType.OrchidTrap,
    alive: true,
  };
  
  const result = updateProjectile(projectile, [enemy], 16);
  
  assert(result.hit === true, 'Should register hit');
  assert(result.target !== null, 'Should have target');
  assert(projectile.alive === false, 'Projectile should be dead after hit');
});

test('updateProjectile should move toward target', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  enemy.position = { x: 200, y: 200 };
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 1000,
    damage: 5,
    towerType: TowerType.OrchidTrap,
    alive: true,
  };
  
  const initialPos = { ...projectile.position };
  
  updateProjectile(projectile, [enemy], 16);
  
  assert(projectile.position.x !== initialPos.x || projectile.position.y !== initialPos.y,
    'Projectile should move');
  assert(projectile.alive === true, 'Projectile should still be alive');
});

test('updateProjectile should die if target is dead', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  enemy.alive = false;
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 5,
    towerType: TowerType.OrchidTrap,
    alive: true,
  };
  
  const result = updateProjectile(projectile, [enemy], 16);
  
  assert(result.hit === false, 'Should not hit');
  assert(projectile.alive === false, 'Projectile should be dead');
});

test('updateProjectile should reach and hit stationary target', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  enemy.position = { x: 150, y: 150 };
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 500,
    damage: 10,
    towerType: TowerType.StinkhornLine,
    alive: true,
  };
  
  let hit = false;
  for (let i = 0; i < 20; i++) {
    const result = updateProjectile(projectile, [enemy], 16);
    if (result.hit) {
      hit = true;
      break;
    }
  }
  
  assert(hit === true, 'Projectile should eventually hit target');
  assert(projectile.alive === false, 'Projectile should be dead after hit');
});

console.log('\n--- Process Projectile Collision Tests ---');

test('processProjectileCollision should detect collision and resolve hit', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  enemy.position = { x: 100, y: 100 };
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 5,
    towerType: TowerType.OrchidTrap,
    alive: true,
  };
  
  const result = processProjectileCollision(projectile, [enemy], 16);
  
  assert(result.collision.hit === true, 'Should register hit');
  assert(result.collision.target !== null, 'Should have target');
});

test('processProjectileCollision should calculate area damage for Puffball', () => {
  const enemy1 = createEnemy(1, EnemyType.RedMushroom, path);
  enemy1.position = { x: 100, y: 100 };
  
  const enemy2 = createEnemy(2, EnemyType.BlueBeetle, path);
  enemy2.position = { x: 110, y: 110 };
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 10,
    towerType: TowerType.PuffballFungus,
    alive: true,
    areaRadius: 40,
  };
  
  const result = processProjectileCollision(projectile, [enemy1, enemy2], 16);
  
  assert(result.collision.hit === true, 'Should register hit');
  assert(result.areaDamage !== undefined, 'Should have area damage result');
  assert(result.areaDamage!.enemiesHit.length >= 1, 'Area damage should hit at least one enemy');
});

test('processProjectileCollision should return no hit when no collision', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  enemy.position = { x: 200, y: 200 };
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 5,
    towerType: TowerType.OrchidTrap,
    alive: true,
  };
  
  const result = processProjectileCollision(projectile, [enemy], 16);
  
  assert(result.collision.hit === false, 'Should not register hit');
});

console.log('\n--- Projectile Bounds and Cleanup Tests ---');

test('isProjectileInBounds should detect in-bounds projectile', () => {
  const projectile: Projectile = {
    id: 1,
    position: { x: 500, y: 500 },
    targetId: 1,
    speed: 200,
    damage: 5,
    towerType: TowerType.OrchidTrap,
    alive: true,
  };
  
  const bounds = { minX: 0, maxX: 1000, minY: 0, maxY: 1000 };
  
  assert(isProjectileInBounds(projectile, bounds) === true, 'Projectile should be in bounds');
});

test('isProjectileInBounds should detect out-of-bounds projectile', () => {
  const projectile: Projectile = {
    id: 1,
    position: { x: 1500, y: 1500 },
    targetId: 1,
    speed: 200,
    damage: 5,
    towerType: TowerType.OrchidTrap,
    alive: true,
  };
  
  const bounds = { minX: 0, maxX: 1000, minY: 0, maxY: 1000 };
  
  assert(isProjectileInBounds(projectile, bounds) === false, 'Projectile should be out of bounds');
});

test('getProjectilesNeedingCleanup should return dead projectiles', () => {
  const projectile1: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 5,
    towerType: TowerType.OrchidTrap,
    alive: true,
  };
  
  const projectile2: Projectile = {
    id: 2,
    position: { x: 200, y: 200 },
    targetId: 2,
    speed: 200,
    damage: 5,
    towerType: TowerType.OrchidTrap,
    alive: false,
  };
  
  const projectiles = [projectile1, projectile2];
  
  const cleanup = getProjectilesNeedingCleanup(projectiles);
  
  assert(cleanup.length === 1, 'Should return 1 dead projectile');
  assert(cleanup[0].id === 2, 'Should return correct dead projectile');
});

console.log('\n--- GameRunner + Projectile Collision Integration ---');

test('GameRunner should spawn projectiles from towers', () => {
  const game = createGameRunner({ startingMoney: 1000, startingLives: 20 });
  game.start();
  
  const tower = game.placeTower(TowerType.OrchidTrap, 200, 200, TargetingMode.First);
  assert(tower !== null, 'Tower should be placed');
  
  game.startWave(0);
  
  let foundProjectile = false;
  for (let i = 0; i < 200; i++) {
    game.update(Date.now() + 16);
    
    const projectiles = game.getActiveProjectiles();
    if (projectiles.length > 0) {
      foundProjectile = true;
      break;
    }
    
    if (game.getGameStats().enemies === 0 && i > 50) break;
  }
  
  assert(foundProjectile, 'Should have spawned at least one projectile');
});

test('GameRunner projectiles should hit enemies and apply effects', () => {
  const game = createGameRunner({ startingMoney: 1000, startingLives: 20 });
  game.start();
  
  const tower = game.placeTower(TowerType.OrchidTrap, 200, 200, TargetingMode.First);
  assert(tower !== null, 'Tower should be placed');
  
  game.startWave(0);
  
  let enemyWithSlow: Enemy | null = null;
  for (let i = 0; i < 300; i++) {
    game.update(Date.now() + 16);
    
    const enemies = game.getActiveEnemies();
    for (const enemy of enemies) {
      if (hasStatusEffect(enemy, StatusEffectType.Slow)) {
        enemyWithSlow = enemy;
        break;
      }
    }
    
    if (enemyWithSlow) break;
    if (game.getGameStats().enemies === 0 && i > 50) break;
  }
  
  assert(enemyWithSlow !== null, 'Should have hit enemy with slow effect');
});

test('GameRunner Puffball projectiles should deal area damage', () => {
  const game = createGameRunner({ startingMoney: 1000, startingLives: 20 });
  game.start();
  
  const tower = game.placeTower(TowerType.PuffballFungus, 200, 200, TargetingMode.First);
  assert(tower !== null, 'Tower should be placed');
  
  const initialMoney = game.getEconomy().getMoney();
  
  game.startWave(0);
  
  let kills = 0;
  for (let i = 0; i < 200; i++) {
    game.update(Date.now() + 16);
    
    const stats = game.getGameStats();
    if (stats.money > initialMoney) {
      kills++;
    }
    
    if (stats.enemies === 0 && i > 50) break;
  }
  
  assert(kills > 0, 'Should have killed enemies with area damage');
});

test('GameRunner Stinkhorn projectiles should poison enemies', () => {
  const game = createGameRunner({ startingMoney: 1000, startingLives: 20 });
  game.start();
  
  const tower = game.placeTower(TowerType.StinkhornLine, 200, 200, TargetingMode.First);
  assert(tower !== null, 'Tower should be placed');
  
  game.startWave(0);
  
  let enemyWithPoison: Enemy | null = null;
  for (let i = 0; i < 300; i++) {
    game.update(Date.now() + 16);
    
    const enemies = game.getActiveEnemies();
    for (const enemy of enemies) {
      if (hasStatusEffect(enemy, StatusEffectType.Poison)) {
        enemyWithPoison = enemy;
        break;
      }
    }
    
    if (enemyWithPoison) break;
    if (game.getGameStats().enemies === 0 && i > 50) break;
  }
  
  assert(enemyWithPoison !== null, 'Should have poisoned enemy');
});

console.log('\n--- Tower Special Effects with Upgraded Values ---');

test('Upgraded Orchid should apply stronger slow', () => {
  const tower = createTowerWithUpgrades(1, 100, 100, TowerType.OrchidTrap, TargetingMode.First);
  
  applyUpgrade(tower, UpgradePath.Special);
  
  const info = getSpecialEffectInfo(tower);
  assert(info !== null, 'Should have special effect info');
  
  const effects = getHitEffectsForTowerType(TowerType.OrchidTrap, 2, info.effectStrength, info.effectDuration);
  const slowEffect = effects.find(e => e.type === 'slow');
  
  assert(slowEffect !== undefined, 'Should have slow effect');
  assert(slowEffect!.strength > 0.5, 'Upgraded slow should be stronger than default 0.5');
});

test('Upgraded Stinkhorn should apply stronger poison', () => {
  const tower = createTowerWithUpgrades(1, 100, 100, TowerType.StinkhornLine, TargetingMode.First);
  
  applyUpgrade(tower, UpgradePath.Special);
  
  const info = getSpecialEffectInfo(tower);
  assert(info !== null, 'Should have special effect info');
  
  const effects = getHitEffectsForTowerType(TowerType.StinkhornLine, 3, info.effectStrength, info.effectDuration);
  const poisonEffect = effects.find(e => e.type === 'poison');
  
  assert(poisonEffect !== undefined, 'Should have poison effect');
});

test('Upgraded Puffball should have larger area radius', () => {
  const tower = createTowerWithUpgrades(1, 100, 100, TowerType.PuffballFungus, TargetingMode.First);
  
  applyUpgrade(tower, UpgradePath.Special);
  
  const info = getSpecialEffectInfo(tower);
  assert(info !== null, 'Should have special effect info');
  assert(info.areaRadius !== undefined, 'Should have area radius');
  assert(info.areaRadius! > 40, 'Upgraded area radius should be larger than default 40');
});

test('Upgraded Venus should have stronger instakill', () => {
  const tower = createTowerWithUpgrades(1, 100, 100, TowerType.VenusFlytower, TargetingMode.First);
  
  applyUpgrade(tower, UpgradePath.Special);
  
  const info = getSpecialEffectInfo(tower);
  assert(info !== null, 'Should have special effect info');
  
  const effects = getHitEffectsForTowerType(TowerType.VenusFlytower, 100, info.effectStrength);
  const instakillEffect = effects.find(e => e.type === 'instakill');
  
  assert(instakillEffect !== undefined, 'Should have instakill effect');
});

test('Upgraded Bioluminescent should have longer reveal duration', () => {
  const tower = createTowerWithUpgrades(1, 100, 100, TowerType.BioluminescentShroom, TargetingMode.First);
  
  applyUpgrade(tower, UpgradePath.Special);
  
  const info = getSpecialEffectInfo(tower);
  assert(info !== null, 'Should have special effect info');
  
  const effects = getHitEffectsForTowerType(TowerType.BioluminescentShroom, 1, info.effectStrength, info.effectDuration);
  const revealEffect = effects.find(e => e.type === 'reveal_camo');
  
  assert(revealEffect !== undefined, 'Should have reveal_camo effect');
  assert((revealEffect!.duration || 0) > 500, 'Upgraded reveal duration should be longer than base 500');
});

console.log('\n--- Projectile Collision Edge Cases ---');

test('Dead projectile should not collide', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  enemy.position = { x: 100, y: 100 };
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 5,
    towerType: TowerType.OrchidTrap,
    alive: false,
  };
  
  const result = detectCollision(projectile, [enemy]);
  assert(result === null, 'Dead projectile should not collide');
});

test('Projectile with zero speed should still hit close target', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  enemy.position = { x: 102, y: 100 };
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 0,
    damage: 5,
    towerType: TowerType.VenusFlytower,
    alive: true,
  };
  
  const result = updateProjectile(projectile, [enemy], 16);
  
  assert(result.hit === true, 'Zero speed projectile should still hit close target');
});

test('Multiple enemies - projectile should only hit its target', () => {
  const enemy1 = createEnemy(1, EnemyType.RedMushroom, path);
  enemy1.position = { x: 100, y: 100 };
  
  const enemy2 = createEnemy(2, EnemyType.BlueBeetle, path);
  enemy2.position = { x: 110, y: 110 };
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 90, y: 100 },
    targetId: 1,
    speed: 500,
    damage: 10,
    towerType: TowerType.StinkhornLine,
    alive: true,
  };
  
  let hitTargetId: number | null = null;
  for (let i = 0; i < 20; i++) {
    const result = updateProjectile(projectile, [enemy1, enemy2], 16);
    if (result.hit && result.target) {
      hitTargetId = (result.target as any).id;
      break;
    }
  }
  
  assert(hitTargetId !== null, 'Should have hit target');
  assert(hitTargetId === 1, 'Should only hit intended target');
});

test('Enemy moving away from projectile should still be hit', () => {
  const enemy = createEnemy(1, EnemyType.RedMushroom, path);
  enemy.position = { x: 200, y: 200 };
  enemy.baseSpeed = 500;
  enemy.speed = 500;
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 300,
    damage: 10,
    towerType: TowerType.OrchidTrap,
    alive: true,
  };
  
  let hit = false;
  for (let i = 0; i < 50; i++) {
    const result = updateProjectile(projectile, [enemy], 16);
    if (result.hit) {
      hit = true;
      break;
    }
  }
  
  assert(hit === true, 'Should hit moving enemy eventually');
});

console.log('\n=== Projectile Collision Integration Tests Complete ===');
console.log(`Passed: ${passed}, Failed: ${failed}`);

if (failed > 0) {
  process.exit(1);
}
import { Path, createDefaultPath } from './path';
import { Enemy, EnemyTrait, StatusEffectType, createEnemy, applyStatusEffect, updateStatusEffects, hasStatusEffect } from '../entities/enemy';
import { Projectile, TowerType, TOWER_STATS, updateProjectile, fireTowerWithProjectile, createTower, applyDamage } from '../entities/tower';
import { detectCollision, resolveHit, getHitEffectsForTowerType, applyHitEffects, calculateAreaDamage, processProjectileCollision, updateProjectileCollision, isProjectileInBounds, getProjectilesNeedingCleanup, CollisionResult, AreaDamageResult, HitEffect } from './collision';
import { GameRunner, createGameRunner } from './gameRunner';
import { TowerWithGrowth, createTowerWithGrowth, evolveTower, getSpecialEffectInfo, matureTower } from './upgrade';
import { EvolutionPath } from '../content/evolutionDefinitions';
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

function assert(condition: boolean, message: string): asserts condition {
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
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  enemy.position = { x: 100, y: 100 };
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 105, y: 105 },
    targetId: 1,
    speed: 200,
    damage: 10,
    towerType: TowerType.Puffball,
    alive: true,
  };
  
  const result = detectCollision(projectile, [enemy]);
  assert(result !== null, 'Should detect collision with nearby enemy');
  assert(result!.id === enemy.id, 'Should return correct enemy');
});

test('detectCollision should not find enemy out of range', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  enemy.position = { x: 100, y: 100 };
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 200, y: 200 },
    targetId: 1,
    speed: 200,
    damage: 10,
    towerType: TowerType.Puffball,
    alive: true,
  };
  
  const result = detectCollision(projectile, [enemy]);
  assert(result === null, 'Should not detect collision with distant enemy');
});

test('detectCollision should skip dead enemies', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  enemy.position = { x: 100, y: 100 };
  enemy.alive = false;
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 10,
    towerType: TowerType.Puffball,
    alive: true,
  };
  
  const result = detectCollision(projectile, [enemy]);
  assert(result === null, 'Should not detect collision with dead enemy');
});

console.log('\n--- Hit Resolution Tests ---');

test('resolveHit should return damage and effects for Orchid slow', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  const initialHp = enemy.hp;
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 5,
    towerType: TowerType.Slimefungus,
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

test('resolveHit should return area damage effects for Bulb Shooter', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 3,
    towerType: TowerType.BulbShooter,
    alive: true,
    effectStrength: 10,
    effectDuration: 3000,
  };
  
  const result = resolveHit(projectile, enemy, 16);
  
  assert(result.hit === true, 'Should register as hit');
  assert(result.effects.some(e => e.type === 'area_damage'), 'Should have area damage effect');
});

test('resolveHit should stack poison damage for Stinkhorn', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  const initialHp = enemy.hp;
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 3,
    towerType: TowerType.BulbShooter,
    alive: true,
    effectStrength: 5,
    effectDuration: 2000,
  };
  
  applyStatusEffect(enemy, StatusEffectType.Poison, 3000, 10);
  
  const result = resolveHit(projectile, enemy, 16);
  
  assert(result.damage > projectile.damage, 'Stinkhorn hit on poisoned enemy should return stacked damage');
});

test('resolveHit should return direct damage for Thorn Sniper', () => {
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 100,
    towerType: TowerType.ThornSniper,
    alive: true,
  };
  
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  
  const result = resolveHit(projectile, enemy, 16);
  
  assert(result.effects.some(e => e.type === 'damage'), 'Should have damage effect');
});

test('resolveHit should not reveal Camo for an ordinary Lumen projectile', () => {
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 1,
    towerType: TowerType.LumenOracle,
    alive: true,
    effectStrength: 0.8,
    effectDuration: 5000,
  };
  
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  
  const result = resolveHit(projectile, enemy, 16);
  
  assert(!result.effects.some(e => e.type === 'reveal_camo'), 'Ordinary Lumen hits should leave reveal to evolution-aware callers');
});

console.log('\n--- Area Damage Tests ---');

test('calculateAreaDamage should hit enemies within radius', () => {
  const enemy1 = createEnemy(1, EnemyType.ScoutBeetle, path);
  enemy1.position = { x: 100, y: 100 };
  
  const enemy2 = createEnemy(2, EnemyType.DartWasp, path);
  enemy2.position = { x: 110, y: 110 };
  
  const enemy3 = createEnemy(3, EnemyType.ShellBeetle, path);
  enemy3.position = { x: 200, y: 200 };
  
  const result = calculateAreaDamage({ x: 100, y: 100 }, [enemy1, enemy2, enemy3], 50, 40);
  
  assert(result.enemiesHit.length === 2, 'Should hit 2 enemies within radius');
  assert(result.totalDamage > 0, 'Should deal area damage');
});

test('calculateAreaDamage should apply falloff to distant enemies', () => {
  const enemy1 = createEnemy(1, EnemyType.ScoutBeetle, path);
  enemy1.position = { x: 100, y: 100 };
  
  const enemy2 = createEnemy(2, EnemyType.DartWasp, path);
  enemy2.position = { x: 130, y: 130 };
  
  const result1 = calculateAreaDamage({ x: 100, y: 100 }, [enemy1], 50, 40);
  const result2 = calculateAreaDamage({ x: 100, y: 100 }, [enemy2], 50, 40);
  
  assert(result1.totalDamage > result2.totalDamage, 'Closer enemy should take more damage');
});

test('calculateAreaDamage should skip dead enemies', () => {
  const enemy1 = createEnemy(1, EnemyType.ScoutBeetle, path);
  enemy1.position = { x: 100, y: 100 };
  enemy1.alive = false;
  
  const enemy2 = createEnemy(2, EnemyType.DartWasp, path);
  enemy2.position = { x: 110, y: 110 };
  
  const result = calculateAreaDamage({ x: 100, y: 100 }, [enemy1, enemy2], 50, 40);
  
  assert(result.enemiesHit.length === 1, 'Should only hit alive enemy');
});

console.log('\n--- Hit Effects Application Tests ---');

test('applyHitEffects should apply slow effect to enemy', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  
  const effects: HitEffect[] = [
    { type: 'damage', strength: 5 },
    { type: 'slow', strength: 0.5, duration: 2000 },
  ];
  
  applyHitEffects(enemy, effects, 16);
  
  assert(hasStatusEffect(enemy, StatusEffectType.Slow), 'Enemy should have slow effect');
});

test('applyHitEffects should apply poison effect to enemy', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  const initialHp = enemy.hp;
  
  const effects: HitEffect[] = [
    { type: 'damage', strength: 2 },
    { type: 'poison', strength: 10, duration: 3000 },
  ];
  
  applyHitEffects(enemy, effects, 16);
  
  assert(hasStatusEffect(enemy, StatusEffectType.Poison), 'Enemy should have poison effect');
});

test('applyHitEffects should apply stun effect to enemy', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  
  const effects: HitEffect[] = [
    { type: 'stun', strength: 1.0, duration: 500 },
  ];
  
  applyHitEffects(enemy, effects, 16);
  
  assert(hasStatusEffect(enemy, StatusEffectType.Stun), 'Enemy should have stun effect');
});

test('applyHitEffects should handle area_damage effect', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  
  const effects: HitEffect[] = [
    { type: 'area_damage', strength: 20 },
  ];
  
  applyHitEffects(enemy, effects, 16);
  
  assert(enemy.statusEffects.length === 0, 'area_damage should not add status effect');
});

console.log('\n--- Projectile Update Tests ---');

test('updateProjectile should hit target when close enough', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  enemy.position = { x: 100, y: 100 };
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 97, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 5,
    towerType: TowerType.Slimefungus,
    alive: true,
  };
  
  const result = updateProjectile(projectile, [enemy], 16);
  
  assert(result.hit === true, 'Should register hit');
  assert(result.target !== null, 'Should have target');
  assert(projectile.alive === false, 'Projectile should be dead after hit');
});

test('updateProjectile should move toward target', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  enemy.position = { x: 200, y: 200 };
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 1000,
    damage: 5,
    towerType: TowerType.Slimefungus,
    alive: true,
  };
  
  const initialPos = { ...projectile.position };
  
  updateProjectile(projectile, [enemy], 16);
  
  assert(projectile.position.x !== initialPos.x || projectile.position.y !== initialPos.y,
    'Projectile should move');
  assert(projectile.alive === true, 'Projectile should still be alive');
});

test('updateProjectile should die if target is dead', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  enemy.alive = false;
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 5,
    towerType: TowerType.Slimefungus,
    alive: true,
  };
  
  const result = updateProjectile(projectile, [enemy], 16);
  
  assert(result.hit === false, 'Should not hit');
  assert(projectile.alive === false, 'Projectile should be dead');
});

test('updateProjectile should reach and hit stationary target', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  enemy.position = { x: 150, y: 150 };
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 500,
    damage: 10,
    towerType: TowerType.BulbShooter,
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
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  enemy.position = { x: 100, y: 100 };
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 5,
    towerType: TowerType.Slimefungus,
    alive: true,
  };
  
  const result = processProjectileCollision(projectile, [enemy], 16);
  
  assert(result.collision.hit === true, 'Should register hit');
  assert(result.collision.target !== null, 'Should have target');
});

test('processProjectileCollision should calculate area damage for Puffball', () => {
  const enemy1 = createEnemy(1, EnemyType.ScoutBeetle, path);
  enemy1.position = { x: 100, y: 100 };
  
  const enemy2 = createEnemy(2, EnemyType.DartWasp, path);
  enemy2.position = { x: 110, y: 110 };
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 10,
    towerType: TowerType.Puffball,
    alive: true,
    areaRadius: 40,
  };
  
  const result = processProjectileCollision(projectile, [enemy1, enemy2], 16);
  
  assert(result.collision.hit === true, 'Should register hit');
  assert(result.areaDamage !== undefined, 'Should have area damage result');
  assert(result.areaDamage!.enemiesHit.length >= 1, 'Area damage should hit at least one enemy');
});

test('processProjectileCollision should return no hit when no collision', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  enemy.position = { x: 200, y: 200 };
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 5,
    towerType: TowerType.Slimefungus,
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
    towerType: TowerType.Slimefungus,
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
    towerType: TowerType.Slimefungus,
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
    towerType: TowerType.Slimefungus,
    alive: true,
  };
  
  const projectile2: Projectile = {
    id: 2,
    position: { x: 200, y: 200 },
    targetId: 2,
    speed: 200,
    damage: 5,
    towerType: TowerType.Slimefungus,
    alive: false,
  };
  
  const projectiles = [projectile1, projectile2];
  
  const cleanup = getProjectilesNeedingCleanup(projectiles);
  
  assert(cleanup.length === 1, 'Should return 1 dead projectile');
  assert(cleanup[0].id === 2, 'Should return correct dead projectile');
});

console.log('\n--- GameRunner + Projectile Collision Integration ---');

test('GameRunner should aggregate multiple broken layers into one semantic event', () => {
  const game = createGameRunner({ startingMoney: 1000, startingLives: 20 });
  game.start();

  const target = createEnemy(1000, EnemyType.BulwarkBeetle, game.getPath());
  game.getActiveEnemies().push(target);
  game.getActiveProjectiles().push({
    id: 1000,
    position: { ...target.position },
    targetId: target.id,
    speed: 0,
    damage: 11,
    towerType: TowerType.Puffball,
    alive: true,
  });

  game.update(16);

  const layerEvents = game.drainEvents().filter(event => event.type === 'layer_broken');
  assert(layerEvents.length === 1, 'One resolved hit that breaks multiple layers should emit one layer_broken event');
  assert(layerEvents[0].enemyId === target.id, 'Layer event should identify the enemy');
  assert(layerEvents[0].enemyType === target.enemyType, 'Layer event should include the enemy type');
  assert(layerEvents[0].position.x === target.position.x && layerEvents[0].position.y === target.position.y, 'Layer event should use the enemy position');
  assert(layerEvents[0].layersBroken === 2, 'Layer event should carry the aggregate number of layers broken by the hit');
});

test('GameRunner should spawn projectiles from towers', () => {
  const game = createGameRunner({ startingMoney: 1000, startingLives: 20 });
  game.start();
  
  const tower = game.placeTower(TowerType.Slimefungus, 200, 200, TargetingMode.First);
  assert(tower !== null, 'Tower should be placed');
  
  game.startWave(0);
  
  let foundProjectile = false;
  const startTime = Date.now();
  for (let i = 0; i < 400; i++) {
    game.update(startTime + i * 16);
    
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

  const tower = game.placeTower(TowerType.Slimefungus, 720, 250, TargetingMode.First);
  assert(tower !== null, 'Tower should be placed');

  const enemy = createEnemy(1900, EnemyType.CrawlerCaterpillar, game.getPath());
  enemy.pathDistance = 1420;
  enemy.pathProgress = enemy.pathDistance;
  enemy.position = { ...game.getPath().getPointAtDistance(enemy.pathDistance).position };
  enemy.speed = 0;
  enemy.baseSpeed = 0;
  enemy.hp = 100;
  enemy.maxHp = 100;
  enemy.layers = [{ hp: 100, maxHp: 100 }];
  enemy.currentLayerIndex = 0;
  game.getActiveEnemies().push(enemy);
  game.drainEvents();
  game.update(0);
  game.update(2000);

  assert(hasStatusEffect(enemy, StatusEffectType.Slow), 'Real Slimefungus projectile should apply its slow effect');
  assert(
    game.drainEvents().some(event => event.type === 'enemy_slowed' && event.enemyId === enemy.id),
    'Real Slimefungus projectile should emit enemy_slowed feedback',
  );
});

test('GameRunner marks a shield-blocked slow hit for generic presentation feedback', () => {
  const game = createGameRunner({ startingMoney: 1000, startingLives: 20 });
  game.start();

  const tower = game.placeTower(TowerType.Slimefungus, 720, 250, TargetingMode.First);
  assert(tower !== null, 'Tower should be placed');

  const enemy = createEnemy(1901, EnemyType.WardMoth, game.getPath());
  enemy.pathDistance = 1420;
  enemy.pathProgress = enemy.pathDistance;
  enemy.position = { ...game.getPath().getPointAtDistance(enemy.pathDistance).position };
  enemy.speed = 0;
  enemy.baseSpeed = 0;
  game.getActiveEnemies().push(enemy);
  game.drainEvents();
  game.update(0);
  game.update(2000);

  const events = game.drainEvents();
  assert(!events.some(event => event.type === 'enemy_slowed' && event.enemyId === enemy.id), 'Shielded target should not emit applied-slow feedback');
  assert(
    events.some(event => event.type === 'hit' && event.effectType === 'slow' && event.blockedByShield === true),
    'Shield-blocked slow hit should retain the blocked marker for generic strike feedback',
  );
});

test('GameRunner Puffball projectiles should deal area damage', () => {
  const game = createGameRunner({ startingMoney: 1000, startingLives: 20 });
  game.start();
  
  const tower = game.placeTower(TowerType.Puffball, 200, 210, TargetingMode.First);
  assert(tower !== null, 'Tower should be placed');
  
  const initialMoney = game.getEconomy().getMoney();
  
  game.startWave(0);
  
  let kills = 0;
  const startTime = Date.now();
  for (let i = 0; i < 400; i++) {
    game.update(startTime + i * 16);
    
    const stats = game.getGameStats();
    if (stats.money > initialMoney) {
      kills++;
    }
    
    if (stats.enemies === 0 && i > 50) break;
  }
  
  assert(kills > 0, 'Should have killed enemies with area damage');
});

test('GameRunner Bulb Shooter projectiles should damage enemies', () => {
  const game = createGameRunner({ startingMoney: 1000, startingLives: 20 });
  game.start();
  
  const tower = game.placeTower(TowerType.BulbShooter, 200, 200, TargetingMode.First);
  assert(tower !== null, 'Tower should be placed');
  
  const initialMoney = game.getEconomy().getMoney();
  game.startWave(0);
  
  let dealtDamage = false;
  const startTime = Date.now();
  for (let i = 0; i < 300; i++) {
    game.update(startTime + i * 16);
    
    const enemies = game.getActiveEnemies();
    dealtDamage = game.getEconomy().getMoney() > initialMoney || enemies.some(enemy => enemy.hp < enemy.maxHp);
    
    if (dealtDamage) break;
    if (game.getGameStats().enemies === 0 && i > 50) break;
  }
  
  assert(dealtDamage, 'Should have damaged an enemy');
});

console.log('\n--- Tower Special Effects with Upgraded Values ---');

test('Symbiote Slimefungus should preserve its base slow parameters', () => {
  const tower = createTowerWithGrowth(1, 100, 100, TowerType.Slimefungus, TargetingMode.First);
  
  matureTower(tower);
  evolveTower(tower, EvolutionPath.Symbiote, true);
  
  const info = getSpecialEffectInfo(tower);
  assert(info !== null, 'Should have special effect info');
  
  const effects = getHitEffectsForTowerType(TowerType.Slimefungus, 2, info.effectStrength, info.effectDuration);
  const slowEffect = effects.find(e => e.type === 'slow');
  
  assert(slowEffect !== undefined, 'Should have slow effect');
  assert(slowEffect!.strength === 0.5, 'Symbiote should preserve the base 0.5 slow strength');
  assert(slowEffect!.duration === 1000, 'Symbiote should preserve the base 1000 ms slow duration');
});

test('Upgraded Bulb Shooter should retain area damage', () => {
  const tower = createTowerWithGrowth(1, 100, 100, TowerType.BulbShooter, TargetingMode.First);
  
  matureTower(tower);
  evolveTower(tower, EvolutionPath.Symbiote, true);
  
  const info = getSpecialEffectInfo(tower);
  assert(info !== null, 'Should have special effect info');
  
  const effects = getHitEffectsForTowerType(TowerType.BulbShooter, 3, info.effectStrength, info.effectDuration);
  const areaEffect = effects.find(e => e.type === 'area_damage');
  
  assert(areaEffect !== undefined, 'Should have area damage effect');
});

test('Symbiote Puffball should preserve its base area radius', () => {
  const tower = createTowerWithGrowth(1, 100, 100, TowerType.Puffball, TargetingMode.First);
  
  matureTower(tower);
  evolveTower(tower, EvolutionPath.Symbiote, true);
  
  const info = getSpecialEffectInfo(tower);
  assert(info !== null, 'Should have special effect info');
  assert(info.areaRadius !== undefined, 'Should have area radius');
  assert(info.areaRadius === 40, 'Symbiote should preserve the base radius 40');
});

test('Upgraded Thorn Sniper should retain direct damage', () => {
  const tower = createTowerWithGrowth(1, 100, 100, TowerType.ThornSniper, TargetingMode.First);
  
  matureTower(tower);
  evolveTower(tower, EvolutionPath.Symbiote, true);
  
  const info = getSpecialEffectInfo(tower);
  assert(info !== null, 'Should have special effect info');
  
  const effects = getHitEffectsForTowerType(TowerType.ThornSniper, 100, info.effectStrength);
  const damageEffect = effects.find(e => e.type === 'damage');
  
  assert(damageEffect !== undefined, 'Should have damage effect');
});

test('Symbiote Lumen should preserve base parameters while named reveal remains caller-gated', () => {
  const tower = createTowerWithGrowth(1, 100, 100, TowerType.LumenOracle, TargetingMode.First);
  
  matureTower(tower);
  evolveTower(tower, EvolutionPath.Symbiote, true);
  
  const info = getSpecialEffectInfo(tower);
  assert(info !== null, 'Should have special effect info');
  
  const effects = getHitEffectsForTowerType(TowerType.LumenOracle, 1, info.effectStrength, info.effectDuration);
  const revealEffect = effects.find(e => e.type === 'reveal_camo');

  assert(info.effectDuration === 500, 'Symbiote should preserve the base 500 ms Lumen duration');
  assert(revealEffect === undefined, 'Collision helper should not apply connection-gated reveal without GameRunner context');
});

console.log('\n--- Predator and Specialist Evolution Behaviours ---');

interface EvolutionScenario {
  game: GameRunner;
  tower: TowerWithGrowth;
  enemies: Enemy[];
}

interface ChainedSymbioteScenario {
  game: GameRunner;
  bridge: TowerWithGrowth;
  tower: TowerWithGrowth;
}

function setTestEnemyHealth(enemy: Enemy, hp: number): void {
  enemy.hp = hp;
  enemy.maxHp = hp;
  enemy.layers = [{ hp, maxHp: hp }];
  enemy.currentLayerIndex = 0;
}

function createEvolutionScenario(
  towerType: TowerType,
  evolution: EvolutionPath,
  enemyOffsets: readonly Vec2[],
  enemyType: EnemyType = EnemyType.CrawlerCaterpillar,
): EvolutionScenario {
  const game = createGameRunner({ startingMoney: 5000, startingLives: 20 });
  game.start();
  const tower = game.placeTower(towerType, 720, 250, TargetingMode.First);
  assert(tower !== null, `Should place ${towerType} evolution test tower`);
  assert(game.matureTower(tower.id).success, `Should mature ${towerType} evolution test tower`);
  assert(game.evolveTower(tower.id, evolution).success, `Should evolve ${towerType} through ${evolution}`);
  game.drainEvents();

  const enemies = enemyOffsets.map((offset, index) => {
    const enemy = createEnemy(2000 + index, enemyType, game.getPath());
    enemy.pathDistance = 1420 + offset.x;
    enemy.pathProgress = enemy.pathDistance;
    enemy.position = { ...game.getPath().getPointAtDistance(enemy.pathDistance).position };
    enemy.speed = 0;
    enemy.baseSpeed = 0;
    setTestEnemyHealth(enemy, 100);
    game.getActiveEnemies().push(enemy);
    return enemy;
  });

  game.update(0);
  return { game, tower, enemies };
}

function resolveFirstEvolutionAttack(scenario: EvolutionScenario, time: number = 2000): void {
  scenario.game.update(time);
}

function createChainedSymbioteScenario(towerType: TowerType): ChainedSymbioteScenario {
  const game = createGameRunner({ startingMoney: 5000, startingLives: 20 });
  game.start();
  const bridge = game.placeTower(TowerType.Sporecap, 650, 350, TargetingMode.First);
  const tower = game.placeTower(towerType, 500, 400, TargetingMode.First);
  assert(bridge !== null && tower !== null, `Should place bridge and chained ${towerType}`);
  assert(game.isTowerConnectedToNetwork(tower.id), `Chained ${towerType} should begin connected`);
  assert(game.matureTower(tower.id).success, `Should mature chained ${towerType}`);
  assert(game.evolveTower(tower.id, EvolutionPath.Symbiote).success, `Should evolve connected chained ${towerType}`);
  const target = createEnemy(2700, EnemyType.CrawlerCaterpillar, game.getPath());
  target.pathDistance = 1200;
  target.pathProgress = target.pathDistance;
  target.position = { ...game.getPath().getPointAtDistance(target.pathDistance).position };
  target.speed = 0;
  target.baseSpeed = 0;
  setTestEnemyHealth(target, 1000);
  game.getActiveEnemies().push(target);
  return { game, bridge, tower };
}

test('Symbiote Slimefungus keeps its base slow while Trait Rot follows current connection', () => {
  const { game, bridge, tower } = createChainedSymbioteScenario(TowerType.Slimefungus);
  const target = game.getActiveEnemies()[0];
  target.traits.push(EnemyTrait.Metal);
  game.update(1000);
  game.update(2000);
  const connectedSlow = target.statusEffects.find(effect => effect.type === StatusEffectType.Slow);
  assert(connectedSlow?.strength === 0.5, 'Connected Symbiote Slimefungus should preserve base 0.5 slow strength');
  assert(connectedSlow.duration === 1000, 'Connected Symbiote Slimefungus should preserve base 1000 ms slow duration');
  assert(target.statusEffects.some(effect => effect.type === StatusEffectType.TraitDisrupted), 'Connected Trait Rot should suppress an active trait');
  target.statusEffects.splice(0);

  assert(game.sellTower(bridge.id, true).status === 'sold', 'Should remove the Slimefungus bridge');
  game.update(3000);
  const disconnectedSlow = target.statusEffects.find(effect => effect.type === StatusEffectType.Slow);
  assert(disconnectedSlow?.strength === 0.5, 'Disconnected Symbiote Slimefungus should apply base 0.5 slow strength');
  assert(disconnectedSlow.duration === 1000, 'Disconnected Symbiote Slimefungus should apply base 1000 ms slow duration');
  assert(!target.statusEffects.some(effect => effect.type === StatusEffectType.TraitDisrupted), 'Disconnected Trait Rot should remain dormant');
  assert(tower.effectStrength === 0.5 && tower.effectDuration === 1000, 'Symbiote should retain stored base Slimefungus parameters');
  target.statusEffects.splice(0);

  const replacementBridge = game.placeTower(TowerType.Sporecap, 650, 350, TargetingMode.First);
  assert(replacementBridge !== null, 'Should replace the Slimefungus bridge');
  game.update(4000);
  const reconnectedSlow = target.statusEffects.find(effect => effect.type === StatusEffectType.Slow);
  assert(reconnectedSlow?.strength === 0.5, 'Reconnected Symbiote Slimefungus should retain base 0.5 slow strength');
  assert(reconnectedSlow.duration === 1000, 'Reconnected Symbiote Slimefungus should retain base 1000 ms slow duration');
  assert(target.statusEffects.some(effect => effect.type === StatusEffectType.TraitDisrupted), 'Reconnected Trait Rot should reactivate');
});

test('Symbiote Puffball keeps its base radius while Fungal Carpet follows current connection', () => {
  const { game, bridge, tower } = createChainedSymbioteScenario(TowerType.Puffball);
  game.update(1000);
  const connectedProjectile = game.getActiveProjectiles().find(projectile => projectile.sourceTowerId === tower.id);
  assert(connectedProjectile !== undefined, 'Connected Symbiote Puffball should fire');
  assert(connectedProjectile.areaRadius === 40, 'Connected Symbiote Puffball should preserve radius 40');
  game.update(2000);
  const connectedFieldCount = game.getLingeringFields().length;
  assert(connectedFieldCount > 0, 'Connected Fungal Carpet should create a lingering field');

  assert(game.sellTower(bridge.id, true).status === 'sold', 'Should remove the Puffball bridge');
  game.update(3000);
  assert(game.getLingeringFields().length === connectedFieldCount, 'Disconnected Fungal Carpet should not create another field');
  assert(tower.areaRadius === 40, 'Symbiote should retain stored base Puffball radius');

  const replacementBridge = game.placeTower(TowerType.Sporecap, 650, 350, TargetingMode.First);
  assert(replacementBridge !== null, 'Should replace the Puffball bridge');
  game.update(4000);
  assert(game.getLingeringFields().length > connectedFieldCount, 'Reconnected Fungal Carpet should create a new field');
});

test('Needle Volley deals higher damage and fires again before the Mature cooldown', () => {
  const matureGame = createGameRunner({ startingMoney: 5000, startingLives: 20 });
  matureGame.start();
  const matureTower = matureGame.placeTower(TowerType.Sporecap, 720, 250, TargetingMode.First);
  assert(matureTower !== null, 'Should place Mature Sporecap control tower');
  assert(matureGame.matureTower(matureTower.id).success, 'Should mature Sporecap control tower');
  const matureEnemy = createEnemy(2100, EnemyType.CrawlerCaterpillar, matureGame.getPath());
  matureEnemy.pathDistance = 1420;
  matureEnemy.pathProgress = matureEnemy.pathDistance;
  matureEnemy.position = { ...matureGame.getPath().getPointAtDistance(matureEnemy.pathDistance).position };
  matureEnemy.speed = 0;
  matureEnemy.baseSpeed = 0;
  setTestEnemyHealth(matureEnemy, 100);
  matureGame.getActiveEnemies().push(matureEnemy);
  matureGame.update(0);
  matureGame.update(2000);

  const predator = createEvolutionScenario(TowerType.Sporecap, EvolutionPath.Predator, [{ x: 0, y: 0 }]);
  resolveFirstEvolutionAttack(predator);
  const firstPredatorHp = predator.enemies[0].hp;
  predator.game.update(2000 + predator.tower.fireRate + 1);

  assert(firstPredatorHp < matureEnemy.hp, 'Needle Volley direct hit should deal more damage than Mature Sporecap');
  assert(predator.enemies[0].hp < firstPredatorHp, 'Needle Volley should fire a second shot on its shorter cooldown');
});

test('Forked Spores damages one additional nearby target from one projectile', () => {
  const scenario = createEvolutionScenario(TowerType.Sporecap, EvolutionPath.Specialist, [
    { x: 0, y: 0 },
    { x: -20, y: 0 },
  ]);

  resolveFirstEvolutionAttack(scenario);

  assert(scenario.enemies[0].hp < 100, 'Forked Spores should damage its primary target');
  assert(scenario.enemies[1].hp < 100, 'Forked Spores should damage one additional nearby target');
});

test('Heartwood Needle deals higher single-target damage than a Mature Thorn Sniper', () => {
  const scenario = createEvolutionScenario(TowerType.ThornSniper, EvolutionPath.Predator, [{ x: 0, y: 0 }]);

  resolveFirstEvolutionAttack(scenario);

  assert(scenario.enemies[0].hp < 100 - (TOWER_STATS[TowerType.ThornSniper].damage * 1.2), 'Heartwood Needle should exceed Mature Thorn direct damage');
});

test('Skewer carries lethal overflow damage into a second target', () => {
  const scenario = createEvolutionScenario(TowerType.ThornSniper, EvolutionPath.Specialist, [
    { x: 0, y: 0 },
    { x: -20, y: 0 },
  ]);
  setTestEnemyHealth(scenario.enemies[0], 2);

  resolveFirstEvolutionAttack(scenario);

  assert(!scenario.enemies[0].alive, 'Skewer should kill the low-health primary target');
  assert(scenario.enemies[1].hp < 100, 'Skewer overflow should continue into a second target');
});

test('Burst Sac damages an enemy outside the base Puffball area radius', () => {
  const scenario = createEvolutionScenario(TowerType.Puffball, EvolutionPath.Predator, [
    { x: 0, y: 0 },
    { x: -55, y: 0 },
  ]);

  resolveFirstEvolutionAttack(scenario);

  assert(scenario.enemies[1].hp < 100, 'Burst Sac enlarged impact should reach beyond the base 40px area');
});

test('Echo Puff produces one delayed secondary area hit', () => {
  const scenario = createEvolutionScenario(TowerType.Puffball, EvolutionPath.Specialist, [
    { x: 0, y: 0 },
    { x: -20, y: 0 },
  ]);
  resolveFirstEvolutionAttack(scenario);
  const hpAfterInitialImpact = scenario.enemies[1].hp;
  scenario.game.drainEvents();

  scenario.game.update(2300);

  const delayedAreas = scenario.game.drainEvents().filter(event => event.type === 'area_hit');
  assert(scenario.enemies[1].hp < hpAfterInitialImpact, 'Echo Puff delayed pop should deal a second area hit');
  assert(delayedAreas.length === 1, 'Echo Puff should emit exactly one delayed secondary area');
});

test('Caustic Slime applies poison after its direct slow hit', () => {
  const scenario = createEvolutionScenario(TowerType.Slimefungus, EvolutionPath.Predator, [{ x: 0, y: 0 }]);

  resolveFirstEvolutionAttack(scenario);

  assert(hasStatusEffect(scenario.enemies[0], StatusEffectType.Poison), 'Caustic Slime should apply poison status');
});

test('Bog Cap reaches farther and applies a stronger longer slow', () => {
  const scenario = createEvolutionScenario(TowerType.Slimefungus, EvolutionPath.Specialist, [{ x: -120, y: 0 }]);

  resolveFirstEvolutionAttack(scenario);

  const slow = scenario.enemies[0].statusEffects.find(effect => effect.type === StatusEffectType.Slow);
  assert(slow !== undefined, 'Bog Cap increased range should reach the distant target');
  assert(slow.strength > 0.5, 'Bog Cap slow should be stronger than the base slow');
  assert(slow.duration > 1000, 'Bog Cap slow should last longer than the base slow');
});

test('Siege Bulb uniquely bypasses direct Metal reduction and reaches with a larger explosion', () => {
  const baseGame = createGameRunner({ startingMoney: 5000, startingLives: 20 });
  baseGame.start();
  const baseTower = baseGame.placeTower(TowerType.BulbShooter, 720, 250, TargetingMode.First);
  assert(baseTower !== null, 'Should place base Bulb Metal control tower');
  assert(baseGame.matureTower(baseTower.id).success, 'Should mature base Bulb Metal control tower');
  const baseTarget = createEnemy(2200, EnemyType.BulwarkBeetle, baseGame.getPath());
  baseTarget.pathDistance = 1420;
  baseTarget.pathProgress = baseTarget.pathDistance;
  baseTarget.position = { ...baseGame.getPath().getPointAtDistance(baseTarget.pathDistance).position };
  baseTarget.speed = 0;
  baseTarget.baseSpeed = 0;
  setTestEnemyHealth(baseTarget, 100);
  baseGame.getActiveEnemies().push(baseTarget);
  baseGame.update(0);
  baseGame.update(2000);

  const scenario = createEvolutionScenario(TowerType.BulbShooter, EvolutionPath.Predator, [
    { x: 0, y: 0 },
    { x: -55, y: 0 },
  ], EnemyType.BulwarkBeetle);
  const expectedDirectDamage = scenario.tower.damage;

  resolveFirstEvolutionAttack(scenario);

  const baseDamage = 100 - baseTarget.hp;
  const siegeDamage = 100 - scenario.enemies[0].hp;
  assert(baseDamage < baseTower.damage, 'Base Bulb direct hit should retain Metal reduction');
  assert(siegeDamage > baseDamage, 'Siege Bulb should deal more direct HP damage to Metal than base Bulb');
  assert(scenario.enemies[0].hp === 100 - expectedDirectDamage, 'Siege Bulb direct hit should bypass Metal reduction');
  assert(scenario.enemies[1].hp < 100, 'Siege Bulb enlarged explosion should reach beyond the base area');
});

test('Cluster Bloom creates three smaller damaging impact areas', () => {
  const scenario = createEvolutionScenario(TowerType.BulbShooter, EvolutionPath.Specialist, [
    { x: 0, y: 0 },
    { x: -25, y: 0 },
  ]);

  resolveFirstEvolutionAttack(scenario);

  const impactAreas = scenario.game.drainEvents().filter(event => event.type === 'area_hit');
  assert(impactAreas.length === 3, 'Cluster Bloom should emit three smaller impact areas');
  assert(impactAreas.every(event => event.type === 'area_hit' && (event.radius ?? 0) < 40), 'Each Cluster Bloom area should be smaller than the base explosion');
  assert(scenario.enemies[1].hp < 100, 'Cluster Bloom areas should damage a nearby enemy');
});

test('Luminous Bolt removes two of several shield charges without leaking HP damage', () => {
  const scenario = createEvolutionScenario(TowerType.LumenOracle, EvolutionPath.Predator, [{ x: 0, y: 0 }], EnemyType.WardMoth);
  scenario.enemies[0].shieldCharges = 3;

  resolveFirstEvolutionAttack(scenario);

  assert(scenario.enemies[0].shieldCharges === 1, 'Luminous Bolt should remove two shield charges');
  assert(scenario.enemies[0].hp === 100, 'Multi-charge shield should block Luminous Bolt HP damage');
  assert(scenario.game.drainEvents().filter(event => event.type === 'trait_broken').length === 0, 'Shield trait should remain active while one charge remains');
});

test('Luminous Bolt breaks one remaining shield charge while the hit stays blocked', () => {
  const scenario = createEvolutionScenario(TowerType.LumenOracle, EvolutionPath.Predator, [{ x: 0, y: 0 }], EnemyType.WardMoth);
  scenario.enemies[0].shieldCharges = 1;

  resolveFirstEvolutionAttack(scenario);

  const shieldEvents = scenario.game.drainEvents().filter(event => event.type === 'trait_broken');
  assert(scenario.enemies[0].shieldCharges === 0, 'Luminous Bolt should remove the final shield charge');
  assert(scenario.enemies[0].hp === 100, 'One-charge shield should still block Luminous Bolt HP damage');
  assert(!hasStatusEffect(scenario.enemies[0], StatusEffectType.Revealed), 'Blocked Luminous Bolt should not leak status effects');
  assert(shieldEvents.length === 1 && shieldEvents[0].trait === EnemyTrait.Shielded, 'Breaking the final charge should emit one Shielded trait event');
});

test('Luminous Bolt deals higher observable HP damage to an unshielded target', () => {
  const matureGame = createGameRunner({ startingMoney: 5000, startingLives: 20 });
  matureGame.start();
  const matureTower = matureGame.placeTower(TowerType.LumenOracle, 720, 250, TargetingMode.First);
  assert(matureTower !== null, 'Should place Mature Lumen damage control tower');
  assert(matureGame.matureTower(matureTower.id).success, 'Should mature Lumen damage control tower');
  const matureTarget = createEnemy(2300, EnemyType.CrawlerCaterpillar, matureGame.getPath());
  matureTarget.pathDistance = 1420;
  matureTarget.pathProgress = matureTarget.pathDistance;
  matureTarget.position = { ...matureGame.getPath().getPointAtDistance(matureTarget.pathDistance).position };
  matureTarget.speed = 0;
  matureTarget.baseSpeed = 0;
  setTestEnemyHealth(matureTarget, 100);
  matureGame.getActiveEnemies().push(matureTarget);
  matureGame.update(0);
  matureGame.update(2000);
  const predator = createEvolutionScenario(TowerType.LumenOracle, EvolutionPath.Predator, [{ x: 0, y: 0 }]);

  resolveFirstEvolutionAttack(predator);

  assert(predator.enemies[0].hp < matureTarget.hp, 'Luminous Bolt should remove more enemy HP than Mature Lumen');
});

test('Revelation Field creates a larger longer reveal patch with mild slow', () => {
  const scenario = createEvolutionScenario(TowerType.LumenOracle, EvolutionPath.Specialist, [
    { x: 0, y: 0 },
    { x: -55, y: 0 },
    { x: -30, y: 0 },
  ], EnemyType.PaleMoth);
  scenario.enemies[2].traits.push(EnemyTrait.Shielded);
  scenario.enemies[2].shieldCharges = 1;

  resolveFirstEvolutionAttack(scenario);

  const reveal = scenario.enemies[1].statusEffects.find(effect => effect.type === StatusEffectType.Revealed);
  const slow = scenario.enemies[1].statusEffects.find(effect => effect.type === StatusEffectType.Slow);
  const revealAreas = scenario.game.drainEvents().filter(event => event.type === 'area_hit');
  assert(reveal !== undefined && reveal.duration > 500, 'Revelation Field should reveal nearby Camo enemies for longer');
  assert(slow !== undefined && slow.strength > 0 && slow.strength < 0.5, 'Revelation Field should mildly slow nearby enemies');
  assert(revealAreas.some(event => event.type === 'area_hit' && (event.radius ?? 0) > 40), 'Revelation Field should emit a larger reveal patch');
  assert(scenario.enemies[2].shieldCharges === 0, 'Revelation Field should consume a secondary target shield');
  assert(!hasStatusEffect(scenario.enemies[2], StatusEffectType.Revealed), 'Shielded secondary target should block Revelation reveal');
  assert(!hasStatusEffect(scenario.enemies[2], StatusEffectType.Slow), 'Shielded secondary target should block Revelation slow');
});

test('Revelation Field preserves the primary target blocked state for the whole impact', () => {
  const scenario = createEvolutionScenario(TowerType.LumenOracle, EvolutionPath.Specialist, [{ x: 0, y: 0 }], EnemyType.PaleMoth);
  scenario.enemies[0].traits.push(EnemyTrait.Shielded);
  scenario.enemies[0].shieldCharges = 1;

  resolveFirstEvolutionAttack(scenario);

  assert(scenario.enemies[0].shieldCharges === 0, 'Primary shield should be consumed by the direct Revelation impact');
  assert(scenario.enemies[0].hp === 100, 'Primary shield should block Revelation direct HP damage');
  assert(!hasStatusEffect(scenario.enemies[0], StatusEffectType.Revealed), 'Just-consumed primary shield should block same-impact reveal');
  assert(!hasStatusEffect(scenario.enemies[0], StatusEffectType.Slow), 'Just-consumed primary shield should block same-impact slow');
});

test('Connected Symbiote Lumen applies reveal and slow through GameRunner', () => {
  const game = createGameRunner({ startingMoney: 5000, startingLives: 20 });
  game.start();
  const tower = game.placeTower(TowerType.LumenOracle, 720, 250, TargetingMode.First);
  assert(tower !== null, 'Should place connected Symbiote Lumen');
  assert(game.matureTower(tower.id).success, 'Should mature connected Symbiote Lumen');
  assert(game.evolveTower(tower.id, EvolutionPath.Symbiote).success, 'Should evolve connected Symbiote Lumen');
  const target = createEnemy(2400, EnemyType.PaleMoth, game.getPath());
  target.pathDistance = 1420;
  target.pathProgress = target.pathDistance;
  target.position = { ...game.getPath().getPointAtDistance(target.pathDistance).position };
  target.speed = 0;
  target.baseSpeed = 0;
  setTestEnemyHealth(target, 100);
  game.getActiveEnemies().push(target);
  game.drainEvents();
  game.update(0);

  game.update(2000);

  assert(hasStatusEffect(target, StatusEffectType.Revealed), 'Connected Symbiote Lumen should reveal through GameRunner');
  assert(hasStatusEffect(target, StatusEffectType.Slow), 'Connected Symbiote Lumen should slow through GameRunner');
  const revealFeedbackEvents = game.drainEvents();
  assert(
    revealFeedbackEvents.some(event => event.type === 'enemy_revealed' && event.enemyId === target.id),
    'Connected Symbiote Lumen should emit enemy_revealed feedback',
  );
  assert(
    revealFeedbackEvents.some(event => event.type === 'enemy_slowed' && event.enemyId === target.id),
    'Connected Symbiote Lumen should emit enemy_slowed feedback',
  );
});

test('Disconnected Symbiote Lumen keeps its connection-gated reveal and slow dormant', () => {
  const game = createGameRunner({ startingMoney: 5000, startingLives: 20 });
  game.start();
  const bridge = game.placeTower(TowerType.Sporecap, 650, 350, TargetingMode.First);
  const tower = game.placeTower(TowerType.LumenOracle, 500, 400, TargetingMode.First);
  assert(bridge !== null && tower !== null, 'Should place bridge and chained Lumen');
  assert(game.isTowerConnectedToNetwork(tower.id), 'Chained Lumen should begin connected');
  assert(game.matureTower(tower.id).success, 'Should mature chained Lumen');
  assert(game.evolveTower(tower.id, EvolutionPath.Symbiote).success, 'Should evolve connected chained Lumen');
  assert(game.sellTower(bridge.id, true).status === 'sold', 'Should remove the bridge tower');
  assert(!game.isTowerConnectedToNetwork(tower.id), 'Symbiote Lumen should become disconnected');
  const target = createEnemy(2500, EnemyType.PaleMoth, game.getPath());
  target.pathDistance = 1200;
  target.pathProgress = target.pathDistance;
  target.position = { ...game.getPath().getPointAtDistance(target.pathDistance).position };
  target.speed = 0;
  target.baseSpeed = 0;
  setTestEnemyHealth(target, 100);
  game.getActiveEnemies().push(target);
  game.update(0);

  game.update(2000);

  assert(target.hp < 100, 'Disconnected Lumen should retain its base direct attack');
  assert(!hasStatusEffect(target, StatusEffectType.Revealed), 'Disconnected Symbiote reveal should remain dormant');
  assert(!hasStatusEffect(target, StatusEffectType.Slow), 'Disconnected Symbiote slow should remain dormant');
});

test('Symbiote Lumen re-checks its connection when a fired projectile lands', () => {
  // Given: a connected Symbiote Lumen has already fired at a stationary target.
  const game = createGameRunner({ startingMoney: 5000, startingLives: 20 });
  game.start();
  const bridge = game.placeTower(TowerType.Sporecap, 650, 350, TargetingMode.First);
  const tower = game.placeTower(TowerType.LumenOracle, 500, 400, TargetingMode.First);
  assert(bridge !== null && tower !== null, 'Should place bridge and chained Lumen');
  assert(game.isTowerConnectedToNetwork(tower.id), 'Chained Lumen should begin connected');
  assert(game.matureTower(tower.id).success, 'Should mature chained Lumen');
  assert(game.evolveTower(tower.id, EvolutionPath.Symbiote).success, 'Should evolve connected chained Lumen');
  const target = createEnemy(2600, EnemyType.PaleMoth, game.getPath());
  target.pathDistance = 1200;
  target.pathProgress = target.pathDistance;
  target.position = { ...game.getPath().getPointAtDistance(target.pathDistance).position };
  target.speed = 0;
  target.baseSpeed = 0;
  setTestEnemyHealth(target, 100);
  game.getActiveEnemies().push(target);
  game.update(1000);
  const lumenProjectile = game.getActiveProjectiles().find(projectile => projectile.sourceTowerId === tower.id);
  assert(lumenProjectile !== undefined, 'Connected Lumen should have a projectile in flight');
  game.getActiveProjectiles().splice(0, game.getActiveProjectiles().length, lumenProjectile);

  // When: the bridge is removed before impact.
  assert(game.sellTower(bridge.id, true).status === 'sold', 'Should remove the bridge while the projectile is in flight');
  assert(!game.isTowerConnectedToNetwork(tower.id), 'Symbiote Lumen should disconnect before impact');
  const hpBeforeImpact = target.hp;
  game.update(3000);

  // Then: base damage lands, but connection-gated reveal and slow remain dormant.
  assert(target.hp < hpBeforeImpact, 'Disconnected in-flight Lumen projectile should retain base direct damage');
  assert(!hasStatusEffect(target, StatusEffectType.Revealed), 'Disconnected in-flight Chorus Light should not reveal');
  assert(!hasStatusEffect(target, StatusEffectType.Slow), 'Disconnected in-flight Chorus Light should not slow');

  // Given: the network connection is restored.
  const replacementBridge = game.placeTower(TowerType.Sporecap, 650, 350, TargetingMode.First);
  assert(replacementBridge !== null, 'Should replace the bridge tower');
  assert(game.isTowerConnectedToNetwork(tower.id), 'Symbiote Lumen should reconnect');

  // When: a new connected shot lands.
  game.update(5000);

  // Then: Chorus Light reveal and slow are restored.
  assert(hasStatusEffect(target, StatusEffectType.Revealed), 'Reconnected Chorus Light should reveal');
  assert(hasStatusEffect(target, StatusEffectType.Slow), 'Reconnected Chorus Light should slow');
});

test('Symbiote Lumen activates when a disconnected-fired projectile reconnects before impact', () => {
  const { game, bridge, tower } = createChainedSymbioteScenario(TowerType.LumenOracle);
  const target = game.getActiveEnemies()[0];
  assert(game.sellTower(bridge.id, true).status === 'sold', 'Should disconnect Lumen before firing');
  game.update(1000);
  assert(
    game.getActiveProjectiles().some(projectile => projectile.sourceTowerId === tower.id),
    'Disconnected Lumen should fire its base projectile',
  );

  const replacementBridge = game.placeTower(TowerType.Sporecap, 650, 350, TargetingMode.First);
  assert(replacementBridge !== null, 'Should restore the bridge before impact');
  const hpBeforeImpact = target.hp;
  game.update(3000);

  assert(target.hp < hpBeforeImpact, 'Reconnected in-flight Lumen projectile should retain base direct damage');
  assert(hasStatusEffect(target, StatusEffectType.Revealed), 'Reconnected in-flight Chorus Light should reveal');
  assert(hasStatusEffect(target, StatusEffectType.Slow), 'Reconnected in-flight Chorus Light should slow');
});

console.log('\n--- Projectile Collision Edge Cases ---');

test('Dead projectile should not collide', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  enemy.position = { x: 100, y: 100 };
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 5,
    towerType: TowerType.Slimefungus,
    alive: false,
  };
  
  const result = detectCollision(projectile, [enemy]);
  assert(result === null, 'Dead projectile should not collide');
});

test('Projectile with zero speed should still hit close target', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  enemy.position = { x: 102, y: 100 };
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 0,
    damage: 5,
    towerType: TowerType.ThornSniper,
    alive: true,
  };
  
  const result = updateProjectile(projectile, [enemy], 16);
  
  assert(result.hit === true, 'Zero speed projectile should still hit close target');
});

test('Multiple enemies - projectile should only hit its target', () => {
  const enemy1 = createEnemy(1, EnemyType.ScoutBeetle, path);
  enemy1.position = { x: 100, y: 100 };
  
  const enemy2 = createEnemy(2, EnemyType.DartWasp, path);
  enemy2.position = { x: 110, y: 110 };
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 90, y: 100 },
    targetId: 1,
    speed: 500,
    damage: 10,
    towerType: TowerType.BulbShooter,
    alive: true,
  };
  
  let hitTargetId: number | null = null;
  for (let i = 0; i < 20; i++) {
    const result = updateProjectile(projectile, [enemy1, enemy2], 16);
    if (result.hit && result.target) {
      hitTargetId = result.target.id;
      break;
    }
  }
  
  assert(hitTargetId !== null, 'Should have hit target');
  assert(hitTargetId === 1, 'Should only hit intended target');
});

test('Enemy moving away from projectile should still be hit', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  enemy.position = { x: 200, y: 200 };
  enemy.baseSpeed = 500;
  enemy.speed = 500;
  
  const projectile: Projectile = {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 300,
    damage: 10,
    towerType: TowerType.Slimefungus,
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

import {
  CollisionResult,
  HitEffect,
  detectCollision,
  checkProjectileHit,
  resolveHit,
  getHitEffectsForTowerType,
  applyHitEffects,
  calculateAreaDamage,
  processProjectileCollision,
  updateProjectileCollision,
  isProjectileInBounds,
  getProjectilesNeedingCleanup,
  AreaDamageResult,
} from './systems/collision';
import { Projectile, TowerType } from './entities/tower';
import { Enemy, StatusEffectType, createEnemy } from './entities/enemy';
import { EnemyType } from './systems/wave';
import { createDefaultPath } from './systems/path';

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

function assertTrue(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('Testing Collision System...');

function createMockEnemy(id: number, x: number, y: number, hp: number = 100): Enemy {
  const path = createDefaultPath();
  const enemy = createEnemy(id, EnemyType.RedMushroom, path);
  enemy.position = { x, y };
  enemy.hp = hp;
  enemy.maxHp = hp;
  enemy.alive = true;
  return enemy;
}

let mockProjectileId = 1;

function createMockProjectile(x: number, y: number, targetId: number, towerType: TowerType = TowerType.PuffballFungus): Projectile {
  return {
    id: mockProjectileId++,
    position: { x, y },
    targetId,
    speed: 200,
    damage: 10,
    towerType,
    alive: true,
  };
}

console.log('  Testing Collision Detection...');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`    ✓ ${name}`);
    passed++;
  } catch (e: any) {
    console.log(`    ✗ ${name}: ${e.message}`);
    failed++;
  }
}

test('detectCollision returns enemy when projectile is within hit radius', () => {
  const enemy = createMockEnemy(1, 100, 100);
  const projectile = createMockProjectile(95, 100, 1);
  const result = detectCollision(projectile, [enemy]);
  assertTrue(result === enemy, 'Should return the enemy');
});

test('detectCollision returns null when no enemy in range', () => {
  const enemy = createMockEnemy(1, 100, 100);
  const projectile = createMockProjectile(0, 0, 1);
  const result = detectCollision(projectile, [enemy]);
  assertTrue(result === null, 'Should return null');
});

test('detectCollision ignores dead enemies', () => {
  const enemy = createMockEnemy(1, 100, 100);
  enemy.alive = false;
  const projectile = createMockProjectile(95, 100, 1);
  const result = detectCollision(projectile, [enemy]);
  assertTrue(result === null, 'Should return null for dead enemy');
});

test('detectCollision ignores enemies with 0 hp', () => {
  const enemy = createMockEnemy(1, 100, 100, 0);
  const projectile = createMockProjectile(95, 100, 1);
  const result = detectCollision(projectile, [enemy]);
  assertTrue(result === null, 'Should return null for 0 hp enemy');
});

test('checkProjectileHit returns true when within hit radius', () => {
  const enemy = createMockEnemy(1, 100, 100);
  const projectile = createMockProjectile(92, 100, 1);
  assertTrue(checkProjectileHit(projectile, enemy) === true, 'Should return true');
});

test('checkProjectileHit returns false when outside hit radius', () => {
  const enemy = createMockEnemy(1, 100, 100);
  const projectile = createMockProjectile(0, 0, 1);
  assertTrue(checkProjectileHit(projectile, enemy) === false, 'Should return false');
});

test('checkProjectileHit returns false for dead target', () => {
  const enemy = createMockEnemy(1, 100, 100);
  enemy.alive = false;
  const projectile = createMockProjectile(95, 100, 1);
  assertTrue(checkProjectileHit(projectile, enemy) === false, 'Should return false');
});

console.log('  Testing Hit Resolution...');

test('resolveHit returns damage effect for basic hit', () => {
  const enemy = createMockEnemy(1, 100, 100, 50);
  const projectile = createMockProjectile(100, 100, 1, TowerType.PuffballFungus);
  projectile.damage = 10;
  const result = resolveHit(projectile, enemy, 16);
  assertTrue(result.hit === true, 'Should register hit');
  assertTrue(result.target === enemy, 'Should have target');
  assertTrue(result.damage === 10, 'Should have correct damage');
  assertTrue(result.effects.length > 0, 'Should have effects');
});

test('resolveHit includes slow effect for OrchidTrap', () => {
  const enemy = createMockEnemy(1, 100, 100);
  const projectile = createMockProjectile(100, 100, 1, TowerType.OrchidTrap);
  const result = resolveHit(projectile, enemy, 16);
  const slowEffect = result.effects.find((e: HitEffect) => e.type === 'slow');
  assertTrue(slowEffect !== undefined, 'Should have slow effect');
  assertTrue(slowEffect!.strength === 0.5, 'Should have correct slow strength');
});

test('resolveHit includes poison effect for StinkhornLine', () => {
  const enemy = createMockEnemy(1, 100, 100);
  const projectile = createMockProjectile(100, 100, 1, TowerType.StinkhornLine);
  projectile.damage = 5;
  const result = resolveHit(projectile, enemy, 16);
  const poisonEffect = result.effects.find((e: HitEffect) => e.type === 'poison');
  assertTrue(poisonEffect !== undefined, 'Should have poison effect');
});

test('resolveHit VenusFlytower has damage effect', () => {
  const enemy = createMockEnemy(1, 100, 100, 200);
  const projectile = createMockProjectile(100, 100, 1, TowerType.VenusFlytower);
  projectile.damage = 100;
  const result = resolveHit(projectile, enemy, 16);
  const damageEffect = result.effects.find((e: HitEffect) => e.type === 'damage');
  assertTrue(damageEffect !== undefined, 'Should have damage effect');
  assertTrue(damageEffect!.strength === 100, 'Should have 100 damage');
});

console.log('  Testing Hit Effects Application...');

test('applyHitEffects applies slow to enemy', () => {
  const enemy = createMockEnemy(1, 100, 100);
  const effects: HitEffect[] = [{ type: 'slow', strength: 0.5, duration: 1000 }];
  applyHitEffects(enemy, effects, 16);
  const slowEffect = enemy.statusEffects.find(e => e.type === StatusEffectType.Slow);
  assertTrue(slowEffect !== undefined, 'Should have slow effect');
  assertTrue(slowEffect!.strength === 0.5, 'Should have correct slow strength');
});

test('applyHitEffects applies poison to enemy', () => {
  const enemy = createMockEnemy(1, 100, 100);
  const effects: HitEffect[] = [{ type: 'poison', strength: 2, duration: 3000 }];
  applyHitEffects(enemy, effects, 16);
  const poisonEffect = enemy.statusEffects.find(e => e.type === StatusEffectType.Poison);
  assertTrue(poisonEffect !== undefined, 'Should have poison effect');
  assertTrue(poisonEffect!.strength === 2, 'Should have correct poison strength');
});

test('applyHitEffects applies stun to enemy', () => {
  const enemy = createMockEnemy(1, 100, 100);
  const effects: HitEffect[] = [{ type: 'stun', strength: 1, duration: 500 }];
  applyHitEffects(enemy, effects, 16);
  const stunEffect = enemy.statusEffects.find(e => e.type === StatusEffectType.Stun);
  assertTrue(stunEffect !== undefined, 'Should have stun effect');
});

test('getHitEffectsForTowerType returns correct effects for PuffballFungus', () => {
  const effects = getHitEffectsForTowerType(TowerType.PuffballFungus, 10);
  assertTrue(effects.some((e: HitEffect) => e.type === 'damage'), 'Should have damage');
  assertTrue(effects.some((e: HitEffect) => e.type === 'area_damage'), 'Should have area damage');
});

test('getHitEffectsForTowerType returns correct effects for OrchidTrap', () => {
  const effects = getHitEffectsForTowerType(TowerType.OrchidTrap, 10);
  assertTrue(effects.some((e: HitEffect) => e.type === 'slow'), 'Should have slow');
});

test('getHitEffectsForTowerType returns correct effects for StinkhornLine', () => {
  const effects = getHitEffectsForTowerType(TowerType.StinkhornLine, 10);
  assertTrue(effects.some((e: HitEffect) => e.type === 'poison'), 'Should have poison');
});

console.log('  Testing Area Damage...');

test('calculateAreaDamage hits enemies within radius', () => {
  const enemies = [
    createMockEnemy(1, 100, 100),
    createMockEnemy(2, 120, 100),
    createMockEnemy(3, 200, 200),
  ];
  const center = { x: 100, y: 100 };
  const result = calculateAreaDamage(center, enemies, 10);
  assertTrue(result.enemiesHit.length === 2, 'Should hit 2 enemies');
  assertTrue(result.totalDamage > 0, 'Should deal total damage');
});

test('calculateAreaDamage ignores dead enemies', () => {
  const aliveEnemy = createMockEnemy(1, 100, 100);
  const deadEnemy = createMockEnemy(2, 110, 110);
  deadEnemy.alive = false;
  const enemies = [aliveEnemy, deadEnemy];
  const center = { x: 100, y: 100 };
  const result = calculateAreaDamage(center, enemies, 10);
  assertTrue(result.enemiesHit.length === 1, 'Should only hit alive enemy');
});

console.log('  Testing Projectile Collision Update...');

test('updateProjectileCollision returns hit when projectile reaches target', () => {
  const enemy = createMockEnemy(1, 100, 100);
  const projectile = createMockProjectile(92, 100, 1);
  const result = updateProjectileCollision(projectile, [enemy], 16);
  assertTrue(result.hit === true, 'Should register hit');
  assertTrue(result.target === enemy, 'Should have target');
});

test('updateProjectileCollision moves projectile toward target', () => {
  const enemy = createMockEnemy(1, 100, 100);
  const projectile = createMockProjectile(0, 0, 1);
  const oldX = projectile.position.x;
  const oldY = projectile.position.y;
  updateProjectileCollision(projectile, [enemy], 16);
  assertTrue(projectile.position.x > oldX, 'X should increase');
  assertTrue(projectile.position.y > oldY, 'Y should increase');
});

test('updateProjectileCollision marks projectile dead when target dies', () => {
  const enemy = createMockEnemy(1, 100, 100);
  const projectile = createMockProjectile(50, 50, 1);
  enemy.alive = false;
  const result = updateProjectileCollision(projectile, [enemy], 16);
  assertTrue(result.hit === false, 'Should not hit');
  assertTrue(projectile.alive === false, 'Projectile should be dead');
});

test('updateProjectileCollision returns miss when no target found', () => {
  const projectile = createMockProjectile(50, 50, 999);
  const result = updateProjectileCollision(projectile, [], 16);
  assertTrue(result.hit === false, 'Should not hit');
  assertTrue(projectile.alive === false, 'Projectile should be dead');
});

console.log('  Testing Process Projectile Collision...');

test('processProjectileCollision handles normal hit', () => {
  const enemy = createMockEnemy(1, 100, 100);
  const projectile = createMockProjectile(92, 100, 1);
  const result = processProjectileCollision(projectile, [enemy], 16);
  assertTrue(result.collision.hit === true, 'Should register hit');
  assertTrue(result.collision.target === enemy, 'Should have target');
});

test('processProjectileCollision handles area damage for PuffballFungus', () => {
  const enemy1 = createMockEnemy(1, 100, 100);
  const enemy2 = createMockEnemy(2, 110, 110);
  const projectile = createMockProjectile(100, 100, 1, TowerType.PuffballFungus);
  const result = processProjectileCollision(projectile, [enemy1, enemy2], 16);
  assertTrue(result.collision.hit === true, 'Should register hit');
  assertTrue(result.areaDamage !== undefined, 'Should have area damage result');
});

test('processProjectileCollision returns miss when no collision', () => {
  const enemy = createMockEnemy(1, 100, 100);
  const projectile = createMockProjectile(0, 0, 1);
  const result = processProjectileCollision(projectile, [enemy], 16);
  assertTrue(result.collision.hit === false, 'Should not hit');
});

console.log('  Testing Bounds and Cleanup...');

test('isProjectileInBounds returns true for projectile within bounds', () => {
  const projectile = createMockProjectile(500, 500, 1);
  const bounds = { minX: 0, maxX: 1000, minY: 0, maxY: 1000 };
  assertTrue(isProjectileInBounds(projectile, bounds) === true, 'Should be in bounds');
});

test('isProjectileInBounds returns false for projectile outside bounds', () => {
  const projectile = createMockProjectile(1500, 500, 1);
  const bounds = { minX: 0, maxX: 1000, minY: 0, maxY: 1000 };
  assertTrue(isProjectileInBounds(projectile, bounds) === false, 'Should be out of bounds');
});

test('getProjectilesNeedingCleanup returns dead projectiles', () => {
  const alive: Projectile = { id: 100, position: { x: 100, y: 100 }, targetId: 1, speed: 200, damage: 10, towerType: TowerType.PuffballFungus, alive: true };
  const dead: Projectile = { id: 200, position: { x: 200, y: 200 }, targetId: 2, speed: 200, damage: 10, towerType: TowerType.PuffballFungus, alive: false };
  const result = getProjectilesNeedingCleanup([alive, dead]);
  assertTrue(result.length === 1, 'Should return 1 projectile');
  assertTrue(result[0].id === 200, 'Should return dead projectile');
});

console.log(`\nCollision System Tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}

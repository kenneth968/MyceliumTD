import { ENEMY_DEFINITIONS, EnemyTrait, EnemyType, EnemyVariant } from '../content/enemyDefinitions';
import {
  DamageType,
  StatusEffectType,
  applyEnemyVariant,
  createEnemy,
  getSwarmLinkedSpeedMultiplier,
  refreshSwarmLinkStates,
  resolveDamage,
} from '../entities/enemy';
import { TowerType } from '../entities/tower';
import { createGameRunner } from './gameRunner';
import { createDefaultPath } from './path';
import { TargetingMode, canTarget, createTower } from './targeting';
import { UpgradePath } from './upgrade';

const path = createDefaultPath();
let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS: ${name}`);
    passed++;
  } catch (error) {
    console.error(`FAIL: ${name} - ${(error as Error).message}`);
    failed++;
  }
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  assert(actual === expected, `${message}: expected ${String(expected)}, got ${String(actual)}`);
}

function drainTraitBrokenEvents(game: ReturnType<typeof createGameRunner>) {
  return game.drainEvents().filter(event => event.type === 'trait_broken');
}

test('Metal applies 30% reduction with a one-damage floor while explosive and piercing hits bypass it', () => {
  const definition = ENEMY_DEFINITIONS[EnemyType.BulwarkBeetle];
  const ordinaryTarget = createEnemy(1, definition.type, path);
  const ordinary = resolveDamage(ordinaryTarget, 10);
  assertEqual(ordinary.damageApplied, 7, 'ordinary Metal hit should deal floor(10 * 0.7)');
  assertEqual(ordinaryTarget.hp, 8, 'ordinary Metal hit should leave exact HP');

  const floorTarget = createEnemy(2, EnemyType.IronCaterpillar, path);
  assertEqual(resolveDamage(floorTarget, 1).damageApplied, 1, 'Metal reduction should retain a one-damage floor');

  const explosiveTarget = createEnemy(3, definition.type, path);
  assertEqual(
    resolveDamage(explosiveTarget, 10, { damageType: DamageType.Explosive }).damageApplied,
    10,
    'explosive hit should bypass Metal'
  );

  const piercingTarget = createEnemy(4, definition.type, path);
  const piercingOptions = { damageType: DamageType.Normal, piercing: true };
  assertEqual(
    resolveDamage(piercingTarget, 10, piercingOptions).damageApplied,
    10,
    'piercing hit should bypass Metal'
  );
});

test('Shield consumes the first successful hit and status effect and emits trait_broken exactly once', () => {
  const game = createGameRunner({ startingLives: 20 });
  game.start();
  const enemy = createEnemy(10, ENEMY_DEFINITIONS[EnemyType.WardMoth].type, game.getPath());
  enemy.position = { ...game.getPath().getPointAtDistance(0).position };
  enemy.speed = 0;
  enemy.baseSpeed = 0;
  game.getActiveEnemies().push(enemy);
  game.getActiveProjectiles().push({
    id: 100,
    position: { ...enemy.position },
    targetId: enemy.id,
    speed: 0,
    damage: 2,
    towerType: TowerType.Slimefungus,
    alive: true,
  });

  game.update(1000);
  assertEqual(enemy.hp, enemy.maxHp, 'shielded first hit should not damage HP');
  assertEqual(enemy.shieldCharges, 0, 'shielded first hit should consume one charge');
  assert(
    !enemy.statusEffects.some(effect => effect.type === StatusEffectType.Slow),
    'shielded first hit should consume its status effect'
  );
  const firstEvents = drainTraitBrokenEvents(game);
  assertEqual(firstEvents.length, 1, 'shield consumption should emit one trait_broken event');
  assertEqual(firstEvents[0].trait, EnemyTrait.Shielded, 'event should identify Shielded');
  assertEqual(firstEvents[0].enemyId, enemy.id, 'event should identify the enemy');
  assertEqual(firstEvents[0].position.x, enemy.position.x, 'event should include enemy x');
  assertEqual(firstEvents[0].position.y, enemy.position.y, 'event should include enemy y');
  assertEqual(firstEvents[0].timestamp, 1000, 'event should include the hit timestamp');

  game.getActiveProjectiles().push({
    id: 101,
    position: { ...enemy.position },
    targetId: enemy.id,
    speed: 0,
    damage: 2,
    towerType: TowerType.Slimefungus,
    alive: true,
  });
  game.update(1001);
  assert(enemy.hp < enemy.maxHp, 'second hit should damage HP');
  assert(
    enemy.statusEffects.some(effect => effect.type === StatusEffectType.Slow),
    'second hit should apply its status effect'
  );
  assertEqual(
    drainTraitBrokenEvents(game).length,
    0,
    'later hits should not duplicate the shield event'
  );
});

test('Defensive suppression emits trait_broken only when it first takes effect', () => {
  const game = createGameRunner({ startingMoney: 5000, startingLives: 20 });
  const tower = game.placeTower(TowerType.Slimefungus, 720, 270, TargetingMode.First);
  assert(tower !== null, 'trait-disruption tower should be placed');
  assert(game.upgradeTower(tower.id, UpgradePath.Special).success, 'trait-disruption upgrade should be purchased');
  tower.lastFireTime = Number.POSITIVE_INFINITY;
  game.start();

  const enemy = createEnemy(20, EnemyType.IronCaterpillar, game.getPath());
  enemy.pathDistance = 1520;
  enemy.pathProgress = 1520;
  enemy.position = { ...game.getPath().getPointAtDistance(enemy.pathDistance).position };
  enemy.speed = 0;
  enemy.baseSpeed = 0;
  game.getActiveEnemies().push(enemy);

  const hit = (id: number, timestamp: number): void => {
    game.getActiveProjectiles().push({
      id,
      position: { ...enemy.position },
      targetId: enemy.id,
      sourceTowerId: tower.id,
      speed: 0,
      damage: 1,
      towerType: TowerType.Slimefungus,
      alive: true,
    });
    game.update(timestamp);
  };

  hit(200, 2000);
  const firstEvents = drainTraitBrokenEvents(game);
  assertEqual(firstEvents.length, 1, 'first Metal suppression should emit once');
  assertEqual(firstEvents[0].trait, EnemyTrait.Metal, 'suppression event should identify Metal');
  assertEqual(firstEvents[0].timestamp, 2000, 'suppression event should include timestamp');

  hit(201, 2001);
  assertEqual(
    drainTraitBrokenEvents(game).length,
    0,
    'refreshing active suppression should not emit again'
  );
});

test('GameRunner poison shield consumption emits trait_broken exactly once', () => {
  const game = createGameRunner({ startingLives: 20 });
  game.start();
  const enemy = createEnemy(25, EnemyType.WardMoth, game.getPath());
  enemy.position = { ...game.getPath().getPointAtDistance(0).position };
  enemy.speed = 0;
  enemy.baseSpeed = 0;
  enemy.statusEffects.push({
    type: StatusEffectType.Poison,
    duration: 5000,
    remaining: 5000,
    strength: 1,
  });
  game.getActiveEnemies().push(enemy);

  game.update(0);
  game.drainEvents();
  game.update(1000);
  assertEqual(enemy.shieldCharges, 0, 'first poison tick should consume the shield');
  assertEqual(enemy.hp, enemy.maxHp, 'shield should absorb the first poison tick');
  assertEqual(drainTraitBrokenEvents(game).length, 1, 'first poison tick should emit once');

  game.update(2000);
  assert(enemy.hp < enemy.maxHp, 'next poison tick should damage HP');
  assertEqual(drainTraitBrokenEvents(game).length, 0, 'next poison tick should not duplicate the event');
});

test('Camo rejects direct targeting without detection but takes exact production area damage', () => {
  const enemy = createEnemy(30, ENEMY_DEFINITIONS[EnemyType.VeilWasp].type, path);
  enemy.position = { x: 10, y: 0 };
  const tower = createTower(1, 0, 0, 100, TargetingMode.First);
  assertEqual(canTarget(tower, enemy), false, 'ordinary tower should not directly target Camo');

  const game = createGameRunner({ startingLives: 20 });
  game.start();
  const visibleTarget = createEnemy(31, EnemyType.ScoutBeetle, game.getPath());
  const camoAreaTarget = createEnemy(32, EnemyType.PaleMoth, game.getPath());
  visibleTarget.position = { ...game.getPath().getPointAtDistance(0).position };
  camoAreaTarget.position = { ...visibleTarget.position };
  visibleTarget.speed = 0;
  visibleTarget.baseSpeed = 0;
  camoAreaTarget.speed = 0;
  camoAreaTarget.baseSpeed = 0;
  const camoStartingHp = camoAreaTarget.hp;
  game.getActiveEnemies().push(visibleTarget, camoAreaTarget);
  game.getActiveProjectiles().push({
    id: 300,
    position: { ...visibleTarget.position },
    targetId: visibleTarget.id,
    speed: 0,
    damage: 4,
    towerType: TowerType.Puffball,
    areaRadius: 40,
    alive: true,
  });

  game.update(1000);
  assertEqual(camoAreaTarget.maxHp, 6, 'Pale Moth should use the exact definition HP');
  assertEqual(camoStartingHp - camoAreaTarget.hp, 4, 'production area transaction should apply exactly 4 damage');
  assertEqual(camoAreaTarget.hp, 2, 'untargeted production area hit should apply exactly 4 damage to Camo');
});

test('Two nearby Swarm Wasps receive 1.2x speed while one isolated Wasp does not', () => {
  const definition = ENEMY_DEFINITIONS[EnemyType.SwarmWasp];
  const nearbyA = createEnemy(40, definition.type, path);
  const nearbyB = createEnemy(41, definition.type, path);
  const isolated = createEnemy(42, definition.type, path);
  nearbyA.position = { x: 0, y: 0 };
  nearbyB.position = { x: 80, y: 0 };
  isolated.position = { x: 161, y: 0 };

  refreshSwarmLinkStates([nearbyA, nearbyB, isolated]);
  assertEqual(getSwarmLinkedSpeedMultiplier(nearbyA), 1.2, 'first nearby Wasp should receive exact speed multiplier');
  assertEqual(getSwarmLinkedSpeedMultiplier(nearbyB), 1.2, 'second nearby Wasp should receive exact speed multiplier');
  assertEqual(getSwarmLinkedSpeedMultiplier(isolated), 1, 'isolated Wasp should retain base speed multiplier');
  assertEqual(nearbyA.baseSpeed, definition.speed, 'Swarm Wasp should retain definition base speed');
});

test('Elite scales layer HP and reward by 2 while Boss scales them by 6 and sets isBoss', () => {
  const definition = ENEMY_DEFINITIONS[EnemyType.IronCaterpillar];
  const elite = createEnemy(50, definition.type, path);
  applyEnemyVariant(elite, EnemyVariant.Elite);
  assertEqual(elite.layers[0].maxHp, definition.layers[0] * 2, 'Elite first layer should scale by 2');
  assertEqual(elite.layers[1].maxHp, definition.layers[1] * 2, 'Elite second layer should scale by 2');
  assertEqual(elite.hp, 16, 'Elite should have exact total HP');
  assertEqual(elite.reward, definition.reward * 2, 'Elite reward should scale by 2');
  assertEqual(elite.isBoss, false, 'Elite should not be a boss');

  const boss = createEnemy(51, definition.type, path);
  applyEnemyVariant(boss, EnemyVariant.Boss);
  assertEqual(boss.layers[0].maxHp, definition.layers[0] * 6, 'Boss first layer should scale by 6');
  assertEqual(boss.layers[1].maxHp, definition.layers[1] * 6, 'Boss second layer should scale by 6');
  assertEqual(boss.hp, 48, 'Boss should have exact total HP');
  assertEqual(boss.reward, definition.reward * 6, 'Boss reward should scale by 6');
  assertEqual(boss.isBoss, true, 'Boss variant should set isBoss');
});

test('Boss Ward Moth retains Shielded and gains Camo by combining taught rules', () => {
  const definition = ENEMY_DEFINITIONS[EnemyType.WardMoth];
  const ordinary = createEnemy(60, definition.type, path);
  assertEqual(ordinary.traits.includes(EnemyTrait.Shielded), true, 'ordinary Ward Moth should be Shielded');
  assertEqual(ordinary.traits.includes(EnemyTrait.Camo), false, 'ordinary Ward Moth should not be Camo');

  const elderWard = createEnemy(61, definition.type, path);
  applyEnemyVariant(elderWard, EnemyVariant.Boss);
  assertEqual(elderWard.traits.includes(EnemyTrait.Shielded), true, 'Elder Ward should retain Shielded');
  assertEqual(elderWard.traits.includes(EnemyTrait.Camo), true, 'Elder Ward should gain Camo');
  assertEqual(elderWard.shieldCharges, 1, 'Elder Ward should retain one shield charge');
  assertEqual(elderWard.hp, 48, 'Elder Ward should have exact Boss HP');
  assertEqual(elderWard.reward, 240, 'Elder Ward should have exact Boss reward');
});

console.log(`Trait integration tests: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  throw new Error(`${failed} trait integration test(s) failed`);
}

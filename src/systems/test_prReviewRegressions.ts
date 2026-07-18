import { TowerType, getTowerDamageType } from '../entities/tower';
import {
  DamageType,
  Enemy,
  EnemyTrait,
  StatusEffectType,
  createEnemy,
  hasDisruptedTrait,
  isMarked,
  markEnemy,
  resolveDamage,
} from '../entities/enemy';
import { getHitEffectsForTowerType } from './collision';
import { createEconomy } from './economy';
import { GameRunner, createGameRunner } from './gameRunner';
import { createDefaultPath } from './path';
import { createRoundManager } from './roundManager';
import { TargetingMode } from './targeting';
import { UpgradePath } from './upgrade';
import { EnemyType, Wave, WaveSpawner } from './wave';

console.log('=== PR Review Regression Tests ===\n');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean): void {
  try {
    if (fn()) {
      passed++;
      console.log(`  ✓ ${name}`);
    } else {
      failed++;
      console.log(`  ✗ ${name}`);
    }
  } catch (error) {
    failed++;
    console.log(`  ✗ ${name}: ${error}`);
  }
}

function approximately(actual: number, expected: number, tolerance = 0.0001): boolean {
  return Math.abs(actual - expected) <= tolerance;
}

function addStationaryEnemy(
  game: GameRunner,
  id: number,
  type: EnemyType,
  pathDistance: number
): Enemy {
  const enemy = createEnemy(id, type, game.getPath());
  enemy.pathDistance = pathDistance;
  enemy.pathProgress = pathDistance;
  enemy.position = { ...game.getPath().getPointAtDistance(pathDistance).position };
  enemy.speed = 0;
  enemy.baseSpeed = 0;
  game.getActiveEnemies().push(enemy);
  return enemy;
}

function placeTowerOnEnemy(
  game: GameRunner,
  type: TowerType,
  enemy: Enemy,
  mode: TargetingMode = TargetingMode.First
) {
  return game.placeTower(type, enemy.position.x, enemy.position.y, mode);
}

test('isolated Sporecap performs its base attack', () => {
  const game = createGameRunner({ startingMoney: 5000 });
  game.start();
  const enemy = addStationaryEnemy(game, 1001, EnemyType.CrawlerCaterpillar, 500);
  const tower = placeTowerOnEnemy(game, TowerType.Sporecap, enemy);
  if (!tower || game.isTowerConnectedToNetwork(tower.id)) return false;

  const hpBefore = enemy.hp;
  game.update(1200);
  return enemy.hp < hpBefore;
});

test('Bulb Shooter area damage uses per-target falloff', () => {
  const game = createGameRunner({ startingMoney: 5000 });
  game.start();
  const directTarget = addStationaryEnemy(game, 1002, EnemyType.CrawlerCaterpillar, 1420);
  const nearTarget = addStationaryEnemy(game, 1003, EnemyType.CrawlerCaterpillar, 1410);
  const farTarget = addStationaryEnemy(game, 1004, EnemyType.CrawlerCaterpillar, 1385);
  const tower = placeTowerOnEnemy(game, TowerType.BulbShooter, directTarget);
  if (!tower) return false;

  game.update(1600);
  const nearDamage = nearTarget.maxHp - nearTarget.hp;
  const farDamage = farTarget.maxHp - farTarget.hp;
  return nearDamage > farDamage && farDamage > 0;
});

test('connected Special Thorn prioritizes an executable marked target', () => {
  const game = createGameRunner({ startingMoney: 5000 });
  game.start();
  const unmarkedFront = addStationaryEnemy(game, 1005, EnemyType.ScoutBeetle, 1420);
  const markedBehind = addStationaryEnemy(game, 1006, EnemyType.ScoutBeetle, 1410);
  markedBehind.hp = 0.2;
  markedBehind.layers[0].hp = 0.2;
  markEnemy(markedBehind);
  const tower = placeTowerOnEnemy(game, TowerType.ThornSniper, unmarkedFront);
  if (!tower || !game.upgradeTower(tower.id, UpgradePath.Special).success) return false;

  game.update(1600);
  game.update(1700);
  return !markedBehind.alive && unmarkedFront.alive;
});

test('Thorn execute waits until a marked target reaches its health threshold', () => {
  const game = createGameRunner({ startingMoney: 5000 });
  game.start();
  const target = addStationaryEnemy(game, 1007, EnemyType.CrawlerCaterpillar, 1420);
  markEnemy(target);
  const tower = placeTowerOnEnemy(game, TowerType.ThornSniper, target);
  if (!tower || !game.upgradeTower(tower.id, UpgradePath.Special).success) return false;

  game.update(1600);
  return target.alive && approximately(target.hp, 1.2);
});

test('configured wave completion bonus overrides the legacy formula', () => {
  const wave: Wave = {
    id: 1,
    name: 'Configured bonus',
    completionBonus: 85,
    groups: [],
    delayBetweenGroups: 0,
    totalDuration: 0,
  };
  const spawner = new WaveSpawner(createDefaultPath(), [wave]);
  const economy = createEconomy({ startingMoney: 0 });
  const rounds = createRoundManager(spawner, economy, { maxRounds: 1 });
  rounds.startFirstRound();
  rounds.startRound(0);
  spawner.update(0);
  rounds.checkRoundCompletion(0, 1);
  return economy.getMoney() === 85;
});

test('far Sporecap cannot create a disconnected network root', () => {
  const game = createGameRunner({ startingMoney: 5000 });
  game.start();
  const tower = game.placeTower(TowerType.Sporecap, 100, 100, TargetingMode.First);
  return tower !== null && !game.isTowerConnectedToNetwork(tower.id);
});

test('connected Special Sporecap marks its direct target', () => {
  const game = createGameRunner({ startingMoney: 5000 });
  game.start();
  const target = addStationaryEnemy(game, 1008, EnemyType.CrawlerCaterpillar, 1420);
  const tower = placeTowerOnEnemy(game, TowerType.Sporecap, target);
  if (!tower || !game.upgradeTower(tower.id, UpgradePath.Special).success) return false;

  game.update(1000);
  return isMarked(target);
});

test('connected Special Puffball does not apply Sporecap marks', () => {
  const game = createGameRunner({ startingMoney: 5000 });
  game.start();
  const target = addStationaryEnemy(game, 1009, EnemyType.CrawlerCaterpillar, 1420);
  const tower = placeTowerOnEnemy(game, TowerType.Puffball, target);
  if (!tower || !game.upgradeTower(tower.id, UpgradePath.Special).success) return false;

  game.update(1000);
  return !isMarked(target);
});

test('Bulb Shooter direct hits are explosive', () =>
  getTowerDamageType(TowerType.BulbShooter) === DamageType.Explosive
);

test('fractional damage remains fractional after Metal reduction', () => {
  const game = createGameRunner();
  const target = createEnemy(1010, EnemyType.IronCaterpillar, game.getPath());
  const result = resolveDamage(target, 0.5, { applyMarkBonus: false });
  return approximately(result.damageApplied, 0.35);
});

test('base Lumen Oracle hit effects do not reveal Camo', () =>
  !getHitEffectsForTowerType(TowerType.LumenOracle, 1).some(
    effect => effect.type === 'reveal_camo'
  )
);

test('mark bonus is opt-in for connected damage only', () => {
  const game = createGameRunner();
  const isolatedHitTarget = createEnemy(1011, EnemyType.CrawlerCaterpillar, game.getPath());
  const connectedHitTarget = createEnemy(1012, EnemyType.CrawlerCaterpillar, game.getPath());
  markEnemy(isolatedHitTarget);
  markEnemy(connectedHitTarget);

  const isolated = resolveDamage(isolatedHitTarget, 0.5);
  const connected = resolveDamage(connectedHitTarget, 0.5, { applyMarkBonus: true });
  return approximately(isolated.damageApplied, 0.5) && approximately(connected.damageApplied, 0.6);
});

test('connected Special Slimefungus suppresses Metal before direct damage', () => {
  const game = createGameRunner({ startingMoney: 5000 });
  game.start();
  const target = addStationaryEnemy(game, 1013, EnemyType.IronCaterpillar, 1420);
  const tower = placeTowerOnEnemy(game, TowerType.Slimefungus, target);
  if (!tower) return false;
  if (!game.upgradeTower(tower.id, UpgradePath.Damage).success) return false;
  if (!game.upgradeTower(tower.id, UpgradePath.Special).success) return false;

  game.update(1000);
  return target.hp === target.maxHp - tower.damage && hasDisruptedTrait(target, EnemyTrait.Metal);
});

test('Seeded Payload arms once after three follow-up connected hits', () => {
  const game = createGameRunner({ startingMoney: 5000 });
  game.start();
  const target = addStationaryEnemy(game, 1014, EnemyType.BulwarkBeetle, 1420);
  const tower = placeTowerOnEnemy(game, TowerType.BulbShooter, target);
  if (!tower || !game.upgradeTower(tower.id, UpgradePath.Special).success) return false;

  game.update(1200);
  const noPayloadOnSeedHit = game.getSeededPayloads().length === 0;
  game.update(2400);
  game.update(3600);
  const stillWaiting = game.getSeededPayloads().length === 0;
  game.update(4800);
  const armedOnce = game.getSeededPayloads().length === 1;
  return noPayloadOnSeedHit && stillWaiting && armedOnce;
});

test('Chorus Light is Oracle-driven, connected, and non-stacking', () => {
  const game = createGameRunner({ startingMoney: 10000 });
  game.start();
  const oracleA = game.placeTower(TowerType.LumenOracle, 720, 230, TargetingMode.First);
  const oracleB = game.placeTower(TowerType.LumenOracle, 720, 370, TargetingMode.First);
  const recipient = game.placeTower(TowerType.Puffball, 620, 300, TargetingMode.First);
  const sporecap = game.placeTower(TowerType.Sporecap, 650, 300, TargetingMode.First);
  if (!oracleA || !oracleB || !recipient || !sporecap) return false;
  if (!game.upgradeTower(oracleA.id, UpgradePath.Special).success) return false;
  if (!game.upgradeTower(oracleB.id, UpgradePath.Special).success) return false;
  if (!game.upgradeTower(recipient.id, UpgradePath.Special).success) return false;

  const buff = game.getTowerBuffInfo(recipient.id);
  return buff !== null && approximately(buff.buffStrength, 0.2) && buff.sources === 1;
});

test('connected Special Puffball field deals persistent damage', () => {
  const game = createGameRunner({ startingMoney: 5000 });
  game.start();
  const target = addStationaryEnemy(game, 1015, EnemyType.CrawlerCaterpillar, 1420);
  const tower = placeTowerOnEnemy(game, TowerType.Puffball, target);
  if (!tower || !game.upgradeTower(tower.id, UpgradePath.Special).success) return false;

  game.update(1000);
  const [field] = game.getLingeringFields();
  if (!field || field.duration !== 6000 || !approximately(field.slowStrength, 0.25)) return false;
  const hpAfterImpact = target.hp;
  game.update(1100);
  return target.hp < hpAfterImpact;
});

test('connection-gated effects become dormant when their source disconnects', () => {
  const game = createGameRunner({ startingMoney: 5000 });
  game.start();
  const target = addStationaryEnemy(game, 1017, EnemyType.CrawlerCaterpillar, 1420);
  const tower = placeTowerOnEnemy(game, TowerType.Puffball, target);
  if (!tower || !game.upgradeTower(tower.id, UpgradePath.Special).success) return false;

  game.update(1000);
  if (game.getLingeringFields().length !== 1) return false;
  game.sellTower(tower.id);
  const hpWhileConnected = target.hp;
  game.update(1100);
  return target.hp === hpWhileConnected;
});

test('base Oracle can target Camo without sharing reveal', () => {
  const game = createGameRunner({ startingMoney: 5000 });
  game.start();
  const target = addStationaryEnemy(game, 1016, EnemyType.VeilWasp, 1420);
  const tower = placeTowerOnEnemy(game, TowerType.LumenOracle, target);
  if (!tower) return false;

  game.update(1000);
  return target.hp < target.maxHp &&
    !target.statusEffects.some(effect => effect.type === StatusEffectType.Revealed);
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);

if (failed > 0) {
  process.exit(1);
}

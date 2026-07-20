import { EvolutionPath } from '../content/evolutionDefinitions';
import { EnemyTrait, EnemyType } from '../content/enemyDefinitions';
import {
  Enemy,
  StatusEffectType,
  createEnemy,
  disruptEnemyTrait,
  hasActiveShield,
  hasEnemyTrait,
  isMarked,
  markEnemy,
  updateStatusEffects,
} from '../entities/enemy';
import { Projectile, TowerType } from '../entities/tower';
import { TowerWithGrowth } from './upgrade';
import { GameRunner, createGameRunner } from './gameRunner';
import { calculateMyceliumNetwork, getBridgeDisconnectImpact } from './myceliumNetwork';
import { TargetingMode } from './targeting';

let passed = 0;
let failed = 0;

function test(name: string, run: () => void): void {
  try {
    run();
    passed++;
    console.log(`PASS: ${name}`);
  } catch (error) {
    failed++;
    const message = error instanceof Error ? error.message : String(error);
    console.error(`FAIL: ${name} - ${message}`);
  }
}

function assert(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  assert(actual === expected, `${message}: expected ${String(expected)}, got ${String(actual)}`);
}

function assertApproximately(actual: number, expected: number, message: string): void {
  assert(Math.abs(actual - expected) <= 0.0001, `${message}: expected ${String(expected)}, got ${String(actual)}`);
}

function hasEventType(event: { readonly type: string }, type: string): boolean {
  return event.type === type;
}

function addEnemy(game: GameRunner, id: number, type: EnemyType, x = 500, y = 300): Enemy {
  const enemy = createEnemy(id, type, game.getPath());
  enemy.position = { x, y };
  enemy.pathDistance = 1000;
  enemy.pathProgress = 1000;
  enemy.speed = 0;
  enemy.baseSpeed = 0;
  game.getActiveEnemies().push(enemy);
  return enemy;
}

function makeDurable(enemy: Enemy, hp = 100): void {
  enemy.hp = hp;
  enemy.maxHp = hp;
  enemy.layers = [{ hp, maxHp: hp }];
  enemy.currentLayerIndex = 0;
}

function createConnectedSymbiote(
  type: TowerType,
  sourceX = 500,
  bridgeX = 650,
): { game: GameRunner; source: TowerWithGrowth; bridge: TowerWithGrowth } {
  const game = createGameRunner({ startingMoney: 50000, startingLives: 20 });
  const source = game.placeTower(type, sourceX, 300, TargetingMode.First);
  const bridge = game.placeTower(TowerType.Sporecap, bridgeX, 300, TargetingMode.First);
  assert(source !== null && bridge !== null, 'source and bridge should be placed');
  assert(game.isTowerConnected(source.id), 'bridge should connect source before evolution');
  assert(game.matureTower(source.id).success, 'source should mature');
  assert(game.evolveTower(source.id, EvolutionPath.Symbiote).success, 'source should evolve');
  source.lastFireTime = Number.POSITIVE_INFINITY;
  bridge.lastFireTime = Number.POSITIVE_INFINITY;
  game.start();
  return { game, source, bridge };
}

function addInstantProjectile(
  game: GameRunner,
  source: TowerWithGrowth,
  enemy: Enemy,
  id: number,
): void {
  const projectile: Projectile = {
    id,
    position: { ...enemy.position },
    targetId: enemy.id,
    sourceTowerId: source.id,
    speed: 0,
    damage: source.damage,
    towerType: source.towerType,
    alive: true,
    effectStrength: source.effectStrength,
  };
  game.getActiveProjectiles().push(projectile);
}

function disconnect(game: GameRunner, bridge: TowerWithGrowth): void {
  assertEqual(game.sellTower(bridge.id, true).status, 'sold', 'bridge should sell');
}

function reconnect(game: GameRunner, x = 650): TowerWithGrowth {
  const bridge = game.placeTower(TowerType.Sporecap, x, 300, TargetingMode.First);
  assert(bridge !== null, 'replacement bridge should be placed');
  bridge.lastFireTime = Number.POSITIVE_INFINITY;
  return bridge;
}

function createDoubleChorusFixture(type: TowerType): {
  game: GameRunner;
  source: TowerWithGrowth;
  oracle: TowerWithGrowth;
} {
  const game = createGameRunner({ startingMoney: 50000, startingLives: 20 });
  const source = game.placeTower(type, 650, 300, TargetingMode.First);
  const oracleA = game.placeTower(TowerType.LumenOracle, 650, 200, TargetingMode.First);
  const oracleB = game.placeTower(TowerType.LumenOracle, 650, 400, TargetingMode.First);
  assert(source !== null && oracleA !== null && oracleB !== null, 'double Chorus fixture should place');

  for (const tower of [source, oracleA, oracleB]) {
    assert(game.matureTower(tower.id).success, 'double Chorus fixture should mature');
    assert(game.evolveTower(tower.id, EvolutionPath.Symbiote).success, 'double Chorus fixture should evolve');
    tower.lastFireTime = Number.POSITIVE_INFINITY;
  }

  game.start();
  return { game, source, oracle: oracleA };
}

test('graph calculation remains deterministic across chains, ties, and disconnects', () => {
  const config = {
    kernelPosition: { x: 0, y: 0 }, kernelReach: 100, towerReach: 90,
    towers: [
      { id: 1, position: { x: 80, y: 0 } }, { id: 2, position: { x: 160, y: 0 } },
      { id: 3, position: { x: 240, y: 0 } }, { id: 4, position: { x: 500, y: 0 } },
    ],
  };
  const state = calculateMyceliumNetwork(config);
  assert(state.connectedTowerIds.has(3) && !state.connectedTowerIds.has(4), 'chain should stop at isolated tower');
  assertEqual(state.connections.length, 3, 'connected towers should have one parent link');
  assertEqual(getBridgeDisconnectImpact(config, 2).join(','), '3', 'bridge impact should be deterministic');
});

test('graph ordering uses ascending tower IDs for equal-distance ties', () => {
  const state = calculateMyceliumNetwork({
    kernelPosition: { x: 0, y: 0 },
    kernelReach: 100,
    towerReach: 90,
    towers: [
      { id: 2, position: { x: 80, y: 0 } },
      { id: 1, position: { x: -80, y: 0 } },
    ],
  });

  assertEqual(state.connections[0].toId, 1, 'first equal-distance connection should use lower ID');
  assertEqual(state.connections[1].toId, 2, 'second equal-distance connection should use higher ID');
});

test('graph cycles connect each tower exactly once', () => {
  const state = calculateMyceliumNetwork({
    kernelPosition: { x: 0, y: 0 },
    kernelReach: 100,
    towerReach: 100,
    towers: [
      { id: 1, position: { x: 80, y: 0 } },
      { id: 2, position: { x: 80, y: 60 } },
      { id: 3, position: { x: 0, y: 120 } },
    ],
  });

  assertEqual(state.connectedTowerIds.size, 3, 'cycle should connect all towers');
  assertEqual(state.connections.length, 3, 'cycle should assign one parent per tower');
});

test('empty graphs have no connected or isolated towers', () => {
  const state = calculateMyceliumNetwork({
    kernelPosition: { x: 0, y: 0 },
    kernelReach: 100,
    towerReach: 90,
    towers: [],
  });

  assertEqual(state.connectedTowerIds.size, 0, 'empty graph should have no connected towers');
  assertEqual(state.isolatedTowerIds.size, 0, 'empty graph should have no isolated towers');
});

test('selling an isolated tower has no disconnect impact', () => {
  const impact = getBridgeDisconnectImpact({
    kernelPosition: { x: 0, y: 0 },
    kernelReach: 100,
    towerReach: 90,
    towers: [
      { id: 1, position: { x: 80, y: 0 } },
      { id: 2, position: { x: 500, y: 0 } },
    ],
  }, 2);

  assertEqual(impact.length, 0, 'isolated tower sale should disconnect nothing');
});

test('tower exactly on kernel reach boundary connects', () => {
  const state = calculateMyceliumNetwork({
    kernelPosition: { x: 0, y: 0 },
    kernelReach: 100,
    towerReach: 90,
    towers: [{ id: 1, position: { x: 100, y: 0 } }],
  });

  assert(state.connectedTowerIds.has(1), 'reach boundary should be inclusive');
});

test('Signal Cap marks only while connected and regains eligibility after reconnect', () => {
  const { game, source, bridge } = createConnectedSymbiote(TowerType.Sporecap);
  const connected = addEnemy(game, 100, EnemyType.CrawlerCaterpillar);
  makeDurable(connected);
  addInstantProjectile(game, source, connected, 1000);
  game.update(1000);
  const hpAfterInitialMark = connected.hp;

  addInstantProjectile(game, source, connected, 1001);
  game.update(1500);
  const refreshedMarks = connected.statusEffects.filter(effect => effect.type === StatusEffectType.Marked);
  assertEqual(refreshedMarks.length, 1, 'connected refresh should retain one mark');
  assertEqual(refreshedMarks[0].duration, 4000, 'refreshed mark should keep four-second duration');
  assertEqual(refreshedMarks[0].remaining, 4000, 'second Signal hit should refresh remaining duration');
  assertApproximately(
    hpAfterInitialMark - connected.hp,
    source.damage * 1.2,
    'marked connected hit should receive exact 1.2 damage amplification',
  );

  disconnect(game, bridge);
  const isolated = addEnemy(game, 101, EnemyType.IronCaterpillar);
  addInstantProjectile(game, source, isolated, 1002);
  game.update(1600);
  assert(!isMarked(isolated), 'isolated hit should not mark');

  reconnect(game);
  addInstantProjectile(game, source, isolated, 1003);
  game.update(1700);
  assert(isMarked(isolated), 'reconnected hit should mark again');
});

test('Reaper Thorn executes only connected marked targets at 25% and consumes shields instead', () => {
  const { game, source, bridge } = createConnectedSymbiote(TowerType.ThornSniper);
  const connected = addEnemy(game, 110, EnemyType.BulwarkBeetle);
  connected.hp = connected.maxHp * 0.25;
  markEnemy(connected);
  addInstantProjectile(game, source, connected, 1100);
  game.update(1100);
  assert(!connected.alive, 'connected marked target at threshold should execute');

  const shielded = addEnemy(game, 111, EnemyType.WardMoth);
  shielded.hp = shielded.maxHp * 0.25;
  markEnemy(shielded);
  addInstantProjectile(game, source, shielded, 1101);
  game.update(1101);
  assert(shielded.alive && shielded.shieldCharges === 0, 'shield should be consumed instead of executing');

  disconnect(game, bridge);
  const isolated = addEnemy(game, 112, EnemyType.BulwarkBeetle);
  isolated.hp = isolated.maxHp * 0.25;
  markEnemy(isolated);
  addInstantProjectile(game, source, isolated, 1102);
  game.update(1102);
  assert(isolated.alive, 'isolated Reaper should use ordinary damage, not Execute');
});

test('Fungal Carpet creates a connected six-second 25% slow damage field only', () => {
  const { game, source, bridge } = createConnectedSymbiote(TowerType.Puffball);
  const connected = addEnemy(game, 120, EnemyType.IronCaterpillar);
  makeDurable(connected);
  addInstantProjectile(game, source, connected, 1200);
  game.update(1200);
  const [field] = game.getLingeringFields();
  assert(field !== undefined, 'connected hit should create a field');
  assertEqual(field.type, 'fungal_carpet', 'field should expose canonical terminology');
  assertEqual(field.duration, 6000, 'field should last six seconds');
  assertEqual(field.slowStrength, 0.25, 'field should slow by 25%');
  const hpAfterImpact = connected.hp;
  game.update(1300);
  assert(connected.hp < hpAfterImpact, 'field should deal damage ticks');

  disconnect(game, bridge);
  const fieldBeforePause = game.getLingeringFields()[0];
  const hpBeforePause = connected.hp;
  const isolated = addEnemy(game, 121, EnemyType.IronCaterpillar);
  makeDurable(isolated);
  isolated.pathDistance = 0;
  isolated.pathProgress = 0;
  addInstantProjectile(game, source, isolated, 1201);
  game.update(2300);
  const fieldWhilePaused = game.getLingeringFields()[0];
  assertEqual(game.getLingeringFields().length, 1, 'isolated hit should not create another field');
  assertEqual(fieldWhilePaused.remaining, fieldBeforePause.remaining, 'disconnected field should pause its lifetime');
  assertEqual(connected.hp, hpBeforePause, 'disconnected field should pause damage ticks');

  reconnect(game);
  game.update(2400);
  const fieldAfterReconnect = game.getLingeringFields()[0];
  assert(fieldAfterReconnect.remaining < fieldWhilePaused.remaining, 'reconnected field should resume its lifetime');
  assert(connected.hp < hpBeforePause, 'reconnected field should resume damage ticks');
});

test('Trait Rot suppresses one trait for four seconds only while connected', () => {
  const { game, source, bridge } = createConnectedSymbiote(TowerType.Slimefungus);
  const connected = addEnemy(game, 130, EnemyType.IronCaterpillar);
  makeDurable(connected);
  addInstantProjectile(game, source, connected, 1300);
  game.update(1300);
  const disruption = connected.statusEffects.find(effect => effect.type === StatusEffectType.TraitDisrupted);
  assert(disruption !== undefined, 'connected hit should suppress a trait');
  assertEqual(disruption.duration, 4000, 'trait suppression should last four seconds');
  game.update(5301);
  assert(!connected.statusEffects.some(effect => effect.type === StatusEffectType.TraitDisrupted), 'trait should return after expiry');

  disconnect(game, bridge);
  const isolated = addEnemy(game, 131, EnemyType.IronCaterpillar);
  makeDurable(isolated);
  addInstantProjectile(game, source, isolated, 1301);
  game.update(5302);
  assert(!isolated.statusEffects.some(effect => effect.type === StatusEffectType.TraitDisrupted), 'isolated hit should not suppress');
});

test('Shielded Trait Rot expiry restores trait eligibility without recreating its charge', () => {
  const game = createGameRunner();
  const shielded = createEnemy(132, EnemyType.WardMoth, game.getPath());

  const disrupted = disruptEnemyTrait(shielded, 4000);
  assertEqual(disrupted, EnemyTrait.Shielded, 'Trait Rot should select the active Shielded trait');
  assertEqual(shielded.shieldCharges, 0, 'Trait Rot should consume the active shield charge');
  assert(!hasEnemyTrait(shielded, EnemyTrait.Shielded), 'Shielded eligibility should pause during suppression');

  updateStatusEffects(shielded, 4001);
  assert(hasEnemyTrait(shielded, EnemyTrait.Shielded), 'Shielded trait eligibility should return after expiry');
  assertEqual(shielded.shieldCharges, 0, 'expired Trait Rot must not recreate a consumed shield charge');
  assert(!hasActiveShield(shielded), 'restored trait metadata should remain inactive without a charge');
});

test('Seeded Payload arms on the third connected follow-up and emits one typed detonation event', () => {
  const { game, source, bridge } = createConnectedSymbiote(TowerType.BulbShooter);
  const target = addEnemy(game, 140, EnemyType.CrawlerCaterpillar);
  makeDurable(target);
  addInstantProjectile(game, source, target, 1400);
  game.update(1400);
  game.drainEvents();

  addInstantProjectile(game, bridge, target, 1401);
  game.update(1401);
  disconnect(game, bridge);
  const isolatedBridge = reconnect(game, 400);
  addInstantProjectile(game, isolatedBridge, target, 1402);
  game.update(1402);
  assertEqual(game.getSeededPayloads().length, 0, 'isolated hit should not advance the seed');
  const connectedBridge = reconnect(game);
  addInstantProjectile(game, connectedBridge, target, 1403);
  game.update(1403);
  addInstantProjectile(game, connectedBridge, target, 1404);
  game.update(1404);
  assertEqual(game.getSeededPayloads().length, 1, 'third connected follow-up should arm one payload');

  game.update(2404);
  const events = game.drainEvents().filter(event => event.type === 'seeded_payload_detonated');
  assertEqual(events.length, 1, 'detonation should emit once');
  assertEqual(events[0].sourceTowerId, source.id, 'event should identify source tower');
  assertEqual(events[0].targetEnemyId, target.id, 'event should identify seeded target');
  assertEqual(events[0].timestamp, 2404, 'event should include detonation timestamp');
  assertEqual(game.getSeededPayloads().length, 0, 'detonated payload should be removed');
  game.update(3404);
  assertEqual(game.drainEvents().filter(event => hasEventType(event, 'seeded_payload_detonated')).length, 0, 'later updates should not re-emit');
});

test('Chorus shares Camo detection only while connected and restores it after reconnect', () => {
  const { game, bridge } = createConnectedSymbiote(TowerType.LumenOracle, 480, 640);
  const recipient = game.placeTower(TowerType.Sporecap, 710, 250, TargetingMode.First);
  assert(recipient !== null && game.isTowerConnected(recipient.id), 'recipient should connect directly');
  recipient.projectileSpeed = 0;
  const visibleByChorus = addEnemy(game, 150, EnemyType.VeilWasp);
  visibleByChorus.pathDistance = 1400;
  visibleByChorus.pathProgress = 1400;
  game.update(1500);
  assert(recipient.sharedCamoDetection === true, 'connected Chorus should enable recipient detection');
  assert(visibleByChorus.hp < visibleByChorus.maxHp, 'connected Chorus should share Camo detection');
  visibleByChorus.alive = false;
  disconnect(game, bridge);
  const hidden = addEnemy(game, 151, EnemyType.VeilWasp);
  hidden.pathDistance = 1400;
  hidden.pathProgress = 1400;
  game.update(2100);
  assertEqual(hidden.hp, hidden.maxHp, 'isolated Chorus should not share detection');
  hidden.alive = false;
  reconnect(game, 640);
  const visibleAgain = addEnemy(game, 152, EnemyType.VeilWasp);
  visibleAgain.pathDistance = 1400;
  visibleAgain.pathProgress = 1400;
  game.update(2700);
  assert(visibleAgain.hp < visibleAgain.maxHp, 'reconnected Chorus should restore shared detection');
});

test('two Choruses apply one 1.2 multiplier to Signal Cap duration', () => {
  const { game, source } = createDoubleChorusFixture(TowerType.Sporecap);
  const marked = addEnemy(game, 153, EnemyType.CrawlerCaterpillar, 650, 300);
  makeDurable(marked);

  addInstantProjectile(game, source, marked, 1503);
  game.update(1503);
  const mark = marked.statusEffects.find(effect => effect.type === StatusEffectType.Marked);
  assertEqual(mark?.duration, 4800, 'two Choruses should multiply Mark duration exactly once');
});

test('two Choruses apply one 1.2 multiplier to Trait Rot duration', () => {
  const { game, source } = createDoubleChorusFixture(TowerType.Slimefungus);
  const target = addEnemy(game, 154, EnemyType.IronCaterpillar, 650, 300);
  makeDurable(target);

  addInstantProjectile(game, source, target, 1504);
  game.update(1504);
  const disruption = target.statusEffects.find(effect => effect.type === StatusEffectType.TraitDisrupted);
  assertEqual(disruption?.duration, 4800, 'two Choruses should multiply Trait Rot duration exactly once');
});

test('two Choruses apply one 1.2 multiplier to Fungal duration and damage', () => {
  const { game, source } = createDoubleChorusFixture(TowerType.Puffball);
  const target = addEnemy(game, 155, EnemyType.CrawlerCaterpillar, 650, 300);
  makeDurable(target);

  addInstantProjectile(game, source, target, 1505);
  game.update(1505);
  const field = game.getLingeringFields()[0];
  assertEqual(field.duration, 7200, 'two Choruses should multiply Fungal duration exactly once');
  assertApproximately(
    field.damagePerSecond,
    source.damage * source.effectStrength * 1.2,
    'two Choruses should multiply Fungal damage exactly once',
  );

  const hpAfterImpact = target.hp;
  game.update(1605);
  assertApproximately(
    hpAfterImpact - target.hp,
    field.damagePerSecond * 0.1,
    'Fungal damage tick should use the once-multiplied field damage',
  );
});

test('two Choruses apply one 1.2 multiplier to Seeded Payload explosion damage', () => {
  const { game, source, oracle } = createDoubleChorusFixture(TowerType.BulbShooter);
  const seeded = addEnemy(game, 156, EnemyType.CrawlerCaterpillar, 650, 300);
  makeDurable(seeded);
  addInstantProjectile(game, source, seeded, 1506);
  game.update(1506);

  for (const timestamp of [1507, 1508, 1509]) {
    addInstantProjectile(game, oracle, seeded, timestamp);
    game.update(timestamp);
  }
  const payload = game.getSeededPayloads()[0];
  assertApproximately(payload.damage, source.damage * 1.2, 'two Choruses should multiply payload damage exactly once');

  const victim = addEnemy(game, 157, EnemyType.CrawlerCaterpillar, payload.position.x, payload.position.y);
  makeDurable(victim);
  const hpBeforeDetonation = victim.hp;
  game.update(2509);
  assertApproximately(
    hpBeforeDetonation - victim.hp,
    payload.damage,
    'seeded explosion should deal the once-multiplied payload damage',
  );
});

test('two Choruses never change the Execute threshold', () => {
  const { game, source } = createDoubleChorusFixture(TowerType.ThornSniper);
  const aboveThreshold = addEnemy(game, 158, EnemyType.BulwarkBeetle, 650, 300);
  aboveThreshold.hp = aboveThreshold.maxHp * 0.28;
  markEnemy(aboveThreshold);
  addInstantProjectile(game, source, aboveThreshold, 1510);
  game.update(1510);
  assert(aboveThreshold.alive, 'Chorus must not raise the Execute threshold');
});

console.log(`mycelium network and Symbiote tests: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exit(1);

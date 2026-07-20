import { EvolutionEffect, EvolutionPath } from '../content/evolutionDefinitions';
import { EnemyTrait } from '../entities/enemy';
import { TowerType } from '../entities/tower';
import type { GameEvent } from '../systems/gameEvents';
import { EnemyType } from '../systems/wave';
import { VISUAL_THEME } from './visualTheme';
import {
  CombatEffectPool,
  createCombatEffectCommandBuffer,
  createImpactEffects,
  getNetworkPulseRenderData,
  isNetworkPulseForLink,
  writeCombatEffectCommand,
} from './combatEffects';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`);
}

function assertEqual(actual: unknown, expected: unknown, message: string): void {
  const actualText = JSON.stringify(actual);
  const expectedText = JSON.stringify(expected);
  assert(actualText === expectedText, `${message} (expected ${expectedText}, got ${actualText})`);
}

const position = Object.freeze({ x: 100, y: 120 });
const effectCases = [
  { kind: 'layer_broken', overlays: ['squash_ring'] },
  { kind: 'enemy_marked', overlays: ['mark_outline'] },
  { kind: 'enemy_slowed', overlays: ['slow_trail'] },
  { kind: 'trait_suppressed', overlays: ['trait_crack', 'trait_dim'] },
  { kind: 'enemy_revealed', overlays: ['reveal_sweep'] },
  { kind: 'seeded_detonated', overlays: ['bloom_ring', 'bloom_ring', 'bloom_ring'] },
  { kind: 'tower_evolved', overlays: ['growth_bloom'] },
  { kind: 'kernel_damaged', overlays: ['kernel_pulse'] },
] as const;

console.log('Testing combat feedback semantics...');
for (const effectCase of effectCases) {
  const effect = createImpactEffects({
    type: effectCase.kind,
    position,
    intensity: 10,
    seed: 77,
  });
  assert(effect.particles.length <= VISUAL_THEME.maxImpactParticles, `${effectCase.kind} respects impact budget`);
  assertEqual(effect.overlays.map(overlay => overlay.kind), effectCase.overlays, `${effectCase.kind} has discriminating overlays`);
}

const layerEffect = createImpactEffects({ type: 'layer_broken', position, intensity: 10, seed: 3 });
assert(layerEffect.particles.length > 0, 'layer break emits shell fragments');
assert(layerEffect.particles.every(particle => particle.kind === 'shell_fragment'), 'layer break particles are shell fragments');
const slowEffect = createImpactEffects({ type: 'enemy_slowed', position, intensity: 4, seed: 9 });
assert(slowEffect.particles.every(particle => particle.kind === 'blue_droplet'), 'slow emits only blue droplets');
assertEqual(
  createImpactEffects({ type: 'seeded_detonated', position, intensity: 8 }),
  createImpactEffects({ type: 'seeded_detonated', position, intensity: 8 }),
  'impact output is deterministic for a fixed seed',
);

console.log('Testing network pulse interpolation...');
const pulse = Object.freeze({
  fromId: 1,
  toId: 2,
  startedAt: 1_000,
  durationMs: 400,
  sourcePosition: Object.freeze({ x: 10, y: 20 }),
  targetPosition: Object.freeze({ x: 110, y: 220 }),
});
const movingPulse = getNetworkPulseRenderData(pulse, 1_100);
if (movingPulse === null) throw new Error('Assertion failed: active network pulse renders');
assert(movingPulse.progress > 0 && movingPulse.progress < 1, 'network pulse progress is bounded');
assertEqual(movingPulse.position, { x: 35, y: 70 }, 'network pulse interpolates between link endpoints');
assert(getNetworkPulseRenderData(pulse, 1_401) === null, 'expired network pulse is omitted');

console.log('Testing bounded reusable storage...');
const pool = new CombatEffectPool();
const particleStorage = pool.getParticleSlots();
const transientStorage = pool.getTransientSlots();
const particleSlotIdentities = [...particleStorage];
const transientSlotIdentities = [...transientStorage];
for (let index = 0; index < 1_000; index++) {
  pool.addImpact({
    type: index % 2 === 0 ? 'layer_broken' : 'seeded_detonated',
    position: { x: index % 20, y: index % 15 },
    intensity: 24,
    seed: index,
  });
  pool.addNetworkPulse({ fromId: 1, toId: 2 });
}
const budget = pool.getBudgetData();
assert(budget.activeParticles <= VISUAL_THEME.maxParticles, 'global particles are capped');
assert(budget.activeTransientEffects <= VISUAL_THEME.maxTransientEffects, 'transient effects are capped');
assert(pool.getParticleSlots() === particleStorage, 'particle storage is reused');
assert(pool.getTransientSlots() === transientStorage, 'transient storage is reused');
assert(particleStorage.every((slot, index) => slot === particleSlotIdentities[index]), 'particle slot identities survive a Wave-10-like burst');
assert(transientStorage.every((slot, index) => slot === transientSlotIdentities[index]), 'transient slot identities survive a Wave-10-like burst');
assert(pool.getActiveNetworkPulseCount() === 1, 'duplicate participating links refresh one pulse');
const pulseSlot = transientStorage.find(slot => slot.active && slot.kind === 'network_pulse');
if (pulseSlot === undefined) throw new Error('Assertion failed: active network pulse slot exists');
assert(isNetworkPulseForLink(pulseSlot, 1, 2), 'pulse belongs to its participating link');
assert(!isNetworkPulseForLink(pulseSlot, null, 2), 'pulse excludes a different source link');
assert(!isNetworkPulseForLink(pulseSlot, 1, 3), 'pulse excludes a different target link');

console.log('Testing refreshed pulse admission order at exact ring wrap...');
const wrappedPool = new CombatEffectPool();
wrappedPool.addNetworkPulse({ fromId: 4, toId: 8 });
for (let index = 0; index < VISUAL_THEME.maxTransientEffects - 1; index++) {
  wrappedPool.addImpact({
    type: 'enemy_marked',
    position,
    intensity: 1,
    seed: index,
  });
}
wrappedPool.addNetworkPulse({ fromId: 4, toId: 8 });
wrappedPool.addImpact({ type: 'enemy_marked', position, intensity: 1, seed: 100 });
assert(wrappedPool.getActiveNetworkPulseCount() === 1, 'refresh keeps the exact wrapped pulse active');
const refreshedPulse = wrappedPool.getTransientSlots().find(slot => isNetworkPulseForLink(slot, 4, 8));
assert(refreshedPulse !== undefined, 'refresh protects the newest logical effect from wrap eviction');
wrappedPool.update(0.421);
assert(wrappedPool.getActiveNetworkPulseCount() === 0, 'refreshed pulse still expires once its duration elapses');

const admissionPool = new CombatEffectPool();
admissionPool.addNetworkPulse({ fromId: 5, toId: 9 });
const admittedPulse = admissionPool.getTransientSlots().find(slot => isNetworkPulseForLink(slot, 5, 9));
if (admittedPulse === undefined) throw new Error('Assertion failed: admitted network pulse exists');
assert(admittedPulse.ageMs === 0, 'network pulse age begins at pool admission');
admissionPool.update(0.1);
assert(admittedPulse.ageMs === 100, 'network pulse age advances from admission through pool updates');

console.log('Testing actual GameEvent adapters...');
const context = Object.freeze({
  towerPositions: Object.freeze([{ id: 7, position: Object.freeze({ x: 300, y: 240 }) }]),
  kernelX: 900,
  kernelY: 300,
});
const layerEvent: GameEvent = { type: 'layer_broken', timestamp: 1, position, enemyId: 1, enemyType: EnemyType.ScoutBeetle, layersBroken: 2 };
const markEvent: GameEvent = { type: 'enemy_marked', timestamp: 2, position, enemyId: 1 };
const slowEvent: GameEvent = { type: 'enemy_slowed', timestamp: 3, position, enemyId: 1 };
const traitEvent: GameEvent = { type: 'trait_suppressed', timestamp: 4, position, enemyId: 1, trait: EnemyTrait.Metal };
const revealEvent: GameEvent = { type: 'enemy_revealed', timestamp: 5, position, enemyId: 1 };
const networkEvent: GameEvent = { type: 'network_triggered', timestamp: 6, sourceTowerId: null, targetTowerId: 7 };
const seededEvent: GameEvent = { type: 'seeded_payload_detonated', timestamp: 7, position, sourceTowerId: 7, targetEnemyId: 1 };
const evolvedEvent: GameEvent = { type: 'tower_evolved', timestamp: 8, towerId: 7, towerType: TowerType.Puffball, path: EvolutionPath.Predator, effect: EvolutionEffect.BurstSac };
const leakedEvent: GameEvent = { type: 'enemy_leaked', timestamp: 9, position, enemyId: 1, enemyType: EnemyType.ScoutBeetle, waveNumber: 2 };
const fixtures = [
  { event: layerEvent, expected: 'layer_broken' },
  { event: markEvent, expected: 'enemy_marked' },
  { event: slowEvent, expected: 'enemy_slowed' },
  { event: traitEvent, expected: 'trait_suppressed' },
  { event: revealEvent, expected: 'enemy_revealed' },
  { event: networkEvent, expected: 'network_triggered' },
  { event: seededEvent, expected: 'seeded_detonated' },
  { event: evolvedEvent, expected: 'tower_evolved' },
  { event: leakedEvent, expected: 'kernel_damaged' },
] as const;

for (const fixture of fixtures) {
  const command = createCombatEffectCommandBuffer();
  const commandIdentity = command;
  const kind = writeCombatEffectCommand(fixture.event, context, command);
  assert(command === commandIdentity, `${fixture.event.type} reuses caller-owned command storage`);
  assert(kind === fixture.expected, `${fixture.event.type} maps to ${fixture.expected}`);
}
const resolvedCommand = createCombatEffectCommandBuffer();
assert(writeCombatEffectCommand(evolvedEvent, context, resolvedCommand) === 'tower_evolved' && resolvedCommand.x === 300, 'tower event resolves tower position');
assert(writeCombatEffectCommand(leakedEvent, context, resolvedCommand) === 'kernel_damaged' && resolvedCommand.x === 900, 'leak resolves Kernel position');

console.log('Testing complete semantic event sequences...');
const brokenTraitEvent: GameEvent = {
  type: 'trait_broken',
  timestamp: 3,
  position,
  enemyId: 1,
  trait: EnemyTrait.Metal,
};
let suppressedCommands = 0;
let layerCommands = 0;
for (const event of [brokenTraitEvent, traitEvent]) {
  const kind = writeCombatEffectCommand(event, context, resolvedCommand);
  if (kind === 'trait_suppressed') suppressedCommands++;
  if (kind === 'layer_broken') layerCommands++;
}
assert(suppressedCommands === 1, 'suppression batch yields exactly one trait-suppressed command');
assert(layerCommands === 0, 'trait_broken remains available without borrowing the layer-broken visual');

const sequencePool = new CombatEffectPool();
sequencePool.processEvents([brokenTraitEvent, traitEvent], context.towerPositions, { x: context.kernelX, y: context.kernelY });
assert(sequencePool.getTransientSlots().filter(slot => slot.active && slot.kind === 'trait_crack').length === 1, 'suppression sequence admits one crack visual');
assert(sequencePool.getTransientSlots().filter(slot => slot.active && slot.kind === 'squash_ring').length === 0, 'suppression sequence admits no layer-break ring');

const ownershipPool = new CombatEffectPool();
ownershipPool.processEvents([evolvedEvent], context.towerPositions, { x: context.kernelX, y: context.kernelY });
assert(ownershipPool.isEventContextReleased(), 'successful event processing releases borrowed tower positions');
const adapterFailure = new RangeError('forced combat adapter failure');
const throwingTowerPositions = [...context.towerPositions];
Object.defineProperty(throwingTowerPositions, Symbol.iterator, {
  value: () => { throw adapterFailure; },
});
let expectedFailureObserved = false;
try {
  ownershipPool.processEvents([evolvedEvent], throwingTowerPositions, { x: context.kernelX, y: context.kernelY });
} catch (error) {
  if (error !== adapterFailure) throw error;
  expectedFailureObserved = true;
}
assert(expectedFailureObserved, 'adapter failure reaches the caller');
assert(ownershipPool.isEventContextReleased(), 'failed event processing releases borrowed tower positions');

const onboardingCelebrationPool = new CombatEffectPool();
onboardingCelebrationPool.addCelebration(position);
assert(onboardingCelebrationPool.getTransientSlots().filter(slot => slot.active && slot.kind === 'growth_bloom').length === 1, 'onboarding completion retains its local celebration');

console.log('Combat feedback tests passed');

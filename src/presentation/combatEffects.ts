import type { GameEvent } from '../systems/gameEvents';
import { EffectPriority } from '../systems/performanceBudget';
import type { Vec2 } from '../utils/vec2';
import { VISUAL_THEME } from './visualTheme';
import {
  createCombatEffectCommandBuffer,
  createCombatEffectContextBuffer,
  writeCombatEffectCommand,
  type CombatEffectCommandBuffer,
  type CombatEffectTowerPosition,
} from './combatEventAdapter';
import {
  emitCelebration,
  emitRuntimeImpact,
  type RuntimeImpactWriter,
  type RuntimeOverlaySpec,
  type RuntimeParticleSpec,
} from './combatEffectRuntime';
import type { ImpactEffectInput } from './combatEffectModel';
import {
  createParticleSlot,
  createTransientSlot,
  type CombatParticleSlot,
  type CombatTransientSlot,
  type EffectBudgetData,
  type MutableTransientSlot,
  type NetworkPulseTrigger,
} from './combatEffectPoolView';
import { EffectAdmissionCursor, getEffectPriority } from './effectAdmission';

const RELEASED_EVENT_TOWER_POSITIONS: readonly CombatEffectTowerPosition[] = Object.freeze([]);

export {
  COMBAT_EFFECT_KIND,
  createImpactEffects,
  getNetworkPulseRenderData,
} from './combatEffectModel';
export type {
  CombatEffectKind,
  ImpactEffectInput,
  ImpactEffects,
  ImpactOverlay,
  ImpactOverlayKind,
  ImpactParticle,
  ImpactParticleKind,
  NetworkPulse,
  NetworkPulseRenderData,
} from './combatEffectModel';
export {
  createCombatEffectCommandBuffer,
  createCombatEffectContextBuffer,
  writeCombatEffectCommand,
} from './combatEventAdapter';
export type {
  CombatEffectCommandBuffer,
  CombatEffectCommandKind,
  CombatEffectContextBuffer,
  CombatEffectTowerPosition,
} from './combatEventAdapter';
export {
  createNetworkPulseRenderBuffer,
  getPulseForLink,
  isNetworkPulseForLink,
} from './combatEffectPoolView';
export type {
  CombatParticleSlot,
  CombatTransientSlot,
  EffectBudgetData,
  NetworkPulseLink,
  NetworkPulseRenderBuffer,
  NetworkPulseTrigger,
} from './combatEffectPoolView';

function deriveSeed(input: ImpactEffectInput): number {
  if (input.seed !== undefined) return input.seed;
  let typeSeed = 0;
  for (let index = 0; index < input.type.length; index++) {
    typeSeed = Math.imul(typeSeed, 31) + input.type.charCodeAt(index);
  }
  return Math.round(input.position.x * 31 + input.position.y * 17 + input.intensity * 13 + typeSeed);
}

/** Fixed-capacity, allocation-free runtime storage for combat feedback. */
export class CombatEffectPool implements RuntimeImpactWriter {
  private readonly particles = Array.from({ length: VISUAL_THEME.maxParticles }, createParticleSlot);
  private readonly transients = Array.from({ length: VISUAL_THEME.maxTransientEffects }, createTransientSlot);
  private readonly eventCommand = createCombatEffectCommandBuffer();
  private readonly eventContext = createCombatEffectContextBuffer();
  private readonly particleAdmissions = new EffectAdmissionCursor();
  private readonly transientAdmissions = new EffectAdmissionCursor();

  /** Writes one semantic impact directly into reusable slots. */
  addImpact(input: ImpactEffectInput): void {
    this.eventCommand.kind = input.type;
    this.eventCommand.x = input.position.x;
    this.eventCommand.y = input.position.y;
    this.eventCommand.intensity = input.intensity;
    this.eventCommand.seed = deriveSeed(input);
    emitRuntimeImpact(this.eventCommand, this);
  }

  /** Queues an onboarding completion bloom at the borrowed position. */
  addCelebration(position: Readonly<Vec2>): void {
    this.eventCommand.kind = 'tower_evolved';
    this.eventCommand.x = position.x;
    this.eventCommand.y = position.y;
    emitCelebration(this.eventCommand, this);
  }

  /** Admits or refreshes one exact-link pulse whose age begins at zero. */
  addNetworkPulse(pulse: NetworkPulseTrigger): void {
    this.writeNetworkPulse(pulse.fromId, pulse.toId);
  }

  /** Processes one drained batch without retaining borrowed tower or Kernel positions. */
  processEvents(
    events: readonly GameEvent[],
    towerPositions: readonly CombatEffectTowerPosition[],
    kernelPosition: Readonly<Vec2>,
  ): void {
    try {
      this.eventContext.towerPositions = towerPositions;
      this.eventContext.kernelX = kernelPosition.x;
      this.eventContext.kernelY = kernelPosition.y;
      for (const event of events) {
        const kind = writeCombatEffectCommand(event, this.eventContext, this.eventCommand);
        if (kind === 'network_triggered') this.writeNetworkPulse(this.eventCommand.fromId, this.eventCommand.toId);
        else if (kind !== null) emitRuntimeImpact(this.eventCommand, this);
      }
    } finally {
      this.eventContext.towerPositions = RELEASED_EVENT_TOWER_POSITIONS;
      this.eventContext.kernelX = 0;
      this.eventContext.kernelY = 0;
    }
  }

  /** Reports whether event processing released its borrowed tower-position view. */
  isEventContextReleased(): boolean { return this.eventContext.towerPositions === RELEASED_EVENT_TOWER_POSITIONS; }

  /** Advances particle physics by seconds and transient lifetimes by converted milliseconds. */
  update(deltaSeconds: number): void {
    const deltaMs = Math.max(0, deltaSeconds * 1_000);
    for (const slot of this.particles) {
      if (!slot.active) continue;
      slot.remainingMs -= deltaMs;
      if (slot.remainingMs <= 0) { slot.active = false; continue; }
      slot.x += slot.velocityX * deltaSeconds;
      slot.y += slot.velocityY * deltaSeconds;
      slot.velocityY += slot.gravity * deltaSeconds;
    }
    for (const slot of this.transients) {
      if (!slot.active) continue;
      slot.remainingMs -= deltaMs;
      slot.ageMs += deltaMs;
      if (slot.remainingMs <= 0) slot.active = false;
    }
  }

  /** Deactivates all slots while preserving array, slot, and command-buffer identities. */
  clear(): void {
    for (const slot of this.particles) slot.active = false;
    for (const slot of this.transients) slot.active = false;
    this.particleAdmissions.reset();
    this.transientAdmissions.reset();
  }

  /** Returns the pool-owned particle view, stable for the pool lifetime. */
  getParticleSlots(): readonly CombatParticleSlot[] { return this.particles; }

  /** Returns the pool-owned transient view, stable for the pool lifetime. */
  getTransientSlots(): readonly CombatTransientSlot[] { return this.transients; }

  /** Returns an allocation-light occupancy snapshot at call time. */
  getBudgetData(): EffectBudgetData {
    let activeParticles = 0;
    let activeTransientEffects = 0;
    for (const slot of this.particles) if (slot.active) activeParticles++;
    for (const slot of this.transients) if (slot.active) activeTransientEffects++;
    return { activeParticles, activeTransientEffects, particleCapacity: this.particles.length, transientCapacity: this.transients.length };
  }

  /** Counts active exact-link pulses without allocating a filtered array. */
  getActiveNetworkPulseCount(): number {
    let count = 0;
    for (const slot of this.transients) {
      if (slot.active && slot.kind === 'network_pulse') count++;
    }
    return count;
  }

  /** Internal writer hook that fills fixed particle slots without temporary effect graphs. */
  emitParticles(command: CombatEffectCommandBuffer, spec: RuntimeParticleSpec): void {
    const count = Math.min(VISUAL_THEME.maxImpactParticles, spec.maxCount, Math.max(0, Math.round(command.intensity)));
    const priority = getEffectPriority(command.kind);
    let randomState = (Math.trunc(command.seed) >>> 0) || 1;
    for (let index = 0; index < count; index++) {
      randomState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;
      const angleJitter = randomState / 4_294_967_296;
      randomState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;
      const speedJitter = randomState / 4_294_967_296;
      const angle = Math.PI * 2 * index / Math.max(1, count) + (angleJitter - 0.5) * 0.35;
      const speed = spec.speed * (0.7 + speedJitter * 0.5);
      const slot = this.particleAdmissions.admit(this.particles, priority);
      if (slot === null) break;
      const sizeState = (Math.imul(randomState, 1_664_525) + 1_013_904_223) >>> 0;
      const durationState = (Math.imul(sizeState, 1_664_525) + 1_013_904_223) >>> 0;
      slot.active = true;
      slot.kind = spec.kind;
      slot.x = command.x;
      slot.y = command.y;
      slot.velocityX = Math.cos(angle) * speed;
      slot.velocityY = Math.sin(angle) * speed;
      slot.color = spec.color;
      slot.size = 2 + sizeState / 4_294_967_296 * 3;
      slot.durationMs = 240 + durationState / 4_294_967_296 * 260;
      slot.remainingMs = slot.durationMs;
      slot.gravity = spec.kind === 'blue_droplet' || spec.kind === 'splat' ? 55 : 0;
      randomState = durationState;
    }
  }

  /** Internal writer hook that fills one fixed transient slot. */
  emitOverlay(command: CombatEffectCommandBuffer, spec: RuntimeOverlaySpec): void {
    const slot = this.transientAdmissions.admit(this.transients, getEffectPriority(command.kind));
    if (slot === null) return;
    slot.active = true;
    slot.kind = spec.kind;
    slot.x = command.x;
    slot.y = command.y;
    slot.color = spec.color;
    slot.radius = spec.radius;
    slot.remainingMs = spec.durationMs;
    slot.durationMs = spec.durationMs;
    slot.sequence = spec.sequence;
    slot.fromId = null;
    slot.toId = -1;
    slot.ageMs = 0;
  }

  private writeNetworkPulse(fromId: number | null, toId: number): void {
    const existing = this.findNetworkPulse(fromId, toId);
    const slot = existing ?? this.transientAdmissions.admit(this.transients, EffectPriority.Standard);
    if (slot === null) return;
    slot.active = true;
    slot.kind = 'network_pulse';
    slot.remainingMs = 420;
    slot.durationMs = 420;
    slot.fromId = fromId;
    slot.toId = toId;
    slot.ageMs = 0;
    if (existing !== undefined) this.transientAdmissions.refresh(slot);
  }

  private findNetworkPulse(fromId: number | null, toId: number): MutableTransientSlot | undefined {
    for (const slot of this.transients) {
      if (slot.active && slot.kind === 'network_pulse' && slot.fromId === fromId && slot.toId === toId) return slot;
    }
    return undefined;
  }

}

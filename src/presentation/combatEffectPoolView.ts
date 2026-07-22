import type { Vec2 } from '../utils/vec2';
import type { ImpactOverlayKind, ImpactParticleKind } from './combatEffectModel';

/** Read-only particle view owned and reused by a CombatEffectPool. */
export type CombatParticleSlot = Readonly<{
  active: boolean;
  kind: ImpactParticleKind;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  color: string;
  size: number;
  remainingMs: number;
  durationMs: number;
  gravity: number;
}>;

/** Read-only transient view owned and reused by a CombatEffectPool. */
export type CombatTransientSlot = Readonly<{
  active: boolean;
  kind: ImpactOverlayKind | 'network_pulse';
  x: number;
  y: number;
  color: string;
  radius: number;
  remainingMs: number;
  durationMs: number;
  sequence: number;
  admissionSequence: number;
  fromId: number | null;
  toId: number;
  ageMs: number;
}>;

/** Mutable particle storage used only by the owning pool. */
export type MutableParticleSlot = { -readonly [Key in keyof CombatParticleSlot]: CombatParticleSlot[Key] };

/** Mutable transient storage used only by the owning pool. */
export type MutableTransientSlot = { -readonly [Key in keyof CombatTransientSlot]: CombatTransientSlot[Key] };

/** Snapshot of current fixed-pool occupancy and capacity. */
export type EffectBudgetData = Readonly<{
  activeParticles: number;
  activeTransientEffects: number;
  particleCapacity: number;
  transientCapacity: number;
}>;

/** Exact-link pulse request whose age begins when the pool admits it. */
export type NetworkPulseTrigger = Readonly<{
  fromId: number | null;
  toId: number;
}>;

/** Borrowed link endpoints used for one allocation-free pulse projection. */
export type NetworkPulseLink = Readonly<{
  sourcePosition: Readonly<Vec2>;
  targetPosition: Readonly<Vec2>;
}>;

/** Mutable pulse projection whose values remain valid until its next write. */
export type NetworkPulseRenderBuffer = {
  progress: number;
  x: number;
  y: number;
  color: string;
  radius: number;
};

/** Creates one inactive particle slot for fixed-pool initialization. */
export function createParticleSlot(): MutableParticleSlot {
  return { active: false, kind: 'spark', x: 0, y: 0, velocityX: 0, velocityY: 0, color: '#FFFFFF', size: 0, remainingMs: 0, durationMs: 0, gravity: 0 };
}

/** Creates one inactive transient slot for fixed-pool initialization. */
export function createTransientSlot(): MutableTransientSlot {
  return { active: false, kind: 'impact_flash', x: 0, y: 0, color: '#FFFFFF', radius: 0, remainingMs: 0, durationMs: 0, sequence: 0, admissionSequence: 0, fromId: null, toId: -1, ageMs: 0 };
}

/** Creates a mutable pulse projection buffer for repeated paint-time reuse. */
export function createNetworkPulseRenderBuffer(): NetworkPulseRenderBuffer {
  return { progress: 0, x: 0, y: 0, color: '#D8FFF1', radius: 5 };
}

/**
 * Projects one pulse into caller-owned storage using slot age in milliseconds.
 * The output remains valid until the caller writes that buffer again.
 */
export function getPulseForLink(
  slot: CombatTransientSlot,
  link: NetworkPulseLink,
  output: NetworkPulseRenderBuffer,
): boolean {
  if (!slot.active || slot.kind !== 'network_pulse' || slot.durationMs <= 0) return false;
  const progress = slot.ageMs / slot.durationMs;
  if (progress < 0 || progress > 1) return false;
  output.progress = progress;
  output.x = link.sourcePosition.x + (link.targetPosition.x - link.sourcePosition.x) * progress;
  output.y = link.sourcePosition.y + (link.targetPosition.y - link.sourcePosition.y) * progress;
  output.color = '#D8FFF1';
  output.radius = 5 + Math.sin(progress * Math.PI) * 3;
  return true;
}

/** Tests whether an active pulse belongs to one exact network link. */
export function isNetworkPulseForLink(
  slot: CombatTransientSlot,
  fromId: number | null,
  toId: number,
): boolean {
  return slot.active
    && slot.kind === 'network_pulse'
    && slot.fromId === fromId
    && slot.toId === toId;
}

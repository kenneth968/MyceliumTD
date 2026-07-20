import type { CombatEffectCommandBuffer } from './combatEventAdapter';
import type { ImpactOverlayKind, ImpactParticleKind } from './combatEffectModel';

/** Immutable particle recipe shared by every runtime emission. */
export type RuntimeParticleSpec = Readonly<{
  kind: ImpactParticleKind;
  color: string;
  maxCount: number;
  speed: number;
}>;

/** Immutable overlay recipe shared by every runtime emission. */
export type RuntimeOverlaySpec = Readonly<{
  kind: ImpactOverlayKind;
  color: string;
  radius: number;
  durationMs: number;
  sequence: number;
}>;

/** Allocation-free destination implemented by the fixed combat-effect pool. */
export interface RuntimeImpactWriter {
  emitParticles(command: CombatEffectCommandBuffer, spec: RuntimeParticleSpec): void;
  emitOverlay(command: CombatEffectCommandBuffer, spec: RuntimeOverlaySpec): void;
}

const SHELLS = { kind: 'shell_fragment', color: '#B9A58E', maxCount: 24, speed: 72 } as const;
const DROPLETS = { kind: 'blue_droplet', color: '#85CFFF', maxCount: 6, speed: 30 } as const;
const SEED_SPORES = { kind: 'spore', color: '#FFD76F', maxCount: 8, speed: 44 } as const;
const GROWTH_SPORES = { kind: 'spore', color: '#6FFFC1', maxCount: 10, speed: 36 } as const;
const SPLATS = { kind: 'splat', color: '#D97867', maxCount: 24, speed: 66 } as const;
const AREA_SPORES = { kind: 'spore', color: '#D7BDE2', maxCount: 24, speed: 38 } as const;
const POISON_SPORES = { kind: 'spore', color: '#58D68D', maxCount: 24, speed: 24 } as const;
const EXECUTION_SPARKS = { kind: 'spark', color: '#FFD76F', maxCount: 24, speed: 86 } as const;
const HIT_SPARKS = { kind: 'spark', color: '#F1FFF8', maxCount: 24, speed: 46 } as const;

const SQUASH_RING = { kind: 'squash_ring', color: '#F4D6A0', radius: 22, durationMs: 280, sequence: 0 } as const;
const MARK_OUTLINE = { kind: 'mark_outline', color: '#A7FFD8', radius: 18, durationMs: 420, sequence: 0 } as const;
const SLOW_TRAIL = { kind: 'slow_trail', color: '#65BFFF', radius: 20, durationMs: 460, sequence: 0 } as const;
const TRAIT_CRACK = { kind: 'trait_crack', color: '#FFB86B', radius: 16, durationMs: 460, sequence: 0 } as const;
const TRAIT_DIM = { kind: 'trait_dim', color: '#7D6A5B', radius: 13, durationMs: 520, sequence: 0 } as const;
const REVEAL_SWEEP = { kind: 'reveal_sweep', color: '#D8FFF1', radius: 34, durationMs: 420, sequence: 0 } as const;
const BLOOM_FIRST = { kind: 'bloom_ring', color: '#FFF1A8', radius: 14, durationMs: 360, sequence: 0 } as const;
const BLOOM_SECOND = { kind: 'bloom_ring', color: '#FFD76F', radius: 24, durationMs: 360, sequence: 1 } as const;
const BLOOM_THIRD = { kind: 'bloom_ring', color: '#DFA640', radius: 34, durationMs: 360, sequence: 2 } as const;
const GROWTH_BLOOM = { kind: 'growth_bloom', color: '#6FFFC1', radius: 34, durationMs: 620, sequence: 0 } as const;
const KERNEL_PULSE = { kind: 'kernel_pulse', color: '#FF6B6B', radius: 38, durationMs: 320, sequence: 0 } as const;
const DEATH_FLASH = { kind: 'impact_flash', color: '#FFF4E8', radius: 16, durationMs: 150, sequence: 0 } as const;
const AREA_RING = { kind: 'bloom_ring', color: '#9B59B6', radius: 42, durationMs: 360, sequence: 0 } as const;
const EXECUTION_FLASH = { kind: 'impact_flash', color: '#FF6B6B', radius: 24, durationMs: 180, sequence: 0 } as const;

function assertNever(value: never): never {
  throw new RangeError(`Unhandled runtime combat effect: ${String(value)}`);
}

/** Writes one buffered impact directly into reusable pool slots. */
export function emitRuntimeImpact(
  command: CombatEffectCommandBuffer,
  writer: RuntimeImpactWriter,
): void {
  switch (command.kind) {
    case 'layer_broken':
      writer.emitParticles(command, SHELLS);
      writer.emitOverlay(command, SQUASH_RING);
      return;
    case 'enemy_marked':
      writer.emitOverlay(command, MARK_OUTLINE);
      return;
    case 'enemy_slowed':
      writer.emitParticles(command, DROPLETS);
      writer.emitOverlay(command, SLOW_TRAIL);
      return;
    case 'trait_suppressed':
      writer.emitOverlay(command, TRAIT_CRACK);
      writer.emitOverlay(command, TRAIT_DIM);
      return;
    case 'enemy_revealed':
      writer.emitOverlay(command, REVEAL_SWEEP);
      return;
    case 'seeded_detonated':
      writer.emitParticles(command, SEED_SPORES);
      writer.emitOverlay(command, BLOOM_FIRST);
      writer.emitOverlay(command, BLOOM_SECOND);
      writer.emitOverlay(command, BLOOM_THIRD);
      return;
    case 'tower_evolved':
      writer.emitParticles(command, GROWTH_SPORES);
      writer.emitOverlay(command, GROWTH_BLOOM);
      return;
    case 'kernel_damaged':
      writer.emitOverlay(command, KERNEL_PULSE);
      return;
    case 'enemy_defeated':
      writer.emitParticles(command, SPLATS);
      writer.emitOverlay(command, DEATH_FLASH);
      return;
    case 'area_impact':
      writer.emitParticles(command, AREA_SPORES);
      writer.emitOverlay(command, AREA_RING);
      return;
    case 'enemy_poisoned':
      writer.emitParticles(command, POISON_SPORES);
      return;
    case 'enemy_executed':
      writer.emitParticles(command, EXECUTION_SPARKS);
      writer.emitOverlay(command, EXECUTION_FLASH);
      return;
    case 'enemy_struck':
      writer.emitParticles(command, HIT_SPARKS);
      return;
    case 'network_triggered':
    case null:
      return;
    default:
      return assertNever(command.kind);
  }
}

/** Writes the local onboarding bloom without borrowing a semantic gameplay key. */
export function emitCelebration(
  command: CombatEffectCommandBuffer,
  writer: RuntimeImpactWriter,
): void {
  writer.emitOverlay(command, GROWTH_BLOOM);
}

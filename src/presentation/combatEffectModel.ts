import type { Vec2 } from '../utils/vec2';
import { VISUAL_THEME } from './visualTheme';

/** Stable semantic keys used by preview and runtime combat presentation. */
export const COMBAT_EFFECT_KIND = {
  LayerBroken: 'layer_broken',
  EnemyMarked: 'enemy_marked',
  EnemySlowed: 'enemy_slowed',
  TraitSuppressed: 'trait_suppressed',
  EnemyRevealed: 'enemy_revealed',
  SeededDetonated: 'seeded_detonated',
  TowerEvolved: 'tower_evolved',
  KernelDamaged: 'kernel_damaged',
  EnemyDefeated: 'enemy_defeated',
  AreaImpact: 'area_impact',
  EnemyPoisoned: 'enemy_poisoned',
  EnemyStruck: 'enemy_struck',
  EnemyExecuted: 'enemy_executed',
} as const;

/** Supported semantic impact keys. */
export type CombatEffectKind = typeof COMBAT_EFFECT_KIND[keyof typeof COMBAT_EFFECT_KIND];
/** Particle silhouettes supported by the combat painter. */
export type ImpactParticleKind = 'shell_fragment' | 'blue_droplet' | 'spore' | 'spark' | 'splat';
/** Transient overlay silhouettes supported by the combat painter. */
export type ImpactOverlayKind =
  | 'squash_ring'
  | 'mark_outline'
  | 'slow_trail'
  | 'trait_crack'
  | 'trait_dim'
  | 'reveal_sweep'
  | 'bloom_ring'
  | 'growth_bloom'
  | 'kernel_pulse'
  | 'impact_flash';

/** Immutable input for deterministic preview generation. */
export type ImpactEffectInput = Readonly<{
  type: CombatEffectKind;
  position: Readonly<Vec2>;
  intensity: number;
  seed?: number;
}>;

/** Owned particle preview; durationMs is expressed in milliseconds. */
export type ImpactParticle = Readonly<{
  kind: ImpactParticleKind;
  position: Readonly<Vec2>;
  velocity: Readonly<Vec2>;
  color: string;
  size: number;
  durationMs: number;
  gravity: number;
}>;

/** Owned overlay preview; durationMs is expressed in milliseconds. */
export type ImpactOverlay = Readonly<{
  kind: ImpactOverlayKind;
  position: Readonly<Vec2>;
  color: string;
  radius: number;
  durationMs: number;
  sequence: number;
}>;

/** Newly allocated preview graph returned by createImpactEffects. */
export type ImpactEffects = Readonly<{
  particles: readonly ImpactParticle[];
  overlays: readonly ImpactOverlay[];
}>;

/** Immutable exact-link pulse input with millisecond timing. */
export type NetworkPulse = Readonly<{
  fromId: number | null;
  toId: number;
  startedAt: number;
  durationMs: number;
  sourcePosition: Readonly<Vec2>;
  targetPosition: Readonly<Vec2>;
}>;

/** Owned render snapshot for one pulse projection. */
export type NetworkPulseRenderData = Readonly<{
  fromId: number | null;
  toId: number;
  progress: number;
  position: Readonly<Vec2>;
  color: string;
  radius: number;
}>;

function clampCount(value: number): number {
  return Math.min(VISUAL_THEME.maxImpactParticles, Math.max(0, Math.round(value)));
}

function createRandom(seed: number): () => number {
  let state = (Math.trunc(seed) >>> 0) || 1;
  return () => {
    state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0;
    return state / 4_294_967_296;
  };
}

function getImpactSeed(input: ImpactEffectInput): number {
  if (input.seed !== undefined) return input.seed;
  let typeSeed = 0;
  for (let index = 0; index < input.type.length; index++) {
    typeSeed = Math.imul(typeSeed, 31) + input.type.charCodeAt(index);
  }
  return Math.round(input.position.x * 31 + input.position.y * 17 + input.intensity * 13 + typeSeed);
}

type ParticleSpawn = Readonly<{
  kind: ImpactParticleKind;
  color: string;
  angle: number;
  speed: number;
}>;

function particle(input: ImpactEffectInput, spawn: ParticleSpawn, random: () => number): ImpactParticle {
  return {
    kind: spawn.kind,
    position: { ...input.position },
    velocity: { x: Math.cos(spawn.angle) * spawn.speed, y: Math.sin(spawn.angle) * spawn.speed },
    color: spawn.color,
    size: 2 + random() * 3,
    durationMs: 240 + random() * 260,
    gravity: spawn.kind === 'blue_droplet' || spawn.kind === 'splat' ? 55 : 0,
  };
}

function radialParticles(
  input: ImpactEffectInput,
  options: Readonly<{ kind: ImpactParticleKind; color: string; count: number; speed: number }>,
): readonly ImpactParticle[] {
  const random = createRandom(getImpactSeed(input));
  const count = clampCount(options.count);
  return Array.from({ length: count }, (_, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(1, count) + (random() - 0.5) * 0.35;
    return particle(input, {
      kind: options.kind,
      color: options.color,
      angle,
      speed: options.speed * (0.7 + random() * 0.5),
    }, random);
  });
}

type OverlaySpec = Readonly<{
  kind: ImpactOverlayKind;
  color: string;
  radius: number;
  durationMs: number;
  sequence?: number;
}>;

function overlay(input: ImpactEffectInput, spec: OverlaySpec): ImpactOverlay {
  return { ...spec, position: { ...input.position }, sequence: spec.sequence ?? 0 };
}

function assertNever(value: never): never {
  throw new RangeError(`Unhandled combat effect: ${String(value)}`);
}

/** Builds a newly owned, deterministic preview graph for one semantic impact. */
export function createImpactEffects(input: ImpactEffectInput): ImpactEffects {
  switch (input.type) {
    case 'layer_broken':
      return {
        particles: radialParticles(input, { kind: 'shell_fragment', color: '#B9A58E', count: input.intensity, speed: 72 }),
        overlays: [overlay(input, { kind: 'squash_ring', color: '#F4D6A0', radius: 22, durationMs: 280 })],
      };
    case 'enemy_marked':
      return { particles: [], overlays: [overlay(input, { kind: 'mark_outline', color: '#A7FFD8', radius: 18, durationMs: 420 })] };
    case 'enemy_slowed':
      return {
        particles: radialParticles(input, { kind: 'blue_droplet', color: '#85CFFF', count: Math.min(6, input.intensity), speed: 30 }),
        overlays: [overlay(input, { kind: 'slow_trail', color: '#65BFFF', radius: 20, durationMs: 460 })],
      };
    case 'trait_suppressed':
      return { particles: [], overlays: [
        overlay(input, { kind: 'trait_crack', color: '#FFB86B', radius: 16, durationMs: 460 }),
        overlay(input, { kind: 'trait_dim', color: '#7D6A5B', radius: 13, durationMs: 520 }),
      ] };
    case 'enemy_revealed':
      return { particles: [], overlays: [overlay(input, { kind: 'reveal_sweep', color: '#D8FFF1', radius: 34, durationMs: 420 })] };
    case 'seeded_detonated':
      return { particles: radialParticles(input, { kind: 'spore', color: '#FFD76F', count: Math.min(8, input.intensity), speed: 44 }), overlays: [
        overlay(input, { kind: 'bloom_ring', color: '#FFF1A8', radius: 14, durationMs: 360, sequence: 0 }),
        overlay(input, { kind: 'bloom_ring', color: '#FFD76F', radius: 24, durationMs: 360, sequence: 1 }),
        overlay(input, { kind: 'bloom_ring', color: '#DFA640', radius: 34, durationMs: 360, sequence: 2 }),
      ] };
    case 'tower_evolved':
      return { particles: radialParticles(input, { kind: 'spore', color: '#6FFFC1', count: Math.min(10, input.intensity), speed: 36 }), overlays: [overlay(input, { kind: 'growth_bloom', color: '#6FFFC1', radius: 34, durationMs: 620 })] };
    case 'kernel_damaged':
      return { particles: [], overlays: [overlay(input, { kind: 'kernel_pulse', color: '#FF6B6B', radius: 38, durationMs: 320 })] };
    case 'enemy_defeated':
      return { particles: radialParticles(input, { kind: 'splat', color: '#D97867', count: input.intensity, speed: 66 }), overlays: [overlay(input, { kind: 'impact_flash', color: '#FFF4E8', radius: 16, durationMs: 150 })] };
    case 'area_impact':
      return { particles: radialParticles(input, { kind: 'spore', color: '#D7BDE2', count: input.intensity, speed: 38 }), overlays: [overlay(input, { kind: 'bloom_ring', color: '#9B59B6', radius: 42, durationMs: 360 })] };
    case 'enemy_poisoned':
      return { particles: radialParticles(input, { kind: 'spore', color: '#58D68D', count: input.intensity, speed: 24 }), overlays: [] };
    case 'enemy_executed':
      return { particles: radialParticles(input, { kind: 'spark', color: '#FFD76F', count: input.intensity, speed: 86 }), overlays: [overlay(input, { kind: 'impact_flash', color: '#FF6B6B', radius: 24, durationMs: 180 })] };
    case 'enemy_struck':
      return { particles: radialParticles(input, { kind: 'spark', color: '#F1FFF8', count: input.intensity, speed: 46 }), overlays: [] };
    default:
      return assertNever(input.type);
  }
}

/** Interpolates one active pulse at currentTime milliseconds into a new snapshot. */
export function getNetworkPulseRenderData(pulse: NetworkPulse, currentTime: number): NetworkPulseRenderData | null {
  const progress = (currentTime - pulse.startedAt) / pulse.durationMs;
  if (progress < 0 || progress > 1) return null;
  return {
    fromId: pulse.fromId,
    toId: pulse.toId,
    progress,
    position: {
      x: pulse.sourcePosition.x + (pulse.targetPosition.x - pulse.sourcePosition.x) * progress,
      y: pulse.sourcePosition.y + (pulse.targetPosition.y - pulse.sourcePosition.y) * progress,
    },
    color: '#D8FFF1',
    radius: 5 + Math.sin(progress * Math.PI) * 3,
  };
}

import { Vec2 } from '../utils/vec2';
import { Projectile, TowerType, TOWER_STATS } from '../entities/tower';
import { EvolutionPath } from '../content/evolutionDefinitions';
import type { EvolutionEffect } from '../content/evolutionDefinitions';
import type { TrailPoint } from './projectileTrail';
import { ProjectileRenderBuffer } from './projectileRenderBuffer';
export {
  createProjectileTrailTracker,
  createTrailPoint,
  ProjectileTrailTracker,
  shouldKeepTrailPoint,
  updateTrailPointOpacity,
} from './projectileTrail';
export type { TrailPoint } from './projectileTrail';
export { ProjectileRenderBuffer } from './projectileRenderBuffer';

export type ProjectileShape = 'cloud' | 'drop' | 'jaw' | 'bolt' | 'needle' | 'orb';
export type ProjectileTrailStyle = 'spore' | 'ribbon' | 'snap' | 'spark' | 'toxin' | 'pulse';

export interface ProjectileRenderData {
  id: number;
  position: Vec2;
  previousPosition: Vec2;
  color: string;
  glowColor: string;
  accentColor: string;
  size: number;
  shape: ProjectileShape;
  trailStyle: ProjectileTrailStyle;
  opacity: number;
  towerType: TowerType;
  hasTrail: boolean;
  trailPoints: readonly TrailPoint[];
  specialEffect?: string;
  evolutionEffect?: EvolutionEffect;
}

export interface ProjectileRenderCollection {
  projectiles: ProjectileRenderData[];
  trails: Map<number, TrailPoint[]>;
}

const TOWER_COLORS: Record<TowerType, {
  primary: string;
  glow: string;
  accent: string;
  size: number;
  shape: ProjectileShape;
  trailStyle: ProjectileTrailStyle;
}> = {
  [TowerType.Puffball]: {
    primary: '#9B59B6',
    glow: '#E8DAEF',
    accent: '#F7DC6F',
    size: 8,
    shape: 'cloud',
    trailStyle: 'spore',
  },
  [TowerType.Slimefungus]: {
    primary: '#3498DB',
    glow: '#D4E6F1',
    accent: '#FF69B4',
    size: 7,
    shape: 'drop',
    trailStyle: 'ribbon',
  },
  [TowerType.ThornSniper]: {
    primary: '#E74C3C',
    glow: '#FADBD8',
    accent: '#32CD32',
    size: 12,
    shape: 'jaw',
    trailStyle: 'snap',
  },
  [TowerType.LumenOracle]: {
    primary: '#1ABC9C',
    glow: '#D1F2EB',
    accent: '#A3E4D7',
    size: 6,
    shape: 'bolt',
    trailStyle: 'spark',
  },
  [TowerType.BulbShooter]: {
    primary: '#27AE60',
    glow: '#D5F5E3',
    accent: '#FF8C42',
    size: 7,
    shape: 'needle',
    trailStyle: 'toxin',
  },
  [TowerType.Sporecap]: {
    primary: '#8E44AD',
    glow: '#D7BDE2',
    accent: '#FF00FF',
    size: 10,
    shape: 'orb',
    trailStyle: 'pulse',
  },
};

const EVOLUTION_RENDER_STYLES: Readonly<Record<EvolutionPath, {
  readonly accentColor: string;
  readonly sizeIncrease: number;
}>> = {
  [EvolutionPath.Predator]: { accentColor: '#FF5A5F', sizeIncrease: 2 },
  [EvolutionPath.Specialist]: { accentColor: '#F5B041', sizeIncrease: 1 },
  [EvolutionPath.Symbiote]: { accentColor: '#58D68D', sizeIncrease: 1 },
};

export function getProjectileRenderData(
  projectile: Projectile,
  previousPosition?: Vec2
): ProjectileRenderData {
  const colors = TOWER_COLORS[projectile.towerType] || TOWER_COLORS[TowerType.Puffball];
  const stats = TOWER_STATS[projectile.towerType];
  const evolutionPath = projectile.attackProfile?.evolutionPath;
  const evolutionStyle = evolutionPath ? EVOLUTION_RENDER_STYLES[evolutionPath] : null;

  return {
    id: projectile.id,
    position: { ...projectile.position },
    previousPosition: previousPosition ? { ...previousPosition } : { ...projectile.position },
    color: colors.primary,
    glowColor: colors.glow,
    accentColor: evolutionStyle?.accentColor ?? colors.accent,
    size: colors.size + (evolutionStyle?.sizeIncrease ?? 0),
    shape: colors.shape,
    trailStyle: colors.trailStyle,
    opacity: 1.0,
    towerType: projectile.towerType,
    hasTrail: true,
    trailPoints: [],
    specialEffect: stats.specialEffect,
    evolutionEffect: projectile.attackProfile?.evolutionEffect ?? undefined,
  };
}

export function getTrailColor(towerType: TowerType): string {
  return TOWER_COLORS[towerType]?.glow || '#FFFFFF';
}

/** Creates reusable projectile render storage whose frame view is borrowed until its next update. */
export function createProjectileRenderBuffer(): ProjectileRenderBuffer {
  return new ProjectileRenderBuffer(getProjectileRenderData);
}

export interface TrailSegment {
  start: Vec2;
  end: Vec2;
  opacity: number;
  color: string;
}

export function getTrailSegments(
  towerType: TowerType,
  trailPoints: TrailPoint[]
): TrailSegment[] {
  const segments: TrailSegment[] = [];
  const color = getTrailColor(towerType);

  for (let i = 1; i < trailPoints.length; i++) {
    const prev = trailPoints[i - 1];
    const curr = trailPoints[i];

    segments.push({
      start: prev.position,
      end: curr.position,
      opacity: (prev.opacity + curr.opacity) / 2,
      color,
    });
  }

  return segments;
}

export function getProjectileVelocity(projectile: Projectile): Vec2 {
  return {
    x: projectile.speed * 0.1,
    y: projectile.speed * 0.1,
  };
}

export interface ProjectileAnimationState {
  scale: number;
  rotation: number;
  pulsePhase: number;
}

export function getAnimationState(
  projectile: Projectile,
  time: number,
  baseScale: number = 1.0
): ProjectileAnimationState {
  const pulseSpeed = 0.005;
  const pulsePhase = (time * pulseSpeed) % (2 * Math.PI);

  return {
    scale: baseScale * (1 + 0.1 * Math.sin(pulsePhase)),
    rotation: (time * 0.001) % (2 * Math.PI),
    pulsePhase,
  };
}

export function calculateProjectileStretch(
  projectile: Projectile,
  deltaTime: number
): { scaleX: number; scaleY: number } {
  if (projectile.speed === 0) {
    return { scaleX: 1.0, scaleY: 1.0 };
  }

  const stretchFactor = 1 + (projectile.speed / 500) * 0.3;
  const normalizedStretch = Math.min(stretchFactor, 2.0);

  return {
    scaleX: normalizedStretch,
    scaleY: 1 / Math.sqrt(normalizedStretch),
  };
}

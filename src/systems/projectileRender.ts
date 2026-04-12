import { Vec2 } from '../utils/vec2';
import { Projectile, TowerType, TOWER_STATS } from '../entities/tower';

export interface TrailPoint {
  position: Vec2;
  timestamp: number;
  opacity: number;
}

export interface ProjectileRenderData {
  id: number;
  position: Vec2;
  previousPosition: Vec2;
  color: string;
  glowColor: string;
  size: number;
  opacity: number;
  towerType: TowerType;
  hasTrail: boolean;
  trailPoints: TrailPoint[];
  specialEffect?: string;
}

export interface ProjectileRenderCollection {
  projectiles: ProjectileRenderData[];
  trails: Map<number, TrailPoint[]>;
}

const TOWER_COLORS: Record<TowerType, { primary: string; glow: string; size: number }> = {
  [TowerType.PuffballFungus]: { primary: '#9B59B6', glow: '#E8DAEF', size: 8 },
  [TowerType.OrchidTrap]: { primary: '#3498DB', glow: '#D4E6F1', size: 7 },
  [TowerType.VenusFlytower]: { primary: '#E74C3C', glow: '#FADBD8', size: 12 },
  [TowerType.BioluminescentShroom]: { primary: '#1ABC9C', glow: '#D1F2EB', size: 6 },
  [TowerType.StinkhornLine]: { primary: '#27AE60', glow: '#D5F5E3', size: 7 },
  [TowerType.MyceliumNetwork]: { primary: '#8E44AD', glow: '#D7BDE2', size: 10 },
};

const MAX_TRAIL_POINTS = 20;
const TRAIL_FADE_RATE = 0.85;
const MIN_OPACITY = 0.1;

export function getProjectileRenderData(
  projectile: Projectile,
  previousPosition?: Vec2
): ProjectileRenderData {
  const colors = TOWER_COLORS[projectile.towerType] || TOWER_COLORS[TowerType.PuffballFungus];
  const stats = TOWER_STATS[projectile.towerType];

  return {
    id: projectile.id,
    position: { ...projectile.position },
    previousPosition: previousPosition ? { ...previousPosition } : { ...projectile.position },
    color: colors.primary,
    glowColor: colors.glow,
    size: colors.size,
    opacity: 1.0,
    towerType: projectile.towerType,
    hasTrail: true,
    trailPoints: [],
    specialEffect: stats.specialEffect,
  };
}

export function createTrailPoint(position: Vec2, timestamp: number, opacity: number = 1.0): TrailPoint {
  return { position: { ...position }, timestamp, opacity };
}

export function getTrailColor(towerType: TowerType): string {
  return TOWER_COLORS[towerType]?.glow || '#FFFFFF';
}

export function updateTrailPointOpacity(point: TrailPoint, fadeFactor: number = TRAIL_FADE_RATE): TrailPoint {
  return {
    ...point,
    opacity: Math.max(point.opacity * fadeFactor, MIN_OPACITY),
  };
}

export function shouldKeepTrailPoint(point: TrailPoint): boolean {
  return point.opacity > MIN_OPACITY;
}

export class ProjectileTrailTracker {
  private trails: Map<number, TrailPoint[]>;
  private maxPoints: number;
  private fadeRate: number;

  constructor(maxPoints: number = MAX_TRAIL_POINTS, fadeRate: number = TRAIL_FADE_RATE) {
    this.trails = new Map();
    this.maxPoints = maxPoints;
    this.fadeRate = fadeRate;
  }

  addPoint(projectileId: number, position: Vec2, timestamp: number): void {
    if (!this.trails.has(projectileId)) {
      this.trails.set(projectileId, []);
    }

    const trail = this.trails.get(projectileId)!;
    trail.push(createTrailPoint(position, timestamp, 1.0));

    if (trail.length > this.maxPoints) {
      trail.shift();
    }
  }

  updateTrails(deltaTime: number): void {
    const fadeFactor = Math.pow(this.fadeRate, deltaTime / 100);

    for (const [projectileId, trail] of this.trails) {
      const updatedTrail: TrailPoint[] = [];

      for (const point of trail) {
        const fadedPoint = updateTrailPointOpacity(point, fadeFactor);
        if (shouldKeepTrailPoint(fadedPoint)) {
          updatedTrail.push(fadedPoint);
        }
      }

      if (updatedTrail.length === 0) {
        this.trails.delete(projectileId);
      } else {
        this.trails.set(projectileId, updatedTrail);
      }
    }
  }

  getTrail(projectileId: number): TrailPoint[] {
    return this.trails.get(projectileId) || [];
  }

  removeTrail(projectileId: number): void {
    this.trails.delete(projectileId);
  }

  clearDeadProjectiles(aliveProjectileIds: Set<number>): void {
    for (const projectileId of this.trails.keys()) {
      if (!aliveProjectileIds.has(projectileId)) {
        this.trails.delete(projectileId);
      }
    }
  }

  getAllTrails(): Map<number, TrailPoint[]> {
    return new Map(this.trails);
  }
}

export function createProjectileTrailTracker(maxPoints?: number, fadeRate?: number): ProjectileTrailTracker {
  return new ProjectileTrailTracker(maxPoints, fadeRate);
}

export function getProjectilesRenderData(
  projectiles: Projectile[],
  previousPositions: Map<number, Vec2>,
  trailTracker: ProjectileTrailTracker
): ProjectileRenderData[] {
  return projectiles
    .filter(p => p.alive)
    .map(p => {
      const renderData = getProjectileRenderData(p, previousPositions.get(p.id));
      renderData.trailPoints = trailTracker.getTrail(p.id);
      renderData.hasTrail = renderData.trailPoints.length > 0;
      return renderData;
    });
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

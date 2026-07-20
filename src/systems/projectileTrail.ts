import type { Vec2 } from '../utils/vec2';

/** Read-only trail point view; timestamp is milliseconds and values mutate in place. */
export type TrailPoint = Readonly<{
  position: Readonly<Vec2>;
  timestamp: number;
  opacity: number;
}>;

type MutableTrailPoint = {
  position: Vec2;
  timestamp: number;
  opacity: number;
};

type TrailStorage = {
  readonly slots: MutableTrailPoint[];
  readonly view: TrailPoint[];
  start: number;
  count: number;
};

const MAX_TRAIL_POINTS = 20;
const TRAIL_FADE_RATE = 0.85;
const MIN_OPACITY = 0.1;
const EMPTY_TRAIL = Object.freeze([]) as readonly TrailPoint[];

/** Creates an independent trail point snapshot with a millisecond timestamp. */
export function createTrailPoint(
  position: Readonly<Vec2>,
  timestamp: number,
  opacity: number = 1,
): TrailPoint {
  return { position: { ...position }, timestamp, opacity };
}

/** Returns an independent point snapshot with opacity faded by the supplied factor. */
export function updateTrailPointOpacity(
  point: TrailPoint,
  fadeFactor: number = TRAIL_FADE_RATE,
): TrailPoint {
  return { ...point, opacity: Math.max(point.opacity * fadeFactor, MIN_OPACITY) };
}

/** Reports whether a point remains above the visible opacity threshold. */
export function shouldKeepTrailPoint(point: TrailPoint): boolean {
  return point.opacity > MIN_OPACITY;
}

function createTrailStorage(maxPoints: number): TrailStorage {
  const slots = Array.from({ length: maxPoints }, () => ({
    position: { x: 0, y: 0 },
    timestamp: 0,
    opacity: 0,
  }));
  const view: TrailPoint[] = [...slots];
  view.length = 0;
  return { slots, view, start: 0, count: 0 };
}

function rebuildTrailView(trail: TrailStorage): void {
  for (let index = 0; index < trail.count; index++) {
    trail.view[index] = trail.slots[(trail.start + index) % trail.slots.length];
  }
  trail.view.length = trail.count;
}

/** Fixed-slot trail storage keyed by active projectile ID. */
export class ProjectileTrailTracker {
  private readonly trails = new Map<number, TrailStorage>();
  private readonly trailViews = new Map<number, readonly TrailPoint[]>();
  private readonly maxPoints: number;

  /** Creates a tracker; fade deltas and point timestamps are expressed in milliseconds. */
  constructor(
    maxPoints: number = MAX_TRAIL_POINTS,
    private readonly fadeRate: number = TRAIL_FADE_RATE,
  ) {
    this.maxPoints = Math.max(1, Math.trunc(maxPoints));
  }

  /** Writes a point into preallocated per-projectile storage without replacing slot objects. */
  addPoint(projectileId: number, position: Readonly<Vec2>, timestamp: number): void {
    let trail = this.trails.get(projectileId);
    if (trail === undefined) {
      trail = createTrailStorage(this.maxPoints);
      this.trails.set(projectileId, trail);
      this.trailViews.set(projectileId, trail.view);
    }
    let slotIndex = (trail.start + trail.count) % this.maxPoints;
    if (trail.count === this.maxPoints) {
      slotIndex = trail.start;
      trail.start = (trail.start + 1) % this.maxPoints;
    } else {
      trail.count++;
    }
    const slot = trail.slots[slotIndex];
    slot.position.x = position.x;
    slot.position.y = position.y;
    slot.timestamp = timestamp;
    slot.opacity = 1;
    rebuildTrailView(trail);
  }

  /** Fades all active slots using a millisecond delta and prunes empty projectile storage. */
  updateTrails(deltaTimeMs: number): void {
    const fadeFactor = Math.pow(this.fadeRate, deltaTimeMs / 100);
    for (const [projectileId, trail] of this.trails) {
      for (let index = 0; index < trail.count; index++) {
        const point = trail.slots[(trail.start + index) % this.maxPoints];
        point.opacity = Math.max(point.opacity * fadeFactor, MIN_OPACITY);
      }
      while (trail.count > 0 && !shouldKeepTrailPoint(trail.slots[trail.start])) {
        trail.start = (trail.start + 1) % this.maxPoints;
        trail.count--;
      }
      rebuildTrailView(trail);
      if (trail.count === 0) {
        this.trails.delete(projectileId);
        this.trailViews.delete(projectileId);
      }
    }
  }

  /** Returns a stable borrowed array whose points remain valid until this trail is removed. */
  getTrail(projectileId: number): readonly TrailPoint[] {
    return this.trails.get(projectileId)?.view ?? EMPTY_TRAIL;
  }

  /** Invalidates the borrowed view associated with one projectile ID. */
  removeTrail(projectileId: number): void {
    this.trails.delete(projectileId);
    this.trailViews.delete(projectileId);
  }

  /** Prunes storage for IDs absent from the caller-owned alive set. */
  clearDeadProjectiles(aliveProjectileIds: ReadonlySet<number>): void {
    for (const projectileId of this.trails.keys()) {
      if (!aliveProjectileIds.has(projectileId)) this.removeTrail(projectileId);
    }
  }

  /** Returns the stable borrowed map of active trail views. */
  getAllTrails(): ReadonlyMap<number, readonly TrailPoint[]> {
    return this.trailViews;
  }
}

/** Creates fixed per-projectile trail storage; fade deltas and timestamps use milliseconds. */
export function createProjectileTrailTracker(
  maxPoints?: number,
  fadeRate?: number,
): ProjectileTrailTracker {
  return new ProjectileTrailTracker(maxPoints, fadeRate);
}

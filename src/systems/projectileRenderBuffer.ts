import type { Projectile } from '../entities/tower';
import type { Vec2 } from '../utils/vec2';
import type { ProjectileRenderData } from './projectileRender';
import type { ProjectileTrailTracker } from './projectileTrail';

type ProjectileRenderFactory = (
  projectile: Projectile,
  previousPosition?: Vec2,
) => ProjectileRenderData;

type ProjectileRenderCacheEntry = {
  readonly data: ProjectileRenderData;
  lastSeenFrame: number;
};

/** Keyed projectile render storage with stable frame-array and nested-object identities. */
export class ProjectileRenderBuffer {
  private readonly entries = new Map<number, ProjectileRenderCacheEntry>();
  private readonly activeRenderData: ProjectileRenderData[] = [];
  private frameSequence = 0;

  /** Creates a buffer using a factory only when a projectile ID is first observed. */
  constructor(private readonly createRenderData: ProjectileRenderFactory) {}

  /**
   * Updates the borrowed frame view in place.
   * The returned array is owned by this buffer and remains valid until the next update or clear.
   */
  update(
    projectiles: readonly Projectile[],
    previousPositions: ReadonlyMap<number, Vec2>,
    trailTracker: ProjectileTrailTracker,
  ): readonly ProjectileRenderData[] {
    this.frameSequence++;
    let activeCount = 0;
    for (const projectile of projectiles) {
      if (!projectile.alive) continue;
      let entry = this.entries.get(projectile.id);
      if (entry === undefined) {
        entry = {
          data: this.createRenderData(projectile, previousPositions.get(projectile.id)),
          lastSeenFrame: this.frameSequence,
        };
        this.entries.set(projectile.id, entry);
      }
      entry.lastSeenFrame = this.frameSequence;
      const data = entry.data;
      data.position.x = projectile.position.x;
      data.position.y = projectile.position.y;
      const previousPosition = previousPositions.get(projectile.id) ?? projectile.position;
      data.previousPosition.x = previousPosition.x;
      data.previousPosition.y = previousPosition.y;
      data.trailPoints = trailTracker.getTrail(projectile.id);
      data.hasTrail = data.trailPoints.length > 0;
      this.activeRenderData[activeCount] = data;
      activeCount++;
    }
    this.activeRenderData.length = activeCount;
    for (const [projectileId, entry] of this.entries) {
      if (entry.lastSeenFrame !== this.frameSequence) this.entries.delete(projectileId);
    }
    return this.activeRenderData;
  }

  /** Clears cached IDs while preserving the owned frame-array identity. */
  clear(): void {
    this.entries.clear();
    this.activeRenderData.length = 0;
  }

  /** Returns the number of projectile IDs retaining render storage. */
  getTrackedProjectileCount(): number {
    return this.entries.size;
  }
}

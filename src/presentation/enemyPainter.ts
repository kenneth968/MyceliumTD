import type { EnemyRenderCollection } from '../systems/enemyRender';
import { paintEnemyBody } from './enemyBodyPainter';
import {
  getActiveSwarmLinks,
  getCamoPresentation,
  paintEnemySwarmLinks,
  paintEnemyTraitsAndStatus,
} from './enemyTraitPainter';

export interface EnemyPaintOptions {
  timestamp: number;
  isRevealed: (x: number, y: number) => boolean;
}

/** Paints bounded swarm links, family bodies, layers, traits, and statuses in order. */
export function paintEnemies(
  ctx: CanvasRenderingContext2D,
  collection: EnemyRenderCollection,
  options: EnemyPaintOptions,
): void {
  paintEnemySwarmLinks(ctx, getActiveSwarmLinks(collection.enemies));
  for (const enemy of collection.enemies) {
    if (!enemy.isAlive) continue;
    const isRevealed = enemy.isCamo && options.isRevealed(enemy.position.x, enemy.position.y);
    const camo = getCamoPresentation(enemy, isRevealed);
    ctx.save();
    ctx.globalAlpha = camo.bodyOpacity;
    paintEnemyBody(ctx, enemy);
    ctx.globalAlpha = 1;
    paintEnemyTraitsAndStatus(ctx, enemy, camo.showEye, options.timestamp);
    ctx.restore();
  }
}

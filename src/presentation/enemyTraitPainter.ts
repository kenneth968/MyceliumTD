import type { EnemyRenderData } from '../systems/enemyRender';

const SWARM_LINK_DISTANCE = 80;
const MAX_BUCKET_SIZE = 8;
const MAX_LINKS_PER_ENEMY = 2;

export interface EnemySwarmLink {
  fromId: number;
  toId: number;
  from: { x: number; y: number };
  to: { x: number; y: number };
  color: string;
}

export interface CamoPresentation {
  bodyOpacity: number;
  showEye: boolean;
}

/** Converts Camo state into opacity and a non-color reveal glyph cue. */
export function getCamoPresentation(enemy: EnemyRenderData, isRevealed: boolean): CamoPresentation {
  if (!enemy.isCamo) return { bodyOpacity: 1, showEye: false };
  return { bodyOpacity: isRevealed ? 0.82 : 0.22, showEye: isRevealed };
}

function getCellKey(x: number, y: number): string {
  return `${Math.floor(x / SWARM_LINK_DISTANCE)},${Math.floor(y / SWARM_LINK_DISTANCE)}`;
}

/** Builds unique nearby swarm links with fixed per-enemy and per-cell work caps. */
export function getActiveSwarmLinks(enemies: readonly EnemyRenderData[]): EnemySwarmLink[] {
  const buckets = new Map<string, EnemyRenderData[]>();
  const linkCounts = new Map<number, number>();
  const links: EnemySwarmLink[] = [];

  for (const enemy of enemies) {
    if (!enemy.isAlive || !enemy.swarmLinkedActive) continue;
    const cellX = Math.floor(enemy.position.x / SWARM_LINK_DISTANCE);
    const cellY = Math.floor(enemy.position.y / SWARM_LINK_DISTANCE);

    for (let yOffset = -1; yOffset <= 1 && (linkCounts.get(enemy.id) ?? 0) < MAX_LINKS_PER_ENEMY; yOffset++) {
      for (let xOffset = -1; xOffset <= 1 && (linkCounts.get(enemy.id) ?? 0) < MAX_LINKS_PER_ENEMY; xOffset++) {
        const candidates = buckets.get(`${cellX + xOffset},${cellY + yOffset}`) ?? [];
        for (const other of candidates) {
          if ((linkCounts.get(enemy.id) ?? 0) >= MAX_LINKS_PER_ENEMY) break;
          if ((linkCounts.get(other.id) ?? 0) >= MAX_LINKS_PER_ENEMY) continue;
          const dx = other.position.x - enemy.position.x;
          const dy = other.position.y - enemy.position.y;
          const distance = Math.hypot(dx, dy);
          if (distance <= 0 || distance > SWARM_LINK_DISTANCE) continue;
          const ux = dx / distance;
          const uy = dy / distance;
          links.push({
            fromId: enemy.id,
            toId: other.id,
            from: { x: enemy.position.x + ux * (enemy.bodyRadius + 3), y: enemy.position.y + uy * (enemy.bodyRadius + 3) },
            to: { x: other.position.x - ux * (other.bodyRadius + 3), y: other.position.y - uy * (other.bodyRadius + 3) },
            color: enemy.swarmLinkColor ?? 'rgba(245, 94, 121, 0.72)',
          });
          linkCounts.set(enemy.id, (linkCounts.get(enemy.id) ?? 0) + 1);
          linkCounts.set(other.id, (linkCounts.get(other.id) ?? 0) + 1);
        }
      }
    }

    const key = getCellKey(enemy.position.x, enemy.position.y);
    const bucket = buckets.get(key) ?? [];
    bucket.push(enemy);
    if (bucket.length > MAX_BUCKET_SIZE) bucket.shift();
    buckets.set(key, bucket);
  }
  return links;
}

/** Paints all already-bounded swarm links beneath enemy bodies. */
export function paintEnemySwarmLinks(ctx: CanvasRenderingContext2D, links: readonly EnemySwarmLink[]): void {
  ctx.save();
  ctx.globalAlpha = 0.42;
  ctx.lineWidth = 2;
  for (const link of links) {
    ctx.beginPath();
    ctx.moveTo(link.from.x, link.from.y);
    ctx.lineTo(link.to.x, link.to.y);
    ctx.strokeStyle = link.color;
    ctx.stroke();
  }
  ctx.restore();
}

function paintHexagon(ctx: CanvasRenderingContext2D, enemy: EnemyRenderData, color: string): void {
  const radius = enemy.bodyRadius + 5;
  ctx.beginPath();
  for (let index = 0; index < 6; index++) {
    const angle = -Math.PI / 2 + index * Math.PI / 3;
    const x = enemy.position.x + Math.cos(angle) * radius;
    const y = enemy.position.y + Math.sin(angle) * radius;
    if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.stroke();
}

function paintEye(ctx: CanvasRenderingContext2D, enemy: EnemyRenderData, color: string): void {
  const x = enemy.position.x + enemy.bodyRadius + 10;
  const y = enemy.position.y;
  ctx.beginPath();
  ctx.ellipse(x, y, 7, 4, 0, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(7, 19, 15, 0.9)';
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(x, y, 2, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

/** Paints trait geometry and elapsed-time status cues for one enemy. */
export function paintEnemyTraitsAndStatus(
  ctx: CanvasRenderingContext2D,
  enemy: EnemyRenderData,
  isRevealed: boolean,
  timestamp: number,
): void {
  ctx.save();
  for (const overlay of enemy.traitOverlays) {
    if (!overlay.active || (overlay.visibility === 'when-revealed' && !isRevealed)) continue;
    if (overlay.shape === 'hexagon') paintHexagon(ctx, enemy, overlay.color);
    if (overlay.shape === 'ring') {
      ctx.beginPath();
      ctx.arc(enemy.position.x, enemy.position.y, enemy.bodyRadius + 9, 0, Math.PI * 2);
      ctx.strokeStyle = overlay.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    if (overlay.shape === 'eye') paintEye(ctx, enemy, overlay.color);
  }

  const pulse = 0.65 + Math.sin(timestamp / 240 + enemy.id) * 0.2;
  enemy.statusEffects.forEach((effect, index) => {
    const x = enemy.position.x + (index - (enemy.statusEffects.length - 1) / 2) * 8;
    const y = enemy.position.y - enemy.bodyRadius - 7;
    ctx.globalAlpha = pulse;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = effect.color;
    ctx.fill();
  });
  ctx.restore();
}

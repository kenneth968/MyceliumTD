import type {
  ProjectileRenderData,
  TrailPoint,
} from '../systems/projectileRender';

type TrailSegmentPaint = Readonly<{
  previous: TrailPoint;
  current: TrailPoint;
  projectile: ProjectileRenderData;
  index: number;
}>;

const SPECIAL_EFFECT_COLORS: Readonly<Record<string, string>> = Object.freeze({
  area_damage: 'rgba(255, 255, 255, 0.5)',
  poison: 'rgba(150, 0, 150, 0.7)',
  slow: 'rgba(100, 150, 255, 0.5)',
  instakill: 'rgba(255, 200, 0, 0.6)',
  reveal_camo: 'rgba(0, 255, 200, 0.6)',
});
const CLOUD_PUFFS = Object.freeze([
  Object.freeze({ x: -0.45, y: 0, radius: 0.62 }),
  Object.freeze({ x: 0.25, y: -0.2, radius: 0.7 }),
  Object.freeze({ x: 0.42, y: 0.28, radius: 0.5 }),
] as const);

function paintTrail(
  context: CanvasRenderingContext2D,
  projectile: ProjectileRenderData,
): void {
  const points = projectile.trailPoints;
  if (!projectile.hasTrail || points.length < 2) return;
  for (let index = 1; index < points.length; index++) {
    const previous = points[index - 1];
    const current = points[index];
    paintTrailSegment(context, { previous, current, projectile, index });
  }
}

function paintTrailSegment(
  context: CanvasRenderingContext2D,
  data: TrailSegmentPaint,
): void {
  const { previous, current, projectile, index } = data;
  const opacity = current.opacity;
  if (projectile.trailStyle === 'spore' || projectile.trailStyle === 'toxin') {
    context.beginPath();
    context.arc(current.position.x, current.position.y, Math.max(1.5, projectile.size * opacity * 0.35), 0, Math.PI * 2);
    context.fillStyle = projectile.trailStyle === 'toxin' ? projectile.color : projectile.glowColor;
    context.globalAlpha = opacity * 0.65;
    context.fill();
    context.globalAlpha = 1;
    return;
  }
  context.beginPath();
  context.moveTo(previous.position.x, previous.position.y);
  if (projectile.trailStyle === 'spark') {
    const midX = (previous.position.x + current.position.x) / 2 + Math.sin(index * 2.3) * projectile.size * 0.35;
    const midY = (previous.position.y + current.position.y) / 2 + Math.cos(index * 1.7) * projectile.size * 0.35;
    context.lineTo(midX, midY);
  }
  context.lineTo(current.position.x, current.position.y);
  context.strokeStyle = projectile.trailStyle === 'snap' ? projectile.color : projectile.glowColor;
  context.lineWidth = Math.max(1, projectile.size * opacity * (projectile.trailStyle === 'pulse' ? 0.8 : 0.5));
  context.globalAlpha = opacity * (projectile.trailStyle === 'pulse' ? 0.65 : 0.5);
  context.stroke();
  context.globalAlpha = 1;
}

function paintShape(
  context: CanvasRenderingContext2D,
  projectile: Readonly<Pick<ProjectileRenderData, 'shape' | 'size' | 'color' | 'accentColor'>>,
): void {
  const { shape, size, color, accentColor } = projectile;
  context.fillStyle = color;
  context.strokeStyle = accentColor;
  context.lineWidth = Math.max(2, size * 0.22);
  switch (shape) {
    case 'cloud':
      for (const puff of CLOUD_PUFFS) {
        context.beginPath();
        context.arc(puff.x * size, puff.y * size, puff.radius * size, 0, Math.PI * 2);
        context.fill();
      }
      context.stroke();
      return;
    case 'drop':
      context.beginPath();
      context.moveTo(0, -size * 1.15);
      context.bezierCurveTo(size, -size * 0.25, size * 0.55, size, 0, size);
      context.bezierCurveTo(-size * 0.55, size, -size, -size * 0.25, 0, -size * 1.15);
      context.closePath();
      context.fill();
      context.stroke();
      return;
    case 'jaw':
      for (const direction of [-1, 1] as const) {
        context.beginPath();
        context.moveTo(direction * size, -size * 0.7);
        context.lineTo(direction * -size * 0.15, 0);
        context.lineTo(direction * size, size * 0.7);
        context.closePath();
        context.fill();
      }
      return;
    case 'bolt':
      context.beginPath();
      context.moveTo(-size * 0.35, -size * 1.1);
      context.lineTo(size * 0.28, -size * 0.18);
      context.lineTo(-size * 0.04, -size * 0.18);
      context.lineTo(size * 0.42, size * 1.1);
      context.lineTo(-size * 0.42, size * 0.08);
      context.lineTo(-size * 0.08, size * 0.08);
      context.closePath();
      context.fill();
      context.stroke();
      return;
    case 'needle':
      context.beginPath();
      context.moveTo(0, -size * 1.25);
      context.lineTo(size * 0.36, size * 0.7);
      context.lineTo(0, size * 1.05);
      context.lineTo(-size * 0.36, size * 0.7);
      context.closePath();
      context.fill();
      context.stroke();
      return;
    case 'orb':
      context.beginPath();
      context.arc(0, 0, size, 0, Math.PI * 2);
      context.fill();
  }
}

function paintSpecialEffect(context: CanvasRenderingContext2D, projectile: ProjectileRenderData): void {
  const color = projectile.specialEffect === undefined ? undefined : SPECIAL_EFFECT_COLORS[projectile.specialEffect];
  if (color === undefined) return;
  context.beginPath();
  context.arc(0, 0, projectile.size * 0.6, 0, Math.PI * 2);
  context.fillStyle = color;
  context.fill();
}

/** Paints typed projectile identities and bounded trails. */
export function paintProjectiles(
  context: CanvasRenderingContext2D,
  projectiles: readonly ProjectileRenderData[],
): void {
  for (const projectile of projectiles) {
    context.save();
    paintTrail(context, projectile);
    context.translate(projectile.position.x, projectile.position.y);
    context.shadowColor = projectile.glowColor;
    context.shadowBlur = projectile.size * 2;
    paintShape(context, projectile);
    paintSpecialEffect(context, projectile);
    context.restore();
  }
}

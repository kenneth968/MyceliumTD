import type { EnemyFamilyShape, EnemyRenderData } from '../systems/enemyRender';

export interface EnemyFamilyGeometrySignature {
  shell: 'broad' | 'none';
  legCount: number;
  wingCount: number;
  wingShape: 'triangle' | 'wide-paired' | 'none';
  segmentCount: number;
  centralLuminousBody: boolean;
}

/** Describes the non-color silhouette cues painted for one enemy family. */
export function getEnemyFamilyGeometrySignature(shape: EnemyFamilyShape): EnemyFamilyGeometrySignature {
  switch (shape) {
    case 'beetle-shell': return { shell: 'broad', legCount: 6, wingCount: 0, wingShape: 'none', segmentCount: 1, centralLuminousBody: false };
    case 'wasp-wings': return { shell: 'none', legCount: 0, wingCount: 2, wingShape: 'triangle', segmentCount: 1, centralLuminousBody: false };
    case 'caterpillar-segments': return { shell: 'none', legCount: 0, wingCount: 0, wingShape: 'none', segmentCount: 5, centralLuminousBody: false };
    case 'moth-wings': return { shell: 'none', legCount: 0, wingCount: 2, wingShape: 'wide-paired', segmentCount: 1, centralLuminousBody: true };
  }
}

function paintBeetle(ctx: CanvasRenderingContext2D, enemy: EnemyRenderData): void {
  const radius = enemy.bodyRadius;
  ctx.strokeStyle = enemy.secondaryColor;
  ctx.lineWidth = 2;
  for (const side of [-1, 1]) {
    for (const offset of [-0.55, 0, 0.55]) {
      ctx.beginPath();
      ctx.moveTo(side * radius * 0.7, offset * radius);
      ctx.lineTo(side * radius * 1.45, offset * radius + Math.sign(offset || 1) * radius * 0.25);
      ctx.stroke();
    }
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 1.25, radius * 0.9, 0, 0, Math.PI * 2);
  ctx.fillStyle = enemy.primaryColor;
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(0, -radius * 0.8);
  ctx.lineTo(0, radius * 0.8);
  ctx.stroke();
}

function paintWasp(ctx: CanvasRenderingContext2D, enemy: EnemyRenderData): void {
  const radius = enemy.bodyRadius;
  ctx.fillStyle = enemy.accentColor;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(side * radius * 0.25, -radius * 0.35);
    ctx.lineTo(side * radius * 1.55, -radius * 0.95);
    ctx.lineTo(side * radius * 0.85, radius * 0.55);
    ctx.closePath();
    ctx.fill();
  }
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 0.52, radius * 1.18, 0, 0, Math.PI * 2);
  ctx.fillStyle = enemy.primaryColor;
  ctx.fill();
  ctx.strokeStyle = enemy.secondaryColor;
  ctx.lineWidth = 2;
  ctx.stroke();
}

function paintCaterpillar(ctx: CanvasRenderingContext2D, enemy: EnemyRenderData): void {
  const radius = enemy.bodyRadius;
  for (let index = 0; index < 5; index++) {
    const x = (index - 2) * radius * 0.62;
    const segmentRadius = radius * (index === 4 ? 0.62 : 0.56);
    ctx.beginPath();
    ctx.arc(x, 0, segmentRadius, 0, Math.PI * 2);
    ctx.fillStyle = index % 2 === 0 ? enemy.primaryColor : enemy.secondaryColor;
    ctx.fill();
    ctx.strokeStyle = enemy.accentColor;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

function paintMoth(ctx: CanvasRenderingContext2D, enemy: EnemyRenderData): void {
  const radius = enemy.bodyRadius;
  ctx.fillStyle = enemy.secondaryColor;
  for (const side of [-1, 1]) {
    ctx.beginPath();
    ctx.ellipse(side * radius * 0.72, 0, radius * 0.82, radius * 1.2, side * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = enemy.accentColor;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.save();
  ctx.shadowColor = enemy.glowColor;
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.ellipse(0, 0, radius * 0.35, radius, 0, 0, Math.PI * 2);
  ctx.fillStyle = enemy.glowColor;
  ctx.fill();
  ctx.restore();
}

function paintLayerGeometry(ctx: CanvasRenderingContext2D, enemy: EnemyRenderData): void {
  ctx.strokeStyle = enemy.accentColor;
  ctx.lineWidth = 1.5;
  for (let index = 0; index < enemy.outerLayerElements; index++) {
    const radius = enemy.bodyRadius + 3 + index * 3;
    ctx.beginPath();
    ctx.arc(0, 0, radius, -Math.PI * 0.78, Math.PI * 0.78);
    ctx.stroke();
  }
  for (let index = 0; index < enemy.layerStage; index++) {
    const offset = (index - (enemy.layerStage - 1) / 2) * 4;
    ctx.beginPath();
    ctx.moveTo(offset - 3, -enemy.bodyRadius * 0.65);
    ctx.lineTo(offset + 2, -2);
    ctx.lineTo(offset - 2, enemy.bodyRadius * 0.55);
    ctx.stroke();
  }
}

/** Paints family silhouette and current broken-layer geometry for one enemy. */
export function paintEnemyBody(ctx: CanvasRenderingContext2D, enemy: EnemyRenderData): void {
  ctx.save();
  ctx.translate(enemy.position.x, enemy.position.y);
  ctx.rotate(enemy.facingAngle + enemy.rotation);
  ctx.scale(enemy.scale, enemy.scale);
  switch (enemy.bodyShape) {
    case 'beetle-shell': paintBeetle(ctx, enemy); break;
    case 'wasp-wings': paintWasp(ctx, enemy); break;
    case 'caterpillar-segments': paintCaterpillar(ctx, enemy); break;
    case 'moth-wings': paintMoth(ctx, enemy); break;
  }
  paintLayerGeometry(ctx, enemy);
  ctx.restore();
}

import { EvolutionPath, TowerStage } from '../content/evolutionDefinitions';
import { TowerType } from '../content/towerDefinitions';
import { getTowerVisualConfig } from '../systems/towerRender';
import {
  getTowerSpriteFrame,
  getTowerSpriteIcon,
  type TowerSpriteFrame,
} from './towerSpriteAtlas';
import { TowerSpriteImageCache } from './towerSpriteCache';

/** World or UI destination anchored to the sprite's root contact. */
export interface TowerSpriteDestination {
  readonly anchorX: number;
  readonly anchorY: number;
  readonly size: number;
  readonly opacity?: number;
}

/** Draws one gameplay frame, invoking the fallback until its atlas is ready. */
export function paintTowerSprite(
  context: CanvasRenderingContext2D,
  cache: TowerSpriteImageCache,
  frame: TowerSpriteFrame,
  destination: TowerSpriteDestination,
  drawFallback: () => void,
): boolean {
  const image = cache.get(frame.url);
  if (image === null) {
    drawFallback();
    return false;
  }

  const destinationX = destination.anchorX - (frame.anchorX / frame.size) * destination.size;
  const destinationY = destination.anchorY - (frame.anchorY / frame.size) * destination.size;
  context.save();
  context.globalAlpha *= destination.opacity ?? 1;
  context.drawImage(
    image,
    frame.sourceX,
    frame.sourceY,
    frame.size,
    frame.size,
    destinationX,
    destinationY,
    destination.size,
    destination.size,
  );
  context.restore();
  return true;
}

/** Draws one square card portrait, invoking the fallback until ready. */
export function paintTowerCardIcon(
  context: CanvasRenderingContext2D,
  cache: TowerSpriteImageCache,
  frame: TowerSpriteFrame,
  x: number,
  y: number,
  size: number,
  drawFallback: () => void,
): boolean {
  const image = cache.get(frame.url);
  if (image === null) {
    drawFallback();
    return false;
  }

  context.drawImage(
    image,
    frame.sourceX,
    frame.sourceY,
    frame.size,
    frame.size,
    x,
    y,
    size,
    size,
  );
  return true;
}

/** Resolves and paints the active gameplay identity for a tower. */
export function paintTowerIdentity(
  context: CanvasRenderingContext2D,
  cache: TowerSpriteImageCache,
  towerType: TowerType,
  stage: TowerStage,
  evolution: EvolutionPath | null,
  timestamp: number,
  destination: TowerSpriteDestination,
): boolean {
  return paintTowerSprite(
    context,
    cache,
    getTowerSpriteFrame(towerType, stage, evolution, timestamp),
    destination,
    () => paintTowerFallback(
      context,
      towerType,
      destination.anchorX,
      destination.anchorY,
      destination.size,
      destination.opacity,
    ),
  );
}

/** Resolves and paints the dedicated purchase-card identity for a tower. */
export function paintTowerIconIdentity(
  context: CanvasRenderingContext2D,
  cache: TowerSpriteImageCache,
  towerType: TowerType,
  x: number,
  y: number,
  size: number,
): boolean {
  return paintTowerCardIcon(
    context,
    cache,
    getTowerSpriteIcon(towerType),
    x,
    y,
    size,
    () => paintTowerFallback(context, towerType, x + size / 2, y + size, size),
  );
}

/** Paints the tower-specific procedural silhouette used on load failure. */
export function paintTowerFallback(
  context: CanvasRenderingContext2D,
  towerType: TowerType,
  anchorX: number,
  anchorY: number,
  size: number,
  opacity = 1,
): void {
  const config = getTowerVisualConfig(towerType);
  const scale = size / 64;
  context.save();
  context.globalAlpha *= opacity;
  context.translate(anchorX, anchorY);
  context.scale(scale, scale);
  context.fillStyle = config.primary;
  context.strokeStyle = config.secondary;
  context.lineWidth = 2;
  context.shadowColor = config.glow;
  context.shadowBlur = 5;

  switch (towerType) {
    case TowerType.Sporecap:
      context.fillRect(-5, -29, 10, 24);
      context.strokeRect(-5, -29, 10, 24);
      context.beginPath();
      context.ellipse(0, -30, 20, 11, 0, Math.PI, Math.PI * 2);
      context.fill();
      context.stroke();
      break;
    case TowerType.ThornSniper:
      context.beginPath();
      context.moveTo(-8, -4);
      context.lineTo(-4, -38);
      context.lineTo(12, -49);
      context.lineTo(5, -32);
      context.lineTo(8, -4);
      context.closePath();
      context.fill();
      context.stroke();
      break;
    case TowerType.Puffball:
      context.beginPath();
      context.arc(0, -24, 20, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = config.glow;
      for (const [x, y] of [[-8, -28], [7, -32], [10, -18], [-5, -15]] as const) {
        context.beginPath();
        context.arc(x, y, 2, 0, Math.PI * 2);
        context.fill();
      }
      break;
    case TowerType.Slimefungus:
      context.beginPath();
      context.ellipse(-2, -24, 23, 12, -0.12, Math.PI, Math.PI * 2);
      context.lineTo(15, -12);
      context.lineTo(8, -5);
      context.lineTo(-13, -7);
      context.closePath();
      context.fill();
      context.stroke();
      context.beginPath();
      context.arc(14, -7, 3, 0, Math.PI * 2);
      context.fill();
      break;
    case TowerType.BulbShooter:
      context.beginPath();
      context.arc(-4, -17, 16, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.save();
      context.translate(5, -28);
      context.rotate(0.5);
      context.fillRect(-7, -19, 14, 24);
      context.strokeRect(-7, -19, 14, 24);
      context.restore();
      break;
    case TowerType.LumenOracle:
      context.fillRect(-5, -28, 10, 23);
      context.strokeRect(-5, -28, 10, 23);
      context.beginPath();
      context.moveTo(-20, -29);
      context.quadraticCurveTo(-9, -48, -2, -31);
      context.moveTo(2, -31);
      context.quadraticCurveTo(9, -48, 20, -29);
      context.stroke();
      context.beginPath();
      context.arc(-20, -20, 3, 0, Math.PI * 2);
      context.arc(20, -20, 3, 0, Math.PI * 2);
      context.fillStyle = config.glow;
      context.fill();
      break;
  }

  context.shadowBlur = 0;
  context.fillStyle = config.secondary;
  context.beginPath();
  context.ellipse(0, -3, 17, 5, 0, 0, Math.PI * 2);
  context.fill();
  context.restore();
}

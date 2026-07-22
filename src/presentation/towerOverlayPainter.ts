import { TowerType } from '../content/towerDefinitions';
import { getTowerBodyShape } from '../systems/towerRender';

/** Paints the legacy tower-specific selection outline above a sprite. */
export function paintTowerSelectionOutline(
  context: CanvasRenderingContext2D,
  towerType: TowerType,
  x: number,
  y: number,
  radius: number,
): void {
  context.strokeStyle = '#FFD700';
  context.lineWidth = 3;
  context.beginPath();
  const shape = getTowerBodyShape(towerType);
  if (shape === 'circle') {
    context.arc(x, y, radius, 0, Math.PI * 2);
  } else if (shape === 'hexagon') {
    context.moveTo(x + radius, y);
    for (let index = 1; index <= 6; index += 1) {
      const angle = (index * Math.PI) / 3;
      context.lineTo(x + radius * Math.cos(angle), y + radius * Math.sin(angle));
    }
    context.closePath();
  } else if (shape === 'diamond') {
    context.moveTo(x, y - radius);
    context.lineTo(x + radius, y);
    context.lineTo(x, y + radius);
    context.lineTo(x - radius, y);
    context.closePath();
  } else {
    for (let index = 0; index < 10; index += 1) {
      const pointRadius = index % 2 === 0 ? radius : radius * 0.5;
      const angle = (index * Math.PI) / 5 - Math.PI / 2;
      const pointX = x + pointRadius * Math.cos(angle);
      const pointY = y + pointRadius * Math.sin(angle);
      if (index === 0) context.moveTo(pointX, pointY);
      else context.lineTo(pointX, pointY);
    }
    context.closePath();
  }
  context.stroke();
}

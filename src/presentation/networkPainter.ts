import type { NetworkConnectionRenderData } from '../systems/gameRenderer';
import {
  createNetworkPulseRenderBuffer,
  getPulseForLink,
  isNetworkPulseForLink,
  type CombatTransientSlot,
} from './combatEffects';

/** Borrowed network/frame views; timestamp is expressed in milliseconds. */
export type NetworkPaintData = Readonly<{
  connections: readonly NetworkConnectionRenderData[];
  transients: readonly CombatTransientSlot[];
  timestamp: number;
}>;

const pulseRenderBuffer = createNetworkPulseRenderBuffer();

function matchesLink(slot: CombatTransientSlot, connection: NetworkConnectionRenderData): boolean {
  return isNetworkPulseForLink(slot, connection.sourceTowerId, connection.targetTowerId);
}

function paintPulse(
  context: CanvasRenderingContext2D,
  connection: NetworkConnectionRenderData,
  slot: CombatTransientSlot,
): void {
  if (!getPulseForLink(slot, connection, pulseRenderBuffer)) return;
  context.beginPath();
  context.arc(pulseRenderBuffer.x, pulseRenderBuffer.y, pulseRenderBuffer.radius, 0, Math.PI * 2);
  context.fillStyle = pulseRenderBuffer.color;
  context.shadowColor = pulseRenderBuffer.color;
  context.shadowBlur = 12;
  context.fill();
  context.shadowBlur = 0;
}

/** Paints network lines and pulses only on participating links. */
export function paintNetworkConnections(
  context: CanvasRenderingContext2D,
  data: NetworkPaintData,
): void {
  const time = data.timestamp / 1_000;
  for (const connection of data.connections) {
    const source = connection.sourcePosition;
    const target = connection.targetPosition;
    const distance = Math.hypot(target.x - source.x, target.y - source.y);
    const glowAlpha = 0.15 + Math.sin(time * 2 + distance * 0.01) * 0.08;
    context.beginPath();
    context.moveTo(source.x, source.y);
    context.lineTo(target.x, target.y);
    context.strokeStyle = connection.sourceType === 'kernel'
      ? `rgba(74, 222, 128, ${glowAlpha})`
      : `rgba(142, 68, 173, ${glowAlpha})`;
    context.lineWidth = connection.width + 4;
    context.stroke();

    context.beginPath();
    context.moveTo(source.x, source.y);
    context.lineTo(target.x, target.y);
    context.strokeStyle = connection.color;
    context.lineWidth = connection.width;
    context.setLineDash([8, 12]);
    context.lineDashOffset = -((time * 40) % 20);
    context.stroke();
    context.setLineDash([]);
    context.lineDashOffset = 0;

    for (const slot of data.transients) {
      if (matchesLink(slot, connection)) paintPulse(context, connection, slot);
    }
  }
}

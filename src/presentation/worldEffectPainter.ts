import type { LingeringFieldRenderData, SeededPayloadRenderData } from '../systems/gameRenderer';

/** Borrowed world-effect views; timestamp is expressed in milliseconds. */
export type WorldEffectPaintData = Readonly<{
  fields: readonly LingeringFieldRenderData[];
  payloads: readonly SeededPayloadRenderData[];
  timestamp: number;
}>;

/** Paints persistent field and seeded-payload telegraphs beneath units. */
export function paintWorldEffects(
  context: CanvasRenderingContext2D,
  data: WorldEffectPaintData,
): void {
  const time = data.timestamp / 1_000;
  for (const field of data.fields) {
    const radius = field.radius * (0.92 + Math.sin(time * 2.6 + field.id) * 0.08);
    context.save();
    context.globalAlpha = Math.min(0.85, field.alpha);
    context.beginPath();
    context.arc(field.position.x, field.position.y, radius, 0, Math.PI * 2);
    context.fillStyle = field.color;
    context.fill();
    context.strokeStyle = field.borderColor;
    context.lineWidth = 2;
    context.setLineDash([6, 6]);
    context.stroke();
    context.setLineDash([]);
    context.beginPath();
    context.arc(field.position.x, field.position.y, radius * 0.55, 0, Math.PI * 2);
    context.fillStyle = 'rgba(202, 255, 128, 0.16)';
    context.fill();
    context.restore();
  }
  for (const payload of data.payloads) {
    const coreRadius = 7 + (0.85 + Math.sin(time * 8 + payload.id) * 0.15) * 2;
    context.save();
    context.globalAlpha = Math.min(0.9, payload.alpha);
    context.beginPath();
    context.arc(payload.position.x, payload.position.y, payload.radius, 0, Math.PI * 2);
    context.strokeStyle = 'rgba(255, 207, 102, 0.22)';
    context.lineWidth = 2;
    context.setLineDash([4, 8]);
    context.stroke();
    context.setLineDash([]);
    context.beginPath();
    context.arc(payload.position.x, payload.position.y, coreRadius, 0, Math.PI * 2);
    context.fillStyle = payload.color;
    context.fill();
    context.strokeStyle = payload.borderColor;
    context.lineWidth = 2;
    context.stroke();
    context.beginPath();
    context.arc(payload.position.x, payload.position.y, coreRadius * 0.45, 0, Math.PI * 2);
    context.fillStyle = 'rgba(90, 54, 20, 0.55)';
    context.fill();
    context.restore();
  }
}

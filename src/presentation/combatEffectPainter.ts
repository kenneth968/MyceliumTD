import type { CombatParticleSlot, CombatTransientSlot } from './combatEffects';

/** Borrowed fixed-pool views consumed synchronously by the combat painter. */
export type CombatEffectPaintData = Readonly<{
  particles: readonly CombatParticleSlot[];
  transients: readonly CombatTransientSlot[];
}>;

function paintParticle(context: CanvasRenderingContext2D, slot: CombatParticleSlot): void {
  if (!slot.active) return;
  const alpha = Math.max(0, slot.remainingMs / slot.durationMs);
  context.save();
  context.globalAlpha = alpha;
  context.fillStyle = slot.color;
  context.strokeStyle = slot.color;
  switch (slot.kind) {
    case 'shell_fragment':
      context.translate(slot.x, slot.y);
      context.rotate(Math.atan2(slot.velocityY, slot.velocityX));
      context.fillRect(-slot.size, -slot.size * 0.35, slot.size * 2, slot.size * 0.7);
      break;
    case 'blue_droplet':
      context.beginPath();
      context.ellipse(slot.x, slot.y, slot.size * 0.7, slot.size * 1.35, 0, 0, Math.PI * 2);
      context.fill();
      break;
    case 'spore':
      context.shadowColor = slot.color;
      context.shadowBlur = slot.size * 2;
      context.beginPath();
      context.arc(slot.x, slot.y, slot.size, 0, Math.PI * 2);
      context.fill();
      break;
    case 'spark':
      context.beginPath();
      context.moveTo(slot.x, slot.y);
      context.lineTo(slot.x - slot.velocityX * 0.08, slot.y - slot.velocityY * 0.08);
      context.lineWidth = Math.max(1, slot.size * 0.6);
      context.stroke();
      break;
    case 'splat':
      context.beginPath();
      context.arc(slot.x, slot.y, slot.size, 0, Math.PI * 2);
      context.fill();
  }
  context.restore();
}

function paintBloomRing(context: CanvasRenderingContext2D, slot: CombatTransientSlot, progress: number): void {
  const delay = slot.sequence * 0.12;
  const localProgress = Math.max(0, Math.min(1, (progress - delay) / (1 - delay)));
  context.beginPath();
  context.arc(slot.x, slot.y, slot.radius * localProgress, 0, Math.PI * 2);
  context.strokeStyle = slot.color;
  context.lineWidth = 3 - localProgress;
  context.stroke();
}

function paintTransient(context: CanvasRenderingContext2D, slot: CombatTransientSlot): void {
  if (!slot.active || slot.kind === 'network_pulse') return;
  const progress = 1 - slot.remainingMs / slot.durationMs;
  const alpha = Math.max(0, slot.remainingMs / slot.durationMs);
  context.save();
  context.globalAlpha = alpha;
  context.strokeStyle = slot.color;
  context.fillStyle = slot.color;
  switch (slot.kind) {
    case 'squash_ring':
      context.beginPath();
      context.ellipse(slot.x, slot.y, slot.radius * (0.4 + progress * 0.8), slot.radius * (0.2 + progress * 0.35), 0, 0, Math.PI * 2);
      context.lineWidth = 2.5;
      context.stroke();
      break;
    case 'mark_outline':
      context.beginPath();
      context.arc(slot.x, slot.y, slot.radius + progress * 2, 0, Math.PI * 2);
      context.lineWidth = 1.5;
      context.setLineDash([5, 4]);
      context.stroke();
      break;
    case 'slow_trail':
      context.beginPath();
      context.ellipse(slot.x - progress * 15, slot.y + slot.radius * 0.6, slot.radius * 0.8, 4, 0, 0, Math.PI * 2);
      context.globalAlpha = alpha * 0.45;
      context.fill();
      break;
    case 'trait_crack':
      context.beginPath();
      context.moveTo(slot.x - slot.radius * 0.7, slot.y - slot.radius * 0.7);
      context.lineTo(slot.x - 2, slot.y - 2);
      context.lineTo(slot.x - slot.radius * 0.35, slot.y + slot.radius * 0.75);
      context.moveTo(slot.x + slot.radius * 0.7, slot.y - slot.radius * 0.55);
      context.lineTo(slot.x + 2, slot.y + 1);
      context.lineTo(slot.x + slot.radius * 0.55, slot.y + slot.radius * 0.7);
      context.lineWidth = 2;
      context.stroke();
      break;
    case 'trait_dim':
      context.globalAlpha = alpha * 0.35;
      context.beginPath();
      context.arc(slot.x, slot.y, slot.radius, 0, Math.PI * 2);
      context.fill();
      break;
    case 'reveal_sweep':
      context.beginPath();
      context.arc(slot.x, slot.y, slot.radius * progress, -Math.PI * 0.3, Math.PI * 1.3);
      context.lineWidth = 2;
      context.stroke();
      break;
    case 'bloom_ring':
      paintBloomRing(context, slot, progress);
      break;
    case 'growth_bloom':
      context.beginPath();
      context.moveTo(slot.x, slot.y + slot.radius * 0.55);
      context.lineTo(slot.x, slot.y + slot.radius * 0.55 - slot.radius * 1.5 * progress);
      context.lineWidth = 4 * (1 - progress * 0.45);
      context.stroke();
      context.beginPath();
      context.arc(slot.x, slot.y - slot.radius * progress, 5 + progress * 8, 0, Math.PI * 2);
      context.fill();
      break;
    case 'kernel_pulse':
      context.beginPath();
      context.arc(slot.x, slot.y, slot.radius * (0.8 + Math.sin(progress * Math.PI) * 0.35), 0, Math.PI * 2);
      context.lineWidth = 5 * alpha;
      context.stroke();
      break;
    case 'impact_flash':
      context.beginPath();
      context.arc(slot.x, slot.y, slot.radius * (0.5 + progress), 0, Math.PI * 2);
      context.fill();
  }
  context.restore();
}

/** Paints active bounded impacts without allocating frame-local effect arrays. */
export function paintCombatEffects(
  context: CanvasRenderingContext2D,
  data: CombatEffectPaintData,
): void {
  for (const particle of data.particles) paintParticle(context, particle);
  for (const transient of data.transients) paintTransient(context, transient);
}

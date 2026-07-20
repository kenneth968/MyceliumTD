import type { HealthBarRenderData } from '../systems/healthBarRender';

/** Paints the screen-space Elder Ward bar with aggregate HP and layer separators. */
export function paintBossHealthBars(ctx: CanvasRenderingContext2D, healthBars: readonly HealthBarRenderData[]): void {
  for (const bar of healthBars) {
    if (!bar.isVisible || bar.label === null) continue;
    const x = bar.position.x - bar.width / 2;
    const y = bar.position.y - bar.height / 2;
    ctx.save();
    ctx.font = 'bold 13px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillStyle = '#F1FFF8';
    ctx.fillText(bar.label, bar.position.x, y - 4);
    ctx.fillStyle = bar.backgroundColor;
    ctx.fillRect(x, y, bar.width, bar.height);
    ctx.fillStyle = bar.fillColor;
    ctx.fillRect(x, y, bar.width * bar.healthPercent, bar.height);
    ctx.strokeStyle = bar.borderColor;
    ctx.lineWidth = bar.borderWidth;
    ctx.strokeRect(x, y, bar.width, bar.height);
    ctx.strokeStyle = 'rgba(241, 255, 248, 0.55)';
    ctx.lineWidth = 1;
    for (let index = 1; index < bar.layerFractions.length; index++) {
      const separatorX = x + bar.width * index / bar.layerFractions.length;
      ctx.beginPath();
      ctx.moveTo(separatorX, y);
      ctx.lineTo(separatorX, y + bar.height);
      ctx.stroke();
    }
    ctx.restore();
  }
}

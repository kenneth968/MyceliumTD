import { RELEASE_HUD_LAYOUT } from '../systems/releaseHudLayout';
import type { PerformanceOverlayData } from '../systems/performanceBudget';
import { VISUAL_THEME } from './visualTheme';

export const PERFORMANCE_OVERLAY_LAYOUT = Object.freeze({
  x: RELEASE_HUD_LAYOUT.towerPanel.x,
  y: RELEASE_HUD_LAYOUT.towerPanel.y,
  width: RELEASE_HUD_LAYOUT.towerPanel.width,
  height: 128,
} as const);

export function createPerformanceOverlayRows(data: PerformanceOverlayData): readonly string[] {
  return [
    `Current FPS  ${data.currentFps.toFixed(1)}`,
    `10s average  ${data.averageFps.toFixed(1)}`,
    `Particles    ${data.activeParticles} / ${data.peakParticles} peak`,
    `Effects      ${data.activeTransientEffects} / ${data.peakTransientEffects} peak`,
    `Budget       ${data.passes ? 'PASS' : data.isFullWindowReady ? 'FAIL' : 'FAIL (warming)'}`,
  ];
}

export function paintPerformanceBudgetOverlay(
  context: CanvasRenderingContext2D,
  data: PerformanceOverlayData,
): void {
  const layout = PERFORMANCE_OVERLAY_LAYOUT;
  const rows = createPerformanceOverlayRows(data);
  context.save();
  context.globalAlpha = 0.92;
  context.fillStyle = VISUAL_THEME.background;
  context.fillRect(layout.x, layout.y, layout.width, layout.height);
  context.globalAlpha = 1;
  context.strokeStyle = data.passes ? VISUAL_THEME.mycelium : VISUAL_THEME.danger;
  context.lineWidth = 2;
  context.strokeRect(layout.x, layout.y, layout.width, layout.height);
  context.font = '13px sans-serif';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  for (let index = 0; index < rows.length; index += 1) {
    context.fillStyle = index === rows.length - 1
      ? data.passes ? VISUAL_THEME.mycelium : VISUAL_THEME.danger
      : index === 0 ? VISUAL_THEME.text : VISUAL_THEME.textMuted;
    context.fillText(rows[index], layout.x + 16, layout.y + 18 + index * 22);
  }
  context.restore();
}

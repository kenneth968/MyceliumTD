import type { PauseMenuRenderData } from './pauseMenuRender';

export function getPauseMenuButtonAtPosition(
  x: number,
  y: number,
  renderData: PauseMenuRenderData,
): string | null {
  if (!renderData.isVisible || renderData.buttons.length === 0) return null;
  for (const button of renderData.buttons) {
    if (!button.isVisible || !button.isEnabled) continue;
    const left = button.position.x - button.size.width / 2;
    const right = button.position.x + button.size.width / 2;
    const top = button.position.y - button.size.height / 2;
    const bottom = button.position.y + button.size.height / 2;
    if (x >= left && x <= right && y >= top && y <= bottom) return button.id;
  }
  return null;
}

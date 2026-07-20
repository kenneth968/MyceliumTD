import {
  getTowerGrowthActionAtPosition,
  type TowerGrowthAction,
  type TowerInfoPanelRenderData,
} from './towerInfoPanel';

export type TowerInfoPanelClickRoute =
  | { readonly consumed: false; readonly action: null }
  | { readonly consumed: true; readonly action: TowerGrowthAction | null };

export function routeTowerInfoPanelClick(
  panel: TowerInfoPanelRenderData,
  screenX: number,
  screenY: number,
): TowerInfoPanelClickRoute {
  if (!panel.isVisible || !containsPoint(panel, screenX, screenY)) {
    return { consumed: false, action: null };
  }
  const action = getTowerGrowthActionAtPosition(panel, screenX, screenY);
  return { consumed: true, action };
}

function containsPoint(panel: TowerInfoPanelRenderData, x: number, y: number): boolean {
  return x >= panel.position.x
    && x <= panel.position.x + panel.size.width
    && y >= panel.position.y
    && y <= panel.position.y + panel.size.height;
}

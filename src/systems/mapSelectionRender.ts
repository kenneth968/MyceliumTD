import { Vec2 } from '../utils/vec2';
import { MapDifficulty, MapTheme, getMapDifficultyLabel, getMapThemeLabel, getMapThemeColor, getDifficultyColor, LevelSelectRenderData, getLevelSelectRenderData, getMapAtPosition } from './mapLevel';
import { GameState } from './gameRunner';

export enum MapSelectionState {
  Hidden = 'hidden',
  Entering = 'entering',
  Visible = 'visible',
  Exiting = 'exiting',
}

export interface MapCardButton {
  id: string;
  position: Vec2;
  size: { width: number; height: number };
  isHovered: boolean;
  isLocked: boolean;
  isSelected: boolean;
  mapId: string;
}

export interface MapSelectionRenderData {
  state: MapSelectionState;
  isVisible: boolean;
  cards: MapCardRenderData[];
  buttons: MapCardButton[];
  title: string;
  titleColor: string;
  titlePosition: Vec2;
  selectedMapId: string | null;
  hoveredMapId: string | null;
  elapsed: number;
  progress: number;
  totalMaps: number;
}

export interface MapCardRenderData {
  id: string;
  name: string;
  difficulty: MapDifficulty;
  difficultyLabel: string;
  difficultyColor: string;
  theme: MapTheme;
  themeLabel: string;
  themeColor: string;
  position: Vec2;
  size: { width: number; height: number };
  isHovered: boolean;
  isLocked: boolean;
  isSelected: boolean;
  pathPreview: Vec2[];
  maxWaves: number;
  towerCount: number;
  startingMoneyLabel: string;
  startingLivesLabel: string;
  cardColor: string;
  borderColor: string;
  borderWidth: number;
  opacity: number;
}

const MAP_SELECTION_ANIMATION_TIMES = {
  fadeInDuration: 300,
  holdDuration: 0,
  fadeOutDuration: 200,
  totalDuration: 500,
};

const MAP_CARD_STYLES = {
  background: 'rgba(30, 30, 40, 0.95)',
  hoverBackground: 'rgba(50, 50, 70, 0.98)',
  lockedBackground: 'rgba(20, 20, 30, 0.9)',
  border: '#4A4A5A',
  hoverBorder: '#FFD700',
  lockedBorder: '#333344',
  selectedBorder: '#00FF88',
  textColor: '#FFFFFF',
  dimTextColor: '#888888',
  titleColor: '#FFD700',
};

export interface MapSelectionAnimator {
  state: MapSelectionState;
  elapsed: number;
  progress: number;
  isVisible: boolean;
  opacity: number;
}

export function createMapSelectionAnimator(): MapSelectionAnimator {
  return {
    state: MapSelectionState.Hidden,
    elapsed: 0,
    progress: 0,
    isVisible: false,
    opacity: 0,
  };
}

export function updateMapSelection(
  animator: MapSelectionAnimator,
  deltaTime: number,
  targetVisible: boolean
): void {
  const wasVisible = animator.isVisible;

  if (targetVisible) {
    if (!wasVisible) {
      animator.state = MapSelectionState.Entering;
      animator.elapsed = 0;
    }
    animator.isVisible = true;

    if (animator.state === MapSelectionState.Entering) {
      animator.elapsed += deltaTime;
      animator.progress = Math.min(animator.elapsed / MAP_SELECTION_ANIMATION_TIMES.fadeInDuration, 1);
      animator.opacity = animator.progress;
      if (animator.progress >= 1) {
        animator.state = MapSelectionState.Visible;
        animator.opacity = 1;
      }
    } else if (animator.state === MapSelectionState.Exiting) {
      animator.state = MapSelectionState.Entering;
      animator.elapsed = MAP_SELECTION_ANIMATION_TIMES.fadeInDuration * animator.progress;
    }
  } else {
    if (wasVisible) {
      animator.state = MapSelectionState.Exiting;
      animator.elapsed = 0;
    }

    if (animator.state === MapSelectionState.Exiting) {
      animator.elapsed += deltaTime;
      const fadeOutProgress = animator.elapsed / MAP_SELECTION_ANIMATION_TIMES.fadeOutDuration;
      animator.progress = 1 - Math.min(fadeOutProgress, 1);
      animator.opacity = animator.progress;
      if (animator.progress <= 0) {
        animator.state = MapSelectionState.Hidden;
        animator.isVisible = false;
        animator.opacity = 0;
      }
    }
  }
}

export function getMapSelectionRenderData(
  selectedMapId: string | null,
  hoveredMapId: string | null,
  viewportWidth: number,
  viewportHeight: number,
  animator: MapSelectionAnimator
): MapSelectionRenderData {
  const levelSelectData = getLevelSelectRenderData(selectedMapId, hoveredMapId, viewportWidth, viewportHeight);

  const cards: MapCardRenderData[] = levelSelectData.maps.map(mapData => {
    const isHovered = hoveredMapId === mapData.id;
    const isSelected = selectedMapId === mapData.id;
    const isLocked = mapData.isLocked;

    let cardColor = MAP_CARD_STYLES.background;
    if (isLocked) cardColor = MAP_CARD_STYLES.lockedBackground;
    else if (isHovered) cardColor = MAP_CARD_STYLES.hoverBackground;

    let borderColor = MAP_CARD_STYLES.border;
    if (isLocked) borderColor = MAP_CARD_STYLES.lockedBorder;
    else if (isSelected) borderColor = MAP_CARD_STYLES.selectedBorder;
    else if (isHovered) borderColor = MAP_CARD_STYLES.hoverBorder;

    let borderWidth = 2;
    if (isSelected) borderWidth = 3;

    const moneyLabel = mapData.startingMoneyModifier === 1.0
      ? 'Normal'
      : mapData.startingMoneyModifier > 1.0
        ? `+${Math.round((mapData.startingMoneyModifier - 1) * 100)}%`
        : `-${Math.round((1 - mapData.startingMoneyModifier) * 100)}%`;

    const livesLabel = mapData.startingLivesModifier === 1.0
      ? 'Normal'
      : mapData.startingLivesModifier > 1.0
        ? `+${Math.round((mapData.startingLivesModifier - 1) * 100)}%`
        : `-${Math.round((1 - mapData.startingLivesModifier) * 100)}%`;

    return {
      id: mapData.id,
      name: mapData.name,
      difficulty: mapData.difficulty,
      difficultyLabel: mapData.difficultyLabel,
      difficultyColor: mapData.difficultyColor,
      theme: mapData.theme,
      themeLabel: mapData.themeLabel,
      themeColor: mapData.themeColor,
      position: { x: 0, y: 0 },
      size: { width: 200, height: 250 },
      isHovered,
      isLocked,
      isSelected,
      pathPreview: mapData.pathPoints,
      maxWaves: mapData.maxWaves,
      towerCount: mapData.availableTowerCount,
      startingMoneyLabel: moneyLabel,
      startingLivesLabel: livesLabel,
      cardColor,
      borderColor,
      borderWidth,
      opacity: isLocked ? 0.6 : 1,
    };
  });

  const buttons: MapCardButton[] = levelSelectData.buttons.map(btn => ({
    id: btn.mapId,
    mapId: btn.mapId,
    position: btn.position,
    size: btn.size,
    isHovered: btn.isHovered,
    isLocked: btn.isLocked,
    isSelected: selectedMapId === btn.mapId,
  }));

  let titleColor = MAP_CARD_STYLES.titleColor;
  let title = 'SELECT MAP';

  return {
    state: animator.state,
    isVisible: animator.isVisible,
    cards,
    buttons,
    title,
    titleColor,
    titlePosition: { x: viewportWidth / 2, y: 40 },
    selectedMapId,
    hoveredMapId,
    elapsed: animator.elapsed,
    progress: animator.progress,
    totalMaps: cards.length,
  };
}

export function getMapCardPosition(
  mapIndex: number,
  viewportWidth: number,
  viewportHeight: number
): { x: number; y: number; width: number; height: number } {
  const MAP_CARD_WIDTH = 200;
  const MAP_CARD_HEIGHT = 250;
  const MAP_CARD_SPACING = 30;
  const MAPS_PER_ROW = Math.floor((viewportWidth - 60) / (MAP_CARD_WIDTH + MAP_CARD_SPACING));
  const START_X = (viewportWidth - (MAPS_PER_ROW * (MAP_CARD_WIDTH + MAP_CARD_SPACING) - MAP_CARD_SPACING)) / 2;
  const START_Y = 80;

  const row = Math.floor(mapIndex / MAPS_PER_ROW);
  const col = mapIndex % MAPS_PER_ROW;
  const x = START_X + col * (MAP_CARD_WIDTH + MAP_CARD_SPACING);
  const y = START_Y + row * (MAP_CARD_HEIGHT + MAP_CARD_SPACING);

  return { x, y, width: MAP_CARD_WIDTH, height: MAP_CARD_HEIGHT };
}

export function getMapSelectionButtonAtPosition(
  x: number,
  y: number,
  renderData: MapSelectionRenderData
): string | null {
  if (!renderData.isVisible) return null;

  for (const button of renderData.buttons) {
    if (
      x >= button.position.x &&
      x <= button.position.x + button.size.width &&
      y >= button.position.y &&
      y <= button.position.y + button.size.height
    ) {
      return button.mapId;
    }
  }
  return null;
}

export function isMapSelectionVisible(animator: MapSelectionAnimator): boolean {
  return animator.isVisible && animator.state !== MapSelectionState.Hidden;
}

export function getMapSelectionOpacity(animator: MapSelectionAnimator): number {
  return animator.opacity;
}

export interface MapSelectionUIState {
  isVisible: boolean;
  canSelect: boolean;
  selectedMapId: string | null;
  totalMaps: number;
  gameState: GameState;
}

export function getMapSelectionUIState(
  animator: MapSelectionAnimator,
  selectedMapId: string | null,
  gameState: GameState
): MapSelectionUIState {
  return {
    isVisible: isMapSelectionVisible(animator),
    canSelect: gameState === GameState.Idle || gameState === GameState.Playing,
    selectedMapId,
    totalMaps: MAP_COUNT,
    gameState,
  };
}

const MAP_COUNT = 6;

export function showMapSelection(animator: MapSelectionAnimator): void {
  animator.isVisible = true;
  animator.state = MapSelectionState.Entering;
  animator.elapsed = 0;
}

export function hideMapSelection(animator: MapSelectionAnimator): void {
  animator.state = MapSelectionState.Exiting;
  animator.elapsed = 0;
}

export function resetMapSelection(animator: MapSelectionAnimator): void {
  animator.state = MapSelectionState.Hidden;
  animator.elapsed = 0;
  animator.progress = 0;
  animator.isVisible = false;
  animator.opacity = 0;
}
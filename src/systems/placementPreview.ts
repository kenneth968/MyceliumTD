import { Vec2 } from '../utils/vec2';
import { TowerType, TOWER_STATS } from '../entities/tower';
import { RangePreview, PathPreview, PathSegmentPreview, PlacementMode } from './input';
import { TowerWithUpgrades, UpgradePath } from './upgrade';
import { TargetingMode } from './targeting';

export interface TargetingModeButton {
  mode: TargetingMode;
  label: string;
  icon: string;
  isSelected: boolean;
  canSelect: boolean;
  position: Vec2;
  size: { width: number; height: number };
}

export interface TargetingModeSelectionRenderData {
  isVisible: boolean;
  buttons: TargetingModeButton[];
  selectedMode: TargetingMode | null;
  description: string;
}

export interface PlacementGhostRenderData {
  position: Vec2;
  towerType: TowerType;
  isValid: boolean;
  range: number;
  color: string;
  glowColor: string;
  size: number;
}

export interface RangeCircleRenderData {
  position: Vec2;
  radius: number;
  isValid: boolean;
  color: string;
  opacity: number;
}

export interface PathCoverageSegment {
  start: Vec2;
  end: Vec2;
  isCovered: boolean;
  opacity: number;
}

export interface PathCoverageRenderData {
  segments: PathCoverageSegment[];
  totalCoveredLength: number;
  totalPathLength: number;
  coveragePercent: number;
}

export interface PlacementPreviewRenderData {
  ghost: PlacementGhostRenderData | null;
  rangeCircle: RangeCircleRenderData | null;
  pathCoverage: PathCoverageRenderData | null;
  isPlacing: boolean;
}

export interface TowerSelectionRenderData {
  towerId: number;
  position: Vec2;
  towerType: TowerType;
  range: number;
  color: string;
  glowColor: string;
  size: number;
  upgradeLevel: number;
  sellValue: number;
  targetingMode: string;
}

export interface TowerUpgradeLevel {
  Damage: number;
  Range: number;
  FireRate: number;
  Special: number;
}

export interface TowerSelectionRangePreview {
  position: Vec2;
  radius: number;
  color: string;
  opacity: number;
}

export interface TowerSelectionPreviewRenderData {
  selection: TowerSelectionRenderData | null;
  upgradeIndicators: TowerUpgradeIndicator[] | null;
  sellButton: TowerSellButton | null;
  isSelecting: boolean;
  rangePreview: TowerSelectionRangePreview | null;
}

const SELECTION_COLORS = {
  valid: {
    primary: '#2196F3',
    glow: '#64B5F6',
  },
};

const TOWER_SIZES: Record<TowerType, number> = {
  [TowerType.PuffballFungus]: 20,
  [TowerType.OrchidTrap]: 18,
  [TowerType.VenusFlytower]: 24,
  [TowerType.BioluminescentShroom]: 16,
  [TowerType.StinkhornLine]: 22,
  [TowerType.MyceliumNetwork]: 25,
};

const PLACEMENT_COLORS = {
  valid: {
    primary: '#4CAF50',
    glow: '#81C784',
  },
  invalid: {
    primary: '#F44336',
    glow: '#EF5350',
  },
  rangeValid: {
    primary: 'rgba(76, 175, 80, 0.3)',
    glow: 'rgba(129, 199, 132, 0.5)',
  },
  rangeInvalid: {
    primary: 'rgba(244, 67, 54, 0.3)',
    glow: 'rgba(239, 83, 80, 0.5)',
  },
  pathCovered: {
    primary: '#8BC34A',
    glow: '#AED581',
  },
  pathUncovered: {
    primary: '#9E9E9E',
    glow: '#BDBDBD',
  },
};

export function getPlacementGhostRenderData(
  position: Vec2,
  towerType: TowerType,
  isValid: boolean
): PlacementGhostRenderData {
  const colors = isValid ? PLACEMENT_COLORS.valid : PLACEMENT_COLORS.invalid;
  const baseSize = TOWER_SIZES[towerType] || 18;

  return {
    position: { ...position },
    towerType,
    isValid,
    range: TOWER_STATS[towerType].range,
    color: colors.primary,
    glowColor: colors.glow,
    size: baseSize,
  };
}

export function getRangeCircleRenderData(
  rangePreview: RangePreview | null
): RangeCircleRenderData | null {
  if (!rangePreview) {
    return null;
  }

  const colors = rangePreview.isValid ? PLACEMENT_COLORS.rangeValid : PLACEMENT_COLORS.rangeInvalid;

  return {
    position: { ...rangePreview.position },
    radius: rangePreview.radius,
    isValid: rangePreview.isValid,
    color: colors.primary,
    opacity: rangePreview.isValid ? 0.3 : 0.2,
  };
}

export function getPathCoverageRenderData(
  pathPreview: PathPreview | null
): PathCoverageRenderData | null {
  if (!pathPreview) {
    return null;
  }

  const segments: PathCoverageSegment[] = pathPreview.segments.map((seg: PathSegmentPreview) => ({
    start: { ...seg.start },
    end: { ...seg.end },
    isCovered: seg.isCovered,
    opacity: seg.isCovered ? 0.8 : 0.3,
  }));

  return {
    segments,
    totalCoveredLength: pathPreview.coveredLength,
    totalPathLength: pathPreview.totalPathLength,
    coveragePercent: pathPreview.totalPathLength > 0
      ? (pathPreview.coveredLength / pathPreview.totalPathLength) * 100
      : 0,
  };
}

export function getPlacementPreviewRenderData(
  placementPosition: Vec2 | null,
  selectedTowerType: TowerType | null,
  placementMode: PlacementMode,
  rangePreview: RangePreview | null,
  pathPreview: PathPreview | null
): PlacementPreviewRenderData {
  if (placementMode !== PlacementMode.Placing || !selectedTowerType || !placementPosition) {
    return {
      ghost: null,
      rangeCircle: null,
      pathCoverage: null,
      isPlacing: false,
    };
  }

  const isValid = rangePreview?.isValid ?? false;

  return {
    ghost: getPlacementGhostRenderData(placementPosition, selectedTowerType, isValid),
    rangeCircle: getRangeCircleRenderData(rangePreview),
    pathCoverage: getPathCoverageRenderData(pathPreview),
    isPlacing: true,
  };
}

export interface TowerPlacementIndicator {
  type: 'circle' | 'square' | 'diamond';
  size: number;
  color: string;
  pulsePhase: number;
}

export function getTowerPlacementIndicator(
  towerType: TowerType,
  time: number,
  isValid: boolean
): TowerPlacementIndicator {
  const pulseSpeed = 0.003;
  const pulsePhase = (time * pulseSpeed) % (2 * Math.PI);

  const typeMap: Record<TowerType, 'circle' | 'square' | 'diamond'> = {
    [TowerType.PuffballFungus]: 'circle',
    [TowerType.OrchidTrap]: 'diamond',
    [TowerType.VenusFlytower]: 'square',
    [TowerType.BioluminescentShroom]: 'circle',
    [TowerType.StinkhornLine]: 'diamond',
    [TowerType.MyceliumNetwork]: 'circle',
  };

  return {
    type: typeMap[towerType] || 'circle',
    size: TOWER_SIZES[towerType] || 18,
    color: isValid ? PLACEMENT_COLORS.valid.primary : PLACEMENT_COLORS.invalid.primary,
    pulsePhase,
  };
}

export function getPathSegmentRenderStyle(
  isCovered: boolean,
  highlightPercent: number = 0
): { color: string; opacity: number; lineWidth: number } {
  const baseOpacity = isCovered ? 0.8 : 0.3;
  const highlightOpacity = highlightPercent > 0 ? 0.2 : 0;
  const color = isCovered ? PLACEMENT_COLORS.pathCovered.primary : PLACEMENT_COLORS.pathUncovered.primary;

  return {
    color,
    opacity: Math.min(baseOpacity + highlightOpacity, 1.0),
    lineWidth: isCovered ? 3 : 2,
  };
}

export interface PlacementValidityDetails {
  isValid: boolean;
  reasons: string[];
  distanceFromPath: number | null;
  distanceFromNearestTower: number | null;
  pathBlocking: boolean;
}

export function getPlacementValidityDetails(
  rangePreview: RangePreview | null,
  pathPreview: PathPreview | null,
  minDistanceFromPath: number = 30,
  minDistanceFromTower: number = 40
): PlacementValidityDetails {
  const reasons: string[] = [];
  let distanceFromPath: number | null = null;
  let distanceFromNearestTower: number | null = null;
  let pathBlocking = false;

  if (rangePreview && !rangePreview.isValid) {
    reasons.push('Too close to path or invalid position');
    distanceFromPath = 0;
  }

  if (pathPreview && pathPreview.totalPathLength > 0) {
    const uncoveredLength = pathPreview.totalPathLength - pathPreview.coveredLength;
    if (uncoveredLength > pathPreview.totalPathLength * 0.9) {
      reasons.push('Tower does not cover any path segment');
    }
  }

  return {
    isValid: reasons.length === 0,
    reasons,
    distanceFromPath,
    distanceFromNearestTower,
    pathBlocking,
  };
}

export function createPlacementPreviewUpdater() {
  let lastUpdateTime = 0;

  return {
    update(time: number): void {
      lastUpdateTime = time;
    },

    getLastUpdateTime(): number {
      return lastUpdateTime;
    },

    shouldPulse(currentTime: number, interval: number = 500): boolean {
      return Math.floor(currentTime / interval) !== Math.floor(lastUpdateTime / interval);
    },
  };
}

export function getTowerSelectionRenderData(
  tower: TowerWithUpgrades,
  position: Vec2
): TowerSelectionRenderData | null {
  const colors = SELECTION_COLORS.valid;

  const upgradeLevel = tower.upgradeLevels[UpgradePath.Damage] +
                       tower.upgradeLevels[UpgradePath.Range] +
                       tower.upgradeLevels[UpgradePath.FireRate] +
                       tower.upgradeLevels[UpgradePath.Special];

  return {
    towerId: tower.id,
    position: { ...position },
    towerType: tower.towerType,
    range: tower.range,
    color: colors.primary,
    glowColor: colors.glow,
    size: TOWER_SIZES[tower.towerType] || 18,
    upgradeLevel,
    sellValue: tower.totalUpgradeCost * 0.7,
    targetingMode: tower.targetingMode,
  };
}

export interface TowerUpgradeIndicator {
  path: string;
  currentTier: number;
  maxTier: number;
  canUpgrade: boolean;
  nextCost: number;
}

export function getTowerUpgradeIndicators(
  tower: TowerWithUpgrades,
  canAffordUpgrade: (path: UpgradePath, tier: number) => boolean,
  getUpgradeCostFn: (towerType: TowerType, path: UpgradePath, tier: number) => number
): TowerUpgradeIndicator[] {
  const paths: Array<{ path: UpgradePath; currentTier: number }> = [
    { path: UpgradePath.Damage, currentTier: tower.upgradeLevels[UpgradePath.Damage] },
    { path: UpgradePath.Range, currentTier: tower.upgradeLevels[UpgradePath.Range] },
    { path: UpgradePath.FireRate, currentTier: tower.upgradeLevels[UpgradePath.FireRate] },
    { path: UpgradePath.Special, currentTier: tower.upgradeLevels[UpgradePath.Special] },
  ];

  return paths.map(({ path, currentTier }) => {
    const nextTier = currentTier + 1;
    const canUpgrade = currentTier < 3 && canAffordUpgrade(path, nextTier);
    const nextCost = currentTier < 3 ? getUpgradeCostFn(tower.towerType, path, nextTier) : 0;

    return {
      path: path as string,
      currentTier,
      maxTier: 3,
      canUpgrade,
      nextCost,
    };
  });
}

export interface TowerSellButton {
  position: Vec2;
  size: { width: number; height: number };
  sellValue: number;
  color: string;
  textColor: string;
}

export function getSellButtonPosition(anchorPosition: Vec2, towerPosition: Vec2): Vec2 {
  return {
    x: towerPosition.x + 40,
    y: towerPosition.y - 60,
  };
}

export function getSellButtonSize(): { width: number; height: number } {
  return { width: 80, height: 36 };
}

export function getTowerSellButton(
  tower: TowerWithUpgrades,
  position?: Vec2
): TowerSellButton {
  const sellValue = tower.totalUpgradeCost * 0.7;
  const buttonPosition = position ? getSellButtonPosition(position, position) : { x: 0, y: 0 };
  return {
    position: buttonPosition,
    size: getSellButtonSize(),
    sellValue: Math.round(sellValue),
    color: '#F44336',
    textColor: '#FFFFFF',
  };
}

export function getTowerSelectionRangePreview(
  tower: TowerWithUpgrades,
  position: Vec2
): TowerSelectionRangePreview {
  return {
    position: { ...position },
    radius: tower.range,
    color: SELECTION_COLORS.valid.primary,
    opacity: 0.25,
  };
}

export function getTowerSelectionPreviewRenderData(
  tower: TowerWithUpgrades | null,
  position: Vec2 | null,
  placementMode: PlacementMode,
  canAffordUpgrade: (path: UpgradePath, tier: number) => boolean,
  getUpgradeCostFn: (towerType: TowerType, path: UpgradePath, tier: number) => number
): TowerSelectionPreviewRenderData {
  if (placementMode !== PlacementMode.Selecting || !tower || !position) {
    return {
      selection: null,
      upgradeIndicators: null,
      sellButton: null,
      isSelecting: false,
      rangePreview: null,
    };
  }

  const selection = getTowerSelectionRenderData(tower, position);
  const upgradeIndicators = getTowerUpgradeIndicators(tower, canAffordUpgrade, getUpgradeCostFn);
  const sellButton = getTowerSellButton(tower, position);
  const rangePreview = getTowerSelectionRangePreview(tower, position);

  return {
    selection,
    upgradeIndicators,
    sellButton,
    isSelecting: true,
    rangePreview,
  };
}

const TARGETING_MODE_INFO: Record<TargetingMode, { label: string; icon: string; description: string }> = {
  [TargetingMode.First]: { label: 'First', icon: '>>', description: 'Targets the enemy furthest along the path' },
  [TargetingMode.Last]: { label: 'Last', icon: '<<', description: 'Targets the enemy closest to the start' },
  [TargetingMode.Close]: { label: 'Close', icon: 'O-', description: 'Targets the enemy closest to the tower' },
  [TargetingMode.Strong]: { label: 'Strong', icon: '[]', description: 'Targets the enemy with the most HP' },
};

export function getTargetingModeDescription(mode: TargetingMode): string {
  return TARGETING_MODE_INFO[mode]?.description ?? '';
}

export function getTargetingModeLabel(mode: TargetingMode): string {
  return TARGETING_MODE_INFO[mode]?.label ?? mode;
}

export function getTargetingModeIcon(mode: TargetingMode): string {
  return TARGETING_MODE_INFO[mode]?.icon ?? '?';
}

const TARGETING_MODE_BUTTON_WIDTH = 60;
const TARGETING_MODE_BUTTON_HEIGHT = 40;
const TARGETING_MODE_BUTTON_SPACING = 8;
const TARGETING_MODE_UI_OFFSET_Y = 80;

export function getTargetingModeButtons(
  selectedMode: TargetingMode,
  anchorPosition: Vec2
): TargetingModeButton[] {
  const modes = [TargetingMode.First, TargetingMode.Last, TargetingMode.Close, TargetingMode.Strong];
  const totalWidth = modes.length * TARGETING_MODE_BUTTON_WIDTH + (modes.length - 1) * TARGETING_MODE_BUTTON_SPACING;
  const startX = anchorPosition.x - totalWidth / 2;
  const y = anchorPosition.y + TARGETING_MODE_UI_OFFSET_Y;

  return modes.map((mode, index) => ({
    mode,
    label: getTargetingModeLabel(mode),
    icon: getTargetingModeIcon(mode),
    isSelected: mode === selectedMode,
    canSelect: true,
    position: { x: startX + index * (TARGETING_MODE_BUTTON_WIDTH + TARGETING_MODE_BUTTON_SPACING), y },
    size: { width: TARGETING_MODE_BUTTON_WIDTH, height: TARGETING_MODE_BUTTON_HEIGHT },
  }));
}

export function getTargetingModeAtPosition(
  buttons: TargetingModeButton[],
  x: number,
  y: number
): TargetingMode | null {
  for (const button of buttons) {
    if (
      x >= button.position.x &&
      x <= button.position.x + button.size.width &&
      y >= button.position.y &&
      y <= button.position.y + button.size.height
    ) {
      return button.mode;
    }
  }
  return null;
}

export function getSellButtonAtPosition(
  sellButton: TowerSellButton,
  x: number,
  y: number
): boolean {
  if (!sellButton) {
    return false;
  }
  return (
    x >= sellButton.position.x &&
    x <= sellButton.position.x + sellButton.size.width &&
    y >= sellButton.position.y &&
    y <= sellButton.position.y + sellButton.size.height
  );
}

export function getTargetingModeSelectionRenderData(
  placementMode: PlacementMode,
  selectedTowerType: TowerType | null,
  placementPosition: Vec2 | null,
  currentSelectedMode: TargetingMode = TargetingMode.First
): TargetingModeSelectionRenderData {
  if (placementMode !== PlacementMode.Placing || !selectedTowerType || !placementPosition) {
    return {
      isVisible: false,
      buttons: [],
      selectedMode: null,
      description: '',
    };
  }

  const buttons = getTargetingModeButtons(currentSelectedMode, placementPosition);
  const description = TARGETING_MODE_INFO[currentSelectedMode]?.description ?? '';

  return {
    isVisible: true,
    buttons,
    selectedMode: currentSelectedMode,
    description,
  };
}

export interface PlacementPreviewWithTargetingRenderData extends PlacementPreviewRenderData {
  targetingModeSelection: TargetingModeSelectionRenderData;
}
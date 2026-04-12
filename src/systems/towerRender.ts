import { Vec2 } from '../utils/vec2';
import { Tower, TowerType, TOWER_STATS } from '../entities/tower';
import { TargetingMode } from './targeting';

export enum TowerGrowthStage {
  Sprout = 'sprout',
  Growing = 'growing',
  Mature = 'mature',
  FullyMatured = 'fully_matured',
}

export interface TowerRenderData {
  id: number;
  towerType: TowerType;
  position: Vec2;
  rotation: number;
  scale: number;
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  baseRadius: number;
  bodyRadius: number;
  showRange: boolean;
  rangeRadius: number;
  isSelected: boolean;
  isFiring: boolean;
  cooldownProgress: number;
  targetingMode: TargetingMode;
  specialEffect?: string;
  upgradeLevel: number;
  totalUpgradeValue: number;
  growthStage: TowerGrowthStage;
  growthProgress: number;
}

export interface TowerSpriteFrame {
  towerType: TowerType;
  animationState: TowerAnimationState;
  frameIndex: number;
  duration: number;
  scale: number;
  rotation: number;
}

export enum TowerAnimationState {
  Idle = 'idle',
  Firing = 'firing',
  Targeting = 'targeting',
  Cooldown = 'cooldown',
  Selected = 'selected',
  UpgradeGlow = 'upgrade_glow',
}

const TOWER_VISUAL_CONFIGS: Record<TowerType, {
  primary: string;
  secondary: string;
  glow: string;
  baseRadius: number;
  bodyRadius: number;
  bodyShape: 'circle' | 'hexagon' | 'diamond' | 'star';
  animationSpeed: number;
}> = {
  [TowerType.PuffballFungus]: {
    primary: '#9B59B6',
    secondary: '#8E44AD',
    glow: '#D7BDE2',
    baseRadius: 18,
    bodyRadius: 14,
    bodyShape: 'circle',
    animationSpeed: 1.0,
  },
  [TowerType.OrchidTrap]: {
    primary: '#3498DB',
    secondary: '#2980B9',
    glow: '#AED6F1',
    baseRadius: 20,
    bodyRadius: 16,
    bodyShape: 'hexagon',
    animationSpeed: 0.8,
  },
  [TowerType.VenusFlytower]: {
    primary: '#E74C3C',
    secondary: '#C0392B',
    glow: '#FADBD8',
    baseRadius: 24,
    bodyRadius: 20,
    bodyShape: 'diamond',
    animationSpeed: 1.2,
  },
  [TowerType.BioluminescentShroom]: {
    primary: '#1ABC9C',
    secondary: '#16A085',
    glow: '#A3E4D7',
    baseRadius: 16,
    bodyRadius: 12,
    bodyShape: 'circle',
    animationSpeed: 0.6,
  },
  [TowerType.StinkhornLine]: {
    primary: '#27AE60',
    secondary: '#1E8449',
    glow: '#A9DFBF',
    baseRadius: 22,
    bodyRadius: 10,
    bodyShape: 'star',
    animationSpeed: 0.9,
  },
  [TowerType.MyceliumNetwork]: {
    primary: '#8E44AD',
    secondary: '#6C3483',
    glow: '#D7BDE2',
    baseRadius: 25,
    bodyRadius: 18,
    bodyShape: 'circle',
    animationSpeed: 0.7,
  },
};

const TARGETING_MODE_COLORS: Record<TargetingMode, string> = {
  [TargetingMode.First]: '#E74C3C',
  [TargetingMode.Last]: '#3498DB',
  [TargetingMode.Close]: '#F39C12',
  [TargetingMode.Strong]: '#9B59B6',
};

export function getTowerVisualConfig(towerType: TowerType) {
  return TOWER_VISUAL_CONFIGS[towerType] || TOWER_VISUAL_CONFIGS[TowerType.PuffballFungus];
}

export function getTowerColors(towerType: TowerType): { primary: string; secondary: string; glow: string } {
  const config = getTowerVisualConfig(towerType);
  return {
    primary: config.primary,
    secondary: config.secondary,
    glow: config.glow,
  };
}

export function getTowerRadii(towerType: TowerType): { baseRadius: number; bodyRadius: number } {
  const config = getTowerVisualConfig(towerType);
  return {
    baseRadius: config.baseRadius,
    bodyRadius: config.bodyRadius,
  };
}

export function getTowerBodyShape(towerType: TowerType): 'circle' | 'hexagon' | 'diamond' | 'star' {
  const config = getTowerVisualConfig(towerType);
  return config.bodyShape;
}

export function getTowerRenderData(
  tower: Tower,
  options?: {
    showRange?: boolean;
    isSelected?: boolean;
    isFiring?: boolean;
    cooldownProgress?: number;
    upgradeLevel?: number;
    totalUpgradeValue?: number;
  }
): TowerRenderData {
  const stats = TOWER_STATS[tower.towerType];
  const totalUpgradeValue = options?.totalUpgradeValue ?? 0;
  const { stage, progress } = getTowerGrowthStage(totalUpgradeValue);
  const stageConfig = getTowerVisualConfigForStage(tower.towerType, stage);

  return {
    id: tower.id,
    towerType: tower.towerType,
    position: { ...tower.position },
    rotation: 0,
    scale: 1.0,
    primaryColor: stageConfig.primary,
    secondaryColor: stageConfig.secondary,
    glowColor: stageConfig.glow,
    baseRadius: stageConfig.baseRadius,
    bodyRadius: stageConfig.bodyRadius,
    showRange: options?.showRange ?? false,
    rangeRadius: tower.range,
    isSelected: options?.isSelected ?? false,
    isFiring: options?.isFiring ?? false,
    cooldownProgress: options?.cooldownProgress ?? 0,
    targetingMode: tower.targetingMode,
    specialEffect: stats.specialEffect,
    upgradeLevel: options?.upgradeLevel ?? 0,
    totalUpgradeValue,
    growthStage: stage,
    growthProgress: progress,
  };
}

export interface TowerRenderCollection {
  towers: TowerRenderData[];
  totalCount: number;
  selectedTower: TowerRenderData | null;
}

export function getTowerGrowthStage(totalUpgradeValue: number): { stage: TowerGrowthStage; progress: number } {
  if (totalUpgradeValue <= 50) {
    return { stage: TowerGrowthStage.Sprout, progress: totalUpgradeValue / 50 };
  } else if (totalUpgradeValue <= 150) {
    return { stage: TowerGrowthStage.Growing, progress: (totalUpgradeValue - 50) / 100 };
  } else if (totalUpgradeValue <= 300) {
    return { stage: TowerGrowthStage.Mature, progress: (totalUpgradeValue - 150) / 150 };
  } else {
    return { stage: TowerGrowthStage.FullyMatured, progress: Math.min(1, (totalUpgradeValue - 300) / 200) };
  }
}

export function getTowerVisualConfigForStage(
  towerType: TowerType,
  stage: TowerGrowthStage
): { primary: string; secondary: string; glow: string; baseRadius: number; bodyRadius: number } {
  const baseConfig = TOWER_VISUAL_CONFIGS[towerType];
  const base = {
    primary: baseConfig.primary,
    secondary: baseConfig.secondary,
    glow: baseConfig.glow,
    baseRadius: baseConfig.baseRadius,
    bodyRadius: baseConfig.bodyRadius,
  };

  switch (stage) {
    case TowerGrowthStage.Sprout:
      return {
        ...base,
        primary: adjustColorBrightness(base.primary, 0.6),
        secondary: adjustColorBrightness(base.secondary, 0.5),
        glow: adjustColorBrightness(base.glow, 0.4),
        baseRadius: base.baseRadius * 0.5,
        bodyRadius: base.bodyRadius * 0.4,
      };
    case TowerGrowthStage.Growing:
      return {
        ...base,
        primary: adjustColorBrightness(base.primary, 0.8),
        secondary: adjustColorBrightness(base.secondary, 0.7),
        glow: adjustColorBrightness(base.glow, 0.6),
        baseRadius: base.baseRadius * 0.75,
        bodyRadius: base.bodyRadius * 0.65,
      };
    case TowerGrowthStage.Mature:
      return {
        ...base,
        primary: adjustColorBrightness(base.primary, 0.95),
        secondary: adjustColorBrightness(base.secondary, 0.9),
        glow: adjustColorBrightness(base.glow, 0.85),
        baseRadius: base.baseRadius * 0.9,
        bodyRadius: base.bodyRadius * 0.85,
      };
    case TowerGrowthStage.FullyMatured:
      return {
        ...base,
        primary: adjustColorBrightness(base.primary, 1.1),
        secondary: adjustColorBrightness(base.secondary, 1.05),
        glow: adjustColorBrightness(base.glow, 1.15),
        baseRadius: base.baseRadius * 1.05,
        bodyRadius: base.bodyRadius * 1.1,
      };
  }
}

export function adjustColorBrightness(hexColor: string, factor: number): string {
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  const adjustedR = Math.min(255, Math.floor(r * factor));
  const adjustedG = Math.min(255, Math.floor(g * factor));
  const adjustedB = Math.min(255, Math.floor(b * factor));
  
  return `#${adjustedR.toString(16).padStart(2, '0')}${adjustedG.toString(16).padStart(2, '0')}${adjustedB.toString(16).padStart(2, '0')}`;
}

export function getTowersRenderData(
  towers: Tower[],
  options?: {
    showRangeForSelected?: boolean;
    selectedTowerId?: number | null;
    firingTowerIds?: Set<number>;
    cooldownProgressMap?: Map<number, number>;
    upgradeLevelMap?: Map<number, number>;
    totalUpgradeValueMap?: Map<number, number>;
  }
): TowerRenderCollection {
  const selectedTowerId = options?.selectedTowerId ?? null;
  const firingIds = options?.firingTowerIds ?? new Set<number>();
  const cooldownMap = options?.cooldownProgressMap ?? new Map();
  const upgradeLevelMap = options?.upgradeLevelMap ?? new Map();
  const totalUpgradeValueMap = options?.totalUpgradeValueMap ?? new Map();

  const towersRenderData = towers.map(tower => {
    const showRange = tower.id === selectedTowerId && (options?.showRangeForSelected ?? true);
    const isSelected = tower.id === selectedTowerId;
    const isFiring = firingIds.has(tower.id);
    const cooldownProgress = cooldownMap.get(tower.id) ?? 0;
    const upgradeLevel = upgradeLevelMap.get(tower.id) ?? 0;
    const totalUpgradeValue = totalUpgradeValueMap.get(tower.id) ?? 0;

    return getTowerRenderData(tower, {
      showRange,
      isSelected,
      isFiring,
      cooldownProgress,
      upgradeLevel,
      totalUpgradeValue,
    });
  });

  let selectedTower: TowerRenderData | null = null;
  if (selectedTowerId !== null) {
    selectedTower = towersRenderData.find(t => t.id === selectedTowerId) ?? null;
  }

  return {
    towers: towersRenderData,
    totalCount: towersRenderData.length,
    selectedTower,
  };
}

export function getAnimationState(
  towerType: TowerType,
  animationState: TowerAnimationState,
  time: number
): { scale: number; rotation: number; glowIntensity: number } {
  const config = getTowerVisualConfig(towerType);
  const normalizedTime = time * config.animationSpeed * 0.001;

  let scale = 1.0;
  let rotation = 0;
  let glowIntensity = 0.3;

  switch (animationState) {
    case TowerAnimationState.Idle:
      scale = 1.0 + 0.02 * Math.sin(normalizedTime * 2);
      glowIntensity = 0.3 + 0.1 * Math.sin(normalizedTime * 2);
      break;
    case TowerAnimationState.Firing:
      scale = 1.15 + 0.05 * Math.sin(normalizedTime * 10);
      glowIntensity = 0.8;
      break;
    case TowerAnimationState.Targeting:
      rotation = Math.sin(normalizedTime * 3) * 0.1;
      scale = 1.05;
      glowIntensity = 0.5;
      break;
    case TowerAnimationState.Cooldown:
      scale = 1.0 - 0.03 * Math.sin(normalizedTime * 4);
      glowIntensity = 0.2;
      break;
    case TowerAnimationState.Selected:
      scale = 1.08;
      glowIntensity = 0.6 + 0.2 * Math.sin(normalizedTime * 4);
      break;
    case TowerAnimationState.UpgradeGlow:
      scale = 1.1;
      glowIntensity = 0.9;
      break;
  }

  return { scale, rotation, glowIntensity };
}

export function getTowerAnimationState(
  tower: Tower,
  isFiring: boolean,
  isSelected: boolean,
  cooldownProgress: number,
  time: number
): TowerAnimationState {
  if (isFiring) {
    return TowerAnimationState.Firing;
  }
  if (isSelected) {
    return TowerAnimationState.Selected;
  }
  if (cooldownProgress < 1.0) {
    return TowerAnimationState.Cooldown;
  }
  return TowerAnimationState.Idle;
}

export function getAnimatedTowerRenderData(
  tower: Tower,
  time: number,
  options?: {
    showRange?: boolean;
    isSelected?: boolean;
    isFiring?: boolean;
    cooldownProgress?: number;
    upgradeLevel?: number;
    totalUpgradeValue?: number;
  }
): TowerRenderData {
  const isFiring = options?.isFiring ?? false;
  const isSelected = options?.isSelected ?? false;
  const cooldownProgress = options?.cooldownProgress ?? 0;

  const baseData = getTowerRenderData(tower, options);
  const animState = getTowerAnimationState(tower, isFiring, isSelected, cooldownProgress, time);
  const animation = getAnimationState(tower.towerType, animState, time);

  return {
    ...baseData,
    scale: animation.scale,
    rotation: animation.rotation,
  };
}

export function getTargetingModeIndicatorColor(mode: TargetingMode): string {
  return TARGETING_MODE_COLORS[mode] || '#FFFFFF';
}

export function getTowerFacingAngle(tower: Tower, targetPosition: Vec2): number {
  const dx = targetPosition.x - tower.position.x;
  const dy = targetPosition.y - tower.position.y;
  return Math.atan2(dy, dx);
}

export interface TowerBaseDecoration {
  type: 'circle' | 'ring' | 'dots';
  color: string;
  radius: number;
  count?: number;
}

export function getTowerBaseDecorations(towerType: TowerType): TowerBaseDecoration[] {
  const config = getTowerVisualConfig(towerType);
  
  switch (config.bodyShape) {
    case 'circle':
      return [
        { type: 'ring', color: config.secondary, radius: config.baseRadius * 0.8 },
      ];
    case 'hexagon':
      return [
        { type: 'dots', color: config.secondary, radius: config.baseRadius * 0.7, count: 6 },
      ];
    case 'diamond':
      return [
        { type: 'ring', color: config.secondary, radius: config.baseRadius * 0.6 },
        { type: 'circle', color: config.glow, radius: config.baseRadius * 0.3 },
      ];
    case 'star':
      return [
        { type: 'dots', color: config.glow, radius: config.baseRadius * 0.8, count: 5 },
      ];
    default:
      return [];
  }
}

export interface UpgradeTierVisual {
  tier: number;
  color: string;
  ringRadius: number;
  symbol: string;
}

export function getUpgradeTierVisuals(towerType: TowerType): UpgradeTierVisual[] {
  return [
    { tier: 1, color: '#3498DB', ringRadius: 22, symbol: 'I' },
    { tier: 2, color: '#9B59B6', ringRadius: 24, symbol: 'II' },
    { tier: 3, color: '#E74C3C', ringRadius: 26, symbol: 'III' },
  ];
}

export function getUpgradeIndicatorForTower(
  towerType: TowerType,
  upgradeLevel: number
): UpgradeTierVisual | null {
  if (upgradeLevel <= 0) {
    return null;
  }
  const tiers = getUpgradeTierVisuals(towerType);
  const tierIndex = Math.min(upgradeLevel - 1, tiers.length - 1);
  return tiers[tierIndex];
}

export interface TowerPlacementGhost {
  towerType: TowerType;
  position: Vec2;
  isValid: boolean;
  invalidReason?: string;
  primaryColor: string;
  glowColor: string;
  baseRadius: number;
  bodyRadius: number;
  rangeRadius: number;
  opacity: number;
}

export function getTowerPlacementGhostData(
  towerType: TowerType,
  position: Vec2,
  range: number,
  isValid: boolean,
  invalidReason?: string,
  opacity: number = 0.7
): TowerPlacementGhost {
  const config = getTowerVisualConfig(towerType);

  return {
    towerType,
    position: { ...position },
    isValid,
    invalidReason,
    primaryColor: config.primary,
    glowColor: config.glow,
    baseRadius: config.baseRadius,
    bodyRadius: config.bodyRadius,
    rangeRadius: range,
    opacity,
  };
}

export interface TowerUpgradePathIndicator {
  path: 'damage' | 'range' | 'fireRate' | 'special';
  currentTier: number;
  maxTiers: number;
  color: string;
  iconSymbol: string;
  isMaxed: boolean;
}

export function getUpgradePathIndicators(
  upgradeLevel: number
): TowerUpgradePathIndicator[] {
  const paths: Array<'damage' | 'range' | 'fireRate'> = ['damage', 'range', 'fireRate'];
  const colors = {
    damage: '#E74C3C',
    range: '#3498DB',
    fireRate: '#F39C12',
    special: '#9B59B6',
  };
  const icons = {
    damage: '!',
    range: 'O',
    fireRate: '>',
    special: '*',
  };

  const tierPerPath = Math.floor(upgradeLevel / 3);
  const extraTiers = upgradeLevel % 3;

  const pathIndicators = paths.map((path, index) => {
    const currentTier = tierPerPath + (index < extraTiers ? 1 : 0);
    return {
      path: path as 'damage' | 'range' | 'fireRate' | 'special',
      currentTier,
      maxTiers: 3,
      color: colors[path],
      iconSymbol: icons[path],
      isMaxed: currentTier >= 3,
    };
  });

  const specialIndicator: TowerUpgradePathIndicator = {
    path: 'special',
    currentTier: 0,
    maxTiers: 3,
    color: colors.special,
    iconSymbol: icons.special,
    isMaxed: false,
  };

  return [...pathIndicators, specialIndicator];
}

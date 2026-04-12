import { Vec2 } from '../utils/vec2';
import { TowerType, TOWER_STATS } from '../entities/tower';
import { TowerWithUpgrades, UpgradePath, getUpgradeInfo, getSpecialEffectInfo, getTotalSellValue, SPECIAL_EFFECT_UPGRADES, SpecialEffectType } from './upgrade';
import { TargetingMode } from './targeting';

export interface TowerStatDisplay {
  label: string;
  value: string;
  currentValue: number;
  maxValue?: number;
}

export interface TowerUpgradeDisplay {
  path: UpgradePath;
  label: string;
  icon: string;
  currentTier: number;
  maxTier: number;
  canUpgrade: boolean;
  nextCost: number;
  statIncrease: string;
}

export interface TowerSpecialEffectDisplay {
  type: string;
  label: string;
  strength: number;
  duration: number | null;
  areaRadius: number | null;
  description: string;
}

export interface TowerInfoPanelRenderData {
  isVisible: boolean;
  towerId: number;
  towerName: string;
  towerType: TowerType;
  position: Vec2;
  size: { width: number; height: number };
  stats: TowerStatDisplay[];
  upgrades: TowerUpgradeDisplay[];
  specialEffect: TowerSpecialEffectDisplay | null;
  targetingMode: {
    mode: TargetingMode;
    label: string;
    icon: string;
  };
  sellValue: number;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
  opacity: number;
  scale: number;
}

const TOWER_NAMES: Record<TowerType, string> = {
  [TowerType.PuffballFungus]: 'Puffball Fungus',
  [TowerType.OrchidTrap]: 'Orchid Trap',
  [TowerType.VenusFlytower]: 'Venus Flytower',
  [TowerType.BioluminescentShroom]: 'Bioluminescent Shroom',
  [TowerType.StinkhornLine]: 'Stinkhorn Line',
  [TowerType.MyceliumNetwork]: 'Mycelium Network',
};

const TOWER_ICONS: Record<TowerType, string> = {
  [TowerType.PuffballFungus]: '🌿',
  [TowerType.OrchidTrap]: '🌸',
  [TowerType.VenusFlytower]: '🌺',
  [TowerType.BioluminescentShroom]: '✨',
  [TowerType.StinkhornLine]: '📍',
  [TowerType.MyceliumNetwork]: '🔮',
};

const UPGRADE_PATH_INFO: Record<UpgradePath, { label: string; icon: string; shortLabel: string }> = {
  [UpgradePath.Damage]: { label: 'Damage', icon: '⚔️', shortLabel: 'DMG' },
  [UpgradePath.Range]: { label: 'Range', icon: '🎯', shortLabel: 'RNG' },
  [UpgradePath.FireRate]: { label: 'Fire Rate', icon: '⚡', shortLabel: 'SPD' },
  [UpgradePath.Special]: { label: 'Special', icon: '✨', shortLabel: 'SPC' },
};

const SPECIAL_EFFECT_DESCRIPTIONS: Record<string, string> = {
  [SpecialEffectType.AreaDamage]: 'Deals splash damage to nearby enemies',
  [SpecialEffectType.Slow]: 'Slows enemies, reducing their movement speed',
  [SpecialEffectType.Poison]: 'Poisons enemies, dealing damage over time',
  [SpecialEffectType.Stun]: 'Stuns enemies, temporarily freezing them',
  [SpecialEffectType.Instakill]: 'Instantly defeats enemies below HP threshold',
  [SpecialEffectType.RevealCamo]: 'Reveals hidden camo enemies in range',
};

const PANEL_COLORS = {
  background: 'rgba(20, 20, 30, 0.95)',
  border: '#4A90D9',
  text: '#FFFFFF',
  accent: '#FFD700',
  statLabel: '#B0B0B0',
  statValue: '#FFFFFF',
  upgradeAvailable: '#4CAF50',
  upgradeUnavailable: '#666666',
  sellValue: '#F44336',
};

const PANEL_SIZE = {
  width: 200,
  height: 320,
};

const PANEL_OFFSET = {
  x: 20,
  y: -160,
};

export function getTowerInfoPanelRenderData(
  tower: TowerWithUpgrades | null,
  position: Vec2 | null,
  isSelecting: boolean,
  canAffordUpgrade: (path: UpgradePath, tier: number) => boolean,
  getUpgradeCostFn: (towerType: TowerType, path: UpgradePath, tier: number) => number
): TowerInfoPanelRenderData {
  if (!isSelecting || !tower || !position) {
    return {
      isVisible: false,
      towerId: 0,
      towerName: '',
      towerType: TowerType.PuffballFungus,
      position: { x: 0, y: 0 },
      size: { ...PANEL_SIZE },
      stats: [],
      upgrades: [],
      specialEffect: null,
      targetingMode: { mode: TargetingMode.First, label: 'First', icon: '>>' },
      sellValue: 0,
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: 'transparent',
      accentColor: 'transparent',
      opacity: 0,
      scale: 1,
    };
  }

  const panelPosition: Vec2 = {
    x: position.x + PANEL_OFFSET.x,
    y: position.y + PANEL_OFFSET.y,
  };

  const stats: TowerStatDisplay[] = [
    {
      label: 'Damage',
      value: tower.damage.toString(),
      currentValue: tower.damage,
    },
    {
      label: 'Range',
      value: tower.range.toString(),
      currentValue: tower.range,
    },
    {
      label: 'Fire Rate',
      value: `${tower.fireRate}ms`,
      currentValue: tower.fireRate,
    },
  ];

  const upgradePaths = [
    UpgradePath.Damage,
    UpgradePath.Range,
    UpgradePath.FireRate,
    UpgradePath.Special,
  ];

  const upgrades: TowerUpgradeDisplay[] = upgradePaths.map(path => {
    const info = getUpgradeInfo(tower, path);
    const pathInfo = UPGRADE_PATH_INFO[path];
    const nextTier = info.currentTier + 1;
    const canUpgrade = nextTier <= 3 && canAffordUpgrade(path, nextTier);

    let statIncrease = '';
    if (info.statIncrease > 0) {
      if (path === UpgradePath.FireRate) {
        statIncrease = `-${info.statIncrease}ms`;
      } else if (path === UpgradePath.Special) {
        statIncrease = `+${info.statIncrease}`;
      } else {
        statIncrease = `+${info.statIncrease}`;
      }
    }

    return {
      path,
      label: pathInfo.label,
      icon: pathInfo.icon,
      currentTier: info.currentTier,
      maxTier: 3,
      canUpgrade,
      nextCost: info.nextCost,
      statIncrease,
    };
  });

  const specialEffectInfo = getSpecialEffectInfo(tower);
  const specialEffectParams = SPECIAL_EFFECT_UPGRADES[tower.towerType];

  let specialEffect: TowerSpecialEffectDisplay | null = null;
  if (specialEffectParams) {
    specialEffect = {
      type: specialEffectParams.effectType,
      label: formatSpecialEffectType(specialEffectParams.effectType),
      strength: tower.effectStrength,
      duration: tower.effectDuration > 0 ? tower.effectDuration : null,
      areaRadius: tower.areaRadius ?? null,
      description: SPECIAL_EFFECT_DESCRIPTIONS[specialEffectParams.effectType] || '',
    };
  }

  const targetingLabels: Record<TargetingMode, { label: string; icon: string }> = {
    [TargetingMode.First]: { label: 'First', icon: '>>' },
    [TargetingMode.Last]: { label: 'Last', icon: '<<' },
    [TargetingMode.Close]: { label: 'Close', icon: 'O-' },
    [TargetingMode.Strong]: { label: 'Strong', icon: '[]' },
  };

  const targetingInfo = targetingLabels[tower.targetingMode];

  return {
    isVisible: true,
    towerId: tower.id,
    towerName: TOWER_NAMES[tower.towerType],
    towerType: tower.towerType,
    position: panelPosition,
    size: { ...PANEL_SIZE },
    stats,
    upgrades,
    specialEffect,
    targetingMode: {
      mode: tower.targetingMode,
      label: targetingInfo.label,
      icon: targetingInfo.icon,
    },
    sellValue: getTotalSellValue(tower),
    backgroundColor: PANEL_COLORS.background,
    borderColor: PANEL_COLORS.border,
    textColor: PANEL_COLORS.text,
    accentColor: PANEL_COLORS.accent,
    opacity: 1,
    scale: 1,
  };
}

function formatSpecialEffectType(type: SpecialEffectType): string {
  switch (type) {
    case SpecialEffectType.AreaDamage:
      return 'Area Damage';
    case SpecialEffectType.Slow:
      return 'Slow';
    case SpecialEffectType.Poison:
      return 'Poison';
    case SpecialEffectType.Stun:
      return 'Stun';
    case SpecialEffectType.Instakill:
      return 'Instakill';
    case SpecialEffectType.RevealCamo:
      return 'Reveal Camo';
    default:
      return type;
  }
}

export interface TowerInfoPanelAnimator {
  isShowing: boolean;
  targetOpacity: number;
  currentOpacity: number;
  scale: number;
  animationProgress: number;
}

export function createTowerInfoPanelAnimator(): TowerInfoPanelAnimator {
  return {
    isShowing: false,
    targetOpacity: 1,
    currentOpacity: 0,
    scale: 0.8,
    animationProgress: 0,
  };
}

export function showTowerInfoPanel(
  animator: TowerInfoPanelAnimator
): void {
  animator.isShowing = true;
  animator.targetOpacity = 1;
  animator.animationProgress = 0;
}

export function hideTowerInfoPanel(
  animator: TowerInfoPanelAnimator
): void {
  animator.isShowing = false;
  animator.targetOpacity = 0;
  animator.animationProgress = 0;
}

export function updateTowerInfoPanel(
  animator: TowerInfoPanelAnimator,
  deltaTime: number
): void {
  const fadeSpeed = 0.005;

  if (animator.isShowing && animator.currentOpacity < animator.targetOpacity) {
    animator.currentOpacity = Math.min(animator.targetOpacity, animator.currentOpacity + deltaTime * fadeSpeed);
    animator.scale = 0.8 + 0.2 * (animator.currentOpacity / animator.targetOpacity);
    animator.animationProgress = Math.min(1, animator.animationProgress + deltaTime * fadeSpeed);
  } else if (!animator.isShowing && animator.currentOpacity > animator.targetOpacity) {
    animator.currentOpacity = Math.max(animator.targetOpacity, animator.currentOpacity - deltaTime * fadeSpeed);
    animator.scale = 0.8 + 0.2 * (animator.currentOpacity / 1);
    animator.animationProgress = Math.max(0, animator.animationProgress - deltaTime * fadeSpeed);
  }
}

export function getAnimatedTowerInfoPanel(
  baseData: TowerInfoPanelRenderData,
  animator: TowerInfoPanelAnimator
): TowerInfoPanelRenderData {
  return {
    ...baseData,
    opacity: baseData.isVisible ? animator.currentOpacity : 0,
    scale: animator.scale,
    isVisible: baseData.isVisible && animator.currentOpacity > 0.01,
  };
}

export function isTowerInfoPanelVisible(animator: TowerInfoPanelAnimator): boolean {
  return animator.isShowing && animator.currentOpacity > 0.01;
}

export function getTowerInfoPanelPosition(
  towerPosition: Vec2,
  panelOffset: Vec2 = { x: PANEL_OFFSET.x, y: PANEL_OFFSET.y }
): Vec2 {
  return {
    x: towerPosition.x + panelOffset.x,
    y: towerPosition.y + panelOffset.y,
  };
}

export function getTowerInfoPanelSize(): { width: number; height: number } {
  return { ...PANEL_SIZE };
}

export function getPanelColorConfig() {
  return { ...PANEL_COLORS };
}

export function getTowerIcon(towerType: TowerType): string {
  return TOWER_ICONS[towerType] || '?';
}

export function getUpgradePathIcon(path: UpgradePath): string {
  return UPGRADE_PATH_INFO[path]?.icon || '?';
}

export function getUpgradePathLabel(path: UpgradePath): string {
  return UPGRADE_PATH_INFO[path]?.label || path;
}

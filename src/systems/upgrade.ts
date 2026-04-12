import { Tower, TowerType, TOWER_STATS } from '../entities/tower';
import { TargetingMode } from './targeting';

export enum UpgradePath {
  Damage = 'damage',
  Range = 'range',
  FireRate = 'fire_rate',
  Special = 'special',
}

export enum SpecialEffectType {
  AreaDamage = 'area_damage',
  Slow = 'slow',
  Poison = 'poison',
  Stun = 'stun',
  Instakill = 'instakill',
  RevealCamo = 'reveal_camo',
  NetworkBuff = 'network_buff',
}

export interface SpecialEffectUpgradeParams {
  effectType: SpecialEffectType;
  baseStrength: number;
  strengthPerTier: number[];
  baseDuration: number;
  durationPerTier: number[];
  baseAreaRadius?: number;
  areaRadiusPerTier?: number[];
}

export const SPECIAL_EFFECT_UPGRADES: Record<TowerType, SpecialEffectUpgradeParams> = {
  [TowerType.PuffballFungus]: {
    effectType: SpecialEffectType.AreaDamage,
    baseStrength: 0.5,
    strengthPerTier: [0, 0.1, 0.15, 0.2],
    baseDuration: 0,
    durationPerTier: [0, 0, 0, 0],
    baseAreaRadius: 40,
    areaRadiusPerTier: [0, 10, 20, 35],
  },
  [TowerType.OrchidTrap]: {
    effectType: SpecialEffectType.Slow,
    baseStrength: 0.5,
    strengthPerTier: [0, 0.1, 0.15, 0.35],
    baseDuration: 1000,
    durationPerTier: [0, 500, 1000, 2000],
  },
  [TowerType.VenusFlytower]: {
    effectType: SpecialEffectType.Instakill,
    baseStrength: 1.0,
    strengthPerTier: [0, 0.1, 0.25, 0.5],
    baseDuration: 0,
    durationPerTier: [0, 0, 0, 0],
  },
  [TowerType.BioluminescentShroom]: {
    effectType: SpecialEffectType.RevealCamo,
    baseStrength: 1.0,
    strengthPerTier: [0, 0, 0, 0],
    baseDuration: 500,
    durationPerTier: [0, 500, 1500, 3000],
  },
  [TowerType.StinkhornLine]: {
    effectType: SpecialEffectType.Poison,
    baseStrength: 0.5,
    strengthPerTier: [0, 0.2, 0.4, 0.7],
    baseDuration: 3000,
    durationPerTier: [0, 1000, 2000, 4000],
  },
  [TowerType.MyceliumNetwork]: {
    effectType: SpecialEffectType.NetworkBuff,
    baseStrength: 0.05,
    strengthPerTier: [0, 0.05, 0.10, 0.15],
    baseDuration: 0,
    durationPerTier: [0, 0, 0, 0],
    baseAreaRadius: 100,
    areaRadiusPerTier: [0, 20, 40, 60],
  },
};

export interface UpgradeTier {
  tier: number;
  costMultiplier: number;
  statMultiplier: number;
}

export const UPGRADE_TIERS: UpgradeTier[] = [
  { tier: 1, costMultiplier: 1.0, statMultiplier: 1.15 },
  { tier: 2, costMultiplier: 1.5, statMultiplier: 1.30 },
  { tier: 3, costMultiplier: 2.5, statMultiplier: 1.50 },
];

export const UPGRADE_PATHS: UpgradePath[] = [
  UpgradePath.Damage,
  UpgradePath.Range,
  UpgradePath.FireRate,
  UpgradePath.Special,
];

export interface TowerUpgrades {
  [UpgradePath.Damage]: number;
  [UpgradePath.Range]: number;
  [UpgradePath.FireRate]: number;
  [UpgradePath.Special]: number;
}

export interface UpgradeResult {
  success: boolean;
  newTier: number;
  upgradeCost: number;
  statIncrease: number;
  newStatValue: number;
  effectUpgrade?: {
    effectStrength: number;
    effectDuration: number;
    areaRadius?: number;
  };
}

export interface TowerWithUpgrades extends Tower {
  upgrades: TowerUpgrades;
  upgradeLevels: TowerUpgrades;
  totalUpgradeCost: number;
  effectStrength: number;
  effectDuration: number;
  areaRadius?: number;
}

export function getBaseUpgradeCost(towerType: TowerType): number {
  return Math.floor(TOWER_STATS[towerType].cost * 0.5);
}

export function getUpgradeCost(
  towerType: TowerType,
  path: UpgradePath,
  currentTier: number
): number {
  const baseCost = getBaseUpgradeCost(towerType);
  const tierData = UPGRADE_TIERS[currentTier - 1];
  return Math.floor(baseCost * tierData.costMultiplier * (currentTier + 1) / 2);
}

export function getNextTierStats(
  tower: Tower,
  path: UpgradePath,
  currentTier: number
): { statIncrease: number; newStatValue: number; effectUpgrade?: { effectStrength: number; effectDuration: number; areaRadius?: number } } {
  const tierData = UPGRADE_TIERS[currentTier - 1];
  let statIncrease: number;
  let newStatValue: number;
  let effectUpgrade: { effectStrength: number; effectDuration: number; areaRadius?: number } | undefined;

  switch (path) {
    case UpgradePath.Damage:
      statIncrease = Math.max(1, Math.floor(tower.damage * (tierData.statMultiplier - 1)));
      newStatValue = tower.damage + statIncrease;
      break;
    case UpgradePath.Range:
      statIncrease = Math.max(5, Math.floor(tower.range * (tierData.statMultiplier - 1)));
      newStatValue = tower.range + statIncrease;
      break;
    case UpgradePath.FireRate:
      const reducedFireRate = Math.floor(tower.fireRate / tierData.statMultiplier);
      statIncrease = tower.fireRate - reducedFireRate;
      newStatValue = reducedFireRate;
      break;
    case UpgradePath.Special:
      const effectParams = SPECIAL_EFFECT_UPGRADES[tower.towerType];
      const strengthBonus = effectParams.strengthPerTier[currentTier];
      const durationBonus = effectParams.durationPerTier[currentTier];
      const areaBonus = effectParams.areaRadiusPerTier?.[currentTier] || 0;
      newStatValue = currentTier;
      statIncrease = currentTier;
      effectUpgrade = {
        effectStrength: strengthBonus,
        effectDuration: durationBonus,
        areaRadius: effectParams.baseAreaRadius ? effectParams.baseAreaRadius + areaBonus : undefined,
      };
      break;
  }

  return { statIncrease, newStatValue, effectUpgrade };
}

export function canUpgrade(
  tower: TowerWithUpgrades,
  path: UpgradePath,
  currentTier: number
): boolean {
  return currentTier < 3;
}

export function applyUpgrade(
  tower: TowerWithUpgrades,
  path: UpgradePath
): UpgradeResult {
  const currentTier = tower.upgradeLevels[path];
  
  if (currentTier >= 3) {
    return { success: false, newTier: currentTier, upgradeCost: 0, statIncrease: 0, newStatValue: 0 };
  }

  const upgradeCost = getUpgradeCost(tower.towerType, path, currentTier + 1);
  const { statIncrease, newStatValue, effectUpgrade } = getNextTierStats(tower, path, currentTier + 1);

  tower.upgradeLevels[path]++;
  tower.totalUpgradeCost += upgradeCost;

  switch (path) {
    case UpgradePath.Damage:
      tower.damage = newStatValue;
      break;
    case UpgradePath.Range:
      tower.range = newStatValue;
      break;
    case UpgradePath.FireRate:
      tower.fireRate = newStatValue;
      break;
    case UpgradePath.Special:
      if (effectUpgrade) {
        const effectParams = SPECIAL_EFFECT_UPGRADES[tower.towerType];
        tower.effectStrength = effectParams.baseStrength + effectParams.strengthPerTier[tower.upgradeLevels[path]];
        tower.effectDuration = effectParams.baseDuration + effectParams.durationPerTier[tower.upgradeLevels[path]];
        if (effectParams.baseAreaRadius !== undefined) {
          tower.areaRadius = effectParams.baseAreaRadius + effectParams.areaRadiusPerTier![tower.upgradeLevels[path]];
        }
      }
      break;
  }

  return {
    success: true,
    newTier: tower.upgradeLevels[path],
    upgradeCost,
    statIncrease,
    newStatValue,
    effectUpgrade,
  };
}

export function createTowerWithUpgrades(
  id: number,
  x: number,
  y: number,
  towerType: TowerType = TowerType.PuffballFungus,
  targetingMode: TargetingMode = TargetingMode.First
): TowerWithUpgrades {
  const effectParams = SPECIAL_EFFECT_UPGRADES[towerType];
  
  const baseTower = {
    id,
    position: { x, y },
    range: TOWER_STATS[towerType].range,
    targetingMode,
    towerType,
    damage: TOWER_STATS[towerType].damage,
    fireRate: TOWER_STATS[towerType].fireRate,
    fireTimer: 0,
    cost: TOWER_STATS[towerType].cost,
    lastFireTime: 0,
    projectileSpeed: TOWER_STATS[towerType].projectileSpeed ?? 200,
    specialEffect: TOWER_STATS[towerType].specialEffect,
  };

  return {
    ...baseTower,
    upgrades: {
      [UpgradePath.Damage]: 0,
      [UpgradePath.Range]: 0,
      [UpgradePath.FireRate]: 0,
      [UpgradePath.Special]: 0,
    },
    upgradeLevels: {
      [UpgradePath.Damage]: 0,
      [UpgradePath.Range]: 0,
      [UpgradePath.FireRate]: 0,
      [UpgradePath.Special]: 0,
    },
    totalUpgradeCost: 0,
    effectStrength: effectParams.baseStrength,
    effectDuration: effectParams.baseDuration,
    areaRadius: effectParams.baseAreaRadius,
  };
}

export function getUpgradeInfo(tower: TowerWithUpgrades, path: UpgradePath) {
  const currentTier = tower.upgradeLevels[path];
  const nextTier = currentTier + 1;
  
  if (nextTier > 3) {
    return {
      currentTier: 3,
      maxTier: true,
      nextCost: 0,
      currentStatValue: 0,
      nextStatValue: 0,
      statIncrease: 0,
      effectUpgrade: undefined,
    };
  }

  const nextCost = getUpgradeCost(tower.towerType, path, nextTier);
  const { statIncrease, newStatValue, effectUpgrade } = getNextTierStats(tower, path, nextTier);
  let currentStatValue: number;

  switch (path) {
    case UpgradePath.Damage:
      currentStatValue = newStatValue - statIncrease;
      break;
    case UpgradePath.Range:
      currentStatValue = newStatValue - statIncrease;
      break;
    case UpgradePath.FireRate:
      currentStatValue = newStatValue + statIncrease;
      break;
    case UpgradePath.Special:
      currentStatValue = newStatValue - 1;
      break;
  }

  return {
    currentTier,
    maxTier: false,
    nextCost,
    currentStatValue,
    nextStatValue: newStatValue,
    statIncrease,
    effectUpgrade,
  };
}

export function getTotalSellValue(tower: TowerWithUpgrades): number {
  const baseSellValue = Math.floor(TOWER_STATS[tower.towerType].cost * 0.7);
  const upgradeValue = Math.floor(tower.totalUpgradeCost * 0.7);
  return baseSellValue + upgradeValue;
}

export function getUpgradeSummary(tower: TowerWithUpgrades) {
  return {
    [UpgradePath.Damage]: getUpgradeInfo(tower, UpgradePath.Damage),
    [UpgradePath.Range]: getUpgradeInfo(tower, UpgradePath.Range),
    [UpgradePath.FireRate]: getUpgradeInfo(tower, UpgradePath.FireRate),
    [UpgradePath.Special]: getUpgradeInfo(tower, UpgradePath.Special),
    totalUpgradeCost: tower.totalUpgradeCost,
    totalSellValue: getTotalSellValue(tower),
  };
}

export function getSpecialEffectInfo(tower: TowerWithUpgrades) {
  const effectParams = SPECIAL_EFFECT_UPGRADES[tower.towerType];
  return {
    effectType: effectParams.effectType,
    effectStrength: tower.effectStrength,
    effectDuration: tower.effectDuration,
    areaRadius: tower.areaRadius,
    specialTier: tower.upgradeLevels[UpgradePath.Special],
  };
}

export function getHitEffectsForTowerWithUpgrades(
  tower: TowerWithUpgrades,
  damage: number
): Array<{ type: string; strength: number; duration?: number; radius?: number }> {
  const effects: Array<{ type: string; strength: number; duration?: number; radius?: number }> = [];
  effects.push({ type: 'damage', strength: damage });

  const specialParams = SPECIAL_EFFECT_UPGRADES[tower.towerType];

  switch (specialParams.effectType) {
    case SpecialEffectType.Slow:
      effects.push({
        type: 'slow',
        strength: tower.effectStrength,
        duration: tower.effectDuration,
      });
      break;
    case SpecialEffectType.Poison:
      effects.push({
        type: 'poison',
        strength: tower.effectStrength * damage,
        duration: tower.effectDuration,
      });
      break;
    case SpecialEffectType.Stun:
      effects.push({
        type: 'stun',
        strength: tower.effectStrength,
        duration: tower.effectDuration,
      });
      break;
    case SpecialEffectType.AreaDamage:
      effects.push({
        type: 'area_damage',
        strength: tower.effectStrength * damage,
      });
      break;
    case SpecialEffectType.Instakill:
      effects.push({
        type: 'instakill',
        strength: tower.effectStrength,
      });
      break;
    case SpecialEffectType.RevealCamo:
      effects.push({
        type: 'reveal_camo',
        strength: tower.effectStrength,
        duration: tower.effectDuration,
      });
      break;
    case SpecialEffectType.NetworkBuff:
      effects.push({
        type: 'network_buff',
        strength: tower.effectStrength,
        radius: tower.areaRadius,
      });
      break;
  }

  return effects;
}
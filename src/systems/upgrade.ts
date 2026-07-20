import { EVOLUTION_DEFINITIONS, EvolutionPath, TowerStage } from '../content/evolutionDefinitions';
import { createTower, Tower, TowerType, TOWER_STATS } from '../entities/tower';
import { TargetingMode } from './targeting';

const MATURE_DAMAGE_MULTIPLIER = 1.2;
const MATURE_RANGE_MULTIPLIER = 1.1;
const MATURE_FIRE_RATE_MULTIPLIER = 1;

export interface TowerGrowthState {
  stage: TowerStage;
  evolution: EvolutionPath | null;
  totalSpent: number;
}

export interface TowerWithGrowth extends Tower {
  growth: TowerGrowthState;
  effectStrength: number;
  effectDuration: number;
  areaRadius?: number;
}

export interface GrowthResult {
  readonly success: boolean;
  readonly cost: number;
  readonly reason?: string;
}

export interface GrowthCosts {
  readonly mature: number;
  readonly evolution: number;
}

export interface TowerGrowthInfo {
  readonly stage: TowerStage;
  readonly evolution: EvolutionPath | null;
  readonly totalSpent: number;
  readonly costs: GrowthCosts;
  readonly isConnected: boolean;
}

export function getGrowthCosts(type: TowerType): GrowthCosts {
  const base = TOWER_STATS[type].cost;
  return { mature: Math.floor(base * 0.6), evolution: base };
}

export function createTowerWithGrowth(
  id: number,
  x: number,
  y: number,
  towerType: TowerType = TowerType.Puffball,
  targetingMode: TargetingMode = TargetingMode.First,
): TowerWithGrowth {
  const tower = createTower(id, x, y, towerType, targetingMode);
  const effect = BASE_EFFECT_PARAMETERS[towerType];
  return {
    ...tower,
    growth: {
      stage: TowerStage.Seedling,
      evolution: null,
      totalSpent: 0,
    },
    effectStrength: effect.strength,
    effectDuration: effect.duration,
    areaRadius: effect.areaRadius,
  };
}

export function matureTower(tower: TowerWithGrowth): GrowthResult {
  const cost = getGrowthCosts(tower.towerType).mature;
  if (tower.growth.stage !== TowerStage.Seedling) {
    return { success: false, cost, reason: 'Tower must be a Seedling' };
  }

  tower.damage *= MATURE_DAMAGE_MULTIPLIER;
  tower.range *= MATURE_RANGE_MULTIPLIER;
  tower.fireRate *= MATURE_FIRE_RATE_MULTIPLIER;
  tower.growth.stage = TowerStage.Mature;
  tower.growth.totalSpent += cost;
  return { success: true, cost };
}

export function evolveTower(
  tower: TowerWithGrowth,
  path: EvolutionPath,
  isConnected: boolean,
): GrowthResult {
  const cost = getGrowthCosts(tower.towerType).evolution;
  if (tower.growth.stage !== TowerStage.Mature || tower.growth.evolution !== null) {
    return { success: false, cost, reason: 'Tower must be Mature and unevolved' };
  }

  const definition = EVOLUTION_DEFINITIONS[tower.towerType][path];
  if (definition.requiresConnection && !isConnected) {
    return { success: false, cost, reason: 'Symbiote evolution requires a mycelium connection' };
  }

  tower.damage *= definition.damageMultiplier;
  tower.range *= definition.rangeMultiplier;
  tower.fireRate *= definition.fireRateMultiplier;
  tower.growth.stage = TowerStage.Evolved;
  tower.growth.evolution = path;
  tower.growth.totalSpent += cost;
  return { success: true, cost };
}

export function getTotalSellValue(tower: TowerWithGrowth): number {
  const totalInvested = TOWER_STATS[tower.towerType].cost + tower.growth.totalSpent;
  return Math.floor(totalInvested * 0.7);
}

interface BaseEffectParameters {
  readonly strength: number;
  readonly duration: number;
  readonly areaRadius?: number;
}

const BASE_EFFECT_PARAMETERS: Readonly<Record<TowerType, BaseEffectParameters>> = {
  [TowerType.Puffball]: { strength: 0.5, duration: 0, areaRadius: 40 },
  [TowerType.Slimefungus]: { strength: 0.5, duration: 1000 },
  [TowerType.ThornSniper]: { strength: 1, duration: 0 },
  [TowerType.LumenOracle]: { strength: 1, duration: 500 },
  [TowerType.BulbShooter]: { strength: 0.5, duration: 3000 },
  [TowerType.Sporecap]: { strength: 0.05, duration: 0, areaRadius: 100 },
};

export const SpecialEffectType = {
  AreaDamage: 'area_damage',
  Slow: 'slow',
  Poison: 'poison',
  Stun: 'stun',
  Instakill: 'instakill',
  RevealCamo: 'reveal_camo',
  NetworkBuff: 'network_buff',
} as const;
export type SpecialEffectType = typeof SpecialEffectType[keyof typeof SpecialEffectType];

const BASE_EFFECT_TYPES: Readonly<Record<TowerType, SpecialEffectType>> = {
  [TowerType.Puffball]: SpecialEffectType.AreaDamage,
  [TowerType.Slimefungus]: SpecialEffectType.Slow,
  [TowerType.ThornSniper]: SpecialEffectType.Instakill,
  [TowerType.LumenOracle]: SpecialEffectType.RevealCamo,
  [TowerType.BulbShooter]: SpecialEffectType.Poison,
  [TowerType.Sporecap]: SpecialEffectType.NetworkBuff,
};

export function getGrowthVisualTier(tower: TowerWithGrowth): number {
  switch (tower.growth.stage) {
    case TowerStage.Seedling:
      return 0;
    case TowerStage.Mature:
      return 1;
    case TowerStage.Evolved:
      return 3;
  }
}

export function getGrowthVisualValue(tower: TowerWithGrowth): number {
  switch (tower.growth.stage) {
    case TowerStage.Seedling:
      return 0;
    case TowerStage.Mature:
      return 225;
    case TowerStage.Evolved:
      return 500;
  }
}

export function getSpecialEffectInfo(tower: TowerWithGrowth) {
  return {
    effectType: BASE_EFFECT_TYPES[tower.towerType],
    effectStrength: tower.effectStrength,
    effectDuration: tower.effectDuration,
    areaRadius: tower.areaRadius,
    specialTier: tower.growth.stage === TowerStage.Evolved ? 1 : 0,
  };
}

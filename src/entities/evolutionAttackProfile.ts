import { EVOLUTION_DEFINITIONS, EvolutionEffect, EvolutionPath } from '../content/evolutionDefinitions';
import type { TowerType } from '../content/towerDefinitions';
import type { ProjectileHitEffect } from './tower';

export interface EvolutionAttackProfile {
  readonly evolutionPath: EvolutionPath | null;
  readonly evolutionEffect: EvolutionEffect | null;
  readonly damageMultiplier: number;
  readonly rangeMultiplier: number;
  readonly fireRateMultiplier: number;
  readonly splitTargets: number;
  readonly pierceTargets: number;
  readonly areaRadiusMultiplier: number;
  readonly delayedPops: number;
  readonly bypassesMetal: boolean;
  readonly shieldDamage: number;
  readonly extraHitEffects: readonly ProjectileHitEffect[];
}

interface EvolutionTowerAttackState {
  readonly towerType: TowerType;
  readonly damage: number;
  readonly growth?: {
    readonly evolution: EvolutionPath | null;
  };
}

function createProfile(
  evolutionPath: EvolutionPath | null,
  evolutionEffect: EvolutionEffect | null,
  damageMultiplier: number = 1,
  rangeMultiplier: number = 1,
  fireRateMultiplier: number = 1,
): EvolutionAttackProfile {
  return {
    evolutionPath,
    evolutionEffect,
    damageMultiplier,
    rangeMultiplier,
    fireRateMultiplier,
    splitTargets: 0,
    pierceTargets: 0,
    areaRadiusMultiplier: 1,
    delayedPops: 0,
    bypassesMetal: false,
    shieldDamage: 1,
    extraHitEffects: [],
  };
}

export function getEvolutionAttackProfile(
  tower: EvolutionTowerAttackState,
  connected: boolean,
): EvolutionAttackProfile {
  const path = tower.growth?.evolution;
  if (path === undefined || path === null) {
    return createProfile(null, null);
  }

  const definition = EVOLUTION_DEFINITIONS[tower.towerType][path];
  const base = createProfile(
    path,
    definition.effect,
    definition.damageMultiplier,
    definition.rangeMultiplier,
    definition.fireRateMultiplier,
  );

  if (path === EvolutionPath.Symbiote && !connected) {
    return base;
  }

  switch (definition.effect) {
    case EvolutionEffect.ForkedSpores:
      return { ...base, splitTargets: 1 };
    case EvolutionEffect.Skewer:
      return { ...base, pierceTargets: 1 };
    case EvolutionEffect.BurstSac:
    case EvolutionEffect.SiegeBulb:
      return {
        ...base,
        areaRadiusMultiplier: 1.5,
        bypassesMetal: definition.effect === EvolutionEffect.SiegeBulb,
      };
    case EvolutionEffect.EchoPuff:
      return { ...base, delayedPops: 1 };
    case EvolutionEffect.CausticSlime:
      return {
        ...base,
        extraHitEffects: [{ type: 'poison', strength: tower.damage * 0.5, duration: 3000 }],
      };
    case EvolutionEffect.BogCap:
      return {
        ...base,
        extraHitEffects: [{ type: 'slow', strength: 0.7, duration: 2500 }],
      };
    case EvolutionEffect.ClusterBloom:
      return { ...base, areaRadiusMultiplier: 0.65 };
    case EvolutionEffect.LuminousBolt:
      return { ...base, shieldDamage: 2 };
    case EvolutionEffect.RevelationField:
      return {
        ...base,
        areaRadiusMultiplier: 1.5,
        extraHitEffects: [
          { type: 'reveal_camo', strength: 1, duration: 2000 },
          { type: 'slow', strength: 0.2, duration: 2000 },
        ],
      };
    case EvolutionEffect.NeedleVolley:
    case EvolutionEffect.HeartwoodNeedle:
    case EvolutionEffect.SignalCap:
    case EvolutionEffect.ReaperThorn:
    case EvolutionEffect.FungalCarpet:
    case EvolutionEffect.TraitRot:
    case EvolutionEffect.SeededPayload:
    case EvolutionEffect.ChorusLight:
      return base;
    default:
      definition.effect satisfies never;
      return base;
  }
}

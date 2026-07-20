import { TowerType } from './towerDefinitions';

export enum TowerStage {
  Seedling = 'seedling',
  Mature = 'mature',
  Evolved = 'evolved',
}

export enum EvolutionPath {
  Predator = 'predator',
  Specialist = 'specialist',
  Symbiote = 'symbiote',
}

export enum EvolutionEffect {
  NeedleVolley = 'needle_volley',
  ForkedSpores = 'forked_spores',
  SignalCap = 'signal_cap',
  HeartwoodNeedle = 'heartwood_needle',
  Skewer = 'skewer',
  ReaperThorn = 'reaper_thorn',
  BurstSac = 'burst_sac',
  EchoPuff = 'echo_puff',
  FungalCarpet = 'fungal_carpet',
  CausticSlime = 'caustic_slime',
  BogCap = 'bog_cap',
  TraitRot = 'trait_rot',
  SiegeBulb = 'siege_bulb',
  ClusterBloom = 'cluster_bloom',
  SeededPayload = 'seeded_payload',
  LuminousBolt = 'luminous_bolt',
  RevelationField = 'revelation_field',
  ChorusLight = 'chorus_light',
}

export interface EvolutionDefinition {
  readonly path: EvolutionPath;
  readonly name: string;
  readonly description: string;
  readonly effect: EvolutionEffect;
  readonly requiresConnection: boolean;
  readonly damageMultiplier: number;
  readonly rangeMultiplier: number;
  readonly fireRateMultiplier: number;
}

const PATH_MODIFIERS: Readonly<Record<EvolutionPath, Pick<EvolutionDefinition,
  'requiresConnection' | 'damageMultiplier' | 'rangeMultiplier' | 'fireRateMultiplier'
>>> = Object.freeze({
  [EvolutionPath.Predator]: Object.freeze({ requiresConnection: false, damageMultiplier: 1.5, rangeMultiplier: 1, fireRateMultiplier: 0.9 }),
  [EvolutionPath.Specialist]: Object.freeze({ requiresConnection: false, damageMultiplier: 1, rangeMultiplier: 1.15, fireRateMultiplier: 0.9 }),
  [EvolutionPath.Symbiote]: Object.freeze({ requiresConnection: true, damageMultiplier: 1, rangeMultiplier: 1, fireRateMultiplier: 1 }),
});

function defineEvolution(
  path: EvolutionPath,
  name: string,
  description: string,
  effect: EvolutionEffect,
): EvolutionDefinition {
  return Object.freeze({ path, name, description, effect, ...PATH_MODIFIERS[path] });
}

export const EVOLUTION_DEFINITIONS: Readonly<Record<TowerType, Readonly<Record<EvolutionPath, EvolutionDefinition>>>> = Object.freeze({
  [TowerType.Sporecap]: Object.freeze({
    [EvolutionPath.Predator]: defineEvolution(EvolutionPath.Predator, 'Needle Volley', 'Increases direct dart damage and fire rate.', EvolutionEffect.NeedleVolley),
    [EvolutionPath.Specialist]: defineEvolution(EvolutionPath.Specialist, 'Forked Spores', 'Each dart splits toward one additional nearby target.', EvolutionEffect.ForkedSpores),
    [EvolutionPath.Symbiote]: defineEvolution(EvolutionPath.Symbiote, 'Signal Cap', 'Connected attacks apply one refreshable mark that amplifies connected hits.', EvolutionEffect.SignalCap),
  }),
  [TowerType.ThornSniper]: Object.freeze({
    [EvolutionPath.Predator]: defineEvolution(EvolutionPath.Predator, 'Heartwood Needle', 'Greatly increases single-target impact.', EvolutionEffect.HeartwoodNeedle),
    [EvolutionPath.Specialist]: defineEvolution(EvolutionPath.Specialist, 'Skewer', 'Shots pierce defensive layers and continue into a second target.', EvolutionEffect.Skewer),
    [EvolutionPath.Symbiote]: defineEvolution(EvolutionPath.Symbiote, 'Reaper Thorn', 'Executes a marked, unshielded enemy below the configured health threshold.', EvolutionEffect.ReaperThorn),
  }),
  [TowerType.Puffball]: Object.freeze({
    [EvolutionPath.Predator]: defineEvolution(EvolutionPath.Predator, 'Burst Sac', 'Increases cloud damage and impact radius.', EvolutionEffect.BurstSac),
    [EvolutionPath.Specialist]: defineEvolution(EvolutionPath.Specialist, 'Echo Puff', 'Every attack produces one delayed secondary pop.', EvolutionEffect.EchoPuff),
    [EvolutionPath.Symbiote]: defineEvolution(EvolutionPath.Symbiote, 'Fungal Carpet', 'Network triggers create a temporary damaging slow field on the path.', EvolutionEffect.FungalCarpet),
  }),
  [TowerType.Slimefungus]: Object.freeze({
    [EvolutionPath.Predator]: defineEvolution(EvolutionPath.Predator, 'Caustic Slime', 'Adds damage over time to successful hits.', EvolutionEffect.CausticSlime),
    [EvolutionPath.Specialist]: defineEvolution(EvolutionPath.Specialist, 'Bog Cap', 'Increases slow strength, duration, and coverage.', EvolutionEffect.BogCap),
    [EvolutionPath.Symbiote]: defineEvolution(EvolutionPath.Symbiote, 'Trait Rot', 'Suppresses one active enemy trait for the configured duration.', EvolutionEffect.TraitRot),
  }),
  [TowerType.BulbShooter]: Object.freeze({
    [EvolutionPath.Predator]: defineEvolution(EvolutionPath.Predator, 'Siege Bulb', 'Creates one larger armour-resistant explosion.', EvolutionEffect.SiegeBulb),
    [EvolutionPath.Specialist]: defineEvolution(EvolutionPath.Specialist, 'Cluster Bloom', 'Splits the impact into three smaller explosions.', EvolutionEffect.ClusterBloom),
    [EvolutionPath.Symbiote]: defineEvolution(EvolutionPath.Symbiote, 'Seeded Payload', 'Seeds the target and detonates after enough connected hits.', EvolutionEffect.SeededPayload),
  }),
  [TowerType.LumenOracle]: Object.freeze({
    [EvolutionPath.Predator]: defineEvolution(EvolutionPath.Predator, 'Luminous Bolt', 'Increases guided-bolt damage and shield pressure.', EvolutionEffect.LuminousBolt),
    [EvolutionPath.Specialist]: defineEvolution(EvolutionPath.Specialist, 'Revelation Field', 'Creates larger, longer reveal patches that mildly slow enemies.', EvolutionEffect.RevelationField),
    [EvolutionPath.Symbiote]: defineEvolution(EvolutionPath.Symbiote, 'Chorus Light', 'Shares detection through the network and strengthens nearby network-triggered effects without stacking or modifying Execute.', EvolutionEffect.ChorusLight),
  }),
});

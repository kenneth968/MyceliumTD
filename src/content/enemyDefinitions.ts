export enum EnemyType {
  ScoutBeetle = 'scout_beetle',
  DartWasp = 'dart_wasp',
  ShellBeetle = 'shell_beetle',
  CrawlerCaterpillar = 'crawler_caterpillar',
  SwarmWasp = 'swarm_wasp',
  IronCaterpillar = 'iron_caterpillar',
  VeilWasp = 'veil_wasp',
  BulwarkBeetle = 'bulwark_beetle',
  WardMoth = 'ward_moth',
  PaleMoth = 'pale_moth',
}

export enum EnemyFamily {
  Beetle = 'beetle',
  Wasp = 'wasp',
  Caterpillar = 'caterpillar',
  Moth = 'moth',
}

export enum EnemyTrait {
  SwarmLinked = 'swarm_linked',
  Metal = 'metal',
  Camo = 'camo',
  Shielded = 'shielded',
}

export enum EnemyVariant {
  Normal = 'normal',
  Elite = 'elite',
  Boss = 'boss',
}

export interface EnemyDefinition {
  type: EnemyType;
  displayName: string;
  family: EnemyFamily;
  layers: readonly number[];
  speed: number;
  reward: number;
  traits: readonly EnemyTrait[];
}

export const ENEMY_DEFINITIONS: Record<EnemyType, EnemyDefinition> = {
  [EnemyType.ScoutBeetle]: { type: EnemyType.ScoutBeetle, displayName: 'Scout Beetle', family: EnemyFamily.Beetle, layers: [1], speed: 45, reward: 10, traits: [] },
  [EnemyType.DartWasp]: { type: EnemyType.DartWasp, displayName: 'Dart Wasp', family: EnemyFamily.Wasp, layers: [1], speed: 80, reward: 12, traits: [] },
  [EnemyType.ShellBeetle]: { type: EnemyType.ShellBeetle, displayName: 'Shell Beetle', family: EnemyFamily.Beetle, layers: [2, 2], speed: 35, reward: 18, traits: [] },
  [EnemyType.CrawlerCaterpillar]: { type: EnemyType.CrawlerCaterpillar, displayName: 'Crawler Caterpillar', family: EnemyFamily.Caterpillar, layers: [3, 3], speed: 30, reward: 20, traits: [] },
  [EnemyType.SwarmWasp]: { type: EnemyType.SwarmWasp, displayName: 'Swarm Wasp', family: EnemyFamily.Wasp, layers: [1], speed: 65, reward: 12, traits: [EnemyTrait.SwarmLinked] },
  [EnemyType.IronCaterpillar]: { type: EnemyType.IronCaterpillar, displayName: 'Iron Caterpillar', family: EnemyFamily.Caterpillar, layers: [4, 4], speed: 32, reward: 30, traits: [EnemyTrait.Metal] },
  [EnemyType.VeilWasp]: { type: EnemyType.VeilWasp, displayName: 'Veil Wasp', family: EnemyFamily.Wasp, layers: [2], speed: 75, reward: 25, traits: [EnemyTrait.Camo] },
  [EnemyType.BulwarkBeetle]: { type: EnemyType.BulwarkBeetle, displayName: 'Bulwark Beetle', family: EnemyFamily.Beetle, layers: [5, 5, 5], speed: 25, reward: 45, traits: [EnemyTrait.Metal] },
  [EnemyType.WardMoth]: { type: EnemyType.WardMoth, displayName: 'Ward Moth', family: EnemyFamily.Moth, layers: [4, 4], speed: 40, reward: 40, traits: [EnemyTrait.Shielded] },
  [EnemyType.PaleMoth]: { type: EnemyType.PaleMoth, displayName: 'Pale Moth', family: EnemyFamily.Moth, layers: [6], speed: 55, reward: 45, traits: [EnemyTrait.Camo] },
};

export const ENEMY_VARIANT_LAYER_MULTIPLIERS: Readonly<Record<EnemyVariant, number>> = Object.freeze({
  [EnemyVariant.Normal]: 1,
  [EnemyVariant.Elite]: 2,
  [EnemyVariant.Boss]: 6,
});

export function getEnemyTraitsForVariant(
  type: EnemyType,
  variant: EnemyVariant,
): readonly EnemyTrait[] {
  const traits = ENEMY_DEFINITIONS[type].traits;
  if (variant === EnemyVariant.Boss && type === EnemyType.WardMoth && !traits.includes(EnemyTrait.Camo)) {
    return Object.freeze([...traits, EnemyTrait.Camo]);
  }
  return traits;
}

import { EnemyType, EnemyVariant } from './enemyDefinitions';

export interface WaveGroupDefinition {
  type: EnemyType;
  count: number;
  interval: number;
  delay: number;
  variant?: EnemyVariant;
}

export interface WaveDefinition {
  number: number;
  name: string;
  completionBonus: number;
  groups: readonly WaveGroupDefinition[];
}

export const RELEASE_WAVES: readonly WaveDefinition[] = [
  { number: 1, name: 'First Footsteps', completionBonus: 43, groups: [{ type: EnemyType.ScoutBeetle, count: 8, interval: 4900, delay: 0 }] },
  { number: 2, name: 'Wings on the Path', completionBonus: 48, groups: [{ type: EnemyType.ScoutBeetle, count: 6, interval: 4550, delay: 0 }, { type: EnemyType.DartWasp, count: 6, interval: 3850, delay: 15400 }] },
  { number: 3, name: 'Shell and Crawler', completionBonus: 57, groups: [{ type: EnemyType.ShellBeetle, count: 6, interval: 5600, delay: 0 }, { type: EnemyType.CrawlerCaterpillar, count: 5, interval: 6300, delay: 12600 }] },
  { number: 4, name: 'The Swarm', completionBonus: 66, groups: [{ type: EnemyType.SwarmWasp, count: 16, interval: 220, delay: 0 }, { type: EnemyType.ScoutBeetle, count: 4, interval: 3500, delay: 12600 }] },
  { number: 5, name: 'Iron Roots', completionBonus: 124, groups: [{ type: EnemyType.IronCaterpillar, count: 8, interval: 6650, delay: 0 }, { type: EnemyType.SwarmWasp, count: 8, interval: 260, delay: 15400 }] },
  { number: 6, name: 'Behind the Veil', completionBonus: 117, groups: [{ type: EnemyType.VeilWasp, count: 10, interval: 3500, delay: 0 }, { type: EnemyType.ShellBeetle, count: 1, interval: 0, delay: 18200, variant: EnemyVariant.Elite }] },
  { number: 7, name: 'Bulwark', completionBonus: 100, groups: [{ type: EnemyType.BulwarkBeetle, count: 6, interval: 7700, delay: 0 }, { type: EnemyType.DartWasp, count: 12, interval: 2450, delay: 12600 }] },
  { number: 8, name: 'Ward Flight', completionBonus: 221, groups: [{ type: EnemyType.WardMoth, count: 5, interval: 7000, delay: 0 }, { type: EnemyType.SwarmWasp, count: 12, interval: 240, delay: 7000 }, { type: EnemyType.IronCaterpillar, count: 4, interval: 6300, delay: 19600 }] },
  { number: 9, name: 'Pale Endurance', completionBonus: 81, groups: [{ type: EnemyType.PaleMoth, count: 8, interval: 4900, delay: 0 }, { type: EnemyType.BulwarkBeetle, count: 5, interval: 7000, delay: 11200 }, { type: EnemyType.VeilWasp, count: 10, interval: 2940, delay: 22400 }] },
  { number: 10, name: 'Elder Ward', completionBonus: 0, groups: [{ type: EnemyType.WardMoth, count: 1, interval: 0, delay: 0, variant: EnemyVariant.Boss }, { type: EnemyType.SwarmWasp, count: 16, interval: 230, delay: 10500 }, { type: EnemyType.IronCaterpillar, count: 6, interval: 5950, delay: 24500 }, { type: EnemyType.PaleMoth, count: 6, interval: 4550, delay: 36400 }] },
];

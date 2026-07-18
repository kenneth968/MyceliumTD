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
  { number: 1, name: 'First Footsteps', completionBonus: 75, groups: [{ type: EnemyType.ScoutBeetle, count: 8, interval: 700, delay: 0 }] },
  { number: 2, name: 'Wings on the Path', completionBonus: 85, groups: [{ type: EnemyType.ScoutBeetle, count: 6, interval: 650, delay: 0 }, { type: EnemyType.DartWasp, count: 6, interval: 550, delay: 2200 }] },
  { number: 3, name: 'Shell and Crawler', completionBonus: 100, groups: [{ type: EnemyType.ShellBeetle, count: 6, interval: 800, delay: 0 }, { type: EnemyType.CrawlerCaterpillar, count: 5, interval: 900, delay: 1800 }] },
  { number: 4, name: 'The Swarm', completionBonus: 115, groups: [{ type: EnemyType.SwarmWasp, count: 16, interval: 220, delay: 0 }, { type: EnemyType.ScoutBeetle, count: 4, interval: 500, delay: 1800 }] },
  { number: 5, name: 'Iron Roots', completionBonus: 130, groups: [{ type: EnemyType.IronCaterpillar, count: 8, interval: 950, delay: 0 }, { type: EnemyType.SwarmWasp, count: 8, interval: 260, delay: 2200 }] },
  { number: 6, name: 'Behind the Veil', completionBonus: 150, groups: [{ type: EnemyType.VeilWasp, count: 10, interval: 500, delay: 0 }, { type: EnemyType.ShellBeetle, count: 1, interval: 0, delay: 2600, variant: EnemyVariant.Elite }] },
  { number: 7, name: 'Bulwark', completionBonus: 175, groups: [{ type: EnemyType.BulwarkBeetle, count: 6, interval: 1100, delay: 0 }, { type: EnemyType.DartWasp, count: 12, interval: 350, delay: 1800 }] },
  { number: 8, name: 'Ward Flight', completionBonus: 200, groups: [{ type: EnemyType.WardMoth, count: 5, interval: 1000, delay: 0 }, { type: EnemyType.SwarmWasp, count: 12, interval: 240, delay: 1000 }, { type: EnemyType.IronCaterpillar, count: 4, interval: 900, delay: 2800 }] },
  { number: 9, name: 'Pale Endurance', completionBonus: 230, groups: [{ type: EnemyType.PaleMoth, count: 8, interval: 700, delay: 0 }, { type: EnemyType.BulwarkBeetle, count: 5, interval: 1000, delay: 1600 }, { type: EnemyType.VeilWasp, count: 10, interval: 420, delay: 3200 }] },
  { number: 10, name: 'Elder Ward', completionBonus: 0, groups: [{ type: EnemyType.WardMoth, count: 1, interval: 0, delay: 0, variant: EnemyVariant.Boss }, { type: EnemyType.SwarmWasp, count: 16, interval: 230, delay: 1500 }, { type: EnemyType.IronCaterpillar, count: 6, interval: 850, delay: 3500 }, { type: EnemyType.PaleMoth, count: 6, interval: 650, delay: 5200 }] },
];

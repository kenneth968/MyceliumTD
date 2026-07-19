import { Path } from './path';
import { Enemy, applyEnemyVariant, createEnemy } from '../entities/enemy';
import { EnemyType, EnemyVariant } from '../content/enemyDefinitions';
import { RELEASE_WAVES } from '../content/waveDefinitions';

export { EnemyType, EnemyVariant } from '../content/enemyDefinitions';
export { ENEMY_DEFINITIONS as ENEMY_STATS } from '../content/enemyDefinitions';

interface SpawnGroupBase {
  count: number;
  interval: number;
  variant?: EnemyVariant;
}

export interface CanonicalSpawnGroup extends SpawnGroupBase {
  type: EnemyType;
  delay: number;
  enemyType?: never;
}

export interface LegacySpawnGroup extends SpawnGroupBase {
  enemyType: EnemyType;
  type?: never;
  delay?: number;
}

export type SpawnGroup = CanonicalSpawnGroup | LegacySpawnGroup;

export interface Wave {
  id: number;
  name: string;
  groups: SpawnGroup[];
  completionBonus?: number;
  delayBetweenGroups: number;
  totalDuration: number;
}

export function createWave(
  id: number,
  name: string,
  groups: SpawnGroup[],
  delayBetweenGroups: number = 1000
): Wave {
  let totalDuration = 0;
  for (const group of groups) {
    totalDuration += group.count * group.interval + delayBetweenGroups;
  }
  return { id, name, groups, delayBetweenGroups, totalDuration };
}

export interface SpawnedEnemy {
  enemy: Enemy;
  spawnTime: number;
  groupIndex: number;
}

export class WaveSpawner {
  private path: Path;
  private waves: Wave[];
  private currentWaveIndex: number = -1;
  private spawnedEnemies: SpawnedEnemy[] = [];
  private spawnTimers: Map<number, number> = new Map();
  private nextEnemyId: number = 1;
  private waveStartTime: number = 0;
  private isActive: boolean = false;
  private totalSpawnedInWave: number = 0;
  private currentGroupIndex: number = 0;
  private enemiesInCurrentGroup: number = 0;
  private hasWaveStartTime: boolean = false;

  constructor(path: Path, waves: Wave[] = []) {
    this.path = path;
    this.waves = waves;
  }

  addWave(wave: Wave): void {
    this.waves.push(wave);
  }

  getWaves(): Wave[] {
    return this.waves;
  }

  getCurrentWave(): Wave | null {
    if (this.currentWaveIndex < 0 || this.currentWaveIndex >= this.waves.length) {
      return null;
    }
    return this.waves[this.currentWaveIndex];
  }

  getCurrentWaveIndex(): number {
    return this.currentWaveIndex;
  }

  isWaveActive(): boolean {
    return this.isActive;
  }

  getSpawnedEnemies(): SpawnedEnemy[] {
    return this.spawnedEnemies;
  }

  startNextWave(): boolean {
    if (this.currentWaveIndex >= this.waves.length - 1) {
      return false;
    }
    this.currentWaveIndex++;
    this.isActive = true;
    this.waveStartTime = 0;
    this.hasWaveStartTime = false;
    this.totalSpawnedInWave = 0;
    this.currentGroupIndex = 0;
    this.enemiesInCurrentGroup = 0;
    this.spawnTimers.clear();
    return true;
  }

  startWave(waveIndex: number): boolean {
    if (waveIndex < 0 || waveIndex >= this.waves.length) {
      return false;
    }
    this.currentWaveIndex = waveIndex;
    this.isActive = true;
    this.waveStartTime = 0;
    this.hasWaveStartTime = false;
    this.totalSpawnedInWave = 0;
    this.currentGroupIndex = 0;
    this.enemiesInCurrentGroup = 0;
    this.spawnTimers.clear();
    return true;
  }

  reset(): void {
    this.currentWaveIndex = -1;
    this.isActive = false;
    this.spawnedEnemies = [];
    this.spawnTimers.clear();
    this.waveStartTime = 0;
    this.hasWaveStartTime = false;
    this.totalSpawnedInWave = 0;
    this.currentGroupIndex = 0;
    this.enemiesInCurrentGroup = 0;
  }

  update(currentTime: number): Enemy[] {
    if (!this.isActive) {
      return [];
    }

    const wave = this.getCurrentWave();
    if (!wave) {
      this.isActive = false;
      return [];
    }

    if (!this.hasWaveStartTime) {
      this.waveStartTime = currentTime;
      this.hasWaveStartTime = true;
    }

    const newEnemies: Enemy[] = [];
    const elapsed = currentTime - this.waveStartTime;

    for (let groupIndex = 0; groupIndex < wave.groups.length; groupIndex++) {
      const group = wave.groups[groupIndex];
      const groupStartTime = this.getGroupStartTime(wave, groupIndex);
      const timeSinceGroupStart = elapsed - groupStartTime;

      if (timeSinceGroupStart < 0) {
        continue;
      }

      let spawnedInGroup = this.spawnTimers.get(groupIndex) ?? 0;
      while (spawnedInGroup < group.count) {
        const spawnOffset = spawnedInGroup * group.interval;
        if (timeSinceGroupStart < spawnOffset) {
          break;
        }

        const enemy = this.spawnEnemy(group);
        newEnemies.push(enemy);
        this.spawnedEnemies.push({
          enemy,
          spawnTime: currentTime,
          groupIndex,
        });
        this.totalSpawnedInWave++;
        spawnedInGroup++;
      }
      this.spawnTimers.set(groupIndex, spawnedInGroup);
    }

    this.currentGroupIndex = wave.groups.findIndex(
      (group, groupIndex) => (this.spawnTimers.get(groupIndex) ?? 0) < group.count
    );
    if (this.currentGroupIndex === -1) {
      this.currentGroupIndex = wave.groups.length;
      this.enemiesInCurrentGroup = 0;
      this.isActive = false;
    } else {
      this.enemiesInCurrentGroup = this.spawnTimers.get(this.currentGroupIndex) ?? 0;
    }

    return newEnemies;
  }

  private getGroupStartTime(wave: Wave, groupIndex: number): number {
    const configuredDelay = wave.groups[groupIndex].delay;
    if (configuredDelay !== undefined) {
      return configuredDelay;
    }
    let time = 0;
    for (let i = 0; i < groupIndex; i++) {
      const g = wave.groups[i];
      time += g.count * g.interval + wave.delayBetweenGroups;
    }
    return time;
  }

  private spawnEnemy(group: SpawnGroup): Enemy {
    const type = group.type ?? group.enemyType;
    if (!type) {
      throw new Error('Spawn group requires an enemy type');
    }
    const enemy = createEnemy(this.nextEnemyId++, type, this.path);
    if (group.variant !== undefined) {
      applyEnemyVariant(enemy, group.variant);
    }
    return enemy;
  }

  getNextEnemyId(): number {
    return this.nextEnemyId;
  }

  setNextEnemyId(id: number): void {
    this.nextEnemyId = id;
  }

  getRemainingInCurrentGroup(): number {
    const wave = this.getCurrentWave();
    if (!wave || this.currentGroupIndex >= wave.groups.length) {
      return 0;
    }
    return wave.groups[this.currentGroupIndex].count - this.enemiesInCurrentGroup;
  }

  getRemainingEnemyCount(): number {
    const wave = this.getCurrentWave();
    if (!wave) {
      return 0;
    }
    return wave.groups.reduce(
      (total, group, groupIndex) => total + group.count - (this.spawnTimers.get(groupIndex) ?? 0),
      0
    );
  }

  getRemainingGroups(): number {
    const wave = this.getCurrentWave();
    if (!wave) return 0;
    const incompleteGroups = wave.groups.filter(
      (group, groupIndex) => (this.spawnTimers.get(groupIndex) ?? 0) < group.count
    ).length;
    return Math.max(0, incompleteGroups - 1);
  }
}

export function createDefaultWaves(): Wave[] {
  return RELEASE_WAVES.map(definition => ({
    id: definition.number,
    name: definition.name,
    completionBonus: definition.completionBonus,
    groups: definition.groups.map(group => ({ ...group })),
    delayBetweenGroups: 0,
    totalDuration: definition.groups.reduce(
      (duration, group) => Math.max(duration, group.delay + group.count * group.interval),
      0
    ),
  }));
}

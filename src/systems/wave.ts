import { Path } from './path';
import { Enemy, createEnemy } from '../entities/enemy';
import { EnemyType } from '../content/enemyDefinitions';

export { EnemyType, EnemyVariant } from '../content/enemyDefinitions';
export { ENEMY_DEFINITIONS as ENEMY_STATS } from '../content/enemyDefinitions';

export interface SpawnGroup {
  enemyType: EnemyType;
  count: number;
  interval: number;
}

export interface Wave {
  id: number;
  name: string;
  groups: SpawnGroup[];
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

    while (this.currentGroupIndex < wave.groups.length) {
      const group = wave.groups[this.currentGroupIndex];
      const groupStartTime = this.getGroupStartTime(wave, this.currentGroupIndex);
      const timeSinceGroupStart = elapsed - groupStartTime;

      if (timeSinceGroupStart < 0) {
        break;
      }

      while (this.enemiesInCurrentGroup < group.count) {
        const spawnOffset = this.enemiesInCurrentGroup * group.interval;
        if (timeSinceGroupStart < spawnOffset) {
          break;
        }

        const enemy = this.spawnEnemy(group.enemyType);
        newEnemies.push(enemy);
        this.spawnedEnemies.push({
          enemy,
          spawnTime: currentTime,
          groupIndex: this.currentGroupIndex,
        });
        this.totalSpawnedInWave++;
        this.enemiesInCurrentGroup++;
      }

      const groupComplete = this.enemiesInCurrentGroup >= group.count;
      const groupDelayPassed = timeSinceGroupStart >= group.count * group.interval + wave.delayBetweenGroups;

      if (!groupComplete || !groupDelayPassed) {
        break;
      }

      this.currentGroupIndex++;
      this.enemiesInCurrentGroup = 0;
    }

    if (this.currentGroupIndex >= wave.groups.length && this.totalSpawnedInWave >= this.getTotalEnemyCount(wave)) {
      this.isActive = false;
    }

    return newEnemies;
  }

  private getGroupStartTime(wave: Wave, groupIndex: number): number {
    let time = 0;
    for (let i = 0; i < groupIndex; i++) {
      const g = wave.groups[i];
      time += g.count * g.interval + wave.delayBetweenGroups;
    }
    return time;
  }

  private getTotalEnemyCount(wave: Wave): number {
    return wave.groups.reduce((sum, g) => sum + g.count, 0);
  }

  private spawnEnemy(type: EnemyType): Enemy {
    const enemy = createEnemy(this.nextEnemyId++, type, this.path);
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
    if (!wave || this.currentGroupIndex >= wave.groups.length) {
      return 0;
    }

    let total = this.getRemainingInCurrentGroup();
    for (let i = this.currentGroupIndex + 1; i < wave.groups.length; i++) {
      total += wave.groups[i].count;
    }
    return total;
  }

  getRemainingGroups(): number {
    const wave = this.getCurrentWave();
    if (!wave) return 0;
    return wave.groups.length - this.currentGroupIndex - 1;
  }
}

export function createDefaultWaves(): Wave[] {
  return [
    createWave(1, "Red Dawn", [
      { enemyType: EnemyType.ScoutBeetle, count: 10, interval: 500 },
    ]),
    createWave(2, "Beetle Surge", [
      { enemyType: EnemyType.ScoutBeetle, count: 10, interval: 400 },
      { enemyType: EnemyType.DartWasp, count: 5, interval: 600 },
    ]),
    createWave(3, "Caterpillar Crawl", [
      { enemyType: EnemyType.DartWasp, count: 8, interval: 500 },
      { enemyType: EnemyType.ShellBeetle, count: 5, interval: 800 },
    ]),
    createWave(4, "Wasp Wave", [
      { enemyType: EnemyType.ShellBeetle, count: 10, interval: 600 },
      { enemyType: EnemyType.CrawlerCaterpillar, count: 8, interval: 400 },
    ]),
    createWave(5, "Ladybug Legion", [
      { enemyType: EnemyType.CrawlerCaterpillar, count: 15, interval: 300 },
      { enemyType: EnemyType.SwarmWasp, count: 5, interval: 500 },
    ]),
    createWave(6, "Widow's Web", [
      { enemyType: EnemyType.SwarmWasp, count: 10, interval: 400 },
      { enemyType: EnemyType.IronCaterpillar, count: 3, interval: 1000 },
    ]),
    createWave(7, "Moth Flight", [
      { enemyType: EnemyType.VeilWasp, count: 20, interval: 200 },
    ]),
    createWave(8, "Armored Assault", [
      { enemyType: EnemyType.BulwarkBeetle, count: 5, interval: 1500 },
      { enemyType: EnemyType.ShellBeetle, count: 15, interval: 400 },
    ]),
    createWave(9, "Rainbow Rush", [
      { enemyType: EnemyType.WardMoth, count: 5, interval: 800 },
      { enemyType: EnemyType.DartWasp, count: 10, interval: 300 },
      { enemyType: EnemyType.CrawlerCaterpillar, count: 10, interval: 300 },
    ]),
    createWave(10, "Snail Siege", [
      { enemyType: EnemyType.PaleMoth, count: 3, interval: 2000 },
      { enemyType: EnemyType.SwarmWasp, count: 20, interval: 200 },
    ]),
  ];
}

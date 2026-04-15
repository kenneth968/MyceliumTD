import { Path, createDefaultPath } from '../systems/path';
import { MapInfo, getMapById, createDefaultMapSelectionState, GameMapSelectionState } from './mapLevel';
import { TargetingMode, getTarget, getEnemiesInRange, Tower as BaseTower, Enemy as BaseEnemy } from '../systems/targeting';
import { WaveSpawner, Wave, createDefaultWaves, EnemyType, ENEMY_STATS } from '../systems/wave';
import { TowerType, Tower, Projectile, TOWER_STATS, createTower as createBaseTower, fireTowerWithProjectile, updateProjectile, applyDamage, getKillReward, canFire } from '../entities/tower';
import { Enemy, StatusEffectType, createEnemy as createBaseEnemy, updateEnemyPosition, updateStatusEffects, applyStatusEffect, applyDamageToEnemy, getReward } from '../entities/enemy';
import { Hero, createHero, updateHeroPosition, moveHeroTo, stopHero, updateHeroAbilities, heroAttackEnemy, useAbility } from '../entities/hero';
import { getHeroRenderData, HeroRenderData } from '../systems/heroRender';
import { GameEconomy, createEconomy, DEFAULT_ECONOMY_CONFIG } from '../systems/economy';
import { TowerWithUpgrades, UpgradePath, createTowerWithUpgrades, applyUpgrade, getUpgradeCost, getUpgradeInfo, getTotalSellValue, getUpgradeSummary } from '../systems/upgrade';
import { Vec2, vec2Distance } from '../utils/vec2';
import { applyHitEffects, getHitEffectsForTowerType, calculateAreaDamage } from './collision';
import { processEnemyStatusTick, isEnemyStunned, getSlowFactor } from './statusEffects';
import { PlacementMode, TowerPlacer, createTowerPlacer, RangePreview, PathPreview } from './input';
import { 
  PlacementPreviewRenderData,
  PlacementPreviewWithTargetingRenderData,
  TowerSelectionPreviewRenderData,
  getPlacementPreviewRenderData as getPreviewRenderData,
  getPlacementGhostRenderData,
  getRangeCircleRenderData,
  getPathCoverageRenderData,
  getTowerSelectionPreviewRenderData,
  getTargetingModeSelectionRenderData
} from './placementPreview';
import { 
  getHealthBarsRenderData, 
  createHealthBarAnimator, 
  HealthBarAnimator,
  HealthBarRenderData 
} from './healthBarRender';
import { 
  WaveAnnouncementAnimator,
  createWaveAnnouncementAnimator,
  startWaveAnnouncement,
  triggerWaveCompletion,
  updateWaveAnnouncement,
  getWaveUIAnnouncementRenderData,
  WaveUIAnnouncementRenderData,
} from './waveAnnouncementRender';
import { 
  PauseMenuAnimator,
  createPauseMenuAnimator,
  showPauseMenu,
  hidePauseMenu,
  updatePauseMenu,
  getPauseMenuRenderData,
  getPauseMenuButtonAtPosition,
  PauseMenuRenderData,
} from './pauseMenuRender';
import { 
  WaveProgressAnimator,
  createWaveProgressAnimator,
  showWaveProgress,
  hideWaveProgress,
  updateWaveProgress,
  getWaveProgressRenderData,
  WaveProgressRenderData,
} from './waveProgressRender';
import { 
  GameOverVictoryAnimator,
  createGameOverVictoryAnimator,
  showGameOver,
  showVictory,
  hideGameOverVictory,
  updateGameOverVictory,
  getGameOverVictoryRenderData,
  GameOverVictoryRenderData,
} from './gameOverVictoryRender';
import { 
  TowerInfoPanelAnimator,
  createTowerInfoPanelAnimator,
  showTowerInfoPanel,
  hideTowerInfoPanel,
  updateTowerInfoPanel,
  getTowerInfoPanelRenderData,
  getAnimatedTowerInfoPanel,
  TowerInfoPanelRenderData,
} from './towerInfoPanel';
import { 
  LivesMoneyDisplayAnimator,
  createLivesMoneyDisplayAnimator,
  updateLivesMoneyDisplay,
  getLivesMoneyDisplayRenderData,
  LivesMoneyDisplayRenderData,
} from './livesMoneyDisplayRender';
import { 
  EnemyCountDisplayAnimator,
  createEnemyCountDisplayAnimator,
  showEnemyCountDisplay,
  hideEnemyCountDisplay,
  updateEnemyCountDisplay,
  getEnemyCountDisplayRenderDataFull,
  EnemyCountDisplayRenderData,
} from './enemyCountDisplayRender';
import { 
  RoundManager, 
  RoundState, 
  createRoundManager,
  RoundConfig,
  DEFAULT_ROUND_CONFIG
} from './roundManager';
import { 
  MapSelectionAnimator,
  createMapSelectionAnimator,
  updateMapSelection,
  getMapSelectionRenderData,
  MapSelectionRenderData,
  showMapSelection,
  hideMapSelection,
} from './mapSelectionRender';

export enum GameSpeed {
  Normal = 1,
  Fast = 2,
  Faster = 3,
}

export enum PlacementState {
  None = 'none',
  Placing = 'placing',
  Selecting = 'selecting',
}

export enum GameState {
  Idle = 'idle',
  Playing = 'playing',
  Paused = 'paused',
  GameOver = 'game_over',
  Victory = 'victory',
}

export interface GameEvent {
  type: 'hit' | 'death' | 'area_hit';
  position: Vec2;
  towerType?: TowerType;
  enemyType?: string;
  enemyColor?: string;
  radius?: number;
  effectType?: string;
}

export interface PlacedTower {
  tower: TowerWithUpgrades;
  x: number;
  y: number;
}

export interface GameConfig {
  startingMoney?: number;
  startingLives?: number;
  maxWaves?: number;
  pathPoints?: number[];
  mapId?: string;
}

export const DEFAULT_GAME_CONFIG: GameConfig = {
  startingMoney: 650,
  startingLives: 20,
  maxWaves: 10,
};

export class GameRunner {
  private state: GameState;
  private path: Path;
  private currentMap: MapInfo | null;
  private waveSpawner: WaveSpawner;
  private economy: GameEconomy;
  private placedTowers: PlacedTower[];
  private activeEnemies: Enemy[];
  private activeProjectiles: Projectile[];
  private config: GameConfig;
  private currentTime: number;
  private lastUpdateTime: number;
  private nextTowerId: number;
  private nextEnemyId: number;
  private nextProjectileId: number;
  private towers: Tower[];
  private enemies: Enemy[];
  private placementState: PlacementState;
  private placementPosition: Vec2 | null;
  private selectedTowerType: TowerType | null;
  private selectedTowerId: number | null;
  private selectedTargetingMode: TargetingMode;
  private gameSpeed: GameSpeed;
  private healthBarAnimator: HealthBarAnimator;
  private waveAnnouncementAnimator: WaveAnnouncementAnimator;
  private pauseMenuAnimator: PauseMenuAnimator;
  private waveProgressAnimator: WaveProgressAnimator;
  private gameOverVictoryAnimator: GameOverVictoryAnimator;
  private towerInfoPanelAnimator: TowerInfoPanelAnimator;
  private livesMoneyDisplayAnimator: LivesMoneyDisplayAnimator;
  private enemyCountDisplayAnimator: EnemyCountDisplayAnimator;
  private roundManager: RoundManager;
  private mapSelectionState: GameMapSelectionState;
  private mapSelectionAnimator: MapSelectionAnimator;
  private towerPlacer: TowerPlacer;
  private hero: Hero | null;
  private selectedHeroId: number | null;
  private eventQueue: GameEvent[];

  constructor(config: Partial<GameConfig> = {}) {
    this.config = { ...DEFAULT_GAME_CONFIG, ...config };
    
    this.currentMap = this.config.mapId ? getMapById(this.config.mapId) ?? null : null;
    if (this.currentMap) {
      this.path = this.currentMap.path;
    } else {
      this.path = createDefaultPath();
    }
    
    this.waveSpawner = new WaveSpawner(this.path, createDefaultWaves());
    
    const baseStartingMoney = this.config.startingMoney !== undefined ? this.config.startingMoney : 650;
    const baseStartingLives = this.config.startingLives !== undefined ? this.config.startingLives : 20;
    const startingMoney = this.currentMap
      ? Math.floor(baseStartingMoney * this.currentMap.startingMoneyModifier)
      : baseStartingMoney;
    const startingLives = this.currentMap
      ? Math.floor(baseStartingLives * this.currentMap.startingLivesModifier)
      : baseStartingLives;
    
    this.economy = createEconomy({
      startingMoney,
      startingLives,
    });
    this.placedTowers = [];
    this.activeEnemies = [];
    this.activeProjectiles = [];
    this.state = GameState.Idle;
    this.currentTime = 0;
    this.lastUpdateTime = 0;
    this.nextTowerId = 1;
    this.nextEnemyId = 1;
    this.nextProjectileId = 1;
    this.towers = [];
    this.enemies = [];
    this.placementState = PlacementState.None;
    this.placementPosition = null;
    this.selectedTowerType = null;
    this.selectedTowerId = null;
    this.selectedTargetingMode = TargetingMode.First;
    this.gameSpeed = GameSpeed.Normal;
    this.healthBarAnimator = createHealthBarAnimator();
    this.waveAnnouncementAnimator = createWaveAnnouncementAnimator();
    this.pauseMenuAnimator = createPauseMenuAnimator();
    this.waveProgressAnimator = createWaveProgressAnimator();
    this.gameOverVictoryAnimator = createGameOverVictoryAnimator();
    this.towerInfoPanelAnimator = createTowerInfoPanelAnimator();
    this.livesMoneyDisplayAnimator = createLivesMoneyDisplayAnimator();
    this.enemyCountDisplayAnimator = createEnemyCountDisplayAnimator();
    this.mapSelectionAnimator = createMapSelectionAnimator();
    const maxWaves = this.currentMap?.maxWaves ?? this.config.maxWaves ?? 10;
    this.roundManager = createRoundManager(this.waveSpawner, this.economy, {
      maxRounds: maxWaves,
      intermissionDuration: Infinity,
      autoStartNextRound: false,
    });
    this.roundManager.setEvents({
      onRoundStart: (roundNumber: number, wave: Wave) => {
        startWaveAnnouncement(this.waveAnnouncementAnimator, roundNumber - 1, wave.name, this.currentTime);
        showWaveProgress(this.waveProgressAnimator, this.currentTime);
        showEnemyCountDisplay(this.enemyCountDisplayAnimator, this.currentTime);
      },
      onRoundEnd: (roundNumber: number, bonus: number) => {
        triggerWaveCompletion(this.waveAnnouncementAnimator, bonus, this.currentTime);
        this.waveProgressAnimator.state = 'complete';
        hideEnemyCountDisplay(this.enemyCountDisplayAnimator, this.currentTime);
      },
      onIntermissionStart: (roundNumber: number) => {
      },
      onVictory: (finalRound: number) => {
        this.state = GameState.Victory;
        this.waveProgressAnimator.state = 'victory';
        const stats = this.getGameStats();
        showVictory(this.gameOverVictoryAnimator, stats.money + stats.towers * 100, stats.wave, this.currentTime);
      },
      onGameOver: (roundReached: number) => {
        this.state = GameState.GameOver;
        this.waveProgressAnimator.state = 'game_over';
        const stats = this.getGameStats();
        showGameOver(this.gameOverVictoryAnimator, stats.money + stats.towers * 100, stats.wave, this.currentTime);
      },
    });
    this.mapSelectionState = createDefaultMapSelectionState();
    this.towerPlacer = createTowerPlacer({
      path: this.path,
      placedTowers: this.placedTowers,
      minDistanceFromPath: 30,
      minDistanceFromTower: 40,
    });
    this.hero = null;
    this.selectedHeroId = null;
    this.eventQueue = [];
  }

  drainEvents(): GameEvent[] {
    const events = this.eventQueue;
    this.eventQueue = [];
    return events;
  }

  getState(): GameState {
    return this.state;
  }

  getPath(): Path {
    return this.path;
  }

  getCurrentMap(): MapInfo | null {
    return this.currentMap;
  }

  setMap(mapId: string): boolean {
    const map = getMapById(mapId);
    if (!map) {
      return false;
    }
    this.currentMap = map;
    this.path = map.path;
    this.waveSpawner = new WaveSpawner(this.path, createDefaultWaves());
    this.mapSelectionState.selectedMapId = mapId;
    this.towerPlacer = createTowerPlacer({
      path: this.path,
      placedTowers: this.placedTowers,
      minDistanceFromPath: 30,
      minDistanceFromTower: 40,
    });
    return true;
  }

  getMapSelectionState(): GameMapSelectionState {
    return this.mapSelectionState;
  }

  getMapSelectionAnimator(): MapSelectionAnimator {
    return this.mapSelectionAnimator;
  }

  getMapSelectionRenderData(): MapSelectionRenderData {
    return getMapSelectionRenderData(
      this.mapSelectionState.selectedMapId,
      this.mapSelectionState.hoveredMapId,
      1280,
      720,
      this.mapSelectionAnimator
    );
  }

  showMapSelectionUI(): void {
    showMapSelection(this.mapSelectionAnimator);
    this.mapSelectionState.isSelecting = true;
  }

  hideMapSelectionUI(): void {
    hideMapSelection(this.mapSelectionAnimator);
    this.mapSelectionState.isSelecting = false;
  }

  startMapSelection(): void {
    this.mapSelectionState.isSelecting = true;
  }

  endMapSelection(): void {
    this.mapSelectionState.isSelecting = false;
  }

  selectMap(mapId: string): boolean {
    const map = getMapById(mapId);
    if (!map || map.unlockRequirement) {
      return false;
    }
    this.mapSelectionState.selectedMapId = mapId;
    return true;
  }

  setHoveredMap(mapId: string | null): void {
    this.mapSelectionState.hoveredMapId = mapId;
  }

  confirmMapSelection(): boolean {
    if (!this.mapSelectionState.selectedMapId) {
      return false;
    }
    return this.setMap(this.mapSelectionState.selectedMapId);
  }

  getWaveSpawner(): WaveSpawner {
    return this.waveSpawner;
  }

  getEconomy(): GameEconomy {
    return this.economy;
  }

  getPlacedTowers(): PlacedTower[] {
    return this.placedTowers;
  }

  getActiveEnemies(): Enemy[] {
    return this.activeEnemies;
  }

  getActiveProjectiles(): Projectile[] {
    return this.activeProjectiles;
  }

  getConfig(): GameConfig {
    return { ...this.config };
  }

  start(): boolean {
    if (this.state === GameState.Playing) {
      return false;
    }
    this.state = GameState.Playing;
    this.lastUpdateTime = Date.now();
    return true;
  }

  pause(): boolean {
    if (this.state !== GameState.Playing) {
      return false;
    }
    this.state = GameState.Paused;
    showPauseMenu(this.pauseMenuAnimator, this.currentTime);
    this.waveProgressAnimator.state = 'paused';
    return true;
  }

  resume(): boolean {
    if (this.state !== GameState.Paused) {
      return false;
    }
    this.state = GameState.Playing;
    this.lastUpdateTime = Date.now();
    hidePauseMenu(this.pauseMenuAnimator, this.currentTime);
    this.waveProgressAnimator.state = 'active';
    return true;
  }

  reset(): void {
    this.state = GameState.Idle;
    this.waveSpawner.reset();
    this.economy.reset();
    this.placedTowers = [];
    this.activeEnemies = [];
    this.activeProjectiles = [];
    this.currentTime = 0;
    this.lastUpdateTime = 0;
    this.nextTowerId = 1;
    this.nextEnemyId = 1;
    this.nextProjectileId = 1;
    this.towers = [];
    this.enemies = [];
    this.placementState = PlacementState.None;
    this.placementPosition = null;
    this.selectedTowerType = null;
    this.selectedTowerId = null;
    this.selectedTargetingMode = TargetingMode.First;
    this.gameSpeed = GameSpeed.Normal;
    this.healthBarAnimator.reset();
    this.waveAnnouncementAnimator = createWaveAnnouncementAnimator();
    this.pauseMenuAnimator = createPauseMenuAnimator();
    this.waveProgressAnimator = createWaveProgressAnimator();
    this.gameOverVictoryAnimator = createGameOverVictoryAnimator();
    this.towerInfoPanelAnimator = createTowerInfoPanelAnimator();
    this.livesMoneyDisplayAnimator = createLivesMoneyDisplayAnimator();
    this.enemyCountDisplayAnimator = createEnemyCountDisplayAnimator();
    this.roundManager.reset();
    this.mapSelectionState = createDefaultMapSelectionState();
    this.mapSelectionAnimator = createMapSelectionAnimator();
    this.towerPlacer = createTowerPlacer({
      path: this.path,
      placedTowers: this.placedTowers,
      minDistanceFromPath: 30,
      minDistanceFromTower: 40,
    });
    this.hero = null;
    this.selectedHeroId = null;
    this.eventQueue = [];
  }

  startWave(waveIndex?: number): boolean {
    if (this.state !== GameState.Playing && this.state !== GameState.Idle) {
      return false;
    }
    if (this.state === GameState.Idle) {
      this.start();
    }

    const currentRoundState = this.roundManager.getState();
    if (currentRoundState === RoundState.Idle) {
      const result = this.roundManager.startFirstRound();
      if (result) {
        return this.roundManager.startRound(waveIndex);
      }
      return false;
    }
    
    if (waveIndex !== undefined) {
      return this.roundManager.startRound(waveIndex);
    }
    return this.roundManager.startRound();
  }

  isWaveActive(): boolean {
    return this.waveSpawner.isWaveActive();
  }

  getCurrentWave(): Wave | null {
    return this.waveSpawner.getCurrentWave();
  }

  getCurrentWaveIndex(): number {
    return this.waveSpawner.getCurrentWaveIndex();
  }

  getRemainingEnemies(): number {
    let total = this.waveSpawner.getRemainingInCurrentGroup();
    total += this.waveSpawner.getRemainingGroups() * 10;
    return total;
  }

  canPlaceTower(towerType: TowerType, x: number, y: number): { canPlace: boolean; reason?: string } {
    const cost = TOWER_STATS[towerType].cost;
    if (!this.economy.canAfford(cost)) {
      return { canPlace: false, reason: 'Not enough money' };
    }
    return { canPlace: true };
  }

  placeTower(towerType: TowerType, x: number, y: number, targetingMode: TargetingMode = TargetingMode.First): TowerWithUpgrades | null {
    const cost = TOWER_STATS[towerType].cost;
    if (!this.economy.canAfford(cost)) {
      return null;
    }

    if (!this.economy.spendForTower(cost, TOWER_STATS[towerType].type.toString())) {
      return null;
    }

    const tower = createTowerWithUpgrades(this.nextTowerId++, x, y, towerType, targetingMode);
    this.placedTowers.push({ tower, x, y });
    this.towers.push(tower);
    return tower;
  }

  sellTower(towerId: number): number {
    const index = this.placedTowers.findIndex(pt => pt.tower.id === towerId);
    if (index === -1) {
      return 0;
    }

    const placed = this.placedTowers[index];
    const sellValue = getTotalSellValue(placed.tower);
    
    this.economy.sellTower(TOWER_STATS[placed.tower.towerType].cost);
    this.placedTowers.splice(index, 1);
    
    const towerIndex = this.towers.findIndex(t => t.id === towerId);
    if (towerIndex !== -1) {
      this.towers.splice(towerIndex, 1);
    }
    
    return sellValue;
  }

  upgradeTower(towerId: number, path: UpgradePath): { success: boolean; cost: number; newTier: number } {
    const placed = this.placedTowers.find(pt => pt.tower.id === towerId);
    if (!placed) {
      return { success: false, cost: 0, newTier: 0 };
    }

    const currentTier = placed.tower.upgradeLevels[path];
    if (currentTier >= 3) {
      return { success: false, cost: 0, newTier: currentTier };
    }

    const cost = getUpgradeCost(placed.tower.towerType, path, currentTier + 1);
    if (!this.economy.canAfford(cost)) {
      return { success: false, cost, newTier: currentTier };
    }

    if (!this.economy.upgradeTower(cost, `${placed.tower.towerType} ${path} upgrade`)) {
      return { success: false, cost, newTier: currentTier };
    }

    const result = applyUpgrade(placed.tower, path);
    return { success: result.success, cost, newTier: result.newTier };
  }

  getTowerUpgradeInfo(towerId: number) {
    const placed = this.placedTowers.find(pt => pt.tower.id === towerId);
    if (!placed) {
      return null;
    }
    return getUpgradeSummary(placed.tower);
  }

  private spawnEnemyFromWave(): void {
    const spawned = this.waveSpawner.update(this.currentTime);
    for (const enemy of spawned) {
      this.activeEnemies.push(enemy);
      this.enemies.push(enemy);
    }
  }

  private updateEnemies(deltaTime: number): void {
    for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
      const enemy = this.activeEnemies[i];
      
      const statusResult = processEnemyStatusTick(enemy, deltaTime);

      if (!isEnemyStunned(enemy)) {
        const slowFactor = getSlowFactor(enemy);
        const slowedSpeed = enemy.baseSpeed * slowFactor;
        const originalSpeed = enemy.speed;
        enemy.speed = slowedSpeed;
        updateEnemyPosition(enemy, this.path, deltaTime);
        enemy.speed = originalSpeed;
      }

      if (statusResult.poisonDamage > 0) {
        applyDamageToEnemy(enemy, statusResult.poisonDamage);
      }

      if (enemy.hasReachedEnd) {
        this.economy.loseLife(1);
        this.activeEnemies.splice(i, 1);
        continue;
      }

      if (!enemy.alive) {
        this.eventQueue.push({
          type: 'death',
          position: { ...enemy.position },
          enemyType: enemy.enemyType,
        });
        this.economy.addKillReward(getReward(enemy), `Killed ${enemy.enemyType}`);
        this.activeEnemies.splice(i, 1);
      }
    }
  }

  private updateTowers(deltaTime: number): void {
    for (const placed of this.placedTowers) {
      const tower = placed.tower;

      if (tower.towerType === TowerType.MyceliumNetwork) {
        continue;
      }

      if (!canFire(tower, this.currentTime)) {
        continue;
      }

      const inRange = getEnemiesInRange(tower, this.activeEnemies);
      if (inRange.length === 0) {
        continue;
      }

      const buffedTowers = this.getNetworkBuffedTowers();
      const buffInfo = buffedTowers.find(b => b.tower.id === tower.id);
      let finalEffectStrength = tower.effectStrength;
      let finalEffectDuration = tower.effectDuration;
      let finalAreaRadius = tower.areaRadius;

      if (buffInfo) {
        finalEffectStrength = tower.effectStrength * (1 + buffInfo.buffStrength);
        finalEffectDuration = tower.effectDuration * (1 + buffInfo.buffStrength);
        if (tower.areaRadius !== undefined) {
          finalAreaRadius = tower.areaRadius * (1 + buffInfo.buffStrength);
        }
      }

      const projectile = fireTowerWithProjectile(tower, this.activeEnemies, this.path, this.currentTime, finalEffectStrength, finalEffectDuration, finalAreaRadius);
      if (projectile) {
        projectile.id = this.nextProjectileId++;
        this.activeProjectiles.push(projectile);
      }
    }
  }

  private updateProjectiles(deltaTime: number): void {
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const projectile = this.activeProjectiles[i];
      const result = updateProjectile(projectile, this.activeEnemies, deltaTime);

      if (result.hit && result.target) {
        const effects = getHitEffectsForTowerType(
          projectile.towerType,
          projectile.damage,
          projectile.effectStrength,
          projectile.effectDuration
        );
        applyHitEffects(result.target as any, effects, deltaTime);
        applyDamage(result.target, projectile.damage);

        // Emit hit event for visual effects
        this.eventQueue.push({
          type: 'hit',
          position: { ...projectile.position },
          towerType: projectile.towerType,
          effectType: TOWER_STATS[projectile.towerType].specialEffect,
        });

        if (projectile.towerType === TowerType.PuffballFungus) {
          const areaResult = calculateAreaDamage(
            projectile.position,
            this.activeEnemies,
            projectile.damage,
            projectile.areaRadius
          );

          // Emit area hit event
          this.eventQueue.push({
            type: 'area_hit',
            position: { ...projectile.position },
            towerType: projectile.towerType,
            radius: projectile.areaRadius ?? 40,
          });

          for (const areaEnemy of areaResult.enemiesHit) {
            if (areaEnemy.id !== result.target.id) {
              applyDamage(areaEnemy, areaResult.totalDamage / areaResult.enemiesHit.length);
            }
          }
        }

        this.activeProjectiles.splice(i, 1);
        continue;
      }

      if (!projectile.alive) {
        this.activeProjectiles.splice(i, 1);
      }
    }
  }

  private updateHero(deltaTime: number): void {
    if (!this.hero || !this.hero.alive) return;

    updateHeroAbilities(this.hero, deltaTime);
    updateHeroPosition(this.hero, this.path, deltaTime);

    if (this.hero.isMoving) return;

    const enemiesInRange = this.activeEnemies.filter(
      e => e.alive && vec2Distance(this.hero!.position, e.position) <= this.hero!.range
    );

    if (enemiesInRange.length > 0) {
      const target = enemiesInRange[0];
      const killed = heroAttackEnemy(this.hero, target);
      if (killed) {
        this.economy.addKillReward(getReward(target), `Hero killed ${target.enemyType}`);
      }
    }
  }

  private checkWaveCompletion(): void {
    if (!this.waveSpawner.isWaveActive()) {
      return;
    }

    this.roundManager.checkRoundCompletion(this.activeEnemies.length);
  }

  private checkGameOver(): void {
    if (this.economy.isGameOver()) {
      this.state = GameState.GameOver;
      this.waveProgressAnimator.state = 'game_over';
      const stats = this.getGameStats();
      showGameOver(this.gameOverVictoryAnimator, stats.money + stats.towers * 100, stats.wave, this.currentTime);
    }
  }

  private checkVictory(): void {
    const maxWaveIndex = this.config.maxWaves ? this.config.maxWaves - 1 : 9;
    if (this.waveSpawner.getCurrentWaveIndex() >= maxWaveIndex &&
        !this.waveSpawner.isWaveActive() &&
        this.activeEnemies.length === 0) {
      this.state = GameState.Victory;
      this.waveProgressAnimator.state = 'victory';
      const stats = this.getGameStats();
      showVictory(this.gameOverVictoryAnimator, stats.money + stats.towers * 100, stats.wave, this.currentTime);
    }
  }

  update(currentTime?: number): void {
    if (this.state !== GameState.Playing && this.state !== GameState.Paused) {
      return;
    }

    if (currentTime !== undefined) {
      this.currentTime = currentTime;
    } else {
      this.currentTime = Date.now();
    }

    const now = Date.now();
    const deltaTime = now - this.lastUpdateTime;
    this.lastUpdateTime = now;

    if (this.state === GameState.Playing) {
      this.spawnEnemyFromWave();
      const speedDeltaTime = deltaTime * this.gameSpeed;
      this.updateEnemies(speedDeltaTime);
      this.updateTowers(speedDeltaTime);
      this.updateProjectiles(speedDeltaTime);
      this.updateHero(speedDeltaTime);
    }
    
    this.healthBarAnimator.update(this.activeEnemies, deltaTime);
    updateWaveAnnouncement(this.waveAnnouncementAnimator, deltaTime, this.currentTime);
    updatePauseMenu(this.pauseMenuAnimator, deltaTime, this.currentTime);
    updateWaveProgress(this.waveProgressAnimator, deltaTime, this.currentTime);
    updateGameOverVictory(this.gameOverVictoryAnimator, deltaTime, this.currentTime);
    updateTowerInfoPanel(this.towerInfoPanelAnimator, deltaTime);
    updateLivesMoneyDisplay(this.livesMoneyDisplayAnimator, deltaTime, this.currentTime);
    updateEnemyCountDisplay(this.enemyCountDisplayAnimator, deltaTime, this.currentTime);
    updateMapSelection(this.mapSelectionAnimator, deltaTime, this.mapSelectionState.isSelecting);
    
    if (this.state === GameState.Playing) {
      this.economy.update(this.currentTime);
    }

    this.roundManager.update(this.currentTime);

    if (this.state === GameState.Playing) {
      this.checkWaveCompletion();
      this.checkGameOver();
      this.checkVictory();
    }
  }

  getGameStats(): {
    money: number;
    lives: number;
    wave: number;
    totalWaves: number;
    towers: number;
    enemies: number;
    projectiles: number;
    state: GameState;
  } {
    return {
      money: this.economy.getMoney(),
      lives: this.economy.getLives(),
      wave: this.waveSpawner.getCurrentWaveIndex() + 1,
      totalWaves: this.config.maxWaves || 10,
      towers: this.placedTowers.length,
      enemies: this.activeEnemies.length,
      projectiles: this.activeProjectiles.length,
      state: this.state,
    };
  }

  getPlacementState(): PlacementState {
    return this.placementState;
  }

  getPlacementPosition(): Vec2 | null {
    return this.placementPosition ? { ...this.placementPosition } : null;
  }

  getSelectedTowerType(): TowerType | null {
    return this.selectedTowerType;
  }

  getSelectedTowerId(): number | null {
    return this.selectedTowerId;
  }

  startTowerPlacement(towerType: TowerType): boolean {
    if (this.placementState !== PlacementState.None) {
      return false;
    }
    this.selectedTowerType = towerType;
    this.placementState = PlacementState.Placing;
    this.placementPosition = null;
    this.selectedTowerId = null;
    this.selectedTargetingMode = TargetingMode.First;
    return true;
  }

  updatePlacementPosition(x: number, y: number): void {
    if (this.placementState !== PlacementState.Placing) {
      return;
    }
    this.placementPosition = { x, y };
  }

  cancelPlacement(): void {
    this.placementState = PlacementState.None;
    this.placementPosition = null;
    this.selectedTowerType = null;
    this.selectedTowerId = null;
    this.selectedTargetingMode = TargetingMode.First;
  }

  confirmPlacement(targetingMode: TargetingMode = TargetingMode.First): TowerWithUpgrades | null {
    if (this.placementState !== PlacementState.Placing) {
      this.cancelPlacement();
      return null;
    }

    if (!this.placementPosition || !this.selectedTowerType) {
      this.cancelPlacement();
      return null;
    }

    const cost = TOWER_STATS[this.selectedTowerType].cost;
    if (!this.economy.canAfford(cost)) {
      this.cancelPlacement();
      return null;
    }

    if (!this.economy.spendForTower(cost, TOWER_STATS[this.selectedTowerType].type.toString())) {
      this.cancelPlacement();
      return null;
    }

    const tower = createTowerWithUpgrades(
      this.nextTowerId++,
      this.placementPosition.x,
      this.placementPosition.y,
      this.selectedTowerType,
      targetingMode
    );
    this.placedTowers.push({ tower, x: this.placementPosition.x, y: this.placementPosition.y });
    this.towers.push(tower);
    this.cancelPlacement();
    return tower;
  }

  selectTower(towerId: number): boolean {
    if (this.placementState !== PlacementState.None) {
      return false;
    }
    const found = this.placedTowers.find(pt => pt.tower.id === towerId);
    if (found) {
      this.placementState = PlacementState.Selecting;
      this.selectedTowerId = towerId;
      this.selectedTowerType = null;
      this.placementPosition = null;
      showTowerInfoPanel(this.towerInfoPanelAnimator);
      return true;
    }
    return false;
  }

  deselectTower(): void {
    if (this.placementState === PlacementState.Selecting) {
      this.placementState = PlacementState.None;
      this.selectedTowerId = null;
      hideTowerInfoPanel(this.towerInfoPanelAnimator);
    }
  }

  getSelectedTargetingMode(): TargetingMode {
    return this.selectedTargetingMode;
  }

  setTargetingMode(mode: TargetingMode): void {
    if (this.placementState === PlacementState.Placing) {
      this.selectedTargetingMode = mode;
    }
  }

  selectTargetingModeAtPosition(x: number, y: number): boolean {
    if (this.placementState !== PlacementState.Placing || !this.placementPosition) {
      return false;
    }
    const buttons = this.getTargetingModeButtons();
    for (const button of buttons) {
      if (
        x >= button.position.x &&
        x <= button.position.x + button.size.width &&
        y >= button.position.y &&
        y <= button.position.y + button.size.height
      ) {
        this.selectedTargetingMode = button.mode;
        return true;
      }
    }
    return false;
  }

  sellTowerAtPosition(x: number, y: number): { success: boolean; sellValue: number } {
    if (this.placementState !== PlacementState.Selecting || this.selectedTowerId === null) {
      return { success: false, sellValue: 0 };
    }

    const placed = this.placedTowers.find(pt => pt.tower.id === this.selectedTowerId);
    if (!placed) {
      return { success: false, sellValue: 0 };
    }

    const sellButtonPosition = { x: placed.x + 40, y: placed.y - 60 };
    const sellButtonSize = { width: 80, height: 36 };

    if (
      x >= sellButtonPosition.x &&
      x <= sellButtonPosition.x + sellButtonSize.width &&
      y >= sellButtonPosition.y &&
      y <= sellButtonPosition.y + sellButtonSize.height
    ) {
      const sellValue = this.sellTower(this.selectedTowerId);
      this.placementState = PlacementState.None;
      this.selectedTowerId = null;
      hideTowerInfoPanel(this.towerInfoPanelAnimator);
      return { success: true, sellValue };
    }

    return { success: false, sellValue: 0 };
  }

  private getTargetingModeButtons() {
    if (this.placementState !== PlacementState.Placing || !this.placementPosition) {
      return [];
    }
    const modes = [TargetingMode.First, TargetingMode.Last, TargetingMode.Close, TargetingMode.Strong];
    const TARGETING_MODE_BUTTON_WIDTH = 60;
    const TARGETING_MODE_BUTTON_HEIGHT = 40;
    const TARGETING_MODE_BUTTON_SPACING = 8;
    const TARGETING_MODE_UI_OFFSET_Y = 80;
    
    const totalWidth = modes.length * TARGETING_MODE_BUTTON_WIDTH + (modes.length - 1) * TARGETING_MODE_BUTTON_SPACING;
    const startX = this.placementPosition.x - totalWidth / 2;
    const y = this.placementPosition.y + TARGETING_MODE_UI_OFFSET_Y;

    return modes.map((mode, index) => ({
      mode,
      position: { x: startX + index * (TARGETING_MODE_BUTTON_WIDTH + TARGETING_MODE_BUTTON_SPACING), y },
      size: { width: TARGETING_MODE_BUTTON_WIDTH, height: TARGETING_MODE_BUTTON_HEIGHT },
    }));
  }

  getTargetingModeSelectionRenderData() {
    const placementMode: PlacementMode = 
      this.placementState === PlacementState.Placing ? PlacementMode.Placing :
      this.placementState === PlacementState.Selecting ? PlacementMode.Selecting :
      PlacementMode.None;

    return getTargetingModeSelectionRenderData(
      placementMode,
      this.selectedTowerType,
      this.placementPosition,
      this.selectedTargetingMode
    );
  }

  private getRangePreview() {
    if (this.placementState !== PlacementState.Placing || !this.selectedTowerType || !this.placementPosition) {
      return null;
    }

    const range = TOWER_STATS[this.selectedTowerType].range;
    const validation = this.validatePlacementForPreview(
      this.placementPosition.x,
      this.placementPosition.y,
      this.selectedTowerType
    );

    return {
      position: { ...this.placementPosition },
      radius: range,
      isValid: validation.canPlace,
    };
  }

  private getPathPreview() {
    if (this.placementState !== PlacementState.Placing || !this.selectedTowerType || !this.placementPosition) {
      return null;
    }

    const range = TOWER_STATS[this.selectedTowerType].range;
    const { x: px, y: py } = this.placementPosition;
    const pathPoints = this.path.getPoints();
    const segments: { start: Vec2; end: Vec2; startDistance: number; endDistance: number; isCovered: boolean }[] = [];
    let coveredLength = 0;
    let accumulatedDistance = 0;

    for (let i = 0; i < pathPoints.length - 1; i++) {
      const p1 = pathPoints[i];
      const p2 = pathPoints[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      const endDistance = accumulatedDistance + segLen;

      const distToCenter = this.pointToSegmentDistance(px, py, p1.x, p1.y, p2.x, p2.y);
      const isCovered = distToCenter <= range;

      if (isCovered) {
        coveredLength += segLen;
      }

      segments.push({
        start: { ...p1 },
        end: { ...p2 },
        startDistance: accumulatedDistance,
        endDistance,
        isCovered,
      });

      accumulatedDistance = endDistance;
    }

    return {
      segments,
      totalPathLength: this.path.getTotalLength(),
      coveredLength,
    };
  }

  private pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      return vec2Distance({ x: px, y: py }, { x: x1, y: y1 });
    }

    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    return vec2Distance({ x: px, y: py }, { x: closestX, y: closestY });
  }

  private validatePlacementForPreview(x: number, y: number, towerType: TowerType): { canPlace: boolean; reason?: string } {
    const cost = TOWER_STATS[towerType].cost;
    if (cost <= 0) {
      return { canPlace: false, reason: 'Invalid tower type' };
    }

    const tooCloseToPath = this.isTooCloseToPath(x, y, towerType);
    if (tooCloseToPath) {
      return { canPlace: false, reason: 'Too close to path' };
    }

    const tooCloseToTower = this.isTooCloseToTower(x, y);
    if (tooCloseToTower) {
      return { canPlace: false, reason: 'Too close to another tower' };
    }

    const range = TOWER_STATS[towerType].range;
    if (this.blocksPath(x, y, range)) {
      return { canPlace: false, reason: 'Tower would block the path' };
    }

    return { canPlace: true };
  }

  private isTooCloseToPath(x: number, y: number, towerType: TowerType): boolean {
    const range = TOWER_STATS[towerType].range;
    const checkDistance = Math.max(range * 0.3, 30);

    for (let d = 0; d <= this.path.getTotalLength(); d += 10) {
      const point = this.path.getPointAtDistance(d);
      const dist = vec2Distance({ x, y }, point.position);
      if (dist < checkDistance) {
        return true;
      }
    }
    return false;
  }

  private isTooCloseToTower(x: number, y: number): boolean {
    for (const placed of this.placedTowers) {
      const dist = vec2Distance({ x, y }, { x: placed.x, y: placed.y });
      if (dist < 40) {
        return true;
      }
    }
    return false;
  }

  private blocksPath(x: number, y: number, range: number): boolean {
    const pathPoints = this.path.getPoints();
    for (let i = 0; i < pathPoints.length - 1; i++) {
      const p1 = pathPoints[i];
      const p2 = pathPoints[i + 1];
      const dist = this.pointToSegmentDistance(x, y, p1.x, p1.y, p2.x, p2.y);
      if (dist < range * 0.5) {
        return true;
      }
    }
    return false;
  }

  getPlacementPreviewRenderData(time: number = 0): PlacementPreviewWithTargetingRenderData {
    const placementMode: PlacementMode = 
      this.placementState === PlacementState.Placing ? PlacementMode.Placing :
      this.placementState === PlacementState.Selecting ? PlacementMode.Selecting :
      PlacementMode.None;

    const rangePreview = this.getRangePreview();
    const pathPreview = this.getPathPreview();

    const baseRenderData = getPreviewRenderData(
      this.placementPosition,
      this.selectedTowerType,
      placementMode,
      rangePreview,
      pathPreview
    );

    const targetingModeSelection = this.getTargetingModeSelectionRenderData();

    return {
      ...baseRenderData,
      targetingModeSelection,
    };
  }

  getTowerSelectionPreviewRenderData(): TowerSelectionPreviewRenderData {
    const placementMode: PlacementMode =
      this.placementState === PlacementState.Selecting ? PlacementMode.Selecting :
      PlacementMode.None;

    let selectedTower: TowerWithUpgrades | null = null;
    let position: Vec2 | null = null;

    if (this.placementState === PlacementState.Selecting && this.selectedTowerId !== null) {
      const placed = this.placedTowers.find(pt => pt.tower.id === this.selectedTowerId);
      if (placed) {
        selectedTower = placed.tower;
        position = { x: placed.x, y: placed.y };
      }
    }

    const canAffordUpgrade = (path: UpgradePath, tier: number): boolean => {
      const cost = getUpgradeCost(selectedTower!.towerType, path, tier);
      return this.economy.canAfford(cost);
    };

    return getTowerSelectionPreviewRenderData(
      selectedTower,
      position,
      placementMode,
      canAffordUpgrade,
      getUpgradeCost
    );
  }

  getHealthBarsRenderData(options?: { showAlways?: boolean }): { healthBars: HealthBarRenderData[]; totalVisible: number } {
    return getHealthBarsRenderData(this.activeEnemies, options);
  }

  getHealthBarAnimator(): HealthBarAnimator {
    return this.healthBarAnimator;
  }

  getWaveAnnouncementAnimator(): WaveAnnouncementAnimator {
    return this.waveAnnouncementAnimator;
  }

  getWaveAnnouncementRenderData(): WaveUIAnnouncementRenderData {
    return getWaveUIAnnouncementRenderData(this.waveAnnouncementAnimator);
  }

  getPauseMenuAnimator(): PauseMenuAnimator {
    return this.pauseMenuAnimator;
  }

  getPauseMenuRenderData(): PauseMenuRenderData {
    const stats = this.getGameStats();
    return getPauseMenuRenderData(this.pauseMenuAnimator, {
      currentWave: stats.wave,
      totalWaves: stats.totalWaves,
    });
  }

  handlePauseMenuButtonClick(x: number, y: number): { buttonId: string; handled: boolean } {
    if (this.state !== GameState.Paused) {
      return { buttonId: '', handled: false };
    }

    const renderData = this.getPauseMenuRenderData();
    const buttonId = getPauseMenuButtonAtPosition(x, y, renderData);

    if (!buttonId) {
      return { buttonId: '', handled: false };
    }

    switch (buttonId) {
      case 'resume':
        this.resume();
        break;
      case 'restart':
        this.reset();
        this.start();
        break;
      case 'quit':
        this.reset();
        break;
      default:
        return { buttonId, handled: false };
    }

    return { buttonId, handled: true };
  }

  getWaveProgressAnimator(): WaveProgressAnimator {
    return this.waveProgressAnimator;
  }

  getWaveProgressRenderData(): WaveProgressRenderData {
    const stats = this.getGameStats();
    const wave = this.waveSpawner.getCurrentWave();
    const waveIndex = this.waveSpawner.getCurrentWaveIndex();
    const enemiesTotal = wave ? wave.groups.reduce((sum, g) => sum + g.count, 0) : 0;
    const enemiesDefeated = Math.max(0, enemiesTotal - this.getRemainingEnemies() - this.activeEnemies.length);
    
    return getWaveProgressRenderData(this.waveProgressAnimator, {
      currentWave: stats.wave,
      totalWaves: stats.totalWaves,
      enemiesTotal,
      enemiesDefeated,
      enemiesRemaining: this.getRemainingEnemies(),
    });
  }

  getGameOverVictoryAnimator(): GameOverVictoryAnimator {
    return this.gameOverVictoryAnimator;
  }

  getGameOverVictoryRenderData(): GameOverVictoryRenderData {
    const stats = this.getGameStats();
    return getGameOverVictoryRenderData(this.gameOverVictoryAnimator, {
      finalScore: stats.money + stats.towers * 100,
      finalWave: stats.wave,
    });
  }

  getTowerInfoPanelAnimator(): TowerInfoPanelAnimator {
    return this.towerInfoPanelAnimator;
  }

  getTowerInfoPanelRenderData(): TowerInfoPanelRenderData {
    let selectedTower: TowerWithUpgrades | null = null;
    let position: Vec2 | null = null;

    if (this.placementState === PlacementState.Selecting && this.selectedTowerId !== null) {
      const placed = this.placedTowers.find(pt => pt.tower.id === this.selectedTowerId);
      if (placed) {
        selectedTower = placed.tower;
        position = { x: placed.x, y: placed.y };
      }
    }

    const canAffordUpgrade = (path: UpgradePath, tier: number): boolean => {
      if (!selectedTower) return false;
      const cost = getUpgradeCost(selectedTower.towerType, path, tier);
      return this.economy.canAfford(cost);
    };

    const baseData = getTowerInfoPanelRenderData(
      selectedTower,
      position,
      this.placementState === PlacementState.Selecting,
      canAffordUpgrade,
      getUpgradeCost
    );

    return getAnimatedTowerInfoPanel(baseData, this.towerInfoPanelAnimator);
  }

  getLivesMoneyDisplayAnimator(): LivesMoneyDisplayAnimator {
    return this.livesMoneyDisplayAnimator;
  }

  getLivesMoneyDisplayRenderData(): LivesMoneyDisplayRenderData {
    return getLivesMoneyDisplayRenderData(this.livesMoneyDisplayAnimator, {
      currentLives: this.economy.getLives(),
      maxLives: this.economy.getConfig().startingLives,
      currentMoney: this.economy.getMoney(),
    });
  }

  getEnemyCountDisplayAnimator(): EnemyCountDisplayAnimator {
    return this.enemyCountDisplayAnimator;
  }

  getEnemyCountDisplayRenderData(): EnemyCountDisplayRenderData {
    return getEnemyCountDisplayRenderDataFull(this.enemyCountDisplayAnimator, {
      currentCount: this.activeEnemies.length,
    });
  }

  getGameSpeed(): GameSpeed {
    return this.gameSpeed;
  }

  setGameSpeed(speed: GameSpeed): void {
    this.gameSpeed = speed;
  }

  getGameSpeedMultiplier(): number {
    return this.gameSpeed;
  }

  getRoundManager(): RoundManager {
    return this.roundManager;
  }

  getTowerPlacer(): TowerPlacer {
    return this.towerPlacer;
  }

  selectTowerAtPosition(x: number, y: number): boolean {
    if (this.placementState !== PlacementState.None) {
      return false;
    }

    const CLICK_RADIUS = 30;
    for (const placed of this.placedTowers) {
      const dist = vec2Distance({ x, y }, { x: placed.x, y: placed.y });
      if (dist < CLICK_RADIUS) {
        return this.selectTower(placed.tower.id);
      }
    }
    return false;
  }

  getTowerAtPosition(x: number, y: number): PlacedTower | null {
    const CLICK_RADIUS = 30;
    for (const placed of this.placedTowers) {
      const dist = vec2Distance({ x, y }, { x: placed.x, y: placed.y });
      if (dist < CLICK_RADIUS) {
        return placed;
      }
    }
    return null;
  }

  private getMyceliumTowers(): TowerWithUpgrades[] {
    return this.placedTowers
      .filter(p => p.tower.towerType === TowerType.MyceliumNetwork)
      .map(p => p.tower);
  }

  private getTowersInNetworkRange(mycelium: TowerWithUpgrades): TowerWithUpgrades[] {
    if (mycelium.areaRadius === undefined) {
      return [];
    }
    const buffed: TowerWithUpgrades[] = [];
    for (const placed of this.placedTowers) {
      if (placed.tower.towerType === TowerType.MyceliumNetwork) {
        continue;
      }
      const dist = vec2Distance(mycelium.position, placed.tower.position);
      if (dist <= mycelium.areaRadius) {
        buffed.push(placed.tower);
      }
    }
    return buffed;
  }

  getNetworkBuffedTowers(): Array<{ tower: TowerWithUpgrades; buffStrength: number; sources: TowerWithUpgrades[] }> {
    const myceliumTowers = this.getMyceliumTowers();
    const buffedMap = new Map<number, { tower: TowerWithUpgrades; buffStrength: number; sources: TowerWithUpgrades[] }>();

    for (const mycelium of myceliumTowers) {
      const inRange = this.getTowersInNetworkRange(mycelium);
      for (const tower of inRange) {
        const existing = buffedMap.get(tower.id);
        if (existing) {
          existing.buffStrength += mycelium.effectStrength;
          existing.sources.push(mycelium);
        } else {
          buffedMap.set(tower.id, {
            tower,
            buffStrength: mycelium.effectStrength,
            sources: [mycelium],
          });
        }
      }
    }

    return Array.from(buffedMap.values());
  }

  isTowerNetworkBuffed(towerId: number): boolean {
    const buffed = this.getNetworkBuffedTowers();
    return buffed.some(b => b.tower.id === towerId);
  }

  getTowerBuffInfo(towerId: number): { buffStrength: number; sources: number } | null {
    const buffed = this.getNetworkBuffedTowers();
    const found = buffed.find(b => b.tower.id === towerId);
    if (found) {
      return { buffStrength: found.buffStrength, sources: found.sources.length };
    }
    return null;
  }

  spawnHero(x: number, y: number): Hero | null {
    if (this.hero && this.hero.alive) {
      return null;
    }
    this.hero = createHero(x, y);
    return this.hero;
  }

  getHero(): Hero | null {
    return this.hero;
  }

  getHeroRenderData() {
    if (!this.hero) return null;
    return getHeroRenderData(this.hero);
  }

  moveHeroTo(x: number, y: number): void {
    if (!this.hero || !this.hero.alive) return;
    moveHeroTo(this.hero, x, y);
  }

  selectHero(): boolean {
    if (!this.hero || !this.hero.alive) return false;
    this.selectedHeroId = this.hero.id;
    this.hero.selected = true;
    this.deselectTower();
    return true;
  }

  deselectHero(): void {
    if (this.hero) {
      this.hero.selected = false;
    }
    this.selectedHeroId = null;
  }

  useHeroAbility(abilityIndex: number, targetPosition: Vec2 | null): { used: boolean; damage: number; enemiesHit: number } {
    if (!this.hero || !this.hero.alive) {
      return { used: false, damage: 0, enemiesHit: 0 };
    }

    const result = useAbility(this.hero, abilityIndex, targetPosition, this.activeEnemies);
    return {
      used: result.used,
      damage: result.damage,
      enemiesHit: result.enemiesHit.length,
    };
  }

  getHeroPosition(): Vec2 | null {
    if (!this.hero) return null;
    return { ...this.hero.position };
  }

  isHeroAlive(): boolean {
    return this.hero !== null && this.hero.alive;
  }

  getHeroHealth(): { current: number; max: number } | null {
    if (!this.hero) return null;
    return { current: this.hero.hp, max: this.hero.maxHp };
  }

  getHeroLevel(): number {
    return this.hero?.level ?? 0;
  }
}

export function createGameRunner(config?: Partial<GameConfig>): GameRunner {
  return new GameRunner(config);
}

export function createTestScenario(): GameRunner {
  const game = new GameRunner();
  game.start();
  return game;
}
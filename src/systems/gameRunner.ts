import { Path, createDefaultPath } from '../systems/path';
import { MapInfo, getMapById, createDefaultMapSelectionState, GameMapSelectionState } from './mapLevel';
import { TargetingMode, getTarget, getEnemiesInRange, Tower as BaseTower } from '../systems/targeting';
import { WaveSpawner, Wave, createDefaultWaves, EnemyType, ENEMY_STATS } from '../systems/wave';
import { TowerType, Tower, Projectile, TOWER_STATS, createTower as createBaseTower, fireTowerWithProjectile, updateProjectile, getKillReward, canFire, getTowerDamageType } from '../entities/tower';
import { DamageOptions, DamageResolution, Enemy, EnemyTrait, StatusEffectType, DamageType, createEnemy as createBaseEnemy, updateEnemyPosition, updateStatusEffects, applyStatusEffect, resolveDamage, getReward, refreshSwarmLinkStates, getSwarmLinkedSpeedMultiplier, disruptEnemyTrait, markEnemy, isMarked, consumeShieldBlock, hasActiveShield } from '../entities/enemy';
import { Hero, createHero, updateHeroPosition, moveHeroTo, stopHero, updateHeroAbilities, heroAttackEnemy, useAbility } from '../entities/hero';
import { getHeroRenderData, HeroRenderData } from '../systems/heroRender';
import { GameEconomy, RoundBonusBreakdown, createEconomy, DEFAULT_ECONOMY_CONFIG } from '../systems/economy';
import {
  TowerWithGrowth,
  createTowerWithGrowth,
  evolveTower as applyTowerEvolution,
  getGrowthCosts,
  getTotalSellValue,
  matureTower as applyTowerMaturation,
  type GrowthResult,
  type TowerGrowthInfo,
} from '../systems/upgrade';
import { EVOLUTION_DEFINITIONS, EvolutionEffect, EvolutionPath, TowerStage } from '../content/evolutionDefinitions';
import { Vec2, vec2Distance } from '../utils/vec2';
import { applyHitEffects, getProjectileHitEffects, calculateAreaDamage, type HitEffect } from './collision';
import { processEnemyStatusTick, isEnemyStunned, getSlowFactor } from './statusEffects';
import { PlacementMode, TowerPlacer, createTowerPlacer, RangePreview, PathPreview } from './input';
import { MYCELIUM_NETWORK_REACH } from './myceliumNetworkConfig';
import { 
  PlacementPreviewRenderData,
  PlacementPreviewWithTargetingRenderData,
  TowerSelectionPreviewRenderData,
  getPlacementPreviewRenderData as getPreviewRenderData,
  getPlacementGhostRenderData,
  getRangeCircleRenderData,
  getPathCoverageRenderData,
  getSellButtonAtPosition,
  getTowerSellButton,
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
import { RELEASE_FEATURES, RELEASE_MAP_ID, RELEASE_TOTAL_WAVES } from './releaseScope';
import {
  calculateMyceliumNetwork,
  getBridgeDisconnectImpact,
  type MyceliumConnection,
  type MyceliumNetworkConfig,
  type MyceliumNetworkState,
} from './myceliumNetwork';
import type { GameEvent } from './gameEvents';

export const GameSpeed = {
  Normal: 1,
  Fast: 2,
  Faster: 3,
} as const;

export type GameSpeed = (typeof GameSpeed)[keyof typeof GameSpeed];

export const PlacementState = {
  None: 'none',
  Placing: 'placing',
  Selecting: 'selecting',
} as const;

export type PlacementState = (typeof PlacementState)[keyof typeof PlacementState];

export const GameState = {
  Idle: 'idle',
  Playing: 'playing',
  Paused: 'paused',
  GameOver: 'game_over',
  Victory: 'victory',
} as const;

export type GameState = (typeof GameState)[keyof typeof GameState];

export interface PlacedTower {
  tower: TowerWithGrowth;
  x: number;
  y: number;
}

export interface LingeringField {
  id: number;
  type: 'fungal_carpet';
  position: Vec2;
  radius: number;
  duration: number;
  remaining: number;
  slowStrength: number;
  damagePerSecond: number;
  sourceTowerId: number;
}

export interface SeededPayload {
  id: number;
  type: 'seeded_payload';
  position: Vec2;
  radius: number;
  damage: number;
  delay: number;
  remaining: number;
  sourceTowerId: number;
  targetEnemyId: number;
}

interface ActiveSeed {
  targetEnemyId: number;
  sourceTowerId: number;
  connectedHitCount: number;
  damage: number;
}

export interface GameConfig {
  startingMoney?: number;
  startingLives?: number;
  maxWaves?: number;
  pathPoints?: number[];
  mapId?: string;
}

interface DelayedEvolutionImpact {
  readonly position: Vec2;
  readonly radius: number;
  readonly damage: number;
  remaining: number;
  readonly towerType: TowerType;
  readonly sourceTowerId?: number;
}

export interface TowerSalePreview {
  towerId: number;
  refund: number;
  disconnects: number[];
  disconnectLabels: string[];
}

export type SellTowerResult =
  | { status: 'not_found'; refund: 0; disconnects: []; disconnectLabels: [] }
  | { status: 'confirmation_required'; refund: 0; disconnects: number[]; disconnectLabels: string[] }
  | { status: 'sold'; refund: number; disconnects: number[]; disconnectLabels: string[] };

export const DEFAULT_GAME_CONFIG: GameConfig = {
  startingMoney: DEFAULT_ECONOMY_CONFIG.startingMoney,
  startingLives: 20,
  maxWaves: 10,
};

const NETWORK_REVEAL_DURATION_MULTIPLIER = 1.5;
const NETWORK_REVEAL_SLOW_STRENGTH = 0.1;
const MARK_DURATION = 4000;
const MARK_DAMAGE_MULTIPLIER = 1.2;
const EXECUTE_THRESHOLD = 0.25;
const TRAIT_SUPPRESSION_DURATION = 4000;
const FUNGAL_FIELD_DURATION = 6000;
const FUNGAL_FIELD_SLOW = 0.25;
const SEEDED_TRIGGER_HITS = 3;
const CHORUS_MULTIPLIER = 1.2;
const PUFFBALL_FIELD_STATUS_DURATION = 300;
const PUFFBALL_FIELD_RADIUS = 40;
const SEEDED_PAYLOAD_DELAY = 1000;
const SEEDED_PAYLOAD_RADIUS = 35;
const ECHO_PUFF_DELAY = 250;
const ECHO_PUFF_DAMAGE_MULTIPLIER = 1;
const EVOLUTION_CHAIN_RADIUS = 60;

export class GameRunner {
  private state: GameState;
  private path: Path;
  private currentMap: MapInfo | null;
  private waveSpawner: WaveSpawner;
  private economy: GameEconomy;
  private placedTowers: PlacedTower[];
  private activeEnemies: Enemy[];
  private activeProjectiles: Projectile[];
  private activeLingeringFields: LingeringField[];
  private activeSeededPayloads: SeededPayload[];
  private activeDelayedEvolutionImpacts: DelayedEvolutionImpact[];
  private activeSeeds: Map<number, ActiveSeed>;
  private config: GameConfig;
  private currentTime: number;
  private simulationTime: number;
  private lastUpdateTime: number;
  private hasUpdateTimestamp: boolean;
  private nextTowerId: number;
  private nextEnemyId: number;
  private nextProjectileId: number;
  private nextLingeringFieldId: number;
  private nextSeededPayloadId: number;
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
  private leaksThisWave: number;
  private networkState: MyceliumNetworkState;

  constructor(config: Partial<GameConfig> = {}) {
    this.config = { ...DEFAULT_GAME_CONFIG, ...config };

    this.currentMap = null;
    this.path = createDefaultPath();
    const releaseMap = this.applyReleaseMap();
    
    this.waveSpawner = new WaveSpawner(this.path, createDefaultWaves());
    
    const baseStartingMoney = this.config.startingMoney ?? DEFAULT_ECONOMY_CONFIG.startingMoney;
    const baseStartingLives = this.config.startingLives !== undefined ? this.config.startingLives : 20;
    const startingMoney = Math.floor(baseStartingMoney * releaseMap.startingMoneyModifier);
    const startingLives = Math.floor(baseStartingLives * releaseMap.startingLivesModifier);
    
    this.economy = createEconomy({
      startingMoney,
      startingLives,
    });
    this.placedTowers = [];
    this.activeEnemies = [];
    this.activeProjectiles = [];
    this.activeLingeringFields = [];
    this.activeSeededPayloads = [];
    this.activeDelayedEvolutionImpacts = [];
    this.activeSeeds = new Map();
    this.state = GameState.Idle;
    this.currentTime = 0;
    this.simulationTime = 0;
    this.lastUpdateTime = 0;
    this.hasUpdateTimestamp = false;
    this.nextTowerId = 1;
    this.nextEnemyId = 1;
    this.nextProjectileId = 1;
    this.nextLingeringFieldId = 1;
    this.nextSeededPayloadId = 1;
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
    const maxWaves = releaseMap.maxWaves;
    this.roundManager = createRoundManager(this.waveSpawner, this.economy, {
      maxRounds: maxWaves,
      intermissionDuration: Infinity,
      autoStartNextRound: false,
    });
    this.roundManager.setEvents({
      onRoundStart: (roundNumber: number, wave: Wave) => {
        this.leaksThisWave = 0;
        this.eventQueue.push({
          type: 'wave_started',
          waveNumber: wave.id,
          timestamp: this.currentTime,
        });
        startWaveAnnouncement(this.waveAnnouncementAnimator, wave.id, wave.name, this.currentTime);
        showWaveProgress(this.waveProgressAnimator, this.currentTime);
        showEnemyCountDisplay(this.enemyCountDisplayAnimator, this.currentTime);
      },
      onRoundEnd: (roundNumber: number, bonus: RoundBonusBreakdown) => {
        const waveNumber = this.waveSpawner.getCurrentWave()?.id ?? roundNumber;
        this.eventQueue.push({
          type: 'wave_completed',
          waveNumber,
          completion: bonus.completion,
          perfect: bonus.perfect,
          total: bonus.total,
          timestamp: this.currentTime,
        });
        triggerWaveCompletion(this.waveAnnouncementAnimator, bonus.total, this.currentTime);
        this.waveProgressAnimator.state = 'complete';
        hideEnemyCountDisplay(this.enemyCountDisplayAnimator, this.currentTime);
      },
      onIntermissionStart: (roundNumber: number) => {
      },
      onVictory: (finalRound: number) => {
        const waveNumber = this.waveSpawner.getCurrentWave()?.id ?? finalRound;
        this.eventQueue.push({
          type: 'victory',
          waveNumber,
          timestamp: this.currentTime,
        });
        this.state = GameState.Victory;
        this.waveProgressAnimator.state = 'victory';
        const stats = this.getGameStats();
        showVictory(this.gameOverVictoryAnimator, stats.money + stats.towers * 100, stats.wave, this.currentTime);
      },
      onGameOver: (roundReached: number) => {
        const waveNumber = this.waveSpawner.getCurrentWave()?.id ?? roundReached;
        this.eventQueue.push({
          type: 'defeat',
          waveNumber,
          timestamp: this.currentTime,
        });
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
    this.leaksThisWave = 0;
    this.networkState = calculateMyceliumNetwork(this.getNetworkConfig());
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

  private applyReleaseMap(): MapInfo {
    const releaseMap = getMapById(RELEASE_MAP_ID);
    if (!releaseMap) {
      throw new Error(`Release map not found: ${RELEASE_MAP_ID}`);
    }
    this.currentMap = releaseMap;
    this.path = releaseMap.path;
    return releaseMap;
  }

  setMap(mapId: string): boolean {
    if (!RELEASE_FEATURES.mapSelection) {
      if (mapId !== RELEASE_MAP_ID) {
        return false;
      }
      this.applyReleaseMap();
      this.mapSelectionState.selectedMapId = RELEASE_MAP_ID;
      return true;
    }
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
    if (!RELEASE_FEATURES.mapSelection) return;
    showMapSelection(this.mapSelectionAnimator);
    this.mapSelectionState.isSelecting = true;
  }

  hideMapSelectionUI(): void {
    hideMapSelection(this.mapSelectionAnimator);
    this.mapSelectionState.isSelecting = false;
  }

  startMapSelection(): void {
    if (!RELEASE_FEATURES.mapSelection) return;
    this.mapSelectionState.isSelecting = true;
  }

  endMapSelection(): void {
    this.mapSelectionState.isSelecting = false;
  }

  selectMap(mapId: string): boolean {
    if (!RELEASE_FEATURES.mapSelection) return false;
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
    if (!RELEASE_FEATURES.mapSelection) return false;
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

  getLingeringFields(): LingeringField[] {
    return this.activeLingeringFields.map(field => ({
      ...field,
      position: { ...field.position },
    }));
  }

  getSeededPayloads(): SeededPayload[] {
    return this.activeSeededPayloads.map(payload => ({
      ...payload,
      position: { ...payload.position },
    }));
  }

  getConfig(): GameConfig {
    return { ...this.config };
  }

  start(): boolean {
    if (this.state === GameState.Playing) {
      return false;
    }
    this.state = GameState.Playing;
    this.hasUpdateTimestamp = false;
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
    this.hasUpdateTimestamp = false;
    hidePauseMenu(this.pauseMenuAnimator, this.currentTime);
    this.waveProgressAnimator.state = 'active';
    return true;
  }

  reset(): void {
    this.state = GameState.Idle;
    this.applyReleaseMap();
    this.waveSpawner.reset();
    this.economy.reset();
    this.placedTowers = [];
    this.activeEnemies = [];
    this.activeProjectiles = [];
    this.activeLingeringFields = [];
    this.activeSeededPayloads = [];
    this.activeDelayedEvolutionImpacts = [];
    this.activeSeeds = new Map();
    this.currentTime = 0;
    this.simulationTime = 0;
    this.lastUpdateTime = 0;
    this.hasUpdateTimestamp = false;
    this.nextTowerId = 1;
    this.nextEnemyId = 1;
    this.nextProjectileId = 1;
    this.nextLingeringFieldId = 1;
    this.nextSeededPayloadId = 1;
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
    this.leaksThisWave = 0;
    this.recomputeNetwork(false);
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
    return this.waveSpawner.getRemainingEnemyCount();
  }

  canPlaceTower(towerType: TowerType, x: number, y: number): { canPlace: boolean; reason?: string } {
    const cost = TOWER_STATS[towerType].cost;
    if (!this.economy.canAfford(cost)) {
      return { canPlace: false, reason: 'Not enough Nutrients' };
    }
    return this.validateTowerPlacement(x, y, towerType);
  }

  placeTower(towerType: TowerType, x: number, y: number, targetingMode: TargetingMode = TargetingMode.First): TowerWithGrowth | null {
    const cost = TOWER_STATS[towerType].cost;
    if (!this.economy.canAfford(cost)) {
      return null;
    }

    if (!this.economy.spendForTower(cost, TOWER_STATS[towerType].type.toString())) {
      return null;
    }

    const tower = createTowerWithGrowth(this.nextTowerId++, x, y, towerType, targetingMode);
    this.placedTowers.push({ tower, x, y });
    this.towers.push(tower);
    this.eventQueue.push({
      type: 'tower_placed',
      timestamp: this.currentTime,
      position: { ...tower.position },
      towerId: tower.id,
      towerType: tower.towerType,
    });
    this.recomputeNetwork(true);
    return tower;
  }

  getTowerSalePreview(towerId: number): TowerSalePreview {
    const placed = this.placedTowers.find(entry => entry.tower.id === towerId);
    if (!placed) return { towerId, refund: 0, disconnects: [], disconnectLabels: [] };
    const disconnects = getBridgeDisconnectImpact(this.getNetworkConfig(), towerId);
    return {
      towerId,
      refund: getTotalSellValue(placed.tower),
      disconnects,
      disconnectLabels: disconnects.map(disconnectedId => {
        const disconnected = this.placedTowers.find(entry => entry.tower.id === disconnectedId);
        return disconnected ? TOWER_STATS[disconnected.tower.towerType].displayName : 'Unknown tower';
      }),
    };
  }

  sellTower(towerId: number, confirmDisconnect: boolean = false): SellTowerResult {
    const preview = this.getTowerSalePreview(towerId);
    if (preview.refund === 0) return { status: 'not_found', refund: 0, disconnects: [], disconnectLabels: [] };
    if (preview.disconnects.length > 0 && !confirmDisconnect) {
      return {
        status: 'confirmation_required',
        refund: 0,
        disconnects: preview.disconnects,
        disconnectLabels: preview.disconnectLabels,
      };
    }

    const index = this.placedTowers.findIndex(entry => entry.tower.id === towerId);
    if (index === -1) return { status: 'not_found', refund: 0, disconnects: [], disconnectLabels: [] };
    const [removed] = this.placedTowers.splice(index, 1);

    this.economy.sellTower(TOWER_STATS[removed.tower.towerType].cost, preview.refund);
    this.towers = this.towers.filter(tower => tower.id !== towerId);
    this.activeLingeringFields = this.activeLingeringFields.filter(
      field => field.sourceTowerId !== towerId
    );
    this.activeSeededPayloads = this.activeSeededPayloads.filter(
      payload => payload.sourceTowerId !== towerId
    );
    for (const [enemyId, seed] of this.activeSeeds) {
      if (seed.sourceTowerId === towerId) {
        this.activeSeeds.delete(enemyId);
      }
    }

    if (this.selectedTowerId === towerId) {
      this.selectedTowerId = null;
      this.placementState = PlacementState.None;
      hideTowerInfoPanel(this.towerInfoPanelAnimator);
    }
    this.recomputeNetwork(false);
    return {
      status: 'sold',
      refund: preview.refund,
      disconnects: preview.disconnects,
      disconnectLabels: preview.disconnectLabels,
    };
  }

  matureTower(towerId: number): GrowthResult {
    const placed = this.placedTowers.find(pt => pt.tower.id === towerId);
    if (!placed) {
      return { success: false, cost: 0, reason: 'Tower not found' };
    }

    const cost = getGrowthCosts(placed.tower.towerType).mature;
    if (placed.tower.growth.stage !== TowerStage.Seedling) {
      return { success: false, cost, reason: 'Tower must be a Seedling' };
    }
    if (!this.economy.canAfford(cost)) {
      return { success: false, cost, reason: 'Not enough Nutrients' };
    }
    if (!this.economy.spendForGrowth(cost, `${placed.tower.towerType} maturation`)) {
      return { success: false, cost, reason: 'Not enough Nutrients' };
    }

    const result = applyTowerMaturation(placed.tower);
    if (result.success) {
      this.eventQueue.push({
        type: 'tower_matured',
        towerId,
        towerType: placed.tower.towerType,
        timestamp: this.currentTime,
      });
    }
    return result;
  }

  evolveTower(towerId: number, path: EvolutionPath): GrowthResult {
    const placed = this.placedTowers.find(pt => pt.tower.id === towerId);
    if (!placed) {
      return { success: false, cost: 0, reason: 'Tower not found' };
    }

    const cost = getGrowthCosts(placed.tower.towerType).evolution;
    if (placed.tower.growth.stage !== TowerStage.Mature || placed.tower.growth.evolution !== null) {
      return { success: false, cost, reason: 'Tower must be Mature and unevolved' };
    }
    const isConnected = this.isTowerConnectedToNetwork(towerId);
    if (EVOLUTION_DEFINITIONS[placed.tower.towerType][path].requiresConnection && !isConnected) {
      return { success: false, cost, reason: 'Symbiote evolution requires a mycelium connection' };
    }
    if (!this.economy.canAfford(cost)) {
      return { success: false, cost, reason: 'Not enough Nutrients' };
    }
    if (!this.economy.spendForGrowth(cost, `${placed.tower.towerType} ${path} evolution`)) {
      return { success: false, cost, reason: 'Not enough Nutrients' };
    }

    const result = applyTowerEvolution(placed.tower, path, isConnected);
    if (result.success) {
      this.eventQueue.push({
        type: 'tower_evolved',
        towerId,
        towerType: placed.tower.towerType,
        path,
        effect: EVOLUTION_DEFINITIONS[placed.tower.towerType][path].effect,
        timestamp: this.currentTime,
      });
    }
    return result;
  }

  getTowerGrowthInfo(towerId: number): TowerGrowthInfo | null {
    const placed = this.placedTowers.find(pt => pt.tower.id === towerId);
    if (!placed) {
      return null;
    }
    return {
      stage: placed.tower.growth.stage,
      evolution: placed.tower.growth.evolution,
      totalSpent: placed.tower.growth.totalSpent,
      costs: getGrowthCosts(placed.tower.towerType),
      isConnected: this.isTowerConnectedToNetwork(towerId),
    };
  }

  private spawnEnemyFromWave(): void {
    const spawned = this.waveSpawner.update(this.currentTime);
    for (const enemy of spawned) {
      this.activeEnemies.push(enemy);
      this.enemies.push(enemy);
    }
  }

  private updateEnemies(deltaTime: number): void {
    this.refreshEnemyTraitStates();

    for (let i = this.activeEnemies.length - 1; i >= 0; i--) {
      const enemy = this.activeEnemies[i];
      
      const statusResult = processEnemyStatusTick(enemy, deltaTime);

      if (!isEnemyStunned(enemy)) {
        const slowFactor = getSlowFactor(enemy);
        const slowedSpeed = enemy.baseSpeed * slowFactor * getSwarmLinkedSpeedMultiplier(enemy);
        const originalSpeed = enemy.speed;
        enemy.speed = slowedSpeed;
        updateEnemyPosition(enemy, this.path, deltaTime);
        enemy.speed = originalSpeed;
      }

      if (statusResult.poisonDamage > 0) {
        this.applyEnemyDamageWithFreshTraits(enemy, statusResult.poisonDamage, { applyMarkBonus: false });
      }

      if (enemy.hasReachedEnd) {
        this.activeSeeds.delete(enemy.id);
        this.leaksThisWave++;
        this.eventQueue.push({
          type: 'enemy_leaked',
          position: { ...enemy.position },
          enemyId: enemy.id,
          enemyType: enemy.enemyType,
          waveNumber: this.waveSpawner.getCurrentWave()?.id ?? this.roundManager.getRoundNumber(),
          timestamp: this.currentTime,
        });
        this.economy.loseLife(1);
        this.activeEnemies.splice(i, 1);
        continue;
      }

      if (!enemy.alive) {
        this.activeSeeds.delete(enemy.id);
        this.eventQueue.push({
          type: 'death',
          position: { ...enemy.position },
          enemyType: enemy.enemyType,
          timestamp: this.currentTime,
        });
        this.economy.addKillReward(getReward(enemy), `Killed ${enemy.enemyType}`);
        this.activeEnemies.splice(i, 1);
      }
    }
  }

  private refreshEnemyTraitStates(): void {
    refreshSwarmLinkStates(this.activeEnemies);
  }

  private emitTraitBroken(enemy: Enemy, trait: EnemyTrait): void {
    this.eventQueue.push({
      type: 'trait_broken',
      position: { ...enemy.position },
      enemyId: enemy.id,
      trait,
      timestamp: this.currentTime,
    });
  }

  private applyEnemyDamageWithFreshTraits(enemy: Enemy, damage: number, options: DamageOptions = {}): DamageResolution {
    this.refreshEnemyTraitStates();
    const resolution = resolveDamage(enemy, damage, options);

    if (resolution.shieldConsumed) {
      this.emitTraitBroken(enemy, EnemyTrait.Shielded);
    }

    if (resolution.layersBroken > 0) {
      this.eventQueue.push({
        type: 'layer_broken',
        position: { ...enemy.position },
        enemyId: enemy.id,
        enemyType: enemy.enemyType,
        layersBroken: resolution.layersBroken,
        timestamp: this.currentTime,
      });
    }

    if (resolution.killed) {
      this.refreshEnemyTraitStates();
    }
    return resolution;
  }

  private canProjectileDisruptTraits(projectile: Projectile): boolean {
    if (projectile.towerType !== TowerType.Slimefungus || projectile.sourceTowerId === undefined) {
      return false;
    }

    const placed = this.placedTowers.find(pt => pt.tower.id === projectile.sourceTowerId);
    return !!placed &&
      placed.tower.growth.evolution === EvolutionPath.Symbiote &&
      this.isTowerConnectedToNetwork(placed.tower.id);
  }

  private applyTraitDisruptionFromProjectile(projectile: Projectile, enemy: Enemy): void {
    if (!this.canProjectileDisruptTraits(projectile)) {
      return;
    }

    const disruptedBefore = new Set(
      enemy.statusEffects
        .filter(effect => effect.type === StatusEffectType.TraitDisrupted && effect.disruptedTrait)
        .map(effect => effect.disruptedTrait)
    );
    const placed = projectile.sourceTowerId === undefined
      ? undefined
      : this.placedTowers.find(entry => entry.tower.id === projectile.sourceTowerId);
    const duration = placed === undefined
      ? TRAIT_SUPPRESSION_DURATION
      : TRAIT_SUPPRESSION_DURATION * this.getChorusMultiplier(placed.tower);
    const trait = disruptEnemyTrait(enemy, duration);
    if (trait && !disruptedBefore.has(trait)) {
      this.emitTraitBroken(enemy, trait);
      this.eventQueue.push({
        type: 'trait_suppressed',
        position: { ...enemy.position },
        enemyId: enemy.id,
        trait,
        timestamp: this.currentTime,
      });
    }
  }

  private canProjectileMarkEnemies(projectile: Projectile): boolean {
    if (projectile.towerType !== TowerType.Sporecap || projectile.sourceTowerId === undefined) {
      return false;
    }

    const placed = this.placedTowers.find(pt => pt.tower.id === projectile.sourceTowerId);
    return !!placed &&
      placed.tower.growth.evolution === EvolutionPath.Symbiote &&
      this.isTowerConnectedToNetwork(placed.tower.id);
  }

  private applyMarkFromProjectile(projectile: Projectile, enemy: Enemy): void {
    if (!this.canProjectileMarkEnemies(projectile)) {
      return;
    }

    const placed = projectile.sourceTowerId === undefined
      ? undefined
      : this.placedTowers.find(entry => entry.tower.id === projectile.sourceTowerId);
    const duration = placed === undefined
      ? MARK_DURATION
      : MARK_DURATION * this.getChorusMultiplier(placed.tower);
    markEnemy(enemy, duration, MARK_DAMAGE_MULTIPLIER);
    this.eventQueue.push({
      type: 'enemy_marked',
      position: { ...enemy.position },
      enemyId: enemy.id,
      timestamp: this.currentTime,
    });
  }

  private emitAppliedStatusFeedback(enemy: Enemy, effects: readonly HitEffect[]): void {
    for (const effect of effects) {
      if (effect.type !== 'slow' && effect.type !== 'reveal_camo') continue;
      this.eventQueue.push({
        type: effect.type === 'slow' ? 'enemy_slowed' : 'enemy_revealed',
        position: { ...enemy.position },
        enemyId: enemy.id,
        timestamp: this.currentTime,
      });
    }
  }

  private emitNetworkTrigger(projectile: Projectile): void {
    const targetTowerId = projectile.sourceTowerId;
    if (targetTowerId === undefined || !this.isTowerConnectedToNetwork(targetTowerId)) return;
    const parentId = this.networkState.parentByTowerId.get(targetTowerId);
    if (parentId === undefined) return;
    this.eventQueue.push({
      type: 'network_triggered',
      sourceTowerId: typeof parentId === 'number' ? parentId : null,
      targetTowerId,
      timestamp: this.currentTime,
    });
  }

  private canProjectileExecuteMarkedEnemy(projectile: Projectile): boolean {
    if (projectile.towerType !== TowerType.ThornSniper || projectile.sourceTowerId === undefined) {
      return false;
    }

    const placed = this.placedTowers.find(pt => pt.tower.id === projectile.sourceTowerId);
    return !!placed && this.canTowerExecuteMarkedEnemy(placed.tower);
  }

  private canTowerExecuteMarkedEnemy(tower: TowerWithGrowth): boolean {
    return tower.towerType === TowerType.ThornSniper &&
      tower.growth.evolution === EvolutionPath.Symbiote &&
      this.isTowerConnectedToNetwork(tower.id);
  }

  private isProjectileFromConnectedTower(projectile: Projectile): boolean {
    return projectile.sourceTowerId !== undefined &&
      this.isTowerConnectedToNetwork(projectile.sourceTowerId);
  }

  private applyExecuteFromProjectile(projectile: Projectile, enemy: Enemy): boolean {
    if (!this.canProjectileExecuteMarkedEnemy(projectile) || !isMarked(enemy)) {
      return false;
    }

    if (consumeShieldBlock(enemy)) {
      this.emitTraitBroken(enemy, EnemyTrait.Shielded);
      return true;
    }

    if (enemy.maxHp <= 0 || enemy.hp / enemy.maxHp > EXECUTE_THRESHOLD) {
      return false;
    }

    this.applyEnemyDamageWithFreshTraits(enemy, Number.MAX_SAFE_INTEGER, {
      damageType: DamageType.Explosive,
      applyMarkBonus: false,
    });
    return true;
  }

  private updateLingeringFields(deltaTime: number): void {
    for (let i = this.activeLingeringFields.length - 1; i >= 0; i--) {
      const field = this.activeLingeringFields[i];
      if (!this.isTowerConnectedToNetwork(field.sourceTowerId)) {
        continue;
      }
      field.remaining -= deltaTime;

      if (field.remaining <= 0) {
        this.activeLingeringFields.splice(i, 1);
        continue;
      }

      for (const enemy of this.activeEnemies) {
        if (!enemy.alive || enemy.hp <= 0) {
          continue;
        }

        if (vec2Distance(enemy.position, field.position) <= field.radius) {
          this.applyEnemyDamageWithFreshTraits(
            enemy,
            field.damagePerSecond * (deltaTime / 1000),
            { applyMarkBonus: this.isTowerConnectedToNetwork(field.sourceTowerId) }
          );
          applyStatusEffect(enemy, StatusEffectType.Slow, PUFFBALL_FIELD_STATUS_DURATION, field.slowStrength);
        }
      }
    }
  }

  private updateSeededPayloads(deltaTime: number): void {
    for (let i = this.activeSeededPayloads.length - 1; i >= 0; i--) {
      const payload = this.activeSeededPayloads[i];
      if (!this.isTowerConnectedToNetwork(payload.sourceTowerId)) {
        continue;
      }
      payload.remaining -= deltaTime;

      if (payload.remaining > 0) {
        continue;
      }

      this.detonateSeededPayload(payload);
      this.activeSeededPayloads.splice(i, 1);
    }
  }

  private detonateSeededPayload(payload: SeededPayload): void {
    this.eventQueue.push({
      type: 'seeded_payload_detonated',
      position: { ...payload.position },
      sourceTowerId: payload.sourceTowerId,
      targetEnemyId: payload.targetEnemyId,
      timestamp: this.currentTime,
    });
    this.eventQueue.push({
      type: 'area_hit',
      position: { ...payload.position },
      towerType: TowerType.BulbShooter,
      radius: payload.radius,
      timestamp: this.currentTime,
    });

    for (const enemy of this.activeEnemies) {
      if (!enemy.alive || enemy.hp <= 0) {
        continue;
      }

      if (vec2Distance(enemy.position, payload.position) <= payload.radius) {
        this.applyEnemyDamageWithFreshTraits(enemy, payload.damage, {
          damageType: DamageType.Explosive,
          applyMarkBonus: this.isTowerConnectedToNetwork(payload.sourceTowerId),
        });
      }
    }
  }

  private updateTowers(deltaTime: number): void {
    for (const placed of this.placedTowers) {
      const tower = placed.tower;
      const isConnected = this.isTowerConnectedToNetwork(tower.id);
      tower.sharedCamoDetection = isConnected &&
        this.getChorusOracleTowers().length > 0;

      if (!canFire(tower, this.currentTime)) {
        continue;
      }

      const inRange = getEnemiesInRange(tower, this.activeEnemies);
      if (inRange.length === 0) {
        continue;
      }

      const projectile = fireTowerWithProjectile(
        tower,
        this.activeEnemies,
        this.path,
        this.currentTime,
        tower.effectStrength,
        tower.effectDuration,
        tower.areaRadius,
        this.canTowerExecuteMarkedEnemy(tower),
        isConnected,
      );
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
        const enemy = result.target as Enemy;
        const usesChorusLight = projectile.attackProfile?.evolutionEffect === EvolutionEffect.ChorusLight;
        const chorusLightIsConnected = usesChorusLight && this.isProjectileFromConnectedTower(projectile);
        const baseEffects = getProjectileHitEffects(projectile).filter(effect =>
          !usesChorusLight || (effect.type !== 'reveal_camo' && effect.type !== 'slow')
        );
        const revealDuration = Math.round((projectile.effectDuration ?? 500) * NETWORK_REVEAL_DURATION_MULTIPLIER);
        const effects = chorusLightIsConnected
          ? [
              ...baseEffects,
              { type: 'reveal_camo' as const, strength: 1, duration: revealDuration },
              { type: 'slow' as const, strength: NETWORK_REVEAL_SLOW_STRENGTH, duration: revealDuration },
            ]
          : baseEffects;
        const executeHandled = this.applyExecuteFromProjectile(projectile, enemy);
        let directHitApplied = false;
        let directResolution: DamageResolution | null = null;

        if (!executeHandled) {
          if (this.canProjectileDisruptTraits(projectile) && !hasActiveShield(enemy)) {
            this.applyTraitDisruptionFromProjectile(projectile, enemy);
          }

          const resolution = this.resolveProjectileDirectDamage(projectile, enemy);
          directResolution = resolution;
          applyHitEffects(enemy, effects, deltaTime, resolution.shieldConsumed);
          if (!resolution.shieldConsumed) {
            this.emitAppliedStatusFeedback(enemy, effects);
            directHitApplied = true;
            this.registerConnectedHitOnSeed(projectile, enemy);
            this.applyMarkFromProjectile(projectile, enemy);
          }
        }

        if (directResolution) {
          this.resolveEvolutionFollowUps(projectile, enemy, directResolution);
        }

        this.emitNetworkTrigger(projectile);

        // Emit hit event for visual effects
        this.eventQueue.push({
          type: 'hit',
          position: { ...projectile.position },
          towerType: projectile.towerType,
          effectType: TOWER_STATS[projectile.towerType].specialEffect,
          timestamp: this.currentTime,
        });

        this.resolveProjectileAreas(projectile, enemy);

        if (projectile.towerType === TowerType.Puffball) {
          this.createPuffballLingeringField(projectile);
        }

        if (projectile.towerType === TowerType.BulbShooter && directHitApplied) {
          this.plantSeedFromProjectile(projectile, enemy);
        }

        this.activeProjectiles.splice(i, 1);
        continue;
      }

      if (!projectile.alive) {
        this.activeProjectiles.splice(i, 1);
      }
    }
  }

  private plantSeedFromProjectile(projectile: Projectile, enemy: Enemy): void {
    if (projectile.towerType !== TowerType.BulbShooter || projectile.sourceTowerId === undefined) {
      return;
    }

    const placed = this.placedTowers.find(pt => pt.tower.id === projectile.sourceTowerId);
    if (!placed ||
        placed.tower.growth.evolution !== EvolutionPath.Symbiote ||
        !this.isTowerConnectedToNetwork(placed.tower.id)) {
      return;
    }

    const hasPendingPayload = this.activeSeededPayloads.some(
      payload => payload.targetEnemyId === enemy.id
    );
    if (!enemy.alive || this.activeSeeds.has(enemy.id) || hasPendingPayload) {
      return;
    }

    this.activeSeeds.set(enemy.id, {
      targetEnemyId: enemy.id,
      sourceTowerId: placed.tower.id,
      connectedHitCount: 0,
      damage: projectile.damage,
    });
  }

  private registerConnectedHitOnSeed(projectile: Projectile, enemy: Enemy): void {
    const seed = this.activeSeeds.get(enemy.id);
    if (!seed ||
        !this.isProjectileFromConnectedTower(projectile) ||
        !this.isTowerConnectedToNetwork(seed.sourceTowerId)) {
      return;
    }

    seed.connectedHitCount++;
    if (seed.connectedHitCount < SEEDED_TRIGGER_HITS) {
      return;
    }

    const source = this.placedTowers.find(entry => entry.tower.id === seed.sourceTowerId);
    if (!source) {
      return;
    }
    this.activeSeeds.delete(enemy.id);
    this.activeSeededPayloads.push({
      id: this.nextSeededPayloadId++,
      type: 'seeded_payload',
      position: { ...enemy.position },
      radius: SEEDED_PAYLOAD_RADIUS,
      damage: seed.damage * this.getChorusMultiplier(source.tower),
      delay: SEEDED_PAYLOAD_DELAY,
      remaining: SEEDED_PAYLOAD_DELAY,
      sourceTowerId: seed.sourceTowerId,
      targetEnemyId: seed.targetEnemyId,
    });
  }

  private createPuffballLingeringField(projectile: Projectile): void {
    if (projectile.towerType !== TowerType.Puffball || projectile.sourceTowerId === undefined) {
      return;
    }

    const placed = this.placedTowers.find(pt => pt.tower.id === projectile.sourceTowerId);
    if (!placed ||
        placed.tower.growth.evolution !== EvolutionPath.Symbiote ||
        !this.isTowerConnectedToNetwork(placed.tower.id)) {
      return;
    }

    const chorusMultiplier = this.getChorusMultiplier(placed.tower);
    const duration = FUNGAL_FIELD_DURATION * chorusMultiplier;
    this.activeLingeringFields.push({
      id: this.nextLingeringFieldId++,
      type: 'fungal_carpet',
      position: { ...projectile.position },
      radius: projectile.areaRadius ?? PUFFBALL_FIELD_RADIUS,
      duration,
      remaining: duration,
      slowStrength: FUNGAL_FIELD_SLOW,
      damagePerSecond: projectile.damage * (projectile.effectStrength ?? 0.5) * chorusMultiplier,
      sourceTowerId: placed.tower.id,
    });
  }

  private updateHero(deltaTime: number): void {
    if (!this.hero || !this.hero.alive) return;
    const hero = this.hero;

    updateHeroAbilities(hero, deltaTime);
    updateHeroPosition(hero, this.path, deltaTime);

    if (hero.isMoving) return;

    const enemiesInRange = this.activeEnemies.filter(
      enemy => enemy.alive && vec2Distance(hero.position, enemy.position) <= hero.range
    );

    if (enemiesInRange.length > 0) {
      const target = enemiesInRange[0];
      const killed = heroAttackEnemy(
        hero,
        target,
        (enemy, damage) => this.applyEnemyDamageWithFreshTraits(enemy, damage).killed
      );
      if (killed) {
        this.economy.addKillReward(getReward(target), `Hero killed ${target.enemyType}`);
      }
    }
  }

  private checkWaveCompletion(): void {
    this.roundManager.checkRoundCompletion(this.activeEnemies.length, this.leaksThisWave);
  }

  private checkGameOver(): void {
    if (this.economy.isGameOver()) {
      this.roundManager.triggerGameOver();
    }
  }

  update(currentTime?: number): void {
    const isTerminal = this.state === GameState.GameOver || this.state === GameState.Victory;
    if (this.state !== GameState.Playing && this.state !== GameState.Paused && !isTerminal) {
      return;
    }

    const frameTime = currentTime !== undefined ? currentTime : Date.now();
    const hadUpdateTimestamp = this.hasUpdateTimestamp;
    const deltaTime = hadUpdateTimestamp
      ? Math.max(0, frameTime - this.lastUpdateTime)
      : 0;

    if (this.simulationTime === 0) {
      this.simulationTime = frameTime;
    }

    if (this.state === GameState.Playing && hadUpdateTimestamp) {
      this.simulationTime += deltaTime * this.gameSpeed;
    }

    this.currentTime = this.state === GameState.Playing ? this.simulationTime : frameTime;
    this.lastUpdateTime = frameTime;
    this.hasUpdateTimestamp = true;

    if (isTerminal) {
      updateGameOverVictory(this.gameOverVictoryAnimator, deltaTime, this.currentTime);
      return;
    }

    if (this.state === GameState.Playing) {
      this.spawnEnemyFromWave();
      const speedDeltaTime = deltaTime * this.gameSpeed;
      this.refreshEnemyTraitStates();
      this.updateSeededPayloads(speedDeltaTime);
      this.updateDelayedEvolutionImpacts(speedDeltaTime);
      this.updateLingeringFields(speedDeltaTime);
      this.updateEnemies(speedDeltaTime);
      this.refreshEnemyTraitStates();
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
    if (RELEASE_FEATURES.mapSelection) {
      updateMapSelection(this.mapSelectionAnimator, deltaTime, this.mapSelectionState.isSelecting);
    }
    
    if (this.state === GameState.Playing) {
      this.economy.update(this.currentTime);
    }

    this.roundManager.update(this.currentTime);

    if (this.state === GameState.Playing) {
      this.checkGameOver();
      if (this.state === GameState.Playing) {
        this.checkWaveCompletion();
      }
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
      totalWaves: RELEASE_TOTAL_WAVES,
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

  confirmPlacement(targetingMode: TargetingMode = TargetingMode.First): TowerWithGrowth | null {
    if (this.placementState !== PlacementState.Placing) {
      this.cancelPlacement();
      return null;
    }

    if (!this.placementPosition || !this.selectedTowerType) {
      this.cancelPlacement();
      return null;
    }

    const validation = this.validateTowerPlacement(
      this.placementPosition.x,
      this.placementPosition.y,
      this.selectedTowerType
    );
    if (!validation.canPlace) {
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

    const tower = createTowerWithGrowth(
      this.nextTowerId++,
      this.placementPosition.x,
      this.placementPosition.y,
      this.selectedTowerType,
      targetingMode
    );
    this.placedTowers.push({ tower, x: this.placementPosition.x, y: this.placementPosition.y });
    this.towers.push(tower);
    this.eventQueue.push({
      type: 'tower_placed',
      timestamp: this.currentTime,
      position: { ...tower.position },
      towerId: tower.id,
      towerType: tower.towerType,
    });
    this.recomputeNetwork(true);
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

  sellTowerAtPosition(x: number, y: number, confirmDisconnect: boolean = false): SellTowerResult {
    if (this.placementState !== PlacementState.Selecting || this.selectedTowerId === null) {
      return { status: 'not_found', refund: 0, disconnects: [], disconnectLabels: [] };
    }

    const placed = this.placedTowers.find(pt => pt.tower.id === this.selectedTowerId);
    if (!placed) {
      return { status: 'not_found', refund: 0, disconnects: [], disconnectLabels: [] };
    }

    const sellButton = getTowerSellButton(placed.tower, { x: placed.x, y: placed.y });
    if (getSellButtonAtPosition(sellButton, x, y)) {
      return this.sellTower(this.selectedTowerId, confirmDisconnect);
    }

    return { status: 'not_found', refund: 0, disconnects: [], disconnectLabels: [] };
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
    const validation = this.validateTowerPlacement(
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

  private validateTowerPlacement(x: number, y: number, towerType: TowerType): { canPlace: boolean; reason?: string } {
    return this.towerPlacer.validatePlacement(x, y, towerType);
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

    let proposedConnection: PlacementPreviewWithTargetingRenderData['proposedConnection'] = null;
    if (placementMode === PlacementMode.Placing && this.placementPosition) {
      const previewTowerId = this.nextTowerId;
      const networkConfig = this.getNetworkConfig();
      const previewState = calculateMyceliumNetwork({
        ...networkConfig,
        towers: [
          ...networkConfig.towers,
          { id: previewTowerId, position: this.placementPosition },
        ],
      });
      const connection = previewState.connections.find(
        connection => connection.toId === previewTowerId,
      ) ?? null;
      if (connection) {
        const sourcePosition = connection.fromId === 'kernel'
          ? networkConfig.kernelPosition
          : networkConfig.towers.find(tower => tower.id === connection.fromId)?.position;
        if (sourcePosition) {
          proposedConnection = {
            ...connection,
            sourcePosition: { ...sourcePosition },
            targetPosition: { ...this.placementPosition },
            sourceType: connection.fromId === 'kernel' ? 'kernel' : 'tower',
          };
        }
      }
    }

    const targetingModeSelection = this.getTargetingModeSelectionRenderData();

    return {
      ...baseRenderData,
      proposedConnection,
      willBeConnected: proposedConnection !== null,
      targetingModeSelection,
    };
  }

  getTowerSelectionPreviewRenderData(): TowerSelectionPreviewRenderData {
    const placementMode: PlacementMode =
      this.placementState === PlacementState.Selecting ? PlacementMode.Selecting :
      PlacementMode.None;

    let selectedTower: TowerWithGrowth | null = null;
    let position: Vec2 | null = null;

    if (this.placementState === PlacementState.Selecting && this.selectedTowerId !== null) {
      const placed = this.placedTowers.find(pt => pt.tower.id === this.selectedTowerId);
      if (placed) {
        selectedTower = placed.tower;
        position = { x: placed.x, y: placed.y };
      }
    }

    return getTowerSelectionPreviewRenderData(
      selectedTower,
      position,
      placementMode
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
    let selectedTower: TowerWithGrowth | null = null;

    if (this.placementState === PlacementState.Selecting && this.selectedTowerId !== null) {
      const placed = this.placedTowers.find(pt => pt.tower.id === this.selectedTowerId);
      if (placed) {
        selectedTower = placed.tower;
      }
    }

    const baseData = getTowerInfoPanelRenderData(
      selectedTower,
      this.placementState === PlacementState.Selecting,
      this.economy.getMoney(),
      selectedTower !== null && this.isTowerConnectedToNetwork(selectedTower.id),
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

  private getKernelNetworkPosition(): Vec2 {
    return this.path.getPointAtDistance(this.path.getTotalLength()).position;
  }

  private getNetworkConfig(): MyceliumNetworkConfig {
    return {
      kernelPosition: this.getKernelNetworkPosition(),
      kernelReach: MYCELIUM_NETWORK_REACH.kernel,
      towerReach: MYCELIUM_NETWORK_REACH.tower,
      towers: this.placedTowers.map(placed => ({
        id: placed.tower.id,
        position: placed.tower.position,
      })),
    };
  }

  private resolveEvolutionFollowUps(
    projectile: Projectile,
    primary: Enemy,
    primaryResolution: DamageResolution,
  ): void {
    const profile = projectile.attackProfile;
    if (!profile) {
      return;
    }

    const nearbyTargets = this.activeEnemies
      .filter(enemy =>
        enemy.id !== primary.id &&
        enemy.alive &&
        enemy.hp > 0 &&
        vec2Distance(enemy.position, projectile.position) <= EVOLUTION_CHAIN_RADIUS
      )
      .sort((left, right) => right.pathDistance - left.pathDistance);

    for (const splitTarget of nearbyTargets.slice(0, profile.splitTargets)) {
      const splitResolution = this.applyEnemyDamageWithFreshTraits(splitTarget, projectile.damage, {
        damageType: getTowerDamageType(projectile.towerType),
      });
      applyHitEffects(splitTarget, getProjectileHitEffects(projectile), 0, splitResolution.shieldConsumed);
    }

    const overflow = projectile.damage - primaryResolution.damageApplied;
    if (!primary.alive && overflow > 0 && profile.pierceTargets > 0) {
      for (const pierceTarget of nearbyTargets.slice(0, profile.pierceTargets)) {
        this.applyEnemyDamageWithFreshTraits(pierceTarget, overflow, { piercing: true });
      }
    }

    for (let pop = 0; pop < profile.delayedPops; pop++) {
      this.activeDelayedEvolutionImpacts.push({
        position: { ...projectile.position },
        radius: projectile.areaRadius ?? 40,
        damage: projectile.damage * ECHO_PUFF_DAMAGE_MULTIPLIER,
        remaining: ECHO_PUFF_DELAY,
        towerType: projectile.towerType,
        sourceTowerId: projectile.sourceTowerId,
      });
    }

    if (profile.evolutionEffect === EvolutionEffect.RevelationField) {
      const radius = projectile.areaRadius ?? 40;
      this.eventQueue.push({
        type: 'area_hit',
        position: { ...projectile.position },
        towerType: projectile.towerType,
        radius,
        effectType: EvolutionEffect.RevelationField,
        timestamp: this.currentTime,
      });
      for (const enemy of this.activeEnemies) {
        if (enemy.alive && vec2Distance(enemy.position, projectile.position) <= radius) {
          const blockedByShield = enemy.id === primary.id
            ? primaryResolution.shieldConsumed
            : this.consumeEvolutionStatusShield(enemy);
          applyHitEffects(enemy, [...profile.extraHitEffects], 0, blockedByShield);
        }
      }
    }
  }

  private resolveProjectileDirectDamage(projectile: Projectile, enemy: Enemy): DamageResolution {
    if (hasActiveShield(enemy)) {
      const shieldDamage = Math.max(1, projectile.attackProfile?.shieldDamage ?? 1);
      for (let shieldHit = 0; shieldHit < shieldDamage; shieldHit++) {
        if (!consumeShieldBlock(enemy)) {
          break;
        }
      }
      if (!hasActiveShield(enemy)) {
        this.emitTraitBroken(enemy, EnemyTrait.Shielded);
      }
      return { killed: false, damageApplied: 0, layersBroken: 0, shieldConsumed: true };
    }

    return this.applyEnemyDamageWithFreshTraits(enemy, projectile.damage, {
      damageType: getTowerDamageType(projectile.towerType),
      piercing: projectile.attackProfile?.bypassesMetal === true ||
        (projectile.attackProfile?.pierceTargets ?? 0) > 0,
      applyMarkBonus: this.isProjectileFromConnectedTower(projectile),
    });
  }

  private consumeEvolutionStatusShield(enemy: Enemy): boolean {
    if (!consumeShieldBlock(enemy)) {
      return false;
    }
    if (!hasActiveShield(enemy)) {
      this.emitTraitBroken(enemy, EnemyTrait.Shielded);
    }
    return true;
  }

  private updateDelayedEvolutionImpacts(deltaTime: number): void {
    for (let index = this.activeDelayedEvolutionImpacts.length - 1; index >= 0; index--) {
      const impact = this.activeDelayedEvolutionImpacts[index];
      impact.remaining -= deltaTime;
      if (impact.remaining > 0) {
        continue;
      }

      this.eventQueue.push({
        type: 'area_hit',
        position: { ...impact.position },
        towerType: impact.towerType,
        radius: impact.radius,
        timestamp: this.currentTime,
      });
      const areaResult = calculateAreaDamage(
        impact.position,
        this.activeEnemies,
        impact.damage,
        impact.radius,
      );
      for (const hit of areaResult.hits) {
        this.applyEnemyDamageWithFreshTraits(hit.enemy, hit.damage, {
          damageType: DamageType.Explosive,
          applyMarkBonus: impact.sourceTowerId === undefined
            ? false
            : this.isTowerConnectedToNetwork(impact.sourceTowerId),
        });
      }
      this.activeDelayedEvolutionImpacts.splice(index, 1);
    }
  }

  private resolveProjectileAreas(projectile: Projectile, primary: Enemy): void {
    if (projectile.towerType !== TowerType.Puffball && projectile.towerType !== TowerType.BulbShooter) {
      return;
    }

    const radius = projectile.areaRadius ?? 40;
    const isCluster = projectile.attackProfile?.evolutionEffect === EvolutionEffect.ClusterBloom;
    const centers = isCluster
      ? [
          { x: projectile.position.x - radius * 0.5, y: projectile.position.y },
          { x: projectile.position.x + radius * 0.5, y: projectile.position.y },
          { x: projectile.position.x, y: projectile.position.y + radius * 0.5 },
        ]
      : [{ ...projectile.position }];
    const areaDamage = isCluster ? projectile.damage * 0.5 : projectile.damage;

    for (const center of centers) {
      this.eventQueue.push({
        type: 'area_hit',
        position: { ...center },
        towerType: projectile.towerType,
        radius,
        timestamp: this.currentTime,
      });
      const areaResult = calculateAreaDamage(center, this.activeEnemies, areaDamage, radius);
      for (const areaHit of areaResult.hits) {
        if (areaHit.enemy.id !== primary.id) {
          this.applyEnemyDamageWithFreshTraits(areaHit.enemy, areaHit.damage, {
            damageType: DamageType.Explosive,
            applyMarkBonus: this.isProjectileFromConnectedTower(projectile),
          });
        }
      }
    }
  }

  private recomputeNetwork(emitConnectionEvents: boolean): void {
    const previouslyConnectedTowerIds = this.networkState.connectedTowerIds;
    this.networkState = calculateMyceliumNetwork(this.getNetworkConfig());

    if (!emitConnectionEvents) return;
    for (const towerId of this.networkState.connectedTowerIds) {
      if (previouslyConnectedTowerIds.has(towerId)) continue;
      const placed = this.placedTowers.find(entry => entry.tower.id === towerId);
      if (!placed) continue;
      const sourceId = this.networkState.parentByTowerId.get(towerId);
      this.eventQueue.push({
        type: 'network_connection_created',
        position: { ...placed.tower.position },
        towerId,
        sourceTowerId: typeof sourceId === 'number' ? sourceId : null,
        timestamp: this.currentTime,
      });
    }
  }

  getMyceliumNetworkState(): MyceliumNetworkState {
    return this.networkState;
  }

  isTowerConnected(towerId: number): boolean {
    return this.networkState.connectedTowerIds.has(towerId);
  }

  isTowerConnectedToNetwork(towerId: number): boolean {
    return this.isTowerConnected(towerId);
  }

  private getChorusOracleTowers(): TowerWithGrowth[] {
    return this.placedTowers
      .map(placed => placed.tower)
      .filter(tower =>
        tower.towerType === TowerType.LumenOracle &&
        tower.growth.evolution === EvolutionPath.Symbiote &&
        this.isTowerConnectedToNetwork(tower.id)
      );
  }

  private getChorusMultiplier(sourceTower: TowerWithGrowth): number {
    return this.placedTowers.some(({ tower }) =>
      tower.towerType === TowerType.LumenOracle &&
      tower.growth.evolution === EvolutionPath.Symbiote &&
      this.isTowerConnected(tower.id) &&
      vec2Distance(tower.position, sourceTower.position) <= tower.range
    ) ? CHORUS_MULTIPLIER : 1;
  }

  private getTowersInChorusRange(oracle: TowerWithGrowth): TowerWithGrowth[] {
    return this.placedTowers
      .map(placed => placed.tower)
      .filter(tower =>
        tower.id !== oracle.id &&
        tower.growth.evolution === EvolutionPath.Symbiote &&
        this.isTowerConnectedToNetwork(tower.id) &&
        vec2Distance(oracle.position, tower.position) <= oracle.range
      );
  }

  getNetworkBuffedTowers(): Array<{ tower: TowerWithGrowth; buffStrength: number; sources: TowerWithGrowth[] }> {
    const buffedMap = new Map<number, { tower: TowerWithGrowth; buffStrength: number; sources: TowerWithGrowth[] }>();

    for (const oracle of this.getChorusOracleTowers()) {
      const inRange = this.getTowersInChorusRange(oracle);
      for (const tower of inRange) {
        if (!buffedMap.has(tower.id)) {
          buffedMap.set(tower.id, {
            tower,
            buffStrength: CHORUS_MULTIPLIER - 1,
            sources: [oracle],
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

    const result = useAbility(
      this.hero,
      abilityIndex,
      targetPosition,
      this.activeEnemies,
      (enemy, damage) => this.applyEnemyDamageWithFreshTraits(enemy, damage)
    );
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

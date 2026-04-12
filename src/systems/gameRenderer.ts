import { GameRunner, GameState, PlacementState, PlacedTower } from './gameRunner';
import { Path, createDefaultPath } from './path';
import { Vec2 } from '../utils/vec2';
import { getTowerRenderData, TowerRenderData, getTowersRenderData, TowerRenderCollection } from './towerRender';
import { EnemyRenderData, getEnemyRenderData, getEnemiesRenderData, EnemyRenderCollection } from './enemyRender';
import { ProjectileRenderData, getProjectileRenderData, getProjectilesRenderData, ProjectileTrailTracker, createProjectileTrailTracker } from './projectileRender';
import { TOWER_STATS, TowerType, Tower, Projectile } from '../entities/tower';
import { Enemy, StatusEffectType } from '../entities/enemy';
import { PlacementPreviewWithTargetingRenderData, TowerSelectionPreviewRenderData } from './placementPreview';
import { HealthBarRenderData } from './healthBarRender';
import { WaveUIAnnouncementRenderData } from './waveAnnouncementRender';
import { PauseMenuRenderData } from './pauseMenuRender';
import { WaveProgressRenderData } from './waveProgressRender';
import { GameOverVictoryRenderData } from './gameOverVictoryRender';
import { TowerInfoPanelRenderData } from './towerInfoPanel';
import { LivesMoneyDisplayRenderData } from './livesMoneyDisplayRender';
import { EnemyCountDisplayRenderData } from './enemyCountDisplayRender';
import { TargetingMode } from './targeting';
import { UpgradePath, TowerWithUpgrades, getTotalSellValue } from './upgrade';
import { TowerPurchaseRenderData, getTowerPurchaseRenderData } from './towerPurchaseRender';
import { MapSelectionRenderData } from './mapSelectionRender';

export interface PathRenderData {
  points: Vec2[];
  totalLength: number;
  segments: PathSegmentRenderData[];
}

export interface PathSegmentRenderData {
  start: Vec2;
  end: Vec2;
  color: string;
  width: number;
  isHighlighted: boolean;
  highlightColor: string;
}

export interface GameFrameRenderData {
  timestamp: number;
  deltaTime: number;
  gameState: GameState;
  placementState: PlacementState;
  
  path: PathRenderData;
  towers: TowerRenderCollection;
  enemies: EnemyRenderCollection;
  projectiles: ProjectileRenderData[];
  
  placementPreview: PlacementPreviewWithTargetingRenderData | null;
  towerSelection: TowerSelectionPreviewRenderData | null;
  
  healthBars: HealthBarRenderData[];
  waveAnnouncement: WaveUIAnnouncementRenderData;
  pauseMenu: PauseMenuRenderData | null;
  waveProgress: WaveProgressRenderData;
  gameOverVictory: GameOverVictoryRenderData;
  towerInfoPanel: TowerInfoPanelRenderData | null;
  livesMoneyDisplay: LivesMoneyDisplayRenderData;
  enemyCountDisplay: EnemyCountDisplayRenderData;
  
  targetingModeButtons: TargetingModeButtonRenderData[];
  sellButton: SellButtonRenderData | null;
  towerPurchase: TowerPurchaseRenderData | null;
  mapSelection: MapSelectionRenderData | null;
  
  camera: CameraState;
  viewport: ViewportSize;
}

export interface TargetingModeButtonRenderData {
  mode: TargetingMode;
  position: Vec2;
  size: { width: number; height: number };
  isSelected: boolean;
  label: string;
  color: string;
}

export interface SellButtonRenderData {
  position: Vec2;
  size: { width: number; height: number };
  sellValue: number;
  isHovered: boolean;
}

export interface CameraState {
  x: number;
  y: number;
  zoom: number;
  rotation: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export interface TowerWithPosition {
  tower: Tower;
  x: number;
  y: number;
}

const DEFAULT_CAMERA: CameraState = {
  x: 0,
  y: 0,
  zoom: 1.0,
  rotation: 0,
};

const DEFAULT_VIEWPORT: ViewportSize = {
  width: 1280,
  height: 720,
};

const PATH_COLOR = '#4A4A4A';
const PATH_HIGHLIGHT_COLOR = '#FFD700';
const PATH_WIDTH = 20;

export class GameRenderer {
  private trailTracker: ProjectileTrailTracker;
  private previousProjectilePositions: Map<number, Vec2>;
  private previousEnemyPositions: Map<number, Vec2>;
  private camera: CameraState;
  private viewport: ViewportSize;

  constructor() {
    this.trailTracker = createProjectileTrailTracker();
    this.previousProjectilePositions = new Map();
    this.previousEnemyPositions = new Map();
    this.camera = { ...DEFAULT_CAMERA };
    this.viewport = { ...DEFAULT_VIEWPORT };
  }

  setCamera(camera: Partial<CameraState>): void {
    this.camera = { ...this.camera, ...camera };
  }

  setViewport(width: number, height: number): void {
    this.viewport = { width, height };
  }

  getCamera(): CameraState {
    return { ...this.camera };
  }

  getViewport(): ViewportSize {
    return { ...this.viewport };
  }

  getTrailTracker(): ProjectileTrailTracker {
    return this.trailTracker;
  }

  updateTrails(projectiles: Projectile[], deltaTime: number): void {
    const aliveIds = new Set(projectiles.map(p => p.id));
    this.trailTracker.clearDeadProjectiles(aliveIds);

    for (const projectile of projectiles) {
      if (projectile.alive) {
        const prevPos = this.previousProjectilePositions.get(projectile.id);
        if (prevPos) {
          this.trailTracker.addPoint(projectile.id, prevPos, Date.now());
        }
        this.previousProjectilePositions.set(projectile.id, { ...projectile.position });
      }
    }

    this.trailTracker.updateTrails(deltaTime);
  }

  private getPathRenderData(path: Path, highlightedSegments?: Set<number>): PathRenderData {
    const points = path.getPoints();
    const segments: PathSegmentRenderData[] = [];

    for (let i = 0; i < points.length - 1; i++) {
      const isHighlighted = highlightedSegments?.has(i) ?? false;
      segments.push({
        start: { ...points[i] },
        end: { ...points[i + 1] },
        color: PATH_COLOR,
        width: PATH_WIDTH,
        isHighlighted,
        highlightColor: PATH_HIGHLIGHT_COLOR,
      });
    }

    return {
      points: points.map(p => ({ ...p })),
      totalLength: path.getTotalLength(),
      segments,
    };
  }

  private getTowerRenderCollection(
    placedTowers: PlacedTower[],
    selectedTowerId: number | null,
    firingTowerIds: Set<number>,
    cooldownProgressMap: Map<number, number>,
    upgradeLevelMap: Map<number, number>,
    totalUpgradeValueMap: Map<number, number>
  ): TowerRenderCollection {
    const towers = placedTowers.map(pt => ({
      ...pt.tower,
      position: { x: pt.x, y: pt.y },
    } as Tower));

    return getTowersRenderData(towers, {
      showRangeForSelected: true,
      selectedTowerId,
      firingTowerIds,
      cooldownProgressMap,
      upgradeLevelMap,
      totalUpgradeValueMap,
    });
  }

  private getEnemyRenderCollection(enemies: Enemy[], timestamp: number = 0): EnemyRenderCollection {
    const enemiesRenderData = enemies.map(enemy => {
      const renderData = getEnemyRenderData(enemy);
      renderData.statusEffects = enemy.statusEffects.map(e => ({
        type: e.type,
        color: e.type === StatusEffectType.Slow ? '#3498DB' : e.type === StatusEffectType.Poison ? '#9B59B6' : '#F39C12',
        icon: e.type === StatusEffectType.Slow ? 'snowflake' : e.type === StatusEffectType.Poison ? 'skull' : 'lightning',
        intensity: e.strength,
        remainingDuration: e.remaining,
      }));
      return renderData;
    });
    return {
      enemies: enemiesRenderData,
      totalCount: enemiesRenderData.length,
      aliveCount: enemiesRenderData.filter(e => e.isAlive).length,
      camoCount: enemiesRenderData.filter(e => e.isCamo).length,
      enemyTypeInfo: new Map(),
    };
  }

  private getProjectileRenderDataList(
    projectiles: Projectile[],
    previousPositions: Map<number, Vec2>
  ): ProjectileRenderData[] {
    return getProjectilesRenderData(projectiles, previousPositions, this.trailTracker);
  }

  render(game: GameRunner, timestamp: number = 0): GameFrameRenderData {
    const deltaTime = 16;
    const state = game.getState();
    const placementState = game.getPlacementState();

    const path = game.getPath();
    const pathRenderData = this.getPathRenderData(path);

    const placedTowers = game.getPlacedTowers();
    const selectedTowerId = game.getSelectedTowerId();
    const activeEnemies = game.getActiveEnemies();
    const activeProjectiles = game.getActiveProjectiles();

    const firingTowerIds = new Set<number>();
    const cooldownProgressMap = new Map<number, number>();
    const upgradeLevelMap = new Map<number, number>();
    const totalUpgradeValueMap = new Map<number, number>();

    for (const pt of placedTowers) {
      const tower = pt.tower;
      firingTowerIds.add(tower.id);
      cooldownProgressMap.set(tower.id, tower.lastFireTime > 0 ? 0.5 : 1.0);
      
      let totalUpgrades = 0;
      for (const path of [UpgradePath.Damage, UpgradePath.Range, UpgradePath.FireRate, UpgradePath.Special]) {
        totalUpgrades += tower.upgradeLevels[path];
      }
      upgradeLevelMap.set(tower.id, totalUpgrades);
      totalUpgradeValueMap.set(tower.id, totalUpgrades * 50);
    }

    const towerCollection = this.getTowerRenderCollection(
      placedTowers,
      selectedTowerId,
      firingTowerIds,
      cooldownProgressMap,
      upgradeLevelMap,
      totalUpgradeValueMap
    );

    const enemyCollection = this.getEnemyRenderCollection(activeEnemies, timestamp);

    const projectileRenderData = this.getProjectileRenderDataList(
      activeProjectiles,
      this.previousProjectilePositions
    );

    this.updateTrails(activeProjectiles, deltaTime);

    const placementPreview = game.getPlacementPreviewRenderData(timestamp);
    const towerSelection = game.getTowerSelectionPreviewRenderData();

    const healthBarsData = game.getHealthBarsRenderData();
    const waveAnnouncement = game.getWaveAnnouncementRenderData();
    const pauseMenu = game.getPauseMenuRenderData();
    const waveProgress = game.getWaveProgressRenderData();
    const gameOverVictory = game.getGameOverVictoryRenderData();
    const towerInfoPanel = game.getTowerInfoPanelRenderData();
    const livesMoneyDisplay = game.getLivesMoneyDisplayRenderData();
    const enemyCountDisplay = game.getEnemyCountDisplayRenderData();

    const targetingModeButtons = this.getTargetingModeButtons(game);
    const sellButton = this.getSellButton(game);
    const towerPurchase = this.getTowerPurchaseRenderData(game);
    const mapSelection = game.getMapSelectionRenderData();

    return {
      timestamp,
      deltaTime,
      gameState: state,
      placementState,
      path: pathRenderData,
      towers: towerCollection,
      enemies: enemyCollection,
      projectiles: projectileRenderData,
      placementPreview,
      towerSelection,
      healthBars: healthBarsData.healthBars,
      waveAnnouncement,
      pauseMenu,
      waveProgress,
      gameOverVictory,
      towerInfoPanel,
      livesMoneyDisplay,
      enemyCountDisplay,
      targetingModeButtons,
      sellButton,
      towerPurchase,
      mapSelection,
      camera: this.getCamera(),
      viewport: this.getViewport(),
    };
  }

  private getTargetingModeButtons(game: GameRunner): TargetingModeButtonRenderData[] {
    const placementState = game.getPlacementState();
    if (placementState !== PlacementState.Placing) {
      return [];
    }

    const position = game.getPlacementPosition();
    if (!position) {
      return [];
    }

    const selectedMode = game.getSelectedTargetingMode();
    const modes = [TargetingMode.First, TargetingMode.Last, TargetingMode.Close, TargetingMode.Strong];
    const colors: Record<TargetingMode, string> = {
      [TargetingMode.First]: '#E74C3C',
      [TargetingMode.Last]: '#3498DB',
      [TargetingMode.Close]: '#F39C12',
      [TargetingMode.Strong]: '#9B59B6',
    };
    const labels: Record<TargetingMode, string> = {
      [TargetingMode.First]: 'First',
      [TargetingMode.Last]: 'Last',
      [TargetingMode.Close]: 'Close',
      [TargetingMode.Strong]: 'Strong',
    };

    const BUTTON_WIDTH = 60;
    const BUTTON_HEIGHT = 40;
    const BUTTON_SPACING = 8;
    const UI_OFFSET_Y = 80;

    const totalWidth = modes.length * BUTTON_WIDTH + (modes.length - 1) * BUTTON_SPACING;
    const startX = position.x - totalWidth / 2;
    const y = position.y + UI_OFFSET_Y;

    return modes.map((mode, index) => ({
      mode,
      position: { x: startX + index * (BUTTON_WIDTH + BUTTON_SPACING), y },
      size: { width: BUTTON_WIDTH, height: BUTTON_HEIGHT },
      isSelected: mode === selectedMode,
      label: labels[mode],
      color: colors[mode],
    }));
  }

  private getSellButton(game: GameRunner): SellButtonRenderData | null {
    const placementState = game.getPlacementState();
    if (placementState !== PlacementState.Selecting) {
      return null;
    }

    const selectedTowerId = game.getSelectedTowerId();
    if (selectedTowerId === null) {
      return null;
    }

    const placedTowers = game.getPlacedTowers();
    const placed = placedTowers.find(pt => pt.tower.id === selectedTowerId);
    if (!placed) {
      return null;
    }

    return {
      position: { x: placed.x + 40, y: placed.y - 60 },
      size: { width: 80, height: 36 },
      sellValue: getTotalSellValue(placed.tower),
      isHovered: false,
    };
  }

  private getTowerPurchaseRenderData(game: GameRunner): TowerPurchaseRenderData | null {
    const placementState = game.getPlacementState();
    const isPlacing = placementState === PlacementState.Placing;
    
    const selectedTowerType = game.getSelectedTowerType();
    const economy = game.getEconomy();
    const currentMoney = economy.getMoney();
    
    const canAffordFn = (towerType: TowerType): boolean => {
      return economy.canAfford(TOWER_STATS[towerType].cost);
    };
    
    return getTowerPurchaseRenderData(
      isPlacing,
      selectedTowerType,
      currentMoney,
      canAffordFn
    );
  }

  screenToWorld(screenX: number, screenY: number): Vec2 {
    return {
      x: (screenX - this.viewport.width / 2) / this.camera.zoom + this.camera.x,
      y: (screenY - this.viewport.height / 2) / this.camera.zoom + this.camera.y,
    };
  }

  worldToScreen(worldX: number, worldY: number): Vec2 {
    return {
      x: (worldX - this.camera.x) * this.camera.zoom + this.viewport.width / 2,
      y: (worldY - this.camera.y) * this.camera.zoom + this.viewport.height / 2,
    };
  }
}

export function createGameRenderer(): GameRenderer {
  return new GameRenderer();
}

export function createRenderDataFromGame(game: GameRunner, renderer: GameRenderer, timestamp: number = 0): GameFrameRenderData {
  return renderer.render(game, timestamp);
}
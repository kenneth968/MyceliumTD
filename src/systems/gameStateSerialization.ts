import { GameRunner, GameState, GameSpeed, PlacementState, PlacedTower } from './gameRunner';
import { TowerType, Tower } from '../entities/tower';
import { Enemy, StatusEffect, StatusEffectType } from '../entities/enemy';
import { TargetingMode } from './targeting';
import { RoundState } from './roundManager';

export interface SerializedStatusEffect {
  type: StatusEffectType;
  duration: number;
  remaining: number;
  strength: number;
}

export interface SerializedEnemy {
  id: number;
  enemyType: string;
  position: { x: number; y: number };
  hp: number;
  maxHp: number;
  pathProgress: number;
  pathDistance: number;
  speed: number;
  baseSpeed: number;
  reward: number;
  alive: boolean;
  statusEffects: SerializedStatusEffect[];
  hasReachedEnd: boolean;
}

export interface SerializedProjectile {
  id: number;
  position: { x: number; y: number };
  targetId: number;
  speed: number;
  damage: number;
  towerType: string;
  alive: boolean;
  effectStrength?: number;
  effectDuration?: number;
  areaRadius?: number;
}

export interface SerializedTowerUpgrades {
  damage: number;
  range: number;
  fireRate: number;
  special: number;
  cumulativeValue: number;
  effectStrength?: number;
  effectDuration?: number;
  areaRadius?: number;
}

export interface SerializedPlacedTower {
  tower: {
    towerType: string;
    damage: number;
    fireRate: number;
    fireTimer: number;
    cost: number;
    range: number;
    targetingMode: TargetingMode;
    upgrades: SerializedTowerUpgrades;
    totalUpgradeCost: number;
    effectStrength?: number;
    effectDuration?: number;
    areaRadius?: number;
  };
  x: number;
  y: number;
}

export interface SerializedEconomy {
  money: number;
  lives: number;
  lastInterestTime: number;
  roundsCompleted: number;
  totalEarned: number;
  totalSpent: number;
}

export interface SerializedRoundManager {
  state: RoundState;
  roundNumber: number;
  stateStartTime: number;
  intermissionStartTime: number;
  pendingWaveIndex: number | null;
}

export interface SerializedWaveSpawner {
  currentWaveIndex: number;
  currentGroupIndex: number;
  groupSpawnedCount: number;
  lastSpawnTime: number;
  isWaveActive: boolean;
}

export interface SerializedGameState {
  version: string;
  timestamp: number;
  state: GameState;
  currentTime: number;
  gameSpeed: GameSpeed;
  placementState: PlacementState;
  placementPosition: { x: number; y: number } | null;
  selectedTowerType: TowerType | null;
  selectedTowerId: number | null;
  selectedTargetingMode: TargetingMode;
  nextTowerId: number;
  nextEnemyId: number;
  nextProjectileId: number;
  economy: SerializedEconomy;
  placedTowers: SerializedPlacedTower[];
  activeEnemies: SerializedEnemy[];
  activeProjectiles: SerializedProjectile[];
  roundManager: SerializedRoundManager;
  waveSpawner: SerializedWaveSpawner;
}

export function serializeEnemy(enemy: Enemy): SerializedEnemy {
  return {
    id: enemy.id,
    enemyType: enemy.enemyType.toString(),
    position: { x: enemy.position.x, y: enemy.position.y },
    hp: enemy.hp,
    maxHp: enemy.maxHp,
    pathProgress: enemy.pathProgress,
    pathDistance: enemy.pathDistance,
    speed: enemy.speed,
    baseSpeed: enemy.baseSpeed,
    reward: enemy.reward,
    alive: enemy.alive,
    statusEffects: enemy.statusEffects.map(e => ({
      type: e.type,
      duration: e.duration,
      remaining: e.remaining,
      strength: e.strength,
    })),
    hasReachedEnd: enemy.hasReachedEnd,
  };
}

export function serializeProjectile(projectile: any): SerializedProjectile {
  return {
    id: projectile.id,
    position: { x: projectile.position.x, y: projectile.position.y },
    targetId: projectile.targetId,
    speed: projectile.speed,
    damage: projectile.damage,
    towerType: projectile.towerType.toString(),
    alive: projectile.alive,
    effectStrength: projectile.effectStrength,
    effectDuration: projectile.effectDuration,
    areaRadius: projectile.areaRadius,
  };
}

export function serializeTowerUpgrades(upgrades: any): SerializedTowerUpgrades {
  return {
    damage: upgrades.damage,
    range: upgrades.range,
    fireRate: upgrades.fireRate,
    special: upgrades.special,
    cumulativeValue: upgrades.cumulativeValue,
    effectStrength: upgrades.effectStrength,
    effectDuration: upgrades.effectDuration,
    areaRadius: upgrades.areaRadius,
  };
}

export function serializePlacedTower(pt: PlacedTower): SerializedPlacedTower {
  return {
    tower: {
      towerType: pt.tower.towerType.toString(),
      damage: pt.tower.damage,
      fireRate: pt.tower.fireRate,
      fireTimer: pt.tower.fireTimer,
      cost: pt.tower.cost,
      range: pt.tower.range,
      targetingMode: pt.tower.targetingMode,
      upgrades: serializeTowerUpgrades(pt.tower.upgrades),
      totalUpgradeCost: pt.tower.totalUpgradeCost,
      effectStrength: pt.tower.effectStrength,
      effectDuration: pt.tower.effectDuration,
      areaRadius: pt.tower.areaRadius,
    },
    x: pt.x,
    y: pt.y,
  };
}

export function serializeEconomy(economy: any): SerializedEconomy {
  return {
    money: economy.getMoney(),
    lives: economy.getLives(),
    lastInterestTime: economy.lastInterestTime,
    roundsCompleted: economy.getRoundsCompleted(),
    totalEarned: economy.getTotalEarned(),
    totalSpent: economy.getTotalSpent(),
  };
}

export function serializeRoundManager(rm: any): SerializedRoundManager {
  return {
    state: rm.getState(),
    roundNumber: rm.getRoundNumber(),
    stateStartTime: rm.stateStartTime,
    intermissionStartTime: rm.intermissionStartTime,
    pendingWaveIndex: rm.pendingWaveIndex,
  };
}

export function serializeWaveSpawner(ws: any): SerializedWaveSpawner {
  return {
    currentWaveIndex: ws.getCurrentWaveIndex(),
    currentGroupIndex: ws.currentGroupIndex,
    groupSpawnedCount: ws.enemiesInCurrentGroup,
    lastSpawnTime: ws.waveStartTime,
    isWaveActive: ws.isWaveActive(),
  };
}

export function serializeGameState(gameRunner: GameRunner): SerializedGameState {
  return {
    version: '1.0.0',
    timestamp: Date.now(),
    state: gameRunner.getState(),
    currentTime: (gameRunner as any).currentTime,
    gameSpeed: gameRunner.getGameSpeed(),
    placementState: (gameRunner as any).placementState,
    placementPosition: (gameRunner as any).placementPosition,
    selectedTowerType: gameRunner.getSelectedTowerType(),
    selectedTowerId: gameRunner.getSelectedTowerId(),
    selectedTargetingMode: gameRunner.getSelectedTargetingMode(),
    nextTowerId: (gameRunner as any).nextTowerId,
    nextEnemyId: (gameRunner as any).nextEnemyId,
    nextProjectileId: (gameRunner as any).nextProjectileId,
    economy: serializeEconomy(gameRunner.getEconomy()),
    placedTowers: gameRunner.getPlacedTowers().map(serializePlacedTower),
    activeEnemies: gameRunner.getActiveEnemies().map(serializeEnemy),
    activeProjectiles: gameRunner.getActiveProjectiles().map(serializeProjectile),
    roundManager: serializeRoundManager(gameRunner.getRoundManager()),
    waveSpawner: serializeWaveSpawner(gameRunner.getWaveSpawner()),
  };
}

export function serializeGameStateToString(gameRunner: GameRunner): string {
  return JSON.stringify(serializeGameState(gameRunner));
}

export function getSerializedGameStateSize(gameRunner: GameRunner): number {
  const json = serializeGameStateToString(gameRunner);
  return json.length;
}

export function deserializeStatusEffect(data: SerializedStatusEffect): StatusEffect {
  return {
    type: data.type as StatusEffectType,
    duration: data.duration,
    remaining: data.remaining,
    strength: data.strength,
  };
}

export function deserializeEnemy(data: SerializedEnemy): Enemy {
  return {
    id: data.id,
    enemyType: data.enemyType as any,
    position: { x: data.position.x, y: data.position.y },
    hp: data.hp,
    maxHp: data.maxHp,
    pathProgress: data.pathProgress,
    pathDistance: data.pathDistance,
    speed: data.speed,
    baseSpeed: data.baseSpeed,
    reward: data.reward,
    alive: data.alive,
    statusEffects: data.statusEffects.map(deserializeStatusEffect),
    hasReachedEnd: data.hasReachedEnd,
  };
}

export function deserializeProjectile(data: SerializedProjectile): any {
  return {
    id: data.id,
    position: { x: data.position.x, y: data.position.y },
    targetId: data.targetId,
    speed: data.speed,
    damage: data.damage,
    towerType: data.towerType as TowerType,
    alive: data.alive,
    effectStrength: data.effectStrength,
    effectDuration: data.effectDuration,
    areaRadius: data.areaRadius,
  };
}

export function deserializeTowerUpgrades(data: SerializedTowerUpgrades): any {
  return {
    damage: data.damage,
    range: data.range,
    fireRate: data.fireRate,
    special: data.special,
    cumulativeValue: data.cumulativeValue,
    effectStrength: data.effectStrength,
    effectDuration: data.effectDuration,
    areaRadius: data.areaRadius,
  };
}

export function deserializePlacedTower(data: SerializedPlacedTower): PlacedTower {
  return {
    tower: {
      towerType: data.tower.towerType as TowerType,
      damage: data.tower.damage,
      fireRate: data.tower.fireRate,
      fireTimer: data.tower.fireTimer,
      cost: data.tower.cost,
      range: data.tower.range,
      targetingMode: data.tower.targetingMode as TargetingMode,
      upgrades: deserializeTowerUpgrades(data.tower.upgrades),
      totalUpgradeCost: data.tower.totalUpgradeCost,
      effectStrength: data.tower.effectStrength,
      effectDuration: data.tower.effectDuration,
      areaRadius: data.tower.areaRadius,
    } as any,
    x: data.x,
    y: data.y,
  };
}

export function deserializeEconomy(data: SerializedEconomy): any {
  return {
    money: data.money,
    lives: data.lives,
    lastInterestTime: data.lastInterestTime,
    roundsCompleted: data.roundsCompleted,
    totalEarned: data.totalEarned,
    totalSpent: data.totalSpent,
  };
}

export function parseGameState(jsonString: string): SerializedGameState | null {
  try {
    const data = JSON.parse(jsonString);
    if (!data.version || !data.state) {
      return null;
    }
    return data as SerializedGameState;
  } catch {
    return null;
  }
}
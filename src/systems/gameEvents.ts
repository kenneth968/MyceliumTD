import type { EvolutionEffect, EvolutionPath } from '../content/evolutionDefinitions';
import type { EnemyTrait } from '../entities/enemy';
import type { TowerType } from '../entities/tower';
import type { Vec2 } from '../utils/vec2';
import type { EnemyType } from './wave';

type ImpactEvent = Readonly<{
  type: 'hit' | 'area_hit';
  timestamp: number;
  position: Vec2;
  towerType?: TowerType;
  enemyType?: EnemyType;
  enemyColor?: string;
  radius?: number;
  effectType?: string;
  blockedByShield?: boolean;
}> | Readonly<{
  type: 'death';
  timestamp: number;
  position: Vec2;
  enemyId: number;
  enemyType?: EnemyType;
  enemyColor?: string;
}>;

export type GameEvent =
  | ImpactEvent
  | Readonly<{
      type: 'tower_placed';
      timestamp: number;
      position: Vec2;
      towerId: number;
      towerType: TowerType;
    }>
  | Readonly<{
      type: 'network_connection_created';
      timestamp: number;
      position: Vec2;
      towerId: number;
      sourceTowerId: number | null;
    }>
  | Readonly<{
      type: 'tower_matured';
      timestamp: number;
      towerId: number;
      towerType: TowerType;
    }>
  | Readonly<{
      type: 'tower_evolved';
      timestamp: number;
      towerId: number;
      towerType: TowerType;
      path: EvolutionPath;
      effect: EvolutionEffect;
    }>
  | Readonly<{
      type: 'layer_broken';
      timestamp: number;
      position: Vec2;
      enemyId: number;
      enemyType: EnemyType;
      layersBroken: number;
    }>
  | Readonly<{
      type: 'enemy_marked' | 'enemy_slowed' | 'enemy_revealed';
      timestamp: number;
      position: Vec2;
      enemyId: number;
    }>
  | Readonly<{
      type: 'trait_suppressed';
      timestamp: number;
      position: Vec2;
      enemyId: number;
      trait: EnemyTrait;
    }>
  | Readonly<{
      type: 'network_triggered';
      timestamp: number;
      sourceTowerId: number | null;
      targetTowerId: number;
    }>
  | Readonly<{
      type: 'trait_broken';
      timestamp: number;
      position: Vec2;
      enemyId: number;
      trait: EnemyTrait;
    }>
  | Readonly<{
      type: 'seeded_payload_detonated';
      timestamp: number;
      position: Vec2;
      sourceTowerId: number;
      targetEnemyId: number;
    }>
  | Readonly<{ type: 'wave_started'; timestamp: number; waveNumber: number }>
  | Readonly<{
      type: 'enemy_leaked';
      timestamp: number;
      position: Vec2;
      enemyId: number;
      enemyType: EnemyType;
      waveNumber: number;
    }>
  | Readonly<{
      type: 'wave_completed';
      timestamp: number;
      waveNumber: number;
      completion: number;
      perfect: number;
      total: number;
    }>
  | Readonly<{
      type: 'victory' | 'defeat';
      timestamp: number;
      waveNumber: number;
    }>;

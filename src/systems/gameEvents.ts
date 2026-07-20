import type { EvolutionEffect, EvolutionPath } from '../content/evolutionDefinitions';
import type { EnemyTrait } from '../entities/enemy';
import type { TowerType } from '../entities/tower';
import type { Vec2 } from '../utils/vec2';
import type { EnemyType } from './wave';

type ImpactEvent = Readonly<{
  type: 'hit' | 'death' | 'area_hit';
  timestamp: number;
  position: Vec2;
  towerType?: TowerType;
  enemyType?: EnemyType;
  enemyColor?: string;
  radius?: number;
  effectType?: string;
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

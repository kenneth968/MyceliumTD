export enum TowerType {
  Sporecap = 'sporecap',
  ThornSniper = 'thorn_sniper',
  Puffball = 'puffball',
  Slimefungus = 'slimefungus',
  BulbShooter = 'bulb_shooter',
  LumenOracle = 'lumen_oracle',
}

export enum TowerRole {
  Generalist = 'generalist',
  Precision = 'precision',
  Area = 'area',
  Control = 'control',
  Burst = 'burst',
  Support = 'support',
}

export interface TowerDefinition {
  type: TowerType;
  displayName: string;
  role: TowerRole;
  description: string;
  damage: number;
  range: number;
  fireRate: number;
  cost: number;
  projectileSpeed: number;
  specialEffect: string;
}

export const TOWER_DEFINITIONS: Record<TowerType, TowerDefinition> = {
  [TowerType.Sporecap]: { type: TowerType.Sporecap, displayName: 'Sporecap', role: TowerRole.Generalist, description: 'Fast, dependable fungal defence', damage: 1, range: 100, fireRate: 550, cost: 100, projectileSpeed: 220, specialEffect: 'none' },
  [TowerType.ThornSniper]: { type: TowerType.ThornSniper, displayName: 'Thorn Sniper', role: TowerRole.Precision, description: 'Long-range single-target damage', damage: 4, range: 190, fireRate: 1600, cost: 320, projectileSpeed: 280, specialEffect: 'precision' },
  [TowerType.Puffball]: { type: TowerType.Puffball, displayName: 'Puffball', role: TowerRole.Area, description: 'Spore clouds clear dense swarms', damage: 2, range: 95, fireRate: 900, cost: 180, projectileSpeed: 170, specialEffect: 'area_damage' },
  [TowerType.Slimefungus]: { type: TowerType.Slimefungus, displayName: 'Slimefungus', role: TowerRole.Control, description: 'Slows and weakens dangerous insects', damage: 1, range: 110, fireRate: 850, cost: 160, projectileSpeed: 150, specialEffect: 'slow' },
  [TowerType.BulbShooter]: { type: TowerType.BulbShooter, displayName: 'Bulb Shooter', role: TowerRole.Burst, description: 'Explosive damage against clustered threats', damage: 3, range: 115, fireRate: 1200, cost: 260, projectileSpeed: 140, specialEffect: 'area_damage' },
  [TowerType.LumenOracle]: { type: TowerType.LumenOracle, displayName: 'Lumen Oracle', role: TowerRole.Support, description: 'Detects hidden enemies and supports the network', damage: 1, range: 130, fireRate: 700, cost: 220, projectileSpeed: 190, specialEffect: 'detection' },
};

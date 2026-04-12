import { Vec2, vec2Distance } from '../utils/vec2';
import { Path } from '../systems/path';
import { Enemy, Tower as TowerBase, TargetingMode, getTarget, getEnemiesInRange } from '../systems/targeting';
import { EnemyType, ENEMY_STATS } from '../systems/wave';

export enum TowerType {
  PuffballFungus = 'puffball_fungus',
  OrchidTrap = 'orchid_trap',
  VenusFlytower = 'venus_flytower',
  BioluminescentShroom = 'bioluminescent_shroom',
  StinkhornLine = 'stinkhorn_line',
  MyceliumNetwork = 'mycelium_network',
}

export interface TowerStats {
  type: TowerType;
  damage: number;
  range: number;
  fireRate: number;
  cost: number;
  projectileSpeed?: number;
  specialEffect?: string;
}

export const TOWER_STATS: Record<TowerType, TowerStats> = {
  [TowerType.PuffballFungus]: {
    type: TowerType.PuffballFungus,
    damage: 1,
    range: 80,
    fireRate: 500,
    cost: 100,
    projectileSpeed: 200,
    specialEffect: 'area_damage',
  },
  [TowerType.OrchidTrap]: {
    type: TowerType.OrchidTrap,
    damage: 2,
    range: 100,
    fireRate: 800,
    cost: 150,
    projectileSpeed: 150,
    specialEffect: 'slow',
  },
  [TowerType.VenusFlytower]: {
    type: TowerType.VenusFlytower,
    damage: 100,
    range: 50,
    fireRate: 3000,
    cost: 500,
    projectileSpeed: 0,
    specialEffect: 'instakill',
  },
  [TowerType.BioluminescentShroom]: {
    type: TowerType.BioluminescentShroom,
    damage: 1,
    range: 120,
    fireRate: 600,
    cost: 200,
    projectileSpeed: 180,
    specialEffect: 'reveal_camo',
  },
  [TowerType.StinkhornLine]: {
    type: TowerType.StinkhornLine,
    damage: 3,
    range: 90,
    fireRate: 400,
    cost: 250,
    projectileSpeed: 120,
    specialEffect: 'poison',
  },
  [TowerType.MyceliumNetwork]: {
    type: TowerType.MyceliumNetwork,
    damage: 0,
    range: 100,
    fireRate: 0,
    cost: 350,
    projectileSpeed: 0,
    specialEffect: 'network_buff',
  },
};

export interface Projectile {
  id: number;
  position: Vec2;
  targetId: number;
  speed: number;
  damage: number;
  towerType: TowerType;
  alive: boolean;
  effectStrength?: number;
  effectDuration?: number;
  areaRadius?: number;
}

export interface Tower extends TowerBase {
  towerType: TowerType;
  damage: number;
  fireRate: number;
  fireTimer: number;
  cost: number;
  lastFireTime: number;
  projectileSpeed: number;
  specialEffect?: string;
}

export function createTower(
  id: number,
  x: number,
  y: number,
  towerType: TowerType = TowerType.PuffballFungus,
  targetingMode: TargetingMode = TargetingMode.First
): Tower {
  const stats = TOWER_STATS[towerType];
  return {
    id,
    position: { x, y },
    range: stats.range,
    targetingMode,
    towerType,
    damage: stats.damage,
    fireRate: stats.fireRate,
    fireTimer: 0,
    cost: stats.cost,
    lastFireTime: 0,
    projectileSpeed: stats.projectileSpeed ?? 200,
    specialEffect: stats.specialEffect,
  };
}

export function canFire(tower: Tower, currentTime: number): boolean {
  return currentTime - tower.lastFireTime >= tower.fireRate;
}

export function getCooldownProgress(tower: Tower, currentTime: number): number {
  const elapsed = currentTime - tower.lastFireTime;
  return Math.min(elapsed / tower.fireRate, 1.0);
}

export function fireTower(
  tower: Tower,
  enemies: Enemy[],
  path: Path,
  currentTime: number,
  effectStrength?: number,
  effectDuration?: number,
  areaRadius?: number
): { projectile: Projectile | null; target: Enemy | null } {
  if (!canFire(tower, currentTime)) {
    return { projectile: null, target: null };
  }

  const result = getTarget(tower, enemies, path);
  if (!result.target) {
    return { projectile: null, target: null };
  }

  tower.lastFireTime = currentTime;

  const projectile: Projectile = {
    id: 0,
    position: { ...tower.position },
    targetId: result.target.id,
    speed: tower.projectileSpeed,
    damage: tower.damage,
    towerType: tower.towerType,
    alive: true,
    effectStrength,
    effectDuration,
    areaRadius,
  };

  return { projectile, target: result.target };
}

let nextProjectileId = 1;

export function fireTowerWithProjectile(
  tower: Tower,
  enemies: Enemy[],
  path: Path,
  currentTime: number,
  effectStrength?: number,
  effectDuration?: number,
  areaRadius?: number
): Projectile | null {
  const result = fireTower(tower, enemies, path, currentTime, effectStrength, effectDuration, areaRadius);
  if (!result.projectile) {
    return null;
  }

  result.projectile.id = nextProjectileId++;
  return result.projectile;
}

export function updateProjectile(
  projectile: Projectile,
  enemies: Enemy[],
  deltaTime: number
): { hit: boolean; damage: number; target: Enemy | null } {
  if (!projectile.alive) {
    return { hit: false, damage: 0, target: null };
  }

  const target = enemies.find(e => e.id === projectile.targetId && e.alive && e.hp > 0);

  if (!target) {
    projectile.alive = false;
    return { hit: false, damage: 0, target: null };
  }

  const dx = target.position.x - projectile.position.x;
  const dy = target.position.y - projectile.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 5) {
    projectile.alive = false;
    return { hit: true, damage: projectile.damage, target };
  }

  const moveDistance = projectile.speed * (deltaTime / 1000);
  if (moveDistance >= dist) {
    projectile.position = { ...target.position };
    projectile.alive = false;
    return { hit: true, damage: projectile.damage, target };
  }

  const ratio = moveDistance / dist;
  projectile.position.x += dx * ratio;
  projectile.position.y += dy * ratio;

  return { hit: false, damage: 0, target: null };
}

export function applyDamage(enemy: Enemy, damage: number): boolean {
  if (!enemy.alive || enemy.hp <= 0) {
    return false;
  }

  enemy.hp -= damage;
  if (enemy.hp <= 0) {
    enemy.hp = 0;
    enemy.alive = false;
    return true;
  }

  return false;
}

export function getKillReward(enemy: Enemy): number {
  const entry = Object.entries(ENEMY_STATS).find(([, stats]) => stats.hp === enemy.maxHp);
  return entry ? entry[1].reward : 0;
}

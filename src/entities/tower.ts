import { Vec2, vec2Distance } from '../utils/vec2';
import { Path } from '../systems/path';
import { Enemy, Tower as TowerBase, TargetingMode, getTarget, getEnemiesInRange } from '../systems/targeting';
import { EnemyType, ENEMY_STATS } from '../systems/wave';
import { DamageOptions, DamageType, canDamageEnemy, consumeShieldBlock, getMarkedAdjustedDamage, getTraitAdjustedDamage } from './enemy';
import { TOWER_DEFINITIONS, TowerType } from '../content/towerDefinitions';

export { TowerDefinition as TowerStats, TowerType } from '../content/towerDefinitions';
export const TOWER_STATS = TOWER_DEFINITIONS;

export interface Projectile {
  id: number;
  position: Vec2;
  targetId: number;
  sourceTowerId?: number;
  speed: number;
  damage: number;
  towerType: TowerType;
  alive: boolean;
  effectStrength?: number;
  effectDuration?: number;
  areaRadius?: number;
  extraHitEffects?: ProjectileHitEffect[];
}

export interface ProjectileHitEffect {
  type: 'damage' | 'slow' | 'poison' | 'stun' | 'area_damage' | 'instakill' | 'reveal_camo';
  strength: number;
  duration?: number;
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
  towerType: TowerType = TowerType.Sporecap,
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
    sourceTowerId: tower.id,
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

  if (projectile.speed <= 0) {
    projectile.position = { ...target.position };
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

export function applyDamage(enemy: Enemy, damage: number, options: DamageOptions = {}): boolean {
  if (!enemy.alive || enemy.hp <= 0) {
    return false;
  }
  if (consumeShieldBlock(enemy)) {
    return false;
  }
  if (!canDamageEnemy(enemy, options)) {
    return false;
  }

  const markedDamage = getMarkedAdjustedDamage(enemy, damage, options);
  enemy.hp -= getTraitAdjustedDamage(enemy, markedDamage);
  if (enemy.hp <= 0) {
    enemy.hp = 0;
    enemy.alive = false;
    return true;
  }

  return false;
}

export function getTowerDamageType(towerType: TowerType): DamageType {
  switch (towerType) {
    case TowerType.Puffball:
      return DamageType.Explosive;
    default:
      return DamageType.Normal;
  }
}

export function getKillReward(enemy: Enemy): number {
  const entry = Object.entries(ENEMY_STATS).find(([, stats]) => stats.hp === enemy.maxHp);
  return entry ? entry[1].reward : 0;
}

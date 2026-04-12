import { Vec2, vec2Distance } from '../utils/vec2';
import { Path } from '../systems/path';
import { EnemyType, ENEMY_STATS } from '../systems/wave';

export interface StatusEffect {
  type: StatusEffectType;
  duration: number;
  remaining: number;
  strength: number;
}

export enum StatusEffectType {
  Slow = 'slow',
  Poison = 'poison',
  Stun = 'stun',
}

export interface Enemy {
  id: number;
  enemyType: EnemyType;
  position: Vec2;
  hp: number;
  maxHp: number;
  pathProgress: number;
  pathDistance: number;
  speed: number;
  baseSpeed: number;
  reward: number;
  alive: boolean;
  statusEffects: StatusEffect[];
  hasReachedEnd: boolean;
}

export function createEnemy(
  id: number,
  enemyType: EnemyType,
  path: Path
): Enemy {
  const stats = ENEMY_STATS[enemyType];
  const startPoint = path.getPointAtDistance(0);

  return {
    id,
    enemyType,
    position: { ...startPoint.position },
    hp: stats.hp,
    maxHp: stats.hp,
    pathProgress: 0,
    pathDistance: 0,
    speed: stats.speed,
    baseSpeed: stats.speed,
    reward: stats.reward,
    alive: true,
    statusEffects: [],
    hasReachedEnd: false,
  };
}

export function updateEnemyPosition(
  enemy: Enemy,
  path: Path,
  deltaTime: number
): void {
  if (!enemy.alive || enemy.hasReachedEnd) return;

  let effectiveSpeed = enemy.speed;

  for (const effect of enemy.statusEffects) {
    if (effect.type === StatusEffectType.Slow) {
      effectiveSpeed *= (1 - effect.strength);
    }
  }

  const moveDistance = effectiveSpeed * (deltaTime / 1000);
  enemy.pathDistance += moveDistance;
  enemy.pathProgress = enemy.pathDistance;

  const pathLength = path.getTotalLength();
  if (enemy.pathDistance >= pathLength) {
    enemy.pathDistance = pathLength;
    enemy.hasReachedEnd = true;
    enemy.alive = false;
  }

  const point = path.getPointAtDistance(enemy.pathDistance);
  enemy.position = { ...point.position };
}

export function applyStatusEffect(
  enemy: Enemy,
  effectType: StatusEffectType,
  duration: number,
  strength: number
): void {
  if (!enemy.alive) return;

  const existing = enemy.statusEffects.find(e => e.type === effectType);
  if (existing) {
    existing.remaining = duration;
    existing.strength = Math.max(existing.strength, strength);
  } else {
    enemy.statusEffects.push({
      type: effectType,
      duration,
      remaining: duration,
      strength,
    });
  }
}

export function updateStatusEffects(enemy: Enemy, deltaTime: number): void {
  for (let i = enemy.statusEffects.length - 1; i >= 0; i--) {
    const effect = enemy.statusEffects[i];
    effect.remaining -= deltaTime;
    if (effect.remaining <= 0) {
      enemy.statusEffects.splice(i, 1);
    }
  }
}

export function processPoisonDamage(enemy: Enemy, deltaTime: number): number {
  let totalDamage = 0;
  for (const effect of enemy.statusEffects) {
    if (effect.type === StatusEffectType.Poison) {
      totalDamage += effect.strength * (deltaTime / 1000);
    }
  }
  return totalDamage;
}

export function applyDamageToEnemy(enemy: Enemy, damage: number): boolean {
  if (!enemy.alive || enemy.hp <= 0) return false;

  enemy.hp -= damage;
  if (enemy.hp <= 0) {
    enemy.hp = 0;
    enemy.alive = false;
    return true;
  }
  return false;
}

export function getEnemyProgressRatio(enemy: Enemy, path: Path): number {
  return enemy.pathDistance / path.getTotalLength();
}

export function isEnemyInRange(enemy: Enemy, position: Vec2, range: number): boolean {
  if (!enemy.alive) return false;
  return vec2Distance(enemy.position, position) <= range;
}

export function getReward(enemy: Enemy): number {
  return enemy.reward;
}

export function getHealthPercent(enemy: Enemy): number {
  return enemy.hp / enemy.maxHp;
}

export function isCamo(enemy: Enemy): boolean {
  return enemy.enemyType === EnemyType.WhiteMoth || enemy.enemyType === EnemyType.BlackWidow;
}

export function hasStatusEffect(enemy: Enemy, effectType: StatusEffectType): boolean {
  return enemy.statusEffects.some(e => e.type === effectType);
}

export function clearStatusEffects(enemy: Enemy): void {
  enemy.statusEffects = [];
}

export function createEnemyFromStats(
  id: number,
  enemyType: EnemyType,
  path: Path
): Enemy {
  return createEnemy(id, enemyType, path);
}

export function respawnEnemy(enemy: Enemy, path: Path): void {
  const startPoint = path.getPointAtDistance(0);
  enemy.position = { ...startPoint.position };
  enemy.hp = enemy.maxHp;
  enemy.pathDistance = 0;
  enemy.pathProgress = 0;
  enemy.speed = enemy.baseSpeed;
  enemy.alive = true;
  enemy.hasReachedEnd = false;
  enemy.statusEffects = [];
}

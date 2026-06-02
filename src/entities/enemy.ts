import { Vec2, vec2Distance } from '../utils/vec2';
import { Path } from '../systems/path';
import { EnemyType, ENEMY_STATS } from '../systems/wave';

export interface StatusEffect {
  type: StatusEffectType;
  duration: number;
  remaining: number;
  strength: number;
  disruptedTrait?: EnemyTrait;
}

export enum StatusEffectType {
  Slow = 'slow',
  Poison = 'poison',
  Stun = 'stun',
  Revealed = 'revealed',
  TraitDisrupted = 'trait_disrupted',
}

export enum EnemyTrait {
  Metal = 'metal',
  Camo = 'camo',
  Shielded = 'shielded',
  SwarmLinked = 'swarm_linked',
}

export enum DamageType {
  Normal = 'normal',
  Explosive = 'explosive',
}

export interface DamageOptions {
  damageType?: DamageType | `${DamageType}`;
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
  traits: EnemyTrait[];
  shieldCharges: number;
  swarmLinkedActive: boolean;
  swarmLinkCount: number;
  statusEffects: StatusEffect[];
  hasReachedEnd: boolean;
}

export const SWARM_LINK_RADIUS = 80;
export const SWARM_LINK_THRESHOLD = 3;
export const SWARM_LINK_SPEED_MULTIPLIER = 1.2;
export const SWARM_LINK_DAMAGE_MULTIPLIER = 0.9;
export const TRAIT_DISRUPTION_DURATION = 5000;

type TraitCarrier = {
  enemyType?: EnemyType | string;
  traits?: EnemyTrait[];
  statusEffects?: Array<{
    type: StatusEffectType | string;
    remaining?: number;
    disruptedTrait?: EnemyTrait | string;
  }>;
};

export function getEnemyTraitsForType(enemyType: EnemyType | string | undefined): EnemyTrait[] {
  switch (enemyType) {
    case EnemyType.ArmoredBeetle:
    case EnemyType.ShelledSnail:
      return [EnemyTrait.Metal];
    case EnemyType.WhiteMoth:
    case EnemyType.BlackWidow:
      return [EnemyTrait.Camo];
    case EnemyType.RainbowStag:
      return [EnemyTrait.Shielded];
    case EnemyType.PinkLadybug:
      return [EnemyTrait.SwarmLinked];
    default:
      return [];
  }
}

export function getInitialShieldChargesForType(enemyType: EnemyType | string | undefined): number {
  return getEnemyTraitsForType(enemyType).includes(EnemyTrait.Shielded) ? 1 : 0;
}

export function hasEnemyTrait(
  enemy: TraitCarrier,
  trait: EnemyTrait
): boolean {
  const traits = enemy.traits ?? getEnemyTraitsForType(enemy.enemyType);
  return traits.includes(trait) && !hasDisruptedTrait(enemy, trait);
}

export function hasDisruptedTrait(enemy: TraitCarrier, trait: EnemyTrait): boolean {
  return enemy.statusEffects?.some(effect =>
    effect.type === StatusEffectType.TraitDisrupted &&
    effect.disruptedTrait === trait &&
    (effect.remaining ?? 0) > 0
  ) ?? false;
}

export function isMetal(enemy: TraitCarrier): boolean {
  return hasEnemyTrait(enemy, EnemyTrait.Metal);
}

export function isSwarmLinked(enemy: TraitCarrier): boolean {
  return hasEnemyTrait(enemy, EnemyTrait.SwarmLinked);
}

export function hasActiveShield(
  enemy: TraitCarrier & { shieldCharges?: number }
): boolean {
  return hasEnemyTrait(enemy, EnemyTrait.Shielded) && (enemy.shieldCharges ?? 0) > 0;
}

export function consumeShieldBlock(
  enemy: TraitCarrier & { shieldCharges?: number }
): boolean {
  if (!hasActiveShield(enemy)) {
    return false;
  }

  enemy.shieldCharges = Math.max(0, (enemy.shieldCharges ?? 0) - 1);
  return true;
}

export function getTraitAdjustedDamage(
  enemy: TraitCarrier & { swarmLinkedActive?: boolean },
  damage: number
): number {
  if (isSwarmLinked(enemy) && enemy.swarmLinkedActive === true) {
    return damage * SWARM_LINK_DAMAGE_MULTIPLIER;
  }

  return damage;
}

export function getSwarmLinkedSpeedMultiplier(
  enemy: TraitCarrier & { swarmLinkedActive?: boolean }
): number {
  return isSwarmLinked(enemy) && enemy.swarmLinkedActive === true ? SWARM_LINK_SPEED_MULTIPLIER : 1;
}

export function refreshSwarmLinkStates(enemies: Enemy[]): void {
  for (const enemy of enemies) {
    enemy.swarmLinkedActive = false;
    enemy.swarmLinkCount = 0;
  }

  const swarmEnemies = enemies.filter(enemy =>
    enemy.alive &&
    enemy.hp > 0 &&
    isSwarmLinked(enemy)
  );

  for (const enemy of swarmEnemies) {
    const nearbyCount = swarmEnemies.filter(other =>
      vec2Distance(enemy.position, other.position) <= SWARM_LINK_RADIUS
    ).length;

    enemy.swarmLinkCount = nearbyCount;
    enemy.swarmLinkedActive = nearbyCount >= SWARM_LINK_THRESHOLD;
  }
}

export function canDamageEnemy(
  enemy: TraitCarrier,
  options: DamageOptions = {}
): boolean {
  if (!isMetal(enemy)) {
    return true;
  }

  return options.damageType === DamageType.Explosive;
}

export function disruptEnemyTrait(enemy: Enemy, duration: number = TRAIT_DISRUPTION_DURATION): EnemyTrait | null {
  if (!enemy.alive || enemy.hp <= 0) {
    return null;
  }

  const priority = [
    EnemyTrait.Shielded,
    EnemyTrait.Metal,
    EnemyTrait.Camo,
    EnemyTrait.SwarmLinked,
  ];

  const traits = enemy.traits ?? getEnemyTraitsForType(enemy.enemyType);
  const activeTrait = priority.find(candidate => {
    if (candidate === EnemyTrait.Shielded && !hasActiveShield(enemy)) {
      return false;
    }
    return hasEnemyTrait(enemy, candidate);
  });
  const trait = activeTrait ?? priority.find(candidate =>
    traits.includes(candidate) && hasDisruptedTrait(enemy, candidate)
  );

  if (!trait) {
    return null;
  }

  const existing = enemy.statusEffects.find(effect =>
    effect.type === StatusEffectType.TraitDisrupted &&
    effect.disruptedTrait === trait
  );

  if (existing) {
    existing.duration = duration;
    existing.remaining = duration;
    existing.strength = 1;
  } else {
    enemy.statusEffects.push({
      type: StatusEffectType.TraitDisrupted,
      duration,
      remaining: duration,
      strength: 1,
      disruptedTrait: trait,
    });
  }

  if (trait === EnemyTrait.Shielded) {
    enemy.shieldCharges = 0;
  }

  if (trait === EnemyTrait.SwarmLinked) {
    enemy.swarmLinkedActive = false;
    enemy.swarmLinkCount = 0;
  }

  return trait;
}

export function createEnemy(
  id: number,
  enemyType: EnemyType,
  path: Path
): Enemy {
  const stats = ENEMY_STATS[enemyType];
  const startPoint = path.getPointAtDistance(0);
  const traits = getEnemyTraitsForType(enemyType);

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
    traits,
    shieldCharges: traits.includes(EnemyTrait.Shielded) ? 1 : 0,
    swarmLinkedActive: false,
    swarmLinkCount: 0,
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

export function applyDamageToEnemy(enemy: Enemy, damage: number, options: DamageOptions = {}): boolean {
  if (!enemy.alive || enemy.hp <= 0) return false;
  if (consumeShieldBlock(enemy)) return false;
  if (!canDamageEnemy(enemy, options)) return false;

  enemy.hp -= getTraitAdjustedDamage(enemy, damage);
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
  return hasEnemyTrait(enemy, EnemyTrait.Camo);
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
  enemy.traits = getEnemyTraitsForType(enemy.enemyType);
  enemy.shieldCharges = getInitialShieldChargesForType(enemy.enemyType);
  enemy.swarmLinkedActive = false;
  enemy.swarmLinkCount = 0;
  enemy.statusEffects = [];
}

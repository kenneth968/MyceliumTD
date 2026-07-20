import { Vec2, vec2Distance } from '../utils/vec2';
import { Path } from '../systems/path';
import { ENEMY_DEFINITIONS, EnemyTrait, EnemyType, EnemyVariant } from '../content/enemyDefinitions';

export { EnemyTrait } from '../content/enemyDefinitions';

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
  Marked = 'marked',
  TraitDisrupted = 'trait_disrupted',
}

export enum DamageType {
  Normal = 'normal',
  Explosive = 'explosive',
}

export interface DamageOptions {
  damageType?: DamageType | `${DamageType}`;
  piercing?: boolean;
  applyMarkBonus?: boolean;
}

export interface EnemyLayerState {
  hp: number;
  maxHp: number;
}

export interface DamageResolution {
  killed: boolean;
  damageApplied: number;
  layersBroken: number;
  shieldConsumed: boolean;
}

export interface Enemy {
  id: number;
  enemyType: EnemyType;
  position: Vec2;
  hp: number;
  maxHp: number;
  layers: EnemyLayerState[];
  currentLayerIndex: number;
  variant: EnemyVariant;
  isBoss?: boolean;
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
export const SWARM_LINK_THRESHOLD = 2;
export const SWARM_LINK_SPEED_MULTIPLIER = 1.2;
export const METAL_DAMAGE_REDUCTION = 0.3;
export const MARK_DURATION = 4000;
export const MARK_DAMAGE_BONUS = 0.2;
export const TRAIT_DISRUPTION_DURATION = 4000;

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
  const definition = enemyType === undefined ? undefined : ENEMY_DEFINITIONS[enemyType as EnemyType];
  return definition ? [...definition.traits] : [];
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
  enemy: TraitCarrier,
  damage: number,
  options: DamageOptions = {}
): number {
  if (
    !isMetal(enemy) ||
    options.damageType === DamageType.Explosive ||
    options.piercing === true
  ) {
    return damage;
  }

  const reducedDamage = damage * (1 - METAL_DAMAGE_REDUCTION);
  return damage < 1 ? reducedDamage : Math.max(1, Math.floor(reducedDamage));
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
  return true;
}

type StatusCarrier = {
  statusEffects?: Array<{
    type: StatusEffectType | string;
    remaining?: number;
    strength?: number;
  }>;
};

export function isMarked(enemy: StatusCarrier): boolean {
  return enemy.statusEffects?.some(effect =>
    effect.type === StatusEffectType.Marked &&
    (effect.remaining ?? 0) > 0
  ) ?? false;
}

export function getMarkedAdjustedDamage(
  enemy: StatusCarrier,
  damage: number,
  options: DamageOptions = {}
): number {
  if (options.applyMarkBonus !== true || !isMarked(enemy)) {
    return damage;
  }

  const mark = enemy.statusEffects?.find(effect =>
    effect.type === StatusEffectType.Marked &&
    (effect.remaining ?? 0) > 0
  );
  return damage * (1 + (mark?.strength ?? MARK_DAMAGE_BONUS));
}

export function markEnemy(
  enemy: Enemy,
  duration: number = MARK_DURATION,
  damageMultiplier: number = 1 + MARK_DAMAGE_BONUS,
): void {
  applyStatusEffect(enemy, StatusEffectType.Marked, duration, damageMultiplier - 1);
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
  const definition = ENEMY_DEFINITIONS[enemyType];
  const startPoint = path.getPointAtDistance(0);
  const traits = [...definition.traits];
  const layers = definition.layers.map(maxHp => ({ hp: maxHp, maxHp }));
  const maxHp = definition.layers.reduce((total, hp) => total + hp, 0);

  return {
    id,
    enemyType,
    position: { ...startPoint.position },
    hp: maxHp,
    maxHp,
    layers,
    currentLayerIndex: 0,
    variant: EnemyVariant.Normal,
    isBoss: false,
    pathProgress: 0,
    pathDistance: 0,
    speed: definition.speed,
    baseSpeed: definition.speed,
    reward: definition.reward,
    alive: true,
    traits,
    shieldCharges: traits.includes(EnemyTrait.Shielded) ? 1 : 0,
    swarmLinkedActive: false,
    swarmLinkCount: 0,
    statusEffects: [],
    hasReachedEnd: false,
  };
}

const VARIANT_LAYER_MULTIPLIER: Record<EnemyVariant, number> = {
  [EnemyVariant.Normal]: 1,
  [EnemyVariant.Elite]: 2,
  [EnemyVariant.Boss]: 6,
};

export function applyEnemyVariant(enemy: Enemy, variant: EnemyVariant): void {
  const multiplier = VARIANT_LAYER_MULTIPLIER[variant];
  enemy.variant = variant;
  enemy.isBoss = variant === EnemyVariant.Boss;
  if (
    variant === EnemyVariant.Boss &&
    enemy.enemyType === EnemyType.WardMoth &&
    !enemy.traits.includes(EnemyTrait.Camo)
  ) {
    enemy.traits = [...enemy.traits, EnemyTrait.Camo];
  }
  enemy.layers = enemy.layers.map(layer => ({
    hp: layer.maxHp * multiplier,
    maxHp: layer.maxHp * multiplier,
  }));
  enemy.currentLayerIndex = 0;
  enemy.hp = enemy.layers.reduce((sum, layer) => sum + layer.hp, 0);
  enemy.maxHp = enemy.hp;
  enemy.reward = Math.floor(enemy.reward * multiplier);
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
    existing.duration = duration;
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

export function resolveDamage(enemy: Enemy, rawDamage: number, options: DamageOptions = {}): DamageResolution {
  if (!enemy.alive || rawDamage <= 0) {
    return { killed: false, damageApplied: 0, layersBroken: 0, shieldConsumed: false };
  }
  if (consumeShieldBlock(enemy)) {
    return { killed: false, damageApplied: 0, layersBroken: 0, shieldConsumed: true };
  }

  const markedDamage = getMarkedAdjustedDamage(enemy, rawDamage, options);
  let remaining = getTraitAdjustedDamage(enemy, markedDamage, options);
  let damageApplied = 0;
  let layersBroken = 0;

  while (remaining > 0 && enemy.currentLayerIndex < enemy.layers.length) {
    const layer = enemy.layers[enemy.currentLayerIndex];
    const hit = Math.min(layer.hp, remaining);
    layer.hp -= hit;
    enemy.hp -= hit;
    damageApplied += hit;
    remaining -= hit;

    if (layer.hp > 0) {
      break;
    }

    layersBroken++;
    enemy.currentLayerIndex++;
  }

  if (enemy.currentLayerIndex >= enemy.layers.length) {
    enemy.hp = 0;
    enemy.alive = false;
  }

  return { killed: !enemy.alive, damageApplied, layersBroken, shieldConsumed: false };
}

export function applyDamageToEnemy(enemy: Enemy, damage: number, options: DamageOptions = {}): boolean {
  return resolveDamage(enemy, damage, options).killed;
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
  enemy.layers = enemy.layers.map(layer => ({ hp: layer.maxHp, maxHp: layer.maxHp }));
  enemy.currentLayerIndex = 0;
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

import { Enemy, StatusEffectType, applyStatusEffect, updateStatusEffects, applyDamageToEnemy } from '../entities/enemy';
import { HitEffect } from './collision';

export interface StatusEffectResult {
  damage: number;
  effectsApplied: StatusEffectType[];
}

export function processStatusEffectHit(
  enemy: Enemy,
  effects: HitEffect[],
  deltaTime: number
): StatusEffectResult {
  let totalDamage = 0;
  const effectsApplied: StatusEffectType[] = [];

  for (const effect of effects) {
    switch (effect.type) {
      case 'slow':
        applyStatusEffect(enemy, StatusEffectType.Slow, effect.duration || 1000, effect.strength);
        effectsApplied.push(StatusEffectType.Slow);
        break;
      case 'poison':
        applyStatusEffect(enemy, StatusEffectType.Poison, effect.duration || 3000, effect.strength);
        effectsApplied.push(StatusEffectType.Poison);
        break;
      case 'stun':
        applyStatusEffect(enemy, StatusEffectType.Stun, effect.duration || 500, effect.strength);
        effectsApplied.push(StatusEffectType.Stun);
        break;
      case 'damage':
        totalDamage += effect.strength;
        break;
      case 'area_damage':
        break;
    }
  }

  return { damage: totalDamage, effectsApplied };
}

export function updateEnemyWithStatusEffects(
  enemy: Enemy,
  deltaTime: number
): { moved: boolean; poisonDamage: number } {
  let moved = true;
  let poisonDamage = 0;

  let isStunned = false;
  for (const effect of enemy.statusEffects) {
    if (effect.type === StatusEffectType.Stun) {
      isStunned = true;
      break;
    }
  }

  if (isStunned) {
    moved = false;
  }

  for (const effect of enemy.statusEffects) {
    if (effect.type === StatusEffectType.Poison) {
      poisonDamage += effect.strength * (deltaTime / 1000);
    }
  }

  return { moved, poisonDamage };
}

export function isEnemyStunned(enemy: Enemy): boolean {
  return enemy.statusEffects.some(e => e.type === StatusEffectType.Stun);
}

export function getSlowFactor(enemy: Enemy): number {
  let factor = 1.0;
  for (const effect of enemy.statusEffects) {
    if (effect.type === StatusEffectType.Slow) {
      factor *= (1 - effect.strength);
    }
  }
  return factor;
}

export function processEnemyStatusTick(
  enemy: Enemy,
  deltaTime: number
): { effectiveSpeed: number; poisonDamage: number; isStunned: boolean } {
  let effectiveSpeed = enemy.baseSpeed;
  let poisonDamage = 0;
  let isStunned = false;

  updateStatusEffects(enemy, deltaTime);

  for (const effect of enemy.statusEffects) {
    if (effect.type === StatusEffectType.Stun) {
      isStunned = true;
    } else if (effect.type === StatusEffectType.Slow) {
      effectiveSpeed *= (1 - effect.strength);
    } else if (effect.type === StatusEffectType.Poison) {
      poisonDamage += effect.strength * (deltaTime / 1000);
    }
  }

  return { effectiveSpeed, poisonDamage, isStunned };
}
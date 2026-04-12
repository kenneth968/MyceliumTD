import { Vec2, vec2Distance } from '../utils/vec2';
import { Projectile, TowerType, TOWER_STATS } from '../entities/tower';
import { Enemy, StatusEffectType, applyStatusEffect } from '../entities/enemy';

export interface CollisionResult {
  hit: boolean;
  target: Enemy | null;
  damage: number;
  effects: HitEffect[];
}

export interface HitEffect {
  type: 'damage' | 'slow' | 'poison' | 'stun' | 'area_damage' | 'instakill' | 'reveal_camo';
  strength: number;
  duration?: number;
}

export interface AreaDamageResult {
  enemiesHit: Enemy[];
  totalDamage: number;
}

const AREA_DAMAGE_RADIUS = 40;
const AREA_DAMAGE_FALLOFF = 0.5;

export function detectCollision(
  projectile: Projectile,
  enemies: Enemy[]
): Enemy | null {
  if (!projectile.alive) {
    return null;
  }

  for (const enemy of enemies) {
    if (!enemy.alive || enemy.hp <= 0) {
      continue;
    }

    const dist = vec2Distance(projectile.position, enemy.position);
    const hitRadius = getHitRadiusForEnemy(enemy);

    if (dist <= hitRadius) {
      return enemy;
    }
  }

  return null;
}

function getHitRadiusForEnemy(enemy: Enemy): number {
  switch (enemy.enemyType) {
    default:
      return 12;
  }
}

export function checkProjectileHit(
  projectile: Projectile,
  target: Enemy | null
): boolean {
  if (!projectile.alive || !target || !target.alive || target.hp <= 0) {
    return false;
  }

  const dist = vec2Distance(projectile.position, target.position);
  return dist <= 15;
}

export function resolveHit(
  projectile: Projectile,
  target: Enemy,
  deltaTime: number
): CollisionResult {
  const effects = getHitEffectsForTowerType(
    projectile.towerType,
    projectile.damage,
    projectile.effectStrength,
    projectile.effectDuration
  );

  let totalDamage = projectile.damage;
  let appliedDamage = projectile.damage;

  if (projectile.towerType === TowerType.StinkhornLine) {
    const existingPoison = target.statusEffects.find(
      e => e.type === StatusEffectType.Poison
    );
    if (existingPoison) {
      appliedDamage += existingPoison.strength * 0.5;
    }
  }

  return {
    hit: true,
    target,
    damage: appliedDamage,
    effects,
  };
}

export function getHitEffectsForTowerType(
  towerType: TowerType,
  damage: number,
  effectStrength?: number,
  effectDuration?: number
): HitEffect[] {
  const stats = TOWER_STATS[towerType];
  const effects: HitEffect[] = [];

  effects.push({ type: 'damage', strength: damage });

  const strength = effectStrength ?? 0.5;
  const duration = effectDuration ?? 1000;

  switch (stats.specialEffect) {
    case 'slow':
      effects.push({
        type: 'slow',
        strength,
        duration,
      });
      break;
    case 'poison':
      effects.push({
        type: 'poison',
        strength: effectStrength !== undefined ? effectStrength * damage : damage * 0.5,
        duration,
      });
      break;
    case 'stun':
      effects.push({
        type: 'stun',
        strength,
        duration,
      });
      break;
    case 'area_damage':
      effects.push({
        type: 'area_damage',
        strength: effectStrength !== undefined ? effectStrength * damage : damage * AREA_DAMAGE_FALLOFF,
      });
      break;
    case 'instakill':
      effects.push({
        type: 'instakill',
        strength,
      });
      break;
    case 'reveal_camo':
      effects.push({
        type: 'reveal_camo',
        strength,
        duration,
      });
      break;
  }

  return effects;
}

export function applyHitEffects(
  enemy: Enemy,
  effects: HitEffect[],
  deltaTime: number
): void {
  for (const effect of effects) {
    switch (effect.type) {
      case 'slow':
        applyStatusEffect(enemy, StatusEffectType.Slow, effect.duration || 1000, effect.strength);
        break;
      case 'poison':
        applyStatusEffect(enemy, StatusEffectType.Poison, effect.duration || 3000, effect.strength);
        break;
      case 'stun':
        applyStatusEffect(enemy, StatusEffectType.Stun, effect.duration || 500, effect.strength);
        break;
      case 'area_damage':
        break;
    }
  }
}

export function calculateAreaDamage(
  center: Vec2,
  enemies: Enemy[],
  baseDamage: number,
  radius?: number
): AreaDamageResult {
  const effectiveRadius = radius ?? AREA_DAMAGE_RADIUS;
  const enemiesHit: Enemy[] = [];
  let totalDamage = 0;

  for (const enemy of enemies) {
    if (!enemy.alive || enemy.hp <= 0) {
      continue;
    }

    const dist = vec2Distance(center, enemy.position);

    if (dist <= effectiveRadius) {
      const falloff = 1 - (dist / effectiveRadius) * (1 - AREA_DAMAGE_FALLOFF);
      const damage = Math.floor(baseDamage * falloff);

      enemiesHit.push(enemy);
      totalDamage += damage;
    }
  }

  return { enemiesHit, totalDamage };
}

export function processProjectileCollision(
  projectile: Projectile,
  enemies: Enemy[],
  deltaTime: number
): {
  collision: CollisionResult;
  areaDamage?: AreaDamageResult;
} {
  const target = detectCollision(projectile, enemies);

  if (!target) {
    return {
      collision: { hit: false, target: null, damage: 0, effects: [] },
    };
  }

  const collision = resolveHit(projectile, target, deltaTime);

  let areaDamage: AreaDamageResult | undefined;
  if (projectile.towerType === TowerType.PuffballFungus) {
    areaDamage = calculateAreaDamage(projectile.position, enemies, projectile.damage, projectile.areaRadius);
  }

  return { collision, areaDamage };
}

export function updateProjectileCollision(
  projectile: Projectile,
  enemies: Enemy[],
  deltaTime: number
): CollisionResult {
  if (!projectile.alive) {
    return { hit: false, target: null, damage: 0, effects: [] };
  }

  const target = enemies.find(e => e.id === projectile.targetId && e.alive && e.hp > 0);

  if (!target) {
    projectile.alive = false;
    return { hit: false, target: null, damage: 0, effects: [] };
  }

  const dist = vec2Distance(projectile.position, target.position);

  if (dist < 15) {
    projectile.alive = false;
    const collision = resolveHit(projectile, target, deltaTime);
    return collision;
  }

  const moveDistance = projectile.speed * (deltaTime / 1000);

  if (moveDistance >= dist) {
    projectile.position = { ...target.position };
    projectile.alive = false;
    const collision = resolveHit(projectile, target, deltaTime);
    if (projectile.towerType === TowerType.PuffballFungus) {
      calculateAreaDamage(projectile.position, enemies, projectile.damage, projectile.areaRadius);
    }
    return collision;
  }

  const ratio = moveDistance / dist;
  projectile.position.x += (target.position.x - projectile.position.x) * ratio;
  projectile.position.y += (target.position.y - projectile.position.y) * ratio;

  return { hit: false, target: null, damage: 0, effects: [] };
}

export function isProjectileInBounds(projectile: Projectile, bounds: { minX: number; maxX: number; minY: number; maxY: number }): boolean {
  return (
    projectile.position.x >= bounds.minX &&
    projectile.position.x <= bounds.maxX &&
    projectile.position.y >= bounds.minY &&
    projectile.position.y <= bounds.maxY
  );
}

export function getProjectilesNeedingCleanup(projectiles: Projectile[], maxDistance: number = 1000): Projectile[] {
  return projectiles.filter(p => !p.alive);
}

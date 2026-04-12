import { Vec2, vec2Distance, vec2Normalize, vec2Scale, vec2Add } from '../utils/vec2';
import { Enemy, applyDamageToEnemy, StatusEffectType, applyStatusEffect } from './enemy';
import { Path } from '../systems/path';

export enum HeroAbilityType {
  MushroomSpores = 'mushroom_spores',
  Healing = 'healing',
  Shield = 'shield',
  Dash = 'dash',
}

export interface HeroAbility {
  type: HeroAbilityType;
  name: string;
  description: string;
  cooldown: number;
  currentCooldown: number;
  radius: number;
  strength: number;
  duration: number;
}

export interface Hero {
  id: number;
  name: string;
  position: Vec2;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  range: number;
  alive: boolean;
  selected: boolean;
  abilities: HeroAbility[];
  isMoving: boolean;
  moveTarget: Vec2 | null;
  facing: Vec2;
  xp: number;
  level: number;
}

let nextHeroId = 1;

export function createHero(x: number, y: number): Hero {
  return {
    id: nextHeroId++,
    name: 'Mushroom Knight',
    position: { x, y },
    hp: 100,
    maxHp: 100,
    speed: 150,
    damage: 5,
    range: 60,
    alive: true,
    selected: false,
    abilities: [
      {
        type: HeroAbilityType.MushroomSpores,
        name: 'Spore Burst',
        description: 'Deal damage and slow enemies in area',
        cooldown: 5000,
        currentCooldown: 0,
        radius: 80,
        strength: 0.5,
        duration: 2000,
      },
      {
        type: HeroAbilityType.Healing,
        name: 'Healing Wave',
        description: 'Heal nearby towers',
        cooldown: 10000,
        currentCooldown: 0,
        radius: 100,
        strength: 20,
        duration: 0,
      },
      {
        type: HeroAbilityType.Shield,
        name: 'Fungal Shield',
        description: 'Grant temporary invulnerability',
        cooldown: 15000,
        currentCooldown: 0,
        radius: 0,
        strength: 3000,
        duration: 2000,
      },
      {
        type: HeroAbilityType.Dash,
        name: 'Spore Dash',
        description: 'Quick movement to location',
        cooldown: 3000,
        currentCooldown: 0,
        radius: 0,
        strength: 200,
        duration: 0,
      },
    ],
    isMoving: false,
    moveTarget: null,
    facing: { x: 1, y: 0 },
    xp: 0,
    level: 1,
  };
}

export function updateHeroPosition(hero: Hero, path: Path, deltaTime: number): void {
  if (!hero.alive || !hero.isMoving || !hero.moveTarget) return;

  const dx = hero.moveTarget.x - hero.position.x;
  const dy = hero.moveTarget.y - hero.position.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 5) {
    hero.isMoving = false;
    hero.moveTarget = null;
    return;
  }

  const moveDistance = hero.speed * (deltaTime / 1000);
  if (moveDistance >= dist) {
    hero.position = { ...hero.moveTarget };
    hero.isMoving = false;
    hero.moveTarget = null;
  } else {
    const ratio = moveDistance / dist;
    hero.position.x += dx * ratio;
    hero.position.y += dy * ratio;
  }

  hero.facing = dist > 0 ? { x: dx / dist, y: dy / dist } : hero.facing;
}

export function moveHeroTo(hero: Hero, x: number, y: number): void {
  if (!hero.alive) return;
  hero.moveTarget = { x, y };
  hero.isMoving = true;
}

export function stopHero(hero: Hero): void {
  hero.isMoving = false;
  hero.moveTarget = null;
}

export function selectHero(hero: Hero): void {
  hero.selected = true;
}

export function deselectHero(hero: Hero): void {
  hero.selected = false;
}

export function getHeroAtPosition(hero: Hero, x: number, y: number, radius: number = 30): boolean {
  return vec2Distance(hero.position, { x, y }) <= radius;
}

export function applyDamageToHero(hero: Hero, damage: number): boolean {
  if (!hero.alive) return false;
  hero.hp -= damage;
  if (hero.hp <= 0) {
    hero.hp = 0;
    hero.alive = false;
    return true;
  }
  return false;
}

export function healHero(hero: Hero, amount: number): void {
  if (!hero.alive) return;
  hero.hp = Math.min(hero.hp + amount, hero.maxHp);
}

export function canUseAbility(hero: Hero, abilityIndex: number): boolean {
  if (!hero.alive) return false;
  const ability = hero.abilities[abilityIndex];
  if (!ability) return false;
  return ability.currentCooldown <= 0;
}

export function useAbility(
  hero: Hero,
  abilityIndex: number,
  targetPosition: Vec2 | null,
  enemies: Enemy[]
): { used: boolean; damage: number; enemiesHit: Enemy[] } {
  if (!canUseAbility(hero, abilityIndex)) {
    return { used: false, damage: 0, enemiesHit: [] };
  }

  const ability = hero.abilities[abilityIndex];
  ability.currentCooldown = ability.cooldown;

  const result = { used: true, damage: 0, enemiesHit: [] as Enemy[] };

  switch (ability.type) {
    case HeroAbilityType.MushroomSpores:
      const target = targetPosition || hero.position;
      for (const enemy of enemies) {
        if (vec2Distance(enemy.position, target) <= ability.radius && enemy.alive) {
          const killed = applyDamageToEnemy(enemy, hero.damage);
          result.damage += hero.damage;
          result.enemiesHit.push(enemy);
          applyStatusEffect(enemy, StatusEffectType.Slow, ability.duration, ability.strength);
        }
      }
      break;

    case HeroAbilityType.Healing:
      break;

    case HeroAbilityType.Shield:
      break;

    case HeroAbilityType.Dash:
      if (targetPosition) {
        hero.position = { ...targetPosition };
        hero.isMoving = false;
        hero.moveTarget = null;
      }
      break;
  }

  return result;
}

export function updateHeroAbilities(hero: Hero, deltaTime: number): void {
  for (const ability of hero.abilities) {
    if (ability.currentCooldown > 0) {
      ability.currentCooldown -= deltaTime;
      if (ability.currentCooldown < 0) {
        ability.currentCooldown = 0;
      }
    }
  }
}

export function getHeroDistanceToEnemy(hero: Hero, enemy: Enemy): number {
  return vec2Distance(hero.position, enemy.position);
}

export function getEnemiesInHeroRange(hero: Hero, enemies: Enemy[]): Enemy[] {
  return enemies.filter(e => e.alive && vec2Distance(hero.position, e.position) <= hero.range);
}

export function heroAttackEnemy(hero: Hero, enemy: Enemy): boolean {
  if (!hero.alive || !enemy.alive) return false;
  if (vec2Distance(hero.position, enemy.position) > hero.range) return false;
  return applyDamageToEnemy(enemy, hero.damage);
}

export function respawnHero(hero: Hero, x: number, y: number): void {
  hero.position = { x, y };
  hero.hp = hero.maxHp;
  hero.alive = true;
  hero.isMoving = false;
  hero.moveTarget = null;
  hero.xp = 0;
}

export function getHeroHealthPercent(hero: Hero): number {
  return hero.hp / hero.maxHp;
}

export function addHeroXP(hero: Hero, amount: number): boolean {
  hero.xp += amount;
  if (hero.xp >= hero.level * 100) {
    hero.level++;
    hero.maxHp += 20;
    hero.hp = hero.maxHp;
    hero.damage += 2;
    hero.speed += 10;
    return true;
  }
  return false;
}
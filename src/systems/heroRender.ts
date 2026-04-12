import { Hero } from '../entities/hero';
import { TowerGrowthStage } from './towerRender';

export enum HeroAnimationState {
  Idle = 'idle',
  Moving = 'moving',
  Attacking = 'attacking',
  UsingAbility = 'using_ability',
  Selected = 'selected',
  Damaged = 'damaged',
  Dead = 'dead',
}

export interface HeroRenderData {
  id: number;
  position: { x: number; y: number };
  facing: { x: number; y: number };
  animationState: HeroAnimationState;
  health: number;
  maxHealth: number;
  healthPercent: number;
  level: number;
  selected: boolean;
  primaryColor: string;
  secondaryColor: string;
  bodyRadius: number;
  xpProgress: number;
  abilityCooldowns: number[];
  isMoving: boolean;
  activeEffect: string | null;
}

export enum HeroVisualStyle {
  Knight = 'knight',
  Shroom = 'shroom',
  Insect = 'insect',
}

export interface HeroVisualConfig {
  bodyShape: 'circle' | 'hexagon' | 'diamond' | 'square';
  primaryColor: string;
  secondaryColor: string;
  glowColor: string;
  bodyRadius: number;
  decorationColor: string;
  hasShield: boolean;
  shieldColor: string;
}

const HERO_VISUAL_CONFIGS: Record<string, HeroVisualConfig> = {
  [HeroVisualStyle.Knight]: {
    bodyShape: 'hexagon',
    primaryColor: '#8B4513',
    secondaryColor: '#D2691E',
    glowColor: '#90EE90',
    bodyRadius: 20,
    decorationColor: '#FFD700',
    hasShield: true,
    shieldColor: 'rgba(144, 238, 144, 0.3)',
  },
  [HeroVisualStyle.Shroom]: {
    bodyShape: 'circle',
    primaryColor: '#9932CC',
    secondaryColor: '#FF69B4',
    glowColor: '#9370DB',
    bodyRadius: 18,
    decorationColor: '#FFFFFF',
    hasShield: false,
    shieldColor: '',
  },
  [HeroVisualStyle.Insect]: {
    bodyShape: 'diamond',
    primaryColor: '#2F4F4F',
    secondaryColor: '#20B2AA',
    glowColor: '#00CED1',
    bodyRadius: 16,
    decorationColor: '#ADFF2F',
    hasShield: false,
    shieldColor: '',
  },
};

export function getHeroVisualConfig(heroStyle: HeroVisualStyle = HeroVisualStyle.Knight): HeroVisualConfig {
  return HERO_VISUAL_CONFIGS[heroStyle] || HERO_VISUAL_CONFIGS[HeroVisualStyle.Knight];
}

export function getHeroAnimationState(hero: Hero): HeroAnimationState {
  if (!hero.alive) return HeroAnimationState.Dead;
  if (hero.selected) return HeroAnimationState.Selected;
  if (hero.isMoving) return HeroAnimationState.Moving;
  return HeroAnimationState.Idle;
}

export function getHeroRenderData(
  hero: Hero,
  style: HeroVisualStyle = HeroVisualStyle.Knight
): HeroRenderData {
  const config = getHeroVisualConfig(style);
  const healthPercent = hero.hp / hero.maxHp;
  const xpProgress = (hero.xp % 100) / 100;

  let activeEffect: string | null = null;
  for (const ability of hero.abilities) {
    if (ability.currentCooldown > ability.cooldown * 0.8) {
      activeEffect = ability.name;
      break;
    }
  }

  return {
    id: hero.id,
    position: { ...hero.position },
    facing: { ...hero.facing },
    animationState: getHeroAnimationState(hero),
    health: hero.hp,
    maxHealth: hero.maxHp,
    healthPercent,
    level: hero.level,
    selected: hero.selected,
    primaryColor: config.primaryColor,
    secondaryColor: config.secondaryColor,
    bodyRadius: config.bodyRadius,
    xpProgress,
    abilityCooldowns: hero.abilities.map(a => a.currentCooldown / a.cooldown),
    isMoving: hero.isMoving,
    activeEffect,
  };
}

export function getHeroesRenderData(
  heroes: Hero[],
  style: HeroVisualStyle = HeroVisualStyle.Knight
): HeroRenderData[] {
  return heroes.filter(h => h.alive).map(h => getHeroRenderData(h, style));
}

export function getHeroHealthBarColor(healthPercent: number): string {
  if (healthPercent > 0.6) return '#32CD32';
  if (healthPercent > 0.3) return '#FFD700';
  return '#FF4500';
}

export function getHeroBodyShape(style: HeroVisualStyle): string {
  return getHeroVisualConfig(style).bodyShape;
}

export function getHeroDecorationColor(style: HeroVisualStyle): string {
  return getHeroVisualConfig(style).decorationColor;
}

export function getHeroLevelLabel(level: number): string {
  return `LV${level}`;
}

export function isHeroAbilityReady(hero: Hero, abilityIndex: number): boolean {
  const ability = hero.abilities[abilityIndex];
  return ability ? ability.currentCooldown <= 0 : false;
}

export function getHeroAbilityProgress(hero: Hero, abilityIndex: number): number {
  const ability = hero.abilities[abilityIndex];
  if (!ability) return 0;
  return 1 - (ability.currentCooldown / ability.cooldown);
}
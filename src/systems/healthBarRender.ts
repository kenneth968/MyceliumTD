import { Vec2 } from '../utils/vec2';
import { Enemy, StatusEffectType } from '../entities/enemy';
import { EnemyType } from './wave';

export interface HealthBarRenderData {
  enemyId: number;
  position: Vec2;
  width: number;
  height: number;
  offsetY: number;
  currentHp: number;
  maxHp: number;
  healthPercent: number;
  backgroundColor: string;
  fillColor: string;
  borderColor: string;
  borderWidth: number;
  showBorder: boolean;
  healthState: HealthState;
  statusEffectIndicators: StatusEffectIndicator[];
  isVisible: boolean;
}

export interface StatusEffectIndicator {
  type: StatusEffectType;
  color: string;
  icon: string;
}

export enum HealthState {
  Full = 'full',
  Damaged = 'damaged',
  Critical = 'critical',
  Dead = 'dead',
}

const HEALTH_BAR_COLORS = {
  [HealthState.Full]: {
    background: '#1a1a1a',
    fill: '#4CAF50',
    border: '#2E7D32',
  },
  [HealthState.Damaged]: {
    background: '#1a1a1a',
    fill: '#FFC107',
    border: '#F57C00',
  },
  [HealthState.Critical]: {
    background: '#1a1a1a',
    fill: '#F44336',
    border: '#C62828',
  },
  [HealthState.Dead]: {
    background: '#1a1a1a',
    fill: '#424242',
    border: '#212121',
  },
};

const STATUS_EFFECT_COLORS: Record<StatusEffectType, string> = {
  [StatusEffectType.Slow]: '#3498DB',
  [StatusEffectType.Poison]: '#9B59B6',
  [StatusEffectType.Stun]: '#F39C12',
};

const STATUS_EFFECT_ICONS: Record<StatusEffectType, string> = {
  [StatusEffectType.Slow]: 'snowflake',
  [StatusEffectType.Poison]: 'skull',
  [StatusEffectType.Stun]: 'lightning',
};

const DEFAULT_HEALTH_BAR_WIDTH = 30;
const DEFAULT_HEALTH_BAR_HEIGHT = 4;
const DEFAULT_OFFSET_Y = -15;
const DAMAGED_THRESHOLD = 0.5;
const CRITICAL_THRESHOLD = 0.25;

export function getHealthBarWidth(enemyType?: EnemyType): number {
  const baseWidths: Partial<Record<EnemyType, number>> = {
    [EnemyType.ShelledSnail]: 40,
    [EnemyType.ArmoredBeetle]: 38,
    [EnemyType.RainbowStag]: 35,
    [EnemyType.BlackWidow]: 32,
  };
  return baseWidths[enemyType as EnemyType] || DEFAULT_HEALTH_BAR_WIDTH;
}

export function getHealthBarHeight(enemyType?: EnemyType): number {
  const baseHeights: Partial<Record<EnemyType, number>> = {
    [EnemyType.ShelledSnail]: 6,
    [EnemyType.ArmoredBeetle]: 6,
    [EnemyType.RainbowStag]: 5,
  };
  return baseHeights[enemyType as EnemyType] || DEFAULT_HEALTH_BAR_HEIGHT;
}

export function getHealthBarOffsetY(enemyType?: EnemyType): number {
  const baseOffsets: Partial<Record<EnemyType, number>> = {
    [EnemyType.ShelledSnail]: -20,
    [EnemyType.ArmoredBeetle]: -18,
    [EnemyType.RainbowStag]: -16,
  };
  return baseOffsets[enemyType as EnemyType] || DEFAULT_OFFSET_Y;
}

export function getHealthState(healthPercent: number, isAlive: boolean): HealthState {
  if (!isAlive) {
    return HealthState.Dead;
  }
  if (healthPercent <= CRITICAL_THRESHOLD) {
    return HealthState.Critical;
  }
  if (healthPercent <= DAMAGED_THRESHOLD) {
    return HealthState.Damaged;
  }
  return HealthState.Full;
}

export function getStatusEffectIndicators(enemy: Enemy): StatusEffectIndicator[] {
  return enemy.statusEffects.map(effect => ({
    type: effect.type,
    color: STATUS_EFFECT_COLORS[effect.type],
    icon: STATUS_EFFECT_ICONS[effect.type],
  }));
}

export function getHealthBarColors(state: HealthState): { background: string; fill: string; border: string } {
  return HEALTH_BAR_COLORS[state];
}

export function shouldShowHealthBar(enemy: Enemy, showAlways: boolean = false): boolean {
  if (!enemy.alive) {
    return false;
  }
  if (showAlways) {
    return true;
  }
  const healthPercent = enemy.hp / enemy.maxHp;
  return healthPercent < 1.0 || enemy.statusEffects.length > 0;
}

export function getHealthBarRenderData(
  enemy: Enemy,
  options?: {
    showAlways?: boolean;
    customWidth?: number;
    customHeight?: number;
    customOffsetY?: number;
  }
): HealthBarRenderData {
  const { showAlways = false, customWidth, customHeight, customOffsetY } = options || {};
  
  const width = customWidth || getHealthBarWidth(enemy.enemyType);
  const height = customHeight || getHealthBarHeight(enemy.enemyType);
  const offsetY = customOffsetY || getHealthBarOffsetY(enemy.enemyType);
  const healthPercent = enemy.hp / enemy.maxHp;
  const healthState = getHealthState(healthPercent, enemy.alive);
  const colors = getHealthBarColors(healthState);
  const visible = shouldShowHealthBar(enemy, showAlways);

  const position: Vec2 = {
    x: enemy.position.x,
    y: enemy.position.y + offsetY,
  };

  if (!visible) {
    return {
      enemyId: enemy.id,
      position,
      width: 0,
      height: 0,
      offsetY,
      currentHp: enemy.hp,
      maxHp: enemy.maxHp,
      healthPercent,
      backgroundColor: 'transparent',
      fillColor: 'transparent',
      borderColor: 'transparent',
      borderWidth: 0,
      showBorder: false,
      healthState,
      statusEffectIndicators: [],
      isVisible: false,
    };
  }

  return {
    enemyId: enemy.id,
    position,
    width,
    height,
    offsetY,
    currentHp: enemy.hp,
    maxHp: enemy.maxHp,
    healthPercent,
    backgroundColor: colors.background,
    fillColor: colors.fill,
    borderColor: colors.border,
    borderWidth: 1,
    showBorder: true,
    healthState,
    statusEffectIndicators: getStatusEffectIndicators(enemy),
    isVisible: true,
  };
}

export interface HealthBarRenderCollection {
  healthBars: HealthBarRenderData[];
  totalVisible: number;
}

export function getHealthBarsRenderData(
  enemies: Enemy[],
  options?: {
    showAlways?: boolean;
    customWidth?: number;
    customHeight?: number;
    customOffsetY?: number;
  }
): HealthBarRenderCollection {
  const healthBars = enemies
    .filter(e => shouldShowHealthBar(e, options?.showAlways ?? false))
    .map(e => getHealthBarRenderData(e, options));

  return {
    healthBars,
    totalVisible: healthBars.length,
  };
}

export interface AnimatedHealthBarData extends HealthBarRenderData {
  targetHealthPercent: number;
  displayHealthPercent: number;
  animatingDelta: boolean;
  deltaDirection: 'up' | 'down' | 'none';
}

export class HealthBarAnimator {
  private displayHealthPercents: Map<number, number> = new Map();
  private animationSpeeds: Map<number, number> = new Map();
  private readonly defaultAnimationSpeed = 0.1;

  update(enemies: Enemy[], deltaTime: number): void {
    for (const enemy of enemies) {
      const targetPercent = enemy.hp / enemy.maxHp;
      let displayPercent = this.displayHealthPercents.get(enemy.id);
      
      if (displayPercent === undefined) {
        displayPercent = 1.0;
      }

      if (Math.abs(displayPercent - targetPercent) > 0.001) {
        const direction = displayPercent > targetPercent ? -1 : 1;
        const speed = this.animationSpeeds.get(enemy.id) ?? this.defaultAnimationSpeed;
        displayPercent += direction * speed * (deltaTime / 1000);
        displayPercent = Math.max(0, Math.min(1, displayPercent));
        
        if ((direction === -1 && displayPercent <= targetPercent) ||
            (direction === 1 && displayPercent >= targetPercent)) {
          displayPercent = targetPercent;
        }

        this.displayHealthPercents.set(enemy.id, displayPercent);
      }
    }

    for (const id of this.displayHealthPercents.keys()) {
      if (!enemies.find(e => e.id === id)) {
        this.displayHealthPercents.delete(id);
        this.animationSpeeds.delete(id);
      }
    }
  }

  getDisplayHealthPercent(enemyId: number): number {
    return this.displayHealthPercents.get(enemyId) ?? 1.0;
  }

  setAnimationSpeed(enemyId: number, speed: number): void {
    this.animationSpeeds.set(enemyId, speed);
  }

  reset(): void {
    this.displayHealthPercents.clear();
    this.animationSpeeds.clear();
  }
}

export function createHealthBarAnimator(): HealthBarAnimator {
  return new HealthBarAnimator();
}

export function getAnimatedHealthBarRenderData(
  enemy: Enemy,
  animator: HealthBarAnimator,
  options?: {
    showAlways?: boolean;
    customWidth?: number;
    customHeight?: number;
    customOffsetY?: number;
  }
): AnimatedHealthBarData {
  const baseData = getHealthBarRenderData(enemy, options);
  const displayPercent = animator.getDisplayHealthPercent(enemy.id);
  const targetPercent = enemy.hp / enemy.maxHp;
  
  const deltaDirection = displayPercent > targetPercent ? 'down' : 
                         displayPercent < targetPercent ? 'up' : 'none';

  return {
    ...baseData,
    targetHealthPercent: targetPercent,
    displayHealthPercent: displayPercent,
    animatingDelta: deltaDirection !== 'none',
    deltaDirection,
  };
}

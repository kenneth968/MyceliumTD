import { Vec2 } from '../utils/vec2';
import { Enemy, StatusEffectType } from '../entities/enemy';
import { EnemyType, ENEMY_STATS } from './wave';

export interface EnemyRenderData {
  id: number;
  enemyType: EnemyType;
  position: Vec2;
  rotation: number;
  scale: number;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  glowColor: string;
  bodyRadius: number;
  pathProgress: number;
  pathDistance: number;
  isAlive: boolean;
  isCamo: boolean;
  statusEffects: EnemyStatusEffectRender[];
  animationState: EnemyAnimationState;
  facingAngle: number;
}

export interface EnemyStatusEffectRender {
  type: StatusEffectType;
  color: string;
  icon: string;
  intensity: number;
  remainingDuration: number;
}

export enum EnemyAnimationState {
  Normal = 'normal',
  Moving = 'moving',
  Slowed = 'slowed',
  Poisoned = 'poisoned',
  Stunned = 'stunned',
  Dying = 'dying',
  Dead = 'dead',
}

export interface EnemySpriteFrame {
  enemyType: EnemyType;
  animationState: EnemyAnimationState;
  frameIndex: number;
  duration: number;
  scale: number;
  rotation: number;
}

const ENEMY_VISUAL_CONFIGS: Record<EnemyType, {
  primary: string;
  secondary: string;
  accent: string;
  glow: string;
  bodyRadius: number;
  bodyShape: 'circle' | 'oval' | 'elongated' | 'shield' | 'spiral';
  animationSpeed: number;
  hasShell: boolean;
  hasWings: boolean;
}> = {
  [EnemyType.RedMushroom]: {
    primary: '#E74C3C',
    secondary: '#C0392B',
    accent: '#FADBD8',
    glow: '#F5B7B1',
    bodyRadius: 10,
    bodyShape: 'circle',
    animationSpeed: 1.0,
    hasShell: false,
    hasWings: false,
  },
  [EnemyType.BlueBeetle]: {
    primary: '#3498DB',
    secondary: '#2980B9',
    accent: '#AED6F1',
    glow: '#D4E6F1',
    bodyRadius: 12,
    bodyShape: 'oval',
    animationSpeed: 0.8,
    hasShell: true,
    hasWings: false,
  },
  [EnemyType.GreenCaterpillar]: {
    primary: '#27AE60',
    secondary: '#1E8449',
    accent: '#A9DFBF',
    glow: '#D5F5E3',
    bodyRadius: 8,
    bodyShape: 'elongated',
    animationSpeed: 0.6,
    hasShell: false,
    hasWings: false,
  },
  [EnemyType.YellowWasp]: {
    primary: '#F1C40F',
    secondary: '#D4AC0D',
    accent: '#FCF3CF',
    glow: '#FEF9E7',
    bodyRadius: 10,
    bodyShape: 'elongated',
    animationSpeed: 1.4,
    hasShell: false,
    hasWings: true,
  },
  [EnemyType.PinkLadybug]: {
    primary: '#E91E63',
    secondary: '#C2185B',
    accent: '#F8BBD0',
    glow: '#FCE4EC',
    bodyRadius: 11,
    bodyShape: 'circle',
    animationSpeed: 0.9,
    hasShell: true,
    hasWings: false,
  },
  [EnemyType.BlackWidow]: {
    primary: '#1C1C1C',
    secondary: '#000000',
    accent: '#E74C3C',
    glow: '#9B59B6',
    bodyRadius: 14,
    bodyShape: 'circle',
    animationSpeed: 0.7,
    hasShell: false,
    hasWings: false,
  },
  [EnemyType.WhiteMoth]: {
    primary: '#ECF0F1',
    secondary: '#BDC3C7',
    accent: '#FDFEFE',
    glow: '#F8F9F9',
    bodyRadius: 12,
    bodyShape: 'oval',
    animationSpeed: 1.1,
    hasShell: false,
    hasWings: true,
  },
  [EnemyType.ArmoredBeetle]: {
    primary: '#5D6D7E',
    secondary: '#34495E',
    accent: '#85929E',
    glow: '#AEB6BF',
    bodyRadius: 18,
    bodyShape: 'shield',
    animationSpeed: 0.5,
    hasShell: true,
    hasWings: false,
  },
  [EnemyType.RainbowStag]: {
    primary: '#E74C3C',
    secondary: '#3498DB',
    accent: '#F39C12',
    glow: '#FDFEFE',
    bodyRadius: 15,
    bodyShape: 'elongated',
    animationSpeed: 0.8,
    hasShell: false,
    hasWings: false,
  },
  [EnemyType.ShelledSnail]: {
    primary: '#8D6E63',
    secondary: '#5D4037',
    accent: '#BCAAA4',
    glow: '#D7CCC8',
    bodyRadius: 16,
    bodyShape: 'spiral',
    animationSpeed: 0.4,
    hasShell: true,
    hasWings: false,
  },
};

const STATUS_EFFECT_VISUALS: Record<StatusEffectType, {
  color: string;
  icon: string;
  animationSpeed: number;
}> = {
  [StatusEffectType.Slow]: {
    color: '#3498DB',
    icon: 'snowflake',
    animationSpeed: 0.5,
  },
  [StatusEffectType.Poison]: {
    color: '#9B59B6',
    icon: 'skull',
    animationSpeed: 0.8,
  },
  [StatusEffectType.Stun]: {
    color: '#F39C12',
    icon: 'lightning',
    animationSpeed: 1.5,
  },
};

export function getEnemyVisualConfig(enemyType: EnemyType) {
  return ENEMY_VISUAL_CONFIGS[enemyType] || ENEMY_VISUAL_CONFIGS[EnemyType.RedMushroom];
}

export function getEnemyColors(enemyType: EnemyType): { primary: string; secondary: string; accent: string; glow: string } {
  const config = getEnemyVisualConfig(enemyType);
  return {
    primary: config.primary,
    secondary: config.secondary,
    accent: config.accent,
    glow: config.glow,
  };
}

export function getEnemyBodyRadius(enemyType: EnemyType): number {
  const config = getEnemyVisualConfig(enemyType);
  return config.bodyRadius;
}

export function getEnemyBodyShape(enemyType: EnemyType): 'circle' | 'oval' | 'elongated' | 'shield' | 'spiral' {
  const config = getEnemyVisualConfig(enemyType);
  return config.bodyShape;
}

export function hasEnemyShell(enemyType: EnemyType): boolean {
  const config = getEnemyVisualConfig(enemyType);
  return config.hasShell;
}

export function hasEnemyWings(enemyType: EnemyType): boolean {
  const config = getEnemyVisualConfig(enemyType);
  return config.hasWings;
}

export function getEnemyDecorationType(enemyType: EnemyType): 'none' | 'shell' | 'wings' | 'shell_and_wings' {
  const config = getEnemyVisualConfig(enemyType);
  if (config.hasShell && config.hasWings) return 'shell_and_wings';
  if (config.hasShell) return 'shell';
  if (config.hasWings) return 'wings';
  return 'none';
}

function getStatusEffectRender(effect: { type: StatusEffectType; strength: number; remaining: number }): EnemyStatusEffectRender {
  const visuals = STATUS_EFFECT_VISUALS[effect.type];
  return {
    type: effect.type,
    color: visuals.color,
    icon: visuals.icon,
    intensity: effect.strength,
    remainingDuration: effect.remaining,
  };
}

function getEnemyAnimationState(enemy: Enemy): EnemyAnimationState {
  if (!enemy.alive) {
    return EnemyAnimationState.Dead;
  }

  if (enemy.statusEffects.some(e => e.type === StatusEffectType.Stun)) {
    return EnemyAnimationState.Stunned;
  }

  if (enemy.statusEffects.some(e => e.type === StatusEffectType.Poison)) {
    return EnemyAnimationState.Poisoned;
  }

  if (enemy.statusEffects.some(e => e.type === StatusEffectType.Slow)) {
    return EnemyAnimationState.Slowed;
  }

  if (enemy.speed < enemy.baseSpeed * 0.9) {
    return EnemyAnimationState.Moving;
  }

  return EnemyAnimationState.Normal;
}

export function getEnemyRenderData(
  enemy: Enemy,
  options?: {
    pathProgress?: number;
    facingAngle?: number;
  }
): EnemyRenderData {
  const config = getEnemyVisualConfig(enemy.enemyType);
  const animationState = getEnemyAnimationState(enemy);

  const statusEffectRenders = enemy.statusEffects.map(e => getStatusEffectRender(e));

  return {
    id: enemy.id,
    enemyType: enemy.enemyType,
    position: { ...enemy.position },
    rotation: options?.facingAngle ?? 0,
    scale: 1.0,
    primaryColor: config.primary,
    secondaryColor: config.secondary,
    accentColor: config.accent,
    glowColor: config.glow,
    bodyRadius: config.bodyRadius,
    pathProgress: options?.pathProgress ?? enemy.pathProgress,
    pathDistance: enemy.pathDistance,
    isAlive: enemy.alive,
    isCamo: enemy.enemyType === EnemyType.WhiteMoth || enemy.enemyType === EnemyType.BlackWidow,
    statusEffects: statusEffectRenders,
    animationState,
    facingAngle: options?.facingAngle ?? 0,
  };
}

export interface EnemyRenderCollection {
  enemies: EnemyRenderData[];
  totalCount: number;
  aliveCount: number;
  camoCount: number;
  enemyTypeInfo: Map<number, {
    bodyShape: 'circle' | 'oval' | 'elongated' | 'shield' | 'spiral';
    decorations: EnemyDecoration[];
    statusEffectAuras: StatusEffectAura[];
    camoRevealColor: string;
  }>;
}

export function getEnemiesRenderData(
  enemies: Enemy[],
  options?: {
    pathProgressMap?: Map<number, number>;
    facingAngleMap?: Map<number, number>;
  }
): EnemyRenderCollection {
  const pathProgressMap = options?.pathProgressMap ?? new Map();
  const facingAngleMap = options?.facingAngleMap ?? new Map();

  const enemyTypeInfo = new Map<number, {
    bodyShape: 'circle' | 'oval' | 'elongated' | 'shield' | 'spiral';
    decorations: EnemyDecoration[];
    statusEffectAuras: StatusEffectAura[];
    camoRevealColor: string;
  }>();

  const enemiesRenderData = enemies.map(enemy => {
    const renderData = getEnemyRenderData(enemy, {
      pathProgress: pathProgressMap.get(enemy.id),
      facingAngle: facingAngleMap.get(enemy.id),
    });
    
    enemyTypeInfo.set(enemy.id, {
      bodyShape: getEnemyBodyShape(enemy.enemyType),
      decorations: getEnemyDecorations(enemy.enemyType),
      statusEffectAuras: getStatusEffectAuras(enemy, Date.now()),
      camoRevealColor: enemy.enemyType === EnemyType.WhiteMoth || enemy.enemyType === EnemyType.BlackWidow ? '#F1C40F' : '#FFFFFF',
    });
    
    return renderData;
  });

  return {
    enemies: enemiesRenderData,
    totalCount: enemiesRenderData.length,
    aliveCount: enemiesRenderData.filter(e => e.isAlive).length,
    camoCount: enemiesRenderData.filter(e => e.isCamo).length,
    enemyTypeInfo,
  };
}

export function getAnimationState(
  enemyType: EnemyType,
  animationState: EnemyAnimationState,
  time: number,
  deltaTime: number = 16
): { scale: number; rotation: number; glowIntensity: number; bobOffset: number } {
  const config = getEnemyVisualConfig(enemyType);
  const stateConfig = STATUS_EFFECT_VISUALS;

  let scale = 1.0;
  let rotation = 0;
  let glowIntensity = 0.2;
  let bobOffset = 0;

  const effectiveAnimationSpeed = config.animationSpeed * (deltaTime / 16);
  const normalizedTime = time * effectiveAnimationSpeed * 0.001;

  switch (animationState) {
    case EnemyAnimationState.Normal:
      scale = 1.0 + 0.02 * Math.sin(normalizedTime * 2);
      glowIntensity = 0.2 + 0.05 * Math.sin(normalizedTime * 2);
      bobOffset = 0;
      break;
    case EnemyAnimationState.Moving:
      scale = 1.0 + 0.03 * Math.sin(normalizedTime * 4);
      glowIntensity = 0.3;
      bobOffset = Math.abs(Math.sin(normalizedTime * 6)) * 2;
      break;
    case EnemyAnimationState.Slowed:
      scale = 0.95 + 0.02 * Math.sin(normalizedTime * 1);
      glowIntensity = 0.4;
      bobOffset = Math.abs(Math.sin(normalizedTime * 2)) * 1;
      break;
    case EnemyAnimationState.Poisoned:
      scale = 1.0 + 0.04 * Math.sin(normalizedTime * 3);
      glowIntensity = 0.5;
      bobOffset = Math.abs(Math.sin(normalizedTime * 4)) * 1.5;
      break;
    case EnemyAnimationState.Stunned:
      scale = 0.9 + 0.05 * Math.sin(normalizedTime * 8);
      rotation = Math.sin(normalizedTime * 10) * 0.2;
      glowIntensity = 0.7;
      bobOffset = 0;
      break;
    case EnemyAnimationState.Dying:
      scale = 0.5 + 0.1 * (1 - Math.sin(normalizedTime * 4));
      glowIntensity = 0.8;
      bobOffset = 0;
      break;
    case EnemyAnimationState.Dead:
      scale = 0;
      glowIntensity = 0;
      bobOffset = 0;
      break;
  }

  return { scale, rotation, glowIntensity, bobOffset };
}

export function getAnimatedEnemyRenderData(
  enemy: Enemy,
  time: number,
  deltaTime: number = 16,
  options?: {
    pathProgress?: number;
    facingAngle?: number;
  }
): EnemyRenderData {
  const baseData = getEnemyRenderData(enemy, options);
  const animation = getAnimationState(enemy.enemyType, baseData.animationState, time, deltaTime);

  return {
    ...baseData,
    scale: animation.scale,
    rotation: animation.rotation,
  };
}

export interface EnemyDecoration {
  type: 'shell' | 'wing_left' | 'wing_right' | 'antenna' | 'tail';
  color: string;
  size: number;
  offsetX: number;
  offsetY: number;
  rotation: number;
}

export function getEnemyDecorations(enemyType: EnemyType): EnemyDecoration[] {
  const config = getEnemyVisualConfig(enemyType);
  const decorations: EnemyDecoration[] = [];

  if (config.hasShell) {
    decorations.push({
      type: 'shell',
      color: config.secondary,
      size: config.bodyRadius * 0.8,
      offsetX: 0,
      offsetY: -config.bodyRadius * 0.2,
      rotation: 0,
    });
  }

  if (config.hasWings) {
    decorations.push({
      type: 'wing_left',
      color: config.accent,
      size: config.bodyRadius * 0.6,
      offsetX: -config.bodyRadius * 0.5,
      offsetY: 0,
      rotation: -0.3,
    });
    decorations.push({
      type: 'wing_right',
      color: config.accent,
      size: config.bodyRadius * 0.6,
      offsetX: config.bodyRadius * 0.5,
      offsetY: 0,
      rotation: 0.3,
    });
  }

  switch (enemyType) {
    case EnemyType.GreenCaterpillar:
      decorations.push(
        { type: 'antenna', color: config.primary, size: 3, offsetX: -2, offsetY: -config.bodyRadius, rotation: -0.3 },
        { type: 'antenna', color: config.primary, size: 3, offsetX: 2, offsetY: -config.bodyRadius, rotation: 0.3 },
        { type: 'tail', color: config.secondary, size: 4, offsetX: 0, offsetY: config.bodyRadius, rotation: 0 }
      );
      break;
    case EnemyType.BlackWidow:
      decorations.push(
        { type: 'antenna', color: config.primary, size: 4, offsetX: -3, offsetY: -config.bodyRadius * 0.8, rotation: -0.5 },
        { type: 'antenna', color: config.primary, size: 4, offsetX: 3, offsetY: -config.bodyRadius * 0.8, rotation: 0.5 }
      );
      break;
    case EnemyType.ShelledSnail:
      decorations.push({
        type: 'shell',
        color: config.secondary,
        size: config.bodyRadius * 1.2,
        offsetX: 0,
        offsetY: -config.bodyRadius * 0.3,
        rotation: 0,
      });
      decorations.push(
        { type: 'antenna', color: config.primary, size: 3, offsetX: -4, offsetY: -config.bodyRadius, rotation: -0.4 },
        { type: 'antenna', color: config.primary, size: 3, offsetX: 4, offsetY: -config.bodyRadius, rotation: 0.4 }
      );
      break;
  }

  return decorations;
}

export interface CamoIndicator {
  isVisible: boolean;
  revealColor: string;
  opacity: number;
}

export function getCamoIndicator(enemy: Enemy, isRevealed: boolean = false): CamoIndicator {
  const isCamo = enemy.enemyType === EnemyType.WhiteMoth || enemy.enemyType === EnemyType.BlackWidow;
  if (!isCamo) {
    return { isVisible: false, revealColor: '#FFFFFF', opacity: 0 };
  }

  return {
    isVisible: true,
    revealColor: isRevealed ? '#F1C40F' : '#1ABC9C',
    opacity: isRevealed ? 0.8 : 0.4,
  };
}

export interface StatusEffectAura {
  type: StatusEffectType;
  color: string;
  radius: number;
  opacity: number;
  pulseSpeed: number;
}

export function getStatusEffectAuras(enemy: Enemy, time: number): StatusEffectAura[] {
  return enemy.statusEffects.map(effect => {
    const visuals = STATUS_EFFECT_VISUALS[effect.type];
    const config = getEnemyVisualConfig(enemy.enemyType);
    const pulseSpeed = visuals.animationSpeed;
    const opacity = Math.min(0.6, effect.strength * 0.3) * (0.5 + 0.5 * Math.sin(time * pulseSpeed * 0.001));

    return {
      type: effect.type,
      color: visuals.color,
      radius: config.bodyRadius * (1 + effect.strength * 0.5),
      opacity,
      pulseSpeed,
    };
  });
}

export function isEnemyFullyVisible(enemy: Enemy, hasCamoReveal: boolean = false): boolean {
  const isCamo = enemy.enemyType === EnemyType.WhiteMoth || enemy.enemyType === EnemyType.BlackWidow;
  if (!isCamo) return true;
  return hasCamoReveal;
}

export interface EnemyTypeInfo {
  name: string;
  description: string;
  difficulty: number;
}

export function getEnemyTypeInfo(enemyType: EnemyType): EnemyTypeInfo {
  const info: Record<EnemyType, EnemyTypeInfo> = {
    [EnemyType.RedMushroom]: {
      name: 'Red Mushroom',
      description: 'Basic enemy, slow but numerous',
      difficulty: 1,
    },
    [EnemyType.BlueBeetle]: {
      name: 'Blue Beetle',
      description: 'Armored shell, moderate speed',
      difficulty: 2,
    },
    [EnemyType.GreenCaterpillar]: {
      name: 'Green Caterpillar',
      description: 'Long body,蠕动的 movement',
      difficulty: 3,
    },
    [EnemyType.YellowWasp]: {
      name: 'Yellow Wasp',
      description: 'Fast and agile, flies over obstacles',
      difficulty: 4,
    },
    [EnemyType.PinkLadybug]: {
      name: 'Pink Ladybug',
      description: 'Quick with moderate HP',
      difficulty: 5,
    },
    [EnemyType.BlackWidow]: {
      name: 'Black Widow',
      description: 'Camo detection, deadly venom',
      difficulty: 6,
    },
    [EnemyType.WhiteMoth]: {
      name: 'White Moth',
      description: 'Camo and very fast',
      difficulty: 7,
    },
    [EnemyType.ArmoredBeetle]: {
      name: 'Armored Beetle',
      description: 'Heavy shell, very slow, high HP',
      difficulty: 8,
    },
    [EnemyType.RainbowStag]: {
      name: 'Rainbow Stag',
      description: 'Colorful and dangerous, moderate speed',
      difficulty: 9,
    },
    [EnemyType.ShelledSnail]: {
      name: 'Shelled Snail',
      description: 'Slow but extremely tanky',
      difficulty: 10,
    },
  };

  return info[enemyType] || info[EnemyType.RedMushroom];
}

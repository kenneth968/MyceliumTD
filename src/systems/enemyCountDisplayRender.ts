import { Vec2 } from '../utils/vec2';

export enum EnemyCountDisplayState {
  Hidden = 'hidden',
  Visible = 'visible',
}

export interface EnemyCountDisplay {
  position: Vec2;
  size: { width: number; height: number };
  currentCount: number;
  countText: string;
  opacity: number;
  fillColor: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
}

export interface EnemyCountDisplayRenderData {
  state: EnemyCountDisplayState;
  isVisible: boolean;
  position: Vec2;
  size: { width: number; height: number };
  enemyCount: EnemyCountDisplay;
  elapsed: number;
}

export interface EnemyCountDisplayAnimator {
  state: 'hidden' | 'visible';
  startTime: number;
  elapsed: number;
  opacity: number;
}

const ENEMY_COUNT_STYLES = {
  background: 'rgba(20, 20, 20, 0.85)',
  border: '#FFD700',
  textColor: '#FFFFFF',
  fillColor: '#9370DB',
  backgroundColor: 'rgba(60, 40, 80, 0.9)',
};

const ENEMY_COUNT_ANIMATION_TIMES = {
  fadeInDuration: 150,
  fadeOutDuration: 150,
};

const DEFAULT_ENEMY_COUNT_SIZE = { width: 100, height: 30 };
const ENEMY_COUNT_POSITION = { x: 20, y: 75 };

export function getEnemyCountPosition(): Vec2 {
  return { ...ENEMY_COUNT_POSITION };
}

export function getEnemyCountSize(): { width: number; height: number } {
  return { ...DEFAULT_ENEMY_COUNT_SIZE };
}

export function createEnemyCountDisplayAnimator(): EnemyCountDisplayAnimator {
  return {
    state: 'hidden',
    startTime: 0,
    elapsed: 0,
    opacity: 0,
  };
}

export function showEnemyCountDisplay(animator: EnemyCountDisplayAnimator, currentTime: number): void {
  animator.state = 'visible';
  animator.startTime = currentTime;
  animator.elapsed = 0;
}

export function hideEnemyCountDisplay(animator: EnemyCountDisplayAnimator, currentTime: number): void {
  animator.state = 'hidden';
  animator.startTime = currentTime;
  animator.elapsed = 0;
}

export function isEnemyCountDisplayVisible(animator: EnemyCountDisplayAnimator): boolean {
  return animator.state === 'visible';
}

export function updateEnemyCountDisplay(
  animator: EnemyCountDisplayAnimator,
  deltaTime: number,
  currentTime: number
): void {
  if (animator.state === 'hidden') {
    animator.opacity = 0;
    return;
  }

  animator.elapsed += deltaTime;

  if (animator.elapsed < ENEMY_COUNT_ANIMATION_TIMES.fadeInDuration) {
    const t = animator.elapsed / ENEMY_COUNT_ANIMATION_TIMES.fadeInDuration;
    animator.opacity = easeOutCubic(t);
  } else {
    animator.opacity = 1;
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t: number): number {
  return t * t * t;
}

export function getEnemyCountDisplayRenderData(
  position: Vec2,
  currentCount: number,
  opacity: number
): EnemyCountDisplay {
  return {
    position,
    size: { ...DEFAULT_ENEMY_COUNT_SIZE },
    currentCount,
    countText: `${currentCount}`,
    opacity,
    fillColor: ENEMY_COUNT_STYLES.fillColor,
    backgroundColor: ENEMY_COUNT_STYLES.backgroundColor,
    borderColor: ENEMY_COUNT_STYLES.border,
    borderWidth: 2,
  };
}

export function getEnemyCountDisplayRenderDataFull(
  animator: EnemyCountDisplayAnimator,
  options?: {
    currentCount?: number;
  }
): EnemyCountDisplayRenderData {
  const position = getEnemyCountPosition();
  const size = getEnemyCountSize();
  const currentCount = options?.currentCount ?? 0;

  if (animator.state === 'hidden') {
    return {
      state: EnemyCountDisplayState.Hidden,
      isVisible: false,
      position,
      size,
      enemyCount: getEnemyCountDisplayRenderData(position, currentCount, 0),
      elapsed: 0,
    };
  }

  let opacity = 1;
  if (animator.elapsed < ENEMY_COUNT_ANIMATION_TIMES.fadeInDuration) {
    const t = animator.elapsed / ENEMY_COUNT_ANIMATION_TIMES.fadeInDuration;
    opacity = easeOutCubic(t);
  }

  return {
    state: EnemyCountDisplayState.Visible,
    isVisible: true,
    position,
    size,
    enemyCount: getEnemyCountDisplayRenderData(position, currentCount, opacity),
    elapsed: animator.elapsed,
  };
}

export function getEnemyCountDisplayStateLabel(state: EnemyCountDisplayState): string {
  switch (state) {
    case EnemyCountDisplayState.Hidden:
      return 'Hidden';
    case EnemyCountDisplayState.Visible:
      return 'Visible';
  }
}

export function getEnemyCountDisplayColors(): { fill: string; background: string; border: string } {
  return {
    fill: ENEMY_COUNT_STYLES.fillColor,
    background: ENEMY_COUNT_STYLES.backgroundColor,
    border: ENEMY_COUNT_STYLES.border,
  };
}

export function getEnemyCountDisplayBackgroundStyle(): string {
  return ENEMY_COUNT_STYLES.background;
}

export function getEnemyCountDisplayBorderStyle(): string {
  return ENEMY_COUNT_STYLES.border;
}

export function getEnemyCountDisplayTextColor(): string {
  return ENEMY_COUNT_STYLES.textColor;
}

export function resetEnemyCountDisplayAnimator(animator: EnemyCountDisplayAnimator): void {
  animator.state = 'hidden';
  animator.startTime = 0;
  animator.elapsed = 0;
  animator.opacity = 0;
}
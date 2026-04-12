import { Vec2 } from '../utils/vec2';

export enum LivesMoneyDisplayState {
  Hidden = 'hidden',
  Visible = 'visible',
}

export interface LivesDisplay {
  position: Vec2;
  size: { width: number; height: number };
  currentLives: number;
  maxLives: number;
  livesText: string;
  opacity: number;
  fillColor: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
}

export interface MoneyDisplay {
  position: Vec2;
  size: { width: number; height: number };
  currentMoney: number;
  moneyText: string;
  opacity: number;
  fillColor: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
}

export interface LivesMoneyDisplayRenderData {
  state: LivesMoneyDisplayState;
  isVisible: boolean;
  position: Vec2;
  size: { width: number; height: number };
  lives: LivesDisplay;
  money: MoneyDisplay;
  elapsed: number;
}

export interface LivesMoneyDisplayAnimator {
  state: 'hidden' | 'visible';
  startTime: number;
  elapsed: number;
  opacity: number;
}

const LIVES_MONEY_STYLES = {
  background: 'rgba(20, 20, 20, 0.85)',
  border: '#FFD700',
  textColor: '#FFFFFF',
  livesLabelColor: '#FF6B6B',
  moneyLabelColor: '#4CAF50',
  livesFillColor: '#FF4444',
  moneyFillColor: '#44BB44',
  livesBackgroundColor: 'rgba(80, 30, 30, 0.9)',
  moneyBackgroundColor: 'rgba(30, 80, 30, 0.9)',
  borderWidth: 2,
};

const LIVES_MONEY_ANIMATION_TIMES = {
  fadeInDuration: 150,
  fadeOutDuration: 150,
};

const DEFAULT_LIVES_MONEY_SIZE = { width: 180, height: 50 };
const LIVES_MONEY_POSITION = { x: 20, y: 20 };

export function getLivesMoneyPosition(): Vec2 {
  return { ...LIVES_MONEY_POSITION };
}

export function getLivesMoneySize(): { width: number; height: number } {
  return { ...DEFAULT_LIVES_MONEY_SIZE };
}

export function createLivesMoneyDisplayAnimator(): LivesMoneyDisplayAnimator {
  return {
    state: 'visible',
    startTime: 0,
    elapsed: 0,
    opacity: 1,
  };
}

export function showLivesMoneyDisplay(animator: LivesMoneyDisplayAnimator, currentTime: number): void {
  animator.state = 'visible';
  animator.startTime = currentTime;
  animator.elapsed = 0;
}

export function hideLivesMoneyDisplay(animator: LivesMoneyDisplayAnimator, currentTime: number): void {
  animator.state = 'hidden';
  animator.startTime = currentTime;
  animator.elapsed = 0;
}

export function isLivesMoneyDisplayVisible(animator: LivesMoneyDisplayAnimator): boolean {
  return animator.state === 'visible';
}

export function updateLivesMoneyDisplay(
  animator: LivesMoneyDisplayAnimator,
  deltaTime: number,
  currentTime: number
): void {
  if (animator.state === 'hidden') {
    animator.opacity = 0;
    return;
  }

  animator.elapsed += deltaTime;

  if (animator.elapsed < LIVES_MONEY_ANIMATION_TIMES.fadeInDuration) {
    const t = animator.elapsed / LIVES_MONEY_ANIMATION_TIMES.fadeInDuration;
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

export function getLivesDisplayRenderData(
  position: Vec2,
  currentLives: number,
  maxLives: number,
  opacity: number
): LivesDisplay {
  const LIVES_WIDTH = 70;
  const LIVES_HEIGHT = 30;
  const LIVES_OFFSET_X = 0;

  return {
    position: { x: position.x + LIVES_OFFSET_X, y: position.y },
    size: { width: LIVES_WIDTH, height: LIVES_HEIGHT },
    currentLives,
    maxLives,
    livesText: `${currentLives}`,
    opacity,
    fillColor: LIVES_MONEY_STYLES.livesFillColor,
    backgroundColor: LIVES_MONEY_STYLES.livesBackgroundColor,
    borderColor: LIVES_MONEY_STYLES.border,
    borderWidth: LIVES_MONEY_STYLES.borderWidth,
  };
}

export function getMoneyDisplayRenderData(
  position: Vec2,
  currentMoney: number,
  opacity: number
): MoneyDisplay {
  const MONEY_WIDTH = 90;
  const MONEY_HEIGHT = 30;
  const MONEY_OFFSET_X = 80;

  return {
    position: { x: position.x + MONEY_OFFSET_X, y: position.y },
    size: { width: MONEY_WIDTH, height: MONEY_HEIGHT },
    currentMoney,
    moneyText: `$${currentMoney}`,
    opacity,
    fillColor: LIVES_MONEY_STYLES.moneyFillColor,
    backgroundColor: LIVES_MONEY_STYLES.moneyBackgroundColor,
    borderColor: LIVES_MONEY_STYLES.border,
    borderWidth: LIVES_MONEY_STYLES.borderWidth,
  };
}

export function getLivesMoneyDisplayRenderData(
  animator: LivesMoneyDisplayAnimator,
  options?: {
    currentLives?: number;
    maxLives?: number;
    currentMoney?: number;
  }
): LivesMoneyDisplayRenderData {
  const position = getLivesMoneyPosition();
  const size = getLivesMoneySize();
  const currentLives = options?.currentLives ?? 20;
  const maxLives = options?.maxLives ?? 20;
  const currentMoney = options?.currentMoney ?? 0;

  if (animator.state === 'hidden') {
    return {
      state: LivesMoneyDisplayState.Hidden,
      isVisible: false,
      position,
      size,
      lives: getLivesDisplayRenderData(position, currentLives, maxLives, 0),
      money: getMoneyDisplayRenderData(position, currentMoney, 0),
      elapsed: 0,
    };
  }

  let opacity = 1;
  if (animator.elapsed < LIVES_MONEY_ANIMATION_TIMES.fadeInDuration) {
    const t = animator.elapsed / LIVES_MONEY_ANIMATION_TIMES.fadeInDuration;
    opacity = easeOutCubic(t);
  }

  return {
    state: LivesMoneyDisplayState.Visible,
    isVisible: true,
    position,
    size,
    lives: getLivesDisplayRenderData(position, currentLives, maxLives, opacity),
    money: getMoneyDisplayRenderData(position, currentMoney, opacity),
    elapsed: animator.elapsed,
  };
}

export function getLivesMoneyDisplayStateLabel(state: LivesMoneyDisplayState): string {
  switch (state) {
    case LivesMoneyDisplayState.Hidden:
      return 'Hidden';
    case LivesMoneyDisplayState.Visible:
      return 'Visible';
  }
}

export function getLivesDisplayColors(): { fill: string; background: string; border: string } {
  return {
    fill: LIVES_MONEY_STYLES.livesFillColor,
    background: LIVES_MONEY_STYLES.livesBackgroundColor,
    border: LIVES_MONEY_STYLES.border,
  };
}

export function getMoneyDisplayColors(): { fill: string; background: string; border: string } {
  return {
    fill: LIVES_MONEY_STYLES.moneyFillColor,
    background: LIVES_MONEY_STYLES.moneyBackgroundColor,
    border: LIVES_MONEY_STYLES.border,
  };
}

export function getLivesMoneyDisplayBackgroundStyle(): string {
  return LIVES_MONEY_STYLES.background;
}

export function getLivesMoneyDisplayBorderStyle(): string {
  return LIVES_MONEY_STYLES.border;
}

export function getLivesMoneyDisplayTextColor(): string {
  return LIVES_MONEY_STYLES.textColor;
}

export function getLivesMoneyDisplayLivesLabelColor(): string {
  return LIVES_MONEY_STYLES.livesLabelColor;
}

export function getLivesMoneyDisplayMoneyLabelColor(): string {
  return LIVES_MONEY_STYLES.moneyLabelColor;
}

export function resetLivesMoneyDisplayAnimator(animator: LivesMoneyDisplayAnimator): void {
  animator.state = 'hidden';
  animator.startTime = 0;
  animator.elapsed = 0;
  animator.opacity = 0;
}

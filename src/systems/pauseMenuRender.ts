import { Vec2 } from '../utils/vec2';
import { GameState } from './gameRunner';

export enum PauseMenuState {
  Hidden = 'hidden',
  Entering = 'entering',
  Visible = 'visible',
  Exiting = 'exiting',
}

export interface PauseMenuButton {
  id: string;
  label: string;
  position: Vec2;
  size: { width: number; height: number };
  isEnabled: boolean;
  isVisible: boolean;
  opacity: number;
}

export interface PauseMenuRenderData {
  state: PauseMenuState;
  isVisible: boolean;
  position: Vec2;
  size: { width: number; height: number };
  backgroundColor: string;
  backgroundOpacity: number;
  borderColor: string;
  borderWidth: number;
  title: string;
  titleColor: string;
  titlePosition: Vec2;
  subtitle: string;
  subtitleColor: string;
  subtitlePosition: Vec2;
  buttons: PauseMenuButton[];
  elapsed: number;
  progress: number;
  timeRemaining: number;
}

export interface PauseMenuUIState {
  isVisible: boolean;
  canResume: boolean;
  canRestart: boolean;
  canQuit: boolean;
  currentWave: number;
  totalWaves: number;
  gameState: GameState;
}

const PAUSE_MENU_ANIMATION_TIMES = {
  fadeInDuration: 200,
  holdDuration: 0,
  fadeOutDuration: 200,
  totalDuration: 400,
};

const PAUSE_MENU_STYLES = {
  background: 'rgba(0, 0, 0, 0.9)',
  border: '#FFD700',
  titleColor: '#FFFFFF',
  subtitleColor: '#CCCCCC',
  buttonBackground: 'rgba(50, 50, 50, 0.9)',
  buttonHoverBackground: 'rgba(70, 70, 70, 0.95)',
  buttonDisabledBackground: 'rgba(30, 30, 30, 0.7)',
  buttonBorder: '#666666',
  buttonHoverBorder: '#FFD700',
  buttonTextColor: '#FFFFFF',
  buttonDisabledTextColor: '#666666',
};

const DEFAULT_MENU_SIZE = { width: 400, height: 420 };
const TITLE_OFFSET_Y = -100;
const SUBTITLE_OFFSET_Y = -60;
const BUTTON_START_Y = -20;
const BUTTON_SPACING = 50;
const BUTTON_WIDTH = 200;
const BUTTON_HEIGHT = 40;

export function getPauseMenuPosition(): Vec2 {
  return { x: 400, y: 300 };
}

export function getPauseMenuSize(): { width: number; height: number } {
  return { ...DEFAULT_MENU_SIZE };
}

export function createPauseMenuAnimator(): PauseMenuAnimator {
  return {
    state: 'hidden',
    startTime: 0,
    elapsed: 0,
    progress: 0,
  };
}

export interface PauseMenuAnimator {
  state: 'hidden' | 'entering' | 'visible' | 'exiting';
  startTime: number;
  elapsed: number;
  progress: number;
}

export function showPauseMenu(animator: PauseMenuAnimator, currentTime: number): void {
  animator.state = 'entering';
  animator.startTime = currentTime;
  animator.elapsed = 0;
  animator.progress = 0;
}

export function hidePauseMenu(animator: PauseMenuAnimator, currentTime: number): void {
  if (animator.state === 'hidden') return;
  animator.state = 'exiting';
  animator.startTime = currentTime;
  animator.elapsed = 0;
  animator.progress = 0;
}

export function isPauseMenuVisible(animator: PauseMenuAnimator): boolean {
  return animator.state === 'entering' || animator.state === 'visible' || animator.state === 'exiting';
}

export function getPauseMenuUIState(gameState: GameState): PauseMenuUIState {
  const isVisible = gameState === GameState.Paused;
  
  return {
    isVisible,
    canResume: gameState === GameState.Paused,
    canRestart: gameState === GameState.Paused || gameState === GameState.GameOver || gameState === GameState.Victory,
    canQuit: true,
    currentWave: 0,
    totalWaves: 10,
    gameState,
  };
}

export function updatePauseMenu(
  animator: PauseMenuAnimator,
  deltaTime: number,
  currentTime: number
): void {
  if (animator.state === 'hidden') {
    return;
  }

  animator.elapsed += deltaTime;
  animator.progress = Math.min(1, animator.elapsed / PAUSE_MENU_ANIMATION_TIMES.totalDuration);

  if (animator.state === 'entering') {
    if (animator.elapsed >= PAUSE_MENU_ANIMATION_TIMES.fadeInDuration) {
      animator.state = 'visible';
    }
  }

  if (animator.state === 'exiting') {
    if (animator.elapsed >= PAUSE_MENU_ANIMATION_TIMES.fadeOutDuration) {
      animator.state = 'hidden';
    }
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t: number): number {
  return t * t * t;
}

export function getPauseMenuButtonRenderData(
  id: string,
  label: string,
  position: Vec2,
  isEnabled: boolean,
  isVisible: boolean,
  opacity: number,
  isHovered: boolean = false
): PauseMenuButton {
  return {
    id,
    label,
    position,
    size: { width: BUTTON_WIDTH, height: BUTTON_HEIGHT },
    isEnabled,
    isVisible,
    opacity,
  };
}

export function getPauseMenuRenderData(
  animator: PauseMenuAnimator,
  options?: {
    title?: string;
    subtitle?: string;
    currentWave?: number;
    totalWaves?: number;
    hoveredButtonId?: string;
  }
): PauseMenuRenderData {
  const position = getPauseMenuPosition();
  const size = getPauseMenuSize();
  const title = options?.title ?? 'Game Paused';
  const subtitle = options?.subtitle ?? '';
  const currentWave = options?.currentWave ?? 1;
  const totalWaves = options?.totalWaves ?? 10;

  if (animator.state === 'hidden') {
    return {
      state: PauseMenuState.Hidden,
      isVisible: false,
      position,
      size,
      backgroundColor: 'transparent',
      backgroundOpacity: 0,
      borderColor: 'transparent',
      borderWidth: 0,
      title,
      titleColor: 'transparent',
      titlePosition: { x: position.x, y: position.y + TITLE_OFFSET_Y },
      subtitle,
      subtitleColor: 'transparent',
      subtitlePosition: { x: position.x, y: position.y + SUBTITLE_OFFSET_Y },
      buttons: [],
      elapsed: 0,
      progress: 0,
      timeRemaining: 0,
    };
  }

  let backgroundOpacity = 1;
  let borderOpacity = 1;
  let titleOpacity = 1;
  let subtitleOpacity = 1;
  let buttonOpacity = 1;

  if (animator.state === 'entering') {
    const t = animator.elapsed / PAUSE_MENU_ANIMATION_TIMES.fadeInDuration;
    const easedT = easeOutCubic(t);
    backgroundOpacity = easedT;
    borderOpacity = easedT;
    titleOpacity = easedT;
    subtitleOpacity = easedT;
    buttonOpacity = easedT;
  }

  if (animator.state === 'exiting') {
    const t = animator.elapsed / PAUSE_MENU_ANIMATION_TIMES.fadeOutDuration;
    const easedT = easeInCubic(t);
    backgroundOpacity = 1 - easedT;
    borderOpacity = 1 - easedT;
    titleOpacity = 1 - easedT;
    subtitleOpacity = 1 - easedT;
    buttonOpacity = 1 - easedT;
  }

  const buttons: PauseMenuButton[] = [];
  const buttonLabels = ['Resume', 'Restart', 'Quit'];
  const buttonIds = ['resume', 'restart', 'quit'];

  for (let i = 0; i < buttonLabels.length; i++) {
    const y = position.y + BUTTON_START_Y + i * BUTTON_SPACING;
    const btnPos: Vec2 = { x: position.x, y };
    
    buttons.push(getPauseMenuButtonRenderData(
      buttonIds[i],
      buttonLabels[i],
      btnPos,
      true,
      true,
      buttonOpacity
    ));
  }

  return {
    state: animator.state === 'entering' ? PauseMenuState.Entering :
           animator.state === 'visible' ? PauseMenuState.Visible :
           animator.state === 'exiting' ? PauseMenuState.Exiting :
           PauseMenuState.Hidden,
    isVisible: isPauseMenuVisible(animator),
    position,
    size,
    backgroundColor: PAUSE_MENU_STYLES.background,
    backgroundOpacity,
    borderColor: PAUSE_MENU_STYLES.border,
    borderWidth: 2,
    title,
    titleColor: PAUSE_MENU_STYLES.titleColor,
    titlePosition: { x: position.x, y: position.y + TITLE_OFFSET_Y },
    subtitle: subtitle || `Wave ${currentWave} / ${totalWaves}`,
    subtitleColor: PAUSE_MENU_STYLES.subtitleColor,
    subtitlePosition: { x: position.x, y: position.y + SUBTITLE_OFFSET_Y },
    buttons,
    elapsed: animator.elapsed,
    progress: animator.progress,
    timeRemaining: Math.max(0, PAUSE_MENU_ANIMATION_TIMES.totalDuration - animator.elapsed),
  };
}

export function isPauseMenuEntering(animator: PauseMenuAnimator): boolean {
  return animator.state === 'entering';
}

export function isPauseMenuExiting(animator: PauseMenuAnimator): boolean {
  return animator.state === 'exiting';
}

export function isPauseMenuFullyVisible(animator: PauseMenuAnimator): boolean {
  return animator.state === 'visible';
}

export function resetPauseMenuAnimator(animator: PauseMenuAnimator): void {
  animator.state = 'hidden';
  animator.startTime = 0;
  animator.elapsed = 0;
  animator.progress = 0;
}

export function getPauseMenuButtonAtPosition(
  x: number,
  y: number,
  renderData: PauseMenuRenderData
): string | null {
  if (!renderData.isVisible || renderData.buttons.length === 0) {
    return null;
  }

  for (const button of renderData.buttons) {
    if (!button.isVisible || !button.isEnabled) {
      continue;
    }
    const left = button.position.x - button.size.width / 2;
    const right = button.position.x + button.size.width / 2;
    const top = button.position.y - button.size.height / 2;
    const bottom = button.position.y + button.size.height / 2;

    if (x >= left && x <= right && y >= top && y <= bottom) {
      return button.id;
    }
  }

  return null;
}
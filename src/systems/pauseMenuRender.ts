import { Vec2 } from '../utils/vec2';
import { GameState } from './gameRunner';
import { RELEASE_HUD_LAYOUT } from './releaseHudLayout';
import {
  PAUSE_MENU_ANIMATION_TIMES,
  easeInCubic,
  easeOutCubic,
  isPauseMenuVisible,
  type PauseMenuAnimator,
} from './pauseMenuAnimation';
export {
  createPauseMenuAnimator,
  hidePauseMenu,
  isPauseMenuEntering,
  isPauseMenuExiting,
  isPauseMenuFullyVisible,
  isPauseMenuVisible,
  resetPauseMenuAnimator,
  showPauseMenu,
  updatePauseMenu,
  type PauseMenuAnimator,
} from './pauseMenuAnimation';
export { getPauseMenuButtonAtPosition } from './pauseMenuHitTest';

export const PauseMenuState = Object.freeze({
  Hidden: 'hidden',
  Entering: 'entering',
  Visible: 'visible',
  Exiting: 'exiting',
} as const);

export type PauseMenuState = typeof PauseMenuState[keyof typeof PauseMenuState];

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
export type PauseAudioSettings = Readonly<{
  musicVolume: number;
  soundVolume: number;
  musicMuted: boolean;
}>;

export function getPauseAudioSettings(
  musicVolume: number,
  soundVolume: number,
  musicMuted: boolean,
): PauseAudioSettings {
  return Object.freeze({
    musicVolume: Math.max(0, Math.min(1, musicVolume)),
    soundVolume: Math.max(0, Math.min(1, soundVolume)),
    musicMuted,
  });
}

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

const TITLE_OFFSET_Y = -100;
const SUBTITLE_OFFSET_Y = -60;
const BUTTON_START_Y = -20;
const BUTTON_SPACING = 50;
const BUTTON_WIDTH = 200;
const BUTTON_HEIGHT = 40;

export function getPauseMenuPosition(): Vec2 {
  const { pausePanel } = RELEASE_HUD_LAYOUT;
  return {
    x: pausePanel.x + pausePanel.width / 2,
    y: pausePanel.y + pausePanel.height / 2,
  };
}

export function getPauseMenuSize(): { width: number; height: number } {
  return {
    width: RELEASE_HUD_LAYOUT.pausePanel.width,
    height: RELEASE_HUD_LAYOUT.pausePanel.height,
  };
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

type PauseMenuButtonOptions = Readonly<Omit<PauseMenuButton, 'size'>>;

export function getPauseMenuButtonRenderData(options: PauseMenuButtonOptions): PauseMenuButton {
  return {
    id: options.id,
    label: options.label,
    position: options.position,
    size: { width: BUTTON_WIDTH, height: BUTTON_HEIGHT },
    isEnabled: options.isEnabled,
    isVisible: options.isVisible,
    opacity: options.opacity,
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
  const buttonLabels = ['Resume', 'Restart', 'Quit to Menu'];
  const buttonIds = ['resume', 'restart', 'quit'];

  for (let i = 0; i < buttonLabels.length; i++) {
    const y = position.y + BUTTON_START_Y + i * BUTTON_SPACING;
    const btnPos: Vec2 = { x: position.x, y };
    
    buttons.push(getPauseMenuButtonRenderData({
      id: buttonIds[i],
      label: buttonLabels[i],
      position: btnPos,
      isEnabled: true,
      isVisible: true,
      opacity: buttonOpacity,
    }));
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

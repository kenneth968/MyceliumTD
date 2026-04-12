import { Vec2 } from '../utils/vec2';
import { GameState } from './gameRunner';

export enum GameOverVictoryState {
  Hidden = 'hidden',
  GameOver = 'game_over',
  Victory = 'victory',
}

export interface GameOverVictoryButton {
  id: string;
  label: string;
  position: Vec2;
  size: { width: number; height: number };
  isEnabled: boolean;
  isVisible: boolean;
  opacity: number;
}

export interface GameOverVictoryRenderData {
  state: GameOverVictoryState;
  isVisible: boolean;
  position: Vec2;
  size: { width: number; height: number };
  backgroundColor: string;
  backgroundOpacity: number;
  borderColor: string;
  borderWidth: number;
  title: string;
  titleColor: string;
  titleOpacity: number;
  titlePosition: Vec2;
  subtitle: string;
  subtitleColor: string;
  subtitleOpacity: number;
  subtitlePosition: Vec2;
  finalScore: number;
  finalWave: number;
  buttons: GameOverVictoryButton[];
  elapsed: number;
  progress: number;
  timeRemaining: number;
}

export interface GameOverVictoryUIState {
  isVisible: boolean;
  canRestart: boolean;
  canQuit: boolean;
  gameState: GameState;
  finalScore: number;
  finalWave: number;
}

const GAME_OVER_VICTORY_ANIMATION_TIMES = {
  fadeInDuration: 500,
  holdDuration: 3000,
  fadeOutDuration: 500,
  totalDuration: 4000,
};

const GAME_OVER_VICTORY_STYLES = {
  gameOver: {
    background: 'rgba(40, 0, 0, 0.95)',
    border: '#FF4444',
    titleColor: '#FF4444',
    subtitleColor: '#CCCCCC',
  },
  victory: {
    background: 'rgba(0, 40, 0, 0.95)',
    border: '#44FF44',
    titleColor: '#44FF44',
    subtitleColor: '#CCCCCC',
  },
  buttonBackground: 'rgba(50, 50, 50, 0.9)',
  buttonHoverBackground: 'rgba(70, 70, 70, 0.95)',
  buttonDisabledBackground: 'rgba(30, 30, 30, 0.7)',
  buttonBorder: '#666666',
  buttonHoverBorder: '#FFD700',
  buttonTextColor: '#FFFFFF',
  buttonDisabledTextColor: '#666666',
};

const DEFAULT_SCREEN_SIZE = { width: 500, height: 400 };
const TITLE_OFFSET_Y = -120;
const SUBTITLE_OFFSET_Y = -70;
const SCORE_OFFSET_Y = -20;
const BUTTON_START_Y = 40;
const BUTTON_SPACING = 60;
const BUTTON_WIDTH = 180;
const BUTTON_HEIGHT = 45;

export function getGameOverVictoryPosition(): Vec2 {
  return { x: 400, y: 300 };
}

export function getGameOverVictorySize(): { width: number; height: number } {
  return { ...DEFAULT_SCREEN_SIZE };
}

export function createGameOverVictoryAnimator(): GameOverVictoryAnimator {
  return {
    state: 'hidden',
    startTime: 0,
    elapsed: 0,
    progress: 0,
    finalScore: 0,
    finalWave: 0,
  };
}

export interface GameOverVictoryAnimator {
  state: 'hidden' | 'game_over' | 'victory';
  startTime: number;
  elapsed: number;
  progress: number;
  finalScore: number;
  finalWave: number;
}

export function showGameOver(animator: GameOverVictoryAnimator, finalScore: number, finalWave: number, currentTime: number): void {
  animator.state = 'game_over';
  animator.startTime = currentTime;
  animator.elapsed = 0;
  animator.progress = 0;
  animator.finalScore = finalScore;
  animator.finalWave = finalWave;
}

export function showVictory(animator: GameOverVictoryAnimator, finalScore: number, finalWave: number, currentTime: number): void {
  animator.state = 'victory';
  animator.startTime = currentTime;
  animator.elapsed = 0;
  animator.progress = 0;
  animator.finalScore = finalScore;
  animator.finalWave = finalWave;
}

export function hideGameOverVictory(animator: GameOverVictoryAnimator, currentTime: number): void {
  if (animator.state === 'hidden') return;
  animator.state = 'hidden';
  animator.startTime = currentTime;
  animator.elapsed = 0;
  animator.progress = 0;
}

export function isGameOverVictoryVisible(animator: GameOverVictoryAnimator): boolean {
  return animator.state === 'game_over' || animator.state === 'victory';
}

export function getGameOverVictoryUIState(gameState: GameState, finalScore: number, finalWave: number): GameOverVictoryUIState {
  const isVisible = gameState === GameState.GameOver || gameState === GameState.Victory;
  
  return {
    isVisible,
    canRestart: true,
    canQuit: true,
    gameState,
    finalScore,
    finalWave,
  };
}

export function updateGameOverVictory(
  animator: GameOverVictoryAnimator,
  deltaTime: number,
  currentTime: number
): void {
  if (animator.state === 'hidden') {
    return;
  }

  animator.elapsed += deltaTime;
  animator.progress = Math.min(1, animator.elapsed / GAME_OVER_VICTORY_ANIMATION_TIMES.totalDuration);

  if (animator.elapsed >= GAME_OVER_VICTORY_ANIMATION_TIMES.totalDuration) {
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t: number): number {
  return t * t * t;
}

export function getGameOverVictoryButtonRenderData(
  id: string,
  label: string,
  position: Vec2,
  isEnabled: boolean,
  isVisible: boolean,
  opacity: number,
  isHovered: boolean = false
): GameOverVictoryButton {
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

export function getGameOverVictoryRenderData(
  animator: GameOverVictoryAnimator,
  options?: {
    title?: string;
    subtitle?: string;
    finalScore?: number;
    finalWave?: number;
    hoveredButtonId?: string;
  }
): GameOverVictoryRenderData {
  const position = getGameOverVictoryPosition();
  const size = getGameOverVictorySize();
  
  const isGameOver = animator.state === 'game_over';
  const isVictory = animator.state === 'victory';
  
  const title = options?.title ?? (isGameOver ? 'Game Over' : isVictory ? 'Victory!' : '');
  const subtitle = options?.subtitle ?? (isGameOver ? 'You ran out of lives!' : isVictory ? 'You survived all waves!' : '');
  const finalScore = options?.finalScore ?? animator.finalScore;
  const finalWave = options?.finalWave ?? animator.finalWave;

  if (animator.state === 'hidden') {
    return {
      state: GameOverVictoryState.Hidden,
      isVisible: false,
      position,
      size,
      backgroundColor: 'transparent',
      backgroundOpacity: 0,
      borderColor: 'transparent',
      borderWidth: 0,
      title,
      titleColor: 'transparent',
      titleOpacity: 0,
      titlePosition: { x: position.x, y: position.y + TITLE_OFFSET_Y },
      subtitle,
      subtitleColor: 'transparent',
      subtitleOpacity: 0,
      subtitlePosition: { x: position.x, y: position.y + SUBTITLE_OFFSET_Y },
      finalScore,
      finalWave,
      buttons: [],
      elapsed: 0,
      progress: 0,
      timeRemaining: 0,
    };
  }

  const styles = isGameOver ? GAME_OVER_VICTORY_STYLES.gameOver : GAME_OVER_VICTORY_STYLES.victory;

  let backgroundOpacity = 1;
  let borderOpacity = 1;
  let titleOpacity = 1;
  let subtitleOpacity = 1;
  let buttonOpacity = 1;
  let scale = 1;

  if (animator.elapsed < GAME_OVER_VICTORY_ANIMATION_TIMES.fadeInDuration) {
    const t = animator.elapsed / GAME_OVER_VICTORY_ANIMATION_TIMES.fadeInDuration;
    const easedT = easeOutCubic(t);
    backgroundOpacity = easedT;
    borderOpacity = easedT;
    titleOpacity = easedT;
    subtitleOpacity = easedT;
    buttonOpacity = easedT;
    scale = 0.5 + 0.5 * easedT;
  } else if (animator.elapsed < GAME_OVER_VICTORY_ANIMATION_TIMES.fadeInDuration + GAME_OVER_VICTORY_ANIMATION_TIMES.holdDuration) {
    backgroundOpacity = 1;
    borderOpacity = 1;
    titleOpacity = 1;
    subtitleOpacity = 1;
    buttonOpacity = 1;
    scale = 1;
  } else if (animator.elapsed < GAME_OVER_VICTORY_ANIMATION_TIMES.totalDuration) {
    const fadeOutStart = GAME_OVER_VICTORY_ANIMATION_TIMES.fadeInDuration + GAME_OVER_VICTORY_ANIMATION_TIMES.holdDuration;
    const t = (animator.elapsed - fadeOutStart) / GAME_OVER_VICTORY_ANIMATION_TIMES.fadeOutDuration;
    const easedT = easeInCubic(t);
    backgroundOpacity = 1 - easedT;
    borderOpacity = 1 - easedT;
    titleOpacity = 1 - easedT;
    subtitleOpacity = 1 - easedT;
    buttonOpacity = 1 - easedT;
    scale = 1;
  } else {
    backgroundOpacity = 0;
    borderOpacity = 0;
    titleOpacity = 0;
    subtitleOpacity = 0;
    buttonOpacity = 0;
    scale = 1;
  }

  const buttons: GameOverVictoryButton[] = [];
  const buttonLabels = ['Restart', 'Quit'];
  const buttonIds = ['restart', 'quit'];

  for (let i = 0; i < buttonLabels.length; i++) {
    const y = position.y + BUTTON_START_Y + i * BUTTON_SPACING;
    const btnPos: Vec2 = { x: position.x, y };
    
    buttons.push(getGameOverVictoryButtonRenderData(
      buttonIds[i],
      buttonLabels[i],
      btnPos,
      true,
      true,
      buttonOpacity
    ));
  }

  return {
    state: isGameOver ? GameOverVictoryState.GameOver : isVictory ? GameOverVictoryState.Victory : GameOverVictoryState.Hidden,
    isVisible: isGameOver || isVictory,
    position,
    size,
    backgroundColor: styles.background,
    backgroundOpacity: Math.max(0, Math.min(1, backgroundOpacity)),
    borderColor: styles.border,
    borderWidth: 3,
    title,
    titleColor: styles.titleColor,
    titleOpacity: Math.max(0, Math.min(1, titleOpacity)),
    titlePosition: { x: position.x, y: position.y + TITLE_OFFSET_Y },
    subtitle,
    subtitleColor: styles.subtitleColor,
    subtitleOpacity: Math.max(0, Math.min(1, subtitleOpacity)),
    subtitlePosition: { x: position.x, y: position.y + SUBTITLE_OFFSET_Y },
    finalScore,
    finalWave,
    buttons,
    elapsed: animator.elapsed,
    progress: animator.progress,
    timeRemaining: Math.max(0, GAME_OVER_VICTORY_ANIMATION_TIMES.totalDuration - animator.elapsed),
  };
}

export function getGameOverVictoryScoreText(finalScore: number): string {
  return `Final Score: ${finalScore}`;
}

export function getGameOverVictoryWaveText(finalWave: number): string {
  return `Reached Wave: ${finalWave}`;
}

export function isGameOverShowing(animator: GameOverVictoryAnimator): boolean {
  return animator.state === 'game_over';
}

export function isVictoryShowing(animator: GameOverVictoryAnimator): boolean {
  return animator.state === 'victory';
}

export function resetGameOverVictoryAnimator(animator: GameOverVictoryAnimator): void {
  animator.state = 'hidden';
  animator.startTime = 0;
  animator.elapsed = 0;
  animator.progress = 0;
  animator.finalScore = 0;
  animator.finalWave = 0;
}

export function getGameOverVictoryButtonAtPosition(
  renderData: GameOverVictoryRenderData,
  x: number,
  y: number
): GameOverVictoryButton | null {
  for (const button of renderData.buttons) {
    if (
      x >= button.position.x - button.size.width / 2 &&
      x <= button.position.x + button.size.width / 2 &&
      y >= button.position.y - button.size.height / 2 &&
      y <= button.position.y + button.size.height / 2
    ) {
      return button;
    }
  }
  return null;
}

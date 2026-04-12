import { Vec2 } from '../utils/vec2';
import { WaveControlState } from './waveControls';

export enum WaveProgressState {
  Hidden = 'hidden',
  Idle = 'idle',
  Active = 'active',
  Paused = 'paused',
  Complete = 'complete',
  GameOver = 'game_over',
  Victory = 'victory',
}

export interface WaveProgressBar {
  position: Vec2;
  size: { width: number; height: number };
  progress: number;
  fillColor: string;
  backgroundColor: string;
  borderColor: string;
  borderWidth: number;
  opacity: number;
}

export interface WaveProgressRenderData {
  state: WaveProgressState;
  isVisible: boolean;
  position: Vec2;
  size: { width: number; height: number };
  currentWave: number;
  totalWaves: number;
  enemiesTotal: number;
  enemiesDefeated: number;
  enemiesRemaining: number;
  progress: number;
  waveText: string;
  progressText: string;
  bar: WaveProgressBar;
  elapsed: number;
  timeRemaining: number;
  isFastForward: boolean;
}

const WAVE_PROGRESS_STYLES = {
  background: 'rgba(20, 20, 20, 0.8)',
  border: '#FFD700',
  textColor: '#FFFFFF',
  subtextColor: '#CCCCCC',
  barFill: '#4CAF50',
  barBackground: 'rgba(50, 50, 50, 0.8)',
  barBorder: '#666666',
  fastForwardAccent: '#FF5722',
};

const WAVE_PROGRESS_ANIMATION_TIMES = {
  fadeInDuration: 150,
  fadeOutDuration: 150,
  totalDuration: 300,
};

const DEFAULT_WAVE_PROGRESS_SIZE = { width: 200, height: 60 };
const WAVE_TEXT_OFFSET_Y = -15;
const PROGRESS_TEXT_OFFSET_Y = 10;
const BAR_OFFSET_Y = 20;
const BAR_WIDTH = 160;
const BAR_HEIGHT = 12;

export function getWaveProgressPosition(): Vec2 {
  return { x: 400, y: 40 };
}

export function getWaveProgressSize(): { width: number; height: number } {
  return { ...DEFAULT_WAVE_PROGRESS_SIZE };
}

export function createWaveProgressAnimator(): WaveProgressAnimator {
  return {
    state: 'idle',
    startTime: 0,
    elapsed: 0,
    progress: 0,
  };
}

export interface WaveProgressAnimator {
  state: 'hidden' | 'idle' | 'active' | 'paused' | 'complete' | 'game_over' | 'victory';
  startTime: number;
  elapsed: number;
  progress: number;
}

export function showWaveProgress(animator: WaveProgressAnimator, currentTime: number): void {
  animator.state = 'active';
  animator.startTime = currentTime;
  animator.elapsed = 0;
  animator.progress = 0;
}

export function hideWaveProgress(animator: WaveProgressAnimator, currentTime: number): void {
  animator.state = 'hidden';
  animator.startTime = currentTime;
  animator.elapsed = 0;
  animator.progress = 0;
}

export function isWaveProgressVisible(animator: WaveProgressAnimator): boolean {
  return animator.state !== 'hidden';
}

export function updateWaveProgress(
  animator: WaveProgressAnimator,
  deltaTime: number,
  currentTime: number
): void {
  if (animator.state === 'hidden') {
    return;
  }

  animator.elapsed += deltaTime;
  animator.progress = Math.min(1, animator.elapsed / WAVE_PROGRESS_ANIMATION_TIMES.totalDuration);

  if (animator.state === 'active' || animator.state === 'paused') {
    if (animator.elapsed >= WAVE_PROGRESS_ANIMATION_TIMES.fadeInDuration) {
    }
  }
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeInCubic(t: number): number {
  return t * t * t;
}

export function getWaveProgressBarRenderData(
  position: Vec2,
  progress: number,
  opacity: number
): WaveProgressBar {
  return {
    position,
    size: { width: BAR_WIDTH, height: BAR_HEIGHT },
    progress: Math.max(0, Math.min(1, progress)),
    fillColor: WAVE_PROGRESS_STYLES.barFill,
    backgroundColor: WAVE_PROGRESS_STYLES.barBackground,
    borderColor: WAVE_PROGRESS_STYLES.barBorder,
    borderWidth: 1,
    opacity,
  };
}

export function getWaveProgressRenderData(
  animator: WaveProgressAnimator,
  options?: {
    currentWave?: number;
    totalWaves?: number;
    enemiesTotal?: number;
    enemiesDefeated?: number;
    enemiesRemaining?: number;
    isFastForward?: boolean;
  }
): WaveProgressRenderData {
  const position = getWaveProgressPosition();
  const size = getWaveProgressSize();
  const currentWave = options?.currentWave ?? 1;
  const totalWaves = options?.totalWaves ?? 10;
  const enemiesTotal = options?.enemiesTotal ?? 0;
  const enemiesDefeated = options?.enemiesDefeated ?? 0;
  const enemiesRemaining = options?.enemiesRemaining ?? 0;
  const isFastForward = options?.isFastForward ?? false;

  let state: WaveProgressState;
  switch (animator.state) {
    case 'hidden':
      state = WaveProgressState.Hidden;
      break;
    case 'idle':
      state = WaveProgressState.Idle;
      break;
    case 'active':
      state = WaveProgressState.Active;
      break;
    case 'paused':
      state = WaveProgressState.Paused;
      break;
    case 'complete':
      state = WaveProgressState.Complete;
      break;
    case 'game_over':
      state = WaveProgressState.GameOver;
      break;
    case 'victory':
      state = WaveProgressState.Victory;
      break;
    default:
      state = WaveProgressState.Hidden;
  }

  if (animator.state === 'hidden') {
    return {
      state: WaveProgressState.Hidden,
      isVisible: false,
      position,
      size,
      currentWave,
      totalWaves,
      enemiesTotal,
      enemiesDefeated,
      enemiesRemaining,
      progress: 0,
      waveText: '',
      progressText: '',
      bar: getWaveProgressBarRenderData(
        { x: position.x, y: position.y + BAR_OFFSET_Y },
        0,
        0
      ),
      elapsed: 0,
      timeRemaining: 0,
      isFastForward,
    };
  }

  let opacity = 1;

  if (animator.elapsed < WAVE_PROGRESS_ANIMATION_TIMES.fadeInDuration) {
    const t = animator.elapsed / WAVE_PROGRESS_ANIMATION_TIMES.fadeInDuration;
    opacity = easeOutCubic(t);
  }

  const progress = enemiesTotal > 0 ? enemiesDefeated / enemiesTotal : 0;
  const waveText = `Wave ${currentWave}/${totalWaves}`;
  const progressText = enemiesTotal > 0
    ? `${enemiesDefeated}/${enemiesTotal}`
    : `${enemiesRemaining} remaining`;

  return {
    state,
    isVisible: true,
    position,
    size,
    currentWave,
    totalWaves,
    enemiesTotal,
    enemiesDefeated,
    enemiesRemaining,
    progress,
    waveText,
    progressText,
    bar: getWaveProgressBarRenderData(
      { x: position.x, y: position.y + BAR_OFFSET_Y },
      progress,
      opacity
    ),
    elapsed: animator.elapsed,
    timeRemaining: Math.max(0, WAVE_PROGRESS_ANIMATION_TIMES.totalDuration - animator.elapsed),
    isFastForward,
  };
}

export function isWaveProgressActive(animator: WaveProgressAnimator): boolean {
  return animator.state === 'active';
}

export function isWaveProgressPaused(animator: WaveProgressAnimator): boolean {
  return animator.state === 'paused';
}

export function isWaveProgressComplete(animator: WaveProgressAnimator): boolean {
  return animator.state === 'complete';
}

export function resetWaveProgressAnimator(animator: WaveProgressAnimator): void {
  animator.state = 'idle';
  animator.startTime = 0;
  animator.elapsed = 0;
  animator.progress = 0;
}

export function getWaveProgressStateLabel(state: WaveProgressState): string {
  switch (state) {
    case WaveProgressState.Hidden:
      return '';
    case WaveProgressState.Idle:
      return 'Ready';
    case WaveProgressState.Active:
      return 'In Progress';
    case WaveProgressState.Paused:
      return 'Paused';
    case WaveProgressState.Complete:
      return 'Wave Complete';
    case WaveProgressState.GameOver:
      return 'Game Over';
    case WaveProgressState.Victory:
      return 'Victory!';
  }
}

export function getWaveProgressBarColors(isFastForward: boolean): { fill: string; border: string } {
  if (isFastForward) {
    return {
      fill: WAVE_PROGRESS_STYLES.fastForwardAccent,
      border: WAVE_PROGRESS_STYLES.fastForwardAccent,
    };
  }
  return {
    fill: WAVE_PROGRESS_STYLES.barFill,
    border: WAVE_PROGRESS_STYLES.barBorder,
  };
}

export function getWaveProgressTextPosition(waveProgressData: WaveProgressRenderData): Vec2 {
  return {
    x: waveProgressData.position.x,
    y: waveProgressData.position.y + WAVE_TEXT_OFFSET_Y,
  };
}

export function getWaveProgressSubtextPosition(waveProgressData: WaveProgressRenderData): Vec2 {
  return {
    x: waveProgressData.position.x,
    y: waveProgressData.position.y + PROGRESS_TEXT_OFFSET_Y,
  };
}

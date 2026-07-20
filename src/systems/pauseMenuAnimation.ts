export const PAUSE_MENU_ANIMATION_TIMES = Object.freeze({
  fadeInDuration: 200,
  fadeOutDuration: 200,
  totalDuration: 400,
} as const);

export interface PauseMenuAnimator {
  state: 'hidden' | 'entering' | 'visible' | 'exiting';
  startTime: number;
  elapsed: number;
  progress: number;
}

export function createPauseMenuAnimator(): PauseMenuAnimator {
  return { state: 'hidden', startTime: 0, elapsed: 0, progress: 0 };
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

export function updatePauseMenu(animator: PauseMenuAnimator, deltaTime: number, _currentTime: number): void {
  if (animator.state === 'hidden') return;
  animator.elapsed += deltaTime;
  animator.progress = Math.min(1, animator.elapsed / PAUSE_MENU_ANIMATION_TIMES.totalDuration);
  if (animator.state === 'entering' && animator.elapsed >= PAUSE_MENU_ANIMATION_TIMES.fadeInDuration) {
    animator.state = 'visible';
  }
  if (animator.state === 'exiting' && animator.elapsed >= PAUSE_MENU_ANIMATION_TIMES.fadeOutDuration) {
    animator.state = 'hidden';
  }
}

export function easeOutCubic(value: number): number { return 1 - Math.pow(1 - value, 3); }
export function easeInCubic(value: number): number { return value * value * value; }
export function isPauseMenuEntering(animator: PauseMenuAnimator): boolean { return animator.state === 'entering'; }
export function isPauseMenuExiting(animator: PauseMenuAnimator): boolean { return animator.state === 'exiting'; }
export function isPauseMenuFullyVisible(animator: PauseMenuAnimator): boolean { return animator.state === 'visible'; }

export function resetPauseMenuAnimator(animator: PauseMenuAnimator): void {
  animator.state = 'hidden';
  animator.startTime = 0;
  animator.elapsed = 0;
  animator.progress = 0;
}

import { Vec2 } from '../utils/vec2';
import { Wave } from './wave';

export enum WaveAnnouncementState {
  Hidden = 'hidden',
  Incoming = 'incoming',
  Active = 'active',
  Complete = 'complete',
  Outgoing = 'outgoing',
}

export interface WaveAnnouncementRenderData {
  state: WaveAnnouncementState;
  waveNumber: number;
  waveName: string;
  position: Vec2;
  opacity: number;
  scale: number;
  rotation: number;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  subtextColor: string;
  isVisible: boolean;
  progress: number;
  timeRemaining: number;
}

export interface WaveCompleteRenderData {
  waveNumber: number;
  waveName: string;
  position: Vec2;
  opacity: number;
  scale: number;
  backgroundColor: string;
  borderColor: string;
  textColor: string;
  bonusText: string;
  bonusAmount: number;
  isVisible: boolean;
  progress: number;
  timeRemaining: number;
}

export interface WaveUIAnnouncementRenderData {
  announcement: WaveAnnouncementRenderData;
  completion: WaveCompleteRenderData;
  isAnyVisible: boolean;
}

const WAVE_ANNOUNCEMENT_COLORS = {
  incoming: {
    background: 'rgba(0, 0, 0, 0.85)',
    border: '#FFD700',
    text: '#FFFFFF',
    subtext: '#FFD700',
  },
  active: {
    background: 'rgba(0, 0, 0, 0.7)',
    border: '#4CAF50',
    text: '#FFFFFF',
    subtext: '#4CAF50',
  },
  complete: {
    background: 'rgba(0, 0, 0, 0.85)',
    border: '#2196F3',
    text: '#FFFFFF',
    subtext: '#2196F3',
  },
};

const WAVE_ANIMATION_TIMES = {
  fadeInDuration: 500,
  holdDuration: 2000,
  fadeOutDuration: 500,
  totalDuration: 3200,
};

const WAVE_COMPLETE_ANIMATION_TIMES = {
  fadeInDuration: 400,
  holdDuration: 2500,
  fadeOutDuration: 400,
  totalDuration: 3300,
};

export function getWaveAnnouncementState(
  waveIndex: number,
  waveName: string,
  state: 'hidden' | 'announcing' | 'active' | 'completing'
): WaveAnnouncementRenderData {
  const basePosition: Vec2 = { x: 400, y: 200 };

  if (state === 'hidden') {
    return {
      state: WaveAnnouncementState.Hidden,
      waveNumber: waveIndex,
      waveName: waveName,
      position: basePosition,
      opacity: 0,
      scale: 0.5,
      rotation: 0,
      backgroundColor: 'transparent',
      borderColor: 'transparent',
      textColor: 'transparent',
      subtextColor: 'transparent',
      isVisible: false,
      progress: 0,
      timeRemaining: 0,
    };
  }

  const colors = state === 'announcing' ? WAVE_ANNOUNCEMENT_COLORS.incoming :
                 state === 'active' ? WAVE_ANNOUNCEMENT_COLORS.active :
                 WAVE_ANNOUNCEMENT_COLORS.complete;

  return {
    state: state === 'announcing' ? WaveAnnouncementState.Incoming :
           state === 'active' ? WaveAnnouncementState.Active :
           state === 'completing' ? WaveAnnouncementState.Complete :
           WaveAnnouncementState.Hidden,
    waveNumber: waveIndex,
    waveName: waveName,
    position: basePosition,
    opacity: 1,
    scale: 1,
    rotation: 0,
    backgroundColor: colors.background,
    borderColor: colors.border,
    textColor: colors.text,
    subtextColor: colors.subtext,
    isVisible: true,
    progress: 0,
    timeRemaining: WAVE_ANIMATION_TIMES.totalDuration,
  };
}

export function getWaveCompleteData(
  waveIndex: number,
  waveName: string,
  bonusAmount: number
): WaveCompleteRenderData {
  const basePosition: Vec2 = { x: 400, y: 250 };
  const colors = WAVE_ANNOUNCEMENT_COLORS.complete;

  return {
    waveNumber: waveIndex,
    waveName: waveName,
    position: basePosition,
    opacity: 1,
    scale: 1,
    backgroundColor: colors.background,
    borderColor: colors.border,
    textColor: colors.text,
    bonusText: 'Wave Complete!',
    bonusAmount: bonusAmount,
    isVisible: true,
    progress: 0,
    timeRemaining: WAVE_COMPLETE_ANIMATION_TIMES.totalDuration,
  };
}

export interface WaveAnnouncementAnimator {
  state: 'hidden' | 'announcing' | 'active' | 'completing';
  waveIndex: number;
  waveName: string;
  startTime: number;
  announcementElapsed: number;
  completionElapsed: number;
  announcementProgress: number;
  completionProgress: number;
  bonusAmount: number;
}

export function createWaveAnnouncementAnimator(): WaveAnnouncementAnimator {
  return {
    state: 'hidden',
    waveIndex: 0,
    waveName: '',
    startTime: 0,
    announcementElapsed: 0,
    completionElapsed: 0,
    announcementProgress: 0,
    completionProgress: 0,
    bonusAmount: 0,
  };
}

export function startWaveAnnouncement(
  animator: WaveAnnouncementAnimator,
  waveIndex: number,
  waveName: string,
  currentTime: number
): void {
  animator.state = 'announcing';
  animator.waveIndex = waveIndex;
  animator.waveName = waveName;
  animator.startTime = currentTime;
  animator.announcementElapsed = 0;
  animator.completionElapsed = 0;
  animator.announcementProgress = 0;
  animator.completionProgress = 0;
}

export function triggerWaveCompletion(
  animator: WaveAnnouncementAnimator,
  bonusAmount: number,
  currentTime: number
): void {
  if (animator.state !== 'active' && animator.state !== 'announcing') {
    return;
  }
  animator.state = 'completing';
  animator.bonusAmount = bonusAmount;
  animator.startTime = currentTime;
  animator.completionElapsed = 0;
  animator.completionProgress = 0;
}

export function updateWaveAnnouncement(
  animator: WaveAnnouncementAnimator,
  deltaTime: number,
  currentTime: number
): void {
  if (animator.state === 'hidden') {
    return;
  }

  if (animator.state === 'announcing' || animator.state === 'active') {
    animator.announcementElapsed += deltaTime;
    animator.announcementProgress = Math.min(1, animator.announcementElapsed / WAVE_ANIMATION_TIMES.totalDuration);

    if (animator.announcementElapsed >= WAVE_ANIMATION_TIMES.totalDuration) {
      animator.state = 'active';
    }
  }

  if (animator.state === 'completing') {
    animator.completionElapsed += deltaTime;
    animator.completionProgress = Math.min(1, animator.completionElapsed / WAVE_COMPLETE_ANIMATION_TIMES.totalDuration);

    if (animator.completionElapsed >= WAVE_COMPLETE_ANIMATION_TIMES.totalDuration) {
      animator.state = 'hidden';
    }
  }
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function getAnimatedWaveAnnouncement(animator: WaveAnnouncementAnimator): WaveAnnouncementRenderData {
  const baseData = getWaveAnnouncementState(animator.waveIndex, animator.waveName, animator.state);

  if (animator.state === 'hidden') {
    return baseData;
  }

  const elapsed = animator.announcementElapsed;
  const { fadeInDuration, holdDuration, fadeOutDuration, totalDuration } = WAVE_ANIMATION_TIMES;

  let opacity = 1;
  let scale = 1;

  if (elapsed < fadeInDuration) {
    const t = elapsed / fadeInDuration;
    opacity = easeOutBack(t);
    scale = 0.5 + 0.5 * easeOutBack(t);
  } else if (elapsed < fadeInDuration + holdDuration) {
    opacity = 1;
    scale = 1;
  } else if (elapsed < totalDuration) {
    const t = (elapsed - fadeInDuration - holdDuration) / fadeOutDuration;
    opacity = 1 - easeInOutCubic(t);
    scale = 1;
  } else {
    opacity = 0;
    scale = 1;
  }

  baseData.opacity = Math.max(0, Math.min(1, opacity));
  baseData.scale = Math.max(0.5, Math.min(1.5, scale));
  baseData.progress = animator.announcementProgress;
  baseData.timeRemaining = Math.max(0, totalDuration - elapsed);

  if (animator.state === 'completing' || animator.state === 'active') {
    baseData.state = WaveAnnouncementState.Outgoing;
    baseData.isVisible = animator.announcementElapsed < totalDuration;
  }

  return baseData;
}

export function getAnimatedWaveComplete(animator: WaveAnnouncementAnimator): WaveCompleteRenderData {
  const baseData = getWaveCompleteData(animator.waveIndex, animator.waveName, animator.bonusAmount);

  if (animator.state !== 'completing') {
    baseData.isVisible = false;
    return baseData;
  }

  const elapsed = animator.completionElapsed;
  const { fadeInDuration, holdDuration, fadeOutDuration, totalDuration } = WAVE_COMPLETE_ANIMATION_TIMES;

  let opacity = 1;
  let scale = 1;

  if (elapsed < fadeInDuration) {
    const t = elapsed / fadeInDuration;
    opacity = easeOutBack(t);
    scale = 0.5 + 0.5 * easeOutBack(t);
  } else if (elapsed < fadeInDuration + holdDuration) {
    opacity = 1;
    scale = 1;
  } else if (elapsed < totalDuration) {
    const t = (elapsed - fadeInDuration - holdDuration) / fadeOutDuration;
    opacity = 1 - easeInOutCubic(t);
    scale = 1;
  } else {
    opacity = 0;
    scale = 1;
  }

  baseData.opacity = Math.max(0, Math.min(1, opacity));
  baseData.scale = Math.max(0.5, Math.min(1.5, scale));
  baseData.progress = animator.completionProgress;
  baseData.timeRemaining = Math.max(0, totalDuration - elapsed);
  baseData.isVisible = true;

  return baseData;
}

export function getWaveUIAnnouncementRenderData(
  animator: WaveAnnouncementAnimator
): WaveUIAnnouncementRenderData {
  const announcement = getAnimatedWaveAnnouncement(animator);
  const completion = getAnimatedWaveComplete(animator);

  return {
    announcement,
    completion,
    isAnyVisible: announcement.isVisible || completion.isVisible,
  };
}

export function isWaveAnnouncementActive(animator: WaveAnnouncementAnimator): boolean {
  return animator.state === 'announcing';
}

export function isWaveCompletionShowing(animator: WaveAnnouncementAnimator): boolean {
  return animator.state === 'completing';
}

export function hideWaveAnnouncement(animator: WaveAnnouncementAnimator): void {
  animator.state = 'hidden';
  animator.announcementElapsed = WAVE_ANIMATION_TIMES.totalDuration;
  animator.completionElapsed = WAVE_COMPLETE_ANIMATION_TIMES.totalDuration;
}

export function getWaveAnnouncementPosition(waveIndex: number, totalWaves: number): Vec2 {
  return { x: 400, y: 200 };
}

export function getWaveCompletePosition(waveIndex: number, totalWaves: number): Vec2 {
  return { x: 400, y: 250 };
}

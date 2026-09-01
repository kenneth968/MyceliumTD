import { VISUAL_THEME } from '../presentation/visualTheme';

export const RELEASE_PERFORMANCE_BUDGET = Object.freeze({
  sampleWindowMilliseconds: 10_000,
  minimumAverageFps: 55,
  sustainedDropFps: 45,
  sustainedDropMilliseconds: 2_000,
  maximumParticles: VISUAL_THEME.maxParticles,
  maximumTransientEffects: VISUAL_THEME.maxTransientEffects,
} as const);

export type PerformanceBudgetReport = Readonly<{
  currentFps: number;
  averageFps: number;
  hasSustainedDrop: boolean;
  isFullWindowReady: boolean;
  sampleCount: number;
  sampleDurationMilliseconds: number;
  activeParticles: number;
  activeTransientEffects: number;
  peakParticles: number;
  peakTransientEffects: number;
  passes: boolean;
}>;

export type PerformanceBudgetSample = Readonly<{
  timestampMilliseconds: number;
  paused: boolean;
  hidden: boolean;
  activeParticles: number;
  activeTransientEffects: number;
}>;

export type PerformanceEffectCounts = Readonly<{
  activeParticles: number;
  activeTransientEffects: number;
  peakParticles: number;
  peakTransientEffects: number;
}>;

export const EffectPriority = Object.freeze({
  Ambient: 0,
  Standard: 1,
  CombatCritical: 2,
} as const);

export type EffectPriority = typeof EffectPriority[keyof typeof EffectPriority];

export type EffectAdmissionSlot = Readonly<{
  active: boolean;
  priority: EffectPriority;
  admissionSequence: number;
}>;

export type PerformanceBudgetLocation = Readonly<{
  hostname: string;
  search: string;
}>;

export interface PerformanceBudgetHost {
  readonly location?: PerformanceBudgetLocation;
  myceliumPerformanceBudget?: () => PerformanceBudgetReport;
}

export type PerformanceOverlayData = PerformanceBudgetReport & Readonly<{
  interceptsPointerInput: false;
}>;

export type PerformanceOverlayKeyInput = Readonly<{
  key: string;
  shiftKey: boolean;
}>;

const EMPTY_EFFECT_COUNTS: PerformanceEffectCounts = Object.freeze({
  activeParticles: 0,
  activeTransientEffects: 0,
  peakParticles: 0,
  peakTransientEffects: 0,
});

function getTrailingWindow(frameDurations: readonly number[]): readonly number[] {
  const window: number[] = [];
  let windowDuration = 0;
  for (let index = frameDurations.length - 1; index >= 0; index -= 1) {
    const frameDuration = frameDurations[index];
    if (frameDuration <= 0) continue;
    if (windowDuration + frameDuration > RELEASE_PERFORMANCE_BUDGET.sampleWindowMilliseconds) break;
    windowDuration += frameDuration;
    window.push(frameDuration);
  }
  return window.reverse();
}

export function evaluatePerformanceBudget(
  frameDurations: readonly number[],
  effectCounts: PerformanceEffectCounts = EMPTY_EFFECT_COUNTS,
  eligibleSampleDurationMilliseconds: number = frameDurations.reduce(
    (sum, duration) => duration > 0 ? sum + duration : sum,
    0,
  ),
): PerformanceBudgetReport {
  const window = getTrailingWindow(frameDurations);
  const totalDuration = window.reduce((sum, duration) => sum + duration, 0);
  const isFullWindowReady = eligibleSampleDurationMilliseconds
    >= RELEASE_PERFORMANCE_BUDGET.sampleWindowMilliseconds;
  const averageFps = totalDuration > 0 ? window.length * 1_000 / totalDuration : 0;
  const currentFrameDuration = window.at(-1) ?? 0;
  const currentFps = currentFrameDuration > 0 ? 1_000 / currentFrameDuration : 0;
  const slowFrameThreshold = 1_000 / RELEASE_PERFORMANCE_BUDGET.sustainedDropFps;
  let consecutiveDropDuration = 0;
  let hasSustainedDrop = false;
  for (const duration of window) {
    consecutiveDropDuration = duration > slowFrameThreshold
      ? consecutiveDropDuration + duration
      : 0;
    if (consecutiveDropDuration >= RELEASE_PERFORMANCE_BUDGET.sustainedDropMilliseconds) {
      hasSustainedDrop = true;
      break;
    }
  }
  const effectsWithinBudget = effectCounts.activeParticles <= RELEASE_PERFORMANCE_BUDGET.maximumParticles
    && effectCounts.activeTransientEffects <= RELEASE_PERFORMANCE_BUDGET.maximumTransientEffects;
  return {
    currentFps,
    averageFps,
    hasSustainedDrop,
    isFullWindowReady,
    sampleCount: window.length,
    sampleDurationMilliseconds: totalDuration,
    activeParticles: effectCounts.activeParticles,
    activeTransientEffects: effectCounts.activeTransientEffects,
    peakParticles: effectCounts.peakParticles,
    peakTransientEffects: effectCounts.peakTransientEffects,
    passes: isFullWindowReady
      && averageFps >= RELEASE_PERFORMANCE_BUDGET.minimumAverageFps
      && !hasSustainedDrop
      && effectsWithinBudget,
  };
}

export class PerformanceBudgetMonitor {
  private readonly frameDurations: number[] = [];
  private previousTimestampMilliseconds: number | null = null;
  private sampleDurationMilliseconds = 0;
  private eligibleSampleDurationMilliseconds = 0;
  private activeParticles = 0;
  private activeTransientEffects = 0;
  private peakParticles = 0;
  private peakTransientEffects = 0;

  recordFrame(sample: PerformanceBudgetSample): void {
    this.activeParticles = sample.activeParticles;
    this.activeTransientEffects = sample.activeTransientEffects;
    if (sample.paused || sample.hidden) {
      this.previousTimestampMilliseconds = null;
      return;
    }
    this.peakParticles = Math.max(this.peakParticles, sample.activeParticles);
    this.peakTransientEffects = Math.max(this.peakTransientEffects, sample.activeTransientEffects);
    if (this.previousTimestampMilliseconds === null) {
      this.previousTimestampMilliseconds = sample.timestampMilliseconds;
      return;
    }
    const frameDuration = sample.timestampMilliseconds - this.previousTimestampMilliseconds;
    this.previousTimestampMilliseconds = sample.timestampMilliseconds;
    if (frameDuration <= 0) return;
    this.frameDurations.push(frameDuration);
    this.sampleDurationMilliseconds += frameDuration;
    this.eligibleSampleDurationMilliseconds += frameDuration;
    while (this.sampleDurationMilliseconds > RELEASE_PERFORMANCE_BUDGET.sampleWindowMilliseconds) {
      const expiredDuration = this.frameDurations.shift();
      if (expiredDuration === undefined) break;
      this.sampleDurationMilliseconds -= expiredDuration;
    }
  }

  getReport(): PerformanceBudgetReport {
    return evaluatePerformanceBudget(this.frameDurations, {
      activeParticles: this.activeParticles,
      activeTransientEffects: this.activeTransientEffects,
      peakParticles: this.peakParticles,
      peakTransientEffects: this.peakTransientEffects,
    }, this.eligibleSampleDurationMilliseconds);
  }

  reset(): void {
    this.frameDurations.length = 0;
    this.previousTimestampMilliseconds = null;
    this.sampleDurationMilliseconds = 0;
    this.eligibleSampleDurationMilliseconds = 0;
    this.activeParticles = 0;
    this.activeTransientEffects = 0;
    this.peakParticles = 0;
    this.peakTransientEffects = 0;
  }
}

export function selectEffectAdmissionIndex(
  slots: readonly EffectAdmissionSlot[],
  incomingPriority: EffectPriority,
): number | null {
  let replacementIndex = 0;
  for (let index = 0; index < slots.length; index += 1) {
    const slot = slots[index];
    if (!slot.active) return index;
    const replacement = slots[replacementIndex];
    if (slot.priority < replacement.priority
      || (slot.priority === replacement.priority
        && slot.admissionSequence < replacement.admissionSequence)) {
      replacementIndex = index;
    }
  }
  if (slots.length === 0 || slots[replacementIndex].priority > incomingPriority) return null;
  return replacementIndex;
}

export function isPerformanceBudgetDevelopmentEnabled(
  location: PerformanceBudgetLocation | undefined,
): boolean {
  if (location === undefined) return false;
  const isLocalHost = location.hostname === 'localhost'
    || location.hostname === '127.0.0.1'
    || location.hostname === '[::1]';
  return isLocalHost && new URLSearchParams(location.search).get('performanceBudget') === '1';
}

export function exposePerformanceBudgetInDevelopment(
  host: PerformanceBudgetHost,
  getReport: () => PerformanceBudgetReport,
): void {
  if (host.location !== undefined && isPerformanceBudgetDevelopmentEnabled(host.location)) {
    host.myceliumPerformanceBudget = getReport;
  }
}

export function shouldTogglePerformanceOverlay(
  input: PerformanceOverlayKeyInput,
  developmentEnabled: boolean,
): boolean {
  return developmentEnabled && input.shiftKey && input.key === 'F3';
}

export function createPerformanceOverlayData(
  report: PerformanceBudgetReport,
): PerformanceOverlayData {
  return { ...report, interceptsPointerInput: false };
}

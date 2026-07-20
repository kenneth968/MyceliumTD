import type { Vec2 } from '../utils/vec2';
import {
  OnboardingStep,
  getOnboardingPrompt,
  type OnboardingState,
} from './onboarding';
import { RELEASE_HUD_LAYOUT, type Rect } from './releaseHudLayout';
import { ONBOARDING_REACH_RADIUS } from './placementPreview';

export type OnboardingHighlight = Readonly<{
  rect: Rect;
  label: string;
  shape: 'rectangle';
  lineStyle: 'solid';
  color: string;
}>;

export type OnboardingReach = Readonly<{
  center: Readonly<Vec2>;
  radius: number;
  label: string;
  shape: 'circle';
  lineStyle: 'dashed';
  color: string;
}>;

export type OnboardingButton = Readonly<{
  rect: Rect;
  label: string;
  hotkey: string;
}>;

export type OnboardingRenderData = Readonly<{
  isVisible: boolean;
  prompt: string | null;
  promptRect: Rect | null;
  promptPulsing: boolean;
  highlights: readonly OnboardingHighlight[];
  reach: OnboardingReach | null;
  skipButton: OnboardingButton | null;
  replayButton: OnboardingButton | null;
}>;

export type OnboardingRenderContext = Readonly<{
  state: OnboardingState;
  kernelPosition: Readonly<Vec2>;
  firstTowerPosition: Readonly<Vec2> | null;
  promptPulsing: boolean;
}>;

export type OnboardingReachProjection = Readonly<{
  center: Readonly<Vec2>;
  radius: number;
}>;

export type OnboardingReachProjectionInput = Readonly<{
  reach: OnboardingReach;
  worldToScreen: (point: Readonly<Vec2>) => Readonly<Vec2>;
  zoom: number;
}>;

function freezeRect(rect: Rect): Rect {
  return Object.freeze(rect);
}

export const ONBOARDING_LAYOUT = Object.freeze({
  prompt: freezeRect({ x: 288, y: 64, width: 656, height: 64 }),
  skipButton: freezeRect({ x: 848, y: 74, width: 80, height: 44 }),
  replayButton: freezeRect({ x: 520, y: 548, width: 240, height: 48 }),
});

const SKIP_BUTTON = Object.freeze({
  rect: ONBOARDING_LAYOUT.skipButton,
  label: 'Skip',
  hotkey: 'S',
});

const REPLAY_BUTTON = Object.freeze({
  rect: ONBOARDING_LAYOUT.replayButton,
  label: 'Replay Tutorial',
  hotkey: 'R',
});

export function getOnboardingRenderData(
  context: OnboardingRenderContext,
): OnboardingRenderData {
  const prompt = getOnboardingPrompt(context.state);
  const active = prompt !== null;
  return Object.freeze({
    isVisible: active,
    prompt,
    promptRect: active ? ONBOARDING_LAYOUT.prompt : null,
    promptPulsing: active && context.promptPulsing,
    highlights: getHighlights(context.state.step),
    reach: getReach(context),
    skipButton: active ? SKIP_BUTTON : null,
    replayButton: context.state.enabled && context.state.step === OnboardingStep.Complete
      ? REPLAY_BUTTON
      : null,
  });
}

export function projectOnboardingReach(
  input: OnboardingReachProjectionInput,
): OnboardingReachProjection {
  return Object.freeze({
    center: Object.freeze({ ...input.worldToScreen(input.reach.center) }),
    radius: input.reach.radius * input.zoom,
  });
}

function getHighlights(step: OnboardingStep): readonly OnboardingHighlight[] {
  switch (step) {
    case OnboardingStep.PlaceSporecap:
      return freezeHighlights([
        createHighlight(RELEASE_HUD_LAYOUT.towerCards[5], 'Sporecap card', '#C084FC'),
      ]);
    case OnboardingStep.StartFirstWave:
      return freezeHighlights([
        createHighlight(RELEASE_HUD_LAYOUT.startWaveButton, 'Start Wave', '#4ADE80'),
      ]);
    case OnboardingStep.ReviewThreat:
      return freezeHighlights([
        createHighlight(RELEASE_HUD_LAYOUT.wavePreview, 'Wave 2 preview', '#FFD700'),
      ]);
    case OnboardingStep.CreateConnection:
      return freezeHighlights(
        RELEASE_HUD_LAYOUT.towerCards
          .slice(0, 5)
          .map(rect => createHighlight(rect, 'Connection tower card', '#4ADE80')),
      );
    case OnboardingStep.Disabled:
    case OnboardingStep.ObserveFirstWave:
    case OnboardingStep.Complete:
      return Object.freeze([]);
    default:
      step satisfies never;
      return Object.freeze([]);
  }
}

function getReach(context: OnboardingRenderContext): OnboardingReach | null {
  switch (context.state.step) {
    case OnboardingStep.PlaceSporecap:
      return createReach(
        context.kernelPosition,
        ONBOARDING_REACH_RADIUS.kernel,
        'Kernel connection reach',
      );
    case OnboardingStep.CreateConnection:
      return context.firstTowerPosition === null
        ? null
        : createReach(
            context.firstTowerPosition,
            ONBOARDING_REACH_RADIUS.relay,
            'First tower relay reach',
          );
    case OnboardingStep.Disabled:
    case OnboardingStep.StartFirstWave:
    case OnboardingStep.ObserveFirstWave:
    case OnboardingStep.ReviewThreat:
    case OnboardingStep.Complete:
      return null;
    default:
      context.state.step satisfies never;
      return null;
  }
}

function createHighlight(rect: Rect, label: string, color: string): OnboardingHighlight {
  return Object.freeze({ rect, label, shape: 'rectangle', lineStyle: 'solid', color });
}

function freezeHighlights(
  highlights: readonly OnboardingHighlight[],
): readonly OnboardingHighlight[] {
  return Object.freeze(highlights);
}

function createReach(center: Readonly<Vec2>, radius: number, label: string): OnboardingReach {
  return Object.freeze({
    center: Object.freeze({ ...center }),
    radius,
    label,
    shape: 'circle',
    lineStyle: 'dashed',
    color: '#4ADE80',
  });
}

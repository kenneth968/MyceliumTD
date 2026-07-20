import {
  OnboardingEvent,
  OnboardingStep,
  isActionAllowed,
  reduceOnboarding,
  type OnboardingAction,
  type OnboardingState,
} from './onboarding';
import type { OnboardingRenderData } from './onboardingRender';
import type { Rect } from './releaseHudLayout';

export type OnboardingControl = 'skip' | 'replay' | 'open_preview';

export type OnboardingCommandRoute<T> =
  | Readonly<{ kind: 'allowed'; value: T; pulsePrompt: false }>
  | Readonly<{ kind: 'blocked'; pulsePrompt: true }>;

export function getOnboardingPointerControl(
  renderData: OnboardingRenderData,
  x: number,
  y: number,
): OnboardingControl | null {
  if (renderData.skipButton && rectContains(renderData.skipButton.rect, x, y)) return 'skip';
  if (renderData.replayButton && rectContains(renderData.replayButton.rect, x, y)) return 'replay';
  const preview = renderData.highlights.find(highlight => highlight.label === 'Wave 2 preview');
  return preview && rectContains(preview.rect, x, y) ? 'open_preview' : null;
}

export function getOnboardingKeyboardControl(
  state: OnboardingState,
  key: string,
): OnboardingControl | null {
  const normalized = key.toLowerCase();
  if (state.enabled && state.step === OnboardingStep.Complete && normalized === 'r') return 'replay';
  if (state.enabled && state.step === OnboardingStep.ReviewThreat && normalized === 'v') {
    return 'open_preview';
  }
  if (state.enabled && state.step !== OnboardingStep.Complete && normalized === 's') return 'skip';
  return null;
}

export function routeOnboardingCommand<T>(
  state: OnboardingState,
  action: OnboardingAction,
  command: () => T,
): OnboardingCommandRoute<T> {
  if (!isActionAllowed(state, action)) {
    return Object.freeze({ kind: 'blocked', pulsePrompt: true });
  }
  return Object.freeze({ kind: 'allowed', value: command(), pulsePrompt: false });
}

export function applyOnboardingControl(
  state: OnboardingState,
  control: OnboardingControl,
): OnboardingState {
  switch (control) {
    case 'skip':
      return reduceOnboarding(state, { type: OnboardingEvent.Skip });
    case 'replay':
      return reduceOnboarding(state, { type: OnboardingEvent.Replay });
    case 'open_preview':
      return reduceOnboarding(state, { type: OnboardingEvent.ThreatPreviewOpened });
    default:
      control satisfies never;
      return state;
  }
}

function rectContains(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x
    && x <= rect.x + rect.width
    && y >= rect.y
    && y <= rect.y + rect.height;
}

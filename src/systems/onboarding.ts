export const OnboardingStep = {
  Disabled: 'disabled',
  PlaceSporecap: 'place_sporecap',
  StartFirstWave: 'start_first_wave',
  ObserveFirstWave: 'observe_first_wave',
  ReviewThreat: 'review_threat',
  CreateConnection: 'create_connection',
  Complete: 'complete',
} as const;

export type OnboardingStep = (typeof OnboardingStep)[keyof typeof OnboardingStep];

export const OnboardingEvent = {
  SporecapPlaced: 'sporecap_placed',
  FirstWaveStarted: 'first_wave_started',
  FirstWaveCompleted: 'first_wave_completed',
  ThreatPreviewOpened: 'threat_preview_opened',
  UsefulConnectionCreated: 'useful_connection_created',
  Skip: 'skip',
  Replay: 'replay',
} as const;

export type OnboardingEvent = (typeof OnboardingEvent)[keyof typeof OnboardingEvent];

export const OnboardingAction = {
  PlaceSporecap: 'place_sporecap',
  StartWave: 'start_wave',
  OpenThreatPreview: 'open_threat_preview',
  PlaceAnyTower: 'place_any_tower',
    ManageTower: 'manage_tower',
    ModifyTower: 'modify_tower',
    AdjustSpeed: 'adjust_speed',
    ChangeMap: 'change_map',
    Pause: 'pause',
} as const;

export type OnboardingAction = (typeof OnboardingAction)[keyof typeof OnboardingAction];

export type OnboardingState = Readonly<{
  enabled: boolean;
  step: OnboardingStep;
  firstTowerId: number | null;
}>;

type OnboardingTransition = Readonly<{ type: OnboardingEvent; towerId?: number }>;

const PROMPTS: Partial<Record<OnboardingStep, string>> = {
  [OnboardingStep.PlaceSporecap]: 'Grow a Sporecap inside the glowing mycelium.',
  [OnboardingStep.StartFirstWave]: 'Start Wave 1 when you are ready.',
  [OnboardingStep.ReviewThreat]: 'Inspect Wave 2 before choosing your next fungus.',
  [OnboardingStep.CreateConnection]: 'Grow a second tower inside the highlighted relay reach.',
};

export function createOnboardingState(enabled: boolean): OnboardingState {
  return {
    enabled,
    step: enabled ? OnboardingStep.PlaceSporecap : OnboardingStep.Disabled,
    firstTowerId: null,
  };
}

export function reduceOnboarding(
  state: OnboardingState,
  event: OnboardingTransition,
): OnboardingState {
  switch (event.type) {
    case OnboardingEvent.SporecapPlaced:
      return state.step === OnboardingStep.PlaceSporecap
        ? { ...state, step: OnboardingStep.StartFirstWave, firstTowerId: event.towerId ?? null }
        : state;
    case OnboardingEvent.FirstWaveStarted:
      return state.step === OnboardingStep.StartFirstWave
        ? { ...state, step: OnboardingStep.ObserveFirstWave }
        : state;
    case OnboardingEvent.FirstWaveCompleted:
      return state.step === OnboardingStep.ObserveFirstWave
        ? { ...state, step: OnboardingStep.ReviewThreat }
        : state;
    case OnboardingEvent.ThreatPreviewOpened:
      return state.step === OnboardingStep.ReviewThreat
        ? { ...state, step: OnboardingStep.CreateConnection }
        : state;
    case OnboardingEvent.UsefulConnectionCreated:
      return state.step === OnboardingStep.CreateConnection
        ? { ...state, step: OnboardingStep.Complete }
        : state;
    case OnboardingEvent.Skip:
      return { ...state, step: OnboardingStep.Complete };
    case OnboardingEvent.Replay:
      return { enabled: true, step: OnboardingStep.PlaceSporecap, firstTowerId: null };
    default:
      return assertNever(event.type);
  }
}

export function getOnboardingPrompt(state: OnboardingState): string | null {
  if (!state.enabled) return null;
  return PROMPTS[state.step] ?? null;
}

export function isActionAllowed(state: OnboardingState, action: OnboardingAction): boolean {
  if (!state.enabled || state.step === OnboardingStep.Complete || action === OnboardingAction.Pause) {
    return true;
  }
  if (action === OnboardingAction.ManageTower) return true;

  switch (state.step) {
    case OnboardingStep.PlaceSporecap:
      return action === OnboardingAction.PlaceSporecap;
    case OnboardingStep.StartFirstWave:
      return action === OnboardingAction.StartWave;
    case OnboardingStep.ObserveFirstWave:
      return false;
    case OnboardingStep.ReviewThreat:
      return action === OnboardingAction.OpenThreatPreview;
    case OnboardingStep.CreateConnection:
      return action === OnboardingAction.PlaceAnyTower;
    case OnboardingStep.Disabled:
      return true;
    default:
      return assertNever(state.step);
  }
}

function assertNever(value: never): never {
  throw new Error(`Unexpected onboarding value: ${String(value)}`);
}

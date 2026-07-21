import {
  OnboardingAction,
  OnboardingEvent,
  OnboardingStep,
  createOnboardingState,
  getOnboardingPrompt,
  isActionAllowed,
  reduceOnboarding,
  type OnboardingState,
} from './onboarding';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function assertAllowedActions(
  state: OnboardingState,
  allowedActions: readonly OnboardingAction[],
  label: string,
): void {
  for (const action of Object.values(OnboardingAction)) {
    const expected = allowedActions.includes(action);
    assert(
      isActionAllowed(state, action) === expected,
      `${label}: ${action} should be ${expected ? 'allowed' : 'blocked'}`,
    );
  }
}

const harmlessActions = [OnboardingAction.ManageTower, OnboardingAction.Pause] as const;
const mutationActions = [
    OnboardingAction.ModifyTower,
    OnboardingAction.AdjustSpeed,
    OnboardingAction.ChangeMap,
] as const;

// Given: onboarding is disabled.
const disabledState = createOnboardingState(false);

// Then: no tutorial prompt or action gate remains active.
assert(disabledState.enabled === false, 'disabled onboarding remains disabled');
assert(disabledState.step === OnboardingStep.Disabled, 'disabled onboarding uses the disabled step');
assert(getOnboardingPrompt(disabledState) === null, 'disabled onboarding has no prompt');
assertAllowedActions(disabledState, Object.values(OnboardingAction), 'disabled onboarding');
assert(
  reduceOnboarding(disabledState, { type: OnboardingEvent.FirstWaveCompleted }) === disabledState,
  'disabled onboarding ignores unrelated progress events',
);

// Given: contextual onboarding is enabled for a new run.
let state = createOnboardingState(true);

// Then: placement is the first guided action with its exact prompt and action gate.
assert(state.enabled === true, 'enabled onboarding remains enabled');
assert(state.step === OnboardingStep.PlaceSporecap, 'tutorial begins with placement');
assert(state.firstTowerId === null, 'new onboarding has no relay anchor');
assert(state.firstTowerPosition === null, 'new onboarding has no relay position');
assert(
  getOnboardingPrompt(state) === 'Grow a Sporecap inside the glowing mycelium.',
  'placement step uses the exact prompt',
);
assertAllowedActions(
  state,
  [OnboardingAction.PlaceSporecap, ...harmlessActions],
  'placement step',
);
assert(
  mutationActions.every(action => !isActionAllowed(state, action)),
  'placement step blocks tower and speed mutations',
);
assert(
  reduceOnboarding(state, { type: OnboardingEvent.FirstWaveCompleted }) === state,
  'out-of-order wave completion preserves the placement state object',
);

// When: the simulation confirms Sporecap placement.
state = reduceOnboarding(state, {
  type: OnboardingEvent.SporecapPlaced,
  towerId: 41,
  towerPosition: { x: 720, y: 180 },
});

// Then: Wave 1 start is the only progression action.
assert(state.step === OnboardingStep.StartFirstWave, 'placement advances tutorial');
assert(
  getOnboardingPrompt(state) === 'Start Wave 1 when you are ready.',
  'wave start step uses the exact prompt',
);
assertAllowedActions(state, [OnboardingAction.StartWave, ...harmlessActions], 'wave start step');
assert(state.firstTowerId === 41, 'confirmed Sporecap becomes the relay anchor');
assert(state.firstTowerPosition?.x === 720, 'confirmed Sporecap records the relay x');
assert(state.firstTowerPosition?.y === 180, 'confirmed Sporecap records the relay y');

// When: Wave 1 starts.
state = reduceOnboarding(state, { type: OnboardingEvent.FirstWaveStarted });

// Then: the start instruction and highlight disappear while progression waits for completion.
assert(state.step === OnboardingStep.ObserveFirstWave, 'wave start hides the start-wave lesson');
assert(getOnboardingPrompt(state) === null, 'active Wave 1 has no overlapping tutorial banner');
assertAllowedActions(state, [...harmlessActions], 'active Wave 1 observation');

// When: Wave 1 completes.
state = reduceOnboarding(state, { type: OnboardingEvent.FirstWaveCompleted });

// Then: threat preview is the only progression action.
assert(state.step === OnboardingStep.ReviewThreat, 'Wave 1 completion teaches preview');
assert(
  getOnboardingPrompt(state) === 'Inspect Wave 2 before choosing your next fungus.',
  'threat review step uses the exact prompt',
);
assertAllowedActions(
  state,
  [OnboardingAction.OpenThreatPreview, ...harmlessActions],
  'threat review step',
);

// When: the threat preview opens.
state = reduceOnboarding(state, { type: OnboardingEvent.ThreatPreviewOpened });

// Then: connected tower placement is the only progression action.
assert(state.step === OnboardingStep.CreateConnection, 'preview advances to connection');
assert(
  getOnboardingPrompt(state) === 'Grow a second tower inside the highlighted relay reach.',
  'connection step uses the exact prompt',
);
assertAllowedActions(
  state,
  [OnboardingAction.PlaceAnyTower, ...harmlessActions],
  'connection step',
);

// When: a useful connection is confirmed.
state = reduceOnboarding(state, { type: OnboardingEvent.UsefulConnectionCreated });

// Then: all guided steps are complete and all actions are restored.
assert(state.step === OnboardingStep.Complete, 'connection completes tutorial');
assert(getOnboardingPrompt(state) === null, 'complete tutorial has no prompt');
assertAllowedActions(state, Object.values(OnboardingAction), 'completed onboarding');

// Given: a blocking tutorial step.
const reviewState = reduceOnboarding(
  reduceOnboarding(
    reduceOnboarding(createOnboardingState(true), { type: OnboardingEvent.SporecapPlaced, towerId: 41 }),
    { type: OnboardingEvent.FirstWaveStarted },
  ),
  { type: OnboardingEvent.FirstWaveCompleted },
);

// When: onboarding is skipped and then replayed.
const skippedState = reduceOnboarding(reviewState, { type: OnboardingEvent.Skip });
const replayedState = reduceOnboarding(skippedState, { type: OnboardingEvent.Replay });

// Then: Skip completes the tutorial and Replay restarts it enabled.
assert(skippedState.step === OnboardingStep.Complete, 'Skip completes onboarding');
assert(getOnboardingPrompt(skippedState) === null, 'skipped onboarding has no prompt');
assert(replayedState.enabled === true, 'Replay enables onboarding');
assert(replayedState.step === OnboardingStep.PlaceSporecap, 'Replay restarts at placement');
assert(replayedState.firstTowerId === null, 'Replay clears the previous relay anchor');
assert(
  getOnboardingPrompt(replayedState) === 'Grow a Sporecap inside the glowing mycelium.',
  'Replay restores the exact placement prompt',
);

const replayedDisabledState = reduceOnboarding(disabledState, { type: OnboardingEvent.Replay });
assert(replayedDisabledState.enabled === true, 'Replay enables previously disabled onboarding');
assert(
  replayedDisabledState.step === OnboardingStep.PlaceSporecap,
  'Replay restarts disabled onboarding at placement',
);

console.log('onboarding tests passed');

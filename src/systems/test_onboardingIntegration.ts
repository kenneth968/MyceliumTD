import { TowerType } from '../entities/tower';
import { createGameRunner } from './gameRunner';
import { createGameRenderer } from './gameRenderer';
import {
  applyGameEventsToOnboarding,
  drainGameEventsForOnboarding,
  integrateGameEventsWithOnboarding,
  isNewOnboardingCompletion,
} from './onboardingIntegration';
import {
  OnboardingStep,
  OnboardingAction,
  createOnboardingState,
  type OnboardingState,
} from './onboarding';
import {
  ONBOARDING_LAYOUT,
  getOnboardingRenderData,
  projectOnboardingReach,
} from './onboardingRender';
import {
  getOnboardingKeyboardControl,
  getOnboardingPointerControl,
  applyOnboardingControl,
  routeOnboardingCommand,
} from './onboardingInput';
import { RELEASE_HUD_LAYOUT, type Rect } from './releaseHudLayout';
import { ONBOARDING_REACH_RADIUS } from './placementPreview';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function assertSame<T>(actual: T, expected: T, message: string): void {
  assert(actual === expected, message);
}

// Given onboarding at its first step and a real runner that confirms a connected Sporecap
const placementGame = createGameRunner({ startingMoney: 5000 });
const initial = createOnboardingState(true);
const placedTower = placementGame.placeTower(TowerType.Sporecap, 720, 180);
assert(placedTower !== null, 'guided Sporecap placement succeeds');
const placementBatch = placementGame.drainEvents();
assertSame(placementBatch[0]?.type, 'tower_placed', 'confirmed placement is first in the batch');
assertSame(
  placementBatch[1]?.type,
  'network_connection_created',
  'the first connected tower emits its connection in the same batch',
);

// When the exact batch is applied once
const afterPlacement = applyGameEventsToOnboarding(initial, placementBatch);

// Then only the confirmed Sporecap lesson advances and the same-batch connection cannot skip it
assertSame(
  afterPlacement.step,
  OnboardingStep.StartFirstWave,
  'same-batch connection cannot skip the Start Wave lesson',
);
const startedFirstWave = placementGame.startWave();
assertSame(startedFirstWave, true, 'real runner starts Wave 1 after guided placement');
const afterRealWaveStart = applyGameEventsToOnboarding(
  afterPlacement,
  placementGame.drainEvents(),
);
assertSame(
  afterRealWaveStart.step,
  OnboardingStep.ObserveFirstWave,
  'real wave start hides the start instruction while awaiting completion',
);

// Given onboarding waiting for Wave 1 completion
const waveStartBatch = [{ type: 'wave_started', timestamp: 1, waveNumber: 1 }] as const;
const wrongWaveBatch = [{
  type: 'wave_completed',
  timestamp: 2,
  waveNumber: 2,
  completion: 1,
  perfect: 0,
  total: 1,
}] as const;
const firstWaveBatch = [{
  type: 'wave_completed',
  timestamp: 3,
  waveNumber: 1,
  completion: 1,
  perfect: 0,
  total: 1,
}] as const;

// When Wave 1 starts and an unrelated completion arrives
const afterWaveStart = applyGameEventsToOnboarding(afterPlacement, waveStartBatch);
const afterWrongWave = applyGameEventsToOnboarding(afterWaveStart, wrongWaveBatch);

// Then the visible start lesson clears and only Wave 1 completion advances again
assertSame(afterWaveStart.step, OnboardingStep.ObserveFirstWave, 'wave start enters hidden observation');
assertSame(afterWrongWave, afterWaveStart, 'only Wave 1 completion is recognized');
assertSame(
  applyGameEventsToOnboarding(afterWrongWave, firstWaveBatch).step,
  OnboardingStep.ReviewThreat,
  'confirmed Wave 1 completion advances to threat review',
);

// Given onboarding already waiting for a later useful connection
const createConnection: OnboardingState = {
  ...afterPlacement,
  step: OnboardingStep.CreateConnection,
};
const connectionBatch = [{
  type: 'network_connection_created',
  timestamp: 4,
  position: { x: 500, y: 180 },
  towerId: 2,
  sourceTowerId: placedTower?.id ?? null,
}] as const;
const kernelConnectionBatch = [{
  ...connectionBatch[0],
  towerId: 3,
  sourceTowerId: null,
}] as const;

// When a Kernel-only connection and then the highlighted relay connection are integrated
const rejectedKernelConnection = integrateGameEventsWithOnboarding(createConnection, kernelConnectionBatch);
const completion = integrateGameEventsWithOnboarding(createConnection, connectionBatch);
const repeated = integrateGameEventsWithOnboarding(completion.state, connectionBatch);

// Then completion presents exactly one bloom at the confirmed connection
assertSame(rejectedKernelConnection.state, createConnection, 'Kernel-only connection cannot complete relay lesson');
assertSame(rejectedKernelConnection.completionBloom, null, 'rejected connection emits no bloom');
assertSame(completion.state.step, OnboardingStep.Complete, 'later useful connection completes onboarding');
assert(completion.completionBloom !== null, 'first completion emits a bloom presentation');
assertSame(completion.completionBloom?.x, 500, 'bloom uses the confirmed connection x');
assertSame(completion.completionBloom?.y, 180, 'bloom uses the confirmed connection y');
assertSame(repeated.state, completion.state, 'repeat connection preserves completed state identity');
assertSame(repeated.completionBloom, null, 'repeat connection emits no second bloom');

// Given a drain and a particle consumer that record identity
let drainCount = 0;
let particleBatch: readonly unknown[] | null = null;
const exactBatch = placementBatch;

// When the frame event seam drains and routes the events
const drained = drainGameEventsForOnboarding(
  initial,
  () => {
    drainCount += 1;
    return exactBatch;
  },
  events => {
    particleBatch = events;
  },
);

// Then one drain supplies the exact same immutable batch to particles and onboarding
assertSame(drainCount, 1, 'simulation events drain exactly once');
assertSame(particleBatch, exactBatch, 'particles receive the exact drained batch object');
assertSame(drained.events, exactBatch, 'onboarding integration reports the exact drained batch object');
assertSame(drained.state.step, OnboardingStep.StartFirstWave, 'the shared batch advances onboarding');

// Given a renderer and a runner with a confirmed first tower
const renderer = createGameRenderer();

// When onboarding presentation is built through the renderer seam
const rendererOnboarding = renderer.getOnboardingRenderData(placementGame, initial, false);

// Then the renderer supplies real Kernel and first-tower anchors to focused render construction
assertSame(rendererOnboarding.reach?.radius, 180, 'renderer exposes Kernel reach for placement');
assertSame(
  renderer.render(placementGame).onboarding.isVisible,
  false,
  'ordinary frame rendering defaults to hidden onboarding until the boundary supplies state',
);

function center(rect: Rect): Readonly<{ x: number; y: number }> {
  return {
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
  };
}

const renderContext = {
  kernelPosition: { x: 900, y: 300 },
  firstTowerPosition: { x: 720, y: 180 },
  promptPulsing: false,
} as const;

// Given each active onboarding step and stable world anchors
const placeRender = getOnboardingRenderData({ state: initial, ...renderContext });
const startRender = getOnboardingRenderData({ state: afterPlacement, ...renderContext });
const activeWaveRender = getOnboardingRenderData({ state: afterRealWaveStart, ...renderContext });
const reviewState: OnboardingState = {
  ...afterPlacement,
  step: OnboardingStep.ReviewThreat,
};
const reviewRender = getOnboardingRenderData({ state: reviewState, ...renderContext });
const connectionRender = getOnboardingRenderData({ state: createConnection, ...renderContext });
const completeRender = getOnboardingRenderData({ state: completion.state, ...renderContext });

// When render data is constructed
const placeRect = placeRender.highlights[0]?.rect;
const startRect = startRender.highlights[0]?.rect;
const reviewRect = reviewRender.highlights[0]?.rect;

// Then every lesson exposes the exact shared geometry and accessible highlight semantics
assertSame(placeRender.isVisible, true, 'placement tutorial chrome is visible');
assertSame(placeRender.skipButton?.rect, ONBOARDING_LAYOUT.skipButton, 'Skip uses shared geometry');
assertSame(placeRect, RELEASE_HUD_LAYOUT.towerCards[5], 'only the Sporecap card is highlighted first');
assertSame(placeRender.highlights.length, 1, 'placement step highlights one card');
assertSame(placeRender.reach?.shape, 'circle', 'Kernel reach has a shape cue');
assertSame(placeRender.reach?.lineStyle, 'dashed', 'Kernel reach has a line-style cue');
assertSame(placeRender.reach?.radius, 180, 'Kernel reach uses the simulation radius');
assertSame(startRect, RELEASE_HUD_LAYOUT.startWaveButton, 'Start Wave highlight reuses its hit rectangle');
assertSame(activeWaveRender.isVisible, false, 'active Wave 1 removes tutorial banner and highlight');
assertSame(activeWaveRender.highlights.length, 0, 'active Wave 1 reserves no HUD highlight');
assertSame(reviewRect, RELEASE_HUD_LAYOUT.wavePreview, 'Wave 2 preview highlight reuses its hit rectangle');
assertSame(connectionRender.highlights.length, 5, 'connection lesson highlights every non-Sporecap card');
assert(
  connectionRender.highlights.every((highlight, index) => highlight.rect === RELEASE_HUD_LAYOUT.towerCards[index]),
  'connection card highlights preserve shared rectangle identity',
);
assertSame(connectionRender.reach?.center.x, renderContext.firstTowerPosition.x, 'relay reach uses first tower x');
assertSame(connectionRender.reach?.center.y, renderContext.firstTowerPosition.y, 'relay reach uses first tower y');
assertSame(connectionRender.reach?.radius, 160, 'relay reach uses the simulation radius');
assert(Object.isFrozen(ONBOARDING_REACH_RADIUS), 'onboarding reach radii are immutable');
assertSame(completeRender.isVisible, false, 'completed onboarding removes tutorial chrome');
assertSame(completeRender.skipButton, null, 'completed onboarding removes Skip');
assertSame(completeRender.replayButton?.rect, ONBOARDING_LAYOUT.replayButton, 'menu Replay uses shared geometry');
assert(Object.isFrozen(placeRender), 'onboarding render data is frozen');
assert(Object.isFrozen(placeRender.highlights), 'onboarding highlight collections are frozen');
assert(Object.isFrozen(ONBOARDING_LAYOUT.prompt), 'prompt geometry is frozen');

// Given a known world reach, projection, and camera zoom
const projectedReach = projectOnboardingReach({
  reach: {
    center: { x: 100, y: 50 },
    radius: 180,
    label: 'Known reach',
    shape: 'circle',
    lineStyle: 'dashed',
    color: '#4ADE80',
  },
  worldToScreen: point => ({ x: point.x * 2 + 10, y: point.y * 3 - 5 }),
  zoom: 1.25,
  visibleBounds: { x: -1000, y: -1000, width: 2000, height: 2000 },
  blockedRects: [],
  labelSize: { x: 80, y: 14 },
});

// When the focused render helper projects it

// Then the center and radius use exact screen coordinates and zoom scaling
assertSame(projectedReach.center.x, 210, 'reach projection maps the center x');
assertSame(projectedReach.center.y, 145, 'reach projection maps the center y');
assertSame(projectedReach.radius, 225, 'reach projection scales the radius by zoom');
assert(Object.isFrozen(projectedReach), 'reach projection is immutable');

// Given the render data used by the painter
const skipPoint = center(ONBOARDING_LAYOUT.skipButton);
const previewPoint = center(RELEASE_HUD_LAYOUT.wavePreview);
const replayPoint = center(ONBOARDING_LAYOUT.replayButton);

// When pointer and keyboard controls are routed
const skipPointer = getOnboardingPointerControl(placeRender, skipPoint.x, skipPoint.y);
const previewPointer = getOnboardingPointerControl(reviewRender, previewPoint.x, previewPoint.y);
const replayPointer = getOnboardingPointerControl(completeRender, replayPoint.x, replayPoint.y);

// Then the same rectangles and contextual keys produce only valid tutorial controls
assertSame(skipPointer, 'skip', 'Skip pointer route uses the rendered button');
assertSame(previewPointer, 'open_preview', 'preview pointer route is explicit');
assertSame(replayPointer, 'replay', 'Replay pointer route uses the rendered menu button');
assertSame(getOnboardingKeyboardControl(initial, 's'), 'skip', 'Skip is keyboard-accessible');
assertSame(getOnboardingKeyboardControl(reviewState, 'V'), 'open_preview', 'preview is keyboard-accessible');
assertSame(getOnboardingKeyboardControl(completion.state, 'r'), 'replay', 'Replay is keyboard-accessible');
assertSame(getOnboardingKeyboardControl(initial, 'r'), null, 'Replay is unavailable before completion');

// Given each explicit tutorial control at its valid contextual step
const skipped = applyOnboardingControl(initial, 'skip');
const reviewed = applyOnboardingControl(reviewState, 'open_preview');
const replayed = applyOnboardingControl(skipped, 'replay');

// When controls reduce onboarding state without touching simulation
const skipCompletedNow = isNewOnboardingCompletion(initial, skipped);
const repeatedCompletion = isNewOnboardingCompletion(skipped, applyOnboardingControl(skipped, 'skip'));

// Then Skip, preview, and Replay make only their exact state transitions
assertSame(skipped.step, OnboardingStep.Complete, 'Skip completes the active tutorial');
assertSame(reviewed.step, OnboardingStep.CreateConnection, 'explicit preview activation advances review');
assertSame(replayed.step, OnboardingStep.PlaceSporecap, 'Replay restarts at Sporecap placement');
assertSame(skipCompletedNow, true, 'first transition to Complete is presentation-worthy');
assertSame(repeatedCompletion, false, 'repeated completion cannot replay the bloom');

// Given a command callback whose calls represent simulation mutation
let mutationCalls = 0;
const mutation = (): string => {
  mutationCalls += 1;
  return 'mutated';
};

// When a blocked and then an allowed action route through the command seam
const blocked = routeOnboardingCommand(initial, OnboardingAction.StartWave, mutation);
const blockedTowerMutation = routeOnboardingCommand(initial, OnboardingAction.ModifyTower, mutation);
const blockedSpeedMutation = routeOnboardingCommand(initial, OnboardingAction.AdjustSpeed, mutation);
const allowed = routeOnboardingCommand(initial, OnboardingAction.PlaceSporecap, mutation);

// Then blocked input is consumed and pulses without any mutation while allowed input runs once
assertSame(blocked.kind, 'blocked', 'disallowed gameplay command is consumed');
assertSame(blocked.pulsePrompt, true, 'blocked command pulses the prompt');
assertSame(blockedTowerMutation.kind, 'blocked', 'tower mutation is blocked during onboarding');
assertSame(blockedSpeedMutation.kind, 'blocked', 'speed mutation is blocked during onboarding');
assertSame(allowed.kind, 'allowed', 'required gameplay command is allowed');
assertSame(
  allowed.kind === 'allowed' ? allowed.value : null,
  'mutated',
  'allowed command returns its simulation result',
);
assertSame(mutationCalls, 1, 'blocked mutation routes never invoke the simulation callback');

// Given the live shell owns both the game loop and animated title menu
const mainSource = readFileSync(resolve(__dirname, '../main.ts'), 'utf8');
const quitToMenuBody = mainSource.match(/private quitToMenu\(\): void \{([\s\S]*?)\n    \}/)?.[1] ?? '';

// When the quit transition is inspected

// Then gameplay rendering stops before the title animation is restarted
assert(quitToMenuBody.includes('this.loop.stop();'), 'Quit to Menu stops the gameplay render loop');
assert(
  quitToMenuBody.indexOf('this.loop.stop();') < quitToMenuBody.indexOf('this.drawMenu();'),
  'gameplay loop stops before the title menu begins drawing',
);

console.log('onboarding integration tests passed');

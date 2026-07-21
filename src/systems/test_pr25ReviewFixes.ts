import { TowerType } from '../entities/tower';
import { createGameRunner } from './gameRunner';
import { createGameRenderer } from './gameRenderer';
import { createOnboardingState, OnboardingStep } from './onboarding';
import { integrateGameEventsWithOnboarding } from './onboardingIntegration';
import { isOnboardingPromptAtPosition } from './onboardingInput';
import { MYCELIUM_NETWORK_REACH } from './myceliumNetworkConfig';
import {
  getOnboardingCompletionNotice,
  getOnboardingRenderData,
  projectOnboardingReach,
} from './onboardingRender';
import { RELEASE_CAMERA, RELEASE_HUD_LAYOUT } from './releaseHudLayout';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function assertSame<T>(actual: T, expected: T, message: string): void {
  assert(actual === expected, message);
}

// Given: the fixed release camera and Garden Path's outer path anchors.
const renderer = createGameRenderer();
renderer.setCamera(RELEASE_CAMERA);

// When: the entrance, Kernel, and vertical path limits are projected.
const entrance = renderer.worldToScreen(0, 300);
const kernel = renderer.worldToScreen(800, 300);
const upperPath = renderer.worldToScreen(400, 100);
const lowerPath = renderer.worldToScreen(400, 500);

// Then: every anchor remains inside the interactive playfield.
assert(entrance.x >= RELEASE_HUD_LAYOUT.playfield.x, 'path entrance stays inside the playfield');
assert(
  kernel.x <= RELEASE_HUD_LAYOUT.playfield.x + RELEASE_HUD_LAYOUT.playfield.width,
  'Kernel stays left of the side HUD',
);
assert(upperPath.y >= RELEASE_HUD_LAYOUT.playfield.y, 'upper path stays below the top HUD');
assert(
  lowerPath.y <= RELEASE_HUD_LAYOUT.playfield.y + RELEASE_HUD_LAYOUT.playfield.height,
  'lower path stays above the tower bar',
);

// Given: the visible first onboarding prompt.
const initial = createOnboardingState(true);
const onboarding = getOnboardingRenderData({
  state: initial,
  kernelPosition: { x: 800, y: 300 },
  firstTowerPosition: null,
  promptPulsing: false,
});
const prompt = onboarding.promptRect;
if (prompt === null) throw new Error('FAIL: placement onboarding exposes prompt geometry');

// When: a pointer lands on tutorial chrome and just outside it.
const promptConsumed = isOnboardingPromptAtPosition(
  onboarding,
  prompt.x + prompt.width / 2,
  prompt.y + prompt.height / 2,
);
const outsideConsumed = isOnboardingPromptAtPosition(onboarding, prompt.x - 1, prompt.y - 1);

// Then: only prompt chrome consumes the pointer.
assertSame(promptConsumed, true, 'tutorial prompt consumes pointer input');
assertSame(outsideConsumed, false, 'space outside the tutorial prompt remains available');

// Given: a Sporecap placement without a same-batch network connection.
const disconnectedBatch = [{
  type: 'tower_placed',
  timestamp: 1,
  position: { x: 100, y: 100 },
  towerId: 41,
  towerType: TowerType.Sporecap,
}] as const;

// When: the disconnected placement is integrated.
const afterDisconnectedPlacement = integrateGameEventsWithOnboarding(initial, disconnectedBatch);

// Then: the placement lesson remains active and records no relay anchor.
assertSame(afterDisconnectedPlacement.state, initial, 'disconnected Sporecap does not advance onboarding');
assertSame(afterDisconnectedPlacement.state.firstTowerId, null, 'disconnected Sporecap is not the relay anchor');

// Given: the same Sporecap placement accompanied by its connection event.
const connectedBatch = [
  disconnectedBatch[0],
  {
    type: 'network_connection_created',
    timestamp: 1,
    position: { x: 100, y: 100 },
    towerId: 41,
    sourceTowerId: null,
  },
] as const;

// When: the connected placement is integrated.
const afterConnectedPlacement = integrateGameEventsWithOnboarding(initial, connectedBatch);

// Then: onboarding advances and records the connected relay anchor.
assertSame(afterConnectedPlacement.state.step, OnboardingStep.StartFirstWave, 'connected Sporecap advances onboarding');
assertSame(afterConnectedPlacement.state.firstTowerId, 41, 'connected Sporecap becomes the relay anchor');
assertSame(afterConnectedPlacement.state.firstTowerPosition?.x, 100, 'connected Sporecap records relay x');
assertSame(afterConnectedPlacement.state.firstTowerPosition?.y, 100, 'connected Sporecap records relay y');

// Given: a disconnected Sporecap was placed before the connected tutorial anchor.
const anchorGame = createGameRunner({ startingMoney: 5000 });
const disconnectedTower = anchorGame.placeTower(TowerType.Sporecap, 100, 100);
const connectedTower = anchorGame.placeTower(TowerType.Sporecap, 720, 180);
if (disconnectedTower === null || connectedTower === null) {
  throw new Error('FAIL: renderer anchor fixture places both Sporecaps');
}
const anchorPlacement = integrateGameEventsWithOnboarding(initial, anchorGame.drainEvents());
assertSame(anchorPlacement.state.firstTowerId, connectedTower.id, 'real placement records connected tower ID');
assertSame(anchorPlacement.state.firstTowerPosition?.x, connectedTower.position.x, 'real placement records connected x');
assertSame(anchorPlacement.state.firstTowerPosition?.y, connectedTower.position.y, 'real placement records connected y');
const createConnectionState = {
  ...anchorPlacement.state,
  step: OnboardingStep.CreateConnection,
} as const;

// When: the renderer builds the relay lesson from the recorded tower ID.
const anchoredRenderData = renderer.getOnboardingRenderData(
  anchorGame,
  createConnectionState,
  false,
);

// Then: the reach highlight follows the connected anchor, not placement order.
assertSame(anchoredRenderData.reach?.center.x, connectedTower.position.x, 'relay highlight uses recorded tower x');
assertSame(anchoredRenderData.reach?.center.y, connectedTower.position.y, 'relay highlight uses recorded tower y');

if (anchoredRenderData.reach === null || anchoredRenderData.promptRect === null) {
  throw new Error('FAIL: relay lesson exposes reach and prompt geometry');
}
const relayProjection = projectOnboardingReach({
  reach: anchoredRenderData.reach,
  worldToScreen: point => renderer.worldToScreen(point.x, point.y),
  zoom: renderer.getCamera().zoom,
  visibleBounds: RELEASE_HUD_LAYOUT.playfield,
  blockedRects: [anchoredRenderData.promptRect],
  labelSize: { x: 136, y: 14 },
});

// Then: its label remains inside the playfield and clear of the prompt overlay.
assert(
  relayProjection.labelPosition.y >= RELEASE_HUD_LAYOUT.playfield.y + 7,
  'relay label stays below the top HUD',
);
assert(
  relayProjection.labelPosition.y > anchoredRenderData.promptRect.y + anchoredRenderData.promptRect.height,
  'relay label moves clear of the onboarding prompt',
);

// Given: a second tower connects directly to the Kernel inside the highlighted relay overlap.
const overlapTower = anchorGame.placeTower(TowerType.Puffball, 650, 220);
if (overlapTower === null) throw new Error('FAIL: overlap fixture places the second tower');
const overlapBatch = anchorGame.drainEvents();
const overlapConnection = overlapBatch.find(event => event.type === 'network_connection_created');
assertSame(overlapConnection?.sourceTowerId, null, 'overlap tower is parented directly to the Kernel');

// When: onboarding integrates the placement with the recorded anchor position.
const overlapCompletion = integrateGameEventsWithOnboarding(
  createConnectionState,
  overlapBatch,
);

// Then: a connected placement inside the highlighted relay reach completes the lesson.
assertSame(overlapCompletion.state.step, OnboardingStep.Complete, 'Kernel overlap completes relay lesson');
assertSame(overlapCompletion.completionCause, 'connection', 'relay completion records its success cause');

const completionStartedAt = 1000;
const completionNotice = getOnboardingCompletionNotice(completionStartedAt, completionStartedAt);
if (completionNotice === null) throw new Error('FAIL: completed relay lesson exposes success notice');
assert(
  completionNotice.rect.y >= RELEASE_HUD_LAYOUT.playfield.y,
  'completion notice stays below the top HUD',
);
assert(
  getOnboardingCompletionNotice(completionStartedAt, completionStartedAt + 2199) !== null,
  'completion notice remains visible before its deadline',
);
assertSame(
  getOnboardingCompletionNotice(completionStartedAt, completionStartedAt + 2200),
  null,
  'completion notice expires at its deadline',
);
assertSame(getOnboardingCompletionNotice(null, completionStartedAt), null, 'Skip exposes no success notice');

const boundaryPosition = {
  x: connectedTower.position.x + MYCELIUM_NETWORK_REACH.tower,
  y: connectedTower.position.y,
};
const boundaryBatch = [
  {
    type: 'tower_placed',
    timestamp: 3,
    position: boundaryPosition,
    towerId: 100,
    towerType: TowerType.Puffball,
  },
  {
    type: 'network_connection_created',
    timestamp: 3,
    position: boundaryPosition,
    towerId: 100,
    sourceTowerId: null,
  },
] as const;
const boundaryResult = integrateGameEventsWithOnboarding(createConnectionState, boundaryBatch);
assertSame(boundaryResult.state.step, OnboardingStep.Complete, 'exact relay boundary completes onboarding');

const beyondBoundaryPosition = { ...boundaryPosition, x: boundaryPosition.x + 0.001 };
const beyondBoundaryBatch = [
  { ...boundaryBatch[0], position: beyondBoundaryPosition, towerId: 101 },
  { ...boundaryBatch[1], position: beyondBoundaryPosition, towerId: 101 },
] as const;
const beyondBoundaryResult = integrateGameEventsWithOnboarding(
  createConnectionState,
  beyondBoundaryBatch,
);
assertSame(beyondBoundaryResult.state, createConnectionState, 'placement beyond relay boundary stays blocked');

// Given: a direct Kernel placement outside the highlighted relay reach.
const outsideRelayBatch = [
  {
    type: 'tower_placed',
    timestamp: 2,
    position: { x: 900, y: 300 },
    towerId: 99,
    towerType: TowerType.Puffball,
  },
  {
    type: 'network_connection_created',
    timestamp: 2,
    position: { x: 900, y: 300 },
    towerId: 99,
    sourceTowerId: null,
  },
] as const;

// When: onboarding compares that placement with the recorded relay anchor.
const outsideRelayResult = integrateGameEventsWithOnboarding(
  createConnectionState,
  outsideRelayBatch,
);

// Then: the lesson remains active because the placement missed the highlighted reach.
assertSame(outsideRelayResult.state, createConnectionState, 'Kernel-only placement outside relay stays blocked');

console.log('PR #25 review regression tests passed');

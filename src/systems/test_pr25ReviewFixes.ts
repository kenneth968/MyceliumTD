import { TowerType } from '../entities/tower';
import { createGameRenderer } from './gameRenderer';
import { createOnboardingState, OnboardingStep } from './onboarding';
import { integrateGameEventsWithOnboarding } from './onboardingIntegration';
import { isOnboardingPromptAtPosition } from './onboardingInput';
import { getOnboardingRenderData } from './onboardingRender';
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

console.log('PR #25 review regression tests passed');

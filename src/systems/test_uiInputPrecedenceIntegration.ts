import { GameRunner, GameSpeed, GameState, PlacementState } from './gameRunner';
import { TowerType } from '../entities/tower';
import { ONBOARDING_LAYOUT } from './onboardingRender';
import { RELEASE_HUD_LAYOUT } from './releaseHudLayout';
import { createTowerWithGrowth } from './upgrade';
import { EvolutionPath, TowerStage } from '../content/evolutionDefinitions';
import { TargetingMode } from './targeting';
import { getTowerInfoPanelRenderData as buildTowerInfoPanel } from './towerInfoPanel';

const releaseScopeModule: typeof import('./releaseScope') = require('./releaseScope');

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`FAIL: ${message} (expected ${expected}, got ${actual})`);
  }
}

const windowListeners = new Map<string, EventListenerOrEventListenerObject>();
const canvasListeners = new Map<string, EventListenerOrEventListenerObject>();

const fakeWindow = {
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    windowListeners.set(type, listener);
  },
  setInterval(): number {
    return 1;
  },
  confirm(): boolean {
    return true;
  },
};

const fakeCanvas = {
  getContext(): object {
    return {};
  },
  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    canvasListeners.set(type, listener);
  },
  getBoundingClientRect(): { left: number; top: number; width: number; height: number } {
    return { left: 0, top: 0, width: 1280, height: 720 };
  },
};

class FakeAudio {
  loop = false;
  volume = 0;
  preload = '';
  currentTime = 0;

  constructor(_src?: string) {}

  play(): Promise<void> {
    return Promise.resolve();
  }

  pause(): void {}

  addEventListener(_type: string, _listener: EventListenerOrEventListenerObject): void {}

  removeEventListener(_type: string, _listener: EventListenerOrEventListenerObject): void {}
}

function invoke(listener: EventListenerOrEventListenerObject | undefined, event: Event): void {
  if (!listener) throw new Error('FAIL: expected event listener');
  if (typeof listener === 'function') listener(event);
  else listener.handleEvent(event);
}

function pressKey(key: string): void {
  const event = new Event('keydown');
  Object.defineProperty(event, 'key', { value: key });
  invoke(windowListeners.get('keydown'), event);
}

function clickCanvas(x: number, y: number): void {
  const event = new Event('mousedown');
  Object.defineProperties(event, {
    clientX: { value: x },
    clientY: { value: y },
    button: { value: 0 },
  });
  invoke(canvasListeners.get('mousedown'), event);
}

function createRunningGame(): void {
  invoke(windowListeners.get('DOMContentLoaded'), new Event('DOMContentLoaded'));
  pressKey('Enter');
}

const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');
const originalAnimationFrame = Object.getOwnPropertyDescriptor(globalThis, 'requestAnimationFrame');
const originalAudio = Object.getOwnPropertyDescriptor(globalThis, 'Audio');
const originalGetState = GameRunner.prototype.getState;
const originalStartTowerPlacement = GameRunner.prototype.startTowerPlacement;
const originalStartWave = GameRunner.prototype.startWave;
const originalResume = GameRunner.prototype.resume;
const originalGetPlacementState = GameRunner.prototype.getPlacementState;
const originalGetTowerSelectionPreview = GameRunner.prototype.getTowerSelectionPreviewRenderData;
const originalGetTowerInfoPanel = GameRunner.prototype.getTowerInfoPanelRenderData;
const originalSelectTowerAtPosition = GameRunner.prototype.selectTowerAtPosition;
const originalDeselectTower = GameRunner.prototype.deselectTower;
const originalSellTowerAtPosition = GameRunner.prototype.sellTowerAtPosition;
const originalMatureTower = GameRunner.prototype.matureTower;
const originalEvolveTower = GameRunner.prototype.evolveTower;
const originalSetGameSpeed = GameRunner.prototype.setGameSpeed;
const originalShowMapSelectionUI = GameRunner.prototype.showMapSelectionUI;
const originalHideMapSelectionUI = GameRunner.prototype.hideMapSelectionUI;
const originalSelectMap = GameRunner.prototype.selectMap;
const originalReleaseFeatures = releaseScopeModule.RELEASE_FEATURES;

let forcedState: GameState | null = null;
let towerPlacementCalls = 0;
let waveStartCalls = 0;
let resumeCalls = 0;
let selectionCalls = 0;
let deselectCalls = 0;
let sellCalls = 0;
let matureCalls = 0;
let evolveCalls = 0;
let speedCalls = 0;
let showMapCalls = 0;
let hideMapCalls = 0;
let selectMapCalls = 0;
let forcedPlacementState: PlacementState | null = null;
let forcedSelectionPreview: ReturnType<GameRunner['getTowerSelectionPreviewRenderData']> | null = null;
let forcedTowerInfoPanel: ReturnType<GameRunner['getTowerInfoPanelRenderData']> | null = null;

Object.defineProperty(globalThis, 'window', { configurable: true, value: fakeWindow });
Object.defineProperty(globalThis, 'document', {
  configurable: true,
  value: { getElementById: (): object => fakeCanvas },
});
Object.defineProperty(globalThis, 'requestAnimationFrame', { configurable: true, value: (): number => 1 });
Object.defineProperty(globalThis, 'Audio', { configurable: true, value: FakeAudio });

GameRunner.prototype.getState = function (): GameState {
  return forcedState ?? originalGetState.call(this);
};
GameRunner.prototype.startTowerPlacement = function (towerType: TowerType): boolean {
  towerPlacementCalls++;
  return originalStartTowerPlacement.call(this, towerType);
};
GameRunner.prototype.startWave = function (waveIndex?: number): boolean {
  waveStartCalls++;
  return originalStartWave.call(this, waveIndex);
};
GameRunner.prototype.resume = function (): boolean {
  resumeCalls++;
  return originalResume.call(this);
};
GameRunner.prototype.getPlacementState = function (): PlacementState {
  return forcedPlacementState ?? originalGetPlacementState.call(this);
};
GameRunner.prototype.getTowerSelectionPreviewRenderData = function () {
  return forcedSelectionPreview ?? originalGetTowerSelectionPreview.call(this);
};
GameRunner.prototype.getTowerInfoPanelRenderData = function () {
  return forcedTowerInfoPanel ?? originalGetTowerInfoPanel.call(this);
};
GameRunner.prototype.selectTowerAtPosition = function (x: number, y: number): boolean {
  selectionCalls++;
  return originalSelectTowerAtPosition.call(this, x, y);
};
GameRunner.prototype.deselectTower = function (): void {
  deselectCalls++;
  originalDeselectTower.call(this);
};
GameRunner.prototype.sellTowerAtPosition = function (x: number, y: number, confirmDisconnect?: boolean) {
  sellCalls++;
  return confirmDisconnect
    ? { status: 'sold', refund: 100, disconnects: [2], disconnectLabels: ['Relay'] }
    : { status: 'confirmation_required', refund: 0, disconnects: [2], disconnectLabels: ['Relay'] };
};
GameRunner.prototype.matureTower = function (towerId: number) {
  matureCalls++;
  return originalMatureTower.call(this, towerId);
};
GameRunner.prototype.evolveTower = function (towerId: number, path: EvolutionPath) {
  evolveCalls++;
  return originalEvolveTower.call(this, towerId, path);
};
GameRunner.prototype.setGameSpeed = function (speed: GameSpeed): void {
  speedCalls++;
  originalSetGameSpeed.call(this, speed);
};
GameRunner.prototype.showMapSelectionUI = function (): void {
  showMapCalls++;
  originalShowMapSelectionUI.call(this);
};
GameRunner.prototype.hideMapSelectionUI = function (): void {
  hideMapCalls++;
  originalHideMapSelectionUI.call(this);
};
GameRunner.prototype.selectMap = function (mapId: string): boolean {
  selectMapCalls++;
  return originalSelectMap.call(this, mapId);
};

try {
  Object.defineProperty(releaseScopeModule, 'RELEASE_FEATURES', {
    configurable: true,
    enumerable: true,
    value: Object.freeze({ ...originalReleaseFeatures, mapSelection: true }),
    writable: true,
  });
  require('../main');

  const hiddenPanel = buildTowerInfoPanel(null, false, 5000, false);
  const matureFixture = createTowerWithGrowth(101, 100, 100, TowerType.Puffball, TargetingMode.First);
  const maturePanel = buildTowerInfoPanel(matureFixture, true, 5000, true);
  const evolveFixture = createTowerWithGrowth(102, 100, 100, TowerType.Puffball, TargetingMode.First);
  evolveFixture.growth.stage = TowerStage.Mature;
  const evolvePanel = buildTowerInfoPanel(evolveFixture, true, 5000, true);
  const selectionPreview: ReturnType<GameRunner['getTowerSelectionPreviewRenderData']> = {
    selection: null,
    sellButton: {
      position: { x: 390, y: 290 },
      size: { width: 20, height: 20 },
      sellValue: 100,
      color: '#F44336',
      textColor: '#FFFFFF',
    },
    isSelecting: true,
    rangePreview: null,
  };

  createRunningGame();
  forcedPlacementState = PlacementState.None;
  forcedTowerInfoPanel = hiddenPanel;
  selectionCalls = 0;
  clickCanvas(640, 360);
  assertEqual(selectionCalls, 1, 'harmless tower selection remains available during onboarding');

  createRunningGame();
  speedCalls = 0;
  pressKey('F2');
  assertEqual(speedCalls, 0, 'speed hotkey invokes no simulation mutation during onboarding');
  pressKey('s');
  pressKey('F2');
  assertEqual(speedCalls, 1, 'speed hotkey becomes available after Skip');

  createRunningGame();
  showMapCalls = 0;
  hideMapCalls = 0;
  selectMapCalls = 0;
  pressKey('m');
  assertEqual(showMapCalls, 0, 'map hotkey invokes no show mutation during onboarding');
  assertEqual(hideMapCalls, 0, 'map hotkey invokes no hide mutation during onboarding');
  assertEqual(selectMapCalls, 0, 'map hotkey invokes no map selection during onboarding');
  pressKey('s');
  pressKey('m');
  assertEqual(showMapCalls, 1, 'map hotkey shows map selection after Skip');
  assertEqual(hideMapCalls, 0, 'first allowed map hotkey does not hide map selection');
  assertEqual(selectMapCalls, 0, 'keyboard map UI toggle does not select a map');
  pressKey('m');
  assertEqual(showMapCalls, 1, 'second allowed map hotkey does not show map selection twice');
  assertEqual(hideMapCalls, 1, 'second allowed map hotkey hides map selection');
  assertEqual(selectMapCalls, 0, 'keyboard map UI close does not select a map');

  createRunningGame();
  forcedPlacementState = PlacementState.Selecting;
  forcedSelectionPreview = selectionPreview;
  forcedTowerInfoPanel = hiddenPanel;
  sellCalls = 0;
  clickCanvas(640, 360);
  assertEqual(sellCalls, 0, 'sell and confirmed sell invoke no simulation calls during onboarding');
  pressKey('s');
  clickCanvas(640, 360);
  assertEqual(sellCalls, 2, 'sell and confirmed sell become available after Skip');

  createRunningGame();
  forcedPlacementState = PlacementState.Selecting;
  forcedSelectionPreview = selectionPreview;
  forcedTowerInfoPanel = hiddenPanel;
  sellCalls = 0;
  deselectCalls = 0;
  clickCanvas(600, 360);
  assertEqual(sellCalls, 0, 'inspection outside sell geometry never probes the sell mutation');
  assertEqual(deselectCalls, 1, 'harmless deselect remains available during onboarding');

  const matureAction = maturePanel.matureAction;
  if (matureAction === null) throw new Error('FAIL: mature action fixture');
  createRunningGame();
  forcedPlacementState = PlacementState.Selecting;
  forcedTowerInfoPanel = maturePanel;
  matureCalls = 0;
  clickCanvas(
    matureAction.position.x + matureAction.size.width / 2,
    matureAction.position.y + matureAction.size.height / 2,
  );
  assertEqual(matureCalls, 0, 'Mature invokes no simulation mutation during onboarding');
  pressKey('s');
  clickCanvas(
    matureAction.position.x + matureAction.size.width / 2,
    matureAction.position.y + matureAction.size.height / 2,
  );
  assertEqual(matureCalls, 1, 'Mature becomes available after Skip');

  const evolveAction = evolvePanel.evolutionCards.find(card => card.path === EvolutionPath.Predator);
  if (evolveAction === undefined) throw new Error('FAIL: evolve action fixture');
  createRunningGame();
  forcedPlacementState = PlacementState.Selecting;
  forcedTowerInfoPanel = evolvePanel;
  evolveCalls = 0;
  clickCanvas(
    evolveAction.position.x + evolveAction.size.width / 2,
    evolveAction.position.y + evolveAction.size.height / 2,
  );
  assertEqual(evolveCalls, 0, 'Evolve invokes no simulation mutation during onboarding');
  pressKey('s');
  clickCanvas(
    evolveAction.position.x + evolveAction.size.width / 2,
    evolveAction.position.y + evolveAction.size.height / 2,
  );
  assertEqual(evolveCalls, 1, 'Evolve becomes available after Skip');

  forcedPlacementState = null;
  forcedSelectionPreview = null;
  forcedTowerInfoPanel = null;

  createRunningGame();
  towerPlacementCalls = 0;
  waveStartCalls = 0;
  pressKey('1');
  pressKey('Enter');
  assertEqual(towerPlacementCalls, 0, 'onboarding blocks a keyboard non-Sporecap placement');
  assertEqual(waveStartCalls, 0, 'onboarding blocks keyboard wave start before placement');
  pressKey('6');
  assertEqual(towerPlacementCalls, 1, 'onboarding allows the keyboard Sporecap command');

  createRunningGame();
  towerPlacementCalls = 0;
  clickCanvas(
    RELEASE_HUD_LAYOUT.towerCards[0].x + 10,
    RELEASE_HUD_LAYOUT.towerCards[0].y + 10,
  );
  assertEqual(towerPlacementCalls, 0, 'onboarding blocks a pointer non-Sporecap placement');
  clickCanvas(
    RELEASE_HUD_LAYOUT.towerCards[5].x + 10,
    RELEASE_HUD_LAYOUT.towerCards[5].y + 10,
  );
  assertEqual(towerPlacementCalls, 1, 'onboarding allows the pointer Sporecap command');

  createRunningGame();
  towerPlacementCalls = 0;
  waveStartCalls = 0;
  pressKey('s');
  assertEqual(towerPlacementCalls, 0, 'keyboard Skip does not mutate tower placement');
  assertEqual(waveStartCalls, 0, 'keyboard Skip does not mutate wave state');
  pressKey('1');
  assertEqual(towerPlacementCalls, 1, 'skipped onboarding releases keyboard gameplay commands');

  createRunningGame();
  towerPlacementCalls = 0;
  clickCanvas(
    ONBOARDING_LAYOUT.skipButton.x + ONBOARDING_LAYOUT.skipButton.width / 2,
    ONBOARDING_LAYOUT.skipButton.y + ONBOARDING_LAYOUT.skipButton.height / 2,
  );
  assertEqual(towerPlacementCalls, 0, 'pointer Skip does not mutate tower placement');
  clickCanvas(
    RELEASE_HUD_LAYOUT.towerCards[0].x + 10,
    RELEASE_HUD_LAYOUT.towerCards[0].y + 10,
  );
  assertEqual(towerPlacementCalls, 1, 'pointer Skip releases pointer gameplay commands');

  createRunningGame();
  pressKey('s');
  pressKey('Space');
  clickCanvas(640, 440);
  towerPlacementCalls = 0;
  clickCanvas(
    ONBOARDING_LAYOUT.replayButton.x + ONBOARDING_LAYOUT.replayButton.width / 2,
    ONBOARDING_LAYOUT.replayButton.y + ONBOARDING_LAYOUT.replayButton.height / 2,
  );
  assertEqual(towerPlacementCalls, 0, 'menu Replay changes no simulation state');
  pressKey('Enter');
  pressKey('1');
  assertEqual(towerPlacementCalls, 0, 'menu Replay restores the Sporecap lesson before Start');

  createRunningGame();
  pressKey('Space');
  towerPlacementCalls = 0;
  waveStartCalls = 0;
  pressKey('1');
  pressKey('Enter');
  assertEqual(towerPlacementCalls, 0, 'pause consumes tower hotkeys');
  assertEqual(waveStartCalls, 0, 'pause consumes wave-start hotkeys');

  createRunningGame();
  pressKey('Space');
  towerPlacementCalls = 0;
  clickCanvas(330, 630);
  assertEqual(towerPlacementCalls, 0, 'pause consumes purchase-button clicks');

  createRunningGame();
  pressKey('Space');
  resumeCalls = 0;
  pressKey('Escape');
  assertEqual(resumeCalls, 1, 'Escape resumes from pause');

  createRunningGame();
  forcedState = GameState.GameOver;
  towerPlacementCalls = 0;
  pressKey('1');
  assertEqual(towerPlacementCalls, 0, 'terminal consumes tower hotkeys');

  createRunningGame();
  forcedState = GameState.Victory;
  towerPlacementCalls = 0;
  clickCanvas(330, 630);
  assertEqual(towerPlacementCalls, 0, 'terminal consumes purchase-button clicks');

  console.log('UI input precedence integration tests passed');
} finally {
  GameRunner.prototype.getState = originalGetState;
  GameRunner.prototype.startTowerPlacement = originalStartTowerPlacement;
  GameRunner.prototype.startWave = originalStartWave;
  GameRunner.prototype.resume = originalResume;
  GameRunner.prototype.getPlacementState = originalGetPlacementState;
  GameRunner.prototype.getTowerSelectionPreviewRenderData = originalGetTowerSelectionPreview;
  GameRunner.prototype.getTowerInfoPanelRenderData = originalGetTowerInfoPanel;
  GameRunner.prototype.selectTowerAtPosition = originalSelectTowerAtPosition;
  GameRunner.prototype.deselectTower = originalDeselectTower;
  GameRunner.prototype.sellTowerAtPosition = originalSellTowerAtPosition;
  GameRunner.prototype.matureTower = originalMatureTower;
  GameRunner.prototype.evolveTower = originalEvolveTower;
  GameRunner.prototype.setGameSpeed = originalSetGameSpeed;
  GameRunner.prototype.showMapSelectionUI = originalShowMapSelectionUI;
  GameRunner.prototype.hideMapSelectionUI = originalHideMapSelectionUI;
  GameRunner.prototype.selectMap = originalSelectMap;
  Object.defineProperty(releaseScopeModule, 'RELEASE_FEATURES', {
    configurable: true,
    enumerable: true,
    value: originalReleaseFeatures,
    writable: true,
  });

  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
  if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
  else Reflect.deleteProperty(globalThis, 'document');
  if (originalAnimationFrame) Object.defineProperty(globalThis, 'requestAnimationFrame', originalAnimationFrame);
  else Reflect.deleteProperty(globalThis, 'requestAnimationFrame');
  if (originalAudio) Object.defineProperty(globalThis, 'Audio', originalAudio);
  else Reflect.deleteProperty(globalThis, 'Audio');
}

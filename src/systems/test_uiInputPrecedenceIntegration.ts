import { GameRunner, GameState } from './gameRunner';
import { TowerType } from '../entities/tower';

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

let forcedState: GameState | null = null;
let towerPlacementCalls = 0;
let waveStartCalls = 0;
let resumeCalls = 0;

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

try {
  require('../main');

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

  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
  if (originalDocument) Object.defineProperty(globalThis, 'document', originalDocument);
  else Reflect.deleteProperty(globalThis, 'document');
  if (originalAnimationFrame) Object.defineProperty(globalThis, 'requestAnimationFrame', originalAnimationFrame);
  else Reflect.deleteProperty(globalThis, 'requestAnimationFrame');
  if (originalAudio) Object.defineProperty(globalThis, 'Audio', originalAudio);
  else Reflect.deleteProperty(globalThis, 'Audio');
}

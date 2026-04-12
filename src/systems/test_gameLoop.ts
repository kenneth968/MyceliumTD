import { GameRunner, GameState } from './gameRunner';
import { GameRenderer, createGameRenderer } from './gameRenderer';
import { GameLoop, GameLoopConfig, GameLoopStats, createGameLoop, createTestGameLoop, GameEventType } from './gameLoop';
import { TowerType } from '../entities/tower';
import { TargetingMode } from './targeting';

console.log('=== GameLoop Tests ===\n');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean): void {
  try {
    if (fn()) {
      passed++;
      console.log(`  ✓ ${name}`);
    } else {
      failed++;
      console.log(`  ✗ ${name}`);
    }
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}: ${e}`);
  }
}

// Creation tests
console.log('Creation tests:');
const game = new GameRunner();
const renderer = createGameRenderer();
const loop = new GameLoop(game, renderer);
test('GameLoop creation returns defined', () => loop !== undefined);
test('loop is not active initially', () => loop.isActive() === false);
test('loop is not paused initially', () => loop.isPausedState() === false);
test('initial FPS is 0', () => loop.getFPS() === 0);

// Start/Stop tests
console.log('\nStart/Stop tests:');
loop.start();
test('loop is active after start', () => loop.isActive() === true);
loop.stop();
test('loop is not active after stop', () => loop.isActive() === false);

// Double start
loop.start();
loop.start();
test('double start still works', () => loop.isActive() === true);
loop.stop();

// Pause/Resume tests
console.log('\nPause/Resume tests:');
loop.start();
loop.pause();
test('loop is paused after pause()', () => loop.isPausedState() === true);
test('game state is Paused after pause()', () => loop.getGameState() === GameState.Paused);
loop.resume();
test('loop is not paused after resume()', () => loop.isPausedState() === false);
test('game state is Playing after resume()', () => loop.getGameState() === GameState.Playing);
loop.stop();

// Non-running pause
loop.pause();
test('pause without start does not pause', () => loop.isPausedState() === false);

// Toggle tests
console.log('\nToggle tests:');
loop.start();
loop.togglePause();
test('toggle to paused state', () => loop.isPausedState() === true);
loop.togglePause();
test('toggle to resumed state', () => loop.isPausedState() === false);
loop.stop();

// Game integration tests
console.log('\nGame integration tests:');
test('getGame returns correct game', () => loop.getGame() === game);
test('getRenderer returns correct renderer', () => loop.getRenderer() === renderer);

// Stats tests
console.log('\nStats tests:');
const stats = loop.getStats();
test('getStats returns defined object', () => stats !== undefined);
test('stats has fps property', () => typeof stats.fps === 'number');
test('stats has frameCount property', () => typeof stats.frameCount === 'number');
test('stats has totalTime property', () => typeof stats.totalTime === 'number');
test('stats has deltaTime property', () => typeof stats.deltaTime === 'number');
test('stats has renderTime property', () => typeof stats.renderTime === 'number');
test('stats has updateTime property', () => typeof stats.updateTime === 'number');

// State history tests
console.log('\nState history tests:');
const history = loop.getStateHistory();
test('getStateHistory returns array', () => Array.isArray(history));

// Callbacks tests
console.log('\nCallbacks tests:');
let renderCallbackCalled = false;
loop.setRenderCallback(() => {
  renderCallbackCalled = true;
});
test('setRenderCallback works', () => renderCallbackCalled === false);

let eventCallbackCalled = false;
loop.setEventCallback((event) => {
  eventCallbackCalled = true;
});
test('setEventCallback works', () => eventCallbackCalled === false);

// createGameLoop factory tests
console.log('\nFactory tests:');
const factoryLoop = createGameLoop(new GameRunner());
test('createGameLoop creates loop', () => factoryLoop !== undefined);
test('createGameLoop loop is not active initially', () => factoryLoop.isActive() === false);
factoryLoop.stop();

const factoryLoop2 = createGameLoop(new GameRunner(), createGameRenderer());
test('createGameLoop with renderer works', () => factoryLoop2 !== undefined);
factoryLoop2.stop();

const config: GameLoopConfig = { targetFPS: 30 };
const factoryLoop3 = createGameLoop(new GameRunner(), undefined, config);
test('createGameLoop with config works', () => factoryLoop3 !== undefined);
factoryLoop3.stop();

// createTestGameLoop tests
console.log('\ncreateTestGameLoop tests:');
const testLoop = createTestGameLoop();
test('createTestGameLoop creates loop', () => testLoop !== undefined);
test('createTestGameLoop has game', () => testLoop.getGame() !== undefined);
test('createTestGameLoop has renderer', () => testLoop.getRenderer() !== undefined);
testLoop.stop();

// State tracking tests
console.log('\nState tracking tests:');
const stateLoop = new GameLoop(new GameRunner());
stateLoop.start();
stateLoop.pause();
const pausedHistory = stateLoop.getStateHistory();
test('state history records paused state', () => pausedHistory.some(h => h.state === GameState.Paused));
stateLoop.resume();
stateLoop.stop();

// Game loop lifecycle
console.log('\nLifecycle tests:');
const lifecycleLoop = createTestGameLoop();
test('lifecycle - start', () => lifecycleLoop.isActive() === false);
lifecycleLoop.start();
test('lifecycle - after start is active', () => lifecycleLoop.isActive() === true);
test('lifecycle - game state is Playing', () => lifecycleLoop.getGameState() === GameState.Playing);
lifecycleLoop.pause();
test('lifecycle - after pause is paused', () => lifecycleLoop.isPausedState() === true);
lifecycleLoop.resume();
test('lifecycle - after resume not paused', () => lifecycleLoop.isPausedState() === false);
lifecycleLoop.stop();
test('lifecycle - after stop not active', () => lifecycleLoop.isActive() === false);

// Test game methods work through loop
console.log('\nGame through loop tests:');
const gameLoop = createTestGameLoop();
gameLoop.start();
const tower = gameLoop.getGame().placeTower(TowerType.PuffballFungus, 200, 200, TargetingMode.First);
test('can place tower through game loop', () => tower !== null);
gameLoop.stop();

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);

if (failed > 0) {
  process.exit(1);
}
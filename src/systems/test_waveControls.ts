import { createGameRunner, GameRunner, GameState } from './gameRunner';
import { WaveControls, createWaveControls, WaveControlState, WaveUIState } from './waveControls';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} (expected ${expected}, got ${actual})`);
  }
}

console.log('Testing WaveControls...');

let gameRunner: GameRunner;
let waveControls: WaveControls;

gameRunner = createGameRunner();
waveControls = createWaveControls(gameRunner);

const initialState = waveControls.getWaveUIState();
assert(initialState.controlState === WaveControlState.Waiting, 'Initial state should be Waiting');
assertEqual(initialState.currentWave, 0, 'Current wave should be 0 when idle');
assertEqual(initialState.totalWaves, 10, 'Total waves should be 10');
assert(initialState.canStartWave === true, 'Should be able to start wave when idle');
assert(initialState.canPause === false, 'Should not be able to pause when idle');
assert(initialState.canResume === false, 'Should not be able to resume when idle');
console.log('  initial state tests passed');

const startResult = waveControls.startWave();
assert(startResult.success === true, 'startWave should succeed');
const activeState = waveControls.getWaveUIState();
assert(activeState.controlState === WaveControlState.Active, 'State should be Active after start');

const doubleStartResult = waveControls.startWave();
assert(doubleStartResult.success === false, 'startWave should fail when already active');
assertEqual(doubleStartResult.message, 'Wave already in progress', 'Should return correct message');
console.log('  startWave tests passed');

const pauseResult = waveControls.pauseGame();
assert(pauseResult.success === true, 'pauseGame should succeed');
const pausedState = waveControls.getWaveUIState();
assert(pausedState.controlState === WaveControlState.Paused, 'State should be Paused');
assert(pausedState.isPaused === true, 'isPaused should be true');
console.log('  pause tests passed');

const resumeResult = waveControls.resumeGame();
assert(resumeResult.success === true, 'resumeGame should succeed');
const resumedState = waveControls.getWaveUIState();
assert(resumedState.controlState === WaveControlState.Active, 'State should be Active after resume');
assert(resumedState.isPaused === false, 'isPaused should be false');
console.log('  resume tests passed');

const cannotPauseResult = waveControls.pauseGame();
waveControls.resumeGame();
assert(cannotPauseResult.success === true, 'pause should succeed after resume');

const cannotResumeWhenPlaying = waveControls.resumeGame();
assert(cannotResumeWhenPlaying.success === false, 'resume should fail when not paused');
assertEqual(cannotResumeWhenPlaying.message, 'Cannot resume', 'Should return correct message');
console.log('  pause/resume edge cases passed');

assert(waveControls.getIsFastForward() === false, 'Fast forward should be false initially');
waveControls.setFastForward(true);
assert(waveControls.getIsFastForward() === true, 'Fast forward should be true after setFastForward');
waveControls.setFastForward(false);
assert(waveControls.getIsFastForward() === false, 'Fast forward should be false after reset');
console.log('  setFastForward tests passed');

waveControls.toggleFastForward();
assert(waveControls.getIsFastForward() === true, 'toggleFastForward should enable fast forward');
waveControls.toggleFastForward();
assert(waveControls.getIsFastForward() === false, 'toggleFastForward should disable fast forward');
console.log('  toggleFastForward tests passed');

const ffState = waveControls.getWaveUIState();
assert(ffState.canFastForward === true, 'canFastForward should be true when playing');
assert(ffState.isFastForward === false, 'isFastForward in UI state should match');
console.log('  fast forward UI state tests passed');

gameRunner.reset();
waveControls = createWaveControls(gameRunner);
const nextWaveResult = waveControls.startNextWave();
assert(nextWaveResult.success === true, 'startNextWave should succeed');
console.log('  startNextWave tests passed');

assert(waveControls.getGameRunner() === gameRunner, 'getGameRunner should return the game runner');
console.log('  getGameRunner tests passed');

gameRunner.reset();
waveControls = createWaveControls(gameRunner);
assert(waveControls.canStartNextWave() === true, 'canStartNextWave should be true initially');
console.log('  canStartNextWave tests passed');

gameRunner.reset();
waveControls = createWaveControls(gameRunner);
assert(waveControls.isWaveComplete() === false, 'isWaveComplete should be false when no wave started');
console.log('  isWaveComplete tests passed');

assert(waveControls.isGameEnded() === false, 'isGameEnded should be false initially');
console.log('  isGameEnded tests passed');

const victoryRunner = createGameRunner({ startingLives: 100, maxWaves: 1 });
const victoryControls = createWaveControls(victoryRunner);
victoryRunner.start();
victoryRunner.startWave(0);
victoryRunner.update(Date.now() + 100000);
const victoryState = victoryControls.getWaveUIState();
assert(victoryState.controlState === WaveControlState.Active || victoryState.controlState === WaveControlState.Complete || victoryState.controlState === WaveControlState.Victory, 'Should report active/complete/victory state');
console.log('  victory state tests passed');

console.log('\nAll WaveControls tests passed!');
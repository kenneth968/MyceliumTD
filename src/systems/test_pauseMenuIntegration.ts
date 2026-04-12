import { createGameRunner, GameRunner, GameState } from './gameRunner';
import { getPauseMenuRenderData, createPauseMenuAnimator, updatePauseMenu } from './pauseMenuRender';

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

console.log('Testing pause menu integration with GameRunner...');

let game: GameRunner;

game = createGameRunner();
assert(game.getPauseMenuAnimator() !== undefined, 'GameRunner should have pause menu animator');
console.log('  pause menu animator getter tests passed');

game = createGameRunner();
let pauseData = game.getPauseMenuRenderData();
assert(pauseData.isVisible === false, 'Pause menu should not be visible in idle state');
assert(pauseData.state === 'hidden' || !pauseData.isVisible, 'State should be hidden when not visible');
console.log('  initial state pause menu render data tests passed');

game = createGameRunner();
game.start();
game.pause();
pauseData = game.getPauseMenuRenderData();
assert(pauseData.isVisible === true, 'Pause menu should be visible after pause');
assert(game.getState() === GameState.Paused, 'Game state should be paused');
console.log('  pause triggers menu visibility tests passed');

game = createGameRunner();
game.start();
game.pause();
let pauseRenderData1 = game.getPauseMenuRenderData();
assert(pauseRenderData1.isVisible === true, 'Pause menu should be visible when paused');
assert(game.getState() === GameState.Paused, 'Game state should be paused');

game.resume();
assert(game.getState() === GameState.Playing, 'Game state should be playing after resume');

game.update(1000);
game.update(1200);
pauseData = game.getPauseMenuRenderData();
let isHiddenOrNotVisible = pauseData.state === 'hidden' || !pauseData.isVisible;
let isExitingButStillVisible = pauseData.state === 'exiting';
assert(isHiddenOrNotVisible || isExitingButStillVisible, 'Pause menu should be hidden, not visible, or exiting after resume');
console.log('  resume hides menu tests passed');

game = createGameRunner();
game.start();
game.pause();
game.update(1000);
game.update(1200);
pauseData = game.getPauseMenuRenderData();
assert(pauseData.buttons.length === 3, 'Should have 3 buttons');
assert(pauseData.buttons[0].id === 'resume', 'First button should be resume');
assert(pauseData.buttons[1].id === 'restart', 'Second button should be restart');
assert(pauseData.buttons[2].id === 'quit', 'Third button should be quit');
console.log('  pause menu buttons tests passed');

game = createGameRunner();
game.start();
game.pause();
const initialRenderData = game.getPauseMenuRenderData();
const initialOpacity = initialRenderData.backgroundOpacity;

game.update(1000);
game.update(1200);

const afterUpdateRenderData = game.getPauseMenuRenderData();
assert(afterUpdateRenderData.backgroundOpacity !== undefined, 'Opacity should be defined');
console.log('  pause menu update animation tests passed');

game = createGameRunner();
game.start();
game.pause();
let gameStats = game.getGameStats();
let pauseRenderDataForStats = game.getPauseMenuRenderData();
assertEqual(pauseRenderDataForStats.subtitle, `Wave ${gameStats.wave} / ${gameStats.totalWaves}`, 'Should show correct wave info');
console.log('  pause menu wave info tests passed');

game = createGameRunner();
game.start();
game.pause();
game.resume();
assert(game.getState() === GameState.Playing, 'Should be playing after resume');

game.pause();
assert(game.getState() === GameState.Paused, 'Should be paused after pause');

game.resume();
assert(game.getState() === GameState.Playing, 'Should be playing after second resume');
console.log('  pause/resume state transitions tests passed');

game = createGameRunner();
game.start();
game.pause();
game.update(1000);
game.resume();
game.update(2000);
game.pause();
const pausedRenderData = game.getPauseMenuRenderData();
assert(pausedRenderData.isVisible === true, 'Pause menu should be visible on second pause');
assert(game.getState() === GameState.Paused, 'Game should be in paused state');
console.log('  multiple pause cycles tests passed');

game = createGameRunner();
game.reset();
pauseData = game.getPauseMenuRenderData();
assert(pauseData.isVisible === false || !pauseData.isVisible, 'Pause menu should not be visible after reset');
assert(game.getState() === GameState.Idle, 'Game should be idle after reset');
console.log('  reset clears pause menu tests passed');

game = createGameRunner();
game.start();
game.pause();
game.update(1000);
game.update(1150);
game.resume();
assert(game.getPauseMenuAnimator() !== undefined, 'Animator should still exist after resume');
assert(game.getState() === GameState.Playing, 'Should be playing');
console.log('  animator persists after resume tests passed');

game = createGameRunner();
game.start();
game.pause();
const menuRender = game.getPauseMenuRenderData();
assert(menuRender.position !== undefined, 'Menu should have position');
assert(menuRender.size !== undefined, 'Menu should have size');
assert(menuRender.title !== undefined, 'Menu should have title');
assert(menuRender.subtitle !== undefined, 'Menu should have subtitle');
console.log('  pause menu render data completeness tests passed');

console.log('All pause menu integration tests passed!');
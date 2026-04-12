import { createGameRunner, GameRunner, GameState } from './gameRunner';
import { getPauseMenuRenderData, getPauseMenuButtonAtPosition, createPauseMenuAnimator, updatePauseMenu } from './pauseMenuRender';

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

console.log('Testing pause menu button click handlers...');

let game: GameRunner;

game = createGameRunner();
assert(typeof game.handlePauseMenuButtonClick === 'function', 'GameRunner should have handlePauseMenuButtonClick method');
console.log('  handlePauseMenuButtonClick method exists tests passed');

game = createGameRunner();
game.start();
const result1 = game.handlePauseMenuButtonClick(400, 300);
assert(result1.handled === false, 'Should not handle clicks when not paused');
console.log('  non-paused state returns not handled tests passed');

game = createGameRunner();
game.start();
game.pause();
assert(game.getState() === GameState.Paused, 'Game should be paused');

const resumeResult = game.handlePauseMenuButtonClick(400, 280);
assert(resumeResult.handled === true, 'Resume button click should be handled');
assert(resumeResult.buttonId === 'resume', 'Button ID should be resume');
assert(game.getState() === GameState.Playing, 'Game should resume after resume button click');
console.log('  resume button click tests passed');

game = createGameRunner();
game.start();
game.pause();
assert(game.getState() === GameState.Paused, 'Game should be paused');

const restartResult = game.handlePauseMenuButtonClick(400, 330);
assert(restartResult.handled === true, 'Restart button click should be handled');
assert(restartResult.buttonId === 'restart', 'Button ID should be restart');
assert(game.getState() === GameState.Playing, 'Game should be playing after restart');
console.log('  restart button click tests passed');

game = createGameRunner();
game.start();
game.pause();
assert(game.getState() === GameState.Paused, 'Game should be paused');

const quitResult = game.handlePauseMenuButtonClick(400, 380);
assert(quitResult.handled === true, 'Quit button click should be handled');
assert(quitResult.buttonId === 'quit', 'Button ID should be quit');
assert(game.getState() === GameState.Idle, 'Game should be idle after quit');
console.log('  quit button click tests passed');

game = createGameRunner();
game.start();
game.pause();

const missResult = game.handlePauseMenuButtonClick(10, 10);
assert(missResult.handled === false, 'Clicking outside buttons should not be handled');
assert(missResult.buttonId === '', 'Button ID should be empty for missed clicks');
console.log('  miss click returns not handled tests passed');

game = createGameRunner();
game.start();
game.pause();
const animator = game.getPauseMenuAnimator();
const renderData = game.getPauseMenuRenderData();

const resumeButton = renderData.buttons.find(b => b.id === 'resume');
assert(resumeButton !== undefined, 'Resume button should exist');
assert(resumeButton!.position.x === 400, 'Resume button should be at x=400');
assert(resumeButton!.position.y === 280, 'Resume button should be at y=280');

const clickResult = game.handlePauseMenuButtonClick(resumeButton!.position.x, resumeButton!.position.y);
assert(clickResult.handled === true, 'Clicking on resume button position should work');
console.log('  button position accuracy tests passed');

game = createGameRunner();
game.start();
game.pause();
game.resume();
game.pause();

const resumeResult2 = game.handlePauseMenuButtonClick(400, 280);
assert(resumeResult2.handled === true, 'Second pause should also respond to resume');
assert(game.getState() === GameState.Playing, 'Second resume should work');
console.log('  multiple pause cycles button handling tests passed');

console.log('All pause menu button click handler tests passed!');
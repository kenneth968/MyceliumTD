import { GameRunner, GameState, createGameRunner } from './gameRunner';
import { TowerType, TOWER_STATS } from '../entities/tower';
import { TargetingMode } from './targeting';
import {
  GameOverVictoryState,
  createGameOverVictoryAnimator,
  showGameOver,
  showVictory,
  hideGameOverVictory,
  isGameOverVictoryVisible,
  getGameOverVictoryUIState,
  updateGameOverVictory,
  getGameOverVictoryRenderData,
  isGameOverShowing,
  isVictoryShowing,
  resetGameOverVictoryAnimator,
} from './gameOverVictoryRender';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} - Expected ${expected}, got ${actual}`);
  }
}

console.log('Testing GameOverVictory Integration...');

console.log('Test 1: GameRunner has gameOverVictoryAnimator');
const game1 = createGameRunner();
assert(game1.getGameOverVictoryAnimator() !== undefined, 'Should have gameOverVictoryAnimator');
console.log('  PASS');

console.log('Test 2: GameRunner has getGameOverVictoryRenderData');
const renderData1 = game1.getGameOverVictoryRenderData();
assert(renderData1 !== undefined, 'Should have getGameOverVictoryRenderData');
assertEqual(renderData1.state, GameOverVictoryState.Hidden, 'Initial state should be Hidden');
assert(!renderData1.isVisible, 'Should not be visible initially');
console.log('  PASS');

console.log('Test 3: GameOverVictory UI state - Playing');
const uiStatePlaying = getGameOverVictoryUIState(GameState.Playing, 1000, 5);
assert(!uiStatePlaying.isVisible, 'Playing should not show game over/victory');
console.log('  PASS');

console.log('Test 4: GameOverVictory UI state - GameOver');
const uiStateGameOver = getGameOverVictoryUIState(GameState.GameOver, 500, 3);
assert(uiStateGameOver.isVisible, 'GameOver should show game over/victory');
assert(uiStateGameOver.canRestart, 'Should be able to restart from game over');
assert(uiStateGameOver.canQuit, 'Should be able to quit from game over');
assertEqual(uiStateGameOver.finalScore, 500, 'Final score should be 500');
assertEqual(uiStateGameOver.finalWave, 3, 'Final wave should be 3');
console.log('  PASS');

console.log('Test 5: GameOverVictory UI state - Victory');
const uiStateVictory = getGameOverVictoryUIState(GameState.Victory, 3000, 10);
assert(uiStateVictory.isVisible, 'Victory should show game over/victory');
assertEqual(uiStateVictory.finalScore, 3000, 'Final score should be 3000');
assertEqual(uiStateVictory.finalWave, 10, 'Final wave should be 10');
console.log('  PASS');

console.log('Test 6: GameRunner reset clears gameOverVictory');
const game2 = createGameRunner();
showGameOver(game2.getGameOverVictoryAnimator(), 1500, 5, 1000);
assert(isGameOverVictoryVisible(game2.getGameOverVictoryAnimator()), 'Should be visible before reset');
game2.reset();
const renderData2 = game2.getGameOverVictoryRenderData();
assertEqual(renderData2.state, GameOverVictoryState.Hidden, 'Should be hidden after reset');
assert(!renderData2.isVisible, 'Should not be visible after reset');
console.log('  PASS');

console.log('Test 7: GameRunner game over triggers game over screen');
const game3 = createGameRunner();
game3.start();
game3.startWave(0);
game3.update(1000);
assert(game3.getState() === GameState.Playing, 'Should be playing');
game3.getEconomy().loseLife(20);
game3.update(2000);
assert(game3.getState() === GameState.GameOver, 'Should be game over');
const renderData3 = game3.getGameOverVictoryRenderData();
assertEqual(renderData3.state, GameOverVictoryState.GameOver, 'Should show game over state');
assert(renderData3.isVisible, 'Game over should be visible');
assertEqual(renderData3.title, 'Game Over', 'Title should be Game Over');
console.log('  PASS');

console.log('Test 8: Render data structure during game over');
const game4 = createGameRunner();
showGameOver(game4.getGameOverVictoryAnimator(), 1500, 5, 1000);
updateGameOverVictory(game4.getGameOverVictoryAnimator(), 1000, 2000);
const renderData4 = game4.getGameOverVictoryRenderData();
assertEqual(renderData4.state, GameOverVictoryState.GameOver, 'State should be GameOver');
assert(renderData4.isVisible, 'Should be visible');
assertEqual(renderData4.position.x, 400, 'Position X should be 400');
assertEqual(renderData4.position.y, 300, 'Position Y should be 300');
assertEqual(renderData4.size.width, 500, 'Size width should be 500');
assertEqual(renderData4.size.height, 400, 'Size height should be 400');
assert(renderData4.backgroundColor.includes('rgba'), 'Background should have rgba color');
assertEqual(renderData4.borderColor, '#FF4444', 'Game over border should be red');
assertEqual(renderData4.borderWidth, 3, 'Border width should be 3');
assertEqual(renderData4.title, 'Game Over', 'Title should be Game Over');
assertEqual(renderData4.titleColor, '#FF4444', 'Title color should be red');
assert(renderData4.buttons.length === 2, 'Should have 2 buttons');
console.log('  PASS');

console.log('Test 9: Victory screen shows correctly');
const game5 = createGameRunner();
showVictory(game5.getGameOverVictoryAnimator(), 5000, 10, 1000);
updateGameOverVictory(game5.getGameOverVictoryAnimator(), 1000, 2000);
const renderData5 = game5.getGameOverVictoryRenderData();
assertEqual(renderData5.state, GameOverVictoryState.Victory, 'State should be Victory');
assert(renderData5.isVisible, 'Should be visible');
assertEqual(renderData5.title, 'Victory!', 'Title should be Victory!');
assertEqual(renderData5.titleColor, '#44FF44', 'Title color should be green');
assertEqual(renderData5.borderColor, '#44FF44', 'Border color should be green');
console.log('  PASS');

console.log('Test 10: Buttons have correct structure');
const game6 = createGameRunner();
showGameOver(game6.getGameOverVictoryAnimator(), 1000, 3, 1000);
updateGameOverVictory(game6.getGameOverVictoryAnimator(), 1000, 2000);
const renderData6 = game6.getGameOverVictoryRenderData();
const restartButton = renderData6.buttons.find(b => b.id === 'restart');
const quitButton = renderData6.buttons.find(b => b.id === 'quit');
assert(restartButton !== undefined, 'Should have restart button');
assert(quitButton !== undefined, 'Should have quit button');
assertEqual(restartButton!.label, 'Restart', 'Restart button label');
assertEqual(quitButton!.label, 'Quit', 'Quit button label');
assertEqual(restartButton!.size.width, 180, 'Button width should be 180');
assertEqual(restartButton!.size.height, 45, 'Button height should be 45');
assert(restartButton!.isEnabled, 'Restart should be enabled');
assert(quitButton!.isEnabled, 'Quit should be enabled');
console.log('  PASS');

console.log('Test 11: GameRunner getGameOverVictoryRenderData integration');
const game7 = createGameRunner();
game7.start();
game7.startWave(0);
const renderData7Before = game7.getGameOverVictoryRenderData();
assertEqual(renderData7Before.state, GameOverVictoryState.Hidden, 'Should be hidden before game over');
game7.getEconomy().loseLife(20);
game7.update(2000);
const renderData7After = game7.getGameOverVictoryRenderData();
assertEqual(renderData7After.state, GameOverVictoryState.GameOver, 'Should show game over');
assert(renderData7After.isVisible, 'Should be visible');
console.log('  PASS');

console.log('Test 12: Animation state transitions');
const anim12 = createGameOverVictoryAnimator();
showGameOver(anim12, 1000, 3, 1000);
assertEqual(anim12.state, 'game_over', 'Should be game_over state');
assertEqual(anim12.elapsed, 0, 'Elapsed should be 0 at start');
updateGameOverVictory(anim12, 500, 1500);
assert(anim12.elapsed > 0, 'Elapsed should increase');
assert(anim12.progress > 0, 'Progress should increase');
console.log('  PASS');

console.log('\n=== All 12 integration tests passed! ===');

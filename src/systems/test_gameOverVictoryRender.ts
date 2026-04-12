import {
  GameOverVictoryState,
  GameOverVictoryButton,
  GameOverVictoryRenderData,
  GameOverVictoryAnimator,
  GameOverVictoryUIState,
  createGameOverVictoryAnimator,
  showGameOver,
  showVictory,
  hideGameOverVictory,
  isGameOverVictoryVisible,
  getGameOverVictoryUIState,
  updateGameOverVictory,
  getGameOverVictoryRenderData,
  getGameOverVictoryButtonRenderData,
  getGameOverVictoryPosition,
  getGameOverVictorySize,
  getGameOverVictoryScoreText,
  getGameOverVictoryWaveText,
  isGameOverShowing,
  isVictoryShowing,
  resetGameOverVictoryAnimator,
  getGameOverVictoryButtonAtPosition,
} from './gameOverVictoryRender';
import { GameState } from './gameRunner';

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

console.log('Testing GameOverVictoryRender...');

console.log('Test 1: createGameOverVictoryAnimator');
const animator = createGameOverVictoryAnimator();
assertEqual(animator.state, 'hidden', 'Initial state should be hidden');
assertEqual(animator.elapsed, 0, 'Initial elapsed should be 0');
assertEqual(animator.progress, 0, 'Initial progress should be 0');
assertEqual(animator.finalScore, 0, 'Initial finalScore should be 0');
assertEqual(animator.finalWave, 0, 'Initial finalWave should be 0');
console.log('  PASS');

console.log('Test 2: getGameOverVictoryPosition');
const position = getGameOverVictoryPosition();
assertEqual(position.x, 400, 'Position X should be 400');
assertEqual(position.y, 300, 'Position Y should be 300');
console.log('  PASS');

console.log('Test 3: getGameOverVictorySize');
const size = getGameOverVictorySize();
assertEqual(size.width, 500, 'Width should be 500');
assertEqual(size.height, 400, 'Height should be 400');
console.log('  PASS');

console.log('Test 4: showGameOver');
const gameOverAnimator = createGameOverVictoryAnimator();
showGameOver(gameOverAnimator, 1500, 5, 1000);
assertEqual(gameOverAnimator.state, 'game_over', 'State should be game_over');
assertEqual(gameOverAnimator.startTime, 1000, 'StartTime should be 1000');
assertEqual(gameOverAnimator.finalScore, 1500, 'FinalScore should be 1500');
assertEqual(gameOverAnimator.finalWave, 5, 'FinalWave should be 5');
console.log('  PASS');

console.log('Test 5: showVictory');
const victoryAnimator = createGameOverVictoryAnimator();
showVictory(victoryAnimator, 5000, 10, 2000);
assertEqual(victoryAnimator.state, 'victory', 'State should be victory');
assertEqual(victoryAnimator.startTime, 2000, 'StartTime should be 2000');
assertEqual(victoryAnimator.finalScore, 5000, 'FinalScore should be 5000');
assertEqual(victoryAnimator.finalWave, 10, 'FinalWave should be 10');
console.log('  PASS');

console.log('Test 6: hideGameOverVictory');
const hideAnimator = createGameOverVictoryAnimator();
showGameOver(hideAnimator, 1000, 3, 1000);
hideGameOverVictory(hideAnimator, 2000);
assertEqual(hideAnimator.state, 'hidden', 'State should be hidden after hide');
assertEqual(hideAnimator.elapsed, 0, 'Elapsed should be reset');
console.log('  PASS');

console.log('Test 7: isGameOverVictoryVisible');
const visibleAnimator = createGameOverVictoryAnimator();
assert(!isGameOverVictoryVisible(visibleAnimator), 'Hidden state should not be visible');
showGameOver(visibleAnimator, 1000, 3, 1000);
assert(isGameOverVictoryVisible(visibleAnimator), 'GameOver state should be visible');
const victoryVisibleAnimator = createGameOverVictoryAnimator();
showVictory(victoryVisibleAnimator, 2000, 5, 1000);
assert(isGameOverVictoryVisible(victoryVisibleAnimator), 'Victory state should be visible');
console.log('  PASS');

console.log('Test 8: isGameOverShowing');
const gameOverOnlyAnimator = createGameOverVictoryAnimator();
showGameOver(gameOverOnlyAnimator, 1000, 3, 1000);
assert(isGameOverShowing(gameOverOnlyAnimator), 'Should show game over');
assert(!isVictoryShowing(gameOverOnlyAnimator), 'Should not show victory');
console.log('  PASS');

console.log('Test 9: isVictoryShowing');
const victoryOnlyAnimator = createGameOverVictoryAnimator();
showVictory(victoryOnlyAnimator, 2000, 10, 1000);
assert(!isGameOverShowing(victoryOnlyAnimator), 'Should not show game over');
assert(isVictoryShowing(victoryOnlyAnimator), 'Should show victory');
console.log('  PASS');

console.log('Test 10: getGameOverVictoryRenderData hidden state');
const hiddenRenderData = getGameOverVictoryRenderData(createGameOverVictoryAnimator());
assertEqual(hiddenRenderData.state, GameOverVictoryState.Hidden, 'State should be Hidden');
assert(!hiddenRenderData.isVisible, 'Hidden render data should not be visible');
assertEqual(hiddenRenderData.buttons.length, 0, 'Hidden should have no buttons');
assertEqual(hiddenRenderData.backgroundOpacity, 0, 'Hidden background opacity should be 0');
console.log('  PASS');

console.log('Test 11: getGameOverVictoryRenderData game over state');
const gameOverRenderData = getGameOverVictoryRenderData(gameOverAnimator);
assertEqual(gameOverRenderData.state, GameOverVictoryState.GameOver, 'State should be GameOver');
assert(gameOverRenderData.isVisible, 'GameOver render data should be visible');
assertEqual(gameOverRenderData.title, 'Game Over', 'Title should be Game Over');
assertEqual(gameOverRenderData.finalScore, 1500, 'FinalScore should be 1500');
assertEqual(gameOverRenderData.finalWave, 5, 'FinalWave should be 5');
assertEqual(gameOverRenderData.buttons.length, 2, 'Should have 2 buttons');
assertEqual(gameOverRenderData.buttons[0].label, 'Restart', 'First button should be Restart');
assertEqual(gameOverRenderData.buttons[1].label, 'Quit', 'Second button should be Quit');
console.log('  PASS');

console.log('Test 12: getGameOverVictoryRenderData victory state');
const victoryRenderData = getGameOverVictoryRenderData(victoryAnimator);
assertEqual(victoryRenderData.state, GameOverVictoryState.Victory, 'State should be Victory');
assert(victoryRenderData.isVisible, 'Victory render data should be visible');
assertEqual(victoryRenderData.title, 'Victory!', 'Title should be Victory!');
assertEqual(victoryRenderData.finalScore, 5000, 'FinalScore should be 5000');
assertEqual(victoryRenderData.finalWave, 10, 'FinalWave should be 10');
console.log('  PASS');

console.log('Test 13: updateGameOverVictory - hidden state');
const updateHiddenAnimator = createGameOverVictoryAnimator();
updateGameOverVictory(updateHiddenAnimator, 100, 1000);
assertEqual(updateHiddenAnimator.elapsed, 0, 'Hidden animator should not update elapsed');
console.log('  PASS');

console.log('Test 14: updateGameOverVictory - active state');
const updateAnimator = createGameOverVictoryAnimator();
showGameOver(updateAnimator, 1000, 3, 1000);
updateGameOverVictory(updateAnimator, 100, 1100);
assertEqual(updateAnimator.elapsed, 100, 'Elapsed should be 100');
assert(updateAnimator.progress > 0, 'Progress should be > 0');
console.log('  PASS');

console.log('Test 15: getGameOverVictoryUIState');
const uiState = getGameOverVictoryUIState(GameState.GameOver, 1500, 5);
assert(uiState.isVisible, 'GameOver should be visible');
assert(uiState.canRestart, 'Should be able to restart');
assert(uiState.canQuit, 'Should be able to quit');
assertEqual(uiState.finalScore, 1500, 'FinalScore should be 1500');
assertEqual(uiState.finalWave, 5, 'FinalWave should be 5');
assertEqual(uiState.gameState, GameState.GameOver, 'GameState should be GameOver');
console.log('  PASS');

console.log('Test 16: getGameOverVictoryUIState - Victory');
const victoryUIState = getGameOverVictoryUIState(GameState.Victory, 5000, 10);
assert(victoryUIState.isVisible, 'Victory should be visible');
assertEqual(victoryUIState.gameState, GameState.Victory, 'GameState should be Victory');
console.log('  PASS');

console.log('Test 17: getGameOverVictoryUIState - Playing');
const playingUIState = getGameOverVictoryUIState(GameState.Playing, 0, 0);
assert(!playingUIState.isVisible, 'Playing should not be visible');
console.log('  PASS');

console.log('Test 18: getGameOverVictoryScoreText');
const scoreText = getGameOverVictoryScoreText(1500);
assertEqual(scoreText, 'Final Score: 1500', 'Score text should be formatted correctly');
console.log('  PASS');

console.log('Test 19: getGameOverVictoryWaveText');
const waveText = getGameOverVictoryWaveText(5);
assertEqual(waveText, 'Reached Wave: 5', 'Wave text should be formatted correctly');
console.log('  PASS');

console.log('Test 20: resetGameOverVictoryAnimator');
const resetAnimator = createGameOverVictoryAnimator();
showGameOver(resetAnimator, 1500, 5, 1000);
updateGameOverVictory(resetAnimator, 500, 1500);
resetGameOverVictoryAnimator(resetAnimator);
assertEqual(resetAnimator.state, 'hidden', 'State should be hidden');
assertEqual(resetAnimator.elapsed, 0, 'Elapsed should be 0');
assertEqual(resetAnimator.progress, 0, 'Progress should be 0');
assertEqual(resetAnimator.finalScore, 0, 'FinalScore should be 0');
assertEqual(resetAnimator.finalWave, 0, 'FinalWave should be 0');
console.log('  PASS');

console.log('Test 21: getGameOverVictoryButtonRenderData');
const button = getGameOverVictoryButtonRenderData('test', 'Test Button', { x: 400, y: 300 }, true, true, 1);
assertEqual(button.id, 'test', 'Button id should be test');
assertEqual(button.label, 'Test Button', 'Button label should be Test Button');
assertEqual(button.position.x, 400, 'Button x should be 400');
assertEqual(button.position.y, 300, 'Button y should be 300');
assertEqual(button.size.width, 180, 'Button width should be 180');
assertEqual(button.size.height, 45, 'Button height should be 45');
assert(button.isEnabled, 'Button should be enabled');
assert(button.isVisible, 'Button should be visible');
assertEqual(button.opacity, 1, 'Button opacity should be 1');
console.log('  PASS');

console.log('Test 22: getGameOverVictoryButtonAtPosition - hit');
const buttonAtPosAnimator = createGameOverVictoryAnimator();
showGameOver(buttonAtPosAnimator, 1000, 3, 1000);
updateGameOverVictory(buttonAtPosAnimator, 1000, 2000);
const renderData = getGameOverVictoryRenderData(buttonAtPosAnimator);
const hitButton = getGameOverVictoryButtonAtPosition(renderData, 400, 340);
assert(hitButton !== null, 'Should find button at position');
assertEqual(hitButton!.id, 'restart', 'Should find restart button');
console.log('  PASS');

console.log('Test 23: getGameOverVictoryButtonAtPosition - miss');
const missButton = getGameOverVictoryButtonAtPosition(renderData, 0, 0);
assert(missButton === null, 'Should not find button at wrong position');
console.log('  PASS');

console.log('Test 24: Button positions');
const buttonPositionsAnimator = createGameOverVictoryAnimator();
showGameOver(buttonPositionsAnimator, 1000, 3, 1000);
const buttonPositionsRenderData = getGameOverVictoryRenderData(buttonPositionsAnimator);
const firstButton = buttonPositionsRenderData.buttons[0];
const secondButton = buttonPositionsRenderData.buttons[1];
assertEqual(firstButton.position.x, 400, 'First button x should be 400');
assertEqual(secondButton.position.x, 400, 'Second button x should be 400');
assertEqual(firstButton.position.y, 340, 'First button y should be 340');
assertEqual(secondButton.position.y, 400, 'Second button y should be 400');
console.log('  PASS');

console.log('Test 25: Animation progress during fade in');
const fadeInAnimator = createGameOverVictoryAnimator();
showVictory(fadeInAnimator, 3000, 8, 1000);
updateGameOverVictory(fadeInAnimator, 250, 1250);
const fadeInRenderData = getGameOverVictoryRenderData(fadeInAnimator);
assert(fadeInRenderData.backgroundOpacity > 0, 'Background should be fading in');
assert(fadeInRenderData.backgroundOpacity < 1, 'Background should not be fully opaque yet');
assert(fadeInRenderData.titleOpacity > 0, 'Title should be fading in');
assert(fadeInRenderData.titleOpacity < 1, 'Title should not be fully opaque yet');
console.log('  PASS');

console.log('Test 26: Animation during hold phase');
const holdAnimator = createGameOverVictoryAnimator();
showVictory(holdAnimator, 3000, 8, 1000);
updateGameOverVictory(holdAnimator, 1000, 2000);
const holdRenderData = getGameOverVictoryRenderData(holdAnimator);
assertEqual(holdRenderData.backgroundOpacity, 1, 'Background should be fully opaque during hold');
assertEqual(holdRenderData.titleOpacity, 1, 'Title should be fully opaque during hold');
console.log('  PASS');

console.log('Test 27: Colors for game over');
const gameOverColorAnimator = createGameOverVictoryAnimator();
showGameOver(gameOverColorAnimator, 1000, 3, 1000);
const gameOverColorsRenderData = getGameOverVictoryRenderData(gameOverColorAnimator);
assert(gameOverColorsRenderData.titleColor === '#FF4444', 'Game over title color should be red');
assert(gameOverColorsRenderData.borderColor === '#FF4444', 'Game over border color should be red');
console.log('  PASS');

console.log('Test 28: Colors for victory');
const victoryColorAnimator = createGameOverVictoryAnimator();
showVictory(victoryColorAnimator, 5000, 10, 1000);
const victoryColorsRenderData = getGameOverVictoryRenderData(victoryColorAnimator);
assert(victoryColorsRenderData.titleColor === '#44FF44', 'Victory title color should be green');
assert(victoryColorsRenderData.borderColor === '#44FF44', 'Victory border color should be green');
console.log('  PASS');

console.log('Test 29: hideGameOverVictory on hidden animator');
const hiddenHideAnimator = createGameOverVictoryAnimator();
hideGameOverVictory(hiddenHideAnimator, 1000);
assertEqual(hiddenHideAnimator.state, 'hidden', 'State should remain hidden');
console.log('  PASS');

console.log('Test 30: Custom options override');
const customOptionsAnimator = createGameOverVictoryAnimator();
showGameOver(customOptionsAnimator, 1000, 3, 1000);
const customRenderData = getGameOverVictoryRenderData(customOptionsAnimator, {
  title: 'Custom Title',
  subtitle: 'Custom Subtitle',
  finalScore: 9999,
  finalWave: 99,
});
assertEqual(customRenderData.title, 'Custom Title', 'Title should be custom');
assertEqual(customRenderData.subtitle, 'Custom Subtitle', 'Subtitle should be custom');
assertEqual(customRenderData.finalScore, 9999, 'FinalScore should be custom');
assertEqual(customRenderData.finalWave, 99, 'FinalWave should be custom');
console.log('  PASS');

console.log('\n=== All 30 tests passed! ===');

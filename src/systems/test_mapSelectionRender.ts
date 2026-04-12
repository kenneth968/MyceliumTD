import {
  MapSelectionState,
  MapCardButton,
  MapSelectionRenderData,
  MapCardRenderData,
  MapSelectionAnimator,
  createMapSelectionAnimator,
  updateMapSelection,
  getMapSelectionRenderData,
  getMapCardPosition,
  getMapSelectionButtonAtPosition,
  isMapSelectionVisible,
  getMapSelectionOpacity,
  getMapSelectionUIState,
  showMapSelection,
  hideMapSelection,
  resetMapSelection,
} from './mapSelectionRender';
import { MapDifficulty, MapTheme } from './mapLevel';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected ${expected}, got ${actual}`);
  }
}

function assertDeepEqual<T>(actual: T, expected: T, message: string): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`Assertion failed: ${message}. Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

console.log('Testing Map Selection Render System...');

console.log('Test 1: createMapSelectionAnimator');
{
  const animator = createMapSelectionAnimator();
  assertEqual(animator.state, MapSelectionState.Hidden, 'Initial state should be Hidden');
  assertEqual(animator.elapsed, 0, 'Initial elapsed should be 0');
  assertEqual(animator.progress, 0, 'Initial progress should be 0');
  assertEqual(animator.isVisible, false, 'Initial isVisible should be false');
  assertEqual(animator.opacity, 0, 'Initial opacity should be 0');
}

console.log('Test 2: updateMapSelection - show');
{
  const animator = createMapSelectionAnimator();
  updateMapSelection(animator, 100, true);
  assertEqual(animator.state, MapSelectionState.Entering, 'State should be Entering after show');
  assertEqual(animator.isVisible, true, 'isVisible should be true after show');
}

console.log('Test 3: updateMapSelection - fade in progress');
{
  const animator = createMapSelectionAnimator();
  updateMapSelection(animator, 100, true);
  assert(animator.progress > 0, 'Progress should increase after update');
  assert(animator.opacity > 0, 'Opacity should increase after update');
}

console.log('Test 4: updateMapSelection - complete fade in');
{
  const animator = createMapSelectionAnimator();
  updateMapSelection(animator, 400, true);
  assertEqual(animator.state, MapSelectionState.Visible, 'State should be Visible after full fade in');
  assertEqual(animator.opacity, 1, 'Opacity should be 1 after full fade in');
}

console.log('Test 5: updateMapSelection - hide');
{
  const animator = createMapSelectionAnimator();
  updateMapSelection(animator, 300, true);
  assertEqual(animator.state, MapSelectionState.Visible, 'State should be Visible after full fade in');
  updateMapSelection(animator, 50, false);
  assertEqual(animator.state, MapSelectionState.Exiting, 'State should be Exiting after hide');
}

console.log('Test 6: getMapSelectionRenderData - structure');
{
  const animator = createMapSelectionAnimator();
  updateMapSelection(animator, 300, true);
  const renderData = getMapSelectionRenderData(null, null, 1280, 720, animator);
  assert(Array.isArray(renderData.cards), 'cards should be an array');
  assert(Array.isArray(renderData.buttons), 'buttons should be an array');
  assertEqual(renderData.totalMaps, 6, 'totalMaps should be 6');
  assertEqual(renderData.state, MapSelectionState.Visible, 'state should match animator');
}

console.log('Test 7: getMapSelectionRenderData - cards have correct fields');
{
  const animator = createMapSelectionAnimator();
  updateMapSelection(animator, 300, true);
  const renderData = getMapSelectionRenderData(null, null, 1280, 720, animator);
  assert(renderData.cards.length > 0, 'should have at least one card');
  const card = renderData.cards[0];
  assert('id' in card, 'card should have id');
  assert('name' in card, 'card should have name');
  assert('difficulty' in card, 'card should have difficulty');
  assert('difficultyLabel' in card, 'card should have difficultyLabel');
  assert('theme' in card, 'card should have theme');
  assert('position' in card, 'card should have position');
  assert('size' in card, 'card should have size');
  assert('isHovered' in card, 'card should have isHovered');
  assert('isLocked' in card, 'card should have isLocked');
  assert('isSelected' in card, 'card should have isSelected');
  assert('pathPreview' in card, 'card should have pathPreview');
  assert('maxWaves' in card, 'card should have maxWaves');
  assert('towerCount' in card, 'card should have towerCount');
}

console.log('Test 8: getMapSelectionRenderData - selected card');
{
  const animator = createMapSelectionAnimator();
  updateMapSelection(animator, 300, true);
  const renderData = getMapSelectionRenderData('garden_path', null, 1280, 720, animator);
  const selectedCard = renderData.cards.find(c => c.id === 'garden_path');
  assert(selectedCard !== undefined, 'selected card should exist');
  assertEqual(selectedCard!.isSelected, true, 'selected card should have isSelected true');
}

console.log('Test 9: getMapSelectionRenderData - hovered card');
{
  const animator = createMapSelectionAnimator();
  updateMapSelection(animator, 300, true);
  const renderData = getMapSelectionRenderData(null, 'forest_loop', 1280, 720, animator);
  const hoveredCard = renderData.cards.find(c => c.id === 'forest_loop');
  assert(hoveredCard !== undefined, 'hovered card should exist');
  assertEqual(hoveredCard!.isHovered, true, 'hovered card should have isHovered true');
}

console.log('Test 10: getMapCardPosition - first card');
{
  const pos = getMapCardPosition(0, 1280, 720);
  assertEqual(pos.width, 200, 'width should be 200');
  assertEqual(pos.height, 250, 'height should be 250');
  assert(pos.x >= 0, 'x should be >= 0');
  assert(pos.y >= 0, 'y should be >= 0');
}

console.log('Test 11: getMapCardPosition - multiple rows');
{
  const pos0 = getMapCardPosition(0, 1280, 720);
  const pos1 = getMapCardPosition(1, 1280, 720);
  const pos6 = getMapCardPosition(6, 1280, 720);
  assert(pos6.y > pos0.y, '7th card should be in lower row');
}

console.log('Test 12: getMapSelectionButtonAtPosition - hit');
{
  const animator = createMapSelectionAnimator();
  updateMapSelection(animator, 300, true);
  const renderData = getMapSelectionRenderData(null, null, 1280, 720, animator);
  const firstButton = renderData.buttons[0];
  const result = getMapSelectionButtonAtPosition(
    firstButton.position.x + 10,
    firstButton.position.y + 10,
    renderData
  );
  assertEqual(result, firstButton.mapId, 'should return mapId when clicking button');
}

console.log('Test 13: getMapSelectionButtonAtPosition - miss');
{
  const animator = createMapSelectionAnimator();
  updateMapSelection(animator, 300, true);
  const renderData = getMapSelectionRenderData(null, null, 1280, 720, animator);
  const result = getMapSelectionButtonAtPosition(-1000, -1000, renderData);
  assertEqual(result, null, 'should return null when clicking outside');
}

console.log('Test 14: getMapSelectionButtonAtPosition - hidden');
{
  const animator = createMapSelectionAnimator();
  const renderData = getMapSelectionRenderData(null, null, 1280, 720, animator);
  const result = getMapSelectionButtonAtPosition(100, 100, renderData);
  assertEqual(result, null, 'should return null when not visible');
}

console.log('Test 15: isMapSelectionVisible');
{
  const animator = createMapSelectionAnimator();
  assertEqual(isMapSelectionVisible(animator), false, 'hidden animator should not be visible');
  updateMapSelection(animator, 300, true);
  assertEqual(isMapSelectionVisible(animator), true, 'entering animator should be visible');
}

console.log('Test 16: getMapSelectionOpacity');
{
  const animator = createMapSelectionAnimator();
  assertEqual(getMapSelectionOpacity(animator), 0, 'hidden animator opacity should be 0');
  updateMapSelection(animator, 150, true);
  assert(getMapSelectionOpacity(animator) > 0, 'fading in animator should have opacity > 0');
  updateMapSelection(animator, 200, true);
  assertEqual(getMapSelectionOpacity(animator), 1, 'visible animator opacity should be 1');
}

console.log('Test 17: showMapSelection');
{
  const animator = createMapSelectionAnimator();
  showMapSelection(animator);
  assertEqual(animator.state, MapSelectionState.Entering, 'showMapSelection should set Entering state');
  assertEqual(animator.isVisible, true, 'showMapSelection should set isVisible true');
}

console.log('Test 18: hideMapSelection');
{
  const animator = createMapSelectionAnimator();
  updateMapSelection(animator, 300, true);
  hideMapSelection(animator);
  assertEqual(animator.state, MapSelectionState.Exiting, 'hideMapSelection should set Exiting state');
}

console.log('Test 19: resetMapSelection');
{
  const animator = createMapSelectionAnimator();
  updateMapSelection(animator, 300, true);
  resetMapSelection(animator);
  assertEqual(animator.state, MapSelectionState.Hidden, 'resetMapSelection should set Hidden state');
  assertEqual(animator.isVisible, false, 'resetMapSelection should set isVisible false');
  assertEqual(animator.opacity, 0, 'resetMapSelection should set opacity 0');
}

console.log('Test 20: getMapSelectionUIState');
{
  const animator = createMapSelectionAnimator();
  const uiState = getMapSelectionUIState(animator, null, 'idle' as any);
  assertEqual(uiState.isVisible, false, 'uiState isVisible should match');
  assertEqual(uiState.selectedMapId, null, 'uiState selectedMapId should match');
  assertEqual(uiState.totalMaps, 6, 'uiState totalMaps should be 6');
}

console.log('Test 21: getMapSelectionRenderData - locked map styling');
{
  const animator = createMapSelectionAnimator();
  updateMapSelection(animator, 300, true);
  const renderData = getMapSelectionRenderData(null, null, 1280, 720, animator);
  const lockedCard = renderData.cards.find(c => c.isLocked);
  if (lockedCard) {
    assertEqual(lockedCard.opacity, 0.6, 'locked card should have 0.6 opacity');
  }
}

console.log('Test 22: getMapSelectionRenderData - difficulty colors');
{
  const animator = createMapSelectionAnimator();
  updateMapSelection(animator, 300, true);
  const renderData = getMapSelectionRenderData(null, null, 1280, 720, animator);
  const easyCard = renderData.cards.find(c => c.difficulty === MapDifficulty.Easy);
  assert(easyCard !== undefined, 'should have easy difficulty card');
  assertEqual(easyCard!.difficultyLabel, 'Easy', 'easy card should have Easy label');
}

console.log('Test 23: getMapSelectionRenderData - theme labels');
{
  const animator = createMapSelectionAnimator();
  updateMapSelection(animator, 300, true);
  const renderData = getMapSelectionRenderData(null, null, 1280, 720, animator);
  const forestCard = renderData.cards.find(c => c.theme === MapTheme.Forest);
  assert(forestCard !== undefined, 'should have forest theme card');
  assertEqual(forestCard!.themeLabel, 'Forest', 'forest card should have Forest label');
}

console.log('Test 24: getMapSelectionRenderData - card border styling');
{
  const animator = createMapSelectionAnimator();
  updateMapSelection(animator, 300, true);
  const renderData = getMapSelectionRenderData('garden_path', null, 1280, 720, animator);
  const selectedCard = renderData.cards.find(c => c.id === 'garden_path');
  assertEqual(selectedCard!.borderColor, '#00FF88', 'selected card should have selected border');
  assertEqual(selectedCard!.borderWidth, 3, 'selected card should have border width 3');
}

console.log('Test 25: updateMapSelection - re-show while exiting');
{
  const animator = createMapSelectionAnimator();
  updateMapSelection(animator, 300, true);
  updateMapSelection(animator, 100, false);
  assertEqual(animator.state, MapSelectionState.Exiting, 'should be exiting');
  updateMapSelection(animator, 50, true);
  assertEqual(animator.state, MapSelectionState.Entering, 'should go back to entering');
}

console.log('Test 26: full fade in/out cycle');
{
  const animator = createMapSelectionAnimator();
  
  updateMapSelection(animator, 300, true);
  assertEqual(animator.state, MapSelectionState.Visible, 'should be visible after fade in');
  assertEqual(animator.opacity, 1, 'opacity should be 1');
  
  updateMapSelection(animator, 50, false);
  assertEqual(animator.state, MapSelectionState.Exiting, 'should be exiting after hide');
  
  updateMapSelection(animator, 200, false);
  assertEqual(animator.state, MapSelectionState.Hidden, 'should be hidden after fade out');
  assertEqual(animator.opacity, 0, 'opacity should be 0');
}

console.log('All 26 tests passed!');
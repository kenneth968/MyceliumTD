import {
  EnemyCountDisplayState,
  EnemyCountDisplayAnimator,
  createEnemyCountDisplayAnimator,
  showEnemyCountDisplay,
  hideEnemyCountDisplay,
  isEnemyCountDisplayVisible,
  updateEnemyCountDisplay,
  getEnemyCountDisplayRenderData,
  getEnemyCountDisplayRenderDataFull,
  getEnemyCountDisplayColors,
  getEnemyCountDisplayBackgroundStyle,
  getEnemyCountDisplayBorderStyle,
  getEnemyCountDisplayTextColor,
  resetEnemyCountDisplayAnimator,
  getEnemyCountPosition,
  getEnemyCountSize,
} from './enemyCountDisplayRender';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`Assertion failed: ${message} (expected ${expectedStr}, got ${actualStr})`);
  }
}

let passed = 0;
let failed = 0;

function runTests() {
  console.log('Running enemyCountDisplayRender tests...\n');

  try { createEnemyCountDisplayAnimatorTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { showEnemyCountDisplayTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { hideEnemyCountDisplayTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { isEnemyCountDisplayVisibleTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { updateEnemyCountDisplayTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getEnemyCountDisplayRenderDataTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getEnemyCountDisplayRenderDataFullTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getEnemyCountDisplayColorsTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { styleGettersTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { resetEnemyCountDisplayAnimatorTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { positionAndSizeGettersTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

function createEnemyCountDisplayAnimatorTests() {
  console.log('Test: createEnemyCountDisplayAnimator');
  const animator = createEnemyCountDisplayAnimator();
  assert(animator.state === 'hidden', 'state should be hidden');
  assert(animator.startTime === 0, 'startTime should be 0');
  assert(animator.elapsed === 0, 'elapsed should be 0');
  assert(animator.opacity === 0, 'opacity should be 0');
  console.log('  PASS');
  passed++;
}

function showEnemyCountDisplayTests() {
  console.log('Test: showEnemyCountDisplay');
  const animator = createEnemyCountDisplayAnimator();
  showEnemyCountDisplay(animator, 1000);
  assert(animator.state === 'visible', 'state should be visible');
  assert(animator.startTime === 1000, 'startTime should be 1000');
  assert(animator.elapsed === 0, 'elapsed should be 0');
  console.log('  PASS');
  passed++;
}

function hideEnemyCountDisplayTests() {
  console.log('Test: hideEnemyCountDisplay');
  const animator = createEnemyCountDisplayAnimator();
  showEnemyCountDisplay(animator, 1000);
  hideEnemyCountDisplay(animator, 2000);
  assert(animator.state === 'hidden', 'state should be hidden');
  assert(animator.elapsed === 0, 'elapsed should be 0');
  console.log('  PASS');
  passed++;
}

function isEnemyCountDisplayVisibleTests() {
  console.log('Test: isEnemyCountDisplayVisible');
  const animator = createEnemyCountDisplayAnimator();
  assert(!isEnemyCountDisplayVisible(animator), 'should return false when hidden');
  showEnemyCountDisplay(animator, 1000);
  assert(isEnemyCountDisplayVisible(animator), 'should return true when visible');
  hideEnemyCountDisplay(animator, 2000);
  assert(!isEnemyCountDisplayVisible(animator), 'should return false when hidden');
  console.log('  PASS');
  passed++;
}

function updateEnemyCountDisplayTests() {
  console.log('Test: updateEnemyCountDisplay');
  const animator = createEnemyCountDisplayAnimator();
  showEnemyCountDisplay(animator, 1000);
  
  updateEnemyCountDisplay(animator, 200, 1200);
  assert(animator.opacity === 1, 'opacity should be 1 after fade in completes');
  
  animator.state = 'hidden';
  animator.opacity = 1;
  updateEnemyCountDisplay(animator, 100, 1100);
  assert(animator.opacity === 0, 'opacity should be 0 when hidden');
  
  console.log('  PASS');
  passed++;
}

function getEnemyCountDisplayRenderDataTests() {
  console.log('Test: getEnemyCountDisplayRenderData');
  const position = { x: 20, y: 75 };
  const data = getEnemyCountDisplayRenderData(position, 42, 1);
  
  assertEqual(data.position.x, 20, 'x position should be 20');
  assertEqual(data.position.y, 75, 'y position should be 75');
  assertEqual(data.size.width, 100, 'width should be 100');
  assertEqual(data.size.height, 30, 'height should be 30');
  assertEqual(data.currentCount, 42, 'currentCount should be 42');
  assertEqual(data.countText, '42', 'countText should be "42"');
  assertEqual(data.opacity, 1, 'opacity should be 1');
  assertEqual(data.fillColor, '#9370DB', 'fillColor should be #9370DB');
  assertEqual(data.backgroundColor, 'rgba(60, 40, 80, 0.9)', 'backgroundColor should be rgba(60, 40, 80, 0.9)');
  assertEqual(data.borderColor, '#FFD700', 'borderColor should be #FFD700');
  assertEqual(data.borderWidth, 2, 'borderWidth should be 2');
  
  console.log('  PASS');
  passed++;
}

function getEnemyCountDisplayRenderDataFullTests() {
  console.log('Test: getEnemyCountDisplayRenderDataFull');
  const animator = createEnemyCountDisplayAnimator();
  let data = getEnemyCountDisplayRenderDataFull(animator, {
    currentCount: 42,
  });
  
  assert(data.state === EnemyCountDisplayState.Hidden, 'state should be Hidden');
  assert(!data.isVisible, 'isVisible should be false');
  assertEqual(data.enemyCount.currentCount, 42, 'currentCount should be 42');
  assertEqual(data.enemyCount.countText, '42', 'countText should be "42"');
  
  showEnemyCountDisplay(animator, 1000);
  data = getEnemyCountDisplayRenderDataFull(animator, {
    currentCount: 42,
  });
  
  assert(data.state === EnemyCountDisplayState.Visible, 'state should be Visible');
  assert(data.isVisible, 'isVisible should be true');
  assertEqual(data.enemyCount.currentCount, 42, 'currentCount should be 42');
  assertEqual(data.enemyCount.countText, '42', 'countText should be "42"');
  
  hideEnemyCountDisplay(animator, 2000);
  data = getEnemyCountDisplayRenderDataFull(animator, {
    currentCount: 15,
  });
  
  assert(data.state === EnemyCountDisplayState.Hidden, 'state should be Hidden');
  assert(!data.isVisible, 'isVisible should be false');
  assertEqual(data.enemyCount.opacity, 0, 'opacity should be 0 when hidden');
  assertEqual(data.position.x, 20, 'position x should be 20');
  assertEqual(data.position.y, 75, 'position y should be 75');
  assertEqual(data.size.width, 100, 'size width should be 100');
  assertEqual(data.size.height, 30, 'size height should be 30');
  
  console.log('  PASS');
  passed++;
}

function getEnemyCountDisplayColorsTests() {
  console.log('Test: getEnemyCountDisplayColors');
  const colors = getEnemyCountDisplayColors();
  assertEqual(colors.fill, '#9370DB', 'fill should be #9370DB');
  assertEqual(colors.background, 'rgba(60, 40, 80, 0.9)', 'background should be rgba(60, 40, 80, 0.9)');
  assertEqual(colors.border, '#FFD700', 'border should be #FFD700');
  console.log('  PASS');
  passed++;
}

function styleGettersTests() {
  console.log('Test: style getters');
  assertEqual(getEnemyCountDisplayBackgroundStyle(), 'rgba(20, 20, 20, 0.85)', 'background style');
  assertEqual(getEnemyCountDisplayBorderStyle(), '#FFD700', 'border style');
  assertEqual(getEnemyCountDisplayTextColor(), '#FFFFFF', 'text color');
  console.log('  PASS');
  passed++;
}

function resetEnemyCountDisplayAnimatorTests() {
  console.log('Test: resetEnemyCountDisplayAnimator');
  const animator = createEnemyCountDisplayAnimator();
  showEnemyCountDisplay(animator, 1000);
  animator.elapsed = 100;
  animator.opacity = 1;
  
  resetEnemyCountDisplayAnimator(animator);
  
  assert(animator.state === 'hidden', 'state should be hidden');
  assert(animator.startTime === 0, 'startTime should be 0');
  assert(animator.elapsed === 0, 'elapsed should be 0');
  assert(animator.opacity === 0, 'opacity should be 0');
  console.log('  PASS');
  passed++;
}

function positionAndSizeGettersTests() {
  console.log('Test: position and size getters');
  const pos = getEnemyCountPosition();
  assertEqual(pos.x, 20, 'x should be 20');
  assertEqual(pos.y, 75, 'y should be 75');
  
  const size = getEnemyCountSize();
  assertEqual(size.width, 100, 'width should be 100');
  assertEqual(size.height, 30, 'height should be 30');
  console.log('  PASS');
  passed++;
}

runTests();
console.log('\n=== All enemyCountDisplayRender tests passed! ===');
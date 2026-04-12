import {
  LivesMoneyDisplayState,
  LivesMoneyDisplayAnimator,
  createLivesMoneyDisplayAnimator,
  showLivesMoneyDisplay,
  hideLivesMoneyDisplay,
  isLivesMoneyDisplayVisible,
  updateLivesMoneyDisplay,
  getLivesMoneyDisplayRenderData,
  getLivesDisplayRenderData,
  getMoneyDisplayRenderData,
  getLivesDisplayColors,
  getMoneyDisplayColors,
  getLivesMoneyDisplayBackgroundStyle,
  getLivesMoneyDisplayBorderStyle,
  getLivesMoneyDisplayTextColor,
  getLivesMoneyDisplayLivesLabelColor,
  getLivesMoneyDisplayMoneyLabelColor,
  resetLivesMoneyDisplayAnimator,
  getLivesMoneyPosition,
  getLivesMoneySize,
} from './livesMoneyDisplayRender';

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
  console.log('Running livesMoneyDisplayRender tests...\n');

  try { createLivesMoneyDisplayAnimatorTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { showLivesMoneyDisplayTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { hideLivesMoneyDisplayTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { isLivesMoneyDisplayVisibleTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { updateLivesMoneyDisplayTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getLivesDisplayRenderDataTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getMoneyDisplayRenderDataTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getLivesMoneyDisplayRenderDataTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getLivesDisplayColorsTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getMoneyDisplayColorsTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { styleGettersTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { resetLivesMoneyDisplayAnimatorTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { positionAndSizeGettersTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

function createLivesMoneyDisplayAnimatorTests() {
  console.log('Test: createLivesMoneyDisplayAnimator');
  const animator = createLivesMoneyDisplayAnimator();
  assert(animator.state === 'visible', 'state should be visible');
  assert(animator.startTime === 0, 'startTime should be 0');
  assert(animator.elapsed === 0, 'elapsed should be 0');
  assert(animator.opacity === 1, 'opacity should be 1');
  console.log('  PASS');
  passed++;
}

function showLivesMoneyDisplayTests() {
  console.log('Test: showLivesMoneyDisplay');
  const animator = createLivesMoneyDisplayAnimator();
  showLivesMoneyDisplay(animator, 1000);
  assert(animator.state === 'visible', 'state should be visible');
  assert(animator.startTime === 1000, 'startTime should be 1000');
  assert(animator.elapsed === 0, 'elapsed should be 0');
  console.log('  PASS');
  passed++;
}

function hideLivesMoneyDisplayTests() {
  console.log('Test: hideLivesMoneyDisplay');
  const animator = createLivesMoneyDisplayAnimator();
  showLivesMoneyDisplay(animator, 1000);
  hideLivesMoneyDisplay(animator, 2000);
  assert(animator.state === 'hidden', 'state should be hidden');
  assert(animator.elapsed === 0, 'elapsed should be 0');
  console.log('  PASS');
  passed++;
}

function isLivesMoneyDisplayVisibleTests() {
  console.log('Test: isLivesMoneyDisplayVisible');
  const animator = createLivesMoneyDisplayAnimator();
  assert(isLivesMoneyDisplayVisible(animator), 'should return true when visible');
  hideLivesMoneyDisplay(animator, 1000);
  assert(!isLivesMoneyDisplayVisible(animator), 'should return false when hidden');
  console.log('  PASS');
  passed++;
}

function updateLivesMoneyDisplayTests() {
  console.log('Test: updateLivesMoneyDisplay');
  const animator = createLivesMoneyDisplayAnimator();
  // When visible, opacity stays at 1 after fade in duration
  
  updateLivesMoneyDisplay(animator, 200, 1200);
  assert(animator.opacity === 1, 'opacity should stay 1 after fade in');
  
  // Hide it and check opacity goes to 0
  animator.state = 'hidden';
  animator.opacity = 1;
  updateLivesMoneyDisplay(animator, 100, 1100);
  assert(animator.opacity === 0, 'opacity should be 0 when hidden');
  
  console.log('  PASS');
  passed++;
}

function getLivesDisplayRenderDataTests() {
  console.log('Test: getLivesDisplayRenderData');
  const position = { x: 20, y: 20 };
  const data = getLivesDisplayRenderData(position, 15, 20, 1);
  
  assertEqual(data.position.x, 20, 'x position should be 20');
  assertEqual(data.position.y, 20, 'y position should be 20');
  assertEqual(data.size.width, 70, 'width should be 70');
  assertEqual(data.size.height, 30, 'height should be 30');
  assertEqual(data.currentLives, 15, 'currentLives should be 15');
  assertEqual(data.maxLives, 20, 'maxLives should be 20');
  assertEqual(data.livesText, '15', 'livesText should be "15"');
  assertEqual(data.opacity, 1, 'opacity should be 1');
  assertEqual(data.fillColor, '#FF4444', 'fillColor should be #FF4444');
  assertEqual(data.backgroundColor, 'rgba(80, 30, 30, 0.9)', 'backgroundColor should be rgba(80, 30, 30, 0.9)');
  assertEqual(data.borderColor, '#FFD700', 'borderColor should be #FFD700');
  assertEqual(data.borderWidth, 2, 'borderWidth should be 2');
  
  console.log('  PASS');
  passed++;
}

function getMoneyDisplayRenderDataTests() {
  console.log('Test: getMoneyDisplayRenderData');
  const position = { x: 20, y: 20 };
  const data = getMoneyDisplayRenderData(position, 650, 1);
  
  assertEqual(data.position.x, 100, 'x position should be 100');
  assertEqual(data.position.y, 20, 'y position should be 20');
  assertEqual(data.size.width, 90, 'width should be 90');
  assertEqual(data.size.height, 30, 'height should be 30');
  assertEqual(data.currentMoney, 650, 'currentMoney should be 650');
  assertEqual(data.moneyText, '$650', 'moneyText should be "$650"');
  assertEqual(data.opacity, 1, 'opacity should be 1');
  assertEqual(data.fillColor, '#44BB44', 'fillColor should be #44BB44');
  assertEqual(data.backgroundColor, 'rgba(30, 80, 30, 0.9)', 'backgroundColor should be rgba(30, 80, 30, 0.9)');
  assertEqual(data.borderColor, '#FFD700', 'borderColor should be #FFD700');
  assertEqual(data.borderWidth, 2, 'borderWidth should be 2');
  
  console.log('  PASS');
  passed++;
}

function getLivesMoneyDisplayRenderDataTests() {
  console.log('Test: getLivesMoneyDisplayRenderData');
  const animator = createLivesMoneyDisplayAnimator();
  let data = getLivesMoneyDisplayRenderData(animator, {
    currentLives: 15,
    maxLives: 20,
    currentMoney: 650,
  });
  
  assert(data.state === LivesMoneyDisplayState.Visible, 'state should be Visible');
  assert(data.isVisible, 'isVisible should be true');
  
  hideLivesMoneyDisplay(animator, 1000);
  data = getLivesMoneyDisplayRenderData(animator, {
    currentLives: 15,
    maxLives: 20,
    currentMoney: 650,
  });
  
  assert(data.state === LivesMoneyDisplayState.Hidden, 'state should be Hidden');
  assert(!data.isVisible, 'isVisible should be false');
  
  showLivesMoneyDisplay(animator, 1000);
  data = getLivesMoneyDisplayRenderData(animator, {
    currentLives: 15,
    maxLives: 20,
    currentMoney: 650,
  });
  
  assert(data.state === LivesMoneyDisplayState.Visible, 'state should be Visible');
  assert(data.isVisible, 'isVisible should be true');
  assertEqual(data.position.x, 20, 'position x should be 20');
  assertEqual(data.position.y, 20, 'position y should be 20');
  assertEqual(data.size.width, 180, 'size width should be 180');
  assertEqual(data.size.height, 50, 'size height should be 50');
  
  console.log('  PASS');
  passed++;
}

function getLivesDisplayColorsTests() {
  console.log('Test: getLivesDisplayColors');
  const colors = getLivesDisplayColors();
  assertEqual(colors.fill, '#FF4444', 'fill should be #FF4444');
  assertEqual(colors.background, 'rgba(80, 30, 30, 0.9)', 'background should be rgba(80, 30, 30, 0.9)');
  assertEqual(colors.border, '#FFD700', 'border should be #FFD700');
  console.log('  PASS');
  passed++;
}

function getMoneyDisplayColorsTests() {
  console.log('Test: getMoneyDisplayColors');
  const colors = getMoneyDisplayColors();
  assertEqual(colors.fill, '#44BB44', 'fill should be #44BB44');
  assertEqual(colors.background, 'rgba(30, 80, 30, 0.9)', 'background should be rgba(30, 80, 30, 0.9)');
  assertEqual(colors.border, '#FFD700', 'border should be #FFD700');
  console.log('  PASS');
  passed++;
}

function styleGettersTests() {
  console.log('Test: style getters');
  assertEqual(getLivesMoneyDisplayBackgroundStyle(), 'rgba(20, 20, 20, 0.85)', 'background style');
  assertEqual(getLivesMoneyDisplayBorderStyle(), '#FFD700', 'border style');
  assertEqual(getLivesMoneyDisplayTextColor(), '#FFFFFF', 'text color');
  assertEqual(getLivesMoneyDisplayLivesLabelColor(), '#FF6B6B', 'lives label color');
  assertEqual(getLivesMoneyDisplayMoneyLabelColor(), '#4CAF50', 'money label color');
  console.log('  PASS');
  passed++;
}

function resetLivesMoneyDisplayAnimatorTests() {
  console.log('Test: resetLivesMoneyDisplayAnimator');
  const animator = createLivesMoneyDisplayAnimator();
  showLivesMoneyDisplay(animator, 1000);
  animator.elapsed = 100;
  animator.opacity = 1;
  
  resetLivesMoneyDisplayAnimator(animator);
  
  assert(animator.state === 'hidden', 'state should be hidden');
  assert(animator.startTime === 0, 'startTime should be 0');
  assert(animator.elapsed === 0, 'elapsed should be 0');
  assert(animator.opacity === 0, 'opacity should be 0');
  console.log('  PASS');
  passed++;
}

function positionAndSizeGettersTests() {
  console.log('Test: position and size getters');
  const pos = getLivesMoneyPosition();
  assertEqual(pos.x, 20, 'x should be 20');
  assertEqual(pos.y, 20, 'y should be 20');
  
  const size = getLivesMoneySize();
  assertEqual(size.width, 180, 'width should be 180');
  assertEqual(size.height, 50, 'height should be 50');
  console.log('  PASS');
  passed++;
}

runTests();
console.log('\n=== All livesMoneyDisplayRender tests passed! ===');
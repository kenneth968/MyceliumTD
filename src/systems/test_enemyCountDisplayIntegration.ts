import { createGameRunner, GameRunner, GameState } from './gameRunner';
import { TargetingMode } from './targeting';
import { TowerType } from '../entities/tower';

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
  console.log('Running enemyCountDisplay integration tests...\n');

  try { testGetAnimator(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { testInitialState(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { testRenderDataStructure(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { testGameLoopIntegration(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { testReset(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { testShowOnWaveStart(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { testHideOnWaveComplete(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { testEnemyCountVisibleAfterWaveStartAndUpdate(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

function testGetAnimator() {
  console.log('Test: getEnemyCountDisplayAnimator');
  const game = createGameRunner();
  const animator = game.getEnemyCountDisplayAnimator();
  assert(animator !== undefined, 'animator should be defined');
  assert(animator.state === 'hidden', 'state should be hidden initially');
  console.log('  PASS');
  passed++;
}

function testInitialState() {
  console.log('Test: initial state');
  const game = createGameRunner();
  const renderData = game.getEnemyCountDisplayRenderData();
  
  assert(renderData.isVisible === false, 'isVisible should be false initially');
  assertEqual(renderData.enemyCount.currentCount, 0, 'initial enemy count should be 0');
  assertEqual(renderData.enemyCount.countText, '0', 'countText should be "0"');
  console.log('  PASS');
  passed++;
}

function testRenderDataStructure() {
  console.log('Test: render data structure');
  const game = createGameRunner();
  game.start();
  const renderData = game.getEnemyCountDisplayRenderData();
  
  assert(renderData.position !== undefined, 'position should be defined');
  assertEqual(renderData.position.x, 20, 'position x should be 20');
  assertEqual(renderData.position.y, 75, 'position y should be 75');
  assert(renderData.size !== undefined, 'size should be defined');
  assertEqual(renderData.size.width, 100, 'size width should be 100');
  assertEqual(renderData.size.height, 30, 'size height should be 30');
  assert(renderData.enemyCount !== undefined, 'enemyCount should be defined');
  assertEqual(renderData.enemyCount.fillColor, '#9370DB', 'fillColor should be #9370DB');
  assertEqual(renderData.enemyCount.backgroundColor, 'rgba(60, 40, 80, 0.9)', 'backgroundColor should be correct');
  assertEqual(renderData.enemyCount.borderColor, '#FFD700', 'borderColor should be #FFD700');
  console.log('  PASS');
  passed++;
}

function testGameLoopIntegration() {
  console.log('Test: game loop integration');
  const game = createGameRunner();
  game.start();
  
  game.update(Date.now());
  
  const renderData = game.getEnemyCountDisplayRenderData();
  assert(renderData.isVisible === false, 'should be hidden after game loop update without wave');
  
  console.log('  PASS');
  passed++;
}

function testReset() {
  console.log('Test: reset');
  const game = createGameRunner();
  game.start();
  game.reset();
  
  const animator = game.getEnemyCountDisplayAnimator();
  assert(animator.state === 'hidden', 'animator should be hidden after reset (recreated)');
  
  console.log('  PASS');
  passed++;
}

function testShowOnWaveStart() {
  console.log('Test: show on wave start');
  const game = createGameRunner();
  game.start();
  
  let renderData = game.getEnemyCountDisplayRenderData();
  assert(renderData.isVisible === false, 'should be hidden before wave starts');
  
  game.startWave(0);
  
  renderData = game.getEnemyCountDisplayRenderData();
  assert(renderData.isVisible === true, 'should be visible after wave starts');
  
  console.log('  PASS');
  passed++;
}

function testHideOnWaveComplete() {
  console.log('Test: hide on wave complete');
  const game = createGameRunner({ maxWaves: 1 });
  game.start();
  
  game.startWave(0);
  
  let renderData = game.getEnemyCountDisplayRenderData();
  assert(renderData.isVisible === true, 'should be visible during wave');
  
  game.update(Date.now());
  
  renderData = game.getEnemyCountDisplayRenderData();
  const wasHiddenDuringCompletion = !renderData.isVisible;
  
  assert(wasHiddenDuringCompletion === false, 'should remain visible during active wave');
  
  console.log('  PASS');
  passed++;
}

function testEnemyCountVisibleAfterWaveStartAndUpdate() {
  console.log('Test: enemy count visible after wave start and update');
  const game = createGameRunner();
  game.start();
  
  game.startWave(0);
  game.update(Date.now());
  
  const renderData = game.getEnemyCountDisplayRenderData();
  assert(renderData.isVisible === true, 'should be visible after wave start and update');
  
  console.log('  PASS');
  passed++;
}

runTests();
console.log('\n=== All enemyCountDisplay integration tests passed! ===');
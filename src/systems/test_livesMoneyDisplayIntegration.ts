import { GameRunner, createGameRunner } from './gameRunner';
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
  console.log('Running livesMoneyDisplay Integration tests...\n');

  try { getLivesMoneyDisplayAnimatorTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getLivesMoneyDisplayRenderDataTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { gameLoopIntegrationTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { resetBehaviorTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

function getLivesMoneyDisplayAnimatorTests() {
  console.log('Test: getLivesMoneyDisplayAnimator');
  const game = createGameRunner();
  const animator = game.getLivesMoneyDisplayAnimator();
  assert(animator !== undefined, 'animator should be defined');
  assert(typeof animator === 'object', 'animator should be an object');
  console.log('  PASS');
  passed++;
}

function getLivesMoneyDisplayRenderDataTests() {
  console.log('Test: getLivesMoneyDisplayRenderData');
  const game = createGameRunner();
  
  let data = game.getLivesMoneyDisplayRenderData();
  assert(data !== undefined, 'data should be defined');
  assert(data.isVisible === true, 'isVisible should be true');
  assert(data.kernelIntegrity !== undefined, 'kernel integrity should be defined');
  assert(data.nutrients !== undefined, 'nutrients should be defined');
  
  assertEqual(data.kernelIntegrity.current, 20, 'initial kernel integrity should be 20');
  assertEqual(data.kernelIntegrity.maximum, 20, 'maximum kernel integrity should be 20');
  
  assertEqual(data.nutrients.current, 500, 'initial nutrients should be 500');
  
  game.start();
  game.placeTower(TowerType.Puffball, 200, 200);
  
  data = game.getLivesMoneyDisplayRenderData();
  assert(data.nutrients.current < 500, 'nutrients should decrease after purchase');
  
  const initialLives = data.kernelIntegrity.current;
  const economy = game.getEconomy();
  economy.loseLife(5);
  
  data = game.getLivesMoneyDisplayRenderData();
  assertEqual(data.kernelIntegrity.current, initialLives - 5, 'kernel integrity should decrease after loseLife');
  
  const animator = game.getLivesMoneyDisplayAnimator();
  animator.state = 'hidden';
  
  data = game.getLivesMoneyDisplayRenderData();
  assert(data.state === 'hidden', 'state should be hidden');
  assert(!data.isVisible, 'isVisible should be false');
  
  animator.state = 'visible';
  data = game.getLivesMoneyDisplayRenderData();
  assert(data.state === 'visible', 'state should be visible');
  assert(data.isVisible, 'isVisible should be true');
  
  console.log('  PASS');
  passed++;
}

function gameLoopIntegrationTests() {
  console.log('Test: game loop integration');
  const game = createGameRunner();
  const animator = game.getLivesMoneyDisplayAnimator();
  assert(animator.state === 'visible', 'animator should be visible initially');
  
  game.update(Date.now());
  assert(animator.elapsed >= 0, 'elapsed should be >= 0');
  
  console.log('  PASS');
  passed++;
}

function resetBehaviorTests() {
  console.log('Test: reset behavior');
  const game = createGameRunner();
  game.start();
  game.placeTower(TowerType.Puffball, 200, 200);
  
  game.reset();
  
  const data = game.getLivesMoneyDisplayRenderData();
  assertEqual(data.kernelIntegrity.current, 20, 'kernel integrity should be 20 after reset');
  assertEqual(data.nutrients.current, 500, 'nutrients should be 500 after reset');
  
  console.log('  PASS');
  passed++;
}

runTests();
console.log('\n=== All livesMoneyDisplay Integration tests passed! ===');

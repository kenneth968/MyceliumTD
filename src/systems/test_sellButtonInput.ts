import { getSellButtonAtPosition, getTowerSellButton, getSellButtonPosition, getSellButtonSize } from './placementPreview';
import { TowerWithUpgrades, UpgradePath, createTowerWithUpgrades } from './upgrade';
import { TowerType } from '../entities/tower';
import { TargetingMode } from './targeting';
import { Vec2 } from '../utils/vec2';

let testsPassed = 0;
let testsFailed = 0;

function expectEqual(actual: any, expected: any, testName: string): void {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    console.log(`  PASS: ${testName}`);
    testsPassed++;
  } else {
    console.log(`  FAIL: ${testName} - Expected ${expectedStr}, got ${actualStr}`);
    testsFailed++;
  }
}

function expectTrue(actual: boolean, testName: string): void {
  if (actual === true) {
    console.log(`  PASS: ${testName}`);
    testsPassed++;
  } else {
    console.log(`  FAIL: ${testName} - Expected true, got ${actual}`);
    testsFailed++;
  }
}

function createMockTower(id: number = 1): TowerWithUpgrades {
  return createTowerWithUpgrades(id, 100, 100, TowerType.PuffballFungus, TargetingMode.First);
}

console.log('\n=== sell button input handling tests ===\n');

console.log('--- getSellButtonPosition ---');
{
  const anchor: Vec2 = { x: 200, y: 200 };
  const towerPos: Vec2 = { x: 100, y: 100 };
  const result = getSellButtonPosition(anchor, towerPos);
  
  expectEqual(result.x, 140, 'x is tower x + 40');
  expectEqual(result.y, 40, 'y is tower y - 60');
}

console.log('\n--- getSellButtonSize ---');
{
  const result = getSellButtonSize();
  
  expectEqual(result.width, 80, 'width is 80');
  expectEqual(result.height, 36, 'height is 36');
}

console.log('\n--- getSellButtonAtPosition ---');
{
  const tower = createMockTower();
  const position: Vec2 = { x: 100, y: 100 };
  const sellButton = getTowerSellButton(tower, position);
  
  const result = getSellButtonAtPosition(sellButton, 140, 40);
  expectTrue(result, 'click at button center is detected');
}

{
  const tower = createMockTower();
  const position: Vec2 = { x: 100, y: 100 };
  const sellButton = getTowerSellButton(tower, position);
  
  const result = getSellButtonAtPosition(sellButton, 100, 100);
  expectTrue(!result, 'click at tower position is not on button');
}

{
  const tower = createMockTower();
  const sellButton = getTowerSellButton(tower);
  
  const result = getSellButtonAtPosition(sellButton, 0, 0);
  expectTrue(result, 'click at top-left of button is detected');
}

{
  const tower = createMockTower();
  tower.totalUpgradeCost = 500;
  const position: Vec2 = { x: 200, y: 200 };
  const sellButton = getTowerSellButton(tower, position);
  
  expectTrue(getSellButtonAtPosition(sellButton, 240, 140), 'click in button bounds');
  expectTrue(getSellButtonAtPosition(sellButton, 320, 140), 'click at right edge is in bounds');
  expectTrue(!getSellButtonAtPosition(sellButton, 321, 140), 'click beyond right edge');
  expectTrue(!getSellButtonAtPosition(sellButton, 240, 181), 'click beyond bottom edge');
}

console.log('\n--- edge cases ---');
{
  const result = getSellButtonAtPosition(null as any, 40, 36);
  expectTrue(!result, 'null button returns false for click');
}

console.log(`\n=== Results: ${testsPassed} passed, ${testsFailed} failed ===\n`);

if (testsFailed > 0) {
  console.log('TESTS FAILED');
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED');
}
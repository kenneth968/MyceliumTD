import { GameRunner, PlacementState } from './gameRunner';
import { TowerType } from '../entities/tower';
import { TargetingMode } from './targeting';

let testsPassed = 0;
let testsFailed = 0;

function expectTrue(actual: boolean, testName: string): void {
  if (actual === true) {
    console.log(`  PASS: ${testName}`);
    testsPassed++;
  } else {
    console.log(`  FAIL: ${testName} - Expected true, got false`);
    testsFailed++;
  }
}

function expectFalse(actual: boolean, testName: string): void {
  if (actual === false) {
    console.log(`  PASS: ${testName}`);
    testsPassed++;
  } else {
    console.log(`  FAIL: ${testName} - Expected false, got true`);
    testsFailed++;
  }
}

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

console.log('\n=== UI Event Bindings - Tower Selection at Position Tests ===\n');

const game = new GameRunner({ startingMoney: 1000, startingLives: 20 });

console.log('--- Initial state ---');
{
  expectEqual(game.getPlacementState(), PlacementState.None, 'Initial placement state is None');
  expectEqual(game.getSelectedTowerId(), null, 'No tower selected initially');
}

console.log('\n--- selectTowerAtPosition when no towers ---');
{
  const result = game.selectTowerAtPosition(100, 100);
  expectFalse(result, 'selectTowerAtPosition returns false when no towers exist');
  expectEqual(game.getPlacementState(), PlacementState.None, 'State remains None');
}

console.log('\n--- Place a tower and test selection ---');
{
  game.start();
  game.startTowerPlacement(TowerType.PuffballFungus);
  game.updatePlacementPosition(100, 100);
  const tower = game.confirmPlacement(TargetingMode.First);
  expectTrue(tower !== null, 'Tower was placed successfully');
  expectEqual(game.getPlacementState(), PlacementState.None, 'State returns to None after placement');
}

console.log('\n--- Verify tower exists at position ---');
{
  const placed = game.getTowerAtPosition(100, 100);
  expectTrue(placed !== null, 'Tower exists at placed position');
  if (placed) {
    expectEqual(placed.x, 100, 'Tower x position correct');
    expectEqual(placed.y, 100, 'Tower y position correct');
  }
}

console.log('\n--- getTowerAtPosition returns null when far from tower ---');
{
  const placed = game.getTowerAtPosition(500, 500);
  expectTrue(placed === null, 'No tower at distant position');
}

console.log('\n--- selectTowerAtPosition selects tower in None state ---');
{
  const result = game.selectTowerAtPosition(100, 100);
  expectTrue(result, 'selectTowerAtPosition returns true when tower exists');
  expectEqual(game.getPlacementState(), PlacementState.Selecting, 'State changes to Selecting');
  expectTrue(game.getSelectedTowerId() !== null, 'Tower is selected');
}

console.log('\n--- selectTowerAtPosition does nothing in Placing state ---');
{
  game.cancelPlacement();
  expectEqual(game.getPlacementState(), PlacementState.None, 'State is None before starting placement');
  
  game.startTowerPlacement(TowerType.OrchidTrap);
  expectEqual(game.getPlacementState(), PlacementState.Placing, 'Started placement');
  
  const result = game.selectTowerAtPosition(100, 100);
  expectFalse(result, 'selectTowerAtPosition returns false in Placing state');
  expectEqual(game.getPlacementState(), PlacementState.Placing, 'State remains Placing');
  
  game.cancelPlacement();
}

console.log('\n--- Right-click cancel during placement ---');
{
  game.startTowerPlacement(TowerType.VenusFlytower);
  expectEqual(game.getPlacementState(), PlacementState.Placing, 'Started placement');
  game.cancelPlacement();
  expectEqual(game.getPlacementState(), PlacementState.None, 'Cancel returns to None');
}

console.log('\n--- selectTowerAtPosition with tower and deselect flow ---');
{
  const selected = game.selectTowerAtPosition(100, 100);
  expectTrue(selected, 'Tower selected');
  expectEqual(game.getPlacementState(), PlacementState.Selecting, 'State is Selecting');
  
  game.deselectTower();
  expectEqual(game.getPlacementState(), PlacementState.None, 'Deselect returns to None');
}

console.log('\n--- Click far from any tower in None state ---');
{
  const result = game.selectTowerAtPosition(999, 999);
  expectFalse(result, 'selectTowerAtPosition returns false for empty area');
  expectEqual(game.getPlacementState(), PlacementState.None, 'State remains None');
}

console.log('\n--- getTowerAtPosition with tower at edge of click radius ---');
{
  const placed = game.getTowerAtPosition(100, 100);
  expectTrue(placed !== null, 'Tower found at center');
  const placedEdge = game.getTowerAtPosition(125, 100);
  expectTrue(placedEdge !== null, 'Tower found at edge of 30px click radius');
  const placedBeyond = game.getTowerAtPosition(131, 100);
  expectTrue(placedBeyond === null, 'Tower not found beyond 30px click radius');
}

console.log('\n--- selectTowerAtPosition returns false when selecting already selected tower ---');
{
  game.selectTowerAtPosition(100, 100);
  expectEqual(game.getPlacementState(), PlacementState.Selecting, 'Tower is selected');
  
  const result = game.selectTowerAtPosition(100, 100);
  expectFalse(result, 'selectTowerAtPosition returns false when already selecting');
}

console.log(`\n=== Results: ${testsPassed} passed, ${testsFailed} failed ===\n`);

if (testsFailed > 0) {
  console.log('TESTS FAILED');
  process.exit(1);
} else {
  console.log('ALL UI EVENT BINDING TESTS PASSED');
}
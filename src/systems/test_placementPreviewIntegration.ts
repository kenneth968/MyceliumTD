import { GameRunner, PlacementState, createGameRunner } from './gameRunner';
import { TowerType } from '../entities/tower';
import { TargetingMode } from './targeting';

let testsPassed = 0;
let testsFailed = 0;

function expect(actual: any, expected: any, testName: string): void {
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

console.log('\n=== Placement Preview Integration Tests ===\n');

console.log('--- Initial Placement State ---');
{
  const game = createGameRunner();
  expect(game.getPlacementState(), PlacementState.None, 'Initial placement state is None');
  expect(game.getPlacementPosition(), null, 'Initial placement position is null');
  expect(game.getSelectedTowerType(), null, 'Initial selected tower type is null');
  expect(game.getSelectedTowerId(), null, 'Initial selected tower id is null');
}

console.log('\n--- Start Tower Placement ---');
{
  const game = createGameRunner();
  const result = game.startTowerPlacement(TowerType.Puffball);
  expectTrue(result === true, 'startTowerPlacement returns true');
  expect(game.getPlacementState(), PlacementState.Placing, 'Placement state is Placing');
  expect(game.getSelectedTowerType(), TowerType.Puffball, 'Selected tower type is Puffball');
  expect(game.getPlacementPosition(), null, 'Placement position starts as null');
}

{
  const game = createGameRunner();
  game.startTowerPlacement(TowerType.Slimefungus);
  const result2 = game.startTowerPlacement(TowerType.ThornSniper);
  expectTrue(result2 === false, 'Cannot start placement while already placing');
  expect(game.getSelectedTowerType(), TowerType.Slimefungus, 'Selected tower remains Orchid');
}

console.log('\n--- Update Placement Position ---');
{
  const game = createGameRunner();
  game.startTowerPlacement(TowerType.Puffball);
  game.updatePlacementPosition(100, 200);
  const pos = game.getPlacementPosition();
  expectTrue(pos !== null, 'Position is not null after update');
  expect(pos!.x, 100, 'Position x is 100');
  expect(pos!.y, 200, 'Position y is 200');
}

{
  const game = createGameRunner();
  game.updatePlacementPosition(100, 200);
  expect(game.getPlacementState(), PlacementState.None, 'Cannot update position without starting placement');
}

console.log('\n--- Cancel Placement ---');
{
  const game = createGameRunner();
  game.startTowerPlacement(TowerType.Puffball);
  game.updatePlacementPosition(100, 200);
  game.cancelPlacement();
  expect(game.getPlacementState(), PlacementState.None, 'State is None after cancel');
  expect(game.getPlacementPosition(), null, 'Position is null after cancel');
  expect(game.getSelectedTowerType(), null, 'Tower type is null after cancel');
}

console.log('\n--- Confirm Placement ---');
{
  const game = createGameRunner();
  game.startTowerPlacement(TowerType.Puffball);
  game.updatePlacementPosition(100, 200);
  const tower = game.confirmPlacement(TargetingMode.First);
  expectTrue(tower !== null, 'Tower is placed');
  expect(game.getPlacementState(), PlacementState.None, 'State is None after confirm');
  expect(game.getGameStats().towers, 1, 'Game has 1 tower');
  expect(game.getGameStats().money, 320, 'Money is 320 after placing Puffball (cost 180)');
}

{
  const game = createGameRunner();
  game.startTowerPlacement(TowerType.ThornSniper);
  game.updatePlacementPosition(100, 200);
  const tower = game.confirmPlacement(TargetingMode.Close);
  expectTrue(tower !== null, 'Venus Flytower is placed');
  expect(game.getGameStats().money, 180, 'Money is 180 after placing Venus (cost 320)');
}

console.log('\n--- Select Tower ---');
{
  const game = createGameRunner();
  const placed = game.placeTower(TowerType.Puffball, 100, 100, TargetingMode.First);
  expectTrue(placed !== null, 'Tower placed');
  
  const result = game.selectTower(placed!.id);
  expectTrue(result === true, 'selectTower returns true');
  expect(game.getPlacementState(), PlacementState.Selecting, 'State is Selecting');
  expect(game.getSelectedTowerId(), placed!.id, 'Selected tower id is set');
}

{
  const game = createGameRunner();
  const result = game.selectTower(999);
  expectTrue(result === false, 'selectTower returns false for invalid id');
  expect(game.getPlacementState(), PlacementState.None, 'State remains None');
}

console.log('\n--- Deselect Tower ---');
{
  const game = createGameRunner();
  const placed = game.placeTower(TowerType.Puffball, 100, 100, TargetingMode.First);
  game.selectTower(placed!.id);
  game.deselectTower();
  expect(game.getPlacementState(), PlacementState.None, 'State is None after deselect');
  expect(game.getSelectedTowerId(), null, 'Selected tower id is null');
}

console.log('\n--- Placement Preview Render Data ---');
{
  const game = createGameRunner();
  const previewData = game.getPlacementPreviewRenderData(1000);
  expect(previewData.isPlacing, false, 'isPlacing is false when no placement');
  expect(previewData.ghost, null, 'ghost is null');
  expect(previewData.rangeCircle, null, 'rangeCircle is null');
  expect(previewData.pathCoverage, null, 'pathCoverage is null');
  expect(previewData.proposedConnection, null, 'network connection is null when no tower is being placed');
  expect(previewData.willBeConnected, false, 'network connection is false when no tower is being placed');
}

{
  const game = createGameRunner();
  game.startTowerPlacement(TowerType.Puffball);
  game.updatePlacementPosition(100, 100);
  
  const previewData = game.getPlacementPreviewRenderData(1000);
  expectTrue(previewData.isPlacing === true, 'isPlacing is true during placement');
  expectTrue(previewData.ghost !== null, 'ghost is populated');
  expectTrue(previewData.rangeCircle !== null, 'rangeCircle is populated');
  expectTrue(previewData.pathCoverage !== null, 'pathCoverage is populated');
  expect(previewData.ghost!.towerType, TowerType.Puffball, 'ghost has correct tower type');
}

console.log('\n--- Mycelium Network Placement Preview ---');
{
  const game = createGameRunner();
  game.startTowerPlacement(TowerType.Puffball);
  game.updatePlacementPosition(720, 180);

  const previewData = game.getPlacementPreviewRenderData(1000);
  expectTrue(previewData.willBeConnected, 'tower near the Kernel previews a network connection');
  expectTrue(previewData.proposedConnection !== null, 'connected tower preview exposes its proposed parent link');
  expect(previewData.proposedConnection?.fromId, 'kernel', 'Kernel is the proposed parent for the first connected tower');
  expect(previewData.proposedConnection?.sourceType, 'kernel', 'proposed link exposes the Kernel source style');
  expect(previewData.proposedConnection?.targetPosition, { x: 720, y: 180 }, 'proposed link ends at the placement ghost');
  expectTrue(previewData.proposedConnection?.sourcePosition !== undefined, 'proposed link exposes a drawable source position');
}

{
  const game = createGameRunner();
  game.startTowerPlacement(TowerType.Puffball);
  game.updatePlacementPosition(100, 100);

  const previewData = game.getPlacementPreviewRenderData(1000);
  expect(previewData.willBeConnected, false, 'isolated tower preview reports no network connection');
  expect(previewData.proposedConnection, null, 'isolated tower preview has no proposed parent link');
}

{
  const game = createGameRunner();
  game.startTowerPlacement(TowerType.Slimefungus);
  game.updatePlacementPosition(500, 500);
  
  const previewData = game.getPlacementPreviewRenderData(1000);
  expectTrue(previewData.ghost !== null, 'ghost is populated for Orchid');
  expect(previewData.ghost!.towerType, TowerType.Slimefungus, 'ghost has Orchid type');
}

console.log('\n--- Reset Clears Placement State ---');
{
  const game = createGameRunner();
  game.startTowerPlacement(TowerType.Puffball);
  game.updatePlacementPosition(100, 200);
  game.reset();
  expect(game.getPlacementState(), PlacementState.None, 'Placement state is None after reset');
  expect(game.getPlacementPosition(), null, 'Placement position is null after reset');
  expect(game.getSelectedTowerType(), null, 'Selected tower type is null after reset');
}

console.log('\n--- Game Loop Integration ---');
{
  const game = createGameRunner();
  game.start();
  game.startTowerPlacement(TowerType.LumenOracle);
  game.updatePlacementPosition(200, 200);
  
  game.update();
  
  const previewData = game.getPlacementPreviewRenderData(game.getGameStats().state ? 1000 : 0);
  expectTrue(previewData.isPlacing === true, 'Placement preview works during game loop');
}

{
  const game = createGameRunner();
  game.start();
  game.startWave(0);
  
  game.startTowerPlacement(TowerType.LumenOracle);
  game.updatePlacementPosition(300, 300);
  const previewData = game.getPlacementPreviewRenderData(1000);
  expectTrue(previewData.isPlacing === true, 'Placement works while wave is active');
}

console.log(`\n=== Results: ${testsPassed} passed, ${testsFailed} failed ===\n`);

if (testsFailed > 0) {
  console.log('TESTS FAILED');
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED');
}

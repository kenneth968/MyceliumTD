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

console.log('\n=== Targeting Mode Button Click Handler Integration Tests ===\n');

const game = new GameRunner({ startingMoney: 5000, startingLives: 20 });

game.start();

console.log('--- Initial targeting mode state ---');
{
  game.startTowerPlacement(TowerType.PuffballFungus);
  expectEqual(game.getSelectedTargetingMode(), TargetingMode.First, 'Default targeting mode is First');
  expectEqual(game.getPlacementState(), PlacementState.Placing, 'Placement state is Placing');
  game.cancelPlacement();
}

console.log('\n--- selectTargetingModeAtPosition returns false when not placing ---');
{
  expectEqual(game.getPlacementState(), PlacementState.None, 'State is None');
  const result = game.selectTargetingModeAtPosition(400, 380);
  expectFalse(result, 'selectTargetingModeAtPosition returns false when not placing');
}

console.log('\n--- Place tower and check targeting mode buttons exist ---');
{
  game.startTowerPlacement(TowerType.PuffballFungus);
  game.updatePlacementPosition(100, 100);
  
  const renderData = game.getTargetingModeSelectionRenderData();
  expectEqual(renderData.buttons.length, 4, 'Should have 4 targeting mode buttons');
  expectEqual(renderData.buttons[0].mode, TargetingMode.First, 'First button is First mode');
  expectEqual(renderData.buttons[1].mode, TargetingMode.Last, 'Second button is Last mode');
  expectEqual(renderData.buttons[2].mode, TargetingMode.Close, 'Third button is Close mode');
  expectEqual(renderData.buttons[3].mode, TargetingMode.Strong, 'Fourth button is Strong mode');
  
  game.cancelPlacement();
}

console.log('\n--- Click on First targeting mode button ---');
{
  game.startTowerPlacement(TowerType.PuffballFungus);
  game.updatePlacementPosition(100, 100);
  
  const renderData = game.getTargetingModeSelectionRenderData();
  const firstButton = renderData.buttons[0];
  
  const clickX = firstButton.position.x + firstButton.size.width / 2;
  const clickY = firstButton.position.y + firstButton.size.height / 2;
  
  const result = game.selectTargetingModeAtPosition(clickX, clickY);
  expectTrue(result, 'Click on First button returns true');
  expectEqual(game.getSelectedTargetingMode(), TargetingMode.First, 'Selected mode is First');
  
  game.cancelPlacement();
}

console.log('\n--- Click on Last targeting mode button ---');
{
  game.startTowerPlacement(TowerType.PuffballFungus);
  game.updatePlacementPosition(100, 100);
  
  const renderData = game.getTargetingModeSelectionRenderData();
  const lastButton = renderData.buttons[1];
  
  const clickX = lastButton.position.x + lastButton.size.width / 2;
  const clickY = lastButton.position.y + lastButton.size.height / 2;
  
  const result = game.selectTargetingModeAtPosition(clickX, clickY);
  expectTrue(result, 'Click on Last button returns true');
  expectEqual(game.getSelectedTargetingMode(), TargetingMode.Last, 'Selected mode is Last');
  
  game.cancelPlacement();
}

console.log('\n--- Click on Close targeting mode button ---');
{
  game.startTowerPlacement(TowerType.PuffballFungus);
  game.updatePlacementPosition(100, 100);
  
  const renderData = game.getTargetingModeSelectionRenderData();
  const closeButton = renderData.buttons[2];
  
  const clickX = closeButton.position.x + closeButton.size.width / 2;
  const clickY = closeButton.position.y + closeButton.size.height / 2;
  
  const result = game.selectTargetingModeAtPosition(clickX, clickY);
  expectTrue(result, 'Click on Close button returns true');
  expectEqual(game.getSelectedTargetingMode(), TargetingMode.Close, 'Selected mode is Close');
  
  game.cancelPlacement();
}

console.log('\n--- Click on Strong targeting mode button ---');
{
  game.startTowerPlacement(TowerType.PuffballFungus);
  game.updatePlacementPosition(100, 100);
  
  const renderData = game.getTargetingModeSelectionRenderData();
  const strongButton = renderData.buttons[3];
  
  const clickX = strongButton.position.x + strongButton.size.width / 2;
  const clickY = strongButton.position.y + strongButton.size.height / 2;
  
  const result = game.selectTargetingModeAtPosition(clickX, clickY);
  expectTrue(result, 'Click on Strong button returns true');
  expectEqual(game.getSelectedTargetingMode(), TargetingMode.Strong, 'Selected mode is Strong');
  
  game.cancelPlacement();
}

console.log('\n--- Click outside targeting mode buttons ---');
{
  game.startTowerPlacement(TowerType.PuffballFungus);
  game.updatePlacementPosition(100, 100);
  
  const result = game.selectTargetingModeAtPosition(999, 999);
  expectFalse(result, 'Click outside buttons returns false');
  expectEqual(game.getSelectedTargetingMode(), TargetingMode.First, 'Selected mode remains First');
  
  game.cancelPlacement();
}

console.log('\n--- Change targeting mode then place tower ---');
{
  game.startTowerPlacement(TowerType.PuffballFungus);
  game.updatePlacementPosition(200, 200);
  
  const renderData = game.getTargetingModeSelectionRenderData();
  const lastButton = renderData.buttons[1];
  const clickX = lastButton.position.x + lastButton.size.width / 2;
  const clickY = lastButton.position.y + lastButton.size.height / 2;
  
  game.selectTargetingModeAtPosition(clickX, clickY);
  expectEqual(game.getSelectedTargetingMode(), TargetingMode.Last, 'Selected mode is Last before placement');
  
  const tower = game.confirmPlacement(game.getSelectedTargetingMode());
  expectTrue(tower !== null, 'Tower placed successfully');
  expectEqual(game.getPlacementState(), PlacementState.None, 'State returns to None after placement');
  
  if (tower) {
    expectEqual(tower.targetingMode, TargetingMode.Last, 'Placed tower has Last targeting mode');
  }
}

console.log('\n--- Place tower with Close mode then verify ---');
{
  game.startTowerPlacement(TowerType.OrchidTrap);
  game.updatePlacementPosition(300, 300);
  
  const renderData = game.getTargetingModeSelectionRenderData();
  const closeButton = renderData.buttons[2];
  const clickX = closeButton.position.x + closeButton.size.width / 2;
  const clickY = closeButton.position.y + closeButton.size.height / 2;
  
  game.selectTargetingModeAtPosition(clickX, clickY);
  
  const tower = game.confirmPlacement(game.getSelectedTargetingMode());
  expectTrue(tower !== null, 'Tower placed successfully');
  
  if (tower) {
    expectEqual(tower.targetingMode, TargetingMode.Close, 'Placed tower has Close targeting mode');
  }
}

console.log('\n--- Place tower with Strong mode then verify ---');
{
  game.startTowerPlacement(TowerType.VenusFlytower);
  game.updatePlacementPosition(400, 400);
  
  const renderData = game.getTargetingModeSelectionRenderData();
  const strongButton = renderData.buttons[3];
  const clickX = strongButton.position.x + strongButton.size.width / 2;
  const clickY = strongButton.position.y + strongButton.size.height / 2;
  
  game.selectTargetingModeAtPosition(clickX, clickY);
  
  const tower = game.confirmPlacement(game.getSelectedTargetingMode());
  expectTrue(tower !== null, 'Tower placed successfully');
  
  if (tower) {
    expectEqual(tower.targetingMode, TargetingMode.Strong, 'Placed tower has Strong targeting mode');
  }
}

console.log('\n--- Targeting mode selection with different tower positions ---');
{
  game.startTowerPlacement(TowerType.BioluminescentShroom);
  game.updatePlacementPosition(150, 250);
  
  const renderData1 = game.getTargetingModeSelectionRenderData();
  expectEqual(renderData1.buttons[0].position.y, 250 + 80, 'Buttons y-position is 80px below placement');
  
  const lastButton = renderData1.buttons[1];
  const clickX = lastButton.position.x + lastButton.size.width / 2;
  const clickY = lastButton.position.y + lastButton.size.height / 2;
  
  game.selectTargetingModeAtPosition(clickX, clickY);
  expectEqual(game.getSelectedTargetingMode(), TargetingMode.Last, 'Selected mode is Last');
  
  game.cancelPlacement();
  
  game.startTowerPlacement(TowerType.StinkhornLine);
  game.updatePlacementPosition(500, 100);
  
  const renderData2 = game.getTargetingModeSelectionRenderData();
  expectEqual(renderData2.buttons[0].position.y, 100 + 80, 'Buttons y-position updated for new position');
  
  const strongButton = renderData2.buttons[3];
  const clickX2 = strongButton.position.x + strongButton.size.width / 2;
  const clickY2 = strongButton.position.y + strongButton.size.height / 2;
  
  game.selectTargetingModeAtPosition(clickX2, clickY2);
  expectEqual(game.getSelectedTargetingMode(), TargetingMode.Strong, 'Selected mode is Strong for new tower');
  
  game.cancelPlacement();
}

console.log('\n--- selectTargetingModeAtPosition returns false without position ---');
{
  game.startTowerPlacement(TowerType.PuffballFungus);
  
  const result = game.selectTargetingModeAtPosition(400, 380);
  expectFalse(result, 'Returns false when placementPosition is null');
  
  game.cancelPlacement();
}

console.log('\n--- getTargetingModeSelectionRenderData reflects selection ---');
{
  game.startTowerPlacement(TowerType.PuffballFungus);
  game.updatePlacementPosition(200, 200);
  
  const renderData = game.getTargetingModeSelectionRenderData();
  expectTrue(renderData.isVisible, 'Render data is visible');
  expectEqual(renderData.buttons.length, 4, 'Render data has 4 buttons');
  expectEqual(renderData.selectedMode, TargetingMode.First, 'Initially First mode selected');
  
  const closeButton = renderData.buttons[2];
  const clickX = closeButton.position.x + closeButton.size.width / 2;
  const clickY = closeButton.position.y + closeButton.size.height / 2;
  
  game.selectTargetingModeAtPosition(clickX, clickY);
  
  const updatedRenderData = game.getTargetingModeSelectionRenderData();
  expectEqual(updatedRenderData.selectedMode, TargetingMode.Close, 'After click, Close mode selected');
  expectEqual(updatedRenderData.buttons.filter(b => b.isSelected).length, 1, 'One button selected');
  expectTrue(updatedRenderData.buttons.find(b => b.isSelected)?.mode === TargetingMode.Close, 'Close button is selected');
  
  game.cancelPlacement();
}

console.log('\n--- Each tower type can be placed with Strong targeting mode ---');
{
  const towerTypes = [
    { type: TowerType.PuffballFungus, x: 100, y: 450 },
    { type: TowerType.OrchidTrap, x: 150, y: 450 },
    { type: TowerType.VenusFlytower, x: 300, y: 450 },
    { type: TowerType.BioluminescentShroom, x: 350, y: 450 },
    { type: TowerType.StinkhornLine, x: 500, y: 450 }
  ];
  
  for (const { type: towerType, x, y } of towerTypes) {
    console.log(`  Testing ${towerType} at (${x}, ${y})`);
    game.startTowerPlacement(towerType);
    game.updatePlacementPosition(x, y);
    
    const renderData = game.getTargetingModeSelectionRenderData();
    expectEqual(renderData.buttons.length, 4, `${towerType}: Has 4 targeting mode buttons`);
    
    const strongButton = renderData.buttons[3];
    const clickX = strongButton.position.x + strongButton.size.width / 2;
    const clickY = strongButton.position.y + strongButton.size.height / 2;
    
    const result = game.selectTargetingModeAtPosition(clickX, clickY);
    expectTrue(result, `${towerType}: Click on Strong button returns true`);
    expectEqual(game.getSelectedTargetingMode(), TargetingMode.Strong, `${towerType}: Selected mode is Strong`);
    
    const tower = game.confirmPlacement(game.getSelectedTargetingMode());
    if (tower === null) {
      console.log(`    DEBUG: confirmPlacement returned null`);
    }
    expectTrue(tower !== null, `${towerType}: Tower placed successfully`);
    
    if (tower) {
      expectEqual(tower.targetingMode, TargetingMode.Strong, `${towerType}: Placed tower has Strong mode`);
    }
  }
}

console.log('\n--- Click on button edge cases ---');
{
  game.startTowerPlacement(TowerType.PuffballFungus);
  game.updatePlacementPosition(100, 100);
  
  const renderData = game.getTargetingModeSelectionRenderData();
  const firstButton = renderData.buttons[0];
  
  const leftEdge = firstButton.position.x;
  const rightEdge = firstButton.position.x + firstButton.size.width;
  const topEdge = firstButton.position.y;
  const bottomEdge = firstButton.position.y + firstButton.size.height;
  
  expectTrue(game.selectTargetingModeAtPosition(leftEdge + 1, topEdge + 1), 'Click on button top-left corner works');
  
  game.cancelPlacement();
  game.startTowerPlacement(TowerType.PuffballFungus);
  game.updatePlacementPosition(100, 100);
  
  const renderData2 = game.getTargetingModeSelectionRenderData();
  const firstButton2 = renderData2.buttons[0];
  
  expectTrue(game.selectTargetingModeAtPosition(
    firstButton2.position.x + firstButton2.size.width - 1,
    firstButton2.position.y + firstButton2.size.height - 1
  ), 'Click on button bottom-right corner works');
  
  game.cancelPlacement();
}

console.log('\n--- Click between buttons returns false ---');
{
  game.startTowerPlacement(TowerType.PuffballFungus);
  game.updatePlacementPosition(100, 100);
  
  const renderData = game.getTargetingModeSelectionRenderData();
  const firstButton = renderData.buttons[0];
  const secondButton = renderData.buttons[1];
  
  const betweenX = firstButton.position.x + firstButton.size.width + 1;
  const betweenY = firstButton.position.y + firstButton.size.height / 2;
  
  expectFalse(game.selectTargetingModeAtPosition(betweenX, betweenY), 'Click between buttons returns false');
  
  game.cancelPlacement();
}

console.log(`\n=== Results: ${testsPassed} passed, ${testsFailed} failed ===\n`);

if (testsFailed > 0) {
  console.log('TESTS FAILED');
  process.exit(1);
} else {
  console.log('ALL TARGETING MODE BUTTON CLICK HANDLER TESTS PASSED');
}
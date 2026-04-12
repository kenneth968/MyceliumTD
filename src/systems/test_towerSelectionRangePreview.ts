import { getTowerSelectionRangePreview, getTowerSelectionPreviewRenderData } from './placementPreview';
import { TowerWithUpgrades, UpgradePath, createTowerWithUpgrades } from './upgrade';
import { TowerType } from '../entities/tower';
import { TargetingMode } from './targeting';
import { PlacementMode } from './input';
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

function expectNotNull(actual: any, testName: string): void {
  if (actual !== null) {
    console.log(`  PASS: ${testName}`);
    testsPassed++;
  } else {
    console.log(`  FAIL: ${testName} - Expected not null, got null`);
    testsFailed++;
  }
}

function createMockTower(towerType: TowerType = TowerType.PuffballFungus): TowerWithUpgrades {
  return createTowerWithUpgrades(1, 100, 100, towerType, TargetingMode.First);
}

console.log('\n=== tower selection range preview tests ===\n');

console.log('--- getTowerSelectionRangePreview ---');
{
  const tower = createMockTower();
  const position: Vec2 = { x: 100, y: 200 };
  const result = getTowerSelectionRangePreview(tower, position);
  
  expectEqual(result.position.x, 100, 'returns correct x position');
  expectEqual(result.position.y, 200, 'returns correct y position');
  expectTrue(result.radius === tower.range, 'returns tower range as radius');
  expectEqual(result.color, '#2196F3', 'returns correct color');
  expectEqual(result.opacity, 0.25, 'returns default opacity');
  
  result.position.x = 999;
  expectEqual(position.x, 100, 'position is copied not referenced');
}

console.log('\n--- getTowerSelectionRangePreview for different tower types ---');
{
  const towerTypes = [
    TowerType.PuffballFungus,
    TowerType.OrchidTrap,
    TowerType.VenusFlytower,
    TowerType.BioluminescentShroom,
    TowerType.StinkhornLine,
  ];
  
  for (const type of towerTypes) {
    const tower = createMockTower(type);
    const position: Vec2 = { x: 50, y: 100 };
    const result = getTowerSelectionRangePreview(tower, position);
    
    expectEqual(result.position.x, 50, `${type} returns correct x position`);
    expectEqual(result.position.y, 100, `${type} returns correct y position`);
    expectTrue(result.radius === tower.range, `${type} returns correct range`);
    expectEqual(result.color, '#2196F3', `${type} returns correct color`);
    expectEqual(result.opacity, 0.25, `${type} returns correct opacity`);
  }
}

console.log('\n--- getTowerSelectionRangePreview with upgraded tower ---');
{
  const tower = createMockTower(TowerType.OrchidTrap);
  const originalRange = tower.range;
  
  tower.upgradeLevels[UpgradePath.Range] = 1;
  tower.range = originalRange * 1.15;
  
  const position: Vec2 = { x: 75, y: 150 };
  const result = getTowerSelectionRangePreview(tower, position);
  
  expectTrue(result.radius > originalRange, 'range is increased after upgrade');
  expectEqual(result.radius, tower.range, 'result reflects upgraded tower range');
}

console.log('\n--- getTowerSelectionPreviewRenderData includes range preview ---');
{
  const tower = createMockTower();
  const position: Vec2 = { x: 50, y: 100 };
  
  const canAfford = () => true;
  const getCost = () => 50;
  
  const result = getTowerSelectionPreviewRenderData(
    tower,
    position,
    PlacementMode.Selecting,
    canAfford,
    getCost
  );
  
  expectTrue(result.isSelecting, 'isSelecting is true');
  expectNotNull(result.rangePreview, 'rangePreview is not null when selecting');
  expectEqual(result.rangePreview!.position.x, 50, 'rangePreview has correct x');
  expectEqual(result.rangePreview!.position.y, 100, 'rangePreview has correct y');
  expectTrue(result.rangePreview!.radius === tower.range, 'rangePreview has correct radius');
}

console.log('\n--- getTowerSelectionPreviewRenderData excludes range preview when not selecting ---');
{
  const tower = createMockTower();
  const position: Vec2 = { x: 50, y: 100 };
  
  const canAfford = () => true;
  const getCost = () => 50;
  
  const result = getTowerSelectionPreviewRenderData(
    tower,
    position,
    PlacementMode.None,
    canAfford,
    getCost
  );
  
  expectTrue(result.isSelecting === false, 'isSelecting is false');
  expectEqual(result.rangePreview, null, 'rangePreview is null when not selecting');
}

console.log('\n--- getTowerSelectionPreviewRenderData excludes range preview when tower is null ---');
{
  const canAfford = () => true;
  const getCost = () => 50;
  
  const result = getTowerSelectionPreviewRenderData(
    null,
    { x: 50, y: 100 },
    PlacementMode.Selecting,
    canAfford,
    getCost
  );
  
  expectTrue(result.isSelecting === false, 'isSelecting is false when tower is null');
  expectEqual(result.rangePreview, null, 'rangePreview is null when tower is null');
}

console.log('\n--- getTowerSelectionPreviewRenderData excludes range preview when position is null ---');
{
  const tower = createMockTower();
  
  const canAfford = () => true;
  const getCost = () => 50;
  
  const result = getTowerSelectionPreviewRenderData(
    tower,
    null,
    PlacementMode.Selecting,
    canAfford,
    getCost
  );
  
  expectTrue(result.isSelecting === false, 'isSelecting is false when position is null');
  expectEqual(result.rangePreview, null, 'rangePreview is null when position is null');
}

console.log('\n--- getTowerSelectionPreviewRenderData excludes range preview when placing ---');
{
  const tower = createMockTower();
  
  const canAfford = () => true;
  const getCost = () => 50;
  
  const result = getTowerSelectionPreviewRenderData(
    tower,
    { x: 50, y: 100 },
    PlacementMode.Placing,
    canAfford,
    getCost
  );
  
  expectTrue(result.isSelecting === false, 'isSelecting is false when placing');
  expectEqual(result.rangePreview, null, 'rangePreview is null when placing');
}

console.log('\n--- getTowerSelectionPreviewRenderData has all expected fields ---');
{
  const tower = createMockTower();
  
  const canAfford = () => true;
  const getCost = () => 50;
  
  const result = getTowerSelectionPreviewRenderData(
    tower,
    { x: 50, y: 100 },
    PlacementMode.Selecting,
    canAfford,
    getCost
  );
  
  expectTrue(result.hasOwnProperty('selection'), 'has selection field');
  expectTrue(result.hasOwnProperty('upgradeIndicators'), 'has upgradeIndicators field');
  expectTrue(result.hasOwnProperty('sellButton'), 'has sellButton field');
  expectTrue(result.hasOwnProperty('isSelecting'), 'has isSelecting field');
  expectTrue(result.hasOwnProperty('rangePreview'), 'has rangePreview field');
}

console.log('\n--- getTowerSelectionPreviewRenderData with fully upgraded tower ---');
{
  const tower = createMockTower(TowerType.VenusFlytower);
  
  tower.upgradeLevels[UpgradePath.Damage] = 3;
  tower.upgradeLevels[UpgradePath.Range] = 3;
  tower.upgradeLevels[UpgradePath.FireRate] = 3;
  tower.upgradeLevels[UpgradePath.Special] = 3;
  
  const canAfford = () => true;
  const getCost = () => 200;
  
  const result = getTowerSelectionPreviewRenderData(
    tower,
    { x: 50, y: 100 },
    PlacementMode.Selecting,
    canAfford,
    getCost
  );
  
  expectNotNull(result.rangePreview, 'rangePreview exists for fully upgraded tower');
  expectEqual(result.rangePreview!.radius, tower.range, 'rangePreview reflects final range');
}

console.log('\n=== summary ===');
console.log(`passed: ${testsPassed}`);
console.log(`failed: ${testsFailed}`);
console.log(`total:  ${testsPassed + testsFailed}`);

if (testsFailed > 0) {
  process.exit(1);
}
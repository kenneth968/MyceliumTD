import {
  getTowerSelectionRenderData,
  getTowerUpgradeIndicators,
  getTowerSellButton,
  getTowerSelectionPreviewRenderData,
} from './placementPreview';
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

function createMockTower(id: number = 1): TowerWithUpgrades {
  return createTowerWithUpgrades(id, 100, 100, TowerType.PuffballFungus, TargetingMode.First);
}

console.log('\n=== tower selection preview tests ===\n');

console.log('--- getTowerSelectionRenderData ---');
{
  const tower = createMockTower(1);
  const position: Vec2 = { x: 100, y: 100 };
  const result = getTowerSelectionRenderData(tower, position);
  
  expectTrue(result !== null, 'returns data when tower provided');
  expectEqual(result!.towerId, 1, 'tower id matches');
  expectEqual(result!.position, position, 'position matches');
  expectEqual(result!.towerType, TowerType.PuffballFungus, 'tower type matches');
  expectEqual(result!.range, 80, 'range from tower stats');
  expectEqual(result!.color, '#2196F3', 'selection color');
  expectEqual(result!.glowColor, '#64B5F6', 'selection glow color');
  expectEqual(result!.size, 20, 'puffball size');
  expectEqual(result!.upgradeLevel, 0, 'initial upgrade level is 0');
  expectEqual(result!.sellValue, 0, 'initial sell value is 0');
  expectEqual(result!.targetingMode, TargetingMode.First, 'targeting mode matches');
}

{
  const tower = createMockTower(5);
  tower.upgradeLevels[UpgradePath.Damage] = 2;
  tower.upgradeLevels[UpgradePath.Range] = 1;
  tower.totalUpgradeCost = 200;
  const position: Vec2 = { x: 200, y: 300 };
  const result = getTowerSelectionRenderData(tower, position);
  
  expectEqual(result!.towerId, 5, 'tower id is 5');
  expectEqual(result!.upgradeLevel, 3, 'upgrade level is sum of all paths');
  expectEqual(result!.sellValue, 140, 'sell value is 70% of total upgrade cost');
}

console.log('\n--- getTowerUpgradeIndicators ---');
{
  const tower = createMockTower();
  const canAfford = (path: UpgradePath, tier: number) => true;
  const getCost = (tt: TowerType, path: UpgradePath, tier: number) => 100;
  
  const result = getTowerUpgradeIndicators(tower, canAfford, getCost);
  
  expectEqual(result.length, 4, 'has 4 upgrade paths');
  expectEqual(result[0].path, 'damage', 'first path is damage');
  expectEqual(result[1].path, 'range', 'second path is range');
  expectEqual(result[2].path, 'fire_rate', 'third path is fire_rate');
  expectEqual(result[3].path, 'special', 'fourth path is special');
  expectEqual(result[0].currentTier, 0, 'damage starts at tier 0');
  expectEqual(result[0].maxTier, 3, 'max tier is 3');
  expectTrue(result[0].canUpgrade, 'can upgrade from tier 0');
  expectEqual(result[0].nextCost, 100, 'next cost is 100');
}

{
  const tower = createMockTower();
  tower.upgradeLevels[UpgradePath.Damage] = 3;
  const canAfford = (path: UpgradePath, tier: number) => true;
  const getCost = (tt: TowerType, path: UpgradePath, tier: number) => 100;
  
  const result = getTowerUpgradeIndicators(tower, canAfford, getCost);
  
  expectEqual(result[0].currentTier, 3, 'damage is at tier 3');
  expectTrue(!result[0].canUpgrade, 'cannot upgrade past tier 3');
  expectEqual(result[0].nextCost, 0, 'next cost is 0 when maxed');
}

{
  const tower = createMockTower();
  const canAfford = (path: UpgradePath, tier: number) => path === UpgradePath.Damage;
  const getCost = (tt: TowerType, path: UpgradePath, tier: number) => tier * 50;
  
  const result = getTowerUpgradeIndicators(tower, canAfford, getCost);
  
  expectTrue(result[0].canUpgrade, 'damage can be upgraded');
  expectTrue(!result[1].canUpgrade, 'range cannot be upgraded');
}

console.log('\n--- getTowerSellButton ---');
{
  const tower = createMockTower();
  const result = getTowerSellButton(tower);
  
  expectEqual(result.sellValue, 0, 'sell value is 0 for base tower');
  expectEqual(result.color, '#F44336', 'sell button is red');
  expectEqual(result.textColor, '#FFFFFF', 'text is white');
}

{
  const tower = createMockTower();
  tower.totalUpgradeCost = 500;
  const position: Vec2 = { x: 100, y: 100 };
  const result = getTowerSellButton(tower, position);
  
  expectEqual(result.sellValue, 350, 'sell value is 70% of 500');
}

console.log('\n--- getTowerSelectionPreviewRenderData ---');
{
  const tower = createMockTower();
  const position: Vec2 = { x: 100, y: 100 };
  const canAfford = (path: UpgradePath, tier: number) => true;
  const getCost = (tt: TowerType, path: UpgradePath, tier: number) => 100;
  
  const result = getTowerSelectionPreviewRenderData(
    tower,
    position,
    PlacementMode.Selecting,
    canAfford,
    getCost
  );
  
  expectTrue(result.isSelecting, 'is selecting in selecting mode');
  expectTrue(result.selection !== null, 'selection is populated');
  expectTrue(result.upgradeIndicators !== null, 'upgrade indicators populated');
  expectTrue(result.sellButton !== null, 'sell button populated');
}

{
  const result = getTowerSelectionPreviewRenderData(
    null,
    null,
    PlacementMode.None,
    () => true,
    () => 0
  );
  
  expectTrue(!result.isSelecting, 'not selecting in none mode');
  expectTrue(result.selection === null, 'selection is null');
  expectTrue(result.upgradeIndicators === null, 'upgrade indicators null');
  expectTrue(result.sellButton === null, 'sell button null');
}

{
  const tower = createMockTower();
  const result = getTowerSelectionPreviewRenderData(
    tower,
    null,
    PlacementMode.Selecting,
    () => true,
    () => 0
  );
  
  expectTrue(!result.isSelecting, 'not selecting when position is null');
}

{
  const tower = createMockTower();
  const position: Vec2 = { x: 100, y: 100 };
  const result = getTowerSelectionPreviewRenderData(
    tower,
    position,
    PlacementMode.Placing,
    () => true,
    () => 0
  );
  
  expectTrue(!result.isSelecting, 'not selecting when mode is placing');
}

console.log(`\n=== Results: ${testsPassed} passed, ${testsFailed} failed ===\n`);

if (testsFailed > 0) {
  console.log('TESTS FAILED');
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED');
}
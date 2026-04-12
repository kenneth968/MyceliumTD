import {
  getTowerInfoPanelRenderData,
  createTowerInfoPanelAnimator,
  showTowerInfoPanel,
  hideTowerInfoPanel,
  updateTowerInfoPanel,
  getAnimatedTowerInfoPanel,
  isTowerInfoPanelVisible,
  getTowerInfoPanelPosition,
  getTowerInfoPanelSize,
  getPanelColorConfig,
  getTowerIcon,
  getUpgradePathIcon,
  getUpgradePathLabel,
} from './towerInfoPanel';
import { TowerWithUpgrades, UpgradePath, createTowerWithUpgrades } from './upgrade';
import { TowerType, TOWER_STATS } from '../entities/tower';
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

function expectFalse(actual: boolean, testName: string): void {
  if (actual === false) {
    console.log(`  PASS: ${testName}`);
    testsPassed++;
  } else {
    console.log(`  FAIL: ${testName} - Expected false, got ${actual}`);
    testsFailed++;
  }
}

function createMockTower(id: number = 1, towerType: TowerType = TowerType.PuffballFungus): TowerWithUpgrades {
  return createTowerWithUpgrades(id, 100, 100, towerType, TargetingMode.First);
}

console.log('\n=== tower info panel tests ===\n');

console.log('--- getTowerInfoPanelRenderData basic ---');
{
  const tower = createMockTower(1);
  const position: Vec2 = { x: 200, y: 200 };
  const canAfford = (path: UpgradePath, tier: number) => true;
  const getCost = (tt: TowerType, path: UpgradePath, tier: number) => 100;
  
  const result = getTowerInfoPanelRenderData(tower, position, true, canAfford, getCost);
  
  expectTrue(result.isVisible, 'is visible when selecting');
  expectEqual(result.towerId, 1, 'tower id matches');
  expectEqual(result.towerName, 'Puffball Fungus', 'tower name is correct');
  expectEqual(result.towerType, TowerType.PuffballFungus, 'tower type matches');
  expectEqual(result.stats.length, 3, 'has 3 stats');
  expectEqual(result.stats[0].label, 'Damage', 'first stat is damage');
  expectEqual(result.stats[1].label, 'Range', 'second stat is range');
  expectEqual(result.stats[2].label, 'Fire Rate', 'third stat is fire rate');
  expectEqual(result.upgrades.length, 4, 'has 4 upgrade paths');
  expectEqual(result.sellValue, 70, 'sell value is 70% of base cost');
}

{
  const tower = createMockTower(5, TowerType.OrchidTrap);
  const position: Vec2 = { x: 300, y: 150 };
  const canAfford = (path: UpgradePath, tier: number) => true;
  const getCost = (tt: TowerType, path: UpgradePath, tier: number) => 100;
  
  const result = getTowerInfoPanelRenderData(tower, position, true, canAfford, getCost);
  
  expectEqual(result.towerName, 'Orchid Trap', 'tower name for Orchid');
  expectEqual(result.specialEffect?.type, 'slow', 'Orchid has slow effect');
}

{
  const tower = createMockTower(3, TowerType.VenusFlytower);
  const position: Vec2 = { x: 150, y: 250 };
  const canAfford = (path: UpgradePath, tier: number) => true;
  const getCost = (tt: TowerType, path: UpgradePath, tier: number) => 100;
  
  const result = getTowerInfoPanelRenderData(tower, position, true, canAfford, getCost);
  
  expectEqual(result.towerName, 'Venus Flytower', 'tower name for Venus');
  expectEqual(result.specialEffect?.type, 'instakill', 'Venus has instakill effect');
}

console.log('\n--- getTowerInfoPanelRenderData with upgrades ---');
{
  const tower = createMockTower(1);
  tower.upgradeLevels[UpgradePath.Damage] = 2;
  tower.upgradeLevels[UpgradePath.Range] = 1;
  tower.damage = 3;
  tower.range = 100;
  tower.totalUpgradeCost = 150;
  
  const position: Vec2 = { x: 200, y: 200 };
  const canAfford = (path: UpgradePath, tier: number) => true;
  const getCost = (tt: TowerType, path: UpgradePath, tier: number) => 100;
  
  const result = getTowerInfoPanelRenderData(tower, position, true, canAfford, getCost);
  
  expectEqual(result.upgrades[0].currentTier, 2, 'damage tier is 2');
  expectEqual(result.upgrades[1].currentTier, 1, 'range tier is 1');
  expectEqual(result.sellValue, Math.floor((100 + 150) * 0.7), 'sell value includes upgrades');
}

console.log('\n--- getTowerInfoPanelRenderData null cases ---');
{
  const result = getTowerInfoPanelRenderData(null, null, false, () => true, () => 0);
  
  expectFalse(result.isVisible, 'not visible when not selecting');
  expectEqual(result.opacity, 0, 'opacity is 0');
}

{
  const tower = createMockTower(1);
  const result = getTowerInfoPanelRenderData(tower, null, true, () => true, () => 0);
  
  expectFalse(result.isVisible, 'not visible when position is null');
}

{
  const position: Vec2 = { x: 200, y: 200 };
  const result = getTowerInfoPanelRenderData(null, position, true, () => true, () => 0);
  
  expectFalse(result.isVisible, 'not visible when tower is null');
}

console.log('\n--- getTowerInfoPanelRenderData targeting mode ---');
{
  const tower = createTowerWithUpgrades(1, 100, 100, TowerType.PuffballFungus, TargetingMode.Last);
  const position: Vec2 = { x: 200, y: 200 };
  
  const result = getTowerInfoPanelRenderData(tower, position, true, () => true, () => 0);
  
  expectEqual(result.targetingMode.mode, TargetingMode.Last, 'targeting mode is Last');
  expectEqual(result.targetingMode.label, 'Last', 'targeting label is Last');
}

{
  const tower = createTowerWithUpgrades(1, 100, 100, TowerType.PuffballFungus, TargetingMode.Strong);
  const position: Vec2 = { x: 200, y: 200 };
  
  const result = getTowerInfoPanelRenderData(tower, position, true, () => true, () => 0);
  
  expectEqual(result.targetingMode.mode, TargetingMode.Strong, 'targeting mode is Strong');
}

console.log('\n--- getTowerInfoPanelRenderData special effects ---');
{
  const tower = createMockTower(1, TowerType.StinkhornLine);
  const position: Vec2 = { x: 200, y: 200 };
  
  const result = getTowerInfoPanelRenderData(tower, position, true, () => true, () => 0);
  
  expectTrue(result.specialEffect !== null, 'has special effect');
  expectEqual(result.specialEffect?.type, 'poison', 'Stinkhorn has poison effect');
  expectEqual(result.specialEffect?.label, 'Poison', 'effect label is Poison');
  expectTrue(result.specialEffect!.duration !== null, 'has duration');
}

{
  const tower = createMockTower(1, TowerType.BioluminescentShroom);
  const position: Vec2 = { x: 200, y: 200 };
  
  const result = getTowerInfoPanelRenderData(tower, position, true, () => true, () => 0);
  
  expectEqual(result.specialEffect?.type, 'reveal_camo', 'Bioluminescent has reveal_camo effect');
}

console.log('\n--- getTowerInfoPanelRenderData stats values ---');
{
  const tower = createMockTower(1, TowerType.VenusFlytower);
  tower.damage = 500;
  tower.range = 75;
  tower.fireRate = 2000;
  const position: Vec2 = { x: 200, y: 200 };
  
  const result = getTowerInfoPanelRenderData(tower, position, true, () => true, () => 0);
  
  expectEqual(result.stats[0].value, '500', 'damage value shows upgraded damage');
  expectEqual(result.stats[1].value, '75', 'range value shows upgraded range');
  expectEqual(result.stats[2].value, '2000ms', 'fire rate shows upgraded fire rate');
}

console.log('\n--- createTowerInfoPanelAnimator ---');
{
  const animator = createTowerInfoPanelAnimator();
  
  expectFalse(animator.isShowing, 'initially not showing');
  expectEqual(animator.currentOpacity, 0, 'initial opacity is 0');
  expectEqual(animator.targetOpacity, 1, 'target opacity is 1');
  expectEqual(animator.scale, 0.8, 'initial scale is 0.8');
}

console.log('\n--- showTowerInfoPanel / hideTowerInfoPanel ---');
{
  const animator = createTowerInfoPanelAnimator();
  
  showTowerInfoPanel(animator);
  expectTrue(animator.isShowing, 'is showing after show');
  expectEqual(animator.animationProgress, 0, 'animation progress reset');
  
  hideTowerInfoPanel(animator);
  expectFalse(animator.isShowing, 'not showing after hide');
}

console.log('\n--- updateTowerInfoPanel ---');
{
  const animator = createTowerInfoPanelAnimator();
  animator.isShowing = true;
  
  updateTowerInfoPanel(animator, 100);
  expectTrue(animator.currentOpacity > 0, 'opacity increases');
  expectTrue(animator.scale > 0.8, 'scale increases');
}

{
  const animator = createTowerInfoPanelAnimator();
  animator.currentOpacity = 1;
  hideTowerInfoPanel(animator);
  
  updateTowerInfoPanel(animator, 100);
  expectTrue(animator.currentOpacity < 1, 'opacity decreases with 100ms');
}

console.log('\n--- getAnimatedTowerInfoPanel ---');
{
  const tower = createMockTower(1);
  const position: Vec2 = { x: 200, y: 200 };
  const baseData = getTowerInfoPanelRenderData(tower, position, true, () => true, () => 0);
  
  const animator = createTowerInfoPanelAnimator();
  animator.isShowing = true;
  animator.currentOpacity = 0.5;
  animator.scale = 0.9;
  
  const animated = getAnimatedTowerInfoPanel(baseData, animator);
  
  expectEqual(animated.opacity, 0.5, 'opacity from animator');
  expectEqual(animated.scale, 0.9, 'scale from animator');
  expectTrue(animated.isVisible, 'still visible');
}

{
  const baseData = getTowerInfoPanelRenderData(null, null, false, () => true, () => 0);
  const animator = createTowerInfoPanelAnimator();
  animator.currentOpacity = 0;
  
  const animated = getAnimatedTowerInfoPanel(baseData, animator);
  
  expectFalse(animated.isVisible, 'not visible when opacity is 0');
}

console.log('\n--- isTowerInfoPanelVisible ---');
{
  const animator = createTowerInfoPanelAnimator();
  animator.isShowing = true;
  animator.currentOpacity = 0.5;
  
  expectTrue(isTowerInfoPanelVisible(animator), 'visible when showing and opacity > 0');
}

{
  const animator = createTowerInfoPanelAnimator();
  animator.isShowing = false;
  animator.currentOpacity = 0.5;
  
  expectFalse(isTowerInfoPanelVisible(animator), 'not visible when not showing');
}

console.log('\n--- getTowerInfoPanelPosition ---');
{
  const towerPosition: Vec2 = { x: 200, y: 200 };
  const result = getTowerInfoPanelPosition(towerPosition);
  
  expectEqual(result.x, 220, 'x offset applied');
  expectEqual(result.y, 40, 'y offset applied');
}

console.log('\n--- getTowerInfoPanelSize ---');
{
  const size = getTowerInfoPanelSize();
  
  expectEqual(size.width, 200, 'width is 200');
  expectEqual(size.height, 320, 'height is 320');
}

console.log('\n--- getPanelColorConfig ---');
{
  const colors = getPanelColorConfig();
  
  expectTrue(colors.background.includes('rgba'), 'has background color');
  expectTrue(colors.border === '#4A90D9', 'border color is blue');
  expectTrue(colors.accent === '#FFD700', 'accent is gold');
}

console.log('\n--- getTowerIcon ---');
{
  expectEqual(getTowerIcon(TowerType.PuffballFungus), '🌿', 'puffball icon');
  expectEqual(getTowerIcon(TowerType.OrchidTrap), '🌸', 'orchid icon');
  expectEqual(getTowerIcon(TowerType.VenusFlytower), '🌺', 'venus icon');
  expectEqual(getTowerIcon(TowerType.BioluminescentShroom), '✨', 'bioluminescent icon');
  expectEqual(getTowerIcon(TowerType.StinkhornLine), '📍', 'stinkhorn icon');
}

console.log('\n--- getUpgradePathIcon ---');
{
  expectEqual(getUpgradePathIcon(UpgradePath.Damage), '⚔️', 'damage icon');
  expectEqual(getUpgradePathIcon(UpgradePath.Range), '🎯', 'range icon');
  expectEqual(getUpgradePathIcon(UpgradePath.FireRate), '⚡', 'fire rate icon');
  expectEqual(getUpgradePathIcon(UpgradePath.Special), '✨', 'special icon');
}

console.log('\n--- getUpgradePathLabel ---');
{
  expectEqual(getUpgradePathLabel(UpgradePath.Damage), 'Damage', 'damage label');
  expectEqual(getUpgradePathLabel(UpgradePath.Range), 'Range', 'range label');
  expectEqual(getUpgradePathLabel(UpgradePath.FireRate), 'Fire Rate', 'fire rate label');
  expectEqual(getUpgradePathLabel(UpgradePath.Special), 'Special', 'special label');
}

console.log('\n--- canUpgrade flag ---');
{
  const tower = createMockTower(1);
  tower.upgradeLevels[UpgradePath.Damage] = 3;
  const position: Vec2 = { x: 200, y: 200 };
  
  const canAfford = (path: UpgradePath, tier: number) => true;
  const getCost = (tt: TowerType, path: UpgradePath, tier: number) => 100;
  
  const result = getTowerInfoPanelRenderData(tower, position, true, canAfford, getCost);
  
  expectFalse(result.upgrades[0].canUpgrade, 'cannot upgrade at max tier');
  expectTrue(result.upgrades[1].canUpgrade, 'can upgrade other paths');
}

{
  const tower = createMockTower(1);
  const position: Vec2 = { x: 200, y: 200 };
  
  const canAfford = (path: UpgradePath, tier: number) => path !== UpgradePath.Range;
  const getCost = (tt: TowerType, path: UpgradePath, tier: number) => 100;
  
  const result = getTowerInfoPanelRenderData(tower, position, true, canAfford, getCost);
  
  expectTrue(result.upgrades[0].canUpgrade, 'damage can be upgraded');
  expectFalse(result.upgrades[1].canUpgrade, 'range cannot be upgraded');
}

console.log('\n=== Results: ' + testsPassed + ' passed, ' + testsFailed + ' failed ===\n');

if (testsFailed > 0) {
  console.log('TESTS FAILED');
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED');
}

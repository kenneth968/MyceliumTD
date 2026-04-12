import {
  TowerRenderData,
  TowerAnimationState,
  TowerGrowthStage,
  getTowerVisualConfig,
  getTowerColors,
  getTowerRadii,
  getTowerBodyShape,
  getTowerRenderData,
  getTowersRenderData,
  getAnimationState,
  getTowerAnimationState,
  getAnimatedTowerRenderData,
  getTargetingModeIndicatorColor,
  getTowerFacingAngle,
  getTowerBaseDecorations,
  getUpgradeTierVisuals,
  getUpgradeIndicatorForTower,
  getTowerPlacementGhostData,
  getUpgradePathIndicators,
} from './towerRender';
import { Tower, TowerType, TOWER_STATS, createTower } from '../entities/tower';
import { TargetingMode } from './targeting';

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

function assertApproxEqual(actual: number, expected: number, epsilon: number, message: string) {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`Assertion failed: ${message} (expected ~${expected}, got ${actual})`);
  }
}

let testsPassed = 0;
let testsFailed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    testsPassed++;
    console.log(`✓ ${name}`);
  } catch (e: any) {
    testsFailed++;
    console.log(`✗ ${name}: ${e.message}`);
  }
}

const testTower = createTower(1, 100, 200, TowerType.PuffballFungus, TargetingMode.First);

runTest('getTowerVisualConfig returns correct config for PuffballFungus', () => {
  const config = getTowerVisualConfig(TowerType.PuffballFungus);
  assert(config.primary === '#9B59B6', 'primary color should be #9B59B6');
  assert(config.secondary === '#8E44AD', 'secondary color should be #8E44AD');
  assert(config.glow === '#D7BDE2', 'glow color should be #D7BDE2');
  assert(config.baseRadius === 18, 'baseRadius should be 18');
  assert(config.bodyRadius === 14, 'bodyRadius should be 14');
  assert(config.bodyShape === 'circle', 'bodyShape should be circle');
});

runTest('getTowerVisualConfig returns correct config for OrchidTrap', () => {
  const config = getTowerVisualConfig(TowerType.OrchidTrap);
  assert(config.primary === '#3498DB', 'primary color should be #3498DB');
  assert(config.bodyShape === 'hexagon', 'bodyShape should be hexagon');
});

runTest('getTowerVisualConfig returns correct config for VenusFlytower', () => {
  const config = getTowerVisualConfig(TowerType.VenusFlytower);
  assert(config.primary === '#E74C3C', 'primary color should be #E74C3C');
  assert(config.bodyShape === 'diamond', 'bodyShape should be diamond');
  assert(config.baseRadius === 24, 'baseRadius should be 24');
});

runTest('getTowerVisualConfig returns correct config for BioluminescentShroom', () => {
  const config = getTowerVisualConfig(TowerType.BioluminescentShroom);
  assert(config.primary === '#1ABC9C', 'primary color should be #1ABC9C');
  assert(config.bodyShape === 'circle', 'bodyShape should be circle');
});

runTest('getTowerVisualConfig returns correct config for StinkhornLine', () => {
  const config = getTowerVisualConfig(TowerType.StinkhornLine);
  assert(config.primary === '#27AE60', 'primary color should be #27AE60');
  assert(config.bodyShape === 'star', 'bodyShape should be star');
});

runTest('getTowerVisualConfig falls back to PuffballFungus for unknown type', () => {
  const config = getTowerVisualConfig('unknown' as TowerType);
  assert(config.primary === '#9B59B6', 'should fallback to PuffballFungus primary');
});

runTest('getTowerColors returns colors for each tower type', () => {
  const puffball = getTowerColors(TowerType.PuffballFungus);
  assert(puffball.primary === '#9B59B6', 'Puffball primary should be #9B59B6');
  assert(puffball.secondary === '#8E44AD', 'Puffball secondary should be #8E44AD');
  assert(puffball.glow === '#D7BDE2', 'Puffball glow should be #D7BDE2');

  const orchid = getTowerColors(TowerType.OrchidTrap);
  assert(orchid.primary === '#3498DB', 'Orchid primary should be #3498DB');

  const venus = getTowerColors(TowerType.VenusFlytower);
  assert(venus.primary === '#E74C3C', 'Venus primary should be #E74C3C');

  const bio = getTowerColors(TowerType.BioluminescentShroom);
  assert(bio.primary === '#1ABC9C', 'Bioluminescent primary should be #1ABC9C');

  const stink = getTowerColors(TowerType.StinkhornLine);
  assert(stink.primary === '#27AE60', 'Stinkhorn primary should be #27AE60');
});

runTest('getTowerRadii returns correct radii for each tower type', () => {
  assertEqual(getTowerRadii(TowerType.PuffballFungus), { baseRadius: 18, bodyRadius: 14 }, 'Puffball radii');
  assertEqual(getTowerRadii(TowerType.OrchidTrap), { baseRadius: 20, bodyRadius: 16 }, 'Orchid radii');
  assertEqual(getTowerRadii(TowerType.VenusFlytower), { baseRadius: 24, bodyRadius: 20 }, 'Venus radii');
  assertEqual(getTowerRadii(TowerType.BioluminescentShroom), { baseRadius: 16, bodyRadius: 12 }, 'Bio radii');
  assertEqual(getTowerRadii(TowerType.StinkhornLine), { baseRadius: 22, bodyRadius: 10 }, 'Stinkhorn radii');
});

runTest('getTowerBodyShape returns correct body shapes', () => {
  assert(getTowerBodyShape(TowerType.PuffballFungus) === 'circle', 'Puffball should be circle');
  assert(getTowerBodyShape(TowerType.OrchidTrap) === 'hexagon', 'Orchid should be hexagon');
  assert(getTowerBodyShape(TowerType.VenusFlytower) === 'diamond', 'Venus should be diamond');
  assert(getTowerBodyShape(TowerType.BioluminescentShroom) === 'circle', 'Bio should be circle');
  assert(getTowerBodyShape(TowerType.StinkhornLine) === 'star', 'Stinkhorn should be star');
});

runTest('getTowerRenderData returns complete render data for tower', () => {
  const renderData = getTowerRenderData(testTower);
  
  assert(renderData.id === 1, 'id should be 1');
  assert(renderData.towerType === TowerType.PuffballFungus, 'towerType should be PuffballFungus');
  assert(renderData.position.x === 100 && renderData.position.y === 200, 'position should be (100, 200)');
  assert(renderData.primaryColor === '#5d356d', 'primaryColor should be darkened for Sprout stage');
  assert(renderData.secondaryColor === '#472256', 'secondaryColor should be darkened for Sprout');
  assert(renderData.glowColor === '#564b5a', 'glowColor should be darkened for Sprout');
  assert(renderData.baseRadius === 9, 'baseRadius should be 9 for Sprout stage');
  assert(renderData.bodyRadius === 5.6000000000000005, 'bodyRadius should be 5.6 for Sprout stage');
  assert(renderData.rangeRadius === 80, 'rangeRadius should be 80');
  assert(renderData.targetingMode === TargetingMode.First, 'targetingMode should be First');
  assert(renderData.specialEffect === 'area_damage', 'specialEffect should be area_damage');
  assert(renderData.growthStage === TowerGrowthStage.Sprout, 'growthStage should be Sprout');
  assert(renderData.growthProgress === 0, 'growthProgress should be 0');
});

runTest('getTowerRenderData applies options correctly', () => {
  const renderData = getTowerRenderData(testTower, {
    showRange: true,
    isSelected: true,
    isFiring: true,
    cooldownProgress: 0.5,
    upgradeLevel: 2,
    totalUpgradeValue: 150,
  });

  assert(renderData.showRange === true, 'showRange should be true');
  assert(renderData.isSelected === true, 'isSelected should be true');
  assert(renderData.isFiring === true, 'isFiring should be true');
  assert(renderData.cooldownProgress === 0.5, 'cooldownProgress should be 0.5');
  assert(renderData.upgradeLevel === 2, 'upgradeLevel should be 2');
  assert(renderData.totalUpgradeValue === 150, 'totalUpgradeValue should be 150');
});

runTest('getTowerRenderData uses default values when options not provided', () => {
  const renderData = getTowerRenderData(testTower);
  
  assert(renderData.showRange === false, 'showRange default should be false');
  assert(renderData.isSelected === false, 'isSelected default should be false');
  assert(renderData.isFiring === false, 'isFiring default should be false');
  assert(renderData.cooldownProgress === 0, 'cooldownProgress default should be 0');
  assert(renderData.upgradeLevel === 0, 'upgradeLevel default should be 0');
  assert(renderData.totalUpgradeValue === 0, 'totalUpgradeValue default should be 0');
});

runTest('getTowersRenderData returns render data for all towers', () => {
  const towers = [
    createTower(1, 100, 200, TowerType.PuffballFungus, TargetingMode.First),
    createTower(2, 150, 250, TowerType.OrchidTrap, TargetingMode.Last),
    createTower(3, 200, 300, TowerType.VenusFlytower, TargetingMode.Close),
  ];
  
  const collection = getTowersRenderData(towers);
  
  assert(collection.totalCount === 3, 'totalCount should be 3');
  assert(collection.towers.length === 3, 'towers array should have 3 elements');
  assert(collection.selectedTower === null, 'selectedTower should be null');
});

runTest('getTowersRenderData identifies selected tower', () => {
  const towers = [
    createTower(1, 100, 200, TowerType.PuffballFungus, TargetingMode.First),
    createTower(2, 150, 250, TowerType.OrchidTrap, TargetingMode.Last),
  ];
  
  const collection = getTowersRenderData(towers, {
    selectedTowerId: 2,
    showRangeForSelected: true,
  });

  assert(collection.selectedTower !== null, 'selectedTower should not be null');
  assert(collection.selectedTower!.id === 2, 'selectedTower id should be 2');
  assert(collection.selectedTower!.showRange === true, 'showRange should be true for selected');
});

runTest('getTowersRenderData marks firing towers', () => {
  const towers = [
    createTower(1, 100, 200, TowerType.PuffballFungus, TargetingMode.First),
    createTower(2, 150, 250, TowerType.OrchidTrap, TargetingMode.Last),
    createTower(3, 200, 300, TowerType.VenusFlytower, TargetingMode.Close),
  ];
  
  const firingIds = new Set<number>([1, 3]);
  const collection = getTowersRenderData(towers, { firingTowerIds: firingIds });

  const tower1 = collection.towers.find(t => t.id === 1)!;
  const tower2 = collection.towers.find(t => t.id === 2)!;
  const tower3 = collection.towers.find(t => t.id === 3)!;

  assert(tower1.isFiring === true, 'tower1 should be firing');
  assert(tower2.isFiring === false, 'tower2 should not be firing');
  assert(tower3.isFiring === true, 'tower3 should be firing');
});

runTest('getTowersRenderData applies cooldown progress map', () => {
  const towers = [
    createTower(1, 100, 200, TowerType.PuffballFungus, TargetingMode.First),
    createTower(2, 150, 250, TowerType.OrchidTrap, TargetingMode.Last),
    createTower(3, 200, 300, TowerType.VenusFlytower, TargetingMode.Close),
  ];
  
  const cooldownMap = new Map<number, number>([[1, 0.8], [2, 0.3], [3, 1.0]]);
  const collection = getTowersRenderData(towers, { cooldownProgressMap: cooldownMap });

  assert(collection.towers.find(t => t.id === 1)!.cooldownProgress === 0.8, 'tower1 cooldown should be 0.8');
  assert(collection.towers.find(t => t.id === 2)!.cooldownProgress === 0.3, 'tower2 cooldown should be 0.3');
  assert(collection.towers.find(t => t.id === 3)!.cooldownProgress === 1.0, 'tower3 cooldown should be 1.0');
});

runTest('getTowersRenderData applies upgrade maps', () => {
  const towers = [
    createTower(1, 100, 200, TowerType.PuffballFungus, TargetingMode.First),
    createTower(2, 150, 250, TowerType.OrchidTrap, TargetingMode.Last),
    createTower(3, 200, 300, TowerType.VenusFlytower, TargetingMode.Close),
  ];
  
  const upgradeLevelMap = new Map<number, number>([[1, 3], [2, 1], [3, 6]]);
  const totalUpgradeValueMap = new Map<number, number>([[1, 200], [2, 50], [3, 450]]);
  
  const collection = getTowersRenderData(towers, {
    upgradeLevelMap,
    totalUpgradeValueMap,
  });

  assert(collection.towers.find(t => t.id === 1)!.upgradeLevel === 3, 'tower1 upgradeLevel should be 3');
  assert(collection.towers.find(t => t.id === 1)!.totalUpgradeValue === 200, 'tower1 totalUpgradeValue should be 200');
  assert(collection.towers.find(t => t.id === 3)!.upgradeLevel === 6, 'tower3 upgradeLevel should be 6');
});

runTest('getAnimationState returns animation data for Idle state', () => {
  const anim = getAnimationState(TowerType.PuffballFungus, TowerAnimationState.Idle, 1000);
  assert(anim.scale > 0.9 && anim.scale <= 1.02, 'scale should be between 0.9 and 1.02');
  assert(anim.rotation === 0, 'rotation should be 0 for Idle');
  assert(anim.glowIntensity > 0.2, 'glowIntensity should be greater than 0.2');
});

runTest('getAnimationState returns animation data for Firing state', () => {
  const anim = getAnimationState(TowerType.PuffballFungus, TowerAnimationState.Firing, 1000);
  assert(anim.scale > 1.0, 'scale should be greater than 1.0 for Firing');
  assert(anim.glowIntensity === 0.8, 'glowIntensity should be 0.8 for Firing');
});

runTest('getAnimationState returns animation data for Targeting state', () => {
  const anim = getAnimationState(TowerType.PuffballFungus, TowerAnimationState.Targeting, 1000);
  assert(anim.scale === 1.05, 'scale should be 1.05 for Targeting');
  assert(anim.rotation !== 0, 'rotation should not be 0 for Targeting');
});

runTest('getAnimationState returns animation data for Cooldown state', () => {
  const anim = getAnimationState(TowerType.PuffballFungus, TowerAnimationState.Cooldown, 1000);
  assert(anim.scale < 1.05, 'scale should be less than 1.05 for Cooldown');
});

runTest('getAnimationState returns animation data for Selected state', () => {
  const anim = getAnimationState(TowerType.PuffballFungus, TowerAnimationState.Selected, 1000);
  assert(anim.scale === 1.08, 'scale should be 1.08 for Selected');
  assert(anim.glowIntensity >= 0.4, 'glowIntensity should be at least 0.4 for Selected');
});

runTest('getAnimationState returns animation data for UpgradeGlow state', () => {
  const anim = getAnimationState(TowerType.PuffballFungus, TowerAnimationState.UpgradeGlow, 1000);
  assert(anim.scale === 1.1, 'scale should be 1.1 for UpgradeGlow');
  assert(anim.glowIntensity === 0.9, 'glowIntensity should be 0.9 for UpgradeGlow');
});

runTest('getAnimationState varies by tower type animation speed', () => {
  const venusAnim = getAnimationState(TowerType.VenusFlytower, TowerAnimationState.Idle, 1000);
  const bioAnim = getAnimationState(TowerType.BioluminescentShroom, TowerAnimationState.Idle, 1000);
  assert(venusAnim.scale !== bioAnim.scale, 'animations should differ by tower type');
});

runTest('getTowerAnimationState returns Firing when isFiring is true', () => {
  const state = getTowerAnimationState(testTower, true, false, 0.5, 0);
  assert(state === TowerAnimationState.Firing, 'state should be Firing');
});

runTest('getTowerAnimationState returns Selected when isSelected is true', () => {
  const state = getTowerAnimationState(testTower, false, true, 1.0, 0);
  assert(state === TowerAnimationState.Selected, 'state should be Selected');
});

runTest('getTowerAnimationState returns Cooldown when cooldownProgress < 1.0', () => {
  const state = getTowerAnimationState(testTower, false, false, 0.5, 0);
  assert(state === TowerAnimationState.Cooldown, 'state should be Cooldown');
});

runTest('getTowerAnimationState returns Idle otherwise', () => {
  const state = getTowerAnimationState(testTower, false, false, 1.0, 0);
  assert(state === TowerAnimationState.Idle, 'state should be Idle');
});

runTest('getAnimatedTowerRenderData combines base render data with animation', () => {
  const renderData = getAnimatedTowerRenderData(testTower, 1000, {
    isFiring: true,
    cooldownProgress: 1.0,
  });

  assert(renderData.id === 1, 'id should be 1');
  assert(renderData.towerType === TowerType.PuffballFungus, 'towerType should be PuffballFungus');
  assert(renderData.scale > 1.0, 'scale should be greater than 1.0 for firing');
  assert(renderData.isFiring === true, 'isFiring should be true');
});

runTest('getTargetingModeIndicatorColor returns correct colors for each targeting mode', () => {
  assert(getTargetingModeIndicatorColor(TargetingMode.First) === '#E74C3C', 'First should be red');
  assert(getTargetingModeIndicatorColor(TargetingMode.Last) === '#3498DB', 'Last should be blue');
  assert(getTargetingModeIndicatorColor(TargetingMode.Close) === '#F39C12', 'Close should be orange');
  assert(getTargetingModeIndicatorColor(TargetingMode.Strong) === '#9B59B6', 'Strong should be purple');
});

runTest('getTowerFacingAngle calculates correct angle to target', () => {
  const angle = getTowerFacingAngle(testTower, { x: 200, y: 200 });
  assert(angle === 0, 'angle to right should be 0');
});

runTest('getTowerBaseDecorations returns circle decorations for PuffballFungus', () => {
  const decorations = getTowerBaseDecorations(TowerType.PuffballFungus);
  assert(decorations.length === 1, 'should have 1 decoration');
  assert(decorations[0].type === 'ring', 'type should be ring');
});

runTest('getTowerBaseDecorations returns hexagon decorations for OrchidTrap', () => {
  const decorations = getTowerBaseDecorations(TowerType.OrchidTrap);
  assert(decorations.length === 1, 'should have 1 decoration');
  assert(decorations[0].type === 'dots', 'type should be dots');
  assert(decorations[0].count === 6, 'count should be 6');
});

runTest('getTowerBaseDecorations returns diamond decorations for VenusFlytower', () => {
  const decorations = getTowerBaseDecorations(TowerType.VenusFlytower);
  assert(decorations.length === 2, 'should have 2 decorations');
  assert(decorations[0].type === 'ring', 'first type should be ring');
  assert(decorations[1].type === 'circle', 'second type should be circle');
});

runTest('getTowerBaseDecorations returns star decorations for StinkhornLine', () => {
  const decorations = getTowerBaseDecorations(TowerType.StinkhornLine);
  assert(decorations.length === 1, 'should have 1 decoration');
  assert(decorations[0].type === 'dots', 'type should be dots');
  assert(decorations[0].count === 5, 'count should be 5');
});

runTest('getUpgradeTierVisuals returns 3 upgrade tiers', () => {
  const tiers = getUpgradeTierVisuals(TowerType.PuffballFungus);
  assert(tiers.length === 3, 'should have 3 tiers');
  
  assertEqual(tiers[0], { tier: 1, color: '#3498DB', ringRadius: 22, symbol: 'I' }, 'tier 1');
  assertEqual(tiers[1], { tier: 2, color: '#9B59B6', ringRadius: 24, symbol: 'II' }, 'tier 2');
  assertEqual(tiers[2], { tier: 3, color: '#E74C3C', ringRadius: 26, symbol: 'III' }, 'tier 3');
});

runTest('getUpgradeIndicatorForTower returns null for upgradeLevel 0', () => {
  const indicator = getUpgradeIndicatorForTower(TowerType.PuffballFungus, 0);
  assert(indicator === null, 'indicator should be null for 0 upgrade level');
});

runTest('getUpgradeIndicatorForTower returns first tier for upgradeLevel 1', () => {
  const indicator = getUpgradeIndicatorForTower(TowerType.PuffballFungus, 1);
  assert(indicator !== null, 'indicator should not be null');
  assert(indicator!.tier === 1, 'tier should be 1');
});

runTest('getUpgradeIndicatorForTower returns second tier for upgradeLevel 2', () => {
  const indicator = getUpgradeIndicatorForTower(TowerType.PuffballFungus, 2);
  assert(indicator !== null, 'indicator should not be null');
  assert(indicator!.tier === 2, 'tier should be 2');
});

runTest('getUpgradeIndicatorForTower caps at third tier for high upgrade levels', () => {
  const indicator = getUpgradeIndicatorForTower(TowerType.PuffballFungus, 10);
  assert(indicator !== null, 'indicator should not be null');
  assert(indicator!.tier === 3, 'tier should be capped at 3');
});

runTest('getTowerPlacementGhostData returns valid placement ghost data', () => {
  const ghost = getTowerPlacementGhostData(
    TowerType.PuffballFungus,
    { x: 150, y: 200 },
    80,
    true
  );

  assert(ghost.towerType === TowerType.PuffballFungus, 'towerType should be PuffballFungus');
  assert(ghost.position.x === 150 && ghost.position.y === 200, 'position should be (150, 200)');
  assert(ghost.isValid === true, 'isValid should be true');
  assert(ghost.rangeRadius === 80, 'rangeRadius should be 80');
  assert(ghost.opacity === 0.7, 'opacity should be 0.7');
  assert(ghost.primaryColor === '#9B59B6', 'primaryColor should be #9B59B6');
});

runTest('getTowerPlacementGhostData includes invalid reason when invalid', () => {
  const ghost = getTowerPlacementGhostData(
    TowerType.OrchidTrap,
    { x: 150, y: 200 },
    100,
    false,
    'Too close to path'
  );

  assert(ghost.isValid === false, 'isValid should be false');
  assert(ghost.invalidReason === 'Too close to path', 'invalidReason should be set');
});

runTest('getTowerPlacementGhostData uses custom opacity', () => {
  const ghost = getTowerPlacementGhostData(
    TowerType.VenusFlytower,
    { x: 150, y: 200 },
    50,
    true,
    undefined,
    0.5
  );
  assert(ghost.opacity === 0.5, 'opacity should be 0.5');
});

runTest('getUpgradePathIndicators returns 4 upgrade paths', () => {
  const indicators = getUpgradePathIndicators(0);
  assert(indicators.length === 4, 'should have 4 upgrade paths');
  
  assert(indicators.find(i => i.path === 'damage') !== undefined, 'should have damage path');
  assert(indicators.find(i => i.path === 'range') !== undefined, 'should have range path');
  assert(indicators.find(i => i.path === 'fireRate') !== undefined, 'should have fireRate path');
  assert(indicators.find(i => i.path === 'special') !== undefined, 'should have special path');
});

runTest('getUpgradePathIndicators correctly distributes 3 tiers across paths', () => {
  const indicators = getUpgradePathIndicators(3);
  
  const damage = indicators.find(i => i.path === 'damage')!;
  const range = indicators.find(i => i.path === 'range')!;
  const fireRate = indicators.find(i => i.path === 'fireRate')!;
  const special = indicators.find(i => i.path === 'special')!;

  assert(damage.currentTier === 1, 'damage should have 1 tier');
  assert(range.currentTier === 1, 'range should have 1 tier');
  assert(fireRate.currentTier === 1, 'fireRate should have 1 tier');
  assert(special.currentTier === 0, 'special should have 0 tiers');
});

runTest('getUpgradePathIndicators handles higher upgrade levels', () => {
  const indicators = getUpgradePathIndicators(6);
  
  const damage = indicators.find(i => i.path === 'damage')!;
  const range = indicators.find(i => i.path === 'range')!;
  const fireRate = indicators.find(i => i.path === 'fireRate')!;
  const special = indicators.find(i => i.path === 'special')!;

  assert(damage.currentTier === 2, 'damage should have 2 tiers');
  assert(range.currentTier === 2, 'range should have 2 tiers');
  assert(fireRate.currentTier === 2, 'fireRate should have 2 tiers');
  assert(special.currentTier === 0, 'special should have 0 tiers');
});

runTest('getUpgradePathIndicators marks maxed paths correctly', () => {
  const indicators3 = getUpgradePathIndicators(9);
  const mainPaths = indicators3.filter(i => i.path !== 'special');
  mainPaths.forEach(ind => {
    assert(ind.isMaxed === true, `${ind.path} should be maxed`);
  });
  const special = indicators3.find(i => i.path === 'special')!;
  assert(special.isMaxed === false, 'special should not be maxed (follows separate upgrade path)');
});

runTest('getUpgradePathIndicators has correct colors', () => {
  const indicators = getUpgradePathIndicators(0);
  
  assert(indicators.find(i => i.path === 'damage')!.color === '#E74C3C', 'damage color should be #E74C3C');
  assert(indicators.find(i => i.path === 'range')!.color === '#3498DB', 'range color should be #3498DB');
  assert(indicators.find(i => i.path === 'fireRate')!.color === '#F39C12', 'fireRate color should be #F39C12');
  assert(indicators.find(i => i.path === 'special')!.color === '#9B59B6', 'special color should be #9B59B6');
});

console.log(`\nTests passed: ${testsPassed}/${testsPassed + testsFailed}`);
if (testsFailed > 0) {
  console.log(`Tests failed: ${testsFailed}`);
  process.exit(1);
}

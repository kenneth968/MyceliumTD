import { 
  MapInfo, 
  MapDifficulty, 
  MapTheme, 
  MAPS, 
  getMapById, 
  getMapsByDifficulty, 
  getMapsByTheme,
  getAvailableMaps,
  getMapDifficultyLabel,
  getMapThemeLabel,
  getMapThemeColor,
  getDifficultyColor,
  getLevelSelectRenderData,
  getMapAtPosition,
  createDefaultMapSelectionState,
  LevelSelectRenderData,
  GameMapSelectionState,
} from './mapLevel';
import { Path } from './path';
import { TowerType } from '../entities/tower';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string): void {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}. Expected ${expected}, got ${actual}`);
  }
}

function assertDefined<T>(value: T | undefined, message: string): asserts value is T {
  if (value === undefined) {
    throw new Error(`Assertion failed: ${message}. Value is undefined`);
  }
}

// Test MAPS array
console.log('Testing MAPS array...');
assert(MAPS.length > 0, 'MAPS should not be empty');
assertEqual(MAPS.length, 6, 'Should have 6 maps defined');

// Test each map has required properties
console.log('Testing map properties...');
for (const map of MAPS) {
  assert(map.id.length > 0, `Map ${map.id} should have an id`);
  assert(map.name.length > 0, `Map ${map.id} should have a name`);
  assert(map.pathPoints.length >= 4, `Map ${map.id} should have at least 2 path points`);
  assert(map.availableTowers.length > 0, `Map ${map.id} should have available towers`);
  assert(map.maxWaves > 0, `Map ${map.id} should have positive maxWaves`);
  assert(map.totalLength > 0, `Map ${map.id} should have positive totalLength`);
}

// Test getMapById
console.log('Testing getMapById...');
const gardenPath = getMapById('garden_path');
assertDefined(gardenPath, 'garden_path should exist');
assertEqual(gardenPath.name, 'Garden Path', 'garden_path should have correct name');
assertEqual(gardenPath.difficulty, MapDifficulty.Easy, 'garden_path should be Easy difficulty');

const nonexistent = getMapById('nonexistent');
assertEqual(nonexistent, undefined, 'nonexistent map should return undefined');

// Test getMapsByDifficulty
console.log('Testing getMapsByDifficulty...');
const easyMaps = getMapsByDifficulty(MapDifficulty.Easy);
assertEqual(easyMaps.length, 2, 'Should have 2 Easy maps');

const mediumMaps = getMapsByDifficulty(MapDifficulty.Medium);
assertEqual(mediumMaps.length, 2, 'Should have 2 Medium maps');

const hardMaps = getMapsByDifficulty(MapDifficulty.Hard);
assertEqual(hardMaps.length, 1, 'Should have 1 Hard map');

const expertMaps = getMapsByDifficulty(MapDifficulty.Expert);
assertEqual(expertMaps.length, 1, 'Should have 1 Expert map');

// Test getMapsByTheme
console.log('Testing getMapsByTheme...');
const gardenMaps = getMapsByTheme(MapTheme.Garden);
assertEqual(gardenMaps.length, 1, 'Should have 1 Garden map');

const mountainMaps = getMapsByTheme(MapTheme.Mountain);
assertEqual(mountainMaps.length, 2, 'Should have 2 Mountain maps (hard + expert)');

// Test getAvailableMaps
console.log('Testing getAvailableMaps...');
const availableMaps = getAvailableMaps();
assertEqual(availableMaps.length, 6, 'All 6 maps should be available (none locked)');

// Test difficulty labels
console.log('Testing difficulty labels...');
assertEqual(getMapDifficultyLabel(MapDifficulty.Easy), 'Easy', 'Easy label incorrect');
assertEqual(getMapDifficultyLabel(MapDifficulty.Medium), 'Medium', 'Medium label incorrect');
assertEqual(getMapDifficultyLabel(MapDifficulty.Hard), 'Hard', 'Hard label incorrect');
assertEqual(getMapDifficultyLabel(MapDifficulty.Expert), 'Expert', 'Expert label incorrect');

// Test theme labels
console.log('Testing theme labels...');
assertEqual(getMapThemeLabel(MapTheme.Forest), 'Forest', 'Forest label incorrect');
assertEqual(getMapThemeLabel(MapTheme.Cave), 'Cave', 'Cave label incorrect');
assertEqual(getMapThemeLabel(MapTheme.Garden), 'Garden', 'Garden label incorrect');
assertEqual(getMapThemeLabel(MapTheme.Swamp), 'Swamp', 'Swamp label incorrect');
assertEqual(getMapThemeLabel(MapTheme.Mountain), 'Mountain', 'Mountain label incorrect');

// Test theme colors
console.log('Testing theme colors...');
const forestColor = getMapThemeColor(MapTheme.Forest);
assert(forestColor === '#228B22', 'Forest color should be #228B22');

const caveColor = getMapThemeColor(MapTheme.Cave);
assert(caveColor === '#4A4A4A', 'Cave color should be #4A4A4A');

// Test difficulty colors
console.log('Testing difficulty colors...');
const easyColor = getDifficultyColor(MapDifficulty.Easy);
assert(easyColor === '#32CD32', 'Easy color should be #32CD32');

const expertColor = getDifficultyColor(MapDifficulty.Expert);
assert(expertColor === '#DC143C', 'Expert color should be #DC143C');

// Test path functionality on a map
console.log('Testing map path functionality...');
const testMap = getMapById('garden_path')!;
assert(testMap.path instanceof Path, 'Map path should be a Path instance');
assertEqual(testMap.getTotalLength(), testMap.totalLength, 'getTotalLength should match');

const firstPoint = testMap.getPointAtDistance(0);
assert(firstPoint.position.x === testMap.pathPoints[0].x, 'First point x should match');
assert(firstPoint.position.y === testMap.pathPoints[0].y, 'First point y should match');

const midPoint = testMap.getPointAtRatio(0.5);
assert(midPoint.position.x >= 0, 'Mid point x should be valid');
assert(midPoint.position.y >= 0, 'Mid point y should be valid');

const lastPoint = testMap.getPointAtDistance(testMap.getTotalLength());
assert(lastPoint.position.x === testMap.pathPoints[testMap.pathPoints.length - 1].x, 'Last point x should match');
assert(lastPoint.position.y === testMap.pathPoints[testMap.pathPoints.length - 1].y, 'Last point y should match');

// Test getLevelSelectRenderData
console.log('Testing getLevelSelectRenderData...');
const renderData = getLevelSelectRenderData(null, null, 1280, 720);
assertEqual(renderData.maps.length, 6, 'Should have 6 maps in render data');
assertEqual(renderData.selectedMapId, null, 'SelectedMapId should be null initially');
assertEqual(renderData.hoveredMapId, null, 'HoveredMapId should be null initially');
assertEqual(renderData.buttons.length, 6, 'Should have 6 buttons');

const gardenRenderData = renderData.maps.find(m => m.id === 'garden_path');
assertDefined(gardenRenderData, 'garden_path should be in render data');
assertEqual(gardenRenderData.difficultyLabel, 'Easy', 'garden_path difficulty label should be Easy');
assertEqual(gardenRenderData.difficultyColor, '#32CD32', 'garden_path difficulty color should be green');

// Test getMapAtPosition
console.log('Testing getMapAtPosition...');
const firstButton = renderData.buttons[0];
const mapIdAtButton = getMapAtPosition(
  firstButton.position.x + 10,
  firstButton.position.y + 10,
  renderData
);
assertEqual(mapIdAtButton, firstButton.mapId, 'Should detect map at button position');

const mapIdOutside = getMapAtPosition(0, 0, renderData);
assertEqual(mapIdOutside, null, 'Should return null outside any map button');

// Test with selected and hovered
console.log('Testing with selected and hovered...');
const renderDataWithSelection = getLevelSelectRenderData('garden_path', 'forest_loop', 1280, 720);
assertEqual(renderDataWithSelection.selectedMapId, 'garden_path', 'SelectedMapId should be garden_path');
assertEqual(renderDataWithSelection.hoveredMapId, 'forest_loop', 'HoveredMapId should be forest_loop');

// Test map modifiers
console.log('Testing map modifiers...');
const caveMap = getMapById('cave蜿蜒');
assertDefined(caveMap, 'cave蜿蜒 should exist');
assertEqual(caveMap.startingMoneyModifier, 0.9, 'Cave map should have 0.9 money modifier');
assertEqual(caveMap.startingLivesModifier, 0.8, 'Cave map should have 0.8 lives modifier');
assertEqual(caveMap.maxWaves, 15, 'Cave map should have 15 max waves');

// Test available towers per map
console.log('Testing available towers per map...');
const gardenTowers = getMapById('garden_path')!.availableTowers;
assert(gardenTowers.includes(TowerType.PuffballFungus), 'Garden should have PuffballFungus');
assert(gardenTowers.includes(TowerType.OrchidTrap), 'Garden should have OrchidTrap');
assert(gardenTowers.includes(TowerType.BioluminescentShroom), 'Garden should have BioluminescentShroom');
assert(!gardenTowers.includes(TowerType.VenusFlytower), 'Garden should NOT have VenusFlytower');

const expertTowers = getMapById('expert_zigzag')!.availableTowers;
assertEqual(expertTowers.length, 5, 'Expert map should have all 5 tower types');

// Test createDefaultMapSelectionState
console.log('Testing createDefaultMapSelectionState...');
const defaultState = createDefaultMapSelectionState();
assertEqual(defaultState.selectedMapId, null, 'Default state should have null selectedMapId');
assertEqual(defaultState.hoveredMapId, null, 'Default state should have null hoveredMapId');
assertEqual(defaultState.isSelecting, false, 'Default state should have isSelecting false');

// Test that all maps have valid path lengths
console.log('Testing all map path lengths...');
for (const map of MAPS) {
  const pathPoints = map.getPoints();
  assert(pathPoints.length >= 2, `Map ${map.id} should have at least 2 path points`);
  
  let calculatedLength = 0;
  for (let i = 0; i < pathPoints.length - 1; i++) {
    const dx = pathPoints[i + 1].x - pathPoints[i].x;
    const dy = pathPoints[i + 1].y - pathPoints[i].y;
    calculatedLength += Math.sqrt(dx * dx + dy * dy);
  }
  
  assert(
    Math.abs(calculatedLength - map.getTotalLength()) < 0.01,
    `Map ${map.id} total length mismatch`
  );
}

// Test map selection state transitions
console.log('Testing map selection state...');
let state = createDefaultMapSelectionState();
state.selectedMapId = 'garden_path';
assertEqual(state.selectedMapId, 'garden_path', 'Should be able to set selectedMapId');
state.hoveredMapId = 'forest_loop';
assertEqual(state.hoveredMapId, 'forest_loop', 'Should be able to set hoveredMapId');
state.isSelecting = true;
assertEqual(state.isSelecting, true, 'Should be able to set isSelecting');

// Test edge case: getMapAtPosition with invalid coordinates
console.log('Testing edge cases...');
const negativeRenderData = getLevelSelectRenderData(null, null, 1280, 720);
const mapIdNegative = getMapAtPosition(-100, -100, negativeRenderData);
assertEqual(mapIdNegative, null, 'Should return null for negative coordinates');

const mapIdLarge = getMapAtPosition(9999, 9999, negativeRenderData);
assertEqual(mapIdLarge, null, 'Should return null for coordinates outside viewport');

// Test that expert map has hardest modifiers
console.log('Testing expert map has hardest modifiers...');
const expertMap = getMapById('expert_zigzag');
assertDefined(expertMap, 'expert_zigzag should exist');
assert(expertMap.startingMoneyModifier <= 0.75, 'Expert map should have lowest money modifier');
assert(expertMap.startingLivesModifier <= 0.6, 'Expert map should have lowest lives modifier');
assert(expertMap.maxWaves >= 20, 'Expert map should have most waves');

console.log('\n=== ALL 46 TESTS PASSED ===\n');
console.log('Summary:');
console.log('- MAPS array has correct 6 maps');
console.log('- All maps have required properties');
console.log('- getMapById works correctly');
console.log('- getMapsByDifficulty filters correctly');
console.log('- getMapsByTheme filters correctly');
console.log('- getAvailableMaps returns all unlocked maps');
console.log('- Labels and colors for difficulty/theme are correct');
console.log('- Map path functionality works');
console.log('- Level select render data generation works');
console.log('- Map selection state works');
console.log('- Edge cases handled correctly');
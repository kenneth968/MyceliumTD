import { createTowerPlacer, TowerPlacer, PlacementMode } from './systems/input';
import { PlacedTower, createGameRunner } from './systems/gameRunner';
import { TowerType } from './entities/tower';

function createMockPlacedTowers(): PlacedTower[] {
  const game = createGameRunner();
  game.start();
  return [
    { tower: game.placeTower(TowerType.PuffballFungus, 100, 200)!, x: 100, y: 200 },
    { tower: game.placeTower(TowerType.OrchidTrap, 300, 400)!, x: 300, y: 400 },
  ];
}

console.log('=== Testing TowerPlacer ===');

const mockTowers = createMockPlacedTowers();
const game = createGameRunner();
const placer = createTowerPlacer({
  path: game.getPath(),
  placedTowers: mockTowers,
});

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean): void {
  try {
    const result = fn();
    if (result) {
      console.log(`PASS: ${name}`);
      passed++;
    } else {
      console.log(`FAIL: ${name}`);
      failed++;
    }
  } catch (e) {
    console.log(`FAIL: ${name} - ${e}`);
    failed++;
  }
}

test('initial mode is None', () => {
  return placer.getMode() === PlacementMode.None;
});

test('initial selected tower type is null', () => {
  return placer.getSelectedTowerType() === null;
});

test('startPlacement sets mode to Placing', () => {
  placer.startPlacement(TowerType.PuffballFungus);
  return placer.getMode() === PlacementMode.Placing;
});

test('startPlacement sets selected tower type', () => {
  return placer.getSelectedTowerType() === TowerType.PuffballFungus;
});

test('cancelPlacement resets mode to None', () => {
  placer.cancelPlacement();
  return placer.getMode() === PlacementMode.None;
});

test('cancelPlacement clears selected tower type', () => {
  return placer.getSelectedTowerType() === null;
});

test('updatePlacementPosition sets position in Placing mode', () => {
  placer.startPlacement(TowerType.OrchidTrap);
  placer.updatePlacementPosition(250, 150);
  const pos = placer.getPlacementPosition();
  placer.cancelPlacement();
  return pos !== null && pos.x === 250 && pos.y === 150;
});

test('updatePlacementPosition does nothing in None mode', () => {
  placer.startPlacement(TowerType.OrchidTrap);
  placer.updatePlacementPosition(250, 150);
  placer.cancelPlacement();
  return placer.getPlacementPosition() === null;
});

test('validatePlacement accepts valid position', () => {
  const result = placer.validatePlacement(500, 50, TowerType.PuffballFungus);
  return result.canPlace === true;
});

test('confirmPlacement returns tower type when placement is valid', () => {
  placer.startPlacement(TowerType.PuffballFungus);
  placer.updatePlacementPosition(500, 50);
  const result = placer.confirmPlacement();
  return result === TowerType.PuffballFungus;
});

test('validatePlacement rejects position too close to path', () => {
  const result = placer.validatePlacement(200, 300, TowerType.PuffballFungus);
  return result.canPlace === false && result.reason === 'Too close to path';
});

test('validatePlacement rejects position too close to another tower', () => {
  const result = placer.validatePlacement(110, 200, TowerType.PuffballFungus);
  return result.canPlace === false && result.reason === 'Too close to another tower';
});

test('confirmPlacement returns tower type when placement is valid', () => {
  placer.startPlacement(TowerType.PuffballFungus);
  placer.updatePlacementPosition(500, 50);
  const result = placer.confirmPlacement();
  return result === TowerType.PuffballFungus;
});

test('startPlacement returns false if already placing', () => {
  placer.startPlacement(TowerType.PuffballFungus);
  const result = placer.startPlacement(TowerType.OrchidTrap);
  placer.cancelPlacement();
  return result === false;
});

test('selectTower returns false if no tower found', () => {
  return placer.selectTower(9999) === false;
});

test('selectTower returns true and enters Selecting mode', () => {
  const result = placer.selectTower(mockTowers[0].tower.id);
  return result === true && placer.isSelecting();
});

test('deselectTower exits Selecting mode', () => {
  placer.deselectTower();
  return placer.getMode() === PlacementMode.None;
});

test('getRangeForSelectedTower returns correct range', () => {
  placer.startPlacement(TowerType.VenusFlytower);
  const range = placer.getRangeForSelectedTower();
  placer.cancelPlacement();
  return range === 50;
});

test('getRangePreview returns null when not placing', () => {
  return placer.getRangePreview() === null;
});

test('getRangePreview returns null without position', () => {
  placer.startPlacement(TowerType.PuffballFungus);
  const preview = placer.getRangePreview();
  placer.cancelPlacement();
  return preview === null;
});

test('getRangePreview returns correct data during placement', () => {
  placer.startPlacement(TowerType.PuffballFungus);
  placer.updatePlacementPosition(500, 50);
  const preview = placer.getRangePreview();
  placer.cancelPlacement();
  return preview !== null && preview.position.x === 500 && preview.position.y === 50 && preview.radius === 80;
});

test('getRangePreview isValid for valid placement', () => {
  placer.startPlacement(TowerType.PuffballFungus);
  placer.updatePlacementPosition(500, 50);
  const preview = placer.getRangePreview();
  placer.cancelPlacement();
  return preview !== null && preview.isValid === true;
});

test('getRangePreview isInvalid for invalid placement', () => {
  placer.startPlacement(TowerType.PuffballFungus);
  placer.updatePlacementPosition(200, 300);
  const preview = placer.getRangePreview();
  placer.cancelPlacement();
  return preview !== null && preview.isValid === false;
});

test('getRangePreview uses tower-specific range', () => {
  placer.startPlacement(TowerType.VenusFlytower);
  placer.updatePlacementPosition(500, 50);
  const preview = placer.getRangePreview();
  placer.cancelPlacement();
  return preview !== null && preview.radius === 50;
});

test('confirmPlacement returns null when not placing', () => {
  return placer.confirmPlacement() === null;
});

test('getPlacementPosition returns null when not placing', () => {
  return placer.getPlacementPosition() === null;
});

test('isPlacing returns true during placement', () => {
  placer.startPlacement(TowerType.BioluminescentShroom);
  const result = placer.isPlacing();
  placer.cancelPlacement();
  return result === true;
});

test('isSelecting returns false after cancel', () => {
  placer.startPlacement(TowerType.StinkhornLine);
  placer.cancelPlacement();
  return placer.isSelecting() === false;
});

test('getPathPreview returns null when not placing', () => {
  return placer.getPathPreview() === null;
});

test('getPathPreview returns null without position', () => {
  placer.startPlacement(TowerType.PuffballFungus);
  const preview = placer.getPathPreview();
  placer.cancelPlacement();
  return preview === null;
});

test('getPathPreview returns correct segment count', () => {
  placer.startPlacement(TowerType.PuffballFungus);
  placer.updatePlacementPosition(500, 50);
  const preview = placer.getPathPreview();
  placer.cancelPlacement();
  return preview !== null && preview.segments.length === 7;
});

test('getPathPreview returns segments with correct structure', () => {
  placer.startPlacement(TowerType.PuffballFungus);
  placer.updatePlacementPosition(500, 50);
  const preview = placer.getPathPreview();
  placer.cancelPlacement();
  if (!preview || preview.segments.length === 0) return false;
  const seg = preview.segments[0];
  return seg.start !== undefined && seg.end !== undefined && 
         typeof seg.startDistance === 'number' && typeof seg.endDistance === 'number' &&
         typeof seg.isCovered === 'boolean';
});

test('getPathPreview has valid totalPathLength', () => {
  placer.startPlacement(TowerType.PuffballFungus);
  placer.updatePlacementPosition(500, 50);
  const preview = placer.getPathPreview();
  placer.cancelPlacement();
  return preview !== null && preview.totalPathLength > 0;
});

test('getPathPreview coveredLength is sum of covered segments', () => {
  placer.startPlacement(TowerType.PuffballFungus);
  placer.updatePlacementPosition(500, 50);
  const preview = placer.getPathPreview();
  placer.cancelPlacement();
  if (!preview) return false;
  let expectedCovered = 0;
  for (const seg of preview.segments) {
    if (seg.isCovered) {
      expectedCovered += seg.endDistance - seg.startDistance;
    }
  }
  return preview.coveredLength === expectedCovered;
});

test('getPathPreview marks segments within range as covered', () => {
  placer.startPlacement(TowerType.VenusFlytower);
  placer.updatePlacementPosition(200, 150);
  const preview = placer.getPathPreview();
  placer.cancelPlacement();
  if (!preview) return false;
  const coveredSegments = preview.segments.filter(s => s.isCovered);
  return coveredSegments.length > 0;
});

test('getPathPreview returns data during placement', () => {
  placer.startPlacement(TowerType.OrchidTrap);
  placer.updatePlacementPosition(450, 80);
  const preview = placer.getPathPreview();
  placer.cancelPlacement();
  return preview !== null && preview.segments.length > 0;
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
process.exit(failed > 0 ? 1 : 0);
import {
  getPlacementGhostRenderData,
  getRangeCircleRenderData,
  getPathCoverageRenderData,
  getPlacementPreviewRenderData,
  getTowerPlacementIndicator,
  getPathSegmentRenderStyle,
  getPlacementValidityDetails,
  createPlacementPreviewUpdater,
} from './placementPreview';
import { RangePreview, PathPreview, PlacementMode } from './input';
import { TowerType } from '../entities/tower';
import { Vec2 } from '../utils/vec2';

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

function createMockRangePreview(isValid: boolean, radius: number = 100, position: Vec2 = { x: 100, y: 100 }): RangePreview {
  return {
    position,
    radius,
    isValid,
  };
}

function createMockPathPreview(coveredLength: number, totalLength: number = 1000): PathPreview {
  const segments = [
    {
      start: { x: 0, y: 0 },
      end: { x: 200, y: 0 },
      startDistance: 0,
      endDistance: 200,
      isCovered: coveredLength >= 200,
    },
    {
      start: { x: 200, y: 0 },
      end: { x: 400, y: 100 },
      startDistance: 200,
      endDistance: 300,
      isCovered: coveredLength >= 300,
    },
    {
      start: { x: 400, y: 100 },
      end: { x: 600, y: 100 },
      startDistance: 300,
      endDistance: 500,
      isCovered: coveredLength >= 500,
    },
  ];

  return {
    segments,
    totalPathLength: totalLength,
    coveredLength,
  };
}

console.log('\n=== placementPreview tests ===\n');

console.log('--- getPlacementGhostRenderData ---');
{
  const position: Vec2 = { x: 100, y: 200 };
  const result = getPlacementGhostRenderData(position, TowerType.PuffballFungus, true);
  expect(result.position, position, 'returns correct position');
  expect(result.towerType, TowerType.PuffballFungus, 'returns correct tower type');
  expect(result.isValid, true, 'isValid is true when passed true');
  expect(result.range, 80, 'returns correct range from tower stats');
  expect(result.color, '#4CAF50', 'uses valid color');
  expect(result.glowColor, '#81C784', 'uses valid glow color');
  expect(result.size, 20, 'returns correct size for Puffball');
}

{
  const position: Vec2 = { x: 100, y: 200 };
  const result = getPlacementGhostRenderData(position, TowerType.VenusFlytower, false);
  expect(result.position, position, 'returns correct position for invalid');
  expect(result.towerType, TowerType.VenusFlytower, 'returns correct tower type for invalid');
  expect(result.isValid, false, 'isValid is false when passed false');
  expect(result.range, 50, 'returns correct range for Venus');
  expect(result.color, '#F44336', 'uses invalid color');
  expect(result.glowColor, '#EF5350', 'uses invalid glow color');
  expect(result.size, 24, 'returns correct size for Venus');
}

{
  const position: Vec2 = { x: 0, y: 0 };
  const puffball = getPlacementGhostRenderData(position, TowerType.PuffballFungus, true);
  const orchid = getPlacementGhostRenderData(position, TowerType.OrchidTrap, true);
  const venus = getPlacementGhostRenderData(position, TowerType.VenusFlytower, true);
  const bio = getPlacementGhostRenderData(position, TowerType.BioluminescentShroom, true);
  const stinkhorn = getPlacementGhostRenderData(position, TowerType.StinkhornLine, true);
  expect(puffball.size, 20, 'Puffball size');
  expect(orchid.size, 18, 'Orchid size');
  expect(venus.size, 24, 'Venus size');
  expect(bio.size, 16, 'Bio size');
  expect(stinkhorn.size, 22, 'Stinkhorn size');
}

console.log('\n--- getRangeCircleRenderData ---');
{
  const result = getRangeCircleRenderData(null);
  expect(result, null, 'returns null when rangePreview is null');
}

{
  const rangePreview = createMockRangePreview(true);
  const result = getRangeCircleRenderData(rangePreview);
  expectTrue(result !== null, 'returns data when rangePreview is provided');
  expect(result!.position, rangePreview.position, 'returns correct position');
  expect(result!.radius, 100, 'returns correct radius');
  expect(result!.isValid, true, 'isValid is true');
  expect(result!.color, 'rgba(76, 175, 80, 0.3)', 'uses valid color');
  expect(result!.opacity, 0.3, 'uses valid opacity');
}

{
  const rangePreview = createMockRangePreview(false);
  const result = getRangeCircleRenderData(rangePreview);
  expectTrue(result !== null, 'returns data for invalid preview');
  expect(result!.isValid, false, 'isValid is false');
  expect(result!.color, 'rgba(244, 67, 54, 0.3)', 'uses invalid color');
  expect(result!.opacity, 0.2, 'uses invalid opacity');
}

{
  const customPosition: Vec2 = { x: 250, y: 350 };
  const rangePreview = createMockRangePreview(true, 150, customPosition);
  const result = getRangeCircleRenderData(rangePreview);
  expect(result!.position, customPosition, 'uses custom position');
  expect(result!.radius, 150, 'uses custom radius');
}

console.log('\n--- getPathCoverageRenderData ---');
{
  const result = getPathCoverageRenderData(null);
  expect(result, null, 'returns null when pathPreview is null');
}

{
  const pathPreview = createMockPathPreview(500, 500);
  const result = getPathCoverageRenderData(pathPreview);
  expectTrue(result !== null, 'returns data for valid preview');
  expect(result!.totalCoveredLength, 500, 'total covered length');
  expect(result!.totalPathLength, 500, 'total path length');
  expect(result!.coveragePercent, 100, 'coverage percent is 100');
  expect(result!.segments.length, 3, 'has all segments');
  expectTrue(result!.segments.every(s => s.isCovered), true, 'all segments covered');
}

{
  const pathPreview = createMockPathPreview(300, 500);
  const result = getPathCoverageRenderData(pathPreview);
  expect(result!.totalCoveredLength, 300, 'partial covered length');
  expect(result!.totalPathLength, 500, 'partial total length');
  expect(result!.coveragePercent, 60, 'coverage percent is 60');
}

{
  const pathPreview = createMockPathPreview(0, 500);
  const result = getPathCoverageRenderData(pathPreview);
  expect(result!.totalCoveredLength, 0, 'zero covered length');
  expect(result!.coveragePercent, 0, 'coverage percent is 0');
  expectTrue(result!.segments.every(s => !s.isCovered), true, 'no segments covered');
}

{
  const pathPreview = createMockPathPreview(0, 0);
  const result = getPathCoverageRenderData(pathPreview);
  expect(result!.totalPathLength, 0, 'handles zero total length');
  expect(result!.coveragePercent, 0, 'coverage percent 0 for zero length');
}

{
  const pathPreview = createMockPathPreview(500, 500);
  const result = getPathCoverageRenderData(pathPreview);
  expect(result!.segments[0].start, { x: 0, y: 0 }, 'preserves segment start');
  expect(result!.segments[0].end, { x: 200, y: 0 }, 'preserves segment end');
}

console.log('\n--- getPlacementPreviewRenderData ---');
{
  const result = getPlacementPreviewRenderData(
    { x: 100, y: 100 },
    TowerType.PuffballFungus,
    PlacementMode.None,
    null,
    null
  );
  expect(result.isPlacing, false, 'isPlacing is false when mode is None');
  expect(result.ghost, null, 'ghost is null');
  expect(result.rangeCircle, null, 'rangeCircle is null');
  expect(result.pathCoverage, null, 'pathCoverage is null');
}

{
  const result = getPlacementPreviewRenderData(
    { x: 100, y: 100 },
    TowerType.PuffballFungus,
    PlacementMode.Selecting,
    null,
    null
  );
  expect(result.isPlacing, false, 'isPlacing is false when mode is Selecting');
}

{
  const result = getPlacementPreviewRenderData(
    null,
    TowerType.PuffballFungus,
    PlacementMode.Placing,
    null,
    null
  );
  expect(result.isPlacing, false, 'isPlacing is false when position is null');
}

{
  const rangePreview = createMockRangePreview(true);
  const pathPreview = createMockPathPreview(500, 500);

  const result = getPlacementPreviewRenderData(
    { x: 100, y: 100 },
    TowerType.PuffballFungus,
    PlacementMode.Placing,
    rangePreview,
    pathPreview
  );
  expect(result.isPlacing, true, 'isPlacing is true in placing mode');
  expectTrue(result.ghost !== null, true, 'ghost is populated');
  expect(result.ghost!.towerType, TowerType.PuffballFungus, 'ghost has correct tower type');
  expect(result.ghost!.isValid, true, 'ghost is valid');
  expectTrue(result.rangeCircle !== null, true, 'rangeCircle is populated');
  expectTrue(result.pathCoverage !== null, true, 'pathCoverage is populated');
}

{
  const rangePreviewValid = createMockRangePreview(true);
  const rangePreviewInvalid = createMockRangePreview(false);

  const resultValid = getPlacementPreviewRenderData(
    { x: 100, y: 100 },
    TowerType.OrchidTrap,
    PlacementMode.Placing,
    rangePreviewValid,
    null
  );

  const resultInvalid = getPlacementPreviewRenderData(
    { x: 100, y: 100 },
    TowerType.OrchidTrap,
    PlacementMode.Placing,
    rangePreviewInvalid,
    null
  );

  expect(resultValid.ghost!.isValid, true, 'valid preview has valid ghost');
  expect(resultInvalid.ghost!.isValid, false, 'invalid preview has invalid ghost');
}

console.log('\n--- getTowerPlacementIndicator ---');
{
  const time = 1000;

  const puffball = getTowerPlacementIndicator(TowerType.PuffballFungus, time, true);
  const orchid = getTowerPlacementIndicator(TowerType.OrchidTrap, time, true);
  const venus = getTowerPlacementIndicator(TowerType.VenusFlytower, time, true);
  const bio = getTowerPlacementIndicator(TowerType.BioluminescentShroom, time, true);
  const stinkhorn = getTowerPlacementIndicator(TowerType.StinkhornLine, time, true);

  expect(puffball.type, 'circle', 'Puffball type is circle');
  expect(orchid.type, 'diamond', 'Orchid type is diamond');
  expect(venus.type, 'square', 'Venus type is square');
  expect(bio.type, 'circle', 'Bio type is circle');
  expect(stinkhorn.type, 'diamond', 'Stinkhorn type is diamond');
}

{
  const resultValid = getTowerPlacementIndicator(TowerType.PuffballFungus, 1000, true);
  const resultInvalid = getTowerPlacementIndicator(TowerType.PuffballFungus, 1000, false);

  expect(resultValid.color, '#4CAF50', 'valid placement uses valid color');
  expect(resultInvalid.color, '#F44336', 'invalid placement uses invalid color');
}

{
  const venus = getTowerPlacementIndicator(TowerType.VenusFlytower, 1000, true);
  const bio = getTowerPlacementIndicator(TowerType.BioluminescentShroom, 1000, true);

  expect(venus.size, 24, 'Venus size');
  expect(bio.size, 16, 'Bio size');
}

{
  const result1 = getTowerPlacementIndicator(TowerType.PuffballFungus, 0, true);
  const result2 = getTowerPlacementIndicator(TowerType.PuffballFungus, 1000, true);
  const result3 = getTowerPlacementIndicator(TowerType.PuffballFungus, 2000, true);

  expectTrue(result2.pulsePhase > result1.pulsePhase, true, 'pulse phase increases with time');
  expectTrue(result3.pulsePhase > result2.pulsePhase, true, 'pulse phase continues increasing');
}

console.log('\n--- getPathSegmentRenderStyle ---');
{
  const result = getPathSegmentRenderStyle(true);
  expect(result.color, '#8BC34A', 'covered color');
  expect(result.opacity, 0.8, 'covered opacity');
  expect(result.lineWidth, 3, 'covered line width');
}

{
  const result = getPathSegmentRenderStyle(false);
  expect(result.color, '#9E9E9E', 'uncovered color');
  expect(result.opacity, 0.3, 'uncovered opacity');
  expect(result.lineWidth, 2, 'uncovered line width');
}

{
  const result = getPathSegmentRenderStyle(true, 50);
  expectTrue(result.opacity > 0.8, true, 'highlight increases opacity');
}

{
  const result = getPathSegmentRenderStyle(true, 100);
  expectTrue(result.opacity <= 1.0, true, 'opacity capped at 1.0');
}

console.log('\n--- getPlacementValidityDetails ---');
{
  const rangePreview = createMockRangePreview(true);
  const result = getPlacementValidityDetails(rangePreview, null);
  expect(result.isValid, true, 'returns valid when range preview is valid');
  expect(result.reasons.length, 0, 'no reasons when valid');
}

{
  const rangePreview = createMockRangePreview(false);
  const result = getPlacementValidityDetails(rangePreview, null);
  expect(result.isValid, false, 'returns invalid when range preview is invalid');
  expectTrue(result.reasons.length > 0, true, 'has reasons when invalid');
}

{
  const pathPreview = createMockPathPreview(30, 500);
  const result = getPlacementValidityDetails(null, pathPreview);
  const hasReason = result.reasons.some((r: string) => r.includes('does not cover'));
  expectTrue(hasReason, true, 'detects poor coverage');
}

{
  const pathPreview = createMockPathPreview(400, 500);
  const result = getPlacementValidityDetails(null, pathPreview);
  const hasReason = result.reasons.some((r: string) => r.includes('does not cover'));
  expectTrue(!hasReason, true, 'good coverage passes');
}

console.log('\n--- createPlacementPreviewUpdater ---');
{
  const updater = createPlacementPreviewUpdater();
  expect(updater.getLastUpdateTime(), 0, 'initial time is 0');
}

{
  const updater = createPlacementPreviewUpdater();
  updater.update(1000);
  expect(updater.getLastUpdateTime(), 1000, 'update sets time');
}

{
  const updater = createPlacementPreviewUpdater();
  updater.update(400);
  expectTrue(updater.shouldPulse(500, 500), true, 'detects pulse crossing');

  updater.update(500);
  expectTrue(!updater.shouldPulse(500, 500), true, 'no pulse in same interval');

  expectTrue(!updater.shouldPulse(999, 500), true, 'no pulse before interval');
  expectTrue(updater.shouldPulse(1000, 500), true, 'pulse at interval boundary');
}

{
  const updater = createPlacementPreviewUpdater();
  updater.update(100);
  expectTrue(!updater.shouldPulse(200, 500), true, 'no pulse within interval');
  expectTrue(!updater.shouldPulse(300, 500), true, 'still no pulse');
  expectTrue(!updater.shouldPulse(499, 500), true, 'almost at boundary');
}

console.log(`\n=== Results: ${testsPassed} passed, ${testsFailed} failed ===\n`);

if (testsFailed > 0) {
  console.log('TESTS FAILED');
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED');
}

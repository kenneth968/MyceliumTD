import { getSellButtonAtPosition, getTowerSellButton, getSellButtonPosition, getSellButtonSize } from './placementPreview';
import { TowerWithGrowth, createTowerWithGrowth } from './upgrade';
import { TowerType } from '../entities/tower';
import { TargetingMode } from './targeting';
import { Vec2 } from '../utils/vec2';
import { PlacementState, createGameRunner } from './gameRunner';
import { RELEASE_CAMERA, RELEASE_HUD_LAYOUT, RELEASE_WORLD_PLAYFIELD } from './releaseHudLayout';

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

function createMockTower(id: number = 1): TowerWithGrowth {
  return createTowerWithGrowth(id, 100, 100, TowerType.Puffball, TargetingMode.First);
}

console.log('\n=== sell button input handling tests ===\n');

console.log('--- getSellButtonPosition ---');
{
  const anchor: Vec2 = { x: 200, y: 200 };
  const towerPos: Vec2 = { x: 100, y: 100 };
  const result = getSellButtonPosition(anchor, towerPos);

  expectEqual(result.x, 0, 'x clamps the sell button inside the visible playfield');
  expectTrue(
    Math.abs(result.y - RELEASE_WORLD_PLAYFIELD.y) < 0.001,
    'y clamps the sell button below the top HUD',
  );
}

console.log('\n--- getSellButtonSize ---');
{
  const result = getSellButtonSize();
  
  expectEqual(result.width, 80, 'width is 80');
  expectEqual(result.height, 36, 'height is 36');
}

console.log('\n--- getSellButtonAtPosition ---');
{
  const tower = createMockTower();
  const position: Vec2 = { x: 100, y: 100 };
  const sellButton = getTowerSellButton(tower, position);

  const result = getSellButtonAtPosition(
    sellButton,
    sellButton.position.x + sellButton.size.width / 2,
    sellButton.position.y + sellButton.size.height / 2,
  );
  expectTrue(result, 'click at button center is detected');
}

{
  const tower = createMockTower();
  const edgePositions: Vec2[] = [
    { x: 0, y: 0 },
    { x: 800, y: 0 },
    { x: 0, y: 500 },
    { x: 800, y: 500 },
  ];

  for (const position of edgePositions) {
    const sellButton = getTowerSellButton(tower, position);
    const screenLeft = (sellButton.position.x - RELEASE_CAMERA.x) * RELEASE_CAMERA.zoom
      + RELEASE_HUD_LAYOUT.canvas.width / 2;
    const screenTop = (sellButton.position.y - RELEASE_CAMERA.y) * RELEASE_CAMERA.zoom
      + RELEASE_HUD_LAYOUT.canvas.height / 2;
    const screenRight = screenLeft + sellButton.size.width * RELEASE_CAMERA.zoom;
    const screenBottom = screenTop + sellButton.size.height * RELEASE_CAMERA.zoom;
    const { playfield } = RELEASE_HUD_LAYOUT;

    expectTrue(
      screenLeft >= playfield.x
        && screenTop >= playfield.y
        && screenRight <= playfield.x + playfield.width
        && screenBottom <= playfield.y + playfield.height,
      `sell button at (${position.x}, ${position.y}) stays inside the visible playfield`,
    );
  }
}

{
  const tower = createMockTower();
  const position: Vec2 = { x: 100, y: 100 };
  const sellButton = getTowerSellButton(tower, position);
  
  const result = getSellButtonAtPosition(sellButton, 100, 100);
  expectTrue(!result, 'click at tower position is not on button');
}

{
  const tower = createMockTower();
  const sellButton = getTowerSellButton(tower);
  
  const result = getSellButtonAtPosition(sellButton, 0, 0);
  expectTrue(result, 'click at top-left of button is detected');
}

{
  const tower = createMockTower();
  tower.growth.totalSpent = 500;
  const position: Vec2 = { x: 200, y: 200 };
  const sellButton = getTowerSellButton(tower, position);
  
  expectTrue(getSellButtonAtPosition(sellButton, 105, 140), 'click in button bounds');
  expectTrue(getSellButtonAtPosition(sellButton, 145, 140), 'click at right edge is in bounds');
  expectTrue(!getSellButtonAtPosition(sellButton, 146, 140), 'click beyond right edge');
  expectTrue(!getSellButtonAtPosition(sellButton, 105, 177), 'click beyond bottom edge');
}

console.log('\n--- edge cases ---');
{
  const result = getSellButtonAtPosition(null as any, 40, 36);
  expectTrue(!result, 'null button returns false for click');
}

console.log('\n--- bridge sale confirmation ---');
{
  const game = createGameRunner({ startingMoney: 5000 });
  game.placeTower(TowerType.Sporecap, 720, 180);
  const bridge = game.placeTower(TowerType.Puffball, 590, 180);
  game.placeTower(TowerType.ThornSniper, 450, 180);

  if (bridge) {
    game.selectTower(bridge.id);
    const sellButton = getTowerSellButton(bridge, bridge.position);
    const result = game.sellTowerAtPosition(
      sellButton.position.x + sellButton.size.width / 2,
      sellButton.position.y + sellButton.size.height / 2,
    );

    expectEqual(result.status, 'confirmation_required', 'bridge sell button exposes the confirmation state');
    expectEqual(result.disconnects.length, 1, 'bridge sale preview lists the downstream tower');
    expectEqual(result.disconnectLabels, ['Thorn Sniper'], 'bridge sale preview uses player-facing tower names');
    expectEqual(game.getPlacementState(), PlacementState.Selecting, 'blocked bridge sale keeps the tower selected');
    expectEqual(game.getPlacedTowers().length, 3, 'blocked bridge sale preserves the network');

    const confirmed = game.sellTowerAtPosition(
      sellButton.position.x + sellButton.size.width / 2,
      sellButton.position.y + sellButton.size.height / 2,
      true,
    );
    expectEqual(confirmed.status, 'sold', 'confirmed bridge sale completes');
    expectEqual(confirmed.disconnects.length, 1, 'confirmed sale preserves the previewed impact');
    expectEqual(game.getPlacedTowers().length, 2, 'confirmed bridge sale removes the bridge');
  } else {
    expectTrue(false, 'bridge tower placement succeeds');
  }
}

console.log(`\n=== Results: ${testsPassed} passed, ${testsFailed} failed ===\n`);

if (testsFailed > 0) {
  console.log('TESTS FAILED');
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED');
}

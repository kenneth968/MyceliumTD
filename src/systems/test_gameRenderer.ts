import { GameRunner, GameState, PlacementState } from './gameRunner';
import { GameRenderer, GameFrameRenderData, createGameRenderer, PathRenderData, TargetingModeButtonRenderData, SellButtonRenderData } from './gameRenderer';
import { TowerType } from '../entities/tower';
import { TargetingMode } from './targeting';

console.log('=== GameRenderer Tests ===\n');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean): void {
  try {
    if (fn()) {
      passed++;
      console.log(`  ✓ ${name}`);
    } else {
      failed++;
      console.log(`  ✗ ${name}`);
    }
  } catch (e) {
    failed++;
    console.log(`  ✗ ${name}: ${e}`);
  }
}

// Creation tests
console.log('Creation tests:');
const renderer = createGameRenderer();
test('createGameRenderer returns defined', () => renderer !== undefined);

const camera = renderer.getCamera();
test('default camera zoom is 1.0', () => camera.zoom === 1.0);
test('default camera rotation is 0', () => camera.rotation === 0);

const viewport = renderer.getViewport();
test('default viewport width is 1280', () => viewport.width === 1280);
test('default viewport height is 720', () => viewport.height === 720);

// Camera tests
console.log('\nCamera tests:');
renderer.setCamera({ x: 100, y: 200 });
const cam2 = renderer.getCamera();
test('camera x is set to 100', () => cam2.x === 100);
test('camera y is set to 200', () => cam2.y === 200);

renderer.setCamera({ zoom: 2.0 });
const cam3 = renderer.getCamera();
test('camera zoom is set to 2.0', () => cam3.zoom === 2.0);
test('camera x is preserved after zoom set', () => cam3.x === 100);
test('camera y is preserved after zoom set', () => cam3.y === 200);

// Viewport tests
console.log('\nViewport tests:');
renderer.setViewport(1920, 1080);
const vp = renderer.getViewport();
test('viewport width is set to 1920', () => vp.width === 1920);
test('viewport height is set to 1080', () => vp.height === 1080);

// Render tests
console.log('\nRender tests:');
const game = new GameRunner();
game.start();

const renderData = renderer.render(game);
test('render returns defined object', () => renderData !== undefined);
test('game state is Playing after start', () => renderData.gameState === GameState.Playing);
test('placement state is None initially', () => renderData.placementState === PlacementState.None);
test('path render data is defined', () => renderData.path !== undefined);
test('path has points', () => renderData.path.points.length > 0);
test('path has segments', () => renderData.path.segments.length > 0);
test('tower render data is defined', () => renderData.towers !== undefined);
test('tower towers array is defined', () => Array.isArray(renderData.towers.towers));
test('enemy render data is defined', () => renderData.enemies !== undefined);
test('enemy enemies array is defined', () => Array.isArray(renderData.enemies.enemies));
test('projectile render data is defined', () => Array.isArray(renderData.projectiles));
test('healthBars is defined', () => Array.isArray(renderData.healthBars));
test('waveAnnouncement is defined', () => renderData.waveAnnouncement !== undefined);
test('waveProgress is defined', () => renderData.waveProgress !== undefined);
test('livesMoneyDisplay is defined', () => renderData.livesMoneyDisplay !== undefined);

// Targeting mode buttons when placing
console.log('\nPlacement preview tests:');
game.startTowerPlacement(TowerType.PuffballFungus);
game.updatePlacementPosition(400, 300);

const placementRenderData = renderer.render(game);
test('targeting mode buttons appear when placing', () => placementRenderData.targetingModeButtons.length > 0);
test('placement preview is defined when placing', () => placementRenderData.placementPreview !== undefined);

// Sell button when selecting
console.log('\nTower selection tests:');
game.confirmPlacement(TargetingMode.First);
const placedTowers = game.getPlacedTowers();
if (placedTowers.length > 0) {
  game.selectTower(placedTowers[0].tower.id);
  const selectRenderData = renderer.render(game);
  test('tower selection is defined when selecting', () => selectRenderData.towerSelection !== undefined);
  test('sell button is defined when selecting', () => selectRenderData.sellButton !== null);
}

// Targeting buttons when not placing
console.log('\nNon-placement state tests:');
game.deselectTower();
const idleRenderData = renderer.render(game);
test('no targeting buttons when not placing', () => idleRenderData.targetingModeButtons.length === 0);
test('no sell button when not selecting', () => idleRenderData.sellButton === null);

// Coordinate transformation
console.log('\nCoordinate transformation tests:');
renderer.setViewport(1280, 720);
renderer.setCamera({ x: 400, y: 300, zoom: 1.0 });

const world = renderer.screenToWorld(640, 360);
test('screenToWorld x is correct', () => world.x === 400);
test('screenToWorld y is correct', () => world.y === 300);

const screen = renderer.worldToScreen(400, 300);
test('worldToScreen x is correct', () => screen.x === 640);
test('worldToScreen y is correct', () => screen.y === 360);

// Zoom transformation
renderer.setCamera({ x: 0, y: 0, zoom: 2.0 });
const worldZoom = renderer.screenToWorld(640, 360);
test('screenToWorld handles zoom correctly', () => Math.abs(worldZoom.x) < 0.001 && Math.abs(worldZoom.y) < 0.001);

// Trail tracker
console.log('\nTrail tracker tests:');
const trailTracker = renderer.getTrailTracker();
test('trail tracker is defined', () => trailTracker !== undefined);

// Path render data structure
console.log('\nPath render data structure tests:');
for (const segment of renderData.path.segments) {
  if (!segment.start || !segment.end || !segment.color || segment.width === undefined) {
    test('all segments have required properties', () => false);
    break;
  }
}
test('all segments have required properties', () => true);
test('segment isHighlighted is boolean', () => typeof renderData.path.segments[0].isHighlighted === 'boolean');

// Tower render data structure
console.log('\nTower render data structure tests:');
if (placedTowers.length > 0) {
  const towerData = renderer.render(game);
  if (towerData.towers.towers.length > 0) {
    const firstTower = towerData.towers.towers[0];
    test('tower has id', () => firstTower.id !== undefined);
    test('tower has towerType', () => firstTower.towerType !== undefined);
    test('tower has position', () => firstTower.position !== undefined);
    test('tower has primaryColor', () => firstTower.primaryColor !== undefined);
  }
}

// Enemy render data structure
const enemyData = renderer.render(game);
if (enemyData.enemies.enemies.length > 0) {
  const firstEnemy = enemyData.enemies.enemies[0];
  test('enemy has id', () => firstEnemy.id !== undefined);
  test('enemy has enemyType', () => firstEnemy.enemyType !== undefined);
  test('enemy has position', () => firstEnemy.position !== undefined);
  test('enemy has bodyRadius', () => firstEnemy.bodyRadius !== undefined);
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);

if (failed > 0) {
  process.exit(1);
}
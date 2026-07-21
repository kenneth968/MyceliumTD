import { GameRunner, GameState, PlacementState } from './gameRunner';
import { GameRenderer, GameFrameRenderData, createGameRenderer, PathRenderData, TargetingModeButtonRenderData, SellButtonRenderData } from './gameRenderer';
import { TowerType } from '../entities/tower';
import { TargetingMode } from './targeting';
import { EvolutionPath } from '../content/evolutionDefinitions';
import { createEnemy } from '../entities/enemy';
import { EnemyType } from './wave';
import { RoundState } from './roundManager';
import { getTowerSellButton } from './placementPreview';

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

function completeCurrentWave(game: GameRunner, startTime: number): number {
  let currentTime = startTime;
  for (let step = 0; step < 30 && game.getRoundManager().getState() === RoundState.Active; step++) {
    game.update(currentTime);
    game.getActiveEnemies().splice(0);
    currentTime += 1000;
  }
  if (game.getRoundManager().getState() === RoundState.Active) {
    throw new Error('Wave did not complete within the deterministic test window');
  }
  return currentTime;
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
test('network connections are defined', () => Array.isArray(renderData.networkConnections));

const previewGame = new GameRunner();
previewGame.start();
const idlePreview = renderer.render(previewGame).wavePreview;
test('idle frame includes the complete next-wave preview payload', () =>
  idlePreview?.waveNumber === 1 &&
  idlePreview.name === 'First Footsteps' &&
  idlePreview.enemies.length === 1 &&
  idlePreview.enemies[0]?.type === EnemyType.ScoutBeetle &&
  idlePreview.enemies[0]?.displayName === 'Scout Beetle' &&
  idlePreview.enemies[0]?.count === 8 &&
  idlePreview.enemies[0]?.traits.length === 0 &&
  idlePreview.traits.length === 0 &&
  idlePreview.rewardLabel === '+75 Nutrients'
);
previewGame.getRoundManager().startFirstRound();
const firstIntermissionPreview = renderer.render(previewGame).wavePreview;
test('first intermission keeps Wave 1 preview visible', () => firstIntermissionPreview?.waveNumber === 1);
previewGame.getRoundManager().skipIntermission();
test('active Wave 1 frame hides the preview', () => renderer.render(previewGame).wavePreview === null);

let lifecycleTime = completeCurrentWave(previewGame, 0);
const secondIntermissionPreview = renderer.render(previewGame).wavePreview;
test('completed Wave 1 transitions to an intermission previewing Wave 2', () =>
  previewGame.getRoundManager().getState() === RoundState.Intermission &&
  secondIntermissionPreview?.waveNumber === 2 &&
  secondIntermissionPreview.name === 'Wings on the Path' &&
  secondIntermissionPreview.rewardLabel === '+85 Nutrients'
);

for (let waveNumber = 2; waveNumber <= 9; waveNumber++) {
  previewGame.getRoundManager().skipIntermission();
  lifecycleTime = completeCurrentWave(previewGame, lifecycleTime);
}
const finalIntermissionPreview = renderer.render(previewGame).wavePreview;
test('intermission before the final wave previews Wave 10 without stale prior data', () =>
  previewGame.getRoundManager().getState() === RoundState.Intermission &&
  finalIntermissionPreview?.waveNumber === 10 &&
  finalIntermissionPreview.name === 'Elder Ward' &&
  finalIntermissionPreview.rewardLabel === '+0 Nutrients'
);
previewGame.getRoundManager().skipIntermission();
test('active final-wave frame hides the preview', () => renderer.render(previewGame).wavePreview === null);
lifecycleTime = completeCurrentWave(previewGame, lifecycleTime);
test('victory after the final wave returns no stale preview', () =>
  previewGame.getState() === GameState.Victory &&
  renderer.render(previewGame).wavePreview === null
);

const terminalPreviewGame = new GameRunner({ startingLives: 0 });
terminalPreviewGame.start();
terminalPreviewGame.update(0);
test('game-over terminal transition returns no stale preview', () =>
  terminalPreviewGame.getState() === GameState.GameOver &&
  renderer.render(terminalPreviewGame).wavePreview === null
);

const networkGame = new GameRunner({ startingMoney: 5000 });
networkGame.start();
const kernelConnectedTower = networkGame.placeTower(TowerType.Puffball, 720, 180, TargetingMode.First);
const chainedTower = networkGame.placeTower(TowerType.Slimefungus, 600, 180, TargetingMode.First);
const farTower = networkGame.placeTower(TowerType.BulbShooter, 100, 100, TargetingMode.First);
const networkRenderData = renderer.render(networkGame);
test('kernel-connected tower has a network line', () =>
  kernelConnectedTower !== null &&
  networkRenderData.networkConnections.some(connection =>
    connection.targetTowerId === kernelConnectedTower.id && connection.sourceTowerId === null
  )
);
test('chained tower has a network line from a connected tower', () =>
  kernelConnectedTower !== null &&
  chainedTower !== null &&
  networkRenderData.networkConnections.some(connection =>
    connection.targetTowerId === chainedTower.id && connection.sourceTowerId === kernelConnectedTower.id
  )
);
test('unconnected tower does not get a network line', () =>
  farTower !== null &&
  !networkRenderData.networkConnections.some(connection => connection.targetTowerId === farTower.id)
);

const fieldGame = new GameRunner({ startingMoney: 5000 });
fieldGame.start();
const fieldTower = fieldGame.placeTower(TowerType.Puffball, 720, 250, TargetingMode.First);
if (fieldTower) {
  fieldGame.matureTower(fieldTower.id);
  fieldGame.evolveTower(fieldTower.id, EvolutionPath.Symbiote);
  const fieldTarget = createEnemy(910, EnemyType.DartWasp, fieldGame.getPath());
  fieldTarget.pathDistance = 1420;
  fieldTarget.pathProgress = 1420;
  fieldTarget.position = { ...fieldGame.getPath().getPointAtDistance(fieldTarget.pathDistance).position };
  fieldTarget.speed = 0;
  fieldTarget.baseSpeed = 0;
  fieldGame.getActiveEnemies().push(fieldTarget);
  fieldGame.update(1000);
  fieldGame.update(1400);
}
const fieldRenderData = renderer.render(fieldGame);
const renderedFields = fieldRenderData.lingeringFields;
test('active lingering fungal field appears in frame render data', () =>
  Array.isArray(renderedFields) && renderedFields.length === 1
);
test('lingering fungal field render data is visible and timed', () =>
  renderedFields?.[0]?.radius === 40 &&
  renderedFields?.[0]?.duration === 6000 &&
  renderedFields?.[0]?.color === 'rgba(136, 216, 90, 0.22)'
);

const seededGame = new GameRunner({ startingMoney: 5000 });
seededGame.start();
const seededTower = seededGame.placeTower(TowerType.BulbShooter, 720, 270, TargetingMode.First);
if (seededTower) {
  seededGame.matureTower(seededTower.id);
  seededGame.evolveTower(seededTower.id, EvolutionPath.Symbiote);
  const seededTarget = createEnemy(911, EnemyType.BulwarkBeetle, seededGame.getPath());
  seededTarget.pathDistance = 1420;
  seededTarget.pathProgress = 1420;
  seededTarget.position = { ...seededGame.getPath().getPointAtDistance(seededTarget.pathDistance).position };
  seededTarget.speed = 0;
  seededTarget.baseSpeed = 0;
  seededGame.getActiveEnemies().push(seededTarget);
  seededGame.update(1200);
  seededGame.update(2400);
  seededGame.update(3600);
  seededGame.update(4800);
}
const seededRenderData = renderer.render(seededGame);
const renderedPayloads = seededRenderData.seededPayloads;
test('active seeded payloads appear in frame render data', () =>
  Array.isArray(renderedPayloads) && renderedPayloads.length === 1
);
test('seeded payload render data is visible and delayed', () =>
  renderedPayloads?.[0]?.radius === 35 &&
  renderedPayloads?.[0]?.delay === 1000 &&
  renderedPayloads?.[0]?.color === 'rgba(255, 207, 102, 0.75)'
);

// Targeting mode buttons when placing
console.log('\nPlacement preview tests:');
game.startTowerPlacement(TowerType.Puffball);
game.updatePlacementPosition(700, 100);

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
  const expectedSellButton = getTowerSellButton(
    placedTowers[0].tower,
    { x: placedTowers[0].x, y: placedTowers[0].y },
  );
  test('tower selection is defined when selecting', () => selectRenderData.towerSelection !== undefined);
  test('sell button is defined when selecting', () => selectRenderData.sellButton !== null);
  test('rendered sell button uses the same geometry as sell input', () =>
    selectRenderData.sellButton?.position.x === expectedSellButton.position.x &&
    selectRenderData.sellButton?.position.y === expectedSellButton.position.y &&
    selectRenderData.sellButton?.size.width === expectedSellButton.size.width &&
    selectRenderData.sellButton?.size.height === expectedSellButton.size.height
  );
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

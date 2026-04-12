import {
  ProjectileRenderData,
  TrailPoint,
  ProjectileTrailTracker,
  createProjectileTrailTracker,
  getProjectileRenderData,
  createTrailPoint,
  getTrailColor,
  updateTrailPointOpacity,
  shouldKeepTrailPoint,
  getProjectilesRenderData,
  getTrailSegments,
  getProjectileVelocity,
  getAnimationState,
  calculateProjectileStretch,
} from './projectileRender';
import { Projectile, TowerType } from '../entities/tower';
import { Vec2 } from '../utils/vec2';

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

function assertApprox(actual: number, expected: number, message: string, tolerance: number = 0.001) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Assertion failed: ${message} (expected ${expected}, got ${actual})`);
  }
}

console.log('Testing ProjectileRender...');

function createTestProjectile(overrides: Partial<Projectile> = {}): Projectile {
  return {
    id: 1,
    position: { x: 100, y: 100 },
    targetId: 1,
    speed: 200,
    damage: 1,
    towerType: TowerType.PuffballFungus,
    alive: true,
    ...overrides,
  };
}

function createVec2(x: number, y: number): Vec2 {
  return { x, y };
}

console.log('  ProjectileRenderData tests...');
assertEqual(getProjectileRenderData(createTestProjectile()).id, 1, 'id should be 1');
assertEqual(getProjectileRenderData(createTestProjectile()).position, { x: 100, y: 100 }, 'position should be {100, 100}');
assertEqual(getProjectileRenderData(createTestProjectile()).color, '#9B59B6', 'Puffball color should be #9B59B6');
assertEqual(getProjectileRenderData(createTestProjectile()).glowColor, '#E8DAEF', 'Puffball glow should be #E8DAEF');
assertEqual(getProjectileRenderData(createTestProjectile()).size, 8, 'Puffball size should be 8');
assertEqual(getProjectileRenderData(createTestProjectile()).opacity, 1.0, 'opacity should be 1.0');
assertEqual(getProjectileRenderData(createTestProjectile()).towerType, TowerType.PuffballFungus, 'towerType should be PuffballFungus');
assertEqual(getProjectileRenderData(createTestProjectile()).hasTrail, true, 'hasTrail should be true');
assert(Array.isArray(getProjectileRenderData(createTestProjectile()).trailPoints), 'trailPoints should be array');

const prevPos = createVec2(90, 95);
assertEqual(getProjectileRenderData(createTestProjectile(), prevPos).previousPosition, { x: 90, y: 95 }, 'previousPosition should be set when provided');
assertEqual(getProjectileRenderData(createTestProjectile()).previousPosition, { x: 100, y: 100 }, 'previousPosition defaults to current position');

const projectile1 = createTestProjectile({ towerType: TowerType.VenusFlytower });
const projectile2 = createTestProjectile({ towerType: TowerType.BioluminescentShroom });
assertEqual(getProjectileRenderData(projectile1).size, 12, 'Venus size should be 12');
assertEqual(getProjectileRenderData(projectile2).size, 6, 'Biolum size should be 6');
console.log('  ProjectileRenderData tests passed');

console.log('  TrailPoint tests...');
assertEqual(createTrailPoint(createVec2(50, 50), 1000, 0.8).position, { x: 50, y: 50 }, 'position should be set');
assertEqual(createTrailPoint(createVec2(50, 50), 1000, 0.8).timestamp, 1000, 'timestamp should be 1000');
assertEqual(createTrailPoint(createVec2(50, 50), 1000, 0.8).opacity, 0.8, 'opacity should be 0.8');
assertEqual(createTrailPoint(createVec2(50, 50), 1000).opacity, 1.0, 'default opacity should be 1.0');
console.log('  TrailPoint tests passed');

console.log('  TrailColor tests...');
assertEqual(getTrailColor(TowerType.PuffballFungus), '#E8DAEF', 'Puffball glow color');
assertEqual(getTrailColor(TowerType.OrchidTrap), '#D4E6F1', 'Orchid glow color');
assertEqual(getTrailColor(TowerType.VenusFlytower), '#FADBD8', 'Venus glow color');
assertEqual(getTrailColor(TowerType.BioluminescentShroom), '#D1F2EB', 'Biolum glow color');
assertEqual(getTrailColor(TowerType.StinkhornLine), '#D5F5E3', 'Stinkhorn glow color');
console.log('  TrailColor tests passed');

console.log('  TrailOpacity tests...');
const faded = updateTrailPointOpacity(createTrailPoint(createVec2(0, 0), 1000, 1.0), 0.5);
assertEqual(faded.opacity, 0.5, 'opacity should be faded to 0.5');
assert(shouldKeepTrailPoint(createTrailPoint(createVec2(0, 0), 1000, 0.5)), 'shouldKeepTrailPoint returns true for high opacity');
assert(!shouldKeepTrailPoint(createTrailPoint(createVec2(0, 0), 1000, 0.05)), 'shouldKeepTrailPoint returns false for low opacity');
console.log('  TrailOpacity tests passed');

console.log('  ProjectileTrailTracker tests...');
const tracker = createProjectileTrailTracker();
tracker.addPoint(1, createVec2(100, 100), 1000);
assertEqual(tracker.getTrail(1).length, 1, 'addPoint creates new trail');
assertEqual(tracker.getTrail(1)[0].position, { x: 100, y: 100 }, 'trail point position correct');

tracker.addPoint(1, createVec2(110, 110), 1010);
assertEqual(tracker.getTrail(1).length, 2, 'addPoint appends to trail');

const tracker3 = createProjectileTrailTracker(3);
tracker3.addPoint(1, createVec2(0, 0), 1000);
tracker3.addPoint(1, createVec2(10, 10), 1010);
tracker3.addPoint(1, createVec2(20, 20), 1020);
tracker3.addPoint(1, createVec2(30, 30), 1030);
assertEqual(tracker3.getTrail(1).length, 3, 'maxPoints limit respected');
assertEqual(tracker3.getTrail(1)[0].position, { x: 10, y: 10 }, 'oldest point removed when exceeding max');

tracker.updateTrails(100);
assertEqual(tracker.getTrail(1).length, 2, 'updateTrails keeps points');
assert(tracker.getTrail(1)[0].opacity < 1.0, 'updateTrails fades opacity');

tracker.removeTrail(1);
assertEqual(tracker.getTrail(1).length, 0, 'removeTrail deletes trail');

const tracker2 = createProjectileTrailTracker();
tracker2.addPoint(1, createVec2(100, 100), 1000);
tracker2.addPoint(2, createVec2(200, 200), 1000);
const aliveIds = new Set<number>([1]);
tracker2.clearDeadProjectiles(aliveIds);
assertEqual(tracker2.getTrail(1).length, 1, 'clearDeadProjectiles keeps alive');
assertEqual(tracker2.getTrail(2).length, 0, 'clearDeadProjectiles removes dead');

const copyTracker = createProjectileTrailTracker();
copyTracker.addPoint(1, createVec2(50, 50), 1000);
const allTrails = copyTracker.getAllTrails();
allTrails.delete(1);
assertEqual(copyTracker.getTrail(1).length, 1, 'getAllTrails returns copy');
console.log('  ProjectileTrailTracker tests passed');

console.log('  getProjectilesRenderData tests...');
const projectiles = [createTestProjectile({ id: 1 })];
const renderTracker = createProjectileTrailTracker();
const prevPositions = new Map<number, Vec2>();
let renderData = getProjectilesRenderData(projectiles, prevPositions, renderTracker);
assertEqual(renderData.length, 1, 'returns render data for alive projectiles');
assertEqual(renderData[0].id, 1, 'render data id correct');

const deadProjectiles = [
  createTestProjectile({ id: 1, alive: true }),
  createTestProjectile({ id: 2, alive: false }),
];
renderData = getProjectilesRenderData(deadProjectiles, prevPositions, renderTracker);
assertEqual(renderData.length, 1, 'filters dead projectiles');
assertEqual(renderData[0].id, 1, 'only alive projectile returned');

renderTracker.addPoint(1, createVec2(100, 100), 1000);
renderTracker.addPoint(1, createVec2(105, 105), 1010);
renderData = getProjectilesRenderData([createTestProjectile({ id: 1 })], prevPositions, renderTracker);
assertEqual(renderData[0].hasTrail, true, 'hasTrail true when trail exists');
assertEqual(renderData[0].trailPoints.length, 2, 'trailPoints included');
console.log('  getProjectilesRenderData tests passed');

console.log('  getTrailSegments tests...');
const trail: TrailPoint[] = [
  createTrailPoint(createVec2(0, 0), 1000, 1.0),
  createTrailPoint(createVec2(10, 10), 1010, 0.8),
  createTrailPoint(createVec2(20, 20), 1020, 0.6),
];
let segments = getTrailSegments(TowerType.PuffballFungus, trail);
assertEqual(segments.length, 2, 'creates correct number of segments');
assertEqual(segments[0].start, { x: 0, y: 0 }, 'segment 1 start correct');
assertEqual(segments[0].end, { x: 10, y: 10 }, 'segment 1 end correct');
assertEqual(segments[1].start, { x: 10, y: 10 }, 'segment 2 start correct');
assertEqual(segments[1].end, { x: 20, y: 20 }, 'segment 2 end correct');

const trail2: TrailPoint[] = [
  createTrailPoint(createVec2(0, 0), 1000, 1.0),
  createTrailPoint(createVec2(10, 10), 1010, 0.6),
];
segments = getTrailSegments(TowerType.OrchidTrap, trail2);
assertEqual(segments[0].opacity, 0.8, 'segment opacity averaged');

segments = getTrailSegments(TowerType.StinkhornLine, [createTrailPoint(createVec2(0, 0), 1000, 1.0)]);
assertEqual(segments.length, 0, 'single point produces no segments');
console.log('  getTrailSegments tests passed');

console.log('  getProjectileVelocity tests...');
let velocity = getProjectileVelocity(createTestProjectile({ speed: 200 }));
assertEqual(velocity.x, 20, 'velocity x based on speed');
assertEqual(velocity.y, 20, 'velocity y based on speed');

velocity = getProjectileVelocity(createTestProjectile({ speed: 0 }));
assertEqual(velocity.x, 0, 'zero speed gives zero velocity');
assertEqual(velocity.y, 0, 'zero speed gives zero velocity');
console.log('  getProjectileVelocity tests passed');

console.log('  getAnimationState tests...');
let state = getAnimationState(createTestProjectile(), 1000);
assert(typeof state.scale === 'number', 'scale is number');
assert(typeof state.rotation === 'number', 'rotation is number');
assert(typeof state.pulsePhase === 'number', 'pulsePhase is number');

const state1 = getAnimationState(createTestProjectile(), 1000);
const state2 = getAnimationState(createTestProjectile(), 1050);
assert(state1.scale !== state2.scale, 'scale varies over time');
console.log('  getAnimationState tests passed');

console.log('  calculateProjectileStretch tests...');
let stretch = calculateProjectileStretch(createTestProjectile({ speed: 0 }), 16);
assertEqual(stretch.scaleX, 1.0, 'zero speed stretch is 1.0');
assertEqual(stretch.scaleY, 1.0, 'zero speed stretch is 1.0');

stretch = calculateProjectileStretch(createTestProjectile({ speed: 400 }), 16);
assert(stretch.scaleX > 1.0, 'high speed increases scaleX');
assert(stretch.scaleY < 1.0, 'high speed decreases scaleY');

stretch = calculateProjectileStretch(createTestProjectile({ speed: 1000 }), 16);
assert(stretch.scaleX <= 2.0, 'stretch capped at max 2.0');
console.log('  calculateProjectileStretch tests passed');

console.log('  Integration tests...');
const integrationTracker = createProjectileTrailTracker(5);
integrationTracker.addPoint(1, createVec2(0, 0), 1000);
integrationTracker.addPoint(1, createVec2(10, 10), 1010);
integrationTracker.addPoint(1, createVec2(20, 20), 1020);
assertEqual(integrationTracker.getTrail(1).length, 3, 'full lifecycle - initial points');
integrationTracker.updateTrails(50);
assertEqual(integrationTracker.getTrail(1).length, 3, 'full lifecycle - after first fade');

for (let i = 0; i < 20; i++) {
  integrationTracker.updateTrails(100);
}
const finalTrail = integrationTracker.getTrail(1);
assert(finalTrail.length === 0, 'full lifecycle - points fade away completely');

const multiTracker = createProjectileTrailTracker();
multiTracker.addPoint(1, createVec2(0, 0), 1000);
multiTracker.addPoint(2, createVec2(100, 100), 1000);
multiTracker.addPoint(1, createVec2(10, 10), 1010);
multiTracker.addPoint(2, createVec2(110, 110), 1010);
assertEqual(multiTracker.getTrail(1).length, 2, 'multiple projectiles - trail 1');
assertEqual(multiTracker.getTrail(2).length, 2, 'multiple projectiles - trail 2');
console.log('  Integration tests passed');

console.log('\n✅ All ProjectileRender tests passed!');
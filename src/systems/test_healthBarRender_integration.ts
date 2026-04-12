import { GameRunner, createGameRunner, GameState, PlacementState } from './gameRunner';
import { getHealthBarsRenderData, HealthBarAnimator, createHealthBarAnimator, HealthState, HealthBarRenderData } from './healthBarRender';
import { Enemy, createEnemy, applyStatusEffect, StatusEffectType } from '../entities/enemy';
import { EnemyType } from './wave';
import { Path } from './path';
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

function createMockPath(): Path {
  const points = [
    { x: 0, y: 0 },
    { x: 100, y: 0 },
    { x: 100, y: 100 },
    { x: 200, y: 100 },
  ];
  return new Path(points);
}

function createMockEnemy(overrides?: Partial<Enemy>): Enemy {
  const path = createMockPath();
  const baseEnemy = createEnemy(1, EnemyType.RedMushroom, path);
  return { ...baseEnemy, ...overrides };
}

let passed = 0;
let failed = 0;

function runTests() {
  console.log('Running HealthBarRender Integration tests...\n');

  try { getHealthBarsRenderDataEmptyGameTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { healthBarAnimatorIntegrationTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { healthBarDataStructureTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { healthStateTransitionsTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { healthBarAnimatorResetTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { waveProgressionHealthBarsTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

function getHealthBarsRenderDataEmptyGameTests() {
  console.log('Testing getHealthBarsRenderData with empty game...');
  
  const game = createGameRunner();
  const result = game.getHealthBarsRenderData();
  assertEqual(result.healthBars.length, 0, 'no health bars when no enemies');
  assertEqual(result.totalVisible, 0, 'totalVisible is 0');
  
  game.reset();
  passed++;
}

function healthBarAnimatorIntegrationTests() {
  console.log('Testing HealthBarAnimator integration...');
  
  const game = createGameRunner();
  
  const animator = game.getHealthBarAnimator();
  assert(animator !== null, 'animator is not null');
  assert(animator !== undefined, 'animator is not undefined');
  
  const result1 = game.getHealthBarsRenderData();
  assertEqual(result1.healthBars.length, 0, 'no health bars initially');
  
  game.reset();
  passed++;
}

function healthBarDataStructureTests() {
  console.log('Testing health bar data structure...');
  
  const game = createGameRunner();
  const mockEnemy = createMockEnemy({
    hp: 50,
    maxHp: 100,
    statusEffects: []
  });
  
  const path = createMockPath();
  (game as any).activeEnemies = [mockEnemy];
  
  const result = game.getHealthBarsRenderData();
  const visibleBars = result.healthBars.filter((b: HealthBarRenderData) => b.isVisible);
  
  if (visibleBars.length > 0) {
    const bar = visibleBars[0];
    assert(bar.enemyId !== undefined, 'bar has enemyId');
    assert(bar.position !== undefined, 'bar has position');
    assert(typeof bar.width === 'number', 'bar has width');
    assert(typeof bar.height === 'number', 'bar has height');
    assert(typeof bar.currentHp === 'number', 'bar has currentHp');
    assert(typeof bar.maxHp === 'number', 'bar has maxHp');
    assert(typeof bar.healthPercent === 'number', 'bar has healthPercent');
    assert(bar.healthState !== undefined, 'bar has healthState');
    assert(typeof bar.isVisible === 'boolean', 'bar has isVisible');
  }
  
  game.reset();
  passed++;
}

function healthStateTransitionsTests() {
  console.log('Testing health state transitions...');
  
  const game = createGameRunner();
  const path = createMockPath();
  
  const fullHealthEnemy = createMockEnemy({ hp: 100, maxHp: 100 });
  const damagedEnemy = createMockEnemy({ hp: 40, maxHp: 100 });
  const criticalEnemy = createMockEnemy({ hp: 20, maxHp: 100 });
  
  (game as any).activeEnemies = [fullHealthEnemy, damagedEnemy, criticalEnemy];
  
  const result = game.getHealthBarsRenderData();
  
  const damagedBars = result.healthBars.filter(
    (b: HealthBarRenderData) => b.isVisible && b.healthState === HealthState.Damaged
  );
  const criticalBars = result.healthBars.filter(
    (b: HealthBarRenderData) => b.isVisible && b.healthState === HealthState.Critical
  );
  
  assert(damagedBars.length >= 1, 'damaged health state detected');
  assert(criticalBars.length >= 1, 'critical health state detected');
  
  game.reset();
  passed++;
}

function healthBarAnimatorResetTests() {
  console.log('Testing HealthBarAnimator reset on game reset...');
  
  const game = createGameRunner();
  const animator = game.getHealthBarAnimator();
  
  (animator as any).displayHealthPercents.set(1, 0.5);
  
  game.reset();
  
  const newAnimator = game.getHealthBarAnimator();
  assertEqual(newAnimator.getDisplayHealthPercent(1), 1.0, 'animator reset after game reset');
  
  passed++;
}

function waveProgressionHealthBarsTests() {
  console.log('Testing health bars during wave progression...');
  
  const game = createGameRunner();
  game.start();
  
  const result1 = game.getHealthBarsRenderData();
  assertEqual(result1.totalVisible, 0, 'no visible bars at game start');
  
  game.reset();
  passed++;
}

runTests();
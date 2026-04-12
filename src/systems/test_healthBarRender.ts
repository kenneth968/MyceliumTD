import {
  HealthBarRenderData,
  HealthState,
  StatusEffectIndicator,
  getHealthBarWidth,
  getHealthBarHeight,
  getHealthBarOffsetY,
  getHealthState,
  getStatusEffectIndicators,
  getHealthBarColors,
  shouldShowHealthBar,
  getHealthBarRenderData,
  getHealthBarsRenderData,
  HealthBarAnimator,
  createHealthBarAnimator,
  getAnimatedHealthBarRenderData,
  AnimatedHealthBarData,
} from './healthBarRender';

import { Enemy, createEnemy, applyStatusEffect, StatusEffectType } from '../entities/enemy';
import { EnemyType } from './wave';
import { Path } from './path';

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
  console.log('Running healthBarRender tests...\n');

  try { getHealthBarWidthTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getHealthBarHeightTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getHealthBarOffsetYTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getHealthStateTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getStatusEffectIndicatorsTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getHealthBarColorsTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { shouldShowHealthBarTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getHealthBarRenderDataTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getHealthBarsRenderDataTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { HealthBarAnimatorTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getAnimatedHealthBarRenderDataTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

function getHealthBarWidthTests() {
  console.log('Testing getHealthBarWidth...');
  
  assertEqual(getHealthBarWidth(), 30, 'default width');
  assertEqual(getHealthBarWidth(EnemyType.RedMushroom), 30, 'red mushroom width');
  assertEqual(getHealthBarWidth(EnemyType.ShelledSnail), 40, 'shelled snail width');
  assertEqual(getHealthBarWidth(EnemyType.ArmoredBeetle), 38, 'armored beetle width');
  assertEqual(getHealthBarWidth(EnemyType.RainbowStag), 35, 'rainbow stag width');
  assertEqual(getHealthBarWidth(EnemyType.BlackWidow), 32, 'black widow width');
  
  passed++;
}

function getHealthBarHeightTests() {
  console.log('Testing getHealthBarHeight...');
  
  assertEqual(getHealthBarHeight(), 4, 'default height');
  assertEqual(getHealthBarHeight(EnemyType.RedMushroom), 4, 'red mushroom height');
  assertEqual(getHealthBarHeight(EnemyType.ShelledSnail), 6, 'shelled snail height');
  assertEqual(getHealthBarHeight(EnemyType.ArmoredBeetle), 6, 'armored beetle height');
  assertEqual(getHealthBarHeight(EnemyType.RainbowStag), 5, 'rainbow stag height');
  
  passed++;
}

function getHealthBarOffsetYTests() {
  console.log('Testing getHealthBarOffsetY...');
  
  assertEqual(getHealthBarOffsetY(), -15, 'default offset');
  assertEqual(getHealthBarOffsetY(EnemyType.RedMushroom), -15, 'red mushroom offset');
  assertEqual(getHealthBarOffsetY(EnemyType.ShelledSnail), -20, 'shelled snail offset');
  assertEqual(getHealthBarOffsetY(EnemyType.ArmoredBeetle), -18, 'armored beetle offset');
  assertEqual(getHealthBarOffsetY(EnemyType.RainbowStag), -16, 'rainbow stag offset');
  
  passed++;
}

function getHealthStateTests() {
  console.log('Testing getHealthState...');
  
  assertEqual(getHealthState(0.5, false), HealthState.Dead, 'dead enemy');
  assertEqual(getHealthState(1.0, false), HealthState.Dead, 'full health but dead');
  assertEqual(getHealthState(0.25, true), HealthState.Critical, 'critical health');
  assertEqual(getHealthState(0.1, true), HealthState.Critical, 'very low health');
  assertEqual(getHealthState(0.0, true), HealthState.Critical, 'zero health');
  assertEqual(getHealthState(0.5, true), HealthState.Damaged, 'damaged health');
  assertEqual(getHealthState(0.3, true), HealthState.Damaged, '30% health');
  assertEqual(getHealthState(0.26, true), HealthState.Damaged, '26% health');
  assertEqual(getHealthState(1.0, true), HealthState.Full, 'full health');
  assertEqual(getHealthState(0.75, true), HealthState.Full, '75% health');
  assertEqual(getHealthState(0.51, true), HealthState.Full, '51% health');
  
  passed++;
}

function getStatusEffectIndicatorsTests() {
  console.log('Testing getStatusEffectIndicators...');
  
  let indicators = getStatusEffectIndicators(createMockEnemy());
  assertEqual(indicators.length, 0, 'no effects');
  
  const enemy = createMockEnemy();
  applyStatusEffect(enemy, StatusEffectType.Slow, 5000, 0.3);
  indicators = getStatusEffectIndicators(enemy);
  assertEqual(indicators.length, 1, 'one effect');
  assertEqual(indicators[0].type, StatusEffectType.Slow, 'slow type');
  assertEqual(indicators[0].color, '#3498DB', 'slow color');
  assertEqual(indicators[0].icon, 'snowflake', 'slow icon');
  
  applyStatusEffect(enemy, StatusEffectType.Poison, 3000, 5);
  indicators = getStatusEffectIndicators(enemy);
  assertEqual(indicators.length, 2, 'two effects');
  assertEqual(indicators[1].type, StatusEffectType.Poison, 'poison type');
  assertEqual(indicators[1].color, '#9B59B6', 'poison color');
  assertEqual(indicators[1].icon, 'skull', 'poison icon');
  
  passed++;
}

function getHealthBarColorsTests() {
  console.log('Testing getHealthBarColors...');
  
  let colors = getHealthBarColors(HealthState.Full);
  assertEqual(colors.background, '#1a1a1a', 'full background');
  assertEqual(colors.fill, '#4CAF50', 'full fill');
  assertEqual(colors.border, '#2E7D32', 'full border');
  
  colors = getHealthBarColors(HealthState.Damaged);
  assertEqual(colors.fill, '#FFC107', 'damaged fill');
  assertEqual(colors.border, '#F57C00', 'damaged border');
  
  colors = getHealthBarColors(HealthState.Critical);
  assertEqual(colors.fill, '#F44336', 'critical fill');
  assertEqual(colors.border, '#C62828', 'critical border');
  
  colors = getHealthBarColors(HealthState.Dead);
  assertEqual(colors.fill, '#424242', 'dead fill');
  assertEqual(colors.border, '#212121', 'dead border');
  
  passed++;
}

function shouldShowHealthBarTests() {
  console.log('Testing shouldShowHealthBar...');
  
  assertEqual(shouldShowHealthBar(createMockEnemy({ alive: false }), false), false, 'dead enemy');
  assertEqual(shouldShowHealthBar(createMockEnemy({ alive: false }), true), false, 'dead enemy always');
  
  assertEqual(shouldShowHealthBar(createMockEnemy({ hp: 100, maxHp: 100, statusEffects: [] }), false), false, 'full health no effects');
  assertEqual(shouldShowHealthBar(createMockEnemy({ hp: 100, maxHp: 100, statusEffects: [] }), true), true, 'full health always');
  
  assertEqual(shouldShowHealthBar(createMockEnemy({ hp: 50, maxHp: 100, statusEffects: [] }), false), true, 'damaged enemy');
  
  const enemyWithEffect = createMockEnemy({ hp: 100, maxHp: 100, statusEffects: [] });
  applyStatusEffect(enemyWithEffect, StatusEffectType.Slow, 5000, 0.3);
  assertEqual(shouldShowHealthBar(enemyWithEffect, false), true, 'enemy with effect');
  
  passed++;
}

function getHealthBarRenderDataTests() {
  console.log('Testing getHealthBarRenderData...');
  
  let data = getHealthBarRenderData(createMockEnemy({ alive: false }));
  assertEqual(data.isVisible, false, 'dead invisible');
  assertEqual(data.width, 0, 'dead width');
  assertEqual(data.height, 0, 'dead height');
  
  data = getHealthBarRenderData(createMockEnemy({ hp: 30, maxHp: 100 }));
  assertEqual(data.isVisible, true, 'damaged visible');
  assertEqual(data.enemyId, 1, 'enemy id');
  assertEqual(data.currentHp, 30, 'current hp');
  assertEqual(data.maxHp, 100, 'max hp');
  assertEqual(data.healthPercent, 0.3, 'health percent');
  assertEqual(data.healthState, HealthState.Damaged, 'damaged state');
  assertEqual(data.fillColor, '#FFC107', 'damaged color');
  
  data = getHealthBarRenderData(createMockEnemy({ hp: 10, maxHp: 100 }));
  assertEqual(data.healthState, HealthState.Critical, 'critical state');
  assertEqual(data.fillColor, '#F44336', 'critical color');
  
  data = getHealthBarRenderData(createMockEnemy({ hp: 100, maxHp: 100 }), { showAlways: true });
  assertEqual(data.healthState, HealthState.Full, 'full state');
  assertEqual(data.fillColor, '#4CAF50', 'full color');
  
  data = getHealthBarRenderData(createMockEnemy({ hp: 50, maxHp: 100 }), {
    customWidth: 50,
    customHeight: 8,
    customOffsetY: -20,
  });
  assertEqual(data.width, 50, 'custom width');
  assertEqual(data.height, 8, 'custom height');
  assertEqual(data.offsetY, -20, 'custom offset');
  
  const enemyWithStun = createMockEnemy({ hp: 50, maxHp: 100 });
  applyStatusEffect(enemyWithStun, StatusEffectType.Stun, 2000, 1);
  data = getHealthBarRenderData(enemyWithStun);
  assertEqual(data.statusEffectIndicators.length, 1, 'stun indicator');
  assertEqual(data.statusEffectIndicators[0].type, StatusEffectType.Stun, 'stun type');
  assertEqual(data.statusEffectIndicators[0].icon, 'lightning', 'stun icon');
  
  passed++;
}

function getHealthBarsRenderDataTests() {
  console.log('Testing getHealthBarsRenderData...');
  
  let result = getHealthBarsRenderData([]);
  assertEqual(result.healthBars.length, 0, 'empty');
  assertEqual(result.totalVisible, 0, 'empty total');
  
  const enemies = [
    createMockEnemy({ id: 1, hp: 100, maxHp: 100, statusEffects: [], alive: true }),
    createMockEnemy({ id: 2, hp: 50, maxHp: 100, statusEffects: [], alive: true }),
    createMockEnemy({ id: 3, alive: false }),
  ];
  
  result = getHealthBarsRenderData(enemies);
  assertEqual(result.totalVisible, 1, 'filtered visible');
  assertEqual(result.healthBars[0].enemyId, 2, 'filtered id');
  
  result = getHealthBarsRenderData(enemies, { showAlways: true });
  assertEqual(result.totalVisible, 2, 'always visible');
  
  passed++;
}

function HealthBarAnimatorTests() {
  console.log('Testing HealthBarAnimator...');
  
  const animator = createHealthBarAnimator();
  assertApproxEqual(animator.getDisplayHealthPercent(1), 1.0, 0.01, 'initial percent');
  
  const enemy = createMockEnemy({ id: 1, hp: 50, maxHp: 100 });
  animator.update([enemy], 500);
  let displayPercent = animator.getDisplayHealthPercent(1);
  assert(displayPercent < 1.0, 'after update < 1');
  assert(displayPercent > 0.5, 'after update > 0.5');
  
  for (let i = 0; i < 60; i++) {
    animator.update([enemy], 100);
  }
  assertApproxEqual(animator.getDisplayHealthPercent(1), 0.5, 0.05, 'converged');
  
  animator.update([], 100);
  assertApproxEqual(animator.getDisplayHealthPercent(1), 1.0, 0.01, 'enemy removed');
  
  animator.setAnimationSpeed(2, 0.5);
  const enemy2 = createMockEnemy({ id: 2, hp: 50, maxHp: 100 });
  animator.update([enemy2], 100);
  assert(animator.getDisplayHealthPercent(2) <= 0.95, 'custom speed');
  
  animator.reset();
  assertApproxEqual(animator.getDisplayHealthPercent(2), 1.0, 0.01, 'after reset');
  
  passed++;
}

function getAnimatedHealthBarRenderDataTests() {
  console.log('Testing getAnimatedHealthBarRenderData...');
  
  const animator = createHealthBarAnimator();
  const enemy = createMockEnemy({ id: 1, hp: 75, maxHp: 100 });
  
  animator.update([enemy], 200);
  
  const data = getAnimatedHealthBarRenderData(enemy, animator);
  assertEqual(data.targetHealthPercent, 0.75, 'target');
  assert(data.displayHealthPercent < 1.0, 'display < 1');
  assertEqual(data.animatingDelta, true, 'animating');
  assertEqual(data.deltaDirection, 'down', 'direction down');
  
  for (let i = 0; i < 30; i++) {
    animator.update([enemy], 100);
  }
  
  const data2 = getAnimatedHealthBarRenderData(enemy, animator);
  assertEqual(data2.animatingDelta, false, 'not animating at target');
  assertEqual(data2.deltaDirection, 'none', 'direction none');
  
  passed++;
}

runTests();
console.log('\nAll tests passed!');
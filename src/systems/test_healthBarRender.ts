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

import { Enemy, createEnemy, applyEnemyVariant, applyStatusEffect, StatusEffectType } from '../entities/enemy';
import { EnemyVariant } from '../content/enemyDefinitions';
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
  const baseEnemy = createEnemy(1, EnemyType.ScoutBeetle, path);
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
  assertEqual(getHealthBarWidth(EnemyType.ScoutBeetle), 30, 'red mushroom width');
  assertEqual(getHealthBarWidth(EnemyType.PaleMoth), 40, 'shelled snail width');
  assertEqual(getHealthBarWidth(EnemyType.BulwarkBeetle), 38, 'armored beetle width');
  assertEqual(getHealthBarWidth(EnemyType.WardMoth), 35, 'rainbow stag width');
  assertEqual(getHealthBarWidth(EnemyType.IronCaterpillar), 32, 'black widow width');
  
  passed++;
}

function getHealthBarHeightTests() {
  console.log('Testing getHealthBarHeight...');
  
  assertEqual(getHealthBarHeight(), 4, 'default height');
  assertEqual(getHealthBarHeight(EnemyType.ScoutBeetle), 4, 'red mushroom height');
  assertEqual(getHealthBarHeight(EnemyType.PaleMoth), 6, 'shelled snail height');
  assertEqual(getHealthBarHeight(EnemyType.BulwarkBeetle), 6, 'armored beetle height');
  assertEqual(getHealthBarHeight(EnemyType.WardMoth), 5, 'rainbow stag height');
  
  passed++;
}

function getHealthBarOffsetYTests() {
  console.log('Testing getHealthBarOffsetY...');
  
  assertEqual(getHealthBarOffsetY(), -15, 'default offset');
  assertEqual(getHealthBarOffsetY(EnemyType.ScoutBeetle), -15, 'red mushroom offset');
  assertEqual(getHealthBarOffsetY(EnemyType.PaleMoth), -20, 'shelled snail offset');
  assertEqual(getHealthBarOffsetY(EnemyType.BulwarkBeetle), -18, 'armored beetle offset');
  assertEqual(getHealthBarOffsetY(EnemyType.WardMoth), -16, 'rainbow stag offset');
  
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
  assertEqual(shouldShowHealthBar(createMockEnemy({ hp: 100, maxHp: 100, statusEffects: [] }), true), false, 'regular enemy stays hidden even when showAlways is requested');
  assertEqual(shouldShowHealthBar(createMockEnemy({ hp: 50, maxHp: 100, statusEffects: [] }), false), false, 'damaged regular enemy stays hidden');
  
  const enemyWithEffect = createMockEnemy({ hp: 100, maxHp: 100, statusEffects: [] });
  applyStatusEffect(enemyWithEffect, StatusEffectType.Slow, 5000, 0.3);
  assertEqual(shouldShowHealthBar(enemyWithEffect, false), false, 'regular enemy with effect stays hidden');

  const boss = createEnemy(2, EnemyType.WardMoth, createMockPath());
  applyEnemyVariant(boss, EnemyVariant.Boss);
  assertEqual(shouldShowHealthBar(boss, false), true, 'boss health bar is visible at full health');
  
  passed++;
}

function getHealthBarRenderDataTests() {
  console.log('Testing getHealthBarRenderData...');
  
  let data = getHealthBarRenderData(createMockEnemy({ alive: false }));
  assertEqual(data.isVisible, false, 'dead invisible');
  assertEqual(data.width, 0, 'dead width');
  assertEqual(data.height, 0, 'dead height');
  
  const boss = createEnemy(2, EnemyType.WardMoth, createMockPath());
  applyEnemyVariant(boss, EnemyVariant.Boss);
  boss.layers[0].hp = 0;
  boss.layers[1].hp = 20;
  boss.currentLayerIndex = 1;
  boss.hp = 20;
  data = getHealthBarRenderData(boss);
  assertEqual(data.isVisible, true, 'damaged visible');
  assertEqual(data.label, 'Elder Ward Moth', 'boss label');
  assert(data.position.y > 56, 'boss bar sits below the top HUD');
  const bossBounds = {
    left: data.position.x - data.width / 2,
    right: data.position.x + data.width / 2,
    top: data.position.y - data.height / 2,
    bottom: data.position.y + data.height / 2,
  };
  const enemyCountBounds = { left: 20, right: 120, top: 75, bottom: 105 };
  assert(
    bossBounds.right <= enemyCountBounds.left
      || bossBounds.left >= enemyCountBounds.right
      || bossBounds.bottom <= enemyCountBounds.top
      || bossBounds.top >= enemyCountBounds.bottom,
    'boss bar does not overlap the enemy counter model bounds',
  );
  assertEqual(data.enemyId, 2, 'enemy id');
  assertEqual(data.currentHp, 20, 'current hp');
  assertEqual(data.maxHp, 48, 'max hp');
  assertApproxEqual(data.healthPercent, 20 / 48, 0.001, 'health percent');
  assertEqual(data.healthState, HealthState.Damaged, 'damaged state');
  assertEqual(data.fillColor, '#FFC107', 'damaged color');

  boss.layers[0].hp = 0;
  boss.layers[1].hp = 12;
  boss.currentLayerIndex = 1;
  boss.hp = 999;
  boss.maxHp = 999;
  data = getHealthBarRenderData(boss);
  assertEqual(data.currentHp, 12, 'boss current HP aggregates remaining layer HP');
  assertEqual(data.maxHp, 48, 'boss max HP aggregates all layer maxima');
  assertEqual(data.healthPercent, 0.25, 'boss percent uses aggregate layer HP');
  assertEqual(data.layerFractions, [0, 0.5], 'boss bar exposes each layer state');
  
  boss.layers[1].hp = 10;
  boss.hp = 10;
  data = getHealthBarRenderData(boss);
  assertEqual(data.healthState, HealthState.Critical, 'critical state');
  assertEqual(data.fillColor, '#F44336', 'critical color');
  
  boss.layers[0].hp = boss.layers[0].maxHp;
  boss.layers[1].hp = boss.layers[1].maxHp;
  boss.currentLayerIndex = 0;
  boss.hp = boss.maxHp;
  data = getHealthBarRenderData(boss, { showAlways: true });
  assertEqual(data.healthState, HealthState.Full, 'full state');
  assertEqual(data.fillColor, '#4CAF50', 'full color');
  
  boss.hp = 50;
  data = getHealthBarRenderData(boss, {
    customWidth: 50,
    customHeight: 8,
    customOffsetY: -20,
  });
  assertEqual(data.width, 50, 'custom width');
  assertEqual(data.height, 8, 'custom height');
  assertEqual(data.offsetY, -20, 'custom offset');
  
  const enemyWithStun = createEnemy(3, EnemyType.WardMoth, createMockPath());
  applyEnemyVariant(enemyWithStun, EnemyVariant.Boss);
  enemyWithStun.hp = 50;
  enemyWithStun.maxHp = 100;
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
  assertEqual(result.totalVisible, 0, 'regular enemies are filtered even when damaged');

  const boss = createEnemy(4, EnemyType.WardMoth, createMockPath());
  applyEnemyVariant(boss, EnemyVariant.Boss);
  result = getHealthBarsRenderData([...enemies, boss]);
  assertEqual(result.totalVisible, 1, 'only boss health bar is visible');
  assertEqual(result.healthBars[0].enemyId, 4, 'boss id');
  
  result = getHealthBarsRenderData(enemies, { showAlways: true });
  assertEqual(result.totalVisible, 0, 'showAlways does not expose regular enemy health bars');
  
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

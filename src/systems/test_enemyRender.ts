import { createEnemy, applyEnemyVariant, applyStatusEffect, StatusEffectType, Enemy } from '../entities/enemy';
import { Path, createDefaultPath } from './path';
import { EnemyType, ENEMY_STATS } from './wave';
import { EnemyFamily, EnemyTrait, EnemyVariant } from '../content/enemyDefinitions';
import {
  EnemyRenderData,
  EnemyStatusEffectRender,
  EnemyAnimationState,
  getEnemyVisualConfig,
  getEnemyColors,
  getEnemyBodyRadius,
  getEnemyBodyShape,
  hasEnemyShell,
  hasEnemyWings,
  getEnemyDecorationType,
  getEnemyRenderData,
  getEnemiesRenderData,
  getAnimationState,
  getAnimatedEnemyRenderData,
  getEnemyDecorations,
  getCamoIndicator,
  getStatusEffectAuras,
  isEnemyFullyVisible,
  getEnemyTypeInfo,
} from './enemyRender';

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

let testsPassed = 0;
let testsFailed = 0;

function runTest(name: string, fn: () => void) {
  try {
    fn();
    testsPassed++;
    console.log(`✓ ${name}`);
  } catch (e: any) {
    testsFailed++;
    console.log(`✗ ${name}: ${e.message}`);
  }
}

const path = createDefaultPath();

console.log('=== Enemy Render System Tests ===\n');

runTest('getEnemyVisualConfig returns correct config for RedMushroom', () => {
  const config = getEnemyVisualConfig(EnemyType.ScoutBeetle);
  assert(config.primary === '#E74C3C', 'primary color should be #E74C3C');
  assert(config.bodyRadius === 10, 'bodyRadius should be 10');
  assert(config.bodyShape === 'circle', 'bodyShape should be circle');
});

runTest('getEnemyVisualConfig returns correct config for ArmoredBeetle', () => {
  const config = getEnemyVisualConfig(EnemyType.BulwarkBeetle);
  assert(config.primary === '#5D6D7E', 'primary color should be #5D6D7E');
  assert(config.bodyRadius === 18, 'bodyRadius should be 18');
  assert(config.bodyShape === 'shield', 'bodyShape should be shield');
  assert(config.hasShell === true, 'should have shell');
});

runTest('getEnemyVisualConfig returns correct config for ShelledSnail', () => {
  const config = getEnemyVisualConfig(EnemyType.PaleMoth);
  assert(config.bodyShape === 'spiral', 'bodyShape should be spiral');
  assert(config.hasShell === true, 'should have shell');
});

runTest('getEnemyVisualConfig returns correct config for YellowWasp', () => {
  const config = getEnemyVisualConfig(EnemyType.CrawlerCaterpillar);
  assert(config.hasWings === true, 'should have wings');
  assert(config.animationSpeed === 1.4, 'animation speed should be 1.4');
});

runTest('getEnemyVisualConfig falls back to RedMushroom for unknown types', () => {
  const config = getEnemyVisualConfig('unknown' as EnemyType);
  assert(config.bodyRadius === 10, 'should fallback to RedMushroom bodyRadius');
});

runTest('getEnemyColors returns colors for BlueBeetle', () => {
  const colors = getEnemyColors(EnemyType.DartWasp);
  assert(colors.primary === '#3498DB', 'primary should be #3498DB');
  assert(colors.secondary === '#2980B9', 'secondary should be #2980B9');
  assert(colors.accent === '#AED6F1', 'accent should be #AED6F1');
  assert(colors.glow === '#D4E6F1', 'glow should be #D4E6F1');
});

runTest('getEnemyBodyRadius returns correct radius for each type', () => {
  assert(getEnemyBodyRadius(EnemyType.ScoutBeetle) === 10, 'RedMushroom radius should be 10');
  assert(getEnemyBodyRadius(EnemyType.BulwarkBeetle) === 18, 'ArmoredBeetle radius should be 18');
  assert(getEnemyBodyRadius(EnemyType.PaleMoth) === 16, 'ShelledSnail radius should be 16');
  assert(getEnemyBodyRadius(EnemyType.ShellBeetle) === 8, 'GreenCaterpillar radius should be 8');
});

runTest('getEnemyBodyShape returns correct body shape for each type', () => {
  assert(getEnemyBodyShape(EnemyType.ScoutBeetle) === 'circle', 'RedMushroom should be circle');
  assert(getEnemyBodyShape(EnemyType.DartWasp) === 'oval', 'BlueBeetle should be oval');
  assert(getEnemyBodyShape(EnemyType.ShellBeetle) === 'elongated', 'GreenCaterpillar should be elongated');
  assert(getEnemyBodyShape(EnemyType.BulwarkBeetle) === 'shield', 'ArmoredBeetle should be shield');
  assert(getEnemyBodyShape(EnemyType.PaleMoth) === 'spiral', 'ShelledSnail should be spiral');
});

runTest('hasEnemyShell returns true for shell enemies', () => {
  assert(hasEnemyShell(EnemyType.DartWasp) === true, 'BlueBeetle should have shell');
  assert(hasEnemyShell(EnemyType.BulwarkBeetle) === true, 'ArmoredBeetle should have shell');
  assert(hasEnemyShell(EnemyType.PaleMoth) === true, 'ShelledSnail should have shell');
});

runTest('hasEnemyShell returns false for non-shell enemies', () => {
  assert(hasEnemyShell(EnemyType.ScoutBeetle) === false, 'RedMushroom should not have shell');
  assert(hasEnemyShell(EnemyType.ShellBeetle) === false, 'GreenCaterpillar should not have shell');
  assert(hasEnemyShell(EnemyType.CrawlerCaterpillar) === false, 'YellowWasp should not have shell');
});

runTest('hasEnemyWings returns true for winged enemies', () => {
  assert(hasEnemyWings(EnemyType.CrawlerCaterpillar) === true, 'YellowWasp should have wings');
  assert(hasEnemyWings(EnemyType.VeilWasp) === true, 'WhiteMoth should have wings');
});

runTest('hasEnemyWings returns false for non-winged enemies', () => {
  assert(hasEnemyWings(EnemyType.ScoutBeetle) === false, 'RedMushroom should not have wings');
  assert(hasEnemyWings(EnemyType.DartWasp) === false, 'BlueBeetle should not have wings');
  assert(hasEnemyWings(EnemyType.BulwarkBeetle) === false, 'ArmoredBeetle should not have wings');
});

runTest('getEnemyDecorationType returns correct decoration type', () => {
  assert(getEnemyDecorationType(EnemyType.DartWasp) === 'shell', 'BlueBeetle should be shell');
  assert(getEnemyDecorationType(EnemyType.CrawlerCaterpillar) === 'wings', 'YellowWasp should be wings');
  assert(getEnemyDecorationType(EnemyType.VeilWasp) === 'wings', 'WhiteMoth should be wings');
});

runTest('getEnemyRenderData returns basic render data for an enemy', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  const renderData = getEnemyRenderData(enemy);
  assert(renderData.id === 1, 'id should be 1');
  assert(renderData.enemyType === EnemyType.ScoutBeetle, 'enemyType should be RedMushroom');
  assert(renderData.position.x === 0, 'position x should be 0');
  assert(renderData.primaryColor === '#E74C3C', 'primaryColor should be #E74C3C');
  assert(renderData.isAlive === true, 'isAlive should be true');
  assert(renderData.isCamo === false, 'isCamo should be false');
  assert(renderData.animationState === EnemyAnimationState.Normal, 'animationState should be Normal');
});

runTest('getEnemyRenderData sets isCamo true for Veil Wasp and Pale Moth', () => {
  const veilWasp = createEnemy(1, EnemyType.VeilWasp, path);
  const paleMoth = createEnemy(2, EnemyType.PaleMoth, path);
  const veilWaspRender = getEnemyRenderData(veilWasp);
  const paleMothRender = getEnemyRenderData(paleMoth);
  assert(veilWaspRender.isCamo === true, 'Veil Wasp should be camo');
  assert(paleMothRender.isCamo === true, 'Pale Moth should be camo');
});

runTest('getEnemyRenderData exposes canonical layers, family, traits, and boss health-bar visibility', () => {
  const shell = createEnemy(7000, EnemyType.ShellBeetle, createDefaultPath());
  const shellRender = getEnemyRenderData(shell);
  assertEqual(shellRender.layersRemaining, 2, 'renderer receives layer count');
  assertEqual(shellRender.totalLayers, 2, 'renderer receives total layers');
  assertEqual(shellRender.family, EnemyFamily.Beetle, 'renderer receives canonical family');
  assertEqual(shellRender.traits, [] as EnemyTrait[], 'renderer receives canonical traits');
  assertEqual(shellRender.isBoss, false, 'regular enemy is not a boss');
  assertEqual(shellRender.showHealthBar, false, 'regular enemy has no health bar');

  const boss = createEnemy(7001, EnemyType.WardMoth, createDefaultPath());
  applyEnemyVariant(boss, EnemyVariant.Boss);
  const bossRender = getEnemyRenderData(boss);
  assertEqual(bossRender.isBoss, true, 'Boss variant is marked as boss');
  assertEqual(bossRender.showHealthBar, true, 'boss has health bar');
  assert(bossRender.traits.includes(EnemyTrait.Shielded), 'boss retains canonical traits');
});

runTest('getEnemyRenderData exposes Metal armor trait for Bulwark Beetle and Iron Caterpillar', () => {
  const bulwarkBeetle = createEnemy(3, EnemyType.BulwarkBeetle, path);
  const ironCaterpillar = createEnemy(4, EnemyType.IronCaterpillar, path);
  const bulwarkRender = getEnemyRenderData(bulwarkBeetle) as any;
  const ironRender = getEnemyRenderData(ironCaterpillar) as any;
  assert(bulwarkRender.isMetal === true, 'Bulwark Beetle should render as metal');
  assert(ironRender.isMetal === true, 'Iron Caterpillar should render as metal');
  assert(bulwarkRender.traits.includes('metal'), 'Bulwark Beetle render data should include Metal trait');
  assert(bulwarkRender.armorColor === '#C8D0D8', 'Metal render data should expose armor color');
});

runTest('getEnemyRenderData exposes active Shielded trait for RainbowStag', () => {
  const shieldedEnemy = createEnemy(5, EnemyType.WardMoth, path);
  const shieldedRender = getEnemyRenderData(shieldedEnemy) as any;
  assert(shieldedRender.isShielded === true, 'RainbowStag should render as shielded');
  assert(shieldedRender.shieldActive === true, 'RainbowStag should start with visible shield active');
  assert(shieldedRender.traits.includes('shielded'), 'RainbowStag render data should include Shielded trait');
  assert(shieldedRender.shieldColor === 'rgba(124, 218, 255, 0.75)', 'Shielded render data should expose shield color');
});

runTest('getEnemyRenderData exposes active Swarm-linked trait for PinkLadybug', () => {
  const swarmEnemy = createEnemy(6, EnemyType.SwarmWasp, path) as any;
  swarmEnemy.swarmLinkedActive = true;
  swarmEnemy.swarmLinkCount = 3;
  const swarmRender = getEnemyRenderData(swarmEnemy) as any;
  assert(swarmRender.isSwarmLinked === true, 'PinkLadybug should render as Swarm-linked');
  assert(swarmRender.swarmLinkedActive === true, 'PinkLadybug should expose active swarm bonus');
  assert(swarmRender.swarmLinkCount === 3, 'Swarm-linked render data should include nearby count');
  assert(swarmRender.traits.includes('swarm_linked'), 'PinkLadybug render data should include Swarm-linked trait');
  assert(swarmRender.swarmLinkColor === 'rgba(245, 94, 121, 0.72)', 'Swarm-linked render data should expose link color');
});

runTest('getEnemyRenderData returns Dead animation state for dead enemy', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  enemy.alive = false;
  const renderData = getEnemyRenderData(enemy);
  assert(renderData.animationState === EnemyAnimationState.Dead, 'animationState should be Dead');
});

runTest('getEnemyRenderData returns Stunned animation state when stunned', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  applyStatusEffect(enemy, StatusEffectType.Stun, 1000, 1.0);
  const renderData = getEnemyRenderData(enemy);
  assert(renderData.animationState === EnemyAnimationState.Stunned, 'animationState should be Stunned');
});

runTest('getEnemyRenderData returns Slowed animation state when slowed', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  applyStatusEffect(enemy, StatusEffectType.Slow, 1000, 0.5);
  const renderData = getEnemyRenderData(enemy);
  assert(renderData.animationState === EnemyAnimationState.Slowed, 'animationState should be Slowed');
});

runTest('getEnemyRenderData returns Poisoned animation state when poisoned', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  applyStatusEffect(enemy, StatusEffectType.Poison, 1000, 10);
  const renderData = getEnemyRenderData(enemy);
  assert(renderData.animationState === EnemyAnimationState.Poisoned, 'animationState should be Poisoned');
});

runTest('getEnemyRenderData includes status effect renders', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  applyStatusEffect(enemy, StatusEffectType.Slow, 1000, 0.5);
  applyStatusEffect(enemy, StatusEffectType.Poison, 2000, 10);
  const renderData = getEnemyRenderData(enemy);
  assert(renderData.statusEffects.length === 2, 'should have 2 status effects');
  assert(renderData.statusEffects[0].type === StatusEffectType.Slow, 'first effect should be Slow');
  assert(renderData.statusEffects[0].color === '#3498DB', 'Slow color should be #3498DB');
  assert(renderData.statusEffects[1].type === StatusEffectType.Poison, 'second effect should be Poison');
  assert(renderData.statusEffects[1].color === '#9B59B6', 'Poison color should be #9B59B6');
});

runTest('getEnemyRenderData uses custom pathProgress if provided', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  const renderData = getEnemyRenderData(enemy, { pathProgress: 0.5 });
  assert(renderData.pathProgress === 0.5, 'pathProgress should be 0.5');
});

runTest('getEnemyRenderData uses custom facingAngle if provided', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  const renderData = getEnemyRenderData(enemy, { facingAngle: Math.PI / 4 });
  assert(renderData.facingAngle === Math.PI / 4, 'facingAngle should be PI/4');
});

runTest('getEnemiesRenderData returns render data for multiple enemies', () => {
  const enemy1 = createEnemy(1, EnemyType.ScoutBeetle, path);
  const enemy2 = createEnemy(2, EnemyType.DartWasp, path);
  const collection = getEnemiesRenderData([enemy1, enemy2]);
  assert(collection.totalCount === 2, 'totalCount should be 2');
  assert(collection.aliveCount === 2, 'aliveCount should be 2');
  assert(collection.enemies.length === 2, 'enemies array should have 2 items');
});

runTest('getEnemiesRenderData tracks alive count correctly', () => {
  const enemy1 = createEnemy(1, EnemyType.ScoutBeetle, path);
  const enemy2 = createEnemy(2, EnemyType.DartWasp, path);
  enemy2.alive = false;
  const collection = getEnemiesRenderData([enemy1, enemy2]);
  assert(collection.aliveCount === 1, 'aliveCount should be 1');
});

runTest('getEnemiesRenderData tracks camo count correctly', () => {
  const enemy1 = createEnemy(1, EnemyType.ScoutBeetle, path);
  const enemy2 = createEnemy(2, EnemyType.VeilWasp, path);
  const enemy3 = createEnemy(3, EnemyType.PaleMoth, path);
  const collection = getEnemiesRenderData([enemy1, enemy2, enemy3]);
  assert(collection.camoCount === 2, 'camoCount should be 2');
});

runTest('getEnemiesRenderData uses pathProgressMap when provided', () => {
  const enemy1 = createEnemy(1, EnemyType.ScoutBeetle, path);
  const pathProgressMap = new Map([[1, 0.75]]);
  const collection = getEnemiesRenderData([enemy1], { pathProgressMap });
  assert(collection.enemies[0].pathProgress === 0.75, 'pathProgress should be 0.75');
});

runTest('getAnimationState returns Normal animation values', () => {
  const anim = getAnimationState(EnemyType.ScoutBeetle, EnemyAnimationState.Normal, 1000);
  assert(anim.scale > 0.9 && anim.scale < 1.1, 'scale should be around 1.0');
  assert(anim.glowIntensity > 0, 'glowIntensity should be > 0');
});

runTest('getAnimationState returns Moving animation values', () => {
  const anim = getAnimationState(EnemyType.ScoutBeetle, EnemyAnimationState.Moving, 1000);
  assert(anim.scale > 0.9, 'scale should be > 0.9');
  assert(anim.bobOffset > 0, 'bobOffset should be > 0');
});

runTest('getAnimationState returns Slowed animation values', () => {
  const anim = getAnimationState(EnemyType.ScoutBeetle, EnemyAnimationState.Slowed, 1000);
  assert(anim.scale < 1.0, 'scale should be < 1.0');
  assert(anim.glowIntensity > 0.3, 'glowIntensity should be > 0.3');
});

runTest('getAnimationState returns Poisoned animation values', () => {
  const anim = getAnimationState(EnemyType.ScoutBeetle, EnemyAnimationState.Poisoned, 1000);
  assert(anim.glowIntensity > 0.4, 'glowIntensity should be > 0.4');
});

runTest('getAnimationState returns Stunned animation with rotation', () => {
  const anim = getAnimationState(EnemyType.ScoutBeetle, EnemyAnimationState.Stunned, 1000);
  assert(anim.scale < 1.0, 'scale should be < 1.0');
  assert(anim.rotation !== 0, 'rotation should not be 0');
});

runTest('getAnimationState returns Dead animation with scale 0', () => {
  const anim = getAnimationState(EnemyType.ScoutBeetle, EnemyAnimationState.Dead, 1000);
  assert(anim.scale === 0, 'scale should be 0');
  assert(anim.glowIntensity === 0, 'glowIntensity should be 0');
});

runTest('getAnimatedEnemyRenderData returns render data with animation applied', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  const renderData = getAnimatedEnemyRenderData(enemy, 1000);
  assert(renderData.id === 1, 'id should be 1');
  assert(renderData.scale > 0, 'scale should be > 0');
  assert(typeof renderData.rotation === 'number', 'rotation should be a number');
});

runTest('getEnemyDecorations returns decorations for caterpillar', () => {
  const decorations = getEnemyDecorations(EnemyType.ShellBeetle);
  assert(decorations.length > 0, 'should have decorations');
  assert(decorations.some(d => d.type === 'antenna'), 'should have antenna decorations');
  assert(decorations.some(d => d.type === 'tail'), 'should have tail decorations');
});

runTest('getEnemyDecorations returns decorations for BlackWidow', () => {
  const decorations = getEnemyDecorations(EnemyType.IronCaterpillar);
  assert(decorations.some(d => d.type === 'antenna'), 'should have antenna decorations');
});

runTest('getEnemyDecorations returns shell decoration for ShelledSnail', () => {
  const decorations = getEnemyDecorations(EnemyType.PaleMoth);
  assert(decorations.some(d => d.type === 'shell'), 'should have shell decorations');
});

runTest('getEnemyDecorations returns wing decorations for YellowWasp', () => {
  const decorations = getEnemyDecorations(EnemyType.CrawlerCaterpillar);
  assert(decorations.some(d => d.type === 'wing_left'), 'should have wing_left');
  assert(decorations.some(d => d.type === 'wing_right'), 'should have wing_right');
});

runTest('getEnemyDecorations returns empty decorations for RedMushroom', () => {
  const decorations = getEnemyDecorations(EnemyType.ScoutBeetle);
  assert(decorations.length === 0, 'should have no decorations');
});

runTest('getCamoIndicator returns not visible for non-camo enemy', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  const indicator = getCamoIndicator(enemy);
  assert(indicator.isVisible === false, 'should not be visible');
});

runTest('getCamoIndicator returns visible for camo enemy', () => {
  const enemy = createEnemy(1, EnemyType.VeilWasp, path);
  const indicator = getCamoIndicator(enemy);
  assert(indicator.isVisible === true, 'should be visible');
});

runTest('getCamoIndicator returns revealed color when isRevealed is true', () => {
  const enemy = createEnemy(1, EnemyType.VeilWasp, path);
  const indicator = getCamoIndicator(enemy, true);
  assert(indicator.revealColor === '#F1C40F', 'revealColor should be #F1C40F');
  assert(indicator.opacity === 0.8, 'opacity should be 0.8');
});

runTest('getCamoIndicator returns hidden color when isRevealed is false', () => {
  const enemy = createEnemy(1, EnemyType.VeilWasp, path);
  const indicator = getCamoIndicator(enemy, false);
  assert(indicator.revealColor === '#1ABC9C', 'revealColor should be #1ABC9C');
  assert(indicator.opacity === 0.4, 'opacity should be 0.4');
});

runTest('getStatusEffectAuras returns empty array for enemy with no status effects', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  const auras = getStatusEffectAuras(enemy, 1000);
  assert(auras.length === 0, 'should have no auras');
});

runTest('getStatusEffectAuras returns auras for slow effect', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  applyStatusEffect(enemy, StatusEffectType.Slow, 1000, 0.5);
  const auras = getStatusEffectAuras(enemy, 1000);
  assert(auras.length === 1, 'should have 1 aura');
  assert(auras[0].type === StatusEffectType.Slow, 'type should be Slow');
  assert(auras[0].color === '#3498DB', 'color should be #3498DB');
  assert(auras[0].radius > 10, 'radius should be > 10');
});

runTest('getStatusEffectAuras returns auras for poison effect', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  applyStatusEffect(enemy, StatusEffectType.Poison, 1000, 10);
  const auras = getStatusEffectAuras(enemy, 1000);
  assert(auras.length === 1, 'should have 1 aura');
  assert(auras[0].type === StatusEffectType.Poison, 'type should be Poison');
  assert(auras[0].color === '#9B59B6', 'color should be #9B59B6');
});

runTest('getStatusEffectAuras returns auras for stun effect', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  applyStatusEffect(enemy, StatusEffectType.Stun, 1000, 1.0);
  const auras = getStatusEffectAuras(enemy, 1000);
  assert(auras.length === 1, 'should have 1 aura');
  assert(auras[0].type === StatusEffectType.Stun, 'type should be Stun');
  assert(auras[0].color === '#F39C12', 'color should be #F39C12');
});

runTest('getStatusEffectAuras returns multiple auras for multiple effects', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  applyStatusEffect(enemy, StatusEffectType.Slow, 1000, 0.5);
  applyStatusEffect(enemy, StatusEffectType.Poison, 1000, 10);
  const auras = getStatusEffectAuras(enemy, 1000);
  assert(auras.length === 2, 'should have 2 auras');
});

runTest('isEnemyFullyVisible returns true for non-camo enemy', () => {
  const enemy = createEnemy(1, EnemyType.ScoutBeetle, path);
  assert(isEnemyFullyVisible(enemy) === true, 'should be fully visible');
  assert(isEnemyFullyVisible(enemy, false) === true, 'should be fully visible even with false');
  assert(isEnemyFullyVisible(enemy, true) === true, 'should be fully visible even with true');
});

runTest('isEnemyFullyVisible returns false for camo enemy without reveal', () => {
  const enemy = createEnemy(1, EnemyType.VeilWasp, path);
  assert(isEnemyFullyVisible(enemy, false) === false, 'should not be fully visible');
});

runTest('isEnemyFullyVisible returns true for camo enemy with reveal', () => {
  const enemy = createEnemy(1, EnemyType.VeilWasp, path);
  assert(isEnemyFullyVisible(enemy, true) === true, 'should be fully visible when revealed');
});

runTest('getEnemyTypeInfo returns info for RedMushroom', () => {
  const info = getEnemyTypeInfo(EnemyType.ScoutBeetle);
  assert(info.name === 'Red Mushroom', 'name should be Red Mushroom');
  assert(info.difficulty === 1, 'difficulty should be 1');
});

runTest('getEnemyTypeInfo returns info for ShelledSnail', () => {
  const info = getEnemyTypeInfo(EnemyType.PaleMoth);
  assert(info.name === 'Shelled Snail', 'name should be Shelled Snail');
  assert(info.difficulty === 10, 'difficulty should be 10');
});

runTest('getEnemyTypeInfo falls back to RedMushroom for unknown types', () => {
  const info = getEnemyTypeInfo('unknown' as EnemyType);
  assert(info.difficulty === 1, 'difficulty should be 1 (fallback)');
});

console.log(`\n=== Test Results ===`);
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);
console.log(`Total: ${testsPassed + testsFailed}`);

if (testsFailed > 0) {
  process.exit(1);
}

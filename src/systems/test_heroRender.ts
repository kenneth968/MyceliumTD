import { getHeroVisualConfig, getHeroAnimationState, getHeroRenderData, getHeroesRenderData, getHeroHealthBarColor, getHeroBodyShape, getHeroDecorationColor, getHeroLevelLabel, isHeroAbilityReady, getHeroAbilityProgress, HeroAnimationState, HeroVisualStyle } from '../systems/heroRender';
import { createHero } from '../entities/hero';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
  try {
    if (fn()) {
      console.log(`PASS: ${name}`);
      passed++;
    } else {
      console.log(`FAIL: ${name}`);
      failed++;
    }
  } catch (e: any) {
    console.log(`ERROR: ${name} - ${e.message}`);
    failed++;
  }
}

// Test getHeroVisualConfig
test('getHeroVisualConfig returns Knight config', () => {
  const config = getHeroVisualConfig(HeroVisualStyle.Knight);
  return config.bodyShape === 'hexagon' && config.primaryColor === '#8B4513' && config.hasShield === true;
});

test('getHeroVisualConfig returns Shroom config', () => {
  const config = getHeroVisualConfig(HeroVisualStyle.Shroom);
  return config.bodyShape === 'circle' && config.primaryColor === '#9932CC';
});

test('getHeroVisualConfig returns Insect config', () => {
  const config = getHeroVisualConfig(HeroVisualStyle.Insect);
  return config.bodyShape === 'diamond' && config.primaryColor === '#2F4F4F';
});

// Test getHeroAnimationState
test('getHeroAnimationState returns Dead for dead hero', () => {
  const hero = createHero(100, 100);
  hero.alive = false;
  return getHeroAnimationState(hero) === HeroAnimationState.Dead;
});

test('getHeroAnimationState returns Selected for selected hero', () => {
  const hero = createHero(100, 100);
  hero.selected = true;
  return getHeroAnimationState(hero) === HeroAnimationState.Selected;
});

test('getHeroAnimationState returns Moving for moving hero', () => {
  const hero = createHero(100, 100);
  hero.isMoving = true;
  return getHeroAnimationState(hero) === HeroAnimationState.Moving;
});

test('getHeroAnimationState returns Idle by default', () => {
  const hero = createHero(100, 100);
  return getHeroAnimationState(hero) === HeroAnimationState.Idle;
});

// Test getHeroRenderData
test('getHeroRenderData returns all required fields', () => {
  const hero = createHero(100, 100);
  const rd = getHeroRenderData(hero);
  return rd.id === hero.id && 
         rd.position.x === hero.position.x && 
         rd.health === hero.hp && 
         rd.level === 1 && 
         rd.selected === false;
});

test('getHeroRenderData calculates health percent', () => {
  const hero = createHero(100, 100);
  hero.hp = 50;
  const rd = getHeroRenderData(hero);
  return Math.abs(rd.healthPercent - 0.5) < 0.01;
});

test('getHeroRenderData with custom style', () => {
  const hero = createHero(100, 100);
  const rd = getHeroRenderData(hero, HeroVisualStyle.Shroom);
  return rd.primaryColor === '#9932CC' && rd.bodyRadius === 18;
});

// Test getHeroesRenderData
test('getHeroesRenderData returns only alive heroes', () => {
  const heroes = [createHero(100, 100), createHero(200, 200)];
  heroes[1].alive = false;
  const result = getHeroesRenderData(heroes);
  return result.length === 1;
});

// Test getHeroHealthBarColor
test('getHeroHealthBarColor returns green for high health', () => {
  return getHeroHealthBarColor(0.7) === '#32CD32';
});

test('getHeroHealthBarColor returns yellow for medium', () => {
  return getHeroHealthBarColor(0.4) === '#FFD700';
});

test('getHeroHealthBarColor returns red for low', () => {
  return getHeroHealthBarColor(0.2) === '#FF4500';
});

// Test getHeroBodyShape
test('getHeroBodyShape returns correct shapes', () => {
  return getHeroBodyShape(HeroVisualStyle.Knight) === 'hexagon' &&
         getHeroBodyShape(HeroVisualStyle.Shroom) === 'circle' &&
         getHeroBodyShape(HeroVisualStyle.Insect) === 'diamond';
});

// Test getHeroDecorationColor
test('getHeroDecorationColor returns correct colors', () => {
  return getHeroDecorationColor(HeroVisualStyle.Knight) === '#FFD700' &&
         getHeroDecorationColor(HeroVisualStyle.Shroom) === '#FFFFFF' &&
         getHeroDecorationColor(HeroVisualStyle.Insect) === '#ADFF2F';
});

// Test getHeroLevelLabel
test('getHeroLevelLabel formats correctly', () => {
  return getHeroLevelLabel(1) === 'LV1' && getHeroLevelLabel(5) === 'LV5';
});

// Test isHeroAbilityReady
test('isHeroAbilityReady returns true when ready', () => {
  const hero = createHero(100, 100);
  hero.abilities[0].currentCooldown = 0;
  return isHeroAbilityReady(hero, 0) === true;
});

test('isHeroAbilityReady returns false on cooldown', () => {
  const hero = createHero(100, 100);
  hero.abilities[0].currentCooldown = 3000;
  return isHeroAbilityReady(hero, 0) === false;
});

test('isHeroAbilityReady returns false for invalid index', () => {
  const hero = createHero(100, 100);
  return isHeroAbilityReady(hero, 10) === false;
});

// Test getHeroAbilityProgress
test('getHeroAbilityProgress returns 1 for fresh ability', () => {
  const hero = createHero(100, 100);
  hero.abilities[0].currentCooldown = 0;
  return Math.abs(getHeroAbilityProgress(hero, 0) - 1) < 0.01;
});

test('getHeroAbilityProgress returns 0.5 for half-used', () => {
  const hero = createHero(100, 100);
  hero.abilities[0].currentCooldown = 2500;
  return Math.abs(getHeroAbilityProgress(hero, 0) - 0.5) < 0.01;
});

test('getHeroAbilityProgress returns 0 for just-used', () => {
  const hero = createHero(100, 100);
  hero.abilities[0].currentCooldown = 5000;
  return Math.abs(getHeroAbilityProgress(hero, 0) - 0) < 0.01;
});

console.log(`\n=== HeroRender Tests: ${passed} passed, ${failed} failed ===`);

if (failed > 0) {
  process.exit(1);
}
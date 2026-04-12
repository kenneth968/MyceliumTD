import { createHero, moveHeroTo, stopHero, selectHero, deselectHero, applyDamageToHero, healHero, useAbility, updateHeroAbilities, heroAttackEnemy, getHeroHealthPercent, addHeroXP, canUseAbility } from '../entities/hero';
import { createEnemy } from '../entities/enemy';
import { createDefaultPath } from './path';

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
  } catch (e) {
    console.log(`ERROR: ${name} - ${e}`);
    failed++;
  }
}

const path = createDefaultPath();

// Test createHero
test('createHero has correct initial stats', () => {
  const hero = createHero(100, 100);
  return hero.hp === 100 && hero.maxHp === 100 && hero.speed === 150 && hero.damage === 5;
});

test('createHero has 4 abilities', () => {
  const hero = createHero(100, 100);
  return hero.abilities.length === 4;
});

test('createHero has correct initial state', () => {
  const hero = createHero(100, 100);
  return hero.alive === true && hero.selected === false && hero.level === 1 && hero.xp === 0;
});

// Test moveHeroTo
test('moveHeroTo sets moving state', () => {
  const hero = createHero(100, 100);
  moveHeroTo(hero, 200, 200);
  return hero.isMoving === true && hero.moveTarget !== null;
});

test('stopHero clears movement', () => {
  const hero = createHero(100, 100);
  moveHeroTo(hero, 200, 200);
  stopHero(hero);
  return hero.isMoving === false && hero.moveTarget === null;
});

// Test selectHero/deselectHero
test('selectHero sets selected flag', () => {
  const hero = createHero(100, 100);
  selectHero(hero);
  return hero.selected === true;
});

test('deselectHero clears selected flag', () => {
  const hero = createHero(100, 100);
  selectHero(hero);
  deselectHero(hero);
  return hero.selected === false;
});

// Test applyDamageToHero
test('applyDamageToHero reduces HP', () => {
  const hero = createHero(100, 100);
  applyDamageToHero(hero, 30);
  return hero.hp === 70;
});

test('applyDamageToHero kills at 0 HP', () => {
  const hero = createHero(100, 100);
  const died = applyDamageToHero(hero, 150);
  return hero.hp === 0 && hero.alive === false && died === true;
});

test('applyDamageToHero returns false when survives', () => {
  const hero = createHero(100, 100);
  const died = applyDamageToHero(hero, 50);
  return died === false && hero.hp === 50;
});

// Test healHero
test('healHero increases HP', () => {
  const hero = createHero(100, 100);
  hero.hp = 50;
  healHero(hero, 30);
  return hero.hp === 80;
});

test('healHero does not exceed maxHp', () => {
  const hero = createHero(100, 100);
  hero.hp = 90;
  healHero(hero, 50);
  return hero.hp === hero.maxHp;
});

// Test canUseAbility
test('canUseAbility returns true when ready', () => {
  const hero = createHero(100, 100);
  hero.abilities[0].currentCooldown = 0;
  return canUseAbility(hero, 0) === true;
});

test('canUseAbility returns false on cooldown', () => {
  const hero = createHero(100, 100);
  hero.abilities[0].currentCooldown = 3000;
  return canUseAbility(hero, 0) === false;
});

// Test useAbility MushroomSpores
test('useAbility returns used true', () => {
  const hero = createHero(100, 100);
  const enemies = [createEnemy(1, 'red_mushroom' as any, path)];
  enemies[0].position = { x: 100, y: 100 };
  
  const result = useAbility(hero, 0, hero.position, enemies);
  return result.used === true;
});

test('useAbility returns cooldown set', () => {
  const hero = createHero(100, 100);
  hero.abilities[0].currentCooldown = 0;
  useAbility(hero, 0, hero.position, []);
  return hero.abilities[0].currentCooldown === 5000;
});

test('useAbility sets cooldown', () => {
  const hero = createHero(100, 100);
  hero.abilities[0].currentCooldown = 0;
  useAbility(hero, 0, hero.position, []);
  return hero.abilities[0].currentCooldown === 5000;
});

// Test updateHeroAbilities
test('updateHeroAbilities reduces cooldowns', () => {
  const hero = createHero(100, 100);
  hero.abilities[0].currentCooldown = 3000;
  updateHeroAbilities(hero, 1000);
  return hero.abilities[0].currentCooldown === 2000;
});

// Test heroAttackEnemy
test('heroAttackEnemy damages enemy in range', () => {
  const hero = createHero(100, 100);
  hero.position = { x: 100, y: 100 };
  const enemy = createEnemy(1, 'red_mushroom' as any, path);
  enemy.position = { x: 150, y: 100 };
  
  heroAttackEnemy(hero, enemy);
  return enemy.hp < enemy.maxHp;
});

test('heroAttackEnemy returns false when out of range', () => {
  const hero = createHero(100, 100);
  hero.position = { x: 100, y: 100 };
  const enemy = createEnemy(1, 'red_mushroom' as any, path);
  enemy.position = { x: 300, y: 100 };
  
  const result = heroAttackEnemy(hero, enemy);
  return result === false;
});

// Test getHeroHealthPercent
test('getHeroHealthPercent calculates correctly', () => {
  const hero = createHero(100, 100);
  hero.hp = 50;
  return getHeroHealthPercent(hero) === 0.5;
});

// Test addHeroXP
test('addHeroXP adds XP', () => {
  const hero = createHero(100, 100);
  addHeroXP(hero, 50);
  return hero.xp === 50;
});

test('addHeroXP levels up at threshold', () => {
  const hero = createHero(100, 100);
  addHeroXP(hero, 100);
  return hero.level === 2;
});

test('addHeroXP increases stats on level up', () => {
  const hero = createHero(100, 100);
  addHeroXP(hero, 100);
  return hero.maxHp === 120 && hero.damage === 7 && hero.speed === 160;
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);

if (failed > 0) {
  process.exit(1);
}
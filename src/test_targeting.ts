import {
  TargetingMode,
  getTarget,
  canTarget,
  getEnemiesInRange,
  createTower,
  createEnemy,
  Enemy,
  Tower,
} from './systems/targeting';
import { Path, createDefaultPath } from './systems/path';

const path = createDefaultPath();
console.log(`Path length: ${path.getTotalLength()}`);

const tower = createTower(1, 200, 200, 150, TargetingMode.First);
console.log(`Tower at (${tower.position.x}, ${tower.position.y}), range: ${tower.range}, mode: ${tower.targetingMode}`);

const enemies: Enemy[] = [
  createEnemy(1, 100, 10, 50, path),
  createEnemy(2, 300, 20, 40, path),
  createEnemy(3, 500, 30, 30, path),
  createEnemy(4, 700, 40, 20, path),
];

console.log('\nEnemies:');
enemies.forEach(e => {
  console.log(`  Enemy ${e.id}: hp=${e.hp}, pathDist=${e.pathDistance.toFixed(1)}, pos=(${e.position.x.toFixed(1)}, ${e.position.y.toFixed(1)})`);
});

console.log('\n--- Testing Targeting Modes ---');

const modes: TargetingMode[] = [
  TargetingMode.First,
  TargetingMode.Last,
  TargetingMode.Close,
  TargetingMode.Strong,
];

modes.forEach(mode => {
  tower.targetingMode = mode;
  const result = getTarget(tower, enemies, path);
  if (result.target) {
    console.log(`${mode}: Enemy ${result.target.id} (hp=${result.target.hp}, dist=${result.distance.toFixed(1)})`);
  } else {
    console.log(`${mode}: No target`);
  }
});

console.log('\n--- Testing Range Filtering ---');
const closeTower = createTower(2, 200, 200, 100, TargetingMode.First);
const rangeResult = getTarget(closeTower, enemies, path);
console.log(`Close tower (range=100): Enemy ${rangeResult.target?.id ?? 'none'}`);

console.log('\n--- Testing Dead Enemy Filtering ---');
enemies[0].alive = false;
enemies[0].hp = 0;
const deadResult = getTarget(tower, enemies, path);
console.log(`After killing enemy 1: Enemy ${deadResult.target?.id ?? 'none'}`);

console.log('\n--- Testing getEnemiesInRange ---');
enemies[0].alive = true;
enemies[0].hp = 10;
const inRange = getEnemiesInRange(tower, enemies);
console.log(`Enemies in range: [${inRange.map(e => e.id).join(', ')}]`);

console.log('\n--- All tests passed! ---');
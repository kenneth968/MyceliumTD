import { TowerType } from './entities/tower';
import {
  EvolutionPath,
  TowerStage,
  EVOLUTION_DEFINITIONS,
} from './content/evolutionDefinitions';
import {
  createTowerWithGrowth,
  evolveTower,
  getGrowthCosts,
  getTotalSellValue,
  matureTower,
} from './systems/upgrade';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✓ ${message}`);
    testsPassed++;
    return;
  }

  console.log(`  ✗ ${message}`);
  testsFailed++;
}

console.log('=== Tower Growth Tests ===\n');

console.log('Test: towers transition from Seedling to one exclusive Evolution');
const tower = createTowerWithGrowth(1, 0, 0, TowerType.Sporecap);
assert(tower.growth.stage === TowerStage.Seedling, 'new tower is a Seedling');

const seedlingDamage = tower.damage;
const seedlingRange = tower.range;
const seedlingFireRate = tower.fireRate;
const mature = matureTower(tower);
assert(mature.success && tower.growth.stage === TowerStage.Mature, 'tower matures once');
assert(tower.damage === seedlingDamage * 1.2, 'Mature applies the approved damage multiplier');
assert(tower.range === seedlingRange * 1.1, 'Mature applies the approved range multiplier');
assert(tower.fireRate === seedlingFireRate, 'Mature leaves fire-rate time unchanged');
assert(!matureTower(tower).success, 'Mature cannot be purchased twice');

const evolved = evolveTower(tower, EvolutionPath.Predator, true);
assert(evolved.success && tower.growth.stage === TowerStage.Evolved, 'Mature tower evolves');
assert(tower.growth.evolution === EvolutionPath.Predator, 'selected Evolution path is recorded');
assert(!evolveTower(tower, EvolutionPath.Specialist, true).success, 'Evolution is exclusive');

console.log('\nTest: Symbiote requires a mycelium connection');
const isolated = createTowerWithGrowth(2, 0, 0, TowerType.Puffball);
matureTower(isolated);
assert(!evolveTower(isolated, EvolutionPath.Symbiote, false).success, 'isolated tower cannot buy Symbiote');
assert(isolated.growth.stage === TowerStage.Mature, 'failed Symbiote purchase leaves tower Mature');
assert(evolveTower(isolated, EvolutionPath.Symbiote, true).success, 'connected tower can buy Symbiote');

console.log('\nTest: growth costs and sell value use total growth spending');
const costs = getGrowthCosts(TowerType.Puffball);
assert(costs.mature === 108, 'Mature costs floor(180 * 0.6)');
assert(costs.evolution === 180, 'Evolution costs the tower base cost');
assert(isolated.growth.totalSpent === costs.mature + costs.evolution, 'successful transitions accumulate their costs');
assert(getTotalSellValue(isolated) === 327, 'sell value refunds 70% of base and growth spending');

console.log('\nTest: all Evolution metadata is complete and immutable');
for (const towerType of Object.values(TowerType)) {
  const definitions = EVOLUTION_DEFINITIONS[towerType];
  assert(Object.isFrozen(definitions), `${towerType} Evolution definitions are immutable`);
  for (const path of Object.values(EvolutionPath)) {
    assert(definitions[path].path === path, `${towerType} defines ${path}`);
    assert(Object.isFrozen(definitions[path]), `${towerType} ${path} metadata is immutable`);
  }
}

console.log('\n=== Test Results ===');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

if (testsFailed > 0) {
  process.exit(1);
}

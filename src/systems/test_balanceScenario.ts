import assert from 'node:assert/strict';
import { ENEMY_DEFINITIONS, EnemyTrait } from '../content/enemyDefinitions';
import { TowerType } from '../entities/tower';
import { DEFAULT_ECONOMY_CONFIG } from './economy';
import { RELEASE_BALANCE_SCENARIOS, runBalanceScenario } from './balanceScenario';

// One quarter of the cheapest tower cost is the minimum useful correction buffer.
const MINIMUM_AFFORDABILITY_RESERVE = 25;

// Given the four fixed release command schedules
const precision = runBalanceScenario(RELEASE_BALANCE_SCENARIOS.precisionNetwork);
const control = runBalanceScenario(RELEASE_BALANCE_SCENARIOS.controlNetwork);
const noBuild = runBalanceScenario(RELEASE_BALANCE_SCENARIOS.noBuild);
const singleTower = runBalanceScenario(RELEASE_BALANCE_SCENARIOS.singleTower);

console.log(JSON.stringify({ precision, control, noBuild, singleTower }, null, 2));

// When each deterministic run reaches a terminal state
const repeatedPrecision = runBalanceScenario(RELEASE_BALANCE_SCENARIOS.precisionNetwork);

// Then the release outcomes stay inside the approved broad bands
assert.deepEqual(repeatedPrecision, precision, 'the same command schedule must produce the same result');
for (const winningRun of [precision, control]) {
  assert.equal(winningRun.terminalState, 'victory');
  assert.equal(winningRun.waveReached, 10);
  assert(winningRun.kernelIntegrity > 0);
  assert(winningRun.towerCount >= 6 && winningRun.towerCount <= 9);
  assert(winningRun.evolvedTowerCount >= 3 && winningRun.evolvedTowerCount <= 5);
  assert.equal(
    winningRun.nutrientsRemaining,
    DEFAULT_ECONOMY_CONFIG.startingMoney + winningRun.nutrientsEarned - winningRun.nutrientsSpent,
    'earned nutrients must exclude the starting grant',
  );
  assert(
    winningRun.minimumNutrientsAfterCommand > MINIMUM_AFFORDABILITY_RESERVE,
    `winning schedules must retain more than ${MINIMUM_AFFORDABILITY_RESERVE} nutrients after every command`,
  );
  assert(winningRun.estimatedRunMilliseconds >= 20 * 60 * 1000);
  assert(winningRun.estimatedRunMilliseconds <= 30 * 60 * 1000);
}

assert.equal(noBuild.terminalState, 'defeat');
assert.equal(singleTower.terminalState, 'defeat');
assert(singleTower.waveReached >= 3, 'one tower should teach before it fails');
assert(singleTower.waveReached <= 8, 'one-tower spam must not solve the run');
assert.notEqual(precision.nutrientsSpent, control.nutrientsSpent);

const precisionDefeatedTraits = new Set(
  precision.defeatedEnemyTypes.flatMap(enemyType => ENEMY_DEFINITIONS[enemyType].traits),
);
assert(precisionDefeatedTraits.has(EnemyTrait.Metal));
assert(precisionDefeatedTraits.has(EnemyTrait.Shielded));
assert(new Set(precision.towerTypes).size < Object.values(TowerType).length);

const controlDefeatedTraits = new Set(
  control.defeatedEnemyTypes.flatMap(enemyType => ENEMY_DEFINITIONS[enemyType].traits),
);
const nonControlSwarmSeparationMaximum = Math.max(
  precision.separatedSwarmEnemyCount,
  noBuild.separatedSwarmEnemyCount,
  singleTower.separatedSwarmEnemyCount,
);
assert(
  control.separatedSwarmEnemyCount > nonControlSwarmSeparationMaximum,
  'control-applied Swarm separation must exceed every non-control baseline',
);
assert(control.revealedEnemyCount > 0 || controlDefeatedTraits.has(EnemyTrait.Camo));

assert(
  [precision, control].some(run => run.leakedEnemyCount > 0 && run.purchasedTowerAfterLeak),
  'a winning run should recover from a leak and afford a later tower',
);

for (const winningRun of [precision, control]) {
  assert(winningRun.bossTraits.includes(EnemyTrait.Shielded));
  assert(winningRun.bossTraits.includes(EnemyTrait.Camo));
  assert(winningRun.bossMaximumPathDistance > 0);
  assert.equal(winningRun.bossDefeated, true);
  assert(winningRun.nutrientsRemaining <= winningRun.nutrientsEarned * 0.35);
}

console.log('balance scenario tests passed');

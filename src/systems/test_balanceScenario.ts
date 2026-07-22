import assert from 'node:assert/strict';
import { RELEASE_BALANCE_SCENARIOS, runBalanceScenario } from './balanceScenario';

const first = runBalanceScenario(RELEASE_BALANCE_SCENARIOS.precisionNetwork);
const second = runBalanceScenario(RELEASE_BALANCE_SCENARIOS.precisionNetwork);

assert.deepEqual(second, first, 'the same command schedule must produce the same result');
assert.equal(first.scenarioId, 'precision-network');
assert.equal(first.waveReached >= 1, true);

console.log('balance scenario tests passed');

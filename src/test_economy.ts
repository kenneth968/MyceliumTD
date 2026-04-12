import { GameEconomy, createEconomy, DEFAULT_ECONOMY_CONFIG, getUpgradeCost, calculateTowerValue, TransactionType } from './systems/economy';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertApprox(actual: number, expected: number, message: string, tolerance: number = 0.01) {
  if (Math.abs(actual - expected) > tolerance) {
    throw new Error(`Assertion failed: ${message} - expected ~${expected}, got ${actual}`);
  }
}

console.log('Testing Economy System...\n');

const startingMoney = DEFAULT_ECONOMY_CONFIG.startingMoney;
const startingLives = DEFAULT_ECONOMY_CONFIG.startingLives;

const economy = createEconomy();
assert(economy.getMoney() === startingMoney, `Starting money should be ${startingMoney}`);
assert(economy.getLives() === startingLives, `Starting lives should be ${startingLives}`);
console.log('  ✓ createEconomy with defaults');

const customEconomy = createEconomy({ startingMoney: 1000, startingLives: 50 });
assert(customEconomy.getMoney() === 1000, 'Custom starting money should be 1000');
assert(customEconomy.getLives() === 50, 'Custom starting lives should be 50');
console.log('  ✓ createEconomy with custom config');

assert(economy.canAfford(100) === true, 'Should be able to afford 100');
assert(economy.canAfford(1000) === false, 'Should not be able to afford 1000');
console.log('  ✓ canAfford');

const rewardAdded = economy.addKillReward(10, 'Red Mushroom killed');
assert(rewardAdded === true, 'Kill reward should be added');
assert(economy.getMoney() === startingMoney + 10, `Money should be ${startingMoney + 10} after kill reward`);
assert(economy.getTotalEarned() === 10, 'Total earned should be 10');
console.log('  ✓ addKillReward');

const spent = economy.spend(50, 'Test purchase');
assert(spent === true, 'Spend should succeed');
assert(economy.getMoney() === startingMoney + 10 - 50, `Money should be ${startingMoney + 10 - 50}`);
assert(economy.getTotalSpent() === 50, 'Total spent should be 50');
console.log('  ✓ spend');

const failedSpend = economy.spend(10000, 'Should fail');
assert(failedSpend === false, 'Spend should fail when insufficient funds');
assert(economy.getMoney() === startingMoney + 10 - 50, 'Money should not change on failed spend');
console.log('  ✓ spend fails on insufficient funds');

economy.reset();
assert(economy.getMoney() === startingMoney, 'Money should reset to starting');
assert(economy.getLives() === startingLives, 'Lives should reset to starting');
assert(economy.getTotalEarned() === 0, 'Total earned should reset to 0');
assert(economy.getTotalSpent() === 0, 'Total spent should reset to 0');
console.log('  ✓ reset');

economy.addKillReward(100, 'Test reward');
const interest = economy.addInterest(6000);
assert(interest > 0, 'Interest should be earned');
assert(economy.getMoney() > startingMoney + 100, 'Money should increase with interest');
console.log('  ✓ addInterest');

economy.reset();
const noInterestYet = economy.addInterest(3000);
assert(noInterestYet === 0, 'No interest before interval');
console.log('  ✓ addInterest respects interval');

economy.reset();
economy.addInterest(5000);
economy.addInterest(7500);
const noInterestTooSoon = economy.addInterest(9000);
assert(noInterestTooSoon === 0, 'No interest before 5s interval');
console.log('  ✓ addInterest respects 5s interval');

economy.reset();
const bonus = economy.addRoundBonus();
assert(bonus === DEFAULT_ECONOMY_CONFIG.roundBonusBase, `Round bonus should be base ${DEFAULT_ECONOMY_CONFIG.roundBonusBase}`);
assert(economy.getRoundsCompleted() === 1, 'Rounds completed should be 1');
assert(economy.getMoney() === startingMoney + DEFAULT_ECONOMY_CONFIG.roundBonusBase, 'Money should include round bonus');
console.log('  ✓ addRoundBonus');

economy.reset();
economy.addRoundBonus();
economy.addKillReward(100);
const secondBonus = economy.addRoundBonus();
assert(secondBonus === DEFAULT_ECONOMY_CONFIG.roundBonusBase + DEFAULT_ECONOMY_CONFIG.roundBonusMultiplier, 
  `Second bonus should include multiplier`);
console.log('  ✓ addRoundBonus includes multiplier');

economy.reset();
const lostLife = economy.loseLife(1);
assert(lostLife === 1, 'Should lose 1 life');
assert(economy.getLives() === startingLives - 1, 'Lives should decrease');
console.log('  ✓ loseLife');

economy.loseLife(5);
assert(economy.getLives() === startingLives - 6, 'Lives should be decreased by 5 more');
console.log('  ✓ loseLife handles multiple lives');

economy.loseLife(1000);
assert(economy.getLives() === 0, 'Lives should not go below 0');
assert(economy.isGameOver() === true, 'Game should be over when lives reach 0');
console.log('  ✓ loseLife respects minimum of 0');

economy.reset();
economy.addKillReward(500);
economy.spendForTower(200, 'PuffballFungus');
assert(economy.getMoney() === startingMoney + 500 - 200, 'Money should reflect tower purchase');
console.log('  ✓ spendForTower');

const refund = economy.sellTower(200);
const expectedRefund = Math.floor(200 * DEFAULT_ECONOMY_CONFIG.sellRefundPercent);
assert(refund === expectedRefund, `Sell refund should be ${expectedRefund}`);
assert(economy.getMoney() === startingMoney + 500 - 200 + expectedRefund, 'Money should include sell refund');
console.log('  ✓ sellTower');

const upgradeCost = getUpgradeCost(100, 1, 1.5);
assert(upgradeCost === 150, `Upgrade cost at tier 1 should be 150, got ${upgradeCost}`);
const upgradeCost2 = getUpgradeCost(100, 2, 1.5);
assert(upgradeCost2 === 225, `Upgrade cost at tier 2 should be 225, got ${upgradeCost2}`);
console.log('  ✓ getUpgradeCost');

const towerValue = calculateTowerValue(100, 50);
assert(towerValue === 105, `Tower value should be 105, got ${towerValue}`);
console.log('  ✓ calculateTowerValue');

const transactions = economy.getTransactions();
assert(transactions.length > 0, 'Should have transaction history');
const lastTx = transactions[transactions.length - 1];
assert(lastTx.type === TransactionType.TowerSell, 'Last transaction should be tower sell');
console.log('  ✓ getTransactions');

const refundAmount = economy.getSellRefund(300);
assert(refundAmount === 210, `Sell refund for 300 should be 210 (70%), got ${refundAmount}`);
console.log('  ✓ getSellRefund');

const config = economy.getConfig();
assert(config.interestRate === 0.05, 'Interest rate should be 5%');
assert(config.maxInterest === 200, 'Max interest should be 200');
console.log('  ✓ getConfig');

const noSpend = economy.spend(0, 'Zero cost');
assert(noSpend === true, 'Zero spend should succeed');
console.log('  ✓ spend handles zero amount');

economy.reset();
economy.loseLife(startingLives);
assert(economy.isGameOver() === true, 'Game over after losing all lives');
const gameOverTxs = economy.getTransactions();
const hasGameOver = gameOverTxs.some(tx => tx.type === TransactionType.GameOver);
assert(hasGameOver === true, 'Should have game over transaction');
console.log('  ✓ Game Over detection');

economy.reset();
economy.spendForTower(650, 'Venus Flytower');
const spent2 = economy.spend(100, 'Something');
assert(spent2 === false, 'Should not be able to spend when low on funds');
console.log('  ✓ Spend correctly checks available funds');

economy.reset();
const earned = economy.getTotalEarned();
const spent3 = economy.getTotalSpent();
assert(earned === 0, 'Fresh economy should have 0 total earned');
assert(spent3 === 0, 'Fresh economy should have 0 total spent');
console.log('  ✓ Total earnings tracking');

economy.addKillReward(100);
economy.addKillReward(200);
const earnedAfter = economy.getTotalEarned();
assert(earnedAfter === 300, `Total earned should be 300, got ${earnedAfter}`);
console.log('  ✓ Multiple kill rewards accumulate');

console.log('\n✅ All tests passed!');
console.log('\nSummary:');
console.log('  - Economy creation with default and custom config');
console.log('  - Money management (canAfford, spend, addKillReward)');
console.log('  - Lives system (loseLife, game over detection)');
console.log('  - Interest system (time-based, capped at max)');
console.log('  - Round bonuses (with multiplier)');
console.log('  - Tower sell/refund system');
console.log('  - Upgrade cost calculation');
console.log('  - Transaction history tracking');
console.log('  - Reset functionality');
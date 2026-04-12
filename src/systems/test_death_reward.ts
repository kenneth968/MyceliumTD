import { GameRunner, GameState, createGameRunner } from './gameRunner';
import { TowerType } from '../entities/tower';
import { TargetingMode } from './targeting';
import { Enemy, createEnemy } from '../entities/enemy';
import { EnemyType } from './wave';
import { Path, createDefaultPath } from './path';
import { applyDamageToEnemy, getReward } from '../entities/enemy';
import { applyDamage } from '../entities/tower';
import { GameEconomy, createEconomy } from './economy';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} (expected ${expected}, got ${actual})`);
  }
}

console.log('Testing Enemy Death and Kill Reward Integration...');

const path = createDefaultPath();

const game = createGameRunner({ startingMoney: 650, startingLives: 20 });
game.start();

const initialMoney = game.getEconomy().getMoney();
assertEqual(initialMoney, 650, 'Should start with 650 money');

const enemy1 = createEnemy(1, EnemyType.RedMushroom, path);
const reward1 = getReward(enemy1);
assert(reward1 > 0, 'Enemy should have a reward');

const killed = applyDamageToEnemy(enemy1, enemy1.hp);
assert(killed === true, 'applyDamageToEnemy should return true when enemy dies');

game.getEconomy().addKillReward(getReward(enemy1), `Test kill: ${enemy1.enemyType}`);
const moneyAfterKill = game.getEconomy().getMoney();
assertEqual(moneyAfterKill, initialMoney + reward1, `Money should increase by ${reward1} after kill`);

const enemy2 = createEnemy(2, EnemyType.BlueBeetle, path);
const reward2 = getReward(enemy2);
assert(reward2 > reward1, 'BlueBeetle should have higher reward than RedMushroom');

game.getEconomy().addKillReward(getReward(enemy2), `Test kill: ${enemy2.enemyType}`);
assertEqual(game.getEconomy().getMoney(), moneyAfterKill + reward2, `Money should increase by ${reward2} after second kill`);

const enemy3 = createEnemy(3, EnemyType.GreenCaterpillar, path);
const enemy4 = createEnemy(4, EnemyType.YellowWasp, path);
game.getEconomy().addKillReward(getReward(enemy3), `Test kill: ${enemy3.enemyType}`);
game.getEconomy().addKillReward(getReward(enemy4), `Test kill: ${enemy4.enemyType}`);

const enemy5 = createEnemy(5, EnemyType.BlackWidow, path);
assert(enemy5.reward > 0, 'BlackWidow should have reward');
game.getEconomy().addKillReward(getReward(enemy5), `Test kill: ${enemy5.enemyType}`);

const transactions = game.getEconomy().getTransactions();
const killRewards = transactions.filter(t => t.type === 'kill_reward');
assertEqual(killRewards.length, 5, 'Should have 5 kill reward transactions');

let totalReward = 0;
for (const enemy of [enemy1, enemy2, enemy3, enemy4, enemy5]) {
  totalReward += getReward(enemy);
}
assertEqual(game.getEconomy().getTotalEarned(), totalReward, 'Total earned should equal sum of rewards');

const enemy6 = createEnemy(6, EnemyType.WhiteMoth, path);
const enemy7 = createEnemy(7, EnemyType.RedMushroom, path);
applyDamageToEnemy(enemy6, 1000);
applyDamageToEnemy(enemy7, 1000);
assert(enemy6.alive === false, 'Enemy6 should be dead after massive damage');
assert(enemy7.alive === false, 'Enemy7 should be dead after massive damage');

game.getEconomy().addKillReward(getReward(enemy6), `Test kill: ${enemy6.enemyType}`);
game.getEconomy().addKillReward(getReward(enemy7), `Test kill: ${enemy7.enemyType}`);

const finalMoney = game.getEconomy().getMoney();
assert(finalMoney > 650, 'Should end with more money than started');

const economy = createEconomy({ startingMoney: 100 });
const economyInitial = economy.getMoney();
economy.addKillReward(50, 'Test reward');
assertEqual(economy.getMoney(), economyInitial + 50, 'Economy addKillReward should work');

const partialDamage = createEnemy(100, EnemyType.GreenCaterpillar, path);
const initialHp = partialDamage.hp;
const killedPartial = applyDamageToEnemy(partialDamage, initialHp - 1);
assert(killedPartial === false, 'Should not be killed with partial damage');
assertEqual(partialDamage.hp, 1, 'HP should be 1 after partial damage');
assert(partialDamage.alive === true, 'Enemy should still be alive');

const killedFull = applyDamageToEnemy(partialDamage, 1);
assert(killedFull === true, 'Should be killed with remaining damage');
assertEqual(partialDamage.hp, 0, 'HP should be 0 after death');
assert(partialDamage.alive === false, 'Enemy should be dead');

economy.addKillReward(getReward(partialDamage), 'Killed partial damage enemy');
assertEqual(economy.getMoney(), 150 + getReward(partialDamage), 'Kill reward should be granted after delayed death');

const enemyLeak = createEnemy(200, EnemyType.YellowWasp, path);
assert(enemyLeak.alive === true, 'Fresh enemy should be alive');
assert(enemyLeak.hasReachedEnd === false, 'Fresh enemy should not have reached end');
applyDamageToEnemy(enemyLeak, enemyLeak.hp);
assert(enemyLeak.alive === false, 'Dead enemy should not be alive');

economy.loseLife(1);
assertEqual(economy.getLives(), 19, 'Should lose 1 life');

const enemyReachEnd = createEnemy(300, EnemyType.BlueBeetle, path);
enemyReachEnd.pathDistance = path.getTotalLength() + 1;
enemyReachEnd.hasReachedEnd = true;
assert(enemyReachEnd.alive === true, 'Enemy that reached end is still technically alive until processed');

console.log('All enemy death and kill reward integration tests passed!');
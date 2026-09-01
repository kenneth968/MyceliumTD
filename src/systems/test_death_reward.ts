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

const enemy1 = createEnemy(1, EnemyType.ScoutBeetle, path);
const reward1 = getReward(enemy1);
assert(reward1 > 0, 'Enemy should have a reward');

const killed = applyDamageToEnemy(enemy1, enemy1.hp);
assert(killed === true, 'applyDamageToEnemy should return true when enemy dies');

game.getEconomy().addKillReward(getReward(enemy1), `Test kill: ${enemy1.enemyType}`);
const moneyAfterKill = game.getEconomy().getMoney();
assertEqual(moneyAfterKill, initialMoney + reward1, `Money should increase by ${reward1} after kill`);

const enemy2 = createEnemy(2, EnemyType.DartWasp, path);
const reward2 = getReward(enemy2);
assert(reward2 > reward1, 'BlueBeetle should have higher reward than RedMushroom');

game.getEconomy().addKillReward(getReward(enemy2), `Test kill: ${enemy2.enemyType}`);
assertEqual(game.getEconomy().getMoney(), moneyAfterKill + reward2, `Money should increase by ${reward2} after second kill`);

const enemy3 = createEnemy(3, EnemyType.ShellBeetle, path);
const enemy4 = createEnemy(4, EnemyType.CrawlerCaterpillar, path);
game.getEconomy().addKillReward(getReward(enemy3), `Test kill: ${enemy3.enemyType}`);
game.getEconomy().addKillReward(getReward(enemy4), `Test kill: ${enemy4.enemyType}`);

const enemy5 = createEnemy(5, EnemyType.IronCaterpillar, path);
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

const enemy6 = createEnemy(6, EnemyType.VeilWasp, path);
const enemy7 = createEnemy(7, EnemyType.ScoutBeetle, path);
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

const partialDamage = createEnemy(100, EnemyType.ShellBeetle, path);
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

const enemyLeak = createEnemy(200, EnemyType.CrawlerCaterpillar, path);
assert(enemyLeak.alive === true, 'Fresh enemy should be alive');
assert(enemyLeak.hasReachedEnd === false, 'Fresh enemy should not have reached end');
applyDamageToEnemy(enemyLeak, enemyLeak.hp);
assert(enemyLeak.alive === false, 'Dead enemy should not be alive');

economy.loseLife(1);
assertEqual(economy.getLives(), 19, 'Should lose 1 life');

const enemyReachEnd = createEnemy(300, EnemyType.DartWasp, path);
enemyReachEnd.pathDistance = path.getTotalLength() + 1;
enemyReachEnd.hasReachedEnd = true;
assert(enemyReachEnd.alive === true, 'Enemy that reached end is still technically alive until processed');

const lifecycleGame = createGameRunner({ startingLives: 20 });
assert(lifecycleGame.startWave(0), 'First release wave should start');
const waveStartedEvents = lifecycleGame.drainEvents().filter(event => event.type === 'wave_started');
assertEqual(waveStartedEvents.length, 1, 'Wave start should emit exactly one semantic event');
assertEqual(waveStartedEvents[0].waveNumber, 1, 'Wave start should use a one-based wave number');

const indexedWaveGame = createGameRunner({ startingLives: 20 });
assert(indexedWaveGame.startWave(5), 'Direct release-wave start should succeed');
const indexedWaveStart = indexedWaveGame.drainEvents().find(event => event.type === 'wave_started');
assertEqual(indexedWaveStart?.waveNumber, 6, 'Wave identity should follow the selected one-based release wave');

const lifecycleLeak = createEnemy(400, EnemyType.ScoutBeetle, lifecycleGame.getPath());
lifecycleLeak.pathDistance = lifecycleGame.getPath().getTotalLength() + 1;
lifecycleLeak.hasReachedEnd = true;
lifecycleGame.getActiveEnemies().push(lifecycleLeak);
lifecycleGame.update(0);
const leakEvents = lifecycleGame.drainEvents().filter(event => event.type === 'enemy_leaked');
assertEqual(leakEvents.length, 1, 'A Kernel leak should emit exactly one semantic event');
assertEqual(leakEvents[0].enemyId, lifecycleLeak.id, 'Leak event should identify the enemy');
assertEqual(leakEvents[0].enemyType, lifecycleLeak.enemyType, 'Leak event should identify the enemy type');
assertEqual(leakEvents[0].waveNumber, 1, 'Leak event should identify the active wave');

const firstWaveEnemy = lifecycleGame.getActiveEnemies()[0];
lifecycleGame.getWaveSpawner().update(100000);
firstWaveEnemy.alive = false;
lifecycleGame.update(1);
const firstCompletionEvents = lifecycleGame.drainEvents().filter(event => event.type === 'wave_completed');
assertEqual(firstCompletionEvents.length, 1, 'Wave completion should emit exactly one semantic event');
assertEqual(firstCompletionEvents[0].waveNumber, 1, 'Completion event should identify the wave');
assertEqual(firstCompletionEvents[0].completion, 43, 'Completion event should include completion reward');
assertEqual(firstCompletionEvents[0].perfect, 0, 'Leaked wave should report no perfect reward');
assertEqual(firstCompletionEvents[0].total, 43, 'Leaked wave should report the recoverable total');

for (let waveNumber = 2; waveNumber <= 10; waveNumber++) {
  assert(lifecycleGame.startWave(), `Wave ${waveNumber} should start`);
  lifecycleGame.getWaveSpawner().update(0);
  lifecycleGame.getWaveSpawner().update(100000);
  lifecycleGame.update(waveNumber);
}
const terminalEvents = lifecycleGame.drainEvents();
assertEqual(terminalEvents.filter(event => event.type === 'victory').length, 1, 'Victory should emit exactly once');
lifecycleGame.getRoundManager().checkRoundCompletion(0);
assertEqual(lifecycleGame.drainEvents().filter(event => event.type === 'victory').length, 0, 'Terminal rechecks should not duplicate victory');

const defeatGame = createGameRunner({ startingLives: 1 });
assert(defeatGame.startWave(0), 'Defeat scenario should start its first wave');
defeatGame.drainEvents();
const fatalLeak = createEnemy(401, EnemyType.ScoutBeetle, defeatGame.getPath());
fatalLeak.pathDistance = defeatGame.getPath().getTotalLength() + 1;
fatalLeak.hasReachedEnd = true;
defeatGame.getActiveEnemies().push(fatalLeak);
defeatGame.update(0);
defeatGame.update(1);
assertEqual(defeatGame.drainEvents().filter(event => event.type === 'defeat').length, 1, 'Defeat should emit exactly once');

console.log('All enemy death and kill reward integration tests passed!');

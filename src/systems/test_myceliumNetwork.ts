import { GameRunner, GameState, createGameRunner } from './gameRunner';
import { TowerType } from '../entities/tower';
import { TargetingMode } from './targeting';
import { UpgradePath } from './upgrade';

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

console.log('Testing MyceliumNetwork...');

const game = createGameRunner({ startingMoney: 5000 });
game.start();

const mycelium = game.placeTower(TowerType.MyceliumNetwork, 200, 200, TargetingMode.First);
assert(mycelium !== null, 'Should place MyceliumNetwork tower');
assertEqual(mycelium!.towerType, TowerType.MyceliumNetwork, 'Tower type should be MyceliumNetwork');
assertEqual(mycelium!.damage, 0, 'MyceliumNetwork should have 0 damage');
assertEqual(mycelium!.fireRate, 0, 'MyceliumNetwork should have 0 fire rate');
assertEqual(mycelium!.specialEffect, 'network_buff', 'MyceliumNetwork should have network_buff effect');

const puffball = game.placeTower(TowerType.PuffballFungus, 200, 280, TargetingMode.First);
assert(puffball !== null, 'Should place Puffball tower within range');

const buffedTowers = game.getNetworkBuffedTowers();
assertEqual(buffedTowers.length, 1, 'Should have 1 buffed tower');
assertEqual(buffedTowers[0].tower.id, puffball!.id, 'Buffed tower should be Puffball');

const isBuffed = game.isTowerNetworkBuffed(puffball!.id);
assert(isBuffed === true, 'Puffball should be network buffed');

const buffInfo = game.getTowerBuffInfo(puffball!.id);
assert(buffInfo !== null, 'Buff info should not be null');
assert(buffInfo!.buffStrength > 0, 'Buff strength should be positive');
assertEqual(buffInfo!.sources, 1, 'Should have 1 mycelium source');

const farPuffball = game.placeTower(TowerType.PuffballFungus, 600, 600, TargetingMode.First);
assert(farPuffball !== null, 'Should place Puffball far away');
assertEqual(game.isTowerNetworkBuffed(farPuffball!.id), false, 'Far Puffball should not be buffed');

const secondMycelium = game.placeTower(TowerType.MyceliumNetwork, 230, 280, TargetingMode.First);
assert(secondMycelium !== null, 'Should place second MyceliumNetwork');

const doubleBuffed = game.getNetworkBuffedTowers();
const puffballBuff = doubleBuffed.find(b => b.tower.id === puffball!.id);
assert(puffballBuff !== undefined, 'Puffball should still be buffed');
assertEqual(puffballBuff!.sources.length, 2, 'Puffball should have 2 mycelium sources');

const myceliumTowers = game.getNetworkBuffedTowers();
const myceliumCount = myceliumTowers.filter(b => b.tower.towerType === TowerType.MyceliumNetwork);
assertEqual(myceliumCount.length, 0, 'Mycelium towers should not buff each other');

console.log('All MyceliumNetwork tests passed!');
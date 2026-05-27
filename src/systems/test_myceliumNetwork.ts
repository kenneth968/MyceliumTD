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

const unconnectedGame = createGameRunner({ startingMoney: 5000 });
unconnectedGame.start();

const unconnectedTower = unconnectedGame.placeTower(TowerType.PuffballFungus, 100, 100, TargetingMode.First);
assert(unconnectedTower !== null, 'Should place an unconnected Puffball tower');
assertEqual(unconnectedGame.isTowerConnectedToNetwork(unconnectedTower!.id), false, 'Far tower should not be connected to the network');

const moneyBeforeLockedUpgrade = unconnectedGame.getGameStats().money;
const lockedSpecialUpgrade = unconnectedGame.upgradeTower(unconnectedTower!.id, UpgradePath.Special);
assertEqual(lockedSpecialUpgrade.success, false, 'Unconnected tower should not buy the bottom/special upgrade');
assertEqual(lockedSpecialUpgrade.newTier, 0, 'Locked bottom/special upgrade should stay at tier 0');
assertEqual(unconnectedGame.getGameStats().money, moneyBeforeLockedUpgrade, 'Locked bottom/special upgrade should not spend money');

const normalUpgrade = unconnectedGame.upgradeTower(unconnectedTower!.id, UpgradePath.Damage);
assertEqual(normalUpgrade.success, true, 'Unconnected tower should still buy non-bottom upgrades');

unconnectedGame.selectTower(unconnectedTower!.id);
const unconnectedPreview = unconnectedGame.getTowerSelectionPreviewRenderData();
const lockedIndicator = unconnectedPreview.upgradeIndicators?.find(i => i.path === UpgradePath.Special);
assert(lockedIndicator !== undefined, 'Special upgrade indicator should remain visible while locked');
assertEqual(lockedIndicator!.canUpgrade, false, 'Special upgrade indicator should be disabled while disconnected');

const kernelConnectedGame = createGameRunner({ startingMoney: 5000 });
kernelConnectedGame.start();

const kernelTower = kernelConnectedGame.placeTower(TowerType.PuffballFungus, 720, 180, TargetingMode.First);
assert(kernelTower !== null, 'Should place a tower near the kernel network');
assertEqual(kernelConnectedGame.isTowerConnectedToNetwork(kernelTower!.id), true, 'Tower near the kernel should be network-connected');

const unlockedSpecialUpgrade = kernelConnectedGame.upgradeTower(kernelTower!.id, UpgradePath.Special);
assertEqual(unlockedSpecialUpgrade.success, true, 'Connected tower should buy the bottom/special upgrade');
assertEqual(unlockedSpecialUpgrade.newTier, 1, 'Connected bottom/special upgrade should advance to tier 1');

const chainedTower = kernelConnectedGame.placeTower(TowerType.OrchidTrap, 600, 180, TargetingMode.First);
assert(chainedTower !== null, 'Should place a tower chained from a connected tower');
assertEqual(kernelConnectedGame.isTowerConnectedToNetwork(chainedTower!.id), true, 'Nearby tower should connect through an already-connected tower');

console.log('All MyceliumNetwork tests passed!');

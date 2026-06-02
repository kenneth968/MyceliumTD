import { GameRunner, GameState, createGameRunner } from './gameRunner';
import { TowerType } from '../entities/tower';
import { TargetingMode } from './targeting';
import { UpgradePath } from './upgrade';
import { createEnemy, StatusEffectType, hasStatusEffect } from '../entities/enemy';
import { EnemyType } from './wave';

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

const networkRevealGame = createGameRunner({ startingMoney: 5000 });
networkRevealGame.start();

const oracle = networkRevealGame.placeTower(TowerType.BioluminescentShroom, 720, 250, TargetingMode.First);
assert(oracle !== null, 'Should place a Bioluminescent tower near the kernel network');
assertEqual(networkRevealGame.isTowerConnectedToNetwork(oracle!.id), true, 'Bioluminescent tower should be connected before buying the special upgrade');

const networkRevealUpgrade = networkRevealGame.upgradeTower(oracle!.id, UpgradePath.Special);
assertEqual(networkRevealUpgrade.success, true, 'Connected Bioluminescent should buy the bottom/special upgrade');

const camoEnemy = createEnemy(900, EnemyType.WhiteMoth, networkRevealGame.getPath());
camoEnemy.pathDistance = 1540;
camoEnemy.pathProgress = 1540;
camoEnemy.position = { ...networkRevealGame.getPath().getPointAtDistance(camoEnemy.pathDistance).position };
camoEnemy.speed = 0;
camoEnemy.baseSpeed = 0;
networkRevealGame.getActiveEnemies().push(camoEnemy);

networkRevealGame.update(1000);
networkRevealGame.update(1400);

assert(hasStatusEffect(camoEnemy, StatusEffectType.Revealed), 'Network reveal should reveal camo enemies');
assert(hasStatusEffect(camoEnemy, StatusEffectType.Slow), 'Network reveal should slow revealed enemies');

const revealEffect = camoEnemy.statusEffects.find(effect => effect.type === StatusEffectType.Revealed);
const slowEffect = camoEnemy.statusEffects.find(effect => effect.type === StatusEffectType.Slow);
assert(revealEffect !== undefined, 'Revealed effect should be present after network reveal hit');
assert(slowEffect !== undefined, 'Slow effect should be present after network reveal hit');
assertEqual(revealEffect!.duration, 1500, 'Network reveal should last 50% longer than the tier 1 base duration');
assertEqual(slowEffect!.duration, 1500, 'Network reveal slow should match the reveal duration');
assertEqual(slowEffect!.strength, 0.1, 'Network reveal slow should apply a 10% slow');

const fungalFieldGame = createGameRunner({ startingMoney: 5000 });
fungalFieldGame.start();

const fieldPuffball = fungalFieldGame.placeTower(TowerType.PuffballFungus, 720, 250, TargetingMode.First);
assert(fieldPuffball !== null, 'Should place a Puffball tower near the kernel network');
assertEqual(fungalFieldGame.isTowerConnectedToNetwork(fieldPuffball!.id), true, 'Puffball tower should be connected before buying the special upgrade');

const fungalFieldUpgrade = fungalFieldGame.upgradeTower(fieldPuffball!.id, UpgradePath.Special);
assertEqual(fungalFieldUpgrade.success, true, 'Connected Puffball should buy the bottom/special upgrade');

const fieldTarget = createEnemy(901, EnemyType.BlueBeetle, fungalFieldGame.getPath());
fieldTarget.pathDistance = 1540;
fieldTarget.pathProgress = 1540;
fieldTarget.position = { ...fungalFieldGame.getPath().getPointAtDistance(fieldTarget.pathDistance).position };
fieldTarget.speed = 0;
fieldTarget.baseSpeed = 0;
fungalFieldGame.getActiveEnemies().push(fieldTarget);

fungalFieldGame.update(1000);
fungalFieldGame.update(1400);

const activeFields = fungalFieldGame.getLingeringFields();
assertEqual(activeFields.length, 1, 'Connected Puffball special hit should create one lingering fungal field');
assertEqual(activeFields[0].duration, 8000, 'Lingering fungal field should last 8 seconds');
assertEqual(activeFields[0].slowStrength, 0.2, 'Lingering fungal field should apply a 20% slow');

const fieldVisitor = createEnemy(902, EnemyType.GreenCaterpillar, fungalFieldGame.getPath());
fieldVisitor.pathDistance = 1540;
fieldVisitor.pathProgress = 1540;
fieldVisitor.position = { ...fungalFieldGame.getPath().getPointAtDistance(fieldVisitor.pathDistance).position };
fieldVisitor.speed = 0;
fieldVisitor.baseSpeed = 0;
fungalFieldGame.getActiveEnemies().push(fieldVisitor);

fungalFieldGame.update(1500);

assert(hasStatusEffect(fieldVisitor, StatusEffectType.Slow), 'Lingering fungal field should slow enemies that enter after impact');
const fieldSlow = fieldVisitor.statusEffects.find(effect => effect.type === StatusEffectType.Slow);
assert(fieldSlow !== undefined, 'Field slow effect should be present after entering the field');
assertEqual(fieldSlow!.strength, 0.2, 'Field slow should use the lingering fungal field slow strength');

fungalFieldGame.getActiveEnemies().length = 0;
fungalFieldGame.getActiveProjectiles().length = 0;
fungalFieldGame.update(9500);
const expiredFields = fungalFieldGame.getLingeringFields();
assertEqual(expiredFields.length, 0, 'Lingering fungal field should expire after its 8 second duration');

const seededPayloadGame = createGameRunner({ startingMoney: 5000 });
seededPayloadGame.start();

const seededStinkhorn = seededPayloadGame.placeTower(TowerType.StinkhornLine, 720, 270, TargetingMode.First);
assert(seededStinkhorn !== null, 'Should place a Stinkhorn tower near the kernel network');
assertEqual(seededPayloadGame.isTowerConnectedToNetwork(seededStinkhorn!.id), true, 'Stinkhorn tower should be connected before buying the special upgrade');

const seededUpgrade = seededPayloadGame.upgradeTower(seededStinkhorn!.id, UpgradePath.Special);
assertEqual(seededUpgrade.success, true, 'Connected Stinkhorn should buy the bottom/special upgrade');

const seededTarget = createEnemy(903, EnemyType.ArmoredBeetle, seededPayloadGame.getPath());
seededTarget.pathDistance = 1520;
seededTarget.pathProgress = 1520;
seededTarget.position = { ...seededPayloadGame.getPath().getPointAtDistance(seededTarget.pathDistance).position };
seededTarget.speed = 0;
seededTarget.baseSpeed = 0;
seededPayloadGame.getActiveEnemies().push(seededTarget);

seededPayloadGame.update(1000);
seededPayloadGame.update(1300);

const seededPayloads = seededPayloadGame.getSeededPayloads();
assertEqual(seededPayloads.length, 3, 'Connected Stinkhorn special hit should plant three delayed spore payloads');
assertEqual(seededPayloads[0].delay, 1000, 'Seeded payloads should pop after a one-second delay');
assertEqual(seededPayloads[0].radius, 35, 'Seeded payloads should have a readable pop radius');

seededPayloadGame.getActiveProjectiles().length = 0;
seededStinkhorn!.lastFireTime = 999999;

const delayedVictim = createEnemy(904, EnemyType.ArmoredBeetle, seededPayloadGame.getPath());
delayedVictim.pathDistance = 1520;
delayedVictim.pathProgress = 1520;
delayedVictim.position = { ...seededPayloadGame.getPath().getPointAtDistance(delayedVictim.pathDistance).position };
delayedVictim.speed = 0;
delayedVictim.baseSpeed = 0;
seededPayloadGame.getActiveEnemies().push(delayedVictim);

seededPayloadGame.update(2300);

assert(delayedVictim.hp < delayedVictim.maxHp, 'Seeded payload detonation should damage enemies still in the pop zone');
const spentPayloads = seededPayloadGame.getSeededPayloads();
assertEqual(spentPayloads.length, 0, 'Seeded payloads should be removed after they detonate');

console.log('All MyceliumNetwork tests passed!');

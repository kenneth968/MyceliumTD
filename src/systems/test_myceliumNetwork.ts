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

console.log('Testing canonical mycelium network...');

const game = createGameRunner({ startingMoney: 5000 });
game.start();

const mycelium = game.placeTower(TowerType.Sporecap, 200, 200, TargetingMode.First);
assert(mycelium !== null, 'Should place Sporecap tower');
assertEqual(mycelium!.towerType, TowerType.Sporecap, 'Tower type should be Sporecap');
assertEqual(mycelium!.damage, 1, 'Sporecap should have 1 damage');
assertEqual(mycelium!.fireRate, 550, 'Sporecap should have a 550ms fire rate');
assertEqual(mycelium!.specialEffect, 'none', 'Sporecap should have the canonical none effect');
assertEqual(game.isTowerConnectedToNetwork(mycelium!.id), false, 'A far Sporecap should not become a network root');

const puffball = game.placeTower(TowerType.Puffball, 200, 280, TargetingMode.First);
assert(puffball !== null, 'Should place Puffball tower within range');
assertEqual(game.getNetworkBuffedTowers().length, 0, 'Sporecaps should not provide the Chorus Light buff');

const chorusGame = createGameRunner({ startingMoney: 10000 });
chorusGame.start();
const oracleA = chorusGame.placeTower(TowerType.LumenOracle, 720, 230, TargetingMode.First);
const oracleB = chorusGame.placeTower(TowerType.LumenOracle, 720, 370, TargetingMode.First);
const chorusTarget = chorusGame.placeTower(TowerType.Puffball, 620, 300, TargetingMode.First);
assert(oracleA !== null && oracleB !== null && chorusTarget !== null, 'Should place Chorus Light test towers');
assert(chorusGame.upgradeTower(oracleA!.id, UpgradePath.Special).success, 'First connected Oracle should buy Chorus Light');
assert(chorusGame.upgradeTower(oracleB!.id, UpgradePath.Special).success, 'Second connected Oracle should buy Chorus Light');
assert(chorusGame.upgradeTower(chorusTarget!.id, UpgradePath.Special).success, 'Connected recipient should activate a network effect');
const chorusBuff = chorusGame.getTowerBuffInfo(chorusTarget!.id);
assert(chorusBuff !== null, 'Chorus Light should strengthen eligible connected effects in range');
assertEqual(chorusBuff!.buffStrength, 0.2, 'Chorus Light should use the canonical 20% strength bonus');
assertEqual(chorusBuff!.sources, 1, 'Multiple Chorus Light sources should not stack');

const unconnectedGame = createGameRunner({ startingMoney: 5000 });
unconnectedGame.start();

const unconnectedTower = unconnectedGame.placeTower(TowerType.Puffball, 100, 100, TargetingMode.First);
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

const kernelTower = kernelConnectedGame.placeTower(TowerType.Puffball, 720, 180, TargetingMode.First);
assert(kernelTower !== null, 'Should place a tower near the kernel network');
assertEqual(kernelConnectedGame.isTowerConnectedToNetwork(kernelTower!.id), true, 'Tower near the kernel should be network-connected');

const unlockedSpecialUpgrade = kernelConnectedGame.upgradeTower(kernelTower!.id, UpgradePath.Special);
assertEqual(unlockedSpecialUpgrade.success, true, 'Connected tower should buy the bottom/special upgrade');
assertEqual(unlockedSpecialUpgrade.newTier, 1, 'Connected bottom/special upgrade should advance to tier 1');

const chainedTower = kernelConnectedGame.placeTower(TowerType.Slimefungus, 600, 180, TargetingMode.First);
assert(chainedTower !== null, 'Should place a tower chained from a connected tower');
assertEqual(kernelConnectedGame.isTowerConnectedToNetwork(chainedTower!.id), true, 'Nearby tower should connect through an already-connected tower');

const networkRevealGame = createGameRunner({ startingMoney: 5000 });
networkRevealGame.start();

const oracle = networkRevealGame.placeTower(TowerType.LumenOracle, 720, 250, TargetingMode.First);
assert(oracle !== null, 'Should place a Bioluminescent tower near the kernel network');
assertEqual(networkRevealGame.isTowerConnectedToNetwork(oracle!.id), true, 'Bioluminescent tower should be connected before buying the special upgrade');

const networkRevealUpgrade = networkRevealGame.upgradeTower(oracle!.id, UpgradePath.Special);
assertEqual(networkRevealUpgrade.success, true, 'Connected Bioluminescent should buy the bottom/special upgrade');

const camoEnemy = createEnemy(900, EnemyType.VeilWasp, networkRevealGame.getPath());
camoEnemy.pathDistance = 1420;
camoEnemy.pathProgress = 1420;
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

const fieldPuffball = fungalFieldGame.placeTower(TowerType.Puffball, 720, 250, TargetingMode.First);
assert(fieldPuffball !== null, 'Should place a Puffball tower near the kernel network');
assertEqual(fungalFieldGame.isTowerConnectedToNetwork(fieldPuffball!.id), true, 'Puffball tower should be connected before buying the special upgrade');

const fungalFieldUpgrade = fungalFieldGame.upgradeTower(fieldPuffball!.id, UpgradePath.Special);
assertEqual(fungalFieldUpgrade.success, true, 'Connected Puffball should buy the bottom/special upgrade');

const fieldTarget = createEnemy(901, EnemyType.DartWasp, fungalFieldGame.getPath());
fieldTarget.pathDistance = 1420;
fieldTarget.pathProgress = 1420;
fieldTarget.position = { ...fungalFieldGame.getPath().getPointAtDistance(fieldTarget.pathDistance).position };
fieldTarget.speed = 0;
fieldTarget.baseSpeed = 0;
fungalFieldGame.getActiveEnemies().push(fieldTarget);

fungalFieldGame.update(1000);
fungalFieldGame.update(1400);

const activeFields = fungalFieldGame.getLingeringFields();
assertEqual(activeFields.length, 1, 'Connected Puffball special hit should create one lingering fungal field');
assertEqual(activeFields[0].duration, 6000, 'Lingering fungal field should last 6 seconds');
assertEqual(activeFields[0].slowStrength, 0.25, 'Lingering fungal field should apply a 25% slow');

const fieldVisitor = createEnemy(902, EnemyType.ShellBeetle, fungalFieldGame.getPath());
fieldVisitor.pathDistance = 1420;
fieldVisitor.pathProgress = 1420;
fieldVisitor.position = { ...fungalFieldGame.getPath().getPointAtDistance(fieldVisitor.pathDistance).position };
fieldVisitor.speed = 0;
fieldVisitor.baseSpeed = 0;
fungalFieldGame.getActiveEnemies().push(fieldVisitor);

fungalFieldGame.update(1500);

assert(hasStatusEffect(fieldVisitor, StatusEffectType.Slow), 'Lingering fungal field should slow enemies that enter after impact');
const fieldSlow = fieldVisitor.statusEffects.find(effect => effect.type === StatusEffectType.Slow);
assert(fieldSlow !== undefined, 'Field slow effect should be present after entering the field');
assertEqual(fieldSlow!.strength, 0.25, 'Field slow should use the lingering fungal field slow strength');

fungalFieldGame.getActiveEnemies().length = 0;
fungalFieldGame.getActiveProjectiles().length = 0;
fungalFieldGame.update(9500);
const expiredFields = fungalFieldGame.getLingeringFields();
assertEqual(expiredFields.length, 0, 'Lingering fungal field should expire after its 6 second duration');

const seededPayloadGame = createGameRunner({ startingMoney: 5000 });
seededPayloadGame.start();

const seededBulb = seededPayloadGame.placeTower(TowerType.BulbShooter, 720, 270, TargetingMode.First);
assert(seededBulb !== null, 'Should place a Bulb Shooter near the kernel network');
assertEqual(seededPayloadGame.isTowerConnectedToNetwork(seededBulb!.id), true, 'Bulb Shooter should be connected before buying the special upgrade');

const seededUpgrade = seededPayloadGame.upgradeTower(seededBulb!.id, UpgradePath.Special);
assertEqual(seededUpgrade.success, true, 'Connected Bulb Shooter should buy the bottom/special upgrade');

const seededTarget = createEnemy(903, EnemyType.BulwarkBeetle, seededPayloadGame.getPath());
seededTarget.pathDistance = 1420;
seededTarget.pathProgress = 1420;
seededTarget.position = { ...seededPayloadGame.getPath().getPointAtDistance(seededTarget.pathDistance).position };
seededTarget.speed = 0;
seededTarget.baseSpeed = 0;
seededPayloadGame.getActiveEnemies().push(seededTarget);

seededPayloadGame.update(1200);
assertEqual(seededPayloadGame.getSeededPayloads().length, 0, 'Planting hit should not immediately arm a payload');
seededPayloadGame.update(2400);
seededPayloadGame.update(3600);
assertEqual(seededPayloadGame.getSeededPayloads().length, 0, 'Seed should wait for three follow-up connected hits');
seededPayloadGame.update(4800);

const seededPayloads = seededPayloadGame.getSeededPayloads();
assertEqual(seededPayloads.length, 1, 'Third follow-up connected hit should arm one delayed payload');
assertEqual(seededPayloads[0].delay, 1000, 'Seeded payload should pop after a one-second delay');
assertEqual(seededPayloads[0].radius, 35, 'Seeded payload should have a readable pop radius');

seededPayloadGame.getActiveProjectiles().length = 0;
seededBulb!.lastFireTime = 999999;

const delayedVictim = createEnemy(904, EnemyType.BulwarkBeetle, seededPayloadGame.getPath());
delayedVictim.pathDistance = 1420;
delayedVictim.pathProgress = 1420;
delayedVictim.position = { ...seededPayloadGame.getPath().getPointAtDistance(delayedVictim.pathDistance).position };
delayedVictim.speed = 0;
delayedVictim.baseSpeed = 0;
seededPayloadGame.getActiveEnemies().push(delayedVictim);

seededPayloadGame.update(5800);

assert(delayedVictim.hp < delayedVictim.maxHp, 'Seeded payload detonation should damage enemies still in the pop zone');
const spentPayloads = seededPayloadGame.getSeededPayloads();
assertEqual(spentPayloads.length, 0, 'Seeded payloads should be removed after they detonate');

console.log('All Sporecap tests passed!');

import {
  UpgradePath,
  UPGRADE_TIERS,
  getBaseUpgradeCost,
  getUpgradeCost,
  getNextTierStats,
  canUpgrade,
  applyUpgrade,
  createTowerWithUpgrades,
  getUpgradeInfo,
  getTotalSellValue,
  getUpgradeSummary,
  getSpecialEffectInfo,
  SPECIAL_EFFECT_UPGRADES,
  SpecialEffectType,
} from './systems/upgrade';
import { TowerType } from './entities/tower';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    testsPassed++;
  } else {
    console.log(`  ✗ ${message}`);
    testsFailed++;
  }
}

console.log('=== Upgrade System Tests ===\n');

console.log('Test: UPGRADE_TIERS has correct structure');
assert(UPGRADE_TIERS.length === 3, 'UPGRADE_TIERS has 3 tiers');
assert(UPGRADE_TIERS[0].tier === 1, 'Tier 1 data correct');
assert(UPGRADE_TIERS[1].tier === 2, 'Tier 2 data correct');
assert(UPGRADE_TIERS[2].tier === 3, 'Tier 3 data correct');

console.log('\nTest: getBaseUpgradeCost calculates correctly');
const baseCost = getBaseUpgradeCost(TowerType.Puffball);
assert(baseCost === 90, 'Puffball base upgrade cost is 90 (180 * 0.5)');
const orchidCost = getBaseUpgradeCost(TowerType.Slimefungus);
assert(orchidCost === 80, 'Slimefungus base upgrade cost is 80 (160 * 0.5)');
const venusCost = getBaseUpgradeCost(TowerType.ThornSniper);
assert(venusCost === 160, 'Thorn Sniper base upgrade cost is 160 (320 * 0.5)');

console.log('\nTest: getUpgradeCost calculates tier costs');
const tier1Cost = getUpgradeCost(TowerType.Puffball, UpgradePath.Damage, 1);
assert(tier1Cost === 90, 'Tier 1 damage upgrade costs 90');
const tier2Cost = getUpgradeCost(TowerType.Puffball, UpgradePath.Damage, 2);
assert(tier2Cost === 202, 'Tier 2 damage upgrade costs 202 (floor of 90 * 1.5 * 3 / 2)');
const tier3Cost = getUpgradeCost(TowerType.Puffball, UpgradePath.Damage, 3);
assert(tier3Cost === 450, 'Tier 3 damage upgrade costs 450 (90 * 2.5 * 4 / 2)');

console.log('\nTest: getNextTierStats returns correct stat increases');
const tier1Stats = getNextTierStats({ damage: 1, range: 80, fireRate: 500, towerType: TowerType.Puffball } as any, UpgradePath.Damage, 1);
assert(tier1Stats.statIncrease >= 1, 'Tier 1 damage increase is at least 1');
assert(tier1Stats.newStatValue > 1, 'New damage value is greater than base');

const rangeStats = getNextTierStats({ damage: 1, range: 80, fireRate: 500, towerType: TowerType.Puffball } as any, UpgradePath.Range, 1);
assert(rangeStats.statIncrease >= 5, 'Tier 1 range increase is at least 5');
assert(rangeStats.newStatValue >= 91 && rangeStats.newStatValue <= 92, 'New range value is 91-92 (floating point: 80 * 0.15 = 11.999...)');

const fireRateStats = getNextTierStats({ fireRate: 500, towerType: TowerType.Puffball } as any, UpgradePath.FireRate, 1);
assert(fireRateStats.statIncrease > 0, 'Tier 1 fire rate improvement is positive');

console.log('\nTest: createTowerWithUpgrades creates tower with upgrade state');
const tower = createTowerWithUpgrades(1, 0, 0, TowerType.Puffball);
assert(tower.upgradeLevels[UpgradePath.Damage] === 0, 'Damage upgrade level starts at 0');
assert(tower.upgradeLevels[UpgradePath.Range] === 0, 'Range upgrade level starts at 0');
assert(tower.upgradeLevels[UpgradePath.FireRate] === 0, 'FireRate upgrade level starts at 0');
assert(tower.upgradeLevels[UpgradePath.Special] === 0, 'Special upgrade level starts at 0');
assert(tower.totalUpgradeCost === 0, 'Total upgrade cost starts at 0');

console.log('\nTest: createTowerWithUpgrades initializes special effect fields');
const puffTower = createTowerWithUpgrades(10, 0, 0, TowerType.Puffball);
assert(puffTower.effectStrength === 0.5, 'Puffball has base effect strength 0.5');
assert(puffTower.areaRadius === 40, 'Puffball has base area radius 40');
assert(puffTower.effectDuration === 0, 'Puffball has no duration');

const orchidTower = createTowerWithUpgrades(11, 0, 0, TowerType.Slimefungus);
assert(orchidTower.effectStrength === 0.5, 'Slimefungus has base effect strength 0.5');
assert(orchidTower.effectDuration === 1000, 'Slimefungus has base duration 1000');

const stinkhornTower = createTowerWithUpgrades(12, 0, 0, TowerType.BulbShooter);
assert(stinkhornTower.effectStrength === 0.5, 'Bulb Shooter has base effect strength 0.5');
assert(stinkhornTower.effectDuration === 3000, 'Bulb Shooter has base duration 3000');

console.log('\nTest: canUpgrade checks tier limits');
const canUpgrade1 = canUpgrade(tower, UpgradePath.Damage, 0);
assert(canUpgrade1 === true, 'Can upgrade from tier 0 to 1');
const canUpgrade2 = canUpgrade(tower, UpgradePath.Damage, 1);
assert(canUpgrade2 === true, 'Can upgrade from tier 1 to 2');
const canUpgrade3 = canUpgrade(tower, UpgradePath.Damage, 2);
assert(canUpgrade3 === true, 'Can upgrade from tier 2 to 3');
const cannotUpgrade = canUpgrade(tower, UpgradePath.Damage, 3);
assert(cannotUpgrade === false, 'Cannot upgrade past tier 3');

console.log('\nTest: applyUpgrade applies stat and cost correctly');
const tower2 = createTowerWithUpgrades(2, 0, 0, TowerType.Slimefungus);
const originalDamage = tower2.damage;
const originalRange = tower2.range;
const originalFireRate = tower2.fireRate;

const result1 = applyUpgrade(tower2, UpgradePath.Damage);
assert(result1.success === true, 'First damage upgrade succeeds');
assert(result1.newTier === 1, 'New tier is 1 after first upgrade');
assert(tower2.damage > originalDamage, 'Damage increased after upgrade');

const result2 = applyUpgrade(tower2, UpgradePath.Range);
assert(result2.success === true, 'First range upgrade succeeds');
assert(result2.newTier === 1, 'New tier is 1 after first upgrade');
assert(tower2.range > originalRange, 'Range increased after upgrade');

const result3 = applyUpgrade(tower2, UpgradePath.FireRate);
assert(result3.success === true, 'First fire rate upgrade succeeds');
assert(result3.newTier === 1, 'New tier is 1 after first upgrade');

console.log('\nTest: cannot upgrade past max tier');
const tower3 = createTowerWithUpgrades(3, 0, 0, TowerType.Puffball);
tower3.upgradeLevels[UpgradePath.Damage] = 3;
const result4 = applyUpgrade(tower3, UpgradePath.Damage);
assert(result4.success === false, 'Cannot upgrade past tier 3');

console.log('\nTest: getUpgradeInfo returns correct info');
const tower4 = createTowerWithUpgrades(4, 0, 0, TowerType.ThornSniper);
const damageInfo = getUpgradeInfo(tower4, UpgradePath.Damage);
assert(damageInfo.currentTier === 0, 'Current tier is 0 for new tower');
assert(damageInfo.maxTier === false, 'Not at max tier');
assert(damageInfo.nextCost > 0, 'Next cost is positive');
assert(damageInfo.statIncrease > 0, 'Stat increase is positive');

tower4.upgradeLevels[UpgradePath.Damage] = 3;
const maxInfo = getUpgradeInfo(tower4, UpgradePath.Damage);
assert(maxInfo.maxTier === true, 'At max tier after 3 upgrades');
assert(maxInfo.nextCost === 0, 'No cost for max tier');

console.log('\nTest: getTotalSellValue calculates correctly');
const tower5 = createTowerWithUpgrades(5, 0, 0, TowerType.Puffball);
const baseSellValue = getTotalSellValue(tower5);
assert(baseSellValue === 125, 'Base sell value is floor(180 * 0.7)');

applyUpgrade(tower5, UpgradePath.Damage);
const afterUpgradeSell = getTotalSellValue(tower5);
assert(afterUpgradeSell > baseSellValue, 'Sell value increases with upgrades');

console.log('\nTest: getUpgradeSummary returns all paths');
const tower6 = createTowerWithUpgrades(6, 0, 0, TowerType.BulbShooter);
const summary = getUpgradeSummary(tower6);
assert(UpgradePath.Damage in summary, 'Summary includes Damage path');
assert(UpgradePath.Range in summary, 'Summary includes Range path');
assert(UpgradePath.FireRate in summary, 'Summary includes FireRate path');
assert(UpgradePath.Special in summary, 'Summary includes Special path');
assert('totalUpgradeCost' in summary, 'Summary includes totalUpgradeCost');
assert('totalSellValue' in summary, 'Summary includes totalSellValue');

console.log('\nTest: Fire rate upgrade decreases fire rate (faster firing)');
const tower7 = createTowerWithUpgrades(7, 0, 0, TowerType.Slimefungus);
const originalFR = tower7.fireRate;
applyUpgrade(tower7, UpgradePath.FireRate);
assert(tower7.fireRate < originalFR, 'Fire rate decreased (faster firing) after upgrade');

console.log('\n=== Special Effect Upgrade Tests ===\n');

console.log('Test: Special upgrade applies to Puffball (area damage)');
const puffballTower = createTowerWithUpgrades(20, 0, 0, TowerType.Puffball);
assert(puffballTower.areaRadius === 40, 'Base area radius is 40');
const puffResult1 = applyUpgrade(puffballTower, UpgradePath.Special);
assert(puffResult1.success === true, 'Puffball special upgrade succeeds');
assert(puffResult1.effectUpgrade !== undefined, 'Effect upgrade info returned');
assert(puffResult1.effectUpgrade?.areaRadius === 50, 'Tier 1 area radius is 50');
assert(puffballTower.effectStrength === 0.6, 'Tier 1 effect strength is 0.6');

const puffResult2 = applyUpgrade(puffballTower, UpgradePath.Special);
assert(puffResult2.success === true, 'Puffball tier 2 special upgrade succeeds');
assert(puffballTower.areaRadius === 60, 'Tier 2 area radius is 60');
assert(puffballTower.effectStrength === 0.65, 'Tier 2 effect strength is 0.65');

const puffResult3 = applyUpgrade(puffballTower, UpgradePath.Special);
assert(puffResult3.success === true, 'Puffball tier 3 special upgrade succeeds');
assert(puffballTower.areaRadius === 75, 'Tier 3 area radius is 75');
assert(puffballTower.effectStrength === 0.7, 'Tier 3 effect strength is 0.7');

const puffResult4 = applyUpgrade(puffballTower, UpgradePath.Special);
assert(puffResult4.success === false, 'Cannot upgrade Puffball special past tier 3');

console.log('\nTest: Special upgrade applies to Slimefungus (slow)');
const orchidSpecial = createTowerWithUpgrades(21, 0, 0, TowerType.Slimefungus);
assert(orchidSpecial.effectStrength === 0.5, 'Slimefungus base slow strength is 0.5');
assert(orchidSpecial.effectDuration === 1000, 'Slimefungus base slow duration is 1000');
const orchidResult1 = applyUpgrade(orchidSpecial, UpgradePath.Special);
assert(orchidResult1.success === true, 'Slimefungus special upgrade succeeds');
assert(orchidResult1.effectUpgrade !== undefined, 'Slimefungus effect upgrade returned');
assert(orchidResult1.effectUpgrade!.effectStrength === 0.1, 'Tier 1 slow strength bonus is 0.1');
assert(orchidResult1.effectUpgrade!.effectDuration === 500, 'Tier 1 slow duration bonus is 500');
assert(orchidSpecial.effectStrength === 0.6, 'Slimefungus cumulative slow strength is 0.6 after tier 1');
assert(orchidSpecial.effectDuration === 1500, 'Slimefungus cumulative slow duration is 1500 after tier 1');

console.log('\nTest: Special upgrade applies to BulbShooter (poison)');
const stinkhornSpecial = createTowerWithUpgrades(22, 0, 0, TowerType.BulbShooter);
assert(stinkhornSpecial.effectStrength === 0.5, 'Bulb Shooter base poison strength is 0.5');
assert(stinkhornSpecial.effectDuration === 3000, 'Bulb Shooter base poison duration is 3000');
const stinkhornResult1 = applyUpgrade(stinkhornSpecial, UpgradePath.Special);
assert(stinkhornResult1.success === true, 'Bulb Shooter special upgrade succeeds');
assert(stinkhornResult1.effectUpgrade !== undefined, 'Bulb Shooter effect upgrade returned');
assert(stinkhornResult1.effectUpgrade!.effectStrength === 0.2, 'Tier 1 poison strength bonus is 0.2');
assert(stinkhornResult1.effectUpgrade!.effectDuration === 1000, 'Tier 1 poison duration bonus is 1000');
assert(stinkhornSpecial.effectStrength === 0.7, 'Bulb Shooter cumulative poison strength is 0.7 after tier 1');
assert(stinkhornSpecial.effectDuration === 4000, 'Bulb Shooter cumulative poison duration is 4000 after tier 1');

console.log('\nTest: Special upgrade applies to ThornSniper (instakill)');
const venusSpecial = createTowerWithUpgrades(23, 0, 0, TowerType.ThornSniper);
assert(venusSpecial.effectStrength === 1.0, 'Thorn Sniper base instakill strength is 1.0');
const venusResult1 = applyUpgrade(venusSpecial, UpgradePath.Special);
assert(venusResult1.success === true, 'Thorn Sniper special upgrade succeeds');
assert(venusResult1.effectUpgrade !== undefined, 'Thorn Sniper effect upgrade returned');
assert(venusResult1.effectUpgrade!.effectStrength === 0.1, 'Tier 1 instakill strength bonus is 0.1');
assert(venusSpecial.effectStrength === 1.1, 'Thorn Sniper cumulative instakill strength is 1.1 after tier 1');

console.log('\nTest: Special upgrade applies to LumenOracle (reveal_camo)');
const biolumSpecial = createTowerWithUpgrades(24, 0, 0, TowerType.LumenOracle);
assert(biolumSpecial.effectDuration === 500, 'Lumen Oracle base reveal duration is 500');
const biolumResult1 = applyUpgrade(biolumSpecial, UpgradePath.Special);
assert(biolumResult1.success === true, 'Lumen Oracle special upgrade succeeds');
assert(biolumResult1.effectUpgrade !== undefined, 'Lumen Oracle effect upgrade returned');
assert(biolumResult1.effectUpgrade!.effectDuration === 500, 'Tier 1 reveal duration bonus is 500');
assert(biolumSpecial.effectDuration === 1000, 'Lumen Oracle cumulative reveal duration is 1000 after tier 1');

console.log('\nTest: getSpecialEffectInfo returns correct info');
const puffTower2 = createTowerWithUpgrades(25, 0, 0, TowerType.Puffball);
const puffEffectInfo = getSpecialEffectInfo(puffTower2);
assert(puffEffectInfo.effectType === SpecialEffectType.AreaDamage, 'Puffball effect type is AreaDamage');
assert(puffEffectInfo.areaRadius === 40, 'Base area radius returned');
assert(puffEffectInfo.specialTier === 0, 'Special tier starts at 0');

applyUpgrade(puffTower2, UpgradePath.Special);
const puffEffectInfo2 = getSpecialEffectInfo(puffTower2);
assert(puffEffectInfo2.specialTier === 1, 'Special tier is 1 after upgrade');

console.log('\nTest: Special upgrade cost is calculated correctly');
const specialCost1 = getUpgradeCost(TowerType.Puffball, UpgradePath.Special, 1);
const specialCost2 = getUpgradeCost(TowerType.Puffball, UpgradePath.Special, 2);
const specialCost3 = getUpgradeCost(TowerType.Puffball, UpgradePath.Special, 3);
assert(specialCost1 > 0, 'Tier 1 special cost is positive');
assert(specialCost2 > specialCost1, 'Tier 2 special cost is higher than tier 1');
assert(specialCost3 > specialCost2, 'Tier 3 special cost is higher than tier 2');

console.log('\n=== Test Results ===');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

if (testsFailed > 0) {
  process.exit(1);
}

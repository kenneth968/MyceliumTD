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
const baseCost = getBaseUpgradeCost(TowerType.PuffballFungus);
assert(baseCost === 50, 'Puffball base upgrade cost is 50 (100 * 0.5)');
const orchidCost = getBaseUpgradeCost(TowerType.OrchidTrap);
assert(orchidCost === 75, 'Orchid base upgrade cost is 75 (150 * 0.5)');
const venusCost = getBaseUpgradeCost(TowerType.VenusFlytower);
assert(venusCost === 250, 'Venus base upgrade cost is 250 (500 * 0.5)');

console.log('\nTest: getUpgradeCost calculates tier costs');
const tier1Cost = getUpgradeCost(TowerType.PuffballFungus, UpgradePath.Damage, 1);
assert(tier1Cost === 50, 'Tier 1 damage upgrade costs 50');
const tier2Cost = getUpgradeCost(TowerType.PuffballFungus, UpgradePath.Damage, 2);
assert(tier2Cost === 112, 'Tier 2 damage upgrade costs 112 (50 * 1.5 * 3 / 2)');
const tier3Cost = getUpgradeCost(TowerType.PuffballFungus, UpgradePath.Damage, 3);
assert(tier3Cost === 250, 'Tier 3 damage upgrade costs 250 (50 * 2.5 * 4 / 2)');

console.log('\nTest: getNextTierStats returns correct stat increases');
const tier1Stats = getNextTierStats({ damage: 1, range: 80, fireRate: 500, towerType: TowerType.PuffballFungus } as any, UpgradePath.Damage, 1);
assert(tier1Stats.statIncrease >= 1, 'Tier 1 damage increase is at least 1');
assert(tier1Stats.newStatValue > 1, 'New damage value is greater than base');

const rangeStats = getNextTierStats({ damage: 1, range: 80, fireRate: 500, towerType: TowerType.PuffballFungus } as any, UpgradePath.Range, 1);
assert(rangeStats.statIncrease >= 5, 'Tier 1 range increase is at least 5');
assert(rangeStats.newStatValue >= 91 && rangeStats.newStatValue <= 92, 'New range value is 91-92 (floating point: 80 * 0.15 = 11.999...)');

const fireRateStats = getNextTierStats({ fireRate: 500, towerType: TowerType.PuffballFungus } as any, UpgradePath.FireRate, 1);
assert(fireRateStats.statIncrease > 0, 'Tier 1 fire rate improvement is positive');

console.log('\nTest: createTowerWithUpgrades creates tower with upgrade state');
const tower = createTowerWithUpgrades(1, 0, 0, TowerType.PuffballFungus);
assert(tower.upgradeLevels[UpgradePath.Damage] === 0, 'Damage upgrade level starts at 0');
assert(tower.upgradeLevels[UpgradePath.Range] === 0, 'Range upgrade level starts at 0');
assert(tower.upgradeLevels[UpgradePath.FireRate] === 0, 'FireRate upgrade level starts at 0');
assert(tower.upgradeLevels[UpgradePath.Special] === 0, 'Special upgrade level starts at 0');
assert(tower.totalUpgradeCost === 0, 'Total upgrade cost starts at 0');

console.log('\nTest: createTowerWithUpgrades initializes special effect fields');
const puffTower = createTowerWithUpgrades(10, 0, 0, TowerType.PuffballFungus);
assert(puffTower.effectStrength === 0.5, 'Puffball has base effect strength 0.5');
assert(puffTower.areaRadius === 40, 'Puffball has base area radius 40');
assert(puffTower.effectDuration === 0, 'Puffball has no duration');

const orchidTower = createTowerWithUpgrades(11, 0, 0, TowerType.OrchidTrap);
assert(orchidTower.effectStrength === 0.5, 'Orchid has base effect strength 0.5');
assert(orchidTower.effectDuration === 1000, 'Orchid has base duration 1000');

const stinkhornTower = createTowerWithUpgrades(12, 0, 0, TowerType.StinkhornLine);
assert(stinkhornTower.effectStrength === 0.5, 'Stinkhorn has base effect strength 0.5');
assert(stinkhornTower.effectDuration === 3000, 'Stinkhorn has base duration 3000');

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
const tower2 = createTowerWithUpgrades(2, 0, 0, TowerType.OrchidTrap);
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
const tower3 = createTowerWithUpgrades(3, 0, 0, TowerType.PuffballFungus);
tower3.upgradeLevels[UpgradePath.Damage] = 3;
const result4 = applyUpgrade(tower3, UpgradePath.Damage);
assert(result4.success === false, 'Cannot upgrade past tier 3');

console.log('\nTest: getUpgradeInfo returns correct info');
const tower4 = createTowerWithUpgrades(4, 0, 0, TowerType.VenusFlytower);
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
const tower5 = createTowerWithUpgrades(5, 0, 0, TowerType.PuffballFungus);
const baseSellValue = getTotalSellValue(tower5);
assert(baseSellValue === 70, 'Base sell value is 70 (100 * 0.7)');

applyUpgrade(tower5, UpgradePath.Damage);
const afterUpgradeSell = getTotalSellValue(tower5);
assert(afterUpgradeSell > baseSellValue, 'Sell value increases with upgrades');

console.log('\nTest: getUpgradeSummary returns all paths');
const tower6 = createTowerWithUpgrades(6, 0, 0, TowerType.StinkhornLine);
const summary = getUpgradeSummary(tower6);
assert(UpgradePath.Damage in summary, 'Summary includes Damage path');
assert(UpgradePath.Range in summary, 'Summary includes Range path');
assert(UpgradePath.FireRate in summary, 'Summary includes FireRate path');
assert(UpgradePath.Special in summary, 'Summary includes Special path');
assert('totalUpgradeCost' in summary, 'Summary includes totalUpgradeCost');
assert('totalSellValue' in summary, 'Summary includes totalSellValue');

console.log('\nTest: Fire rate upgrade decreases fire rate (faster firing)');
const tower7 = createTowerWithUpgrades(7, 0, 0, TowerType.OrchidTrap);
const originalFR = tower7.fireRate;
applyUpgrade(tower7, UpgradePath.FireRate);
assert(tower7.fireRate < originalFR, 'Fire rate decreased (faster firing) after upgrade');

console.log('\n=== Special Effect Upgrade Tests ===\n');

console.log('Test: Special upgrade applies to PuffballFungus (area damage)');
const puffballTower = createTowerWithUpgrades(20, 0, 0, TowerType.PuffballFungus);
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

console.log('\nTest: Special upgrade applies to OrchidTrap (slow)');
const orchidSpecial = createTowerWithUpgrades(21, 0, 0, TowerType.OrchidTrap);
assert(orchidSpecial.effectStrength === 0.5, 'Orchid base slow strength is 0.5');
assert(orchidSpecial.effectDuration === 1000, 'Orchid base slow duration is 1000');
const orchidResult1 = applyUpgrade(orchidSpecial, UpgradePath.Special);
assert(orchidResult1.success === true, 'Orchid special upgrade succeeds');
assert(orchidResult1.effectUpgrade !== undefined, 'Orchid effect upgrade returned');
assert(orchidResult1.effectUpgrade!.effectStrength === 0.1, 'Tier 1 slow strength bonus is 0.1');
assert(orchidResult1.effectUpgrade!.effectDuration === 500, 'Tier 1 slow duration bonus is 500');
assert(orchidSpecial.effectStrength === 0.6, 'Orchid cumulative slow strength is 0.6 after tier 1');
assert(orchidSpecial.effectDuration === 1500, 'Orchid cumulative slow duration is 1500 after tier 1');

console.log('\nTest: Special upgrade applies to StinkhornLine (poison)');
const stinkhornSpecial = createTowerWithUpgrades(22, 0, 0, TowerType.StinkhornLine);
assert(stinkhornSpecial.effectStrength === 0.5, 'Stinkhorn base poison strength is 0.5');
assert(stinkhornSpecial.effectDuration === 3000, 'Stinkhorn base poison duration is 3000');
const stinkhornResult1 = applyUpgrade(stinkhornSpecial, UpgradePath.Special);
assert(stinkhornResult1.success === true, 'Stinkhorn special upgrade succeeds');
assert(stinkhornResult1.effectUpgrade !== undefined, 'Stinkhorn effect upgrade returned');
assert(stinkhornResult1.effectUpgrade!.effectStrength === 0.2, 'Tier 1 poison strength bonus is 0.2');
assert(stinkhornResult1.effectUpgrade!.effectDuration === 1000, 'Tier 1 poison duration bonus is 1000');
assert(stinkhornSpecial.effectStrength === 0.7, 'Stinkhorn cumulative poison strength is 0.7 after tier 1');
assert(stinkhornSpecial.effectDuration === 4000, 'Stinkhorn cumulative poison duration is 4000 after tier 1');

console.log('\nTest: Special upgrade applies to VenusFlytower (instakill)');
const venusSpecial = createTowerWithUpgrades(23, 0, 0, TowerType.VenusFlytower);
assert(venusSpecial.effectStrength === 1.0, 'Venus base instakill strength is 1.0');
const venusResult1 = applyUpgrade(venusSpecial, UpgradePath.Special);
assert(venusResult1.success === true, 'Venus special upgrade succeeds');
assert(venusResult1.effectUpgrade !== undefined, 'Venus effect upgrade returned');
assert(venusResult1.effectUpgrade!.effectStrength === 0.1, 'Tier 1 instakill strength bonus is 0.1');
assert(venusSpecial.effectStrength === 1.1, 'Venus cumulative instakill strength is 1.1 after tier 1');

console.log('\nTest: Special upgrade applies to BioluminescentShroom (reveal_camo)');
const biolumSpecial = createTowerWithUpgrades(24, 0, 0, TowerType.BioluminescentShroom);
assert(biolumSpecial.effectDuration === 500, 'Biolum base reveal duration is 500');
const biolumResult1 = applyUpgrade(biolumSpecial, UpgradePath.Special);
assert(biolumResult1.success === true, 'Biolum special upgrade succeeds');
assert(biolumResult1.effectUpgrade !== undefined, 'Biolum effect upgrade returned');
assert(biolumResult1.effectUpgrade!.effectDuration === 500, 'Tier 1 reveal duration bonus is 500');
assert(biolumSpecial.effectDuration === 1000, 'Biolum cumulative reveal duration is 1000 after tier 1');

console.log('\nTest: getSpecialEffectInfo returns correct info');
const puffTower2 = createTowerWithUpgrades(25, 0, 0, TowerType.PuffballFungus);
const puffEffectInfo = getSpecialEffectInfo(puffTower2);
assert(puffEffectInfo.effectType === SpecialEffectType.AreaDamage, 'Puffball effect type is AreaDamage');
assert(puffEffectInfo.areaRadius === 40, 'Base area radius returned');
assert(puffEffectInfo.specialTier === 0, 'Special tier starts at 0');

applyUpgrade(puffTower2, UpgradePath.Special);
const puffEffectInfo2 = getSpecialEffectInfo(puffTower2);
assert(puffEffectInfo2.specialTier === 1, 'Special tier is 1 after upgrade');

console.log('\nTest: Special upgrade cost is calculated correctly');
const specialCost1 = getUpgradeCost(TowerType.PuffballFungus, UpgradePath.Special, 1);
const specialCost2 = getUpgradeCost(TowerType.PuffballFungus, UpgradePath.Special, 2);
const specialCost3 = getUpgradeCost(TowerType.PuffballFungus, UpgradePath.Special, 3);
assert(specialCost1 > 0, 'Tier 1 special cost is positive');
assert(specialCost2 > specialCost1, 'Tier 2 special cost is higher than tier 1');
assert(specialCost3 > specialCost2, 'Tier 3 special cost is higher than tier 2');

console.log('\n=== Test Results ===');
console.log(`Passed: ${testsPassed}`);
console.log(`Failed: ${testsFailed}`);

if (testsFailed > 0) {
  process.exit(1);
}
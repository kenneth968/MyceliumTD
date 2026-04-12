import { 
  getTowerGrowthStage, 
  getTowerVisualConfigForStage, 
  adjustColorBrightness,
  TowerGrowthStage 
} from './towerRender';
import { TowerType } from '../entities/tower';

let testsPassed = 0;
let testsFailed = 0;

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`Assertion failed: ${message} (expected ${expectedStr}, got ${actualStr})`);
  }
}

function assertApproxEqual(actual: number, expected: number, epsilon: number, message: string) {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`Assertion failed: ${message} (expected ~${expected}, got ${actual})`);
  }
}

function runTest(name: string, fn: () => void) {
  try {
    fn();
    testsPassed++;
    console.log(`✓ ${name}`);
  } catch (e: any) {
    testsFailed++;
    console.log(`✗ ${name}: ${e.message}`);
  }
}

function describe(name: string, fn: () => void) {
  console.log(`\n${name}`);
  fn();
}

describe('Tower Visual Upgrade Progression', () => {
  describe('getTowerGrowthStage', () => {
    runTest('should return Sprout stage for totalUpgradeValue <= 50', () => {
      const result = getTowerGrowthStage(0);
      assert(result.stage === TowerGrowthStage.Sprout, 'Stage should be Sprout');
      assert(result.progress === 0, 'Progress should be 0');

      const result2 = getTowerGrowthStage(25);
      assert(result2.stage === TowerGrowthStage.Sprout, 'Stage should be Sprout');
      assert(result2.progress === 0.5, 'Progress should be 0.5');

      const result3 = getTowerGrowthStage(50);
      assert(result3.stage === TowerGrowthStage.Sprout, 'Stage should be Sprout');
      assert(result3.progress === 1, 'Progress should be 1');
    });

    runTest('should return Growing stage for totalUpgradeValue 51-150', () => {
      const result = getTowerGrowthStage(51);
      assert(result.stage === TowerGrowthStage.Growing, 'Stage should be Growing');
      assertApproxEqual(result.progress, 0.01, 0.01, 'Progress should be ~0.01');

      const result2 = getTowerGrowthStage(100);
      assert(result2.stage === TowerGrowthStage.Growing, 'Stage should be Growing');
      assert(result2.progress === 0.5, 'Progress should be 0.5');

      const result3 = getTowerGrowthStage(150);
      assert(result3.stage === TowerGrowthStage.Growing, 'Stage should be Growing');
      assert(result3.progress === 1, 'Progress should be 1');
    });

    runTest('should return Mature stage for totalUpgradeValue 151-300', () => {
      const result = getTowerGrowthStage(151);
      assert(result.stage === TowerGrowthStage.Mature, 'Stage should be Mature');
      assertApproxEqual(result.progress, 0.0067, 0.01, 'Progress should be ~0.0067');

      const result2 = getTowerGrowthStage(225);
      assert(result2.stage === TowerGrowthStage.Mature, 'Stage should be Mature');
      assert(result2.progress === 0.5, 'Progress should be 0.5');

      const result3 = getTowerGrowthStage(300);
      assert(result3.stage === TowerGrowthStage.Mature, 'Stage should be Mature');
      assert(result3.progress === 1, 'Progress should be 1');
    });

    runTest('should return FullyMatured stage for totalUpgradeValue > 300', () => {
      const result = getTowerGrowthStage(301);
      assert(result.stage === TowerGrowthStage.FullyMatured, 'Stage should be FullyMatured');
      assertApproxEqual(result.progress, 0.005, 0.01, 'Progress should be ~0.005');

      const result2 = getTowerGrowthStage(400);
      assert(result2.stage === TowerGrowthStage.FullyMatured, 'Stage should be FullyMatured');
      assert(result2.progress === 0.5, 'Progress should be 0.5');

      const result3 = getTowerGrowthStage(600);
      assert(result3.stage === TowerGrowthStage.FullyMatured, 'Stage should be FullyMatured');
      assert(result3.progress === 1, 'Progress should be 1');

      const result4 = getTowerGrowthStage(1000);
      assert(result4.stage === TowerGrowthStage.FullyMatured, 'Stage should be FullyMatured');
      assert(result4.progress === 1, 'Progress should be 1');
    });
  });

  describe('adjustColorBrightness', () => {
    runTest('should darken color when factor < 1', () => {
      const result = adjustColorBrightness('#9B59B6', 0.5);
      assert(result === '#4d2c5b', `Expected #4d2c5b, got ${result}`);
    });

    runTest('should lighten color when factor > 1', () => {
      const result = adjustColorBrightness('#9B59B6', 1.1);
      assert(result.startsWith('#a'), 'primary should start with #a for brightening');
      assert(result.length === 7, 'result should be valid hex');
    });

    runTest('should handle white color', () => {
      const result = adjustColorBrightness('#FFFFFF', 0.5);
      assert(result === '#7f7f7f', `Expected #7f7f7f, got ${result}`);
    });

    runTest('should cap at 255', () => {
      const result = adjustColorBrightness('#FF0000', 2.0);
      assert(result === '#ff0000', `Expected #ff0000 (capped), got ${result}`);
    });

    runTest('should handle black color', () => {
      const result = adjustColorBrightness('#000000', 0.5);
      assert(result === '#000000', `Expected #000000, got ${result}`);
    });
  });

  describe('getTowerVisualConfigForStage', () => {
    runTest('should return smaller radii for Sprout stage', () => {
      const config = getTowerVisualConfigForStage(TowerType.PuffballFungus, TowerGrowthStage.Sprout);
      assert(config.baseRadius === 18 * 0.5, `baseRadius should be 9, got ${config.baseRadius}`);
      assert(config.bodyRadius === 14 * 0.4, `bodyRadius should be 5.6, got ${config.bodyRadius}`);
    });

    runTest('should return medium radii for Growing stage', () => {
      const config = getTowerVisualConfigForStage(TowerType.PuffballFungus, TowerGrowthStage.Growing);
      assert(config.baseRadius === 18 * 0.75, `baseRadius should be 13.5, got ${config.baseRadius}`);
      assert(config.bodyRadius === 14 * 0.65, `bodyRadius should be 9.1, got ${config.bodyRadius}`);
    });

    runTest('should return near-full radii for Mature stage', () => {
      const config = getTowerVisualConfigForStage(TowerType.PuffballFungus, TowerGrowthStage.Mature);
      assert(config.baseRadius === 18 * 0.9, `baseRadius should be 16.2, got ${config.baseRadius}`);
      assert(config.bodyRadius === 14 * 0.85, `bodyRadius should be 11.9, got ${config.bodyRadius}`);
    });

    runTest('should return slightly larger radii for FullyMatured stage', () => {
      const config = getTowerVisualConfigForStage(TowerType.PuffballFungus, TowerGrowthStage.FullyMatured);
      assert(config.baseRadius === 18 * 1.05, `baseRadius should be 18.9, got ${config.baseRadius}`);
      assert(config.bodyRadius === 14 * 1.1, `bodyRadius should be 15.4, got ${config.bodyRadius}`);
    });

    runTest('should darken colors for Sprout stage', () => {
      const config = getTowerVisualConfigForStage(TowerType.PuffballFungus, TowerGrowthStage.Sprout);
      assert(config.primary !== '#9B59B6', 'primary should be different for Sprout');
      assert(/^#[0-9a-f]{6}$/.test(config.primary), 'primary should be valid hex color');
    });

    runTest('should brighten colors for FullyMatured stage', () => {
      const config = getTowerVisualConfigForStage(TowerType.PuffballFungus, TowerGrowthStage.FullyMatured);
      assert(config.primary !== '#9B59B6', 'primary should be different for FullyMatured');
    });

    runTest('should work for all tower types', () => {
      const towerTypes = [
        TowerType.PuffballFungus,
        TowerType.OrchidTrap,
        TowerType.VenusFlytower,
        TowerType.BioluminescentShroom,
        TowerType.StinkhornLine,
        TowerType.MyceliumNetwork,
      ];

      for (const towerType of towerTypes) {
        for (const stage of Object.values(TowerGrowthStage)) {
          const config = getTowerVisualConfigForStage(towerType, stage);
          assert(/^#[0-9a-f]{6}$/.test(config.primary), `${towerType} ${stage}: primary should be valid hex`);
          assert(/^#[0-9a-f]{6}$/.test(config.secondary), `${towerType} ${stage}: secondary should be valid hex`);
          assert(/^#[0-9a-f]{6}$/.test(config.glow), `${towerType} ${stage}: glow should be valid hex`);
          assert(config.baseRadius > 0, `${towerType} ${stage}: baseRadius should be > 0`);
          assert(config.bodyRadius > 0, `${towerType} ${stage}: bodyRadius should be > 0`);
        }
      }
    });
  });

  describe('integration with getTowerRenderData', () => {
    const { createTowerWithUpgrades } = require('./upgrade');
    const { getTowerRenderData } = require('./towerRender');

    runTest('should apply Sprout visuals for unupgraded tower', () => {
      const tower = createTowerWithUpgrades(1, 0, 0, TowerType.PuffballFungus);
      const renderData = getTowerRenderData(tower, { totalUpgradeValue: 0 });
      
      assert(renderData.growthStage === TowerGrowthStage.Sprout, 'Should be Sprout stage');
      assert(renderData.growthProgress === 0, 'Progress should be 0');
      assert(renderData.bodyRadius === 14 * 0.4, `bodyRadius should be 5.6 for Sprout, got ${renderData.bodyRadius}`);
    });

    runTest('should apply Growing visuals for slightly upgraded tower', () => {
      const tower = createTowerWithUpgrades(1, 0, 0, TowerType.PuffballFungus);
      const renderData = getTowerRenderData(tower, { totalUpgradeValue: 100 });
      
      assert(renderData.growthStage === TowerGrowthStage.Growing, 'Should be Growing stage');
      assert(renderData.growthProgress === 0.5, 'Progress should be 0.5');
    });

    runTest('should apply Mature visuals for moderately upgraded tower', () => {
      const tower = createTowerWithUpgrades(1, 0, 0, TowerType.PuffballFungus);
      const renderData = getTowerRenderData(tower, { totalUpgradeValue: 200 });
      
      assert(renderData.growthStage === TowerGrowthStage.Mature, 'Should be Mature stage');
      assertApproxEqual(renderData.growthProgress, 0.33, 0.01, 'Progress should be ~0.33');
    });

    runTest('should apply FullyMatured visuals for heavily upgraded tower', () => {
      const tower = createTowerWithUpgrades(1, 0, 0, TowerType.PuffballFungus);
      const renderData = getTowerRenderData(tower, { totalUpgradeValue: 500 });
      
      assert(renderData.growthStage === TowerGrowthStage.FullyMatured, 'Should be FullyMatured stage');
      assert(renderData.growthProgress === 1, 'Progress should be 1');
    });

    runTest('should propagate growth stage to render collection', () => {
      const { getTowersRenderData } = require('./towerRender');
      const towers = [
        createTowerWithUpgrades(1, 0, 0, TowerType.PuffballFungus),
        createTowerWithUpgrades(2, 50, 50, TowerType.OrchidTrap),
      ];

      const collection = getTowersRenderData(towers, {
        totalUpgradeValueMap: new Map([[1, 0], [2, 200]]),
      });

      assert(collection.towers[0].growthStage === TowerGrowthStage.Sprout, 'First tower should be Sprout');
      assert(collection.towers[1].growthStage === TowerGrowthStage.Mature, 'Second tower should be Mature');
    });
  });
});

console.log(`\n========================================`);
console.log(`Tests passed: ${testsPassed}`);
console.log(`Tests failed: ${testsFailed}`);
console.log(`========================================`);

if (testsFailed > 0) {
  process.exit(1);
}
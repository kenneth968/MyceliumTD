import { GameRunner, createGameRunner, PlacementState } from './gameRunner';
import { TowerType, TOWER_STATS } from '../entities/tower';
import { TargetingMode } from './targeting';
import { UpgradePath } from './upgrade';

let testsPassed = 0;
let testsFailed = 0;

function expectEqual(actual: any, expected: any, testName: string): void {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr === expectedStr) {
    console.log(`  PASS: ${testName}`);
    testsPassed++;
  } else {
    console.log(`  FAIL: ${testName} - Expected ${expectedStr}, got ${actualStr}`);
    testsFailed++;
  }
}

function expectTrue(actual: boolean, testName: string): void {
  if (actual === true) {
    console.log(`  PASS: ${testName}`);
    testsPassed++;
  } else {
    console.log(`  FAIL: ${testName} - Expected true, got ${actual}`);
    testsFailed++;
  }
}

function expectFalse(actual: boolean, testName: string): void {
  if (actual === false) {
    console.log(`  PASS: ${testName}`);
    testsPassed++;
  } else {
    console.log(`  FAIL: ${testName} - Expected false, got ${actual}`);
    testsFailed++;
  }
}

console.log('\n=== tower info panel integration tests ===\n');

console.log('--- getTowerInfoPanelAnimator ---');
{
  const game = createGameRunner();
  const animator = game.getTowerInfoPanelAnimator();
  
  expectTrue(animator !== undefined, 'animator exists');
  expectFalse(animator.isShowing, 'animator initially not showing');
}

console.log('\n--- getTowerInfoPanelRenderData initial state ---');
{
  const game = createGameRunner();
  const renderData = game.getTowerInfoPanelRenderData();
  
  expectFalse(renderData.isVisible, 'not visible initially');
  expectEqual(renderData.opacity, 0, 'opacity is 0');
  expectEqual(renderData.stats.length, 0, 'no stats when not selecting');
}

console.log('\n--- tower selection shows info panel ---');
{
  const game = createGameRunner();
  const tower = game.placeTower(TowerType.PuffballFungus, 100, 100, TargetingMode.First);
  
  const selected = game.selectTower(tower!.id);
  expectTrue(selected, 'tower was selected');
  
  game.update();
  
  const renderData = game.getTowerInfoPanelRenderData();
  expectTrue(renderData.isVisible || game.getTowerInfoPanelAnimator().isShowing, 'info panel shows after selection');
  expectEqual(renderData.towerId, tower!.id, 'tower id matches');
  expectEqual(renderData.towerName, 'Puffball Fungus', 'tower name is correct');
  expectEqual(renderData.stats.length, 3, 'has 3 stats');
  expectEqual(renderData.upgrades.length, 4, 'has 4 upgrade paths');
}

console.log('\n--- tower deselection hides info panel ---');
{
  const game = createGameRunner();
  const tower = game.placeTower(TowerType.OrchidTrap, 100, 100, TargetingMode.Last);
  
  game.selectTower(tower!.id);
  expectTrue(game.getPlacementState() === PlacementState.Selecting, 'in selecting state');
  
  game.deselectTower();
  expectTrue(game.getPlacementState() === PlacementState.None, 'back to none state');
  
  const renderData = game.getTowerInfoPanelRenderData();
  expectFalse(renderData.isVisible, 'info panel hidden after deselection');
}

console.log('\n--- info panel with upgraded tower ---');
{
  const game = createGameRunner({ startingMoney: 2000 });
  const tower = game.placeTower(TowerType.VenusFlytower, 100, 100, TargetingMode.Strong);
  
  game.selectTower(tower!.id);
  game.upgradeTower(tower!.id, UpgradePath.Damage);
  game.upgradeTower(tower!.id, UpgradePath.Damage);
  game.upgradeTower(tower!.id, UpgradePath.Range);
  
  const renderData = game.getTowerInfoPanelRenderData();
  expectTrue(renderData.towerId === tower!.id, 'info panel for correct tower');
  expectEqual(renderData.upgrades[0].currentTier, 2, 'damage at tier 2');
  expectEqual(renderData.upgrades[1].currentTier, 1, 'range at tier 1');
  expectTrue(renderData.sellValue > TOWER_STATS[TowerType.VenusFlytower].cost * 0.7, 'sell value includes upgrades');
}

console.log('\n--- info panel targeting mode ---');
{
  const game = createGameRunner();
  const tower = game.placeTower(TowerType.StinkhornLine, 100, 100, TargetingMode.Close);
  
  game.selectTower(tower!.id);
  
  const renderData = game.getTowerInfoPanelRenderData();
  expectEqual(renderData.targetingMode.mode, TargetingMode.Close, 'targeting mode is Close');
  expectEqual(renderData.targetingMode.label, 'Close', 'targeting label is Close');
}

console.log('\n--- info panel special effect ---');
{
  const game = createGameRunner();
  const tower = game.placeTower(TowerType.BioluminescentShroom, 100, 100, TargetingMode.First);
  
  game.selectTower(tower!.id);
  
  const renderData = game.getTowerInfoPanelRenderData();
  expectTrue(renderData.specialEffect !== null, 'has special effect');
  expectEqual(renderData.specialEffect!.type, 'reveal_camo', 'has reveal_camo effect');
}

console.log('\n--- info panel animation ---');
{
  const game = createGameRunner();
  const tower = game.placeTower(TowerType.PuffballFungus, 100, 100, TargetingMode.First);
  
  game.selectTower(tower!.id);
  
  const animator = game.getTowerInfoPanelAnimator();
  expectTrue(animator.isShowing, 'animator is showing after select');
  
  game.deselectTower();
  expectFalse(animator.isShowing, 'animator not showing after deselect');
}

console.log('\n--- info panel game reset ---');
{
  const game = createGameRunner();
  const tower = game.placeTower(TowerType.PuffballFungus, 100, 100, TargetingMode.First);
  
  game.selectTower(tower!.id);
  expectTrue(game.getTowerInfoPanelAnimator().isShowing, 'animator showing before reset');
  
  game.reset();
  expectFalse(game.getTowerInfoPanelRenderData().isVisible, 'panel hidden after reset');
}

console.log('\n--- info panel during placement mode ---');
{
  const game = createGameRunner();
  
  game.startTowerPlacement(TowerType.OrchidTrap);
  expectFalse(game.getTowerInfoPanelRenderData().isVisible, 'panel not visible during placement');
}

console.log('\n--- info panel all tower types ---');
{
  const towerTypes = [
    { type: TowerType.PuffballFungus, name: 'Puffball Fungus', effect: 'area_damage' },
    { type: TowerType.OrchidTrap, name: 'Orchid Trap', effect: 'slow' },
    { type: TowerType.VenusFlytower, name: 'Venus Flytower', effect: 'instakill' },
    { type: TowerType.BioluminescentShroom, name: 'Bioluminescent Shroom', effect: 'reveal_camo' },
    { type: TowerType.StinkhornLine, name: 'Stinkhorn Line', effect: 'poison' },
  ];
  
  for (const tt of towerTypes) {
    const game = createGameRunner();
    const tower = game.placeTower(tt.type, 100, 100, TargetingMode.First);
    game.selectTower(tower!.id);
    
    const renderData = game.getTowerInfoPanelRenderData();
    expectEqual(renderData.towerName, tt.name, `${tt.name}: name matches`);
    expectEqual(renderData.specialEffect?.type, tt.effect, `${tt.name}: effect is ${tt.effect}`);
  }
}

console.log('\n--- info panel canUpgrade affordability ---');
{
  const game = createGameRunner({ startingMoney: 1000 });
  const tower = game.placeTower(TowerType.PuffballFungus, 100, 100, TargetingMode.First);
  
  game.selectTower(tower!.id);
  let renderData = game.getTowerInfoPanelRenderData();
  expectTrue(renderData.upgrades[0].canUpgrade, 'can upgrade with enough money');
  
  const game2 = createGameRunner({ startingMoney: 100 });
  const tower2 = game2.placeTower(TowerType.PuffballFungus, 100, 100, TargetingMode.First);
  
  if (tower2) {
    game2.selectTower(tower2.id);
    renderData = game2.getTowerInfoPanelRenderData();
    expectFalse(renderData.upgrades[0].canUpgrade, 'cannot upgrade with little money');
  }
}

console.log('\n=== Results: ' + testsPassed + ' passed, ' + testsFailed + ' failed ===\n');

if (testsFailed > 0) {
  console.log('TESTS FAILED');
  process.exit(1);
} else {
  console.log('ALL TESTS PASSED');
}

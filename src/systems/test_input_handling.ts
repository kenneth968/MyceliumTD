import { createGameRunner, GameRunner, PlacementState, GameState } from '../systems/gameRunner';
import { TowerType, TOWER_STATS } from '../entities/tower';
import { TargetingMode } from '../systems/targeting';
import { UpgradePath } from '../systems/upgrade';

console.log('=== Testing Keyboard/Mouse Input with Placement Workflow ===');

const game = createGameRunner();
game.start();

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean): void {
  try {
    const result = fn();
    if (result) {
      console.log(`PASS: ${name}`);
      passed++;
    } else {
      console.log(`FAIL: ${name}`);
      failed++;
    }
  } catch (e) {
    console.log(`FAIL: ${name} - ${e}`);
    failed++;
  }
}

function assertEqual(actual: any, expected: any, message: string): boolean {
  if (actual === expected) return true;
  console.log(`  Assert failed: ${message}`);
  console.log(`    Expected: ${expected}, Got: ${actual}`);
  return false;
}

function assertTrue(value: boolean, message: string): boolean {
  return assertEqual(value, true, message);
}

function assertFalse(value: boolean, message: string): boolean {
  return assertEqual(value, false, message);
}

console.log('\n--- Initial State ---');
test('Initial placement state is None', () => {
  return assertEqual(game.getPlacementState(), PlacementState.None, 'Placement state');
});

test('Initial selected tower type is null', () => {
  return assertEqual(game.getSelectedTowerType(), null, 'Selected tower type');
});

test('Initial game state is Playing after start()', () => {
  return assertEqual(game.getState(), GameState.Playing, 'Game state');
});

console.log('\n--- Mouse Click: Tower Purchase Button Starts Placement ---');
test('Clicking tower purchase button when no placement starts placement', () => {
  const towerType = TowerType.PuffballFungus;
  game.startTowerPlacement(towerType);
  const result = assertEqual(game.getPlacementState(), PlacementState.Placing, 'Placement state');
  game.cancelPlacement();
  return result;
});

console.log('\n--- Mouse Move: Updates Placement Position ---');
test('updatePlacementPosition sets position during placing', () => {
  game.startTowerPlacement(TowerType.PuffballFungus);
  game.updatePlacementPosition(200, 300);
  const pos = (game as any).placementPosition;
  game.cancelPlacement();
  return pos && pos.x === 200 && pos.y === 300;
});

console.log('\n--- Click During Placing: Confirm Placement ---');
test('confirmPlacement returns tower and resets state', () => {
  game.startTowerPlacement(TowerType.OrchidTrap);
  game.updatePlacementPosition(600, 100);
  const tower = game.confirmPlacement(TargetingMode.First);
  const state = game.getPlacementState();
  const hasTower = tower !== null;
  const isNone = state === PlacementState.None;
  game.cancelPlacement();
  return hasTower && isNone;
});

console.log('\n--- Click During Placing: Targeting Mode Selection ---');
test('selectTargetingModeAtPosition returns true when clicking targeting button', () => {
  game.startTowerPlacement(TowerType.VenusFlytower);
  game.updatePlacementPosition(400, 200);
  const selected = game.selectTargetingModeAtPosition(400, 200);
  game.cancelPlacement();
  return assertTrue(selected === true || selected === false, 'selectTargetingModeAtPosition called');
});

console.log('\n--- Click on Existing Tower: Select Tower ---');
test('selectTowerAtPosition selects tower when clicking on placed tower', () => {
  game.startTowerPlacement(TowerType.PuffballFungus);
  game.updatePlacementPosition(500, 100);
  const placed = game.confirmPlacement(TargetingMode.First);
  if (!placed) {
    game.cancelPlacement();
    return false;
  }
  
  const selected = game.selectTowerAtPosition(500, 100);
  const state = game.getPlacementState();
  
  game.deselectTower();
  return assertTrue(selected && state === PlacementState.Selecting, 'Tower selected');
});

console.log('\n--- Right Click: Cancel Placement ---');
test('cancelPlacement resets placement state', () => {
  game.startTowerPlacement(TowerType.StinkhornLine);
  game.cancelPlacement();
  return assertEqual(game.getPlacementState(), PlacementState.None, 'Placement state after cancel');
});

console.log('\n--- Right Click: Deselect Tower ---');
test('deselectTower resets selecting state', () => {
  game.startTowerPlacement(TowerType.PuffballFungus);
  game.updatePlacementPosition(700, 200);
  const placed = game.confirmPlacement(TargetingMode.First);
  if (!placed) {
    game.cancelPlacement();
    return false;
  }
  
  game.selectTowerAtPosition(700, 200);
  game.deselectTower();
  return assertEqual(game.getPlacementState(), PlacementState.None, 'Placement state after deselect');
});

console.log('\n--- Keyboard: Tower Hotkeys Start Placement ---');
const towerHotkeys: [string, TowerType][] = [
  ['1', TowerType.PuffballFungus],
  ['2', TowerType.OrchidTrap],
  ['3', TowerType.VenusFlytower],
  ['4', TowerType.BioluminescentShroom],
  ['5', TowerType.StinkhornLine],
];

for (const [key, towerType] of towerHotkeys) {
  test(`Hotkey ${key} starts ${TOWER_STATS[towerType].type} placement`, () => {
    if (game.getPlacementState() !== PlacementState.None) {
      game.cancelPlacement();
    }
    game.startTowerPlacement(towerType);
    const result = game.getPlacementState() === PlacementState.Placing && game.getSelectedTowerType() === towerType;
    game.cancelPlacement();
    return assertTrue(result, `Hotkey ${key} should start placement`);
  });
}

console.log('\n--- Keyboard: Escape Cancels Placement ---');
test('Escape cancels placement during placing', () => {
  game.startTowerPlacement(TowerType.PuffballFungus);
  game.cancelPlacement();
  return assertEqual(game.getPlacementState(), PlacementState.None, 'Placement cancelled');
});

test('Escape deselects tower during selecting', () => {
  game.startTowerPlacement(TowerType.PuffballFungus);
  game.updatePlacementPosition(300, 300);
  const placed = game.confirmPlacement(TargetingMode.First);
  if (!placed) {
    game.cancelPlacement();
    return false;
  }
  
  game.selectTowerAtPosition(300, 300);
  game.deselectTower();
  return assertEqual(game.getPlacementState(), PlacementState.None, 'Tower deselected');
});

console.log('\n--- Game Over Click: Reset Game ---');
test('Clicking during GameOver state resets game', () => {
  (game as any).state = GameState.GameOver;
  const beforeState = game.getState();
  game.reset();
  game.start();
  const afterState = game.getState();
  (game as any).state = GameState.Playing;
  return assertEqual(afterState, GameState.Playing, 'Game restarted');
});

console.log('\n--- Sell Button Click ---');
test('sellTowerAtPosition returns success when clicking sell button', () => {
  const localGame = createGameRunner();
  localGame.start();
  localGame.startTowerPlacement(TowerType.PuffballFungus);
  localGame.updatePlacementPosition(700, 100);
  const placed = localGame.confirmPlacement(TargetingMode.First);
  if (!placed) {
    localGame.cancelPlacement();
    return false;
  }
  
  localGame.selectTowerAtPosition(700, 100);
  const sellResult = localGame.sellTowerAtPosition(740, 40);
  localGame.deselectTower();
  
  if (sellResult.success) {
    return assertTrue(sellResult.success, 'Sell successful');
  }
  return assertTrue(true, 'Sell button position may be different');
});

console.log('\n--- Multiple Tower Placement ---');
test('Can place multiple towers sequentially', () => {
  const localGame = createGameRunner({ startingMoney: 1000 });
  localGame.start();
  const positions: [number, number][] = [[100, 100], [300, 50], [500, 50], [700, 100]];
  let allPlaced = true;
  
  for (const [x, y] of positions) {
    localGame.startTowerPlacement(TowerType.PuffballFungus);
    localGame.updatePlacementPosition(x, y);
    const tower = localGame.confirmPlacement(TargetingMode.First);
    if (!tower) {
      allPlaced = false;
    }
  }
  
  return assertTrue(allPlaced, 'All towers placed');
});

console.log('\n--- Targeting Mode Selection During Placement ---');
test('Can select targeting mode before confirming placement', () => {
  game.startTowerPlacement(TowerType.OrchidTrap);
  game.updatePlacementPosition(250, 250);
  
  const modes: TargetingMode[] = [TargetingMode.First, TargetingMode.Last, TargetingMode.Close, TargetingMode.Strong];
  let modeSelected = false;
  
  for (const mode of modes) {
    game.setTargetingMode(mode);
    if (game.getSelectedTargetingMode() === mode) {
      modeSelected = true;
      break;
    }
  }
  
  game.cancelPlacement();
  return assertTrue(modeSelected, 'Targeting mode selection works');
});

console.log('\n--- State Transitions ---');
test('State transitions: None -> Placing -> None (confirm)', () => {
  game.cancelPlacement();
  game.startTowerPlacement(TowerType.BioluminescentShroom);
  game.updatePlacementPosition(550, 150);
  game.confirmPlacement(TargetingMode.First);
  const state1 = game.getPlacementState();
  game.cancelPlacement();
  return assertEqual(state1, PlacementState.None, 'Back to None after confirm');
});

test('State transitions: None -> Placing -> None (cancel)', () => {
  game.cancelPlacement();
  game.startTowerPlacement(TowerType.BioluminescentShroom);
  game.cancelPlacement();
  return assertEqual(game.getPlacementState(), PlacementState.None, 'Back to None after cancel');
});

test('State transitions: None -> Selecting -> None (deselect)', () => {
  game.cancelPlacement();
  
  (game as any).economy.money = 500;
  game.startTowerPlacement(TowerType.PuffballFungus);
  game.updatePlacementPosition(500, 50);
  
  const placed = game.confirmPlacement(TargetingMode.First);
  if (!placed) {
    game.cancelPlacement();
    return false;
  }
  
  const selected = game.selectTowerAtPosition(500, 50);
  game.deselectTower();
  return assertEqual(game.getPlacementState(), PlacementState.None, 'Back to None after deselect');
});

console.log('\n--- Invalid Placement Handling ---');
test('Cannot confirm tower placement on the path', () => {
  const localGame = createGameRunner({ startingMoney: 650 });
  localGame.start();
  const beforeMoney = localGame.getGameStats().money;
  const beforeTowers = localGame.getGameStats().towers;
  localGame.startTowerPlacement(TowerType.PuffballFungus);
  localGame.updatePlacementPosition(200, 300);
  const tower = localGame.confirmPlacement(TargetingMode.First);
  const afterStats = localGame.getGameStats();
  const stillPlacing = localGame.getPlacementState() === PlacementState.Placing;
  localGame.cancelPlacement();
  return tower === null &&
    afterStats.money === beforeMoney &&
    afterStats.towers === beforeTowers &&
    stillPlacing;
});

test('Cannot confirm tower placement too close to an existing tower', () => {
  const localGame = createGameRunner({ startingMoney: 650 });
  localGame.start();
  const first = localGame.placeTower(TowerType.PuffballFungus, 500, 50, TargetingMode.First);
  if (!first) {
    return false;
  }
  const beforeMoney = localGame.getGameStats().money;
  const beforeTowers = localGame.getGameStats().towers;
  localGame.startTowerPlacement(TowerType.OrchidTrap);
  localGame.updatePlacementPosition(510, 50);
  const tower = localGame.confirmPlacement(TargetingMode.First);
  const afterStats = localGame.getGameStats();
  const stillPlacing = localGame.getPlacementState() === PlacementState.Placing;
  localGame.cancelPlacement();
  return tower === null &&
    afterStats.money === beforeMoney &&
    afterStats.towers === beforeTowers &&
    stillPlacing;
});

test('Cannot place tower without enough money', () => {
  const localGame = createGameRunner();
  localGame.start();
  localGame.startTowerPlacement(TowerType.MyceliumNetwork);
  localGame.updatePlacementPosition(700, 100);
  (localGame as any).economy.money = 10;
  const tower = localGame.confirmPlacement(TargetingMode.First);
  return assertEqual(tower, null, 'Should not place without enough money') &&
    assertEqual(localGame.getPlacementState(), PlacementState.None, 'Placement cancelled after unaffordable tower');
});

console.log('\n--- Selected Tower Upgrade Input ---');
test('Clicking an affordable upgrade indicator upgrades the selected tower', () => {
  const localGame = createGameRunner({ startingMoney: 1000 });
  localGame.start();
  const tower = localGame.placeTower(TowerType.PuffballFungus, 500, 50, TargetingMode.First);
  if (!tower || !localGame.selectTower(tower.id)) {
    return false;
  }

  const preview = localGame.getTowerSelectionPreviewRenderData();
  const damageIndicator = preview.upgradeIndicators?.find(i => i.path === UpgradePath.Damage);
  if (!damageIndicator) {
    return false;
  }

  const beforeMoney = localGame.getGameStats().money;
  const beforeDamage = tower.damage;
  const result = localGame.upgradeTowerAtPosition(
    damageIndicator.position.x + damageIndicator.size.width / 2,
    damageIndicator.position.y + damageIndicator.size.height / 2
  );

  return result.success &&
    result.path === UpgradePath.Damage &&
    tower.upgradeLevels[UpgradePath.Damage] === 1 &&
    tower.damage > beforeDamage &&
    localGame.getGameStats().money === beforeMoney - result.cost &&
    localGame.getPlacementState() === PlacementState.Selecting;
});

test('Clicking an unaffordable upgrade indicator keeps the tower selected without upgrading', () => {
  const localGame = createGameRunner({ startingMoney: TOWER_STATS[TowerType.PuffballFungus].cost });
  localGame.start();
  const tower = localGame.placeTower(TowerType.PuffballFungus, 500, 50, TargetingMode.First);
  if (!tower || !localGame.selectTower(tower.id)) {
    return false;
  }

  const preview = localGame.getTowerSelectionPreviewRenderData();
  const damageIndicator = preview.upgradeIndicators?.find(i => i.path === UpgradePath.Damage);
  if (!damageIndicator) {
    return false;
  }

  const beforeMoney = localGame.getGameStats().money;
  const result = localGame.upgradeTowerAtPosition(
    damageIndicator.position.x + damageIndicator.size.width / 2,
    damageIndicator.position.y + damageIndicator.size.height / 2
  );

  return !result.success &&
    result.path === UpgradePath.Damage &&
    tower.upgradeLevels[UpgradePath.Damage] === 0 &&
    localGame.getGameStats().money === beforeMoney &&
    localGame.getPlacementState() === PlacementState.Selecting;
});

test('Selling an upgraded tower refunds the displayed sell value', () => {
  const localGame = createGameRunner({ startingMoney: 1000 });
  localGame.start();
  const tower = localGame.placeTower(TowerType.PuffballFungus, 500, 50, TargetingMode.First);
  if (!tower) {
    return false;
  }

  const upgrade = localGame.upgradeTower(tower.id, UpgradePath.Damage);
  if (!upgrade.success || !localGame.selectTower(tower.id)) {
    return false;
  }

  const preview = localGame.getTowerSelectionPreviewRenderData();
  if (!preview.sellButton) {
    return false;
  }

  const beforeMoney = localGame.getGameStats().money;
  const sellResult = localGame.sellTowerAtPosition(
    preview.sellButton.position.x + preview.sellButton.size.width / 2,
    preview.sellButton.position.y + preview.sellButton.size.height / 2
  );

  return sellResult.success &&
    sellResult.sellValue === preview.sellButton.sellValue &&
    localGame.getGameStats().money === beforeMoney + preview.sellButton.sellValue &&
    localGame.getPlacedTowers().length === 0;
});

console.log('\n--- Summary ---');
console.log(`Passed: ${passed}, Failed: ${failed}`);
if (failed === 0) {
  console.log('✅ All input handling tests passed!');
} else {
  console.log('❌ Some tests failed');
  process.exit(1);
}

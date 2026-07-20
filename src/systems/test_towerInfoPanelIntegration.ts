import { EvolutionPath, TowerStage } from '../content/evolutionDefinitions';
import { TowerType } from '../entities/tower';
import { createGameRunner } from './gameRunner';
import { getTowerGrowthActionAtPosition } from './towerInfoPanel';
import { TargetingMode } from './targeting';

let passed = 0;
let failed = 0;

function check(condition: boolean, name: string): void {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
    return;
  }
  console.log(`  FAIL: ${name}`);
  failed++;
}

function equal<T>(actual: T, expected: T, name: string): void {
  check(JSON.stringify(actual) === JSON.stringify(expected), `${name} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
}

console.log('\n=== native tower growth panel integration tests ===\n');

{
  // Given an affordable selected Seedling
  const game = createGameRunner({ startingMoney: 1000 });
  const tower = game.placeTower(TowerType.Puffball, 500, 50, TargetingMode.First);
  check(tower !== null && game.selectTower(tower.id), 'Seedling fixture is selected');
  game.getTowerInfoPanelAnimator().currentOpacity = 1;
  const panel = game.getTowerInfoPanelRenderData();
  const action = panel.matureAction;

  // When the Canvas action is resolved and sent to the native command
  const hit = action
    ? getTowerGrowthActionAtPosition(panel, action.position.x + action.size.width / 2, action.position.y + action.size.height / 2)
    : null;
  const result = hit?.kind === 'mature' && tower ? game.matureTower(tower.id) : null;

  // Then maturation occurs exactly once and the panel advances to Evolutions
  check(result?.success === true, 'Mature card dispatches to GameRunner.matureTower');
  equal(tower?.growth.stage, TowerStage.Mature, 'Tower becomes Mature');
  equal(game.getTowerInfoPanelRenderData().evolutionCards.length, 3, 'Panel redraws from authoritative Mature state');
}

{
  // Given a connected Mature tower
  const game = createGameRunner({ startingMoney: 5000 });
  const tower = game.placeTower(TowerType.Sporecap, 720, 180, TargetingMode.First);
  check(tower !== null, 'Connected fixture is placed');
  if (tower) {
    game.matureTower(tower.id);
    game.selectTower(tower.id);
  }
  game.getTowerInfoPanelAnimator().currentOpacity = 1;
  const panel = game.getTowerInfoPanelRenderData();
  const card = panel.evolutionCards.find(candidate => candidate.path === EvolutionPath.Symbiote);

  // When the Symbiote card is resolved and sent to the native command
  const hit = card
    ? getTowerGrowthActionAtPosition(panel, card.position.x + card.size.width / 2, card.position.y + card.size.height / 2)
    : null;
  const result = hit?.kind === 'evolve' && tower ? game.evolveTower(tower.id, hit.path) : null;

  // Then the path is selected and all purchases lock
  check(result?.success === true, 'Evolution card dispatches to GameRunner.evolveTower');
  equal(tower?.growth.evolution, EvolutionPath.Symbiote, 'Canonical Symbiote path is selected');
  check(game.getTowerInfoPanelRenderData().evolutionCards.every(candidate => !candidate.isEnabled), 'Panel redraw locks all cards after Evolution');
}

{
  // Given an isolated Mature tower
  const game = createGameRunner({ startingMoney: 5000 });
  const tower = game.placeTower(TowerType.Sporecap, 100, 100, TargetingMode.First);
  check(tower !== null, 'Isolated fixture is placed');
  if (tower) {
    game.matureTower(tower.id);
    game.selectTower(tower.id);
  }

  // When its panel is queried
  const panel = game.getTowerInfoPanelRenderData();
  const symbiote = panel.evolutionCards.find(card => card.path === EvolutionPath.Symbiote);

  // Then the network condition is reflected without hiding other paths
  equal(panel.connectionState.label, 'Isolated', 'GameRunner passes current network state to the panel');
  equal(symbiote?.lockedReason, 'requires_connection', 'Isolated Symbiote retains its explicit lock reason');
  check(panel.evolutionCards.find(card => card.path === EvolutionPath.Predator)?.isEnabled === true, 'Isolated Predator remains available');
}

{
  // Given a selected tower with no remaining Nutrients
  const game = createGameRunner({ startingMoney: 180 });
  const tower = game.placeTower(TowerType.Puffball, 500, 50, TargetingMode.First);
  check(tower !== null && game.selectTower(tower.id), 'Unaffordable fixture is selected');

  // When panel data is queried
  const panel = game.getTowerInfoPanelRenderData();

  // Then affordability comes from authoritative economy state
  check(panel.matureAction?.isEnabled === false, 'GameRunner disables unaffordable maturation');
  equal(panel.matureAction?.lockedReason, 'not_enough_nutrients', 'GameRunner exposes the affordability reason');
}

{
  // Given a selected evolved tower
  const game = createGameRunner({ startingMoney: 5000 });
  const tower = game.placeTower(TowerType.ThornSniper, 720, 180, TargetingMode.Strong);
  if (tower) {
    game.matureTower(tower.id);
    game.evolveTower(tower.id, EvolutionPath.Predator);
    game.selectTower(tower.id);
  }

  // When panel data is queried
  const panel = game.getTowerInfoPanelRenderData();

  // Then selected path and invested sell value are authoritative
  equal(panel.growth.evolution, EvolutionPath.Predator, 'Selected path remains readable');
  check(panel.evolutionCards.find(card => card.path === EvolutionPath.Predator)?.isSelected === true, 'Selected card remains highlighted');
  check(panel.sellValue > 320 * 0.7, 'Sell value includes growth investment');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);

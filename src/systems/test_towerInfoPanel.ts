import { EvolutionPath, TowerStage } from '../content/evolutionDefinitions';
import { TowerType } from '../entities/tower';
import { RELEASE_HUD_LAYOUT } from './releaseHudLayout';
import { TargetingMode } from './targeting';
import {
  EVOLUTION_CARD_SELECTED_BACKGROUND_COLOR,
  createTowerInfoPanelAnimator,
  getAnimatedTowerInfoPanel,
  getEvolutionCardStatusColor,
  getSpecialEffectLabel,
  getTowerGrowthActionAtPosition,
  getTowerInfoPanelRenderData,
  hideTowerInfoPanel,
  showTowerInfoPanel,
  updateTowerInfoPanel,
} from './towerInfoPanel';
import { createTowerWithGrowth } from './upgrade';

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

function relativeLuminance(hexColor: string): number {
  const channels = [1, 3, 5].map(index => Number.parseInt(hexColor.slice(index, index + 2), 16) / 255);
  const [red = 0, green = 0, blue = 0] = channels.map(channel => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function contrastRatio(first: string, second: string): number {
  const lighter = Math.max(relativeLuminance(first), relativeLuminance(second));
  const darker = Math.min(relativeLuminance(first), relativeLuminance(second));
  return (lighter + 0.05) / (darker + 0.05);
}

function equal<T>(actual: T, expected: T, name: string): void {
  check(JSON.stringify(actual) === JSON.stringify(expected), `${name} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
}

function createTower(type: TowerType = TowerType.Puffball) {
  return createTowerWithGrowth(1, 100, 100, type, TargetingMode.First);
}

console.log('\n=== native tower growth panel tests ===\n');

{
  // Given a selected tower with canonical identity and combat stats
  const tower = createTower(TowerType.ThornSniper);
  tower.damage = 500;
  tower.range = 75;
  tower.fireRate = 2000;

  // When its panel data is built
  const panel = getTowerInfoPanelRenderData(tower, true, 500, true);

  // Then the retained identity and stat contract remains readable
  equal(panel.towerId, tower.id, 'Panel preserves tower identity');
  equal(panel.towerName, 'Thorn Sniper', 'Panel uses the canonical display name');
  equal(panel.towerType, TowerType.ThornSniper, 'Panel preserves tower type');
  equal(panel.position, { x: RELEASE_HUD_LAYOUT.towerPanel.x, y: RELEASE_HUD_LAYOUT.towerPanel.y }, 'Panel uses release HUD position');
  equal(panel.size, { width: RELEASE_HUD_LAYOUT.towerPanel.width, height: RELEASE_HUD_LAYOUT.towerPanel.height }, 'Panel uses release HUD size');
  equal(panel.stats.map(stat => stat.label), ['Damage', 'Range', 'Fire Rate'], 'Panel preserves the three canonical stat labels');
  equal(panel.stats.map(stat => stat.value), ['500', '75', '2000ms'], 'Panel preserves compact stat values');
  equal(panel.stats.map(stat => stat.currentValue), [500, 75, 2000], 'Panel preserves numeric stat values');
}

{
  // Given evolved combat values with floating-point artifacts
  const tower = createTower();
  tower.damage = 1.7999999999999998;
  tower.range = 126.49999999999999;
  tower.fireRate = 333.3333333333333;

  // When its panel data is built
  const panel = getTowerInfoPanelRenderData(tower, true, 500, true);

  // Then displayed values use deterministic short decimals without raw tails
  equal(panel.stats.map(stat => stat.value), ['1.8', '126.5', '333.33ms'], 'Panel formats evolved stats compactly');
  check(panel.stats.every(stat => stat.value.length <= 8), 'Panel stat strings remain short enough for their columns');
  check(panel.stats.every(stat => !stat.value.includes('999999')), 'Panel stat strings do not leak floating-point tails');
}

{
  // Given a tower using the retained Strong targeting mode
  const tower = createTower();
  tower.targetingMode = TargetingMode.Strong;

  // When its panel data is built
  const panel = getTowerInfoPanelRenderData(tower, true, 500, true);

  // Then targeting identity and icon remain mapped
  equal(panel.targetingMode, { mode: TargetingMode.Strong, label: 'Strong', icon: '[]' }, 'Panel preserves targeting display mapping');
}

{
  // Given towers with retained release effects
  const slowTower = createTower(TowerType.Slimefungus);
  const areaTower = createTower(TowerType.BulbShooter);
  const precisionTower = createTower(TowerType.ThornSniper);
  const detectionTower = createTower(TowerType.LumenOracle);

  // When their panel data is built
  const slowPanel = getTowerInfoPanelRenderData(slowTower, true, 500, true);
  const areaPanel = getTowerInfoPanelRenderData(areaTower, true, 500, true);
  const precisionPanel = getTowerInfoPanelRenderData(precisionTower, true, 500, true);
  const detectionPanel = getTowerInfoPanelRenderData(detectionTower, true, 500, true);

  // Then special-effect types, labels, and descriptions remain mapped
  equal(slowPanel.specialEffect?.type, 'slow', 'Slimefungus retains its slow effect type');
  equal(slowPanel.specialEffect?.label, 'Slow', 'Slimefungus retains its slow effect label');
  check((slowPanel.specialEffect?.description.length ?? 0) > 0, 'Slow effect retains a readable description');
  equal(areaPanel.specialEffect?.type, 'area_damage', 'Bulb Shooter retains its area-damage effect type');
  equal(areaPanel.specialEffect?.label, 'Area Damage', 'Bulb Shooter retains its area-damage effect label');
  equal(precisionPanel.specialEffect?.label, 'Precision', 'Thorn Sniper uses explicit special-effect metadata');
  equal(detectionPanel.specialEffect?.label, 'Detection', 'Lumen Oracle uses explicit special-effect metadata');
  equal(
    getSpecialEffectLabel('future_internal_effect'),
    'Special Effect',
    'Unknown identifiers never become player-facing copy',
  );
}

{
  // Given a selected Seedling with enough Nutrients
  const tower = createTower();

  // When its panel data is built
  const panel = getTowerInfoPanelRenderData(tower, true, 500, true);

  // Then the only purchase choice is Mature
  equal(panel.growth.stage, TowerStage.Seedling, 'Seedling stage is exposed');
  check(panel.matureAction?.isEnabled === true, 'Seedling exposes an enabled Mature action');
  equal(panel.evolutionCards.length, 0, 'Seedling exposes no Evolution cards');
}

{
  // Given a selected Seedling without enough Nutrients
  const tower = createTower();

  // When its panel data is built
  const panel = getTowerInfoPanelRenderData(tower, true, 0, true);

  // Then Mature remains visible but disabled with a machine-readable reason
  check(panel.matureAction?.isEnabled === false, 'Unaffordable Mature action is disabled');
  equal(panel.matureAction?.lockedReason, 'not_enough_nutrients', 'Unaffordable Mature action exposes its lock reason');
}

{
  // Given a connected Mature tower
  const tower = createTower(TowerType.Sporecap);
  tower.growth.stage = TowerStage.Mature;

  // When its panel data is built
  const panel = getTowerInfoPanelRenderData(tower, true, 500, true);

  // Then all three bespoke Evolutions are available
  equal(panel.matureAction, null, 'Mature tower no longer exposes the Mature action');
  equal(panel.evolutionCards.length, 3, 'Mature tower exposes three Evolution cards');
  equal(panel.evolutionCards.map(card => card.pathLabel), ['Predator', 'Specialist', 'Symbiote'], 'Evolution paths use release labels');
  check(panel.evolutionCards.every(card => !card.pathLabel.includes('_')), 'Evolution labels never expose internal underscores');
  equal(panel.evolutionCards.map(card => card.path), [
    EvolutionPath.Predator,
    EvolutionPath.Specialist,
    EvolutionPath.Symbiote,
  ], 'Evolution cards use the canonical path order');
  equal(panel.evolutionCards[0]?.name, 'Needle Volley', 'Evolution card uses the bespoke definition name');
  check((panel.evolutionCards[0]?.description.length ?? 0) > 0, 'Evolution card includes its behavior description');
  check(panel.evolutionCards.find(card => card.path === EvolutionPath.Symbiote)?.isEnabled === true, 'Connected Symbiote is enabled');
}

{
  // Given an isolated Mature tower
  const tower = createTower(TowerType.Sporecap);
  tower.growth.stage = TowerStage.Mature;

  // When its panel data is built
  const panel = getTowerInfoPanelRenderData(tower, true, 500, false);
  const symbiote = panel.evolutionCards.find(card => card.path === EvolutionPath.Symbiote);

  // Then only Symbiote is connection-locked and the panel names the isolated state
  check(symbiote?.isEnabled === false, 'Isolated Symbiote is disabled');
  equal(symbiote?.lockedReason, 'requires_connection', 'Isolated Symbiote explains its connection requirement');
  equal(panel.connectionState.label, 'Isolated', 'Panel exposes isolated state');
  check(panel.evolutionCards.filter(card => card.isEnabled).length === 2, 'Predator and Specialist remain enabled while isolated');
}

{
  // Given an Evolved tower
  const tower = createTower(TowerType.ThornSniper);
  tower.growth.stage = TowerStage.Evolved;
  tower.growth.evolution = EvolutionPath.Specialist;

  // When its panel data is built
  const panel = getTowerInfoPanelRenderData(tower, true, 500, true);

  // Then the selected path is readable and no purchase is available
  equal(panel.growth.evolution, EvolutionPath.Specialist, 'Evolved path is exposed');
  equal(panel.matureAction, null, 'Evolved tower has no Mature action');
  equal(panel.evolutionCards.length, 3, 'Evolved tower keeps all three paths readable');
  check(panel.evolutionCards.find(card => card.path === EvolutionPath.Specialist)?.isSelected === true, 'Selected Evolution is marked');
  check(panel.evolutionCards.every(card => !card.isEnabled), 'Evolved tower exposes no further purchases');
}

{
  // Given an Evolved tower whose selected card is intentionally disabled for purchase
  const tower = createTower(TowerType.ThornSniper);
  tower.growth.stage = TowerStage.Evolved;
  tower.growth.evolution = EvolutionPath.Specialist;
  const panel = getTowerInfoPanelRenderData(tower, true, 500, true);
  const selectedCard = panel.evolutionCards.find(card => card.isSelected);

  // When the status-label color is resolved from the card state
  const selectedColor = selectedCard
    ? getEvolutionCardStatusColor(selectedCard, panel.accentColor)
    : '#000000';
  const disabledColor = getEvolutionCardStatusColor(
    { isSelected: false, isEnabled: false },
    panel.accentColor,
  );

  // Then selected state wins over disabled state and remains readable on its selected surface
  check(selectedColor !== disabledColor, 'Selected Evolution uses a selected-specific status color');
  check(contrastRatio(selectedColor, EVOLUTION_CARD_SELECTED_BACKGROUND_COLOR) >= 4.5, 'Selected Evolution status meets normal-text contrast');
}

{
  // Given a visible Seedling panel
  const tower = createTower();
  const panel = getTowerInfoPanelRenderData(tower, true, 500, true);
  const action = panel.matureAction;

  // When the action center is hit
  const hit = action
    ? getTowerGrowthActionAtPosition(panel, action.position.x + action.size.width / 2, action.position.y + action.size.height / 2)
    : null;

  // Then the native Mature action is returned
  equal(hit, { kind: 'mature' }, 'Mature hitbox resolves to the native action');
}

{
  // Given a visible Mature panel
  const tower = createTower();
  tower.growth.stage = TowerStage.Mature;
  const panel = getTowerInfoPanelRenderData(tower, true, 500, true);
  const card = panel.evolutionCards[1];

  // When the Specialist card center is hit
  const hit = card
    ? getTowerGrowthActionAtPosition(panel, card.position.x + card.size.width / 2, card.position.y + card.size.height / 2)
    : null;

  // Then the native Evolution action is returned
  equal(hit, { kind: 'evolve', path: EvolutionPath.Specialist }, 'Evolution hitbox resolves to its canonical path');
}

{
  // Given no selected tower
  // When panel data is built
  const panel = getTowerInfoPanelRenderData(null, false, 500, false);

  // Then no growth action can be hit
  check(!panel.isVisible, 'Panel is hidden without a selection');
  equal(getTowerGrowthActionAtPosition(panel, 30, 200), null, 'Hidden panel has no clickable growth action');
}

{
  // Given the existing panel animator
  const animator = createTowerInfoPanelAnimator();

  // When its initial state is inspected
  equal(animator.isShowing, false, 'Panel animator starts hidden');
  equal(animator.currentOpacity, 0, 'Panel animator starts transparent');
  equal(animator.targetOpacity, 1, 'Panel animator retains its visible target opacity');
  equal(animator.scale, 0.8, 'Panel animator retains its initial scale');

  // And it is shown, advanced, and hidden
  showTowerInfoPanel(animator);
  updateTowerInfoPanel(animator, 100);
  const shownOpacity = animator.currentOpacity;
  hideTowerInfoPanel(animator);
  updateTowerInfoPanel(animator, 100);

  // Then the existing reveal/hide behavior remains intact
  check(shownOpacity > 0, 'Panel animation still fades in');
  check(animator.currentOpacity < shownOpacity, 'Panel animation still fades out');
}

{
  // Given visible panel data and a partially shown animator
  const tower = createTower();
  const panel = getTowerInfoPanelRenderData(tower, true, 500, true);
  const animator = createTowerInfoPanelAnimator();
  animator.isShowing = true;
  animator.currentOpacity = 0.5;

  // When animation state is applied
  const animated = getAnimatedTowerInfoPanel(panel, animator);

  // Then authoritative growth choices are preserved
  equal(animated.opacity, 0.5, 'Animated panel uses animator opacity');
  equal(animated.evolutionCards, panel.evolutionCards, 'Animation preserves growth choices');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);

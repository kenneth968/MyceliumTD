import { TowerType, TOWER_STATS } from '../entities/tower';
import {
  TowerPurchaseButton,
  TowerPurchaseRenderData,
  TowerPurchaseAnimator,
  getTowerPurchaseButton,
  getTowerPurchaseButtons,
  getTowerPurchaseRenderData,
  getTowerPurchasePanelSize,
  getTowerPurchasePanelPosition,
  getTowerPurchaseButtonAtPosition,
  isTowerPurchasePanelAtPosition,
  getTowerButtonColors,
  createTowerPurchaseAnimator,
  showTowerPurchase,
  hideTowerPurchase,
  updateTowerPurchase,
  getTowerPurchaseButtonHotkey,
  getTowerPurchaseButtonLabel,
  getTowerPurchaseButtonDescription,
  DEFAULT_TOWER_PURCHASE_LAYOUT,
} from './towerPurchaseRender';
import { getStartWaveButtonRect } from './waveControls';
import { getTowerInfoPanelRenderData } from './towerInfoPanel';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} - expected ${expected}, got ${actual}`);
  }
}

function runTests(): void {
  console.log('Running towerPurchaseRender tests...');

  testGetTowerPurchaseButton();
  testGetTowerPurchaseButtons();
  testGetTowerPurchaseRenderData();
  testGetTowerPurchasePanelSize();
  testGetTowerPurchasePanelPosition();
  testGetTowerPurchaseButtonAtPosition();
  testIsTowerPurchasePanelAtPosition();
  testGetTowerButtonColors();
  testTowerPurchaseAnimator();
  testGetTowerPurchaseButtonInfo();
  testButtonLayout();
  testButtonClickDetection();
  testAffordability();
  testHotkeyMapping();
  testArsenalReadability();
  testStartWaveLayoutAvoidsHudPanels();

  console.log('All tests passed!');
}

function testStartWaveLayoutAvoidsHudPanels(): void {
  console.log('  testStartWaveLayoutAvoidsHudPanels');

  // Given the fixed 1280x720 gameplay canvas and its visible purchase/info surfaces
  const startWave = getStartWaveButtonRect(1280, 720);
  const purchaseButtons = getTowerPurchaseButtons(() => true, null);
  const infoPanel = getTowerInfoPanelRenderData(null, false, 0, false);

  // When the HUD rectangles are compared
  const overlaps = (
    first: { x: number; y: number; width: number; height: number },
    second: { x: number; y: number; width: number; height: number },
  ): boolean => (
    first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y
  );
  const startWaveRect = { x: startWave.x, y: startWave.y, width: startWave.w, height: startWave.h };
  const purchaseOverlap = purchaseButtons.some(button => overlaps(startWaveRect, {
    x: button.position.x,
    y: button.position.y,
    width: button.size.width,
    height: button.size.height,
  }));
  const infoOverlap = overlaps(startWaveRect, {
    x: infoPanel.position.x,
    y: infoPanel.position.y,
    width: infoPanel.size.width,
    height: infoPanel.size.height,
  });

  // Then Start Wave remains independently readable and clickable
  assertEqual(purchaseOverlap, false, 'Start Wave does not overlap a purchase card');
  assertEqual(infoOverlap, false, 'Start Wave does not overlap the tower info panel');
}

function testGetTowerPurchaseButton(): void {
  console.log('  testGetTowerPurchaseButton');
  
  const button = getTowerPurchaseButton(
    TowerType.Puffball,
    { x: 100, y: 200 },
    true,
    false
  );

  assertEqual(button.towerType, TowerType.Puffball, 'towerType matches');
  assertEqual(button.position.x, 100, 'position x');
  assertEqual(button.position.y, 200, 'position y');
  assertEqual(button.size.width, 120, 'button width');
  assertEqual(button.size.height, 80, 'button height');
  assertEqual(button.cost, 180, 'cost from TOWER_STATS');
  assertEqual(button.canAfford, true, 'canAfford');
  assertEqual(button.isSelected, false, 'isSelected');
  assertEqual(button.hotkey, '1', 'hotkey');
  assertEqual(button.label, 'Puffball', 'label');
  assertEqual(button.role, 'Splash', 'role');
  assert(button.counterTags.includes('Swarm'), 'counter tags include Swarm');
  assert(button.tacticalHint.includes('clustered'), 'tactical hint explains use case');
}

function testGetTowerPurchaseButtons(): void {
  console.log('  testGetTowerPurchaseButtons');
  
  const canAffordFn = (tt: TowerType) => tt !== TowerType.ThornSniper;
  
  const buttons = getTowerPurchaseButtons(canAffordFn, null);

  assertEqual(buttons.length, 6, 'six canonical tower types');
  
  assertEqual(buttons[0].towerType, TowerType.Puffball, 'first is Puffball');
  assertEqual(buttons[0].canAfford, true, 'Puffball can afford');
  
  assertEqual(buttons[2].towerType, TowerType.ThornSniper, 'third is Thorn Sniper');
  assertEqual(buttons[2].canAfford, false, 'Thorn Sniper cannot afford');
  
  const totalWidth = 6 * 120 + 5 * 10;
  const startX = 640 - totalWidth / 2;
  assertEqual(buttons[0].position.x, startX, 'first button x position');
  assertEqual(buttons[5].towerType, TowerType.Sporecap, 'last is Sporecap');
  assertEqual(buttons[5].position.x, startX + 5 * (120 + 10), 'last button x position');
}

function testGetTowerPurchaseRenderData(): void {
  console.log('  testGetTowerPurchaseRenderData');
  
  const canAffordFn = (_tt: TowerType) => true;
  
  const data = getTowerPurchaseRenderData(false, null, 500, canAffordFn);
  
  assertEqual(data.isVisible, true, 'visible when not placing');
  assertEqual(data.buttons.length, 6, 'six buttons');
  assertEqual(data.currentMoney, 500, 'current money passed');
  
  const placingData = getTowerPurchaseRenderData(true, TowerType.Puffball, 500, canAffordFn);
  assertEqual(placingData.isVisible, false, 'hidden when placing');
  assertEqual(placingData.buttons.length, 0, 'no buttons when placing');
}

function testGetTowerPurchasePanelSize(): void {
  console.log('  testGetTowerPurchasePanelSize');
  
  const size = getTowerPurchasePanelSize(6);
  const expectedWidth = 6 * 120 + 5 * 10 + 30;
  const expectedHeight = 80 + 30;
  
  assertEqual(size.width, expectedWidth, 'panel width');
  assertEqual(size.height, expectedHeight, 'panel height');
}

function testGetTowerPurchasePanelPosition(): void {
  console.log('  testGetTowerPurchasePanelPosition');
  
  const pos = getTowerPurchasePanelPosition();
  
  const totalWidth = 6 * 120 + 5 * 10 + 30;
  const expectedX = 640 - totalWidth / 2;
  
  assertEqual(pos.x, expectedX, 'panel x');
  assertEqual(pos.y, 600 - 15, 'panel y');
}

function testGetTowerPurchaseButtonAtPosition(): void {
  console.log('  testGetTowerPurchaseButtonAtPosition');
  
  const canAffordFn = (_tt: TowerType) => true;
  const buttons = getTowerPurchaseButtons(canAffordFn, null);
  
  const firstButton = buttons[0];
  const clickedType = getTowerPurchaseButtonAtPosition(
    buttons,
    firstButton.position.x + 10,
    firstButton.position.y + 10
  );
  
  assertEqual(clickedType, TowerType.Puffball, 'clicked first button');
  
  const outsideType = getTowerPurchaseButtonAtPosition(buttons, 0, 0);
  assertEqual(outsideType, null, 'clicked outside returns null');
  
  const secondButton = buttons[1];
  const clickedSecond = getTowerPurchaseButtonAtPosition(
    buttons,
    secondButton.position.x + 10,
    secondButton.position.y + 10
  );
  assertEqual(clickedSecond, TowerType.Slimefungus, 'clicked second button');
}

function testIsTowerPurchasePanelAtPosition(): void {
  console.log('  testIsTowerPurchasePanelAtPosition');
  
  const panelPos = getTowerPurchasePanelPosition();
  const panelSize = getTowerPurchasePanelSize(6);
  
  const inside = isTowerPurchasePanelAtPosition(
    panelPos.x + 10,
    panelPos.y + 10
  );
  assertEqual(inside, true, 'inside panel');
  
  const outside = isTowerPurchasePanelAtPosition(0, 0);
  assertEqual(outside, false, 'outside panel');
}

function testGetTowerButtonColors(): void {
  console.log('  testGetTowerButtonColors');
  
  const puffballColors = getTowerButtonColors(TowerType.Puffball);
  assertEqual(puffballColors.primary, '#98D8AA', 'puffball primary');
  assertEqual(puffballColors.secondary, '#5DAA7A', 'puffball secondary');
  
  const venusColors = getTowerButtonColors(TowerType.ThornSniper);
  assertEqual(venusColors.primary, '#90EE90', 'venus primary');
}

function testTowerPurchaseAnimator(): void {
  console.log('  testTowerPurchaseAnimator');
  
  const animator = createTowerPurchaseAnimator();
  assertEqual(animator.state, 'hidden', 'initial state hidden');
  assertEqual(animator.opacity, 0, 'initial opacity 0');
  
  showTowerPurchase(animator);
  assertEqual(animator.state, 'visible', 'show state');
  assertEqual(animator.targetOpacity, 1, 'target opacity 1');
  
  hideTowerPurchase(animator);
  assertEqual(animator.state, 'fading_out', 'hide state');
  
  animator.opacity = 0.5;
  updateTowerPurchase(animator, 200);
  assertEqual(animator.opacity, 0, 'faded out');
  assertEqual(animator.state, 'hidden', 'hidden after fade');
}

function testGetTowerPurchaseButtonInfo(): void {
  console.log('  testGetTowerPurchaseButtonInfo');
  
  assertEqual(getTowerPurchaseButtonHotkey(TowerType.Puffball), '1', 'puffball hotkey');
  assertEqual(getTowerPurchaseButtonHotkey(TowerType.BulbShooter), '5', 'stinkhorn hotkey');
  
  assertEqual(getTowerPurchaseButtonLabel(TowerType.Slimefungus), 'Slimefungus', 'Slimefungus label');
  assertEqual(getTowerPurchaseButtonLabel(TowerType.ThornSniper), 'Thorn Sniper', 'Thorn Sniper label');
  
  const desc = getTowerPurchaseButtonDescription(TowerType.LumenOracle);
  assert(desc.includes('hidden enemies'), 'Lumen Oracle description explains detection');
}

function testButtonLayout(): void {
  console.log('  testButtonLayout');
  
  const canAffordFn = (_tt: TowerType) => true;
  const buttons = getTowerPurchaseButtons(canAffordFn, null);
  
  const spacing = 10;
  for (let i = 0; i < buttons.length - 1; i++) {
    const gap = buttons[i + 1].position.x - (buttons[i].position.x + buttons[i].size.width);
    assertEqual(gap, spacing, `gap between buttons ${i} and ${i + 1}`);
  }
  
  for (const button of buttons) {
    assertEqual(button.position.y, 600, 'all buttons same y');
  }
}

function testButtonClickDetection(): void {
  console.log('  testButtonClickDetection');
  
  const canAffordFn = (_tt: TowerType) => true;
  const buttons = getTowerPurchaseButtons(canAffordFn, null);
  
  const topLeft = getTowerPurchaseButtonAtPosition(buttons, buttons[0].position.x, buttons[0].position.y);
  assertEqual(topLeft, TowerType.Puffball, 'top-left corner');
  
  const bottomRight = getTowerPurchaseButtonAtPosition(
    buttons,
    buttons[5].position.x + buttons[5].size.width - 1,
    buttons[5].position.y + buttons[5].size.height - 1
  );
  assertEqual(bottomRight, TowerType.Sporecap, 'bottom-right corner');
  
  const inFirstButton = getTowerPurchaseButtonAtPosition(
    buttons,
    buttons[0].position.x + buttons[0].size.width - 1,
    buttons[0].position.y
  );
  assertEqual(inFirstButton, TowerType.Puffball, 'right edge of first button is still first button');
  
  const outside = getTowerPurchaseButtonAtPosition(buttons, 0, 0);
  assertEqual(outside, null, 'outside all buttons returns null');
}

function testAffordability(): void {
  console.log('  testAffordability');
  
  const expensiveTower = TowerType.ThornSniper;
  const cheapTower = TowerType.Puffball;
  
  const canAffordExpensive = (tt: TowerType) => tt !== expensiveTower;
  const buttons = getTowerPurchaseButtons(canAffordExpensive, null);
  
  const expensiveButton = buttons.find(b => b.towerType === expensiveTower);
  const cheapButton = buttons.find(b => b.towerType === cheapTower);
  
  assertEqual(expensiveButton?.canAfford, false, 'expensive tower not affordable');
  assertEqual(cheapButton?.canAfford, true, 'cheap tower affordable');
}

function testHotkeyMapping(): void {
  console.log('  testHotkeyMapping');
  
  const hotkeys = ['1', '2', '3', '4', '5', '6'];
  const towerTypes = [
    TowerType.Puffball,
    TowerType.Slimefungus,
    TowerType.ThornSniper,
    TowerType.LumenOracle,
    TowerType.BulbShooter,
    TowerType.Sporecap,
  ];
  
  for (let i = 0; i < towerTypes.length; i++) {
    assertEqual(
      getTowerPurchaseButtonHotkey(towerTypes[i]),
      hotkeys[i],
      `hotkey for ${towerTypes[i]}`
    );
  }
}

function testArsenalReadability(): void {
  console.log('  testArsenalReadability');

  const canAffordFn = (_tt: TowerType) => true;
  const buttons = getTowerPurchaseButtons(canAffordFn, null);

  for (const button of buttons) {
    assert(button.role.length > 0, `${button.label} has role`);
    assert(button.counterTags.length > 0, `${button.label} has counter tags`);
    assert(button.tacticalHint.length > 0, `${button.label} has tactical hint`);
  }

  const oracle = buttons.find(b => b.towerType === TowerType.LumenOracle);
  assert(oracle?.counterTags.includes('Camo') === true, 'oracle advertises Camo counter');
}

runTests();

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

  console.log('All tests passed!');
}

function testGetTowerPurchaseButton(): void {
  console.log('  testGetTowerPurchaseButton');
  
  const button = getTowerPurchaseButton(
    TowerType.PuffballFungus,
    { x: 100, y: 200 },
    true,
    false
  );

  assertEqual(button.towerType, TowerType.PuffballFungus, 'towerType matches');
  assertEqual(button.position.x, 100, 'position x');
  assertEqual(button.position.y, 200, 'position y');
  assertEqual(button.size.width, 120, 'button width');
  assertEqual(button.size.height, 80, 'button height');
  assertEqual(button.cost, 100, 'cost from TOWER_STATS');
  assertEqual(button.canAfford, true, 'canAfford');
  assertEqual(button.isSelected, false, 'isSelected');
  assertEqual(button.hotkey, '1', 'hotkey');
  assertEqual(button.label, 'Puffball', 'label');
}

function testGetTowerPurchaseButtons(): void {
  console.log('  testGetTowerPurchaseButtons');
  
  const canAffordFn = (tt: TowerType) => tt !== TowerType.VenusFlytower;
  
  const buttons = getTowerPurchaseButtons(canAffordFn, null);

  assertEqual(buttons.length, 5, '5 tower types');
  
  assertEqual(buttons[0].towerType, TowerType.PuffballFungus, 'first is Puffball');
  assertEqual(buttons[0].canAfford, true, 'Puffball can afford');
  
  assertEqual(buttons[2].towerType, TowerType.VenusFlytower, 'third is Venus');
  assertEqual(buttons[2].canAfford, false, 'Venus cannot afford');
  
  const totalWidth = 5 * 120 + 4 * 10;
  const startX = 640 - totalWidth / 2;
  assertEqual(buttons[0].position.x, startX, 'first button x position');
  assertEqual(buttons[4].position.x, startX + 4 * (120 + 10), 'last button x position');
}

function testGetTowerPurchaseRenderData(): void {
  console.log('  testGetTowerPurchaseRenderData');
  
  const canAffordFn = (_tt: TowerType) => true;
  
  const data = getTowerPurchaseRenderData(false, null, 500, canAffordFn);
  
  assertEqual(data.isVisible, true, 'visible when not placing');
  assertEqual(data.buttons.length, 5, '5 buttons');
  assertEqual(data.currentMoney, 500, 'current money passed');
  
  const placingData = getTowerPurchaseRenderData(true, TowerType.PuffballFungus, 500, canAffordFn);
  assertEqual(placingData.isVisible, false, 'hidden when placing');
  assertEqual(placingData.buttons.length, 0, 'no buttons when placing');
}

function testGetTowerPurchasePanelSize(): void {
  console.log('  testGetTowerPurchasePanelSize');
  
  const size = getTowerPurchasePanelSize(5);
  const expectedWidth = 5 * 120 + 4 * 10 + 30;
  const expectedHeight = 80 + 30;
  
  assertEqual(size.width, expectedWidth, 'panel width');
  assertEqual(size.height, expectedHeight, 'panel height');
}

function testGetTowerPurchasePanelPosition(): void {
  console.log('  testGetTowerPurchasePanelPosition');
  
  const pos = getTowerPurchasePanelPosition();
  
  const totalWidth = 5 * 120 + 4 * 10 + 30;
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
  
  assertEqual(clickedType, TowerType.PuffballFungus, 'clicked first button');
  
  const outsideType = getTowerPurchaseButtonAtPosition(buttons, 0, 0);
  assertEqual(outsideType, null, 'clicked outside returns null');
  
  const secondButton = buttons[1];
  const clickedSecond = getTowerPurchaseButtonAtPosition(
    buttons,
    secondButton.position.x + 10,
    secondButton.position.y + 10
  );
  assertEqual(clickedSecond, TowerType.OrchidTrap, 'clicked second button');
}

function testIsTowerPurchasePanelAtPosition(): void {
  console.log('  testIsTowerPurchasePanelAtPosition');
  
  const panelPos = getTowerPurchasePanelPosition();
  const panelSize = getTowerPurchasePanelSize(5);
  
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
  
  const puffballColors = getTowerButtonColors(TowerType.PuffballFungus);
  assertEqual(puffballColors.primary, '#98D8AA', 'puffball primary');
  assertEqual(puffballColors.secondary, '#5DAA7A', 'puffball secondary');
  
  const venusColors = getTowerButtonColors(TowerType.VenusFlytower);
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
  
  assertEqual(getTowerPurchaseButtonHotkey(TowerType.PuffballFungus), '1', 'puffball hotkey');
  assertEqual(getTowerPurchaseButtonHotkey(TowerType.StinkhornLine), '5', 'stinkhorn hotkey');
  
  assertEqual(getTowerPurchaseButtonLabel(TowerType.OrchidTrap), 'Orchid', 'orchid label');
  assertEqual(getTowerPurchaseButtonLabel(TowerType.VenusFlytower), 'Venus', 'venus label');
  
  const desc = getTowerPurchaseButtonDescription(TowerType.BioluminescentShroom);
  assert(desc.includes('camo'), 'bio description contains camo');
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
  assertEqual(topLeft, TowerType.PuffballFungus, 'top-left corner');
  
  const bottomRight = getTowerPurchaseButtonAtPosition(
    buttons,
    buttons[4].position.x + buttons[4].size.width - 1,
    buttons[4].position.y + buttons[4].size.height - 1
  );
  assertEqual(bottomRight, TowerType.StinkhornLine, 'bottom-right corner');
  
  const inFirstButton = getTowerPurchaseButtonAtPosition(
    buttons,
    buttons[0].position.x + buttons[0].size.width - 1,
    buttons[0].position.y
  );
  assertEqual(inFirstButton, TowerType.PuffballFungus, 'right edge of first button is still first button');
  
  const outside = getTowerPurchaseButtonAtPosition(buttons, 0, 0);
  assertEqual(outside, null, 'outside all buttons returns null');
}

function testAffordability(): void {
  console.log('  testAffordability');
  
  const expensiveTower = TowerType.VenusFlytower;
  const cheapTower = TowerType.PuffballFungus;
  
  const canAffordExpensive = (tt: TowerType) => tt !== expensiveTower;
  const buttons = getTowerPurchaseButtons(canAffordExpensive, null);
  
  const expensiveButton = buttons.find(b => b.towerType === expensiveTower);
  const cheapButton = buttons.find(b => b.towerType === cheapTower);
  
  assertEqual(expensiveButton?.canAfford, false, 'expensive tower not affordable');
  assertEqual(cheapButton?.canAfford, true, 'cheap tower affordable');
}

function testHotkeyMapping(): void {
  console.log('  testHotkeyMapping');
  
  const hotkeys = ['1', '2', '3', '4', '5'];
  const towerTypes = [
    TowerType.PuffballFungus,
    TowerType.OrchidTrap,
    TowerType.VenusFlytower,
    TowerType.BioluminescentShroom,
    TowerType.StinkhornLine,
  ];
  
  for (let i = 0; i < towerTypes.length; i++) {
    assertEqual(
      getTowerPurchaseButtonHotkey(towerTypes[i]),
      hotkeys[i],
      `hotkey for ${towerTypes[i]}`
    );
  }
}

runTests();

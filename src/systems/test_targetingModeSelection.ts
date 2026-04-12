import { TargetingMode } from './targeting';
import { 
  getTargetingModeDescription,
  getTargetingModeLabel,
  getTargetingModeIcon,
  getTargetingModeButtons,
  getTargetingModeAtPosition,
  getTargetingModeSelectionRenderData,
  TargetingModeButton
} from './placementPreview';
import { PlacementMode } from './input';
import { TowerType } from '../entities/tower';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} - Expected ${expected}, got ${actual}`);
  }
}

console.log('Testing Targeting Mode Selection UI...\n');

console.log('=== Test: getTargetingModeLabel ===');
assertEqual(getTargetingModeLabel(TargetingMode.First), 'First', 'First mode label');
assertEqual(getTargetingModeLabel(TargetingMode.Last), 'Last', 'Last mode label');
assertEqual(getTargetingModeLabel(TargetingMode.Close), 'Close', 'Close mode label');
assertEqual(getTargetingModeLabel(TargetingMode.Strong), 'Strong', 'Strong mode label');
console.log('PASS: All targeting mode labels are correct');

console.log('\n=== Test: getTargetingModeIcon ===');
assertEqual(getTargetingModeIcon(TargetingMode.First), '>>', 'First mode icon');
assertEqual(getTargetingModeIcon(TargetingMode.Last), '<<', 'Last mode icon');
assertEqual(getTargetingModeIcon(TargetingMode.Close), 'O-', 'Close mode icon');
assertEqual(getTargetingModeIcon(TargetingMode.Strong), '[]', 'Strong mode icon');
console.log('PASS: All targeting mode icons are correct');

console.log('\n=== Test: getTargetingModeDescription ===');
const firstDesc = getTargetingModeDescription(TargetingMode.First);
assert(firstDesc.length > 0, 'First mode description should not be empty');
const lastDesc = getTargetingModeDescription(TargetingMode.Last);
assert(lastDesc.length > 0, 'Last mode description should not be empty');
const closeDesc = getTargetingModeDescription(TargetingMode.Close);
assert(closeDesc.length > 0, 'Close mode description should not be empty');
const strongDesc = getTargetingModeDescription(TargetingMode.Strong);
assert(strongDesc.length > 0, 'Strong mode description should not be empty');
console.log('PASS: All targeting mode descriptions are non-empty');

console.log('\n=== Test: getTargetingModeButtons ===');
const anchorPos = { x: 400, y: 300 };
const buttons = getTargetingModeButtons(TargetingMode.First, anchorPos);
assertEqual(buttons.length, 4, 'Should have 4 targeting mode buttons');

assertEqual(buttons[0].mode, TargetingMode.First, 'First button should be First mode');
assert(buttons[0].isSelected, 'First button should be selected when First mode is selected');
assertEqual(buttons[1].mode, TargetingMode.Last, 'Second button should be Last mode');
assert(!buttons[1].isSelected, 'Last button should not be selected');
assertEqual(buttons[2].mode, TargetingMode.Close, 'Third button should be Close mode');
assert(!buttons[2].isSelected, 'Close button should not be selected');
assertEqual(buttons[3].mode, TargetingMode.Strong, 'Fourth button should be Strong mode');
assert(!buttons[3].isSelected, 'Strong button should not be selected');

assertEqual(buttons[0].label, 'First', 'First button label');
assertEqual(buttons[1].label, 'Last', 'Last button label');
assertEqual(buttons[2].label, 'Close', 'Close button label');
assertEqual(buttons[3].label, 'Strong', 'Strong button label');

assertEqual(buttons[0].size.width, 60, 'Button width should be 60');
assertEqual(buttons[0].size.height, 40, 'Button height should be 40');
console.log('PASS: Targeting mode buttons have correct structure');

console.log('\n=== Test: getTargetingModeButtons layout ===');
const anchorPos2 = { x: 200, y: 150 };
const buttons2 = getTargetingModeButtons(TargetingMode.Last, anchorPos2);

const totalWidth = 4 * 60 + 3 * 8;
const expectedStartX = 200 - totalWidth / 2;
assertEqual(buttons2[0].position.x, expectedStartX, 'First button should be centered on anchor');
assertEqual(buttons2[0].position.y, 150 + 80, 'Buttons should be 80px below anchor');
assertEqual(buttons2[1].position.x, expectedStartX + 60 + 8, 'Second button should be 68px to the right');
assertEqual(buttons2[2].position.x, expectedStartX + 2 * (60 + 8), 'Third button should be 136px to the right');
assertEqual(buttons2[3].position.x, expectedStartX + 3 * (60 + 8), 'Fourth button should be 204px to the right');
console.log('PASS: Targeting mode buttons are correctly laid out');

console.log('\n=== Test: getTargetingModeAtPosition ===');
const testButtons: TargetingModeButton[] = [
  { mode: TargetingMode.First, label: 'First', icon: '>>', isSelected: true, canSelect: true, position: { x: 100, y: 380 }, size: { width: 60, height: 40 } },
  { mode: TargetingMode.Last, label: 'Last', icon: '<<', isSelected: false, canSelect: true, position: { x: 168, y: 380 }, size: { width: 60, height: 40 } },
  { mode: TargetingMode.Close, label: 'Close', icon: 'O-', isSelected: false, canSelect: true, position: { x: 236, y: 380 }, size: { width: 60, height: 40 } },
  { mode: TargetingMode.Strong, label: 'Strong', icon: '[]', isSelected: false, canSelect: true, position: { x: 304, y: 380 }, size: { width: 60, height: 40 } },
];

assertEqual(getTargetingModeAtPosition(testButtons, 120, 390), TargetingMode.First, 'Should detect First mode button click');
assertEqual(getTargetingModeAtPosition(testButtons, 190, 395), TargetingMode.Last, 'Should detect Last mode button click');
assertEqual(getTargetingModeAtPosition(testButtons, 260, 385), TargetingMode.Close, 'Should detect Close mode button click');
assertEqual(getTargetingModeAtPosition(testButtons, 330, 400), TargetingMode.Strong, 'Should detect Strong mode button click');

assertEqual(getTargetingModeAtPosition(testButtons, 50, 390), null, 'Should return null for click outside buttons');
assertEqual(getTargetingModeAtPosition(testButtons, 120, 450), null, 'Should return null for click below buttons');
assertEqual(getTargetingModeAtPosition(testButtons, 120, 370), null, 'Should return null for click above buttons');
console.log('PASS: getTargetingModeAtPosition correctly identifies clicked buttons');

console.log('\n=== Test: getTargetingModeSelectionRenderData - visible state ===');
const renderData = getTargetingModeSelectionRenderData(
  PlacementMode.Placing,
  TowerType.PuffballFungus,
  { x: 400, y: 300 },
  TargetingMode.First
);
assert(renderData.isVisible, 'Should be visible during placement');
assertEqual(renderData.buttons.length, 4, 'Should have 4 buttons');
assertEqual(renderData.selectedMode, TargetingMode.First, 'Selected mode should be First');
assertEqual(renderData.description.length > 0, true, 'Description should be non-empty');
console.log('PASS: Targeting mode selection render data is correct when visible');

console.log('\n=== Test: getTargetingModeSelectionRenderData - hidden states ===');
const notPlacingData = getTargetingModeSelectionRenderData(
  PlacementMode.None,
  null,
  null,
  TargetingMode.First
);
assert(!notPlacingData.isVisible, 'Should not be visible when not placing');
assertEqual(notPlacingData.buttons.length, 0, 'Should have no buttons when not placing');
assertEqual(notPlacingData.selectedMode, null, 'Selected mode should be null when not placing');

const noTowerData = getTargetingModeSelectionRenderData(
  PlacementMode.Placing,
  null,
  { x: 400, y: 300 },
  TargetingMode.First
);
assert(!noTowerData.isVisible, 'Should not be visible when no tower selected');

const noPositionData = getTargetingModeSelectionRenderData(
  PlacementMode.Placing,
  TowerType.OrchidTrap,
  null,
  TargetingMode.First
);
assert(!noPositionData.isVisible, 'Should not be visible when no position set');

const selectingData = getTargetingModeSelectionRenderData(
  PlacementMode.Selecting,
  TowerType.VenusFlytower,
  { x: 400, y: 300 },
  TargetingMode.First
);
assert(!selectingData.isVisible, 'Should not be visible when selecting (not placing)');
console.log('PASS: Targeting mode selection render data is hidden in non-placing states');

console.log('\n=== Test: getTargetingModeSelectionRenderData - different modes ===');
for (const mode of [TargetingMode.First, TargetingMode.Last, TargetingMode.Close, TargetingMode.Strong]) {
  const data = getTargetingModeSelectionRenderData(
    PlacementMode.Placing,
    TowerType.BioluminescentShroom,
    { x: 300, y: 200 },
    mode
  );
  assert(data.isVisible, `Should be visible for ${mode} mode`);
  assertEqual(data.selectedMode, mode, `Selected mode should be ${mode}`);
  assertEqual(data.buttons.filter(b => b.isSelected).length, 1, 'Should have exactly one selected button');
  assertEqual(data.buttons.filter(b => b.isSelected)[0].mode, mode, `Button for ${mode} should be selected`);
}
console.log('PASS: Targeting mode selection works for all modes');

console.log('\n=== Test: Selected button indicator ===');
const selectedData = getTargetingModeSelectionRenderData(
  PlacementMode.Placing,
  TowerType.StinkhornLine,
  { x: 250, y: 180 },
  TargetingMode.Strong
);
const selectedButton = selectedData.buttons.find(b => b.mode === TargetingMode.Strong);
const nonSelectedButtons = selectedData.buttons.filter(b => b.mode !== TargetingMode.Strong);
assert(selectedButton !== undefined && selectedButton.isSelected, 'Strong button should be selected');
assert(!nonSelectedButtons[0].isSelected, 'First button should not be selected');
assert(!nonSelectedButtons[1].isSelected, 'Last button should not be selected');
assert(!nonSelectedButtons[2].isSelected, 'Close button should not be selected');
console.log('PASS: Only the selected button is marked as selected');

console.log('\n=== Test: All tower types support targeting mode selection ===');
for (const towerType of [TowerType.PuffballFungus, TowerType.OrchidTrap, TowerType.VenusFlytower, TowerType.BioluminescentShroom, TowerType.StinkhornLine]) {
  const data = getTargetingModeSelectionRenderData(
    PlacementMode.Placing,
    towerType,
    { x: 100, y: 100 },
    TargetingMode.First
  );
  assert(data.isVisible, `Targeting mode selection should be visible for ${towerType}`);
  assertEqual(data.buttons.length, 4, `Should have 4 buttons for ${towerType}`);
}
console.log('PASS: All tower types support targeting mode selection');

console.log('\n=== All tests passed! ===\n');
console.log('Summary:');
console.log('- Targeting mode labels, icons, and descriptions are correct');
console.log('- Button layout is correct (centered, spaced)');
console.log('- Click detection works correctly');
console.log('- Render data is visible only during placement');
console.log('- Selection state is correctly tracked');
console.log('- All tower types support targeting mode selection');
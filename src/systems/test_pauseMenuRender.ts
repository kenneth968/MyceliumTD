import { 
  PauseMenuState,
  PauseMenuAnimator,
  createPauseMenuAnimator,
  showPauseMenu,
  hidePauseMenu,
  isPauseMenuVisible,
  updatePauseMenu,
  getPauseMenuRenderData,
  getPauseMenuButtonRenderData,
  getPauseMenuPosition,
  getPauseMenuSize,
  isPauseMenuEntering,
  isPauseMenuExiting,
  isPauseMenuFullyVisible,
  resetPauseMenuAnimator,
  getPauseMenuUIState,
} from './pauseMenuRender';
import { GameState } from './gameRunner';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} (expected ${expected}, got ${actual})`);
  }
}

function assertApproxEqual(actual: number, expected: number, message: string, precision: number = 2) {
  if (Math.abs(actual - expected) > Math.pow(10, -precision)) {
    throw new Error(`Assertion failed: ${message} (expected ${expected}, got ${actual})`);
  }
}

console.log('Testing pauseMenuRender...');

let animator: PauseMenuAnimator;

animator = createPauseMenuAnimator();
assert(animator.state === 'hidden', 'Initial state should be hidden');
assert(animator.elapsed === 0, 'Initial elapsed should be 0');
assert(animator.progress === 0, 'Initial progress should be 0');
console.log('  createPauseMenuAnimator tests passed');

showPauseMenu(animator, 1000);
assert(animator.state === 'entering', 'After show, state should be entering');
assert(animator.startTime === 1000, 'startTime should be set');
assert(animator.elapsed === 0, 'elapsed should be reset');
animator.elapsed = 100;
animator.progress = 0.5;
showPauseMenu(animator, 1000);
assert(animator.elapsed === 0, 'showPauseMenu should reset elapsed');
assert(animator.progress === 0, 'showPauseMenu should reset progress');
console.log('  showPauseMenu tests passed');

animator = createPauseMenuAnimator();
showPauseMenu(animator, 1000);
animator.state = 'visible';
hidePauseMenu(animator, 1000);
assert((animator as any).state === 'exiting', 'After hide, state should be exiting');
animator = createPauseMenuAnimator();
hidePauseMenu(animator, 1000);
assert(animator.state === 'hidden', 'hidePauseMenu on hidden should remain hidden');
console.log('  hidePauseMenu tests passed');

animator = createPauseMenuAnimator();
assert(isPauseMenuVisible(animator) === false, 'Hidden should not be visible');
animator.state = 'entering';
assert(isPauseMenuVisible(animator) === true, 'Entering should be visible');
animator.state = 'visible';
assert(isPauseMenuVisible(animator) === true, 'Visible should be visible');
animator.state = 'exiting';
assert(isPauseMenuVisible(animator) === true, 'Exiting should be visible');
console.log('  isPauseMenuVisible tests passed');

animator = createPauseMenuAnimator();
updatePauseMenu(animator, 100, 1000);
assert(animator.state === 'hidden', 'Should not update when hidden');
assert(animator.elapsed === 0, 'Should not update elapsed when hidden');

animator = createPauseMenuAnimator();
showPauseMenu(animator, 1000);
updatePauseMenu(animator, 150, 1150);
assert((animator as any).state === 'entering', 'State should still be entering before fade completes');
assertApproxEqual(animator.elapsed, 150, 'elapsed should increase');
updatePauseMenu(animator, 100, 1250);
assert(animator.state === 'visible', 'State should transition to visible after fade in');
console.log('  updatePauseMenu entering transition tests passed');

animator = createPauseMenuAnimator();
hidePauseMenu(animator, 1000);
(animator as any).state = 'exiting';
updatePauseMenu(animator, 150, 1150);
assert((animator as any).state === 'exiting', 'State should still be exiting before fade completes');
updatePauseMenu(animator, 100, 1250);
assert(animator.state === 'hidden', 'State should transition to hidden after fade out');
console.log('  updatePauseMenu exiting transition tests passed');

const pos = getPauseMenuPosition();
assertEqual(pos.x, 400, 'Position x should be 400');
assertEqual(pos.y, 300, 'Position y should be 300');
console.log('  getPauseMenuPosition tests passed');

const size = getPauseMenuSize();
assertEqual(size.width, 400, 'Size width should be 400');
assertEqual(size.height, 300, 'Size height should be 300');
console.log('  getPauseMenuSize tests passed');

animator = createPauseMenuAnimator();
let data = getPauseMenuRenderData(animator);
assert(data.state === PauseMenuState.Hidden, 'Hidden state should return Hidden');
assert(data.isVisible === false, 'Hidden should not be visible');
assertEqual(data.backgroundOpacity, 0, 'Hidden should have 0 opacity');

animator = createPauseMenuAnimator();
animator.state = 'visible';
data = getPauseMenuRenderData(animator);
assert(data.state === PauseMenuState.Visible, 'Visible state should return Visible');
assert(data.isVisible === true, 'Visible should be visible');
assertEqual(data.backgroundOpacity, 1, 'Visible should have full opacity');
console.log('  basic getPauseMenuRenderData tests passed');

animator = createPauseMenuAnimator();
animator.state = 'visible';
data = getPauseMenuRenderData(animator);
assertEqual(data.buttons.length, 3, 'Should have 3 buttons');
assertEqual(data.buttons[0].id, 'resume', 'First button should be resume');
assertEqual(data.buttons[0].label, 'Resume', 'First button label should be Resume');
assertEqual(data.buttons[1].id, 'restart', 'Second button should be restart');
assertEqual(data.buttons[1].label, 'Restart', 'Second button label should be Restart');
assertEqual(data.buttons[2].id, 'quit', 'Third button should be quit');
assertEqual(data.buttons[2].label, 'Quit', 'Third button label should be Quit');
console.log('  button rendering tests passed');

animator = createPauseMenuAnimator();
animator.state = 'visible';
data = getPauseMenuRenderData(animator, { title: 'Custom Title' });
assertEqual(data.title, 'Custom Title', 'Should use custom title');

data = getPauseMenuRenderData(animator, { subtitle: 'Custom Subtitle' });
assertEqual(data.subtitle, 'Custom Subtitle', 'Should use custom subtitle');

data = getPauseMenuRenderData(animator, { currentWave: 5, totalWaves: 10 });
assertEqual(data.subtitle, 'Wave 5 / 10', 'Should show wave info when no custom subtitle');
console.log('  custom options tests passed');

animator = createPauseMenuAnimator();
showPauseMenu(animator, 1000);
updatePauseMenu(animator, 100, 1100);
data = getPauseMenuRenderData(animator);
assert(data.backgroundOpacity > 0, 'Entering should have opacity > 0');
assert(data.backgroundOpacity < 1, 'Entering should have opacity < 1');
assertApproxEqual(data.progress, 0.25, 'Progress should be 0.25', 1);
console.log('  fade in animation tests passed');

animator = createPauseMenuAnimator();
hidePauseMenu(animator, 1000);
animator.state = 'exiting';
updatePauseMenu(animator, 100, 1100);
data = getPauseMenuRenderData(animator);
assert(data.backgroundOpacity < 1, 'Exiting should have opacity < 1');
assert(data.backgroundOpacity > 0, 'Exiting should have opacity > 0');
assert(data.state === PauseMenuState.Exiting, 'State should be Exiting');
console.log('  fade out animation tests passed');

const btnPos = { x: 400, y: 300 };
let button = getPauseMenuButtonRenderData('test', 'Test Button', btnPos, true, true, 1);
assertEqual(button.id, 'test', 'Button id should match');
assertEqual(button.label, 'Test Button', 'Button label should match');
assertEqual(button.position, btnPos, 'Button position should match');
assertEqual(button.size.width, 200, 'Button width should be 200');
assertEqual(button.size.height, 40, 'Button height should be 40');
assert(button.isEnabled === true, 'Button should be enabled');
assert(button.isVisible === true, 'Button should be visible');
assertEqual(button.opacity, 1, 'Button opacity should be 1');

button = getPauseMenuButtonRenderData('test', 'Test', btnPos, false, true, 0.5);
assert(button.isEnabled === false, 'Disabled button should not be enabled');
assertEqual(button.opacity, 0.5, 'Button opacity should be 0.5');
console.log('  getPauseMenuButtonRenderData tests passed');

animator = createPauseMenuAnimator();
animator.state = 'entering';
assert(isPauseMenuEntering(animator) === true, 'Entering state should return true');
animator.state = 'visible';
assert(isPauseMenuEntering(animator) === false, 'Non-entering state should return false');
console.log('  isPauseMenuEntering tests passed');

animator = createPauseMenuAnimator();
animator.state = 'exiting';
assert(isPauseMenuExiting(animator) === true, 'Exiting state should return true');
animator.state = 'visible';
assert(isPauseMenuExiting(animator) === false, 'Non-exiting state should return false');
console.log('  isPauseMenuExiting tests passed');

animator = createPauseMenuAnimator();
animator.state = 'visible';
assert(isPauseMenuFullyVisible(animator) === true, 'Visible state should return true');
animator.state = 'entering';
assert(isPauseMenuFullyVisible(animator) === false, 'Entering state should return false');
animator.state = 'exiting';
assert(isPauseMenuFullyVisible(animator) === false, 'Exiting state should return false');
console.log('  isPauseMenuFullyVisible tests passed');

animator = createPauseMenuAnimator();
(animator as any).state = 'visible';
animator.elapsed = 100;
animator.progress = 0.5;
animator.startTime = 1000;
resetPauseMenuAnimator(animator);
assert((animator as any).state === 'hidden', 'State should be reset to hidden');
assert(animator.elapsed === 0, 'elapsed should be reset');
assert(animator.progress === 0, 'progress should be reset');
assert(animator.startTime === 0, 'startTime should be reset');
console.log('  resetPauseMenuAnimator tests passed');

let state = getPauseMenuUIState(GameState.Paused);
assert(state.canResume === true, 'Paused game should allow resume');
assert(state.isVisible === true, 'Paused game should show pause menu');
assert(state.canRestart === true, 'Paused game should allow restart');

state = getPauseMenuUIState(GameState.Playing);
assert(state.canResume === false, 'Playing game should not allow resume');
assert(state.isVisible === false, 'Playing game should not show pause menu');

state = getPauseMenuUIState(GameState.GameOver);
assert(state.canRestart === true, 'Game over should allow restart');

state = getPauseMenuUIState(GameState.Victory);
assert(state.canRestart === true, 'Victory should allow restart');

assert(getPauseMenuUIState(GameState.Playing).canQuit === true, 'Playing should allow quit');
assert(getPauseMenuUIState(GameState.Paused).canQuit === true, 'Paused should allow quit');
assert(getPauseMenuUIState(GameState.GameOver).canQuit === true, 'Game over should allow quit');

assert(state.gameState === GameState.Victory, 'State should include gameState');
console.log('  getPauseMenuUIState tests passed');

console.log('All pauseMenuRender tests passed!');
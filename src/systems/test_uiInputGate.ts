import { GameState } from './gameRunner';
import { canHandleGameplayInput, getActiveUiLayer, UiLayer, UiGateState } from './uiInputGate';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`FAIL: ${message} (expected ${expected}, got ${actual})`);
  }
}

const gameplay: UiGateState = {
  gameState: GameState.Playing,
  menuVisible: false,
  pauseVisible: false,
  tutorialBlocking: false,
};

assertEqual(getActiveUiLayer(gameplay), UiLayer.Gameplay, 'normal play reaches gameplay');
assertEqual(getActiveUiLayer({ ...gameplay, tutorialBlocking: true }), UiLayer.Tutorial, 'tutorial blocks gameplay');
assertEqual(
  getActiveUiLayer({ ...gameplay, pauseVisible: true, tutorialBlocking: true }),
  UiLayer.Pause,
  'pause wins over tutorial'
);
assertEqual(getActiveUiLayer({ ...gameplay, gameState: GameState.Paused }), UiLayer.Pause, 'paused game state activates pause');
assertEqual(
  getActiveUiLayer({ ...gameplay, gameState: GameState.Victory, pauseVisible: true, tutorialBlocking: true }),
  UiLayer.Terminal,
  'terminal wins over pause and tutorial'
);
assertEqual(
  getActiveUiLayer({ ...gameplay, menuVisible: true, gameState: GameState.GameOver, pauseVisible: true, tutorialBlocking: true }),
  UiLayer.Menu,
  'menu has highest precedence'
);
assertEqual(canHandleGameplayInput(gameplay), true, 'gameplay layer accepts gameplay input');
assertEqual(
  canHandleGameplayInput({ ...gameplay, tutorialBlocking: true }),
  true,
  'contextual tutorial routes action-gated gameplay input',
);
assertEqual(canHandleGameplayInput({ ...gameplay, pauseVisible: true }), false, 'pause blocks gameplay input');
assertEqual(
  canHandleGameplayInput({ ...gameplay, gameState: GameState.Victory }),
  false,
  'terminal blocks gameplay input',
);
assertEqual(canHandleGameplayInput({ ...gameplay, menuVisible: true }), false, 'menu blocks gameplay input');

console.log('UI input gate tests passed');

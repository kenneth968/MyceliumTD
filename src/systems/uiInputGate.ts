import { GameState } from './gameRunner';

export enum UiLayer {
  Menu = 'menu',
  Terminal = 'terminal',
  Pause = 'pause',
  Tutorial = 'tutorial',
  Gameplay = 'gameplay',
}

export interface UiGateState {
  gameState: GameState;
  menuVisible: boolean;
  pauseVisible: boolean;
  tutorialBlocking: boolean;
}

export function getActiveUiLayer(state: UiGateState): UiLayer {
  if (state.menuVisible) return UiLayer.Menu;
  if (state.gameState === GameState.GameOver || state.gameState === GameState.Victory) return UiLayer.Terminal;
  if (state.pauseVisible || state.gameState === GameState.Paused) return UiLayer.Pause;
  if (state.tutorialBlocking) return UiLayer.Tutorial;
  return UiLayer.Gameplay;
}

export function canHandleGameplayInput(state: UiGateState): boolean {
  return getActiveUiLayer(state) === UiLayer.Gameplay;
}

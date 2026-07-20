import { GameState } from './gameRunner';

export const UiLayer = {
  Menu: 'menu',
  Terminal: 'terminal',
  Pause: 'pause',
  Tutorial: 'tutorial',
  Gameplay: 'gameplay',
} as const;

export type UiLayer = (typeof UiLayer)[keyof typeof UiLayer];

export interface UiGateState {
  readonly gameState: GameState;
  readonly menuVisible: boolean;
  readonly pauseVisible: boolean;
  readonly tutorialBlocking: boolean;
}

export function getActiveUiLayer(state: UiGateState): UiLayer {
  if (state.menuVisible) return UiLayer.Menu;
  if (state.gameState === GameState.GameOver || state.gameState === GameState.Victory) return UiLayer.Terminal;
  if (state.pauseVisible || state.gameState === GameState.Paused) return UiLayer.Pause;
  if (state.tutorialBlocking) return UiLayer.Tutorial;
  return UiLayer.Gameplay;
}

export function canHandleGameplayInput(state: UiGateState): boolean {
  const layer = getActiveUiLayer(state);
  switch (layer) {
    case UiLayer.Gameplay:
    case UiLayer.Tutorial:
      return true;
    case UiLayer.Menu:
    case UiLayer.Terminal:
    case UiLayer.Pause:
      return false;
    default:
      layer satisfies never;
      return false;
  }
}

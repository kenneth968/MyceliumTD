import { TowerType } from '../entities/tower';
import { PlacementState } from './gameRunner';
import { PlacementMode } from './input';

export enum HotkeyAction {
  SelectTower1 = 'select_tower_1',
  SelectTower2 = 'select_tower_2',
  SelectTower3 = 'select_tower_3',
  SelectTower4 = 'select_tower_4',
  SelectTower5 = 'select_tower_5',
  SelectMap = 'select_map',
  Cancel = 'cancel',
  Pause = 'pause',
  SetSpeed1 = 'set_speed_1',
  SetSpeed2 = 'set_speed_2',
  SetSpeed3 = 'set_speed_3',
}

export interface HotkeyMapping {
  key: string;
  action: HotkeyAction;
  towerType?: TowerType;
}

export const HOTKEY_MAPPINGS: HotkeyMapping[] = [
  { key: '1', action: HotkeyAction.SelectTower1, towerType: TowerType.PuffballFungus },
  { key: '2', action: HotkeyAction.SelectTower2, towerType: TowerType.OrchidTrap },
  { key: '3', action: HotkeyAction.SelectTower3, towerType: TowerType.VenusFlytower },
  { key: '4', action: HotkeyAction.SelectTower4, towerType: TowerType.BioluminescentShroom },
  { key: '5', action: HotkeyAction.SelectTower5, towerType: TowerType.StinkhornLine },
  { key: 'Escape', action: HotkeyAction.Cancel },
  { key: 'Esc', action: HotkeyAction.Cancel },
  { key: 'Space', action: HotkeyAction.Pause },
  { key: ' ', action: HotkeyAction.Pause },
  { key: 'F1', action: HotkeyAction.SetSpeed1 },
  { key: 'F2', action: HotkeyAction.SetSpeed2 },
  { key: 'F3', action: HotkeyAction.SetSpeed3 },
  { key: 'm', action: HotkeyAction.SelectMap },
  { key: 'M', action: HotkeyAction.SelectMap },
];

export interface HotkeyResult {
  action: HotkeyAction;
  towerType?: TowerType;
  handled: boolean;
}

export function getTowerTypeForHotkey(action: HotkeyAction): TowerType | undefined {
  switch (action) {
    case HotkeyAction.SelectTower1:
      return TowerType.PuffballFungus;
    case HotkeyAction.SelectTower2:
      return TowerType.OrchidTrap;
    case HotkeyAction.SelectTower3:
      return TowerType.VenusFlytower;
    case HotkeyAction.SelectTower4:
      return TowerType.BioluminescentShroom;
    case HotkeyAction.SelectTower5:
      return TowerType.StinkhornLine;
    default:
      return undefined;
  }
}

export function findHotkeyAction(key: string): HotkeyResult | null {
  const normalizedKey = normalizeKey(key);
  const mapping = HOTKEY_MAPPINGS.find(m => normalizeKey(m.key) === normalizedKey);
  if (!mapping) {
    return null;
  }
  return {
    action: mapping.action,
    towerType: mapping.towerType,
    handled: true,
  };
}

export function normalizeKey(key: string): string {
  return key.toLowerCase().replace('escape', 'escape');
}

export interface HotkeyHandlerConfig {
  placementState: PlacementState;
  gameState: string;
}

export function shouldHandleHotkey(config: HotkeyHandlerConfig): boolean {
  return true;
}

export function canSelectTower(config: HotkeyHandlerConfig): boolean {
  return config.placementState === PlacementState.None;
}

export function canCancel(config: HotkeyHandlerConfig): boolean {
  return config.placementState === PlacementState.Placing || 
         config.placementState === PlacementState.Selecting;
}

export function canPause(config: HotkeyHandlerConfig): boolean {
  return config.gameState === 'playing' || config.gameState === 'paused';
}

export function canSetSpeed(config: HotkeyHandlerConfig): boolean {
  return config.gameState === 'playing' || config.gameState === 'paused';
}

export function processHotkey(
  key: string,
  config: HotkeyHandlerConfig
): HotkeyResult | null {
  const result = findHotkeyAction(key);
  if (!result) {
    return null;
  }

  switch (result.action) {
    case HotkeyAction.SelectTower1:
    case HotkeyAction.SelectTower2:
    case HotkeyAction.SelectTower3:
    case HotkeyAction.SelectTower4:
    case HotkeyAction.SelectTower5:
      if (!canSelectTower(config)) {
        return { ...result, handled: false };
      }
      return result;

    case HotkeyAction.Cancel:
      if (!canCancel(config)) {
        return { ...result, handled: false };
      }
      return result;

    case HotkeyAction.Pause:
      if (!canPause(config)) {
        return { ...result, handled: false };
      }
      return result;

    case HotkeyAction.SetSpeed1:
    case HotkeyAction.SetSpeed2:
    case HotkeyAction.SetSpeed3:
      if (!canSetSpeed(config)) {
        return { ...result, handled: false };
      }
      return result;

    default:
      return { action: result.action, handled: false };
  }
}

export function isTowerHotkey(action: HotkeyAction): boolean {
  return action >= HotkeyAction.SelectTower1 && action <= HotkeyAction.SelectTower5;
}

export function isCancelHotkey(action: HotkeyAction): boolean {
  return action === HotkeyAction.Cancel;
}

export function isPauseHotkey(action: HotkeyAction): boolean {
  return action === HotkeyAction.Pause;
}

export function getHotkeyLabel(action: HotkeyAction): string {
  switch (action) {
    case HotkeyAction.SelectTower1:
      return '1';
    case HotkeyAction.SelectTower2:
      return '2';
    case HotkeyAction.SelectTower3:
      return '3';
    case HotkeyAction.SelectTower4:
      return '4';
    case HotkeyAction.SelectTower5:
      return '5';
    case HotkeyAction.Cancel:
      return 'Esc';
    case HotkeyAction.Pause:
      return 'Space';
    case HotkeyAction.SetSpeed1:
      return 'F1';
    case HotkeyAction.SetSpeed2:
      return 'F2';
    case HotkeyAction.SetSpeed3:
      return 'F3';
    default:
      return '';
  }
}

export function getHotkeyDescription(action: HotkeyAction, towerName?: string): string {
  switch (action) {
    case HotkeyAction.SelectTower1:
      return 'Select Puffball Fungus';
    case HotkeyAction.SelectTower2:
      return 'Select Orchid Trap';
    case HotkeyAction.SelectTower3:
      return 'Select Venus Flytower';
    case HotkeyAction.SelectTower4:
      return 'Select Bioluminescent Shroom';
    case HotkeyAction.SelectTower5:
      return 'Select Stinkhorn Line';
    case HotkeyAction.Cancel:
      return 'Cancel';
    case HotkeyAction.Pause:
      return 'Pause/Resume';
    case HotkeyAction.SetSpeed1:
      return 'Set Speed 1x';
    case HotkeyAction.SetSpeed2:
      return 'Set Speed 2x';
    case HotkeyAction.SetSpeed3:
      return 'Set Speed 3x';
    default:
      return '';
  }
}

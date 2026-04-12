import { Vec2 } from '../utils/vec2';
import { TowerType, TOWER_STATS } from '../entities/tower';
import { PlacementMode } from './input';

export interface TowerPurchaseButton {
  towerType: TowerType;
  position: Vec2;
  size: { width: number; height: number };
  cost: number;
  canAfford: boolean;
  isSelected: boolean;
  hotkey: string;
  label: string;
  description: string;
}

export interface TowerPurchaseRenderData {
  isVisible: boolean;
  buttons: TowerPurchaseButton[];
  currentMoney: number;
  anchorPosition: Vec2;
}

export interface TowerPurchasePanel {
  position: Vec2;
  size: { width: number; height: number };
}

const TOWER_COLORS: Record<TowerType, { primary: string; secondary: string }> = {
  [TowerType.PuffballFungus]: { primary: '#98D8AA', secondary: '#5DAA7A' },
  [TowerType.OrchidTrap]: { primary: '#DDA0DD', secondary: '#BA55D3' },
  [TowerType.VenusFlytower]: { primary: '#90EE90', secondary: '#32CD32' },
  [TowerType.BioluminescentShroom]: { primary: '#87CEEB', secondary: '#4169E1' },
  [TowerType.StinkhornLine]: { primary: '#DEB887', secondary: '#D2691E' },
  [TowerType.MyceliumNetwork]: { primary: '#9B59B6', secondary: '#8E44AD' },
};

const TOWER_DESCRIPTIONS: Record<TowerType, string> = {
  [TowerType.PuffballFungus]: 'Area damage, hits multiple enemies',
  [TowerType.OrchidTrap]: 'Slows enemies, great for control',
  [TowerType.VenusFlytower]: 'Instakill low-HP enemies',
  [TowerType.BioluminescentShroom]: 'Reveals camo enemies',
  [TowerType.StinkhornLine]: 'Poisons enemies over time',
  [TowerType.MyceliumNetwork]: 'Buffs nearby towers with mycelium network',
};

const TOWER_LABELS: Record<TowerType, string> = {
  [TowerType.PuffballFungus]: 'Puffball',
  [TowerType.OrchidTrap]: 'Orchid',
  [TowerType.VenusFlytower]: 'Venus',
  [TowerType.BioluminescentShroom]: 'BioLumi',
  [TowerType.StinkhornLine]: 'Stinkhorn',
  [TowerType.MyceliumNetwork]: 'Mycelium',
};

const HOTKEYS: Record<TowerType, string> = {
  [TowerType.PuffballFungus]: '1',
  [TowerType.OrchidTrap]: '2',
  [TowerType.VenusFlytower]: '3',
  [TowerType.BioluminescentShroom]: '4',
  [TowerType.StinkhornLine]: '5',
  [TowerType.MyceliumNetwork]: '6',
};

export interface TowerPurchaseLayoutConfig {
  buttonWidth: number;
  buttonHeight: number;
  buttonSpacing: number;
  panelPadding: number;
  anchorX: number;
  anchorY: number;
}

export const DEFAULT_TOWER_PURCHASE_LAYOUT: TowerPurchaseLayoutConfig = {
  buttonWidth: 120,
  buttonHeight: 80,
  buttonSpacing: 10,
  panelPadding: 15,
  anchorX: 640,
  anchorY: 600,
};

export function getTowerPurchaseButton(
  towerType: TowerType,
  position: Vec2,
  canAfford: boolean,
  isSelected: boolean,
  config: TowerPurchaseLayoutConfig = DEFAULT_TOWER_PURCHASE_LAYOUT
): TowerPurchaseButton {
  return {
    towerType,
    position: { ...position },
    size: { width: config.buttonWidth, height: config.buttonHeight },
    cost: TOWER_STATS[towerType].cost,
    canAfford,
    isSelected,
    hotkey: HOTKEYS[towerType],
    label: TOWER_LABELS[towerType],
    description: TOWER_DESCRIPTIONS[towerType],
  };
}

export function getTowerPurchaseButtons(
  canAffordFn: (towerType: TowerType) => boolean,
  selectedTowerType: TowerType | null,
  config: TowerPurchaseLayoutConfig = DEFAULT_TOWER_PURCHASE_LAYOUT
): TowerPurchaseButton[] {
  const towerTypes = [
    TowerType.PuffballFungus,
    TowerType.OrchidTrap,
    TowerType.VenusFlytower,
    TowerType.BioluminescentShroom,
    TowerType.StinkhornLine,
  ];

  const totalWidth = towerTypes.length * config.buttonWidth + (towerTypes.length - 1) * config.buttonSpacing;
  const startX = config.anchorX - totalWidth / 2;

  return towerTypes.map((towerType, index) => {
    const position: Vec2 = {
      x: startX + index * (config.buttonWidth + config.buttonSpacing),
      y: config.anchorY,
    };

    return getTowerPurchaseButton(
      towerType,
      position,
      canAffordFn(towerType),
      towerType === selectedTowerType,
      config
    );
  });
}

export function getTowerPurchaseRenderData(
  isPlacing: boolean,
  selectedTowerType: TowerType | null,
  currentMoney: number,
  canAffordFn: (towerType: TowerType) => boolean,
  config: TowerPurchaseLayoutConfig = DEFAULT_TOWER_PURCHASE_LAYOUT
): TowerPurchaseRenderData {
  if (isPlacing) {
    return {
      isVisible: false,
      buttons: [],
      currentMoney,
      anchorPosition: { x: config.anchorX, y: config.anchorY },
    };
  }

  const buttons = getTowerPurchaseButtons(canAffordFn, selectedTowerType, config);

  return {
    isVisible: true,
    buttons,
    currentMoney,
    anchorPosition: { x: config.anchorX, y: config.anchorY },
  };
}

export function getTowerPurchasePanelSize(
  buttonCount: number,
  config: TowerPurchaseLayoutConfig = DEFAULT_TOWER_PURCHASE_LAYOUT
): { width: number; height: number } {
  const totalButtonWidth = buttonCount * config.buttonWidth + (buttonCount - 1) * config.buttonSpacing;
  return {
    width: totalButtonWidth + config.panelPadding * 2,
    height: config.buttonHeight + config.panelPadding * 2,
  };
}

export function getTowerPurchasePanelPosition(
  config: TowerPurchaseLayoutConfig = DEFAULT_TOWER_PURCHASE_LAYOUT
): Vec2 {
  const size = getTowerPurchasePanelSize(5, config);
  return {
    x: config.anchorX - size.width / 2,
    y: config.anchorY - config.panelPadding,
  };
}

export function getTowerPurchaseButtonAtPosition(
  buttons: TowerPurchaseButton[],
  x: number,
  y: number
): TowerType | null {
  for (const button of buttons) {
    if (
      x >= button.position.x &&
      x <= button.position.x + button.size.width &&
      y >= button.position.y &&
      y <= button.position.y + button.size.height
    ) {
      return button.towerType;
    }
  }
  return null;
}

export function isTowerPurchasePanelAtPosition(
  x: number,
  y: number,
  config: TowerPurchaseLayoutConfig = DEFAULT_TOWER_PURCHASE_LAYOUT
): boolean {
  const panelPos = getTowerPurchasePanelPosition(config);
  const panelSize = getTowerPurchasePanelSize(5, config);

  return (
    x >= panelPos.x &&
    x <= panelPos.x + panelSize.width &&
    y >= panelPos.y &&
    y <= panelPos.y + panelSize.height
  );
}

export function getTowerButtonColors(towerType: TowerType): { primary: string; secondary: string } {
  return TOWER_COLORS[towerType] || { primary: '#888', secondary: '#555' };
}

export interface TowerPurchaseAnimator {
  state: 'hidden' | 'visible' | 'fading_in' | 'fading_out';
  opacity: number;
  targetOpacity: number;
}

export function createTowerPurchaseAnimator(): TowerPurchaseAnimator {
  return {
    state: 'hidden',
    opacity: 0,
    targetOpacity: 1,
  };
}

export function showTowerPurchase(animator: TowerPurchaseAnimator): void {
  animator.state = 'visible';
  animator.targetOpacity = 1;
}

export function hideTowerPurchase(animator: TowerPurchaseAnimator): void {
  animator.state = 'fading_out';
  animator.targetOpacity = 0;
}

export function updateTowerPurchase(
  animator: TowerPurchaseAnimator,
  deltaTime: number
): void {
  const fadeSpeed = 0.005;

  if (animator.state === 'fading_in') {
    animator.opacity = Math.min(animator.opacity + deltaTime * fadeSpeed, animator.targetOpacity);
    if (animator.opacity >= animator.targetOpacity) {
      animator.state = 'visible';
    }
  } else if (animator.state === 'fading_out') {
    animator.opacity = Math.max(animator.opacity - deltaTime * fadeSpeed, 0);
    if (animator.opacity <= 0) {
      animator.state = 'hidden';
    }
  }
}

export function getTowerPurchaseButtonHotkey(towerType: TowerType): string {
  return HOTKEYS[towerType] || '';
}

export function getTowerPurchaseButtonLabel(towerType: TowerType): string {
  return TOWER_LABELS[towerType] || towerType;
}

export function getTowerPurchaseButtonDescription(towerType: TowerType): string {
  return TOWER_DESCRIPTIONS[towerType] || '';
}

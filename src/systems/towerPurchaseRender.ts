import { Vec2 } from '../utils/vec2';
import { TowerType, TOWER_STATS } from '../entities/tower';
import { RELEASE_HUD_LAYOUT, type Rect } from './releaseHudLayout';
import { formatNutrients } from './livesMoneyDisplayRender';

export interface TowerPurchaseButton {
  towerType: TowerType;
  position: Vec2;
  size: { width: number; height: number };
  cost: number;
  costText: string;
  canAfford: boolean;
  isSelected: boolean;
  hotkey: string;
  label: string;
  maxLabelCharacters: number;
  maxTacticalHintCharacters: number;
  description: string;
  role: string;
  counterTags: string[];
  tacticalHint: string;
}

export interface TowerPurchaseRenderData {
  isVisible: boolean;
  buttons: TowerPurchaseButton[];
  nutrients: number;
  anchorPosition: Vec2;
}

export interface TowerPurchasePanel {
  position: Vec2;
  size: { width: number; height: number };
}

const TOWER_COLORS: Record<TowerType, { primary: string; secondary: string }> = {
  [TowerType.Puffball]: { primary: '#98D8AA', secondary: '#5DAA7A' },
  [TowerType.Slimefungus]: { primary: '#DDA0DD', secondary: '#BA55D3' },
  [TowerType.ThornSniper]: { primary: '#90EE90', secondary: '#32CD32' },
  [TowerType.LumenOracle]: { primary: '#87CEEB', secondary: '#4169E1' },
  [TowerType.BulbShooter]: { primary: '#DEB887', secondary: '#D2691E' },
  [TowerType.Sporecap]: { primary: '#9B59B6', secondary: '#8E44AD' },
};

const TOWER_ROLES: Record<TowerType, string> = {
  [TowerType.Puffball]: 'Splash',
  [TowerType.Slimefungus]: 'Control',
  [TowerType.ThornSniper]: 'Precision',
  [TowerType.LumenOracle]: 'Reveal',
  [TowerType.BulbShooter]: 'Burst',
  [TowerType.Sporecap]: 'Generalist',
};

const TOWER_COUNTER_TAGS: Record<TowerType, string[]> = {
  [TowerType.Puffball]: ['Swarm', 'Metal'],
  [TowerType.Slimefungus]: ['Fast', 'Traits'],
  [TowerType.ThornSniper]: ['Elite', 'Long Lane'],
  [TowerType.LumenOracle]: ['Camo', 'Support'],
  [TowerType.BulbShooter]: ['Swarm', 'Metal'],
  [TowerType.Sporecap]: ['Starter', 'Flexible'],
};

const TOWER_TACTICAL_HINTS: Record<TowerType, string> = {
  [TowerType.Puffball]: 'Clustered bends',
  [TowerType.Slimefungus]: 'Fast trait foes',
  [TowerType.ThornSniper]: 'Long elite lanes',
  [TowerType.LumenOracle]: 'Reveal camo',
  [TowerType.BulbShooter]: 'Armored groups',
  [TowerType.Sporecap]: 'Flexible starter',
};

const HOTKEYS: Record<TowerType, string> = {
  [TowerType.Puffball]: '1',
  [TowerType.Slimefungus]: '2',
  [TowerType.ThornSniper]: '3',
  [TowerType.LumenOracle]: '4',
  [TowerType.BulbShooter]: '5',
  [TowerType.Sporecap]: '6',
};

export function getTowerPurchaseButton(
  towerType: TowerType,
  rect: Rect,
  canAfford: boolean,
  isSelected: boolean,
): TowerPurchaseButton {
  return {
    towerType,
    position: { x: rect.x, y: rect.y },
    size: { width: rect.width, height: rect.height },
    cost: TOWER_STATS[towerType].cost,
    costText: formatNutrients(TOWER_STATS[towerType].cost),
    canAfford,
    isSelected,
    hotkey: HOTKEYS[towerType],
    label: TOWER_STATS[towerType].displayName,
    maxLabelCharacters: Math.floor((rect.width - 16) / 8),
    maxTacticalHintCharacters: Math.floor((rect.width - 38) / 6.5),
    description: TOWER_STATS[towerType].description,
    role: TOWER_ROLES[towerType],
    counterTags: [...TOWER_COUNTER_TAGS[towerType]],
    tacticalHint: TOWER_TACTICAL_HINTS[towerType],
  };
}

export function getTowerPurchaseButtons(
  canAffordFn: (towerType: TowerType) => boolean,
  selectedTowerType: TowerType | null,
): TowerPurchaseButton[] {
  const towerTypes = [
    TowerType.Puffball,
    TowerType.Slimefungus,
    TowerType.ThornSniper,
    TowerType.LumenOracle,
    TowerType.BulbShooter,
    TowerType.Sporecap,
  ];

  return towerTypes.map((towerType, index) => {
    const rect = RELEASE_HUD_LAYOUT.towerCards[index];

    return getTowerPurchaseButton(
      towerType,
      rect,
      canAffordFn(towerType),
      towerType === selectedTowerType,
    );
  });
}

export function getTowerPurchaseRenderData(
  isPlacing: boolean,
  selectedTowerType: TowerType | null,
  nutrients: number,
  canAffordFn: (towerType: TowerType) => boolean,
): TowerPurchaseRenderData {
  const { towerBar } = RELEASE_HUD_LAYOUT;
  const anchorPosition = {
    x: towerBar.x + towerBar.width / 2,
    y: towerBar.y,
  };

  if (isPlacing) {
    return {
      isVisible: false,
      buttons: [],
      nutrients,
      anchorPosition,
    };
  }

  const buttons = getTowerPurchaseButtons(canAffordFn, selectedTowerType);

  return {
    isVisible: true,
    buttons,
    nutrients,
    anchorPosition,
  };
}

export function getTowerPurchasePanelSize(): { width: number; height: number } {
  return {
    width: RELEASE_HUD_LAYOUT.towerBar.width,
    height: RELEASE_HUD_LAYOUT.towerBar.height,
  };
}

export function getTowerPurchasePanelPosition(): Vec2 {
  return {
    x: RELEASE_HUD_LAYOUT.towerBar.x,
    y: RELEASE_HUD_LAYOUT.towerBar.y,
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
): boolean {
  const panelPos = getTowerPurchasePanelPosition();
  const panelSize = getTowerPurchasePanelSize();

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
  return TOWER_STATS[towerType].displayName;
}

export function getTowerPurchaseButtonDescription(towerType: TowerType): string {
  return TOWER_STATS[towerType].description;
}

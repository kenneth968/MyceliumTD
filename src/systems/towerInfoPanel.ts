import { EVOLUTION_DEFINITIONS, EvolutionPath, TowerStage } from '../content/evolutionDefinitions';
import { TowerType, TOWER_STATS } from '../entities/tower';
import type { Vec2 } from '../utils/vec2';
import { RELEASE_HUD_LAYOUT } from './releaseHudLayout';
import { TargetingMode } from './targeting';
import { getGrowthCosts, getTotalSellValue, SpecialEffectType, type TowerWithGrowth } from './upgrade';

export interface TowerStatDisplay {
  readonly label: string;
  readonly value: string;
  readonly currentValue: number;
}

export interface TowerGrowthDisplay {
  readonly stage: TowerStage;
  readonly matureCost: number | null;
  readonly canMature: boolean;
  readonly evolution: EvolutionPath | null;
}

export type GrowthLockReason =
  | 'not_enough_nutrients'
  | 'requires_connection'
  | 'evolution_complete';

export interface MatureActionDisplay {
  readonly label: string;
  readonly description: string;
  readonly cost: number;
  readonly isEnabled: boolean;
  readonly lockedReason: GrowthLockReason | null;
  readonly position: Vec2;
  readonly size: { readonly width: number; readonly height: number };
}

export interface EvolutionCardDisplay {
  readonly path: EvolutionPath;
  readonly pathLabel: string;
  readonly name: string;
  readonly description: string;
  readonly cost: number;
  readonly isEnabled: boolean;
  readonly lockedReason: GrowthLockReason | null;
  readonly isSelected: boolean;
  readonly position: Vec2;
  readonly size: { readonly width: number; readonly height: number };
}

export interface TowerSpecialEffectDisplay {
  readonly type: string;
  readonly label: string;
  readonly strength: number;
  readonly duration: number | null;
  readonly areaRadius: number | null;
  readonly description: string;
}

export interface TowerInfoPanelRenderData {
  readonly isVisible: boolean;
  readonly towerId: number;
  readonly towerName: string;
  readonly towerType: TowerType;
  readonly position: Vec2;
  readonly size: { readonly width: number; readonly height: number };
  readonly stats: readonly TowerStatDisplay[];
  readonly growth: TowerGrowthDisplay;
  readonly matureAction: MatureActionDisplay | null;
  readonly evolutionCards: readonly EvolutionCardDisplay[];
  readonly connectionState: {
    readonly isConnected: boolean;
    readonly label: 'Connected' | 'Isolated';
  };
  readonly specialEffect: TowerSpecialEffectDisplay | null;
  readonly targetingMode: {
    readonly mode: TargetingMode;
    readonly label: string;
    readonly icon: string;
  };
  readonly sellValue: number;
  readonly backgroundColor: string;
  readonly borderColor: string;
  readonly textColor: string;
  readonly accentColor: string;
  readonly opacity: number;
  readonly scale: number;
}

export type TowerGrowthAction =
  | { readonly kind: 'mature' }
  | { readonly kind: 'evolve'; readonly path: EvolutionPath };

const SPECIAL_EFFECT_DESCRIPTIONS: Readonly<Record<string, string>> = {
  [SpecialEffectType.AreaDamage]: 'Deals splash damage to nearby enemies',
  [SpecialEffectType.Slow]: 'Slows enemies, reducing their movement speed',
  [SpecialEffectType.Poison]: 'Poisons enemies, dealing damage over time',
  [SpecialEffectType.Stun]: 'Stuns enemies, temporarily freezing them',
  [SpecialEffectType.Instakill]: 'Delivers deliberate high-impact hits against priority targets',
  [SpecialEffectType.RevealCamo]: 'Reveals hidden camo enemies in range',
};

const PANEL_COLORS = {
  background: 'rgba(20, 20, 30, 0.95)',
  border: '#4A90D9',
  text: '#FFFFFF',
  accent: '#FFD700',
} as const;

export const EVOLUTION_CARD_SELECTED_BACKGROUND_COLOR = '#364E3C';
const EVOLUTION_CARD_SELECTED_STATUS_COLOR = '#FDE68A';
const EVOLUTION_CARD_DISABLED_STATUS_COLOR = '#777777';

export function getEvolutionCardStatusColor(
  card: Pick<EvolutionCardDisplay, 'isSelected' | 'isEnabled'>,
  enabledColor: string,
): string {
  if (card.isSelected) return EVOLUTION_CARD_SELECTED_STATUS_COLOR;
  return card.isEnabled ? enabledColor : EVOLUTION_CARD_DISABLED_STATUS_COLOR;
}

const ACTION_X = RELEASE_HUD_LAYOUT.towerPanel.x + 12;
const ACTION_Y = RELEASE_HUD_LAYOUT.towerPanel.y + 160;
const ACTION_WIDTH = RELEASE_HUD_LAYOUT.towerPanel.width - 24;
const MATURE_ACTION_HEIGHT = 76;
const EVOLUTION_CARD_HEIGHT = 52;
const EVOLUTION_CARD_GAP = 4;
const EVOLUTION_PATHS = [
  EvolutionPath.Predator,
  EvolutionPath.Specialist,
  EvolutionPath.Symbiote,
] as const;

export function getTowerInfoPanelRenderData(
  tower: TowerWithGrowth | null,
  isSelecting: boolean,
  nutrients: number,
  isConnected: boolean,
): TowerInfoPanelRenderData {
  if (!isSelecting || !tower) {
    return getHiddenPanelData();
  }

  const costs = getGrowthCosts(tower.towerType);
  const canAffordMature = nutrients >= costs.mature;
  const canAffordEvolution = nutrients >= costs.evolution;
  const isSeedling = tower.growth.stage === TowerStage.Seedling;
  const isMature = tower.growth.stage === TowerStage.Mature;

  return {
    isVisible: true,
    towerId: tower.id,
    towerName: TOWER_STATS[tower.towerType].displayName,
    towerType: tower.towerType,
    position: { x: RELEASE_HUD_LAYOUT.towerPanel.x, y: RELEASE_HUD_LAYOUT.towerPanel.y },
    size: { width: RELEASE_HUD_LAYOUT.towerPanel.width, height: RELEASE_HUD_LAYOUT.towerPanel.height },
    stats: getStatDisplays(tower),
    growth: {
      stage: tower.growth.stage,
      matureCost: isSeedling ? costs.mature : null,
      canMature: isSeedling && canAffordMature,
      evolution: tower.growth.evolution,
    },
    matureAction: isSeedling ? {
      label: 'Mature',
      description: 'Strengthen this tower\'s core role and unlock Evolutions.',
      cost: costs.mature,
      isEnabled: canAffordMature,
      lockedReason: canAffordMature ? null : 'not_enough_nutrients',
      position: { x: ACTION_X, y: ACTION_Y },
      size: { width: ACTION_WIDTH, height: MATURE_ACTION_HEIGHT },
    } : null,
    evolutionCards: isSeedling
      ? []
      : EVOLUTION_PATHS.map((path, index) => getEvolutionCard(
          tower,
          path,
          index,
          costs.evolution,
          isMature,
          canAffordEvolution,
          isConnected,
        )),
    connectionState: {
      isConnected,
      label: isConnected ? 'Connected' : 'Isolated',
    },
    specialEffect: getSpecialEffectDisplay(tower),
    targetingMode: getTargetingDisplay(tower.targetingMode),
    sellValue: getTotalSellValue(tower),
    backgroundColor: PANEL_COLORS.background,
    borderColor: PANEL_COLORS.border,
    textColor: PANEL_COLORS.text,
    accentColor: PANEL_COLORS.accent,
    opacity: 1,
    scale: 1,
  };
}

function getHiddenPanelData(): TowerInfoPanelRenderData {
  return {
    isVisible: false,
    towerId: 0,
    towerName: '',
    towerType: TowerType.Puffball,
    position: { x: RELEASE_HUD_LAYOUT.towerPanel.x, y: RELEASE_HUD_LAYOUT.towerPanel.y },
    size: { width: RELEASE_HUD_LAYOUT.towerPanel.width, height: RELEASE_HUD_LAYOUT.towerPanel.height },
    stats: [],
    growth: {
      stage: TowerStage.Seedling,
      matureCost: null,
      canMature: false,
      evolution: null,
    },
    matureAction: null,
    evolutionCards: [],
    connectionState: { isConnected: false, label: 'Isolated' },
    specialEffect: null,
    targetingMode: { mode: TargetingMode.First, label: 'First', icon: '>>' },
    sellValue: 0,
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    textColor: 'transparent',
    accentColor: 'transparent',
    opacity: 0,
    scale: 1,
  };
}

function getStatDisplays(tower: TowerWithGrowth): readonly TowerStatDisplay[] {
  return [
    { label: 'Damage', value: formatStatNumber(tower.damage), currentValue: tower.damage },
    { label: 'Range', value: formatStatNumber(tower.range), currentValue: tower.range },
    { label: 'Fire Rate', value: `${formatStatNumber(tower.fireRate)}ms`, currentValue: tower.fireRate },
  ];
}

function formatStatNumber(value: number): string {
  return Number(value.toFixed(2)).toString();
}

function getEvolutionCard(
  tower: TowerWithGrowth,
  path: EvolutionPath,
  index: number,
  cost: number,
  isMature: boolean,
  canAfford: boolean,
  isConnected: boolean,
): EvolutionCardDisplay {
  const definition = EVOLUTION_DEFINITIONS[tower.towerType][path];
  const isSelected = tower.growth.evolution === path;
  const hasConnection = !definition.requiresConnection || isConnected;
  const isEnabled = isMature && canAfford && hasConnection;
  let lockedReason: GrowthLockReason | null = null;
  if (!isMature) {
    lockedReason = 'evolution_complete';
  } else if (!hasConnection) {
    lockedReason = 'requires_connection';
  } else if (!canAfford) {
    lockedReason = 'not_enough_nutrients';
  }

  return {
    path,
    pathLabel: formatEvolutionPath(path),
    name: definition.name,
    description: definition.description,
    cost,
    isEnabled,
    lockedReason,
    isSelected,
    position: {
      x: ACTION_X,
      y: ACTION_Y + index * (EVOLUTION_CARD_HEIGHT + EVOLUTION_CARD_GAP),
    },
    size: { width: ACTION_WIDTH, height: EVOLUTION_CARD_HEIGHT },
  };
}

function formatEvolutionPath(path: EvolutionPath): string {
  switch (path) {
    case EvolutionPath.Predator:
      return 'Predator';
    case EvolutionPath.Specialist:
      return 'Specialist';
    case EvolutionPath.Symbiote:
      return 'Symbiote';
    default:
      path satisfies never;
      return '';
  }
}

function getSpecialEffectDisplay(tower: TowerWithGrowth): TowerSpecialEffectDisplay | null {
  if (!tower.specialEffect || tower.specialEffect === 'none') {
    return null;
  }
  return {
    type: tower.specialEffect,
    label: getSpecialEffectLabel(tower.specialEffect),
    strength: tower.effectStrength,
    duration: tower.effectDuration > 0 ? tower.effectDuration : null,
    areaRadius: tower.areaRadius ?? null,
    description: SPECIAL_EFFECT_DESCRIPTIONS[tower.specialEffect] ?? TOWER_STATS[tower.towerType].description,
  };
}

function getTargetingDisplay(mode: TargetingMode): TowerInfoPanelRenderData['targetingMode'] {
  const displays: Readonly<Record<TargetingMode, { readonly label: string; readonly icon: string }>> = {
    [TargetingMode.First]: { label: 'First', icon: '>>' },
    [TargetingMode.Last]: { label: 'Last', icon: '<<' },
    [TargetingMode.Close]: { label: 'Close', icon: 'O-' },
    [TargetingMode.Strong]: { label: 'Strong', icon: '[]' },
  };
  return { mode, ...displays[mode] };
}

const SPECIAL_EFFECT_LABELS: Readonly<Record<string, string>> = Object.freeze({
  [SpecialEffectType.AreaDamage]: 'Area Damage',
  [SpecialEffectType.Slow]: 'Slow',
  [SpecialEffectType.Poison]: 'Poison',
  [SpecialEffectType.Stun]: 'Stun',
  [SpecialEffectType.Instakill]: 'Precision',
  [SpecialEffectType.RevealCamo]: 'Reveal Camo',
  [SpecialEffectType.NetworkBuff]: 'Network Support',
  precision: 'Precision',
  detection: 'Detection',
});

export function getSpecialEffectLabel(type: string): string {
  return SPECIAL_EFFECT_LABELS[type] ?? 'Special Effect';
}

export function getTowerGrowthActionAtPosition(
  panel: TowerInfoPanelRenderData,
  x: number,
  y: number,
): TowerGrowthAction | null {
  if (!panel.isVisible) {
    return null;
  }
  if (panel.matureAction?.isEnabled && containsPoint(panel.matureAction.position, panel.matureAction.size, x, y)) {
    return { kind: 'mature' };
  }
  for (const card of panel.evolutionCards) {
    if (card.isEnabled && containsPoint(card.position, card.size, x, y)) {
      return { kind: 'evolve', path: card.path };
    }
  }
  return null;
}

function containsPoint(
  position: Vec2,
  size: { readonly width: number; readonly height: number },
  x: number,
  y: number,
): boolean {
  return x >= position.x && x <= position.x + size.width && y >= position.y && y <= position.y + size.height;
}

export interface TowerInfoPanelAnimator {
  isShowing: boolean;
  targetOpacity: number;
  currentOpacity: number;
  scale: number;
  animationProgress: number;
}

export function createTowerInfoPanelAnimator(): TowerInfoPanelAnimator {
  return {
    isShowing: false,
    targetOpacity: 1,
    currentOpacity: 0,
    scale: 0.8,
    animationProgress: 0,
  };
}

export function showTowerInfoPanel(animator: TowerInfoPanelAnimator): void {
  animator.isShowing = true;
  animator.targetOpacity = 1;
  animator.animationProgress = 0;
}

export function hideTowerInfoPanel(animator: TowerInfoPanelAnimator): void {
  animator.isShowing = false;
  animator.targetOpacity = 0;
  animator.animationProgress = 0;
}

export function updateTowerInfoPanel(animator: TowerInfoPanelAnimator, deltaTime: number): void {
  const fadeSpeed = 0.005;
  if (animator.isShowing && animator.currentOpacity < animator.targetOpacity) {
    animator.currentOpacity = Math.min(animator.targetOpacity, animator.currentOpacity + deltaTime * fadeSpeed);
    animator.scale = 0.8 + 0.2 * (animator.currentOpacity / animator.targetOpacity);
    animator.animationProgress = Math.min(1, animator.animationProgress + deltaTime * fadeSpeed);
  } else if (!animator.isShowing && animator.currentOpacity > animator.targetOpacity) {
    animator.currentOpacity = Math.max(animator.targetOpacity, animator.currentOpacity - deltaTime * fadeSpeed);
    animator.scale = 0.8 + 0.2 * animator.currentOpacity;
    animator.animationProgress = Math.max(0, animator.animationProgress - deltaTime * fadeSpeed);
  }
}

export function getAnimatedTowerInfoPanel(
  baseData: TowerInfoPanelRenderData,
  animator: TowerInfoPanelAnimator,
): TowerInfoPanelRenderData {
  return {
    ...baseData,
    opacity: baseData.isVisible ? animator.currentOpacity : 0,
    scale: animator.scale,
    isVisible: baseData.isVisible && animator.currentOpacity > 0.01,
  };
}

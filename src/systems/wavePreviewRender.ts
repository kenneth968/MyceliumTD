import {
  ENEMY_DEFINITIONS,
  ENEMY_VARIANT_LAYER_MULTIPLIERS,
  EnemyTrait,
  EnemyVariant,
  getEnemyTraitsForVariant,
  type EnemyType,
} from '../content/enemyDefinitions';
import type { WaveDefinition, WaveGroupDefinition } from '../content/waveDefinitions';
import type { SpawnGroup, Wave } from './wave';
import { getTraitVisual, type TraitVisual } from './traitVisuals';

export interface WavePreviewEnemy {
  readonly type: EnemyType;
  readonly variant: EnemyVariant;
  readonly displayName: string;
  readonly count: number;
  readonly traits: readonly EnemyTrait[];
  readonly threatLabels: readonly WavePreviewThreatLabel[];
}

export type WavePreviewThreatLabel = 'Fast' | 'Tank';

export interface WavePreviewCounterHint {
  readonly role: 'Splash' | 'Control' | 'Precision' | 'Reveal' | 'Burst';
  readonly threat: string;
}

export interface WavePreviewRenderData {
  readonly waveNumber: number;
  readonly name: string;
  readonly enemies: readonly WavePreviewEnemy[];
  readonly traits: readonly TraitVisual[];
  readonly counterHints: readonly WavePreviewCounterHint[];
  readonly rewardLabel: string;
}

type WavePreviewSource = Wave | WaveDefinition;

const VARIANT_LABELS: Readonly<Record<EnemyVariant, string>> = Object.freeze({
  [EnemyVariant.Normal]: '',
  [EnemyVariant.Elite]: 'Elite ',
  [EnemyVariant.Boss]: 'Boss ',
});

const FAST_SPEED = 70;
const TANK_LAYER_TOTAL = 6;

const TRAIT_COUNTER_ROLES: Readonly<Record<EnemyTrait, WavePreviewCounterHint['role']>> = Object.freeze({
  [EnemyTrait.SwarmLinked]: 'Splash',
  [EnemyTrait.Metal]: 'Burst',
  [EnemyTrait.Camo]: 'Reveal',
  [EnemyTrait.Shielded]: 'Precision',
});

const THREAT_COUNTER_ROLES: Readonly<Record<WavePreviewThreatLabel, WavePreviewCounterHint['role']>> = Object.freeze({
  Fast: 'Control',
  Tank: 'Burst',
});

function getWaveNumber(wave: WavePreviewSource): number {
  return 'number' in wave ? wave.number : wave.id;
}

function getGroupType(group: SpawnGroup | WaveGroupDefinition): EnemyType {
  if (group.type !== undefined) return group.type;
  return group.enemyType;
}

function getThreatLabels(type: EnemyType, variant: EnemyVariant): readonly WavePreviewThreatLabel[] {
  const definition = ENEMY_DEFINITIONS[type];
  const labels: WavePreviewThreatLabel[] = [];
  if (definition.speed >= FAST_SPEED) labels.push('Fast');
  const effectiveLayerTotal = definition.layers.reduce((total, layer) => total + layer, 0)
    * ENEMY_VARIANT_LAYER_MULTIPLIERS[variant];
  if (effectiveLayerTotal >= TANK_LAYER_TOTAL) labels.push('Tank');
  return Object.freeze(labels);
}

export function getWavePreviewRenderData(
  wave: WavePreviewSource,
  reward: number,
): WavePreviewRenderData {
  const enemies: WavePreviewEnemy[] = [];
  const traitsInOrder: EnemyTrait[] = [];
  const seenTraits = new Set<EnemyTrait>();
  const counterHints: WavePreviewCounterHint[] = [];
  const seenCounterHints = new Set<string>();

  const addCounterHint = (role: WavePreviewCounterHint['role'], threat: string): void => {
    const key = `${role}:${threat}`;
    if (seenCounterHints.has(key)) return;
    seenCounterHints.add(key);
    counterHints.push(Object.freeze({ role, threat }));
  };

  for (const group of wave.groups) {
    const type = getGroupType(group);
    const variant = group.variant ?? EnemyVariant.Normal;
    const definition = ENEMY_DEFINITIONS[type];
    const effectiveTraits = getEnemyTraitsForVariant(type, variant);
    const threatLabels = getThreatLabels(type, variant);
    const existingIndex = enemies.findIndex(
      enemy => enemy.type === type && enemy.variant === variant,
    );
    const existing = enemies[existingIndex];
    if (existing === undefined) {
      enemies.push(Object.freeze({
        type,
        variant,
        displayName: `${VARIANT_LABELS[variant]}${definition.displayName}`,
        count: group.count,
        traits: Object.freeze([...effectiveTraits]),
        threatLabels,
      }));
    } else {
      enemies[existingIndex] = Object.freeze({
        ...existing,
        count: existing.count + group.count,
      });
    }

    for (const trait of effectiveTraits) {
      if (seenTraits.has(trait)) continue;
      seenTraits.add(trait);
      traitsInOrder.push(trait);
      addCounterHint(TRAIT_COUNTER_ROLES[trait], getTraitVisual(trait).label);
    }
    for (const threat of threatLabels) addCounterHint(THREAT_COUNTER_ROLES[threat], threat);
  }

  const traits = Object.freeze(traitsInOrder.map(getTraitVisual));

  return Object.freeze({
    waveNumber: getWaveNumber(wave),
    name: wave.name,
    enemies: Object.freeze(enemies),
    traits,
    counterHints: Object.freeze(counterHints),
    rewardLabel: `+${reward} Nutrients`,
  });
}

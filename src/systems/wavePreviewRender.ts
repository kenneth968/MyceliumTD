import {
  ENEMY_DEFINITIONS,
  EnemyVariant,
  type EnemyTrait,
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
}

export interface WavePreviewRenderData {
  readonly waveNumber: number;
  readonly name: string;
  readonly enemies: readonly WavePreviewEnemy[];
  readonly traits: readonly TraitVisual[];
  readonly rewardLabel: string;
}

type WavePreviewSource = Wave | WaveDefinition;

const VARIANT_LABELS: Readonly<Record<EnemyVariant, string>> = Object.freeze({
  [EnemyVariant.Normal]: '',
  [EnemyVariant.Elite]: 'Elite ',
  [EnemyVariant.Boss]: 'Boss ',
});

function getWaveNumber(wave: WavePreviewSource): number {
  return 'number' in wave ? wave.number : wave.id;
}

function getGroupType(group: SpawnGroup | WaveGroupDefinition): EnemyType {
  if (group.type !== undefined) return group.type;
  return group.enemyType;
}

export function getWavePreviewRenderData(
  wave: WavePreviewSource,
  reward: number,
): WavePreviewRenderData {
  const enemies: WavePreviewEnemy[] = [];
  const traitsInOrder: EnemyTrait[] = [];
  const seenTraits = new Set<EnemyTrait>();

  for (const group of wave.groups) {
    const type = getGroupType(group);
    const variant = group.variant ?? EnemyVariant.Normal;
    const existingIndex = enemies.findIndex(
      enemy => enemy.type === type && enemy.variant === variant,
    );
    const existing = enemies[existingIndex];
    if (existing === undefined) {
      const definition = ENEMY_DEFINITIONS[type];
      enemies.push(Object.freeze({
        type,
        variant,
        displayName: `${VARIANT_LABELS[variant]}${definition.displayName}`,
        count: group.count,
        traits: Object.freeze([...definition.traits]),
      }));
    } else {
      enemies[existingIndex] = Object.freeze({
        ...existing,
        count: existing.count + group.count,
      });
    }

    for (const trait of ENEMY_DEFINITIONS[type].traits) {
      if (seenTraits.has(trait)) continue;
      seenTraits.add(trait);
      traitsInOrder.push(trait);
    }
  }

  const traits = Object.freeze(traitsInOrder.map(getTraitVisual));

  return Object.freeze({
    waveNumber: getWaveNumber(wave),
    name: wave.name,
    enemies: Object.freeze(enemies),
    traits,
    rewardLabel: `+${reward} Nutrients`,
  });
}

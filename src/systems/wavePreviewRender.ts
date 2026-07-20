import {
  ENEMY_DEFINITIONS,
  type EnemyTrait,
  type EnemyType,
} from '../content/enemyDefinitions';
import type { WaveDefinition, WaveGroupDefinition } from '../content/waveDefinitions';
import type { SpawnGroup, Wave } from './wave';
import { getTraitVisual, type TraitVisual } from './traitVisuals';

export interface WavePreviewEnemy {
  readonly type: EnemyType;
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
  const countsByType = new Map<EnemyType, number>();
  const traitsInOrder: EnemyTrait[] = [];
  const seenTraits = new Set<EnemyTrait>();

  for (const group of wave.groups) {
    const type = getGroupType(group);
    countsByType.set(type, (countsByType.get(type) ?? 0) + group.count);

    for (const trait of ENEMY_DEFINITIONS[type].traits) {
      if (seenTraits.has(trait)) continue;
      seenTraits.add(trait);
      traitsInOrder.push(trait);
    }
  }

  const enemies = Object.freeze(
    Array.from(countsByType, ([type, count]) => {
      const definition = ENEMY_DEFINITIONS[type];
      return Object.freeze({
        type,
        displayName: definition.displayName,
        count,
        traits: Object.freeze([...definition.traits]),
      });
    }),
  );
  const traits = Object.freeze(traitsInOrder.map(getTraitVisual));

  return Object.freeze({
    waveNumber: getWaveNumber(wave),
    name: wave.name,
    enemies,
    traits,
    rewardLabel: `+${reward} Nutrients`,
  });
}

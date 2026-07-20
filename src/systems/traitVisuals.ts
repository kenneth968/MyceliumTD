import { EnemyTrait } from '../content/enemyDefinitions';

export type TraitShape = 'hexagon' | 'eye' | 'shield' | 'links';

export interface TraitVisual {
  readonly trait: EnemyTrait;
  readonly label: string;
  readonly shape: TraitShape;
  readonly color: string;
}

export const TRAIT_VISUALS: Readonly<Record<EnemyTrait, TraitVisual>> = Object.freeze({
  [EnemyTrait.Metal]: Object.freeze({
    trait: EnemyTrait.Metal,
    label: 'Metal',
    shape: 'hexagon',
    color: '#B8C2CC',
  }),
  [EnemyTrait.Camo]: Object.freeze({
    trait: EnemyTrait.Camo,
    label: 'Camo',
    shape: 'eye',
    color: '#B58CFF',
  }),
  [EnemyTrait.Shielded]: Object.freeze({
    trait: EnemyTrait.Shielded,
    label: 'Shielded',
    shape: 'shield',
    color: '#6BD7FF',
  }),
  [EnemyTrait.SwarmLinked]: Object.freeze({
    trait: EnemyTrait.SwarmLinked,
    label: 'Swarm-linked',
    shape: 'links',
    color: '#FFB84D',
  }),
});

export function getTraitVisual(trait: EnemyTrait): TraitVisual {
  return TRAIT_VISUALS[trait];
}

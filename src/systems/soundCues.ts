import type { GameEvent } from './gameEvents';

export const SoundCue = Object.freeze({
  Place: 'place',
  NetworkBloom: 'network_bloom',
  Mature: 'mature',
  Evolve: 'evolve',
  LayerBreak: 'layer_break',
  TraitBreak: 'trait_break',
  SeedDetonate: 'seed_detonate',
  Leak: 'leak',
  WaveComplete: 'wave_complete',
  Victory: 'victory',
  Defeat: 'defeat',
} as const);

export type SoundCue = typeof SoundCue[keyof typeof SoundCue];

export const SOUND_ASSET_URLS = Object.freeze({
  [SoundCue.Place]: './assets/sfx/place.mp3',
  [SoundCue.NetworkBloom]: './assets/sfx/network-bloom.mp3',
  [SoundCue.Mature]: './assets/sfx/mature.mp3',
  [SoundCue.Evolve]: './assets/sfx/evolve.mp3',
  [SoundCue.LayerBreak]: './assets/sfx/layer-break.mp3',
  [SoundCue.TraitBreak]: './assets/sfx/trait-break.mp3',
  [SoundCue.SeedDetonate]: './assets/sfx/seed-detonate.mp3',
  [SoundCue.Leak]: './assets/sfx/leak.mp3',
  [SoundCue.WaveComplete]: './assets/sfx/wave-complete.mp3',
  [SoundCue.Victory]: './assets/sfx/victory.mp3',
  [SoundCue.Defeat]: './assets/sfx/defeat.mp3',
} satisfies Record<SoundCue, string>);

const SOUND_CUE_BY_EVENT = Object.freeze({
  hit: undefined,
  death: undefined,
  area_hit: undefined,
  tower_placed: SoundCue.Place,
  network_connection_created: SoundCue.NetworkBloom,
  tower_matured: SoundCue.Mature,
  tower_evolved: SoundCue.Evolve,
  layer_broken: SoundCue.LayerBreak,
  enemy_marked: undefined,
  enemy_slowed: undefined,
  enemy_revealed: undefined,
  trait_suppressed: undefined,
  network_triggered: undefined,
  trait_broken: SoundCue.TraitBreak,
  seeded_payload_detonated: SoundCue.SeedDetonate,
  enemy_leaked: SoundCue.Leak,
  wave_started: undefined,
  wave_completed: SoundCue.WaveComplete,
  victory: SoundCue.Victory,
  defeat: SoundCue.Defeat,
} satisfies Record<GameEvent['type'], SoundCue | undefined>);

export function getSoundCuesForEvent(event: GameEvent): readonly SoundCue[] {
  const cue: SoundCue | undefined = SOUND_CUE_BY_EVENT[event.type];
  return cue === undefined ? [] : [cue];
}

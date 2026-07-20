import { EvolutionPath, TowerStage } from '../content/evolutionDefinitions';
import { TowerType } from '../content/towerDefinitions';

/** Pixel width and height of every packaged tower atlas. */
export const ATLAS_SIZE = 1024;
/** Pixel width and height of one atlas cell. */
export const CELL_SIZE = 256;
/** Duration of one step in the shared idle-animation cycle. */
export const TOWER_IDLE_FRAME_MS = 260;
/** Local cell coordinate aligned to a tower's world-space root contact. */
export const TOWER_SPRITE_ANCHOR = Object.freeze({ x: 128, y: 194 });

/** Stable atlas form keys shared by art, rendering, and tests. */
export const TowerSpriteForm = {
  Seedling: 'seedling',
  Mature: 'mature',
  Predator: 'predator',
  Specialist: 'specialist',
  Symbiote: 'symbiote',
} as const;
/** One of the five gameplay forms encoded in a tower atlas. */
export type TowerSpriteForm = typeof TowerSpriteForm[keyof typeof TowerSpriteForm];

/** Source rectangle for one square atlas cell. */
export interface SpriteCell {
  readonly cellIndex: number;
  readonly sourceX: number;
  readonly sourceY: number;
  readonly size: number;
}

/** Drawable atlas cell with its asset URL and root anchor. */
export interface TowerSpriteFrame extends SpriteCell {
  readonly url: string;
  readonly anchorX: number;
  readonly anchorY: number;
}

/** Three source cells that form one idle animation. */
export interface TowerSpriteAnimation {
  readonly frames: readonly [SpriteCell, SpriteCell, SpriteCell];
}

/** Complete atlas contract for one tower type. */
export interface TowerSpriteAtlasDefinition {
  readonly url: string;
  readonly forms: Readonly<Record<TowerSpriteForm, TowerSpriteAnimation>>;
  readonly icon: SpriteCell;
}

/** Fixed row-major cells assigned to each gameplay form. */
export const FORM_CELL_INDICES: Readonly<Record<TowerSpriteForm, readonly [number, number, number]>> = Object.freeze({
  [TowerSpriteForm.Seedling]: [0, 1, 2],
  [TowerSpriteForm.Mature]: [3, 4, 5],
  [TowerSpriteForm.Predator]: [6, 7, 8],
  [TowerSpriteForm.Specialist]: [9, 10, 11],
  [TowerSpriteForm.Symbiote]: [12, 13, 14],
});

/** Returns the source rectangle for a zero-based row-major cell index. */
export function cell(index: number): SpriteCell {
  return Object.freeze({
    cellIndex: index,
    sourceX: (index % 4) * CELL_SIZE,
    sourceY: Math.floor(index / 4) * CELL_SIZE,
    size: CELL_SIZE,
  });
}

function createAnimation(form: TowerSpriteForm): TowerSpriteAnimation {
  const indices = FORM_CELL_INDICES[form];
  const frames: readonly [SpriteCell, SpriteCell, SpriteCell] = [
    cell(indices[0]),
    cell(indices[1]),
    cell(indices[2]),
  ];
  return Object.freeze({ frames });
}

function createAtlas(url: string): TowerSpriteAtlasDefinition {
  return Object.freeze({
    url,
    forms: Object.freeze({
      [TowerSpriteForm.Seedling]: createAnimation(TowerSpriteForm.Seedling),
      [TowerSpriteForm.Mature]: createAnimation(TowerSpriteForm.Mature),
      [TowerSpriteForm.Predator]: createAnimation(TowerSpriteForm.Predator),
      [TowerSpriteForm.Specialist]: createAnimation(TowerSpriteForm.Specialist),
      [TowerSpriteForm.Symbiote]: createAnimation(TowerSpriteForm.Symbiote),
    }),
    icon: cell(15),
  });
}

/** Packaged sprite atlas definitions for every playable tower type. */
export const TOWER_SPRITE_ATLASES: Readonly<Record<TowerType, TowerSpriteAtlasDefinition>> = Object.freeze({
  [TowerType.Sporecap]: createAtlas('/assets/sprites/towers/sporecap.png'),
  [TowerType.ThornSniper]: createAtlas('/assets/sprites/towers/thorn-sniper.png'),
  [TowerType.Puffball]: createAtlas('/assets/sprites/towers/puffball.png'),
  [TowerType.Slimefungus]: createAtlas('/assets/sprites/towers/slimefungus.png'),
  [TowerType.BulbShooter]: createAtlas('/assets/sprites/towers/bulb-shooter.png'),
  [TowerType.LumenOracle]: createAtlas('/assets/sprites/towers/lumen-oracle.png'),
});

function getForm(stage: TowerStage, evolution: EvolutionPath | null): TowerSpriteForm {
  if (stage === TowerStage.Seedling) {
    return TowerSpriteForm.Seedling;
  }
  if (stage === TowerStage.Mature || evolution === null) {
    return TowerSpriteForm.Mature;
  }
  switch (evolution) {
    case EvolutionPath.Predator:
      return TowerSpriteForm.Predator;
    case EvolutionPath.Specialist:
      return TowerSpriteForm.Specialist;
    case EvolutionPath.Symbiote:
      return TowerSpriteForm.Symbiote;
  }
}

function withAtlas(url: string, source: SpriteCell): TowerSpriteFrame {
  return Object.freeze({
    ...source,
    url,
    anchorX: TOWER_SPRITE_ANCHOR.x,
    anchorY: TOWER_SPRITE_ANCHOR.y,
  });
}

/** Resolves the active idle frame for a tower's stage, evolution, and timestamp. */
export function getTowerSpriteFrame(
  towerType: TowerType,
  stage: TowerStage,
  evolution: EvolutionPath | null,
  timestamp: number,
): TowerSpriteFrame {
  const atlas = TOWER_SPRITE_ATLASES[towerType];
  const frames = atlas.forms[getForm(stage, evolution)].frames;
  const pingPong = [0, 1, 2, 1] as const;
  const step = Math.floor(Math.max(0, timestamp) / TOWER_IDLE_FRAME_MS) % pingPong.length;
  return withAtlas(atlas.url, frames[pingPong[step]]);
}

/** Resolves the dedicated cell-16 portrait for a tower purchase card. */
export function getTowerSpriteIcon(towerType: TowerType): TowerSpriteFrame {
  const atlas = TOWER_SPRITE_ATLASES[towerType];
  return withAtlas(atlas.url, atlas.icon);
}

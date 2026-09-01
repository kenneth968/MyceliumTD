import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EvolutionPath, TowerStage } from '../content/evolutionDefinitions';
import { TowerType } from '../content/towerDefinitions';
import {
  ATLAS_SIZE,
  CELL_SIZE,
  TOWER_IDLE_FRAME_MS,
  TOWER_SPRITE_ATLASES,
  TowerSpriteForm,
  getTowerSpriteFrame,
} from './towerSpriteAtlas';
import {
  TowerSpriteImageCache,
  type TowerSpriteLoadHandle,
} from './towerSpriteCache';
import {
  countSignificantRegions,
  decodeRgba,
  getCellMask,
  getVisibleCellHash,
  intersectionOverUnion,
} from './towerSpriteAtlasTestHelpers';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}; expected ${String(expected)}, got ${String(actual)}`);
  }
}

assertEqual(ATLAS_SIZE, 1024, 'atlas size');
assertEqual(CELL_SIZE, 256, 'cell size');
assertEqual(TOWER_IDLE_FRAME_MS, 260, 'idle frame duration');

const formOrder = [
  TowerSpriteForm.Seedling,
  TowerSpriteForm.Mature,
  TowerSpriteForm.Predator,
  TowerSpriteForm.Specialist,
  TowerSpriteForm.Symbiote,
] as const;

for (const type of Object.values(TowerType)) {
  const atlas = TOWER_SPRITE_ATLASES[type];
  assert(atlas.url.startsWith('./assets/sprites/towers/'), `${type} has a public-relative packaged URL`);
  const browserPath = new URL(atlas.url, 'http://localhost:8080/').pathname;
  assert(browserPath.startsWith('/assets/sprites/towers/'), `${type} resolves beneath the served public root`);
  const cells = formOrder.flatMap(form => atlas.forms[form].frames.map(frame => frame.cellIndex));
  assertEqual(cells.join(','), '0,1,2,3,4,5,6,7,8,9,10,11,12,13,14', `${type} uses fixed form cells`);
  assertEqual(atlas.icon.cellIndex, 15, `${type} uses cell 16 for its card icon`);
  assertEqual(new Set([...cells, atlas.icon.cellIndex]).size, 16, `${type} uses every cell once`);

  const png = readFileSync(join(process.cwd(), 'public', browserPath.slice(1)));
  assertEqual(png.toString('ascii', 1, 4), 'PNG', `${type} is a PNG`);
  assertEqual(png.readUInt32BE(16), 1024, `${type} atlas width`);
  assertEqual(png.readUInt32BE(20), 1024, `${type} atlas height`);
  assert([4, 6].includes(png[25]), `${type} PNG colour type supports alpha`);
  const image = decodeRgba(png);
  const masks = Array.from({ length: 16 }, (_value, cellIndex) => getCellMask(image, cellIndex));
  assertEqual(image.values[3], 0, `${type} top-left corner is transparent`);
  assertEqual(image.values[image.values.length - 1], 0, `${type} bottom-right corner is transparent`);
  for (let cellIndex = 0; cellIndex < masks.length; cellIndex += 1) {
    assertEqual(
      countSignificantRegions(masks[cellIndex]),
      1,
      `${type} cell ${cellIndex + 1} contains one intended connected sprite region`,
    );
  }
  for (const form of formOrder) {
    const hashes = atlas.forms[form].frames.map(frame => getVisibleCellHash(image, frame.cellIndex));
    assertEqual(new Set(hashes).size, 3, `${type} ${form} frames contain non-identical visible RGBA art`);
  }
  const evolvedMasks = [masks[6], masks[9], masks[12]];
  assert(intersectionOverUnion(evolvedMasks[0], evolvedMasks[1]) < 0.9, `${type} Predator and Specialist silhouettes differ`);
  assert(intersectionOverUnion(evolvedMasks[0], evolvedMasks[2]) < 0.9, `${type} Predator and Symbiote silhouettes differ`);
  assert(intersectionOverUnion(evolvedMasks[1], evolvedMasks[2]) < 0.9, `${type} Specialist and Symbiote silhouettes differ`);
}

const first = getTowerSpriteFrame(TowerType.Sporecap, TowerStage.Seedling, null, 0);
const next = getTowerSpriteFrame(TowerType.Sporecap, TowerStage.Seedling, null, TOWER_IDLE_FRAME_MS);
const ping = getTowerSpriteFrame(TowerType.Sporecap, TowerStage.Seedling, null, TOWER_IDLE_FRAME_MS * 3);
assert(first.sourceX !== next.sourceX || first.sourceY !== next.sourceY, 'idle animation advances deterministically');
assertEqual(ping.cellIndex, next.cellIndex, 'idle animation uses a 1-2-3-2 ping-pong cycle');

assertEqual(
  getTowerSpriteFrame(TowerType.Sporecap, TowerStage.Mature, null, 0).cellIndex,
  3,
  'mature stage maps to the Mature form',
);
assertEqual(
  getTowerSpriteFrame(TowerType.Sporecap, TowerStage.Evolved, EvolutionPath.Predator, 0).cellIndex,
  6,
  'Predator evolution maps to Predator form',
);
assertEqual(
  getTowerSpriteFrame(TowerType.Sporecap, TowerStage.Evolved, EvolutionPath.Specialist, 0).cellIndex,
  9,
  'Specialist evolution maps to Specialist form',
);
assertEqual(
  getTowerSpriteFrame(TowerType.Sporecap, TowerStage.Evolved, EvolutionPath.Symbiote, 0).cellIndex,
  12,
  'Symbiote evolution maps to Symbiote form',
);

let failRequest = (): void => undefined;
let createdImages = 0;
let warnings = 0;
const cache = new TowerSpriteImageCache(
  (): TowerSpriteLoadHandle => {
    createdImages += 1;
    return {
      source: null,
      start(_url, _onLoad, onError) {
        failRequest = onError;
      },
    };
  },
  () => {
    warnings += 1;
  },
);
const failedUrl = TOWER_SPRITE_ATLASES[TowerType.Sporecap].url;
assertEqual(cache.get(failedUrl), null, 'loading atlas uses the fallback path');
failRequest();
assertEqual(cache.get(failedUrl), null, 'failed atlas keeps using the fallback path');
assertEqual(cache.get(failedUrl), null, 'failed atlas does not stop later rendering');
assertEqual(cache.getState(failedUrl), 'error', 'failed atlas remains an explicit error state');
assertEqual(cache.getEntryCount(), 1, 'one image-cache entry exists per URL');
assertEqual(createdImages, 1, 'failed URL is requested once');
assertEqual(warnings, 1, 'failed URL warns once');

console.log('towerSpriteAtlas tests passed');

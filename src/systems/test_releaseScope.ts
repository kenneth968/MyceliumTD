import { getMapById } from './mapLevel';
import { RELEASE_FEATURES, RELEASE_MAP_ID, RELEASE_TOTAL_WAVES } from './releaseScope';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

assert(RELEASE_MAP_ID === 'garden_path', 'release map is Garden Path');
assert(RELEASE_TOTAL_WAVES === 10, 'release contains ten waves');
assert(RELEASE_FEATURES.mapSelection === false, 'map selection is hidden');
assert(RELEASE_FEATURES.hero === false, 'hero is hidden');
assert(RELEASE_FEATURES.progression === false, 'progression is disabled');
assert(RELEASE_FEATURES.endlessMode === false, 'endless mode is disabled');
assert(RELEASE_FEATURES.difficultySelection === false, 'difficulty selection is disabled');

const map = getMapById(RELEASE_MAP_ID);
assert(map !== undefined, 'release map exists');
assert(map?.maxWaves === RELEASE_TOTAL_WAVES, 'map wave count matches release scope');

console.log('release scope tests passed');

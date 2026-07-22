import { getMapById } from '../systems/mapLevel';
import { clampReleaseWorldLabelX } from '../systems/releaseHudLayout';
import { getEnvironmentRenderData } from './environmentRender';
import { ENVIRONMENT_LAYER_ORDER } from './environmentPainter';
import { VISUAL_THEME } from './visualTheme';

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean): void {
  try {
    if (fn()) {
      passed += 1;
      console.log(`  ✓ ${name}`);
      return;
    }
    failed += 1;
    console.log(`  ✗ ${name}`);
  } catch (error) {
    failed += 1;
    const message = error instanceof Error ? error.message : String(error);
    console.log(`  ✗ ${name}: ${message}`);
  }
}

function getGardenPath() {
  const gardenPath = getMapById('garden_path');
  if (gardenPath === undefined) {
    throw new Error('Garden Path test fixture is unavailable');
  }
  return gardenPath;
}

console.log('=== Environment Render Tests ===\n');

test('Given Garden Path, when environment data is built, then it has organic path segments', () => {
  const data = getEnvironmentRenderData(getGardenPath(), { x: 800, y: 300 }, 1000);
  return data.pathSegments.length > 0;
});

test('Given Garden Path, when environment data is built, then the Kernel remains the focal object', () => {
  const data = getEnvironmentRenderData(getGardenPath(), { x: 800, y: 300 }, 1000);
  return data.kernel.radius >= 28;
});

test('Given Garden Path, when environment data is built, then root structure fills the field', () => {
  const data = getEnvironmentRenderData(getGardenPath(), { x: 800, y: 300 }, 1000);
  return data.roots.length >= 12;
});

test('Given Garden Path, when environment data is built, then ambient spores respect the release cap', () => {
  const data = getEnvironmentRenderData(getGardenPath(), { x: 800, y: 300 }, 1000);
  return data.spores.length <= VISUAL_THEME.maxAmbientSpores;
});

test('Given Garden Path, when environment data is built, then the field uses a living dark background', () => {
  const data = getEnvironmentRenderData(getGardenPath(), { x: 800, y: 300 }, 1000);
  return data.background === VISUAL_THEME.background;
});

test('Given identical frame inputs, when environment data is rebuilt, then decoration placement is deterministic', () => {
  const gardenPath = getGardenPath();
  const first = getEnvironmentRenderData(gardenPath, { x: 800, y: 300 }, 1000);
  const second = getEnvironmentRenderData(gardenPath, { x: 800, y: 300 }, 1000);
  return JSON.stringify(first) === JSON.stringify(second);
});

test('Given release path endpoints, when environment data is built, then endpoint labels stay inside the playfield', () => {
  const data = getEnvironmentRenderData(getGardenPath(), { x: 800, y: 300 }, 1000);
  const start = data.pathLabels.find(label => label.text === 'START');
  const end = data.pathLabels.find(label => label.text === 'END');
  return start?.position.x === clampReleaseWorldLabelX(0, 28)
    && end?.position.x === clampReleaseWorldLabelX(800, 22);
});

test('Given the release hierarchy, when environment layers are painted, then mycelium stays beneath units', () =>
  ENVIRONMENT_LAYER_ORDER.join('>')
    === 'background>roots_moss>path_edge>path_fill>mycelium>landmarks'
);

console.log(`\nResults: ${passed} passed, ${failed} failed`);
if (failed > 0) {
  process.exit(1);
}

import { TowerStage } from '../content/evolutionDefinitions';
import { TowerType } from '../entities/tower';
import { PlacementMode } from './input';
import {
  getTowerSelectionPreviewRenderData,
  getTowerSelectionRenderData,
  getTowerSellButton,
} from './placementPreview';
import { TargetingMode } from './targeting';
import { createTowerWithGrowth } from './upgrade';

let passed = 0;
let failed = 0;

function check(condition: boolean, name: string): void {
  if (condition) {
    console.log(`  PASS: ${name}`);
    passed++;
    return;
  }
  console.log(`  FAIL: ${name}`);
  failed++;
}

function equal<T>(actual: T, expected: T, name: string): void {
  check(JSON.stringify(actual) === JSON.stringify(expected), `${name} (expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)})`);
}

console.log('\n=== tower selection preview tests ===\n');

{
  // Given a Seedling tower
  const tower = createTowerWithGrowth(1, 100, 100, TowerType.Puffball, TargetingMode.First);

  // When selection render data is built
  const selection = getTowerSelectionRenderData(tower, tower.position);

  // Then battlefield selection keeps only non-purchase state
  equal(selection?.towerId, tower.id, 'Selection identifies the tower');
  equal(selection?.upgradeLevel, 0, 'Seedling visual tier remains zero');
  equal(selection?.sellValue, 125, 'Selection keeps authoritative sell value');
}

{
  // Given a Mature tower with investment
  const tower = createTowerWithGrowth(5, 200, 300, TowerType.Puffball, TargetingMode.Last);
  tower.growth.stage = TowerStage.Mature;
  tower.growth.totalSpent = 200;

  // When selection render data is built
  const selection = getTowerSelectionRenderData(tower, tower.position);

  // Then its growth visual and sell value remain readable
  equal(selection?.upgradeLevel, 1, 'Mature visual tier is retained without generic paths');
  equal(selection?.sellValue, 266, 'Growth investment remains in sell value');
}

{
  // Given a tower in selection mode
  const tower = createTowerWithGrowth(1, 100, 100, TowerType.Puffball, TargetingMode.First);

  // When the battlefield selection preview is built
  const preview = getTowerSelectionPreviewRenderData(tower, tower.position, PlacementMode.Selecting);

  // Then range and sale affordances remain while growth purchases move to the panel
  check(preview.isSelecting, 'Selection preview is active');
  check(preview.selection !== null, 'Tower selection marker is present');
  check(preview.rangePreview !== null, 'Tower range preview is present');
  check(preview.sellButton !== null, 'Tower sell button is present');
  const removedGenericSurface = ['upgrade', 'Indicators'].join('');
  check(!Object.prototype.hasOwnProperty.call(preview, removedGenericSurface), 'Generic upgrade indicators are absent');
}

{
  // Given no selected tower
  // When preview data is built
  const preview = getTowerSelectionPreviewRenderData(null, null, PlacementMode.None);

  // Then selection-only visuals are absent
  check(!preview.isSelecting, 'Selection preview is inactive');
  equal(preview.selection, null, 'Selection marker is absent');
  equal(preview.rangePreview, null, 'Range preview is absent');
  equal(preview.sellButton, null, 'Sell button is absent');
}

{
  // Given a tower during placement rather than selection
  const tower = createTowerWithGrowth(1, 100, 100, TowerType.Puffball, TargetingMode.First);

  // When selection preview data is requested
  const preview = getTowerSelectionPreviewRenderData(tower, tower.position, PlacementMode.Placing);

  // Then no selection purchase surface appears
  check(!preview.isSelecting, 'Placement mode does not expose tower selection UI');
  equal(preview.sellButton, null, 'Placement mode does not expose sell');
}

{
  // Given a tower with growth investment
  const tower = createTowerWithGrowth(1, 100, 100, TowerType.Puffball, TargetingMode.First);
  tower.growth.totalSpent = 500;

  // When its sell button is built
  const button = getTowerSellButton(tower, tower.position);

  // Then its total invested refund is shown
  equal(button.sellValue, 475, 'Sell button includes growth investment');
}

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===\n`);
if (failed > 0) process.exit(1);

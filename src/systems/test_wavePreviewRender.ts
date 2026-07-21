import { EnemyTrait, EnemyType, EnemyVariant } from '../content/enemyDefinitions';
import { RELEASE_WAVES } from '../content/waveDefinitions';
import { RELEASE_HUD_LAYOUT } from './releaseHudLayout';
import type { Wave } from './wave';
import { getWavePreviewRenderData } from './wavePreviewRender';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  assert(actual === expected, `${message}: expected ${String(expected)}, got ${String(actual)}`);
}

// Given a release wave containing two threat types
const releasePreview = getWavePreviewRenderData(RELEASE_WAVES[4], 130);

// When the wave is converted to preview render data
// Then its copy is player-facing and every trait has three accessibility cues
assertEqual(releasePreview.waveNumber, 5, 'wave number');
assertEqual(releasePreview.name, 'Iron Roots', 'wave name');
assert(
  releasePreview.enemies.some(enemy => enemy.type === EnemyType.IronCaterpillar && enemy.count === 8),
  'enemy groups are represented',
);
assert(releasePreview.traits.some(trait => trait.trait === EnemyTrait.Metal), 'Metal warning is shown');
assert(
  releasePreview.traits.every(trait => trait.shape.length > 0 && trait.color.length > 0 && trait.label.length > 0),
  'traits use shape, colour, and label',
);
assertEqual(releasePreview.rewardLabel, '+130 Nutrients', 'reward uses player-facing currency');
assert(
  releasePreview.enemies.every(enemy => enemy.displayName !== enemy.type),
  'enemy display names do not expose internal values',
);

// Given the release waves containing an elite and a boss group
const elitePreview = getWavePreviewRenderData(RELEASE_WAVES[5], 150);
const bossPreview = getWavePreviewRenderData(RELEASE_WAVES[9], 0);

// When their variant rows are inspected
const eliteEnemy = elitePreview.enemies.find(enemy => enemy.type === EnemyType.ShellBeetle);
const bossEnemy = bossPreview.enemies.find(enemy => enemy.type === EnemyType.WardMoth);

// Then the preview communicates the same variants that spawning applies
assertEqual(eliteEnemy?.variant, EnemyVariant.Elite, 'wave 6 preserves the elite variant');
assertEqual(eliteEnemy?.displayName, 'Elite Shell Beetle', 'wave 6 labels the elite threat');
assertEqual(bossEnemy?.variant, EnemyVariant.Boss, 'wave 10 preserves the boss variant');
assertEqual(bossEnemy?.displayName, 'Boss Ward Moth', 'wave 10 labels the boss threat');

// Given the release wave with the maximum enemy and trait row counts
const finalWavePreview = getWavePreviewRenderData(RELEASE_WAVES[9], 0);
const expectedFinalEnemies = [
  { type: EnemyType.WardMoth, variant: EnemyVariant.Boss, displayName: 'Boss Ward Moth', count: 1 },
  { type: EnemyType.SwarmWasp, variant: EnemyVariant.Normal, displayName: 'Swarm Wasp', count: 16 },
  { type: EnemyType.IronCaterpillar, variant: EnemyVariant.Normal, displayName: 'Iron Caterpillar', count: 6 },
  { type: EnemyType.PaleMoth, variant: EnemyVariant.Normal, displayName: 'Pale Moth', count: 6 },
] as const;
const expectedFinalTraits = [
  { trait: EnemyTrait.Shielded, label: 'Shielded', shape: 'shield', color: '#6BD7FF' },
  { trait: EnemyTrait.SwarmLinked, label: 'Swarm-linked', shape: 'links', color: '#FFB84D' },
  { trait: EnemyTrait.Metal, label: 'Metal', shape: 'hexagon', color: '#B8C2CC' },
  { trait: EnemyTrait.Camo, label: 'Camo', shape: 'eye', color: '#B58CFF' },
] as const;

// When its preview rows and visual traits are inspected
// Then all four rows and traits retain first appearance with player-facing presentation
assertEqual(finalWavePreview.enemies.length, 4, 'final wave has four enemy rows');
expectedFinalEnemies.forEach((expected, index) => {
  const enemy = finalWavePreview.enemies[index];
  assertEqual(enemy?.type, expected.type, `enemy ${index + 1} order`);
  assertEqual(enemy?.variant, expected.variant, `enemy ${index + 1} variant`);
  assertEqual(enemy?.displayName, expected.displayName, `enemy ${index + 1} display name`);
  assertEqual(enemy?.count, expected.count, `enemy ${index + 1} count`);
  assert(enemy?.displayName !== enemy?.type, `enemy ${index + 1} uses a player-facing name`);
});
assertEqual(finalWavePreview.traits.length, 4, 'final wave has four unique traits');
expectedFinalTraits.forEach((expected, index) => {
  const trait = finalWavePreview.traits[index];
  assertEqual(trait?.trait, expected.trait, `trait ${index + 1} order`);
  assertEqual(trait?.label, expected.label, `trait ${index + 1} label`);
  assertEqual(trait?.shape, expected.shape, `trait ${index + 1} shape`);
  assertEqual(trait?.color, expected.color, `trait ${index + 1} color`);
  assert(trait?.label !== trait?.trait, `trait ${index + 1} uses a player-facing label`);
});
assertEqual(finalWavePreview.rewardLabel, '+0 Nutrients', 'final wave reward remains player-facing');

// Given the concrete relative offsets used by the clipped Canvas preview painter
const previewPanel = RELEASE_HUD_LAYOUT.wavePreview;
const previewRight = previewPanel.x + previewPanel.width;
const previewBottom = previewPanel.y + previewPanel.height;
const contentX = previewPanel.x + 12;
const contentWidth = previewPanel.width - 24;
const enemyRowYs = finalWavePreview.enemies.map((_, index) => previewPanel.y + 36 + index * 15);
const traitRowYs = finalWavePreview.traits.map((_, index) => previewPanel.y + 104 + Math.floor(index / 2) * 17);
const traitColumnXs = finalWavePreview.traits.map((_, index) => contentX + index % 2 * contentWidth / 2);
const verticalPositions = [previewPanel.y + 16, ...enemyRowYs, ...traitRowYs, previewBottom - 11];

// When worst-case row and column coordinates are calculated
// Then every anchor remains within the shared wave preview rectangle
assert(verticalPositions.every(y => y >= previewPanel.y && y <= previewBottom), 'all preview rows fit vertically');
assert(contentX >= previewPanel.x && contentX + contentWidth <= previewRight, 'preview text fits horizontally');
assert(
  traitColumnXs.every(x => x >= previewPanel.x && x + contentWidth / 2 <= previewRight),
  'both trait columns fit horizontally',
);

// Given repeated enemy groups whose traits recur in a later group
const repeatedWave: Wave = {
  id: 7,
  name: 'Repeated Threats',
  groups: [
    { type: EnemyType.BulwarkBeetle, count: 2, interval: 100, delay: 0 },
    { type: EnemyType.SwarmWasp, count: 3, interval: 100, delay: 100 },
    { type: EnemyType.BulwarkBeetle, count: 4, interval: 100, delay: 200 },
    { type: EnemyType.IronCaterpillar, count: 1, interval: 100, delay: 300 },
  ],
  completionBonus: 175,
  delayBetweenGroups: 0,
  totalDuration: 400,
};

// When the preview aggregates the wave
const repeatedPreview = getWavePreviewRenderData(repeatedWave, 175);

// Then groups and traits retain first-appearance order without duplication
assertEqual(repeatedPreview.enemies.length, 3, 'repeated types aggregate into one row');
assertEqual(repeatedPreview.enemies[0]?.type, EnemyType.BulwarkBeetle, 'first enemy keeps first appearance');
assertEqual(repeatedPreview.enemies[0]?.count, 6, 'repeated enemy counts aggregate');
assertEqual(repeatedPreview.enemies[1]?.type, EnemyType.SwarmWasp, 'second enemy keeps first appearance');
assertEqual(repeatedPreview.traits.length, 2, 'traits are deduplicated');
assertEqual(repeatedPreview.traits[0]?.trait, EnemyTrait.Metal, 'first trait keeps first appearance');
assertEqual(repeatedPreview.traits[1]?.trait, EnemyTrait.SwarmLinked, 'second trait keeps first appearance');
assert(Object.isFrozen(repeatedPreview), 'preview payload is immutable');
assert(Object.isFrozen(repeatedPreview.enemies), 'enemy collection is immutable');
assert(Object.isFrozen(repeatedPreview.traits), 'trait collection is immutable');

// Given one enemy type appears in normal and elite groups
const mixedVariantWave: Wave = {
  ...repeatedWave,
  groups: [
    { type: EnemyType.ShellBeetle, count: 2, interval: 100, delay: 0 },
    {
      type: EnemyType.ShellBeetle,
      variant: EnemyVariant.Elite,
      count: 3,
      interval: 100,
      delay: 100,
    },
  ],
};

// When the mixed-variant wave is converted to preview rows
const mixedVariantPreview = getWavePreviewRenderData(mixedVariantWave, 100);

// Then each variant retains an independent row and count
assertEqual(mixedVariantPreview.enemies.length, 2, 'mixed variants use separate rows');
assertEqual(mixedVariantPreview.enemies[0]?.variant, EnemyVariant.Normal, 'normal row keeps its variant');
assertEqual(mixedVariantPreview.enemies[0]?.count, 2, 'normal row keeps its count');
assertEqual(mixedVariantPreview.enemies[1]?.variant, EnemyVariant.Elite, 'elite row keeps its variant');
assertEqual(mixedVariantPreview.enemies[1]?.count, 3, 'elite row keeps its count');

console.log('Wave preview render tests passed');

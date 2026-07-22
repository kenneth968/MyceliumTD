import {
  clampPlayfieldLabelX,
  clampReleaseWorldLabelX,
  getHotkeyBarVisibility,
  getPrimaryHotkeyLabel,
  getPauseSettingsControlAtPosition,
  getReleaseHudRegionAtPosition,
  RELEASE_HUD_LAYOUT,
  rectsOverlap,
  type Rect,
} from './releaseHudLayout';
import { readFileSync } from 'fs';
import { resolve } from 'path';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

function isContainedBy(inner: Rect, outer: Rect): boolean {
  return inner.x >= outer.x
    && inner.y >= outer.y
    && inner.x + inner.width <= outer.x + outer.width
    && inner.y + inner.height <= outer.y + outer.height;
}

// Given the contractual fixed release canvas
const {
  canvas,
  topBar,
  waveProgress,
  playfield,
  towerPanel,
  wavePreview,
  towerBar,
  startWaveButton,
  towerCards,
} = RELEASE_HUD_LAYOUT;

// Given endpoint labels whose anchors touch the playfield edges
assert(clampPlayfieldLabelX(playfield.x, 28) === 28, 'START label is clamped fully inside the playfield');
assert(clampPlayfieldLabelX(playfield.x + playfield.width, 22) === 938, 'END label is clamped fully inside the playfield');
assert(clampPlayfieldLabelX(480, 28) === 480, 'interior path labels keep their authored anchor');
assert(Math.abs(clampReleaseWorldLabelX(0, 28) - 28 / 1.2) < 0.001, 'START world anchor respects screen-space label width');
assert(Math.abs(clampReleaseWorldLabelX(800, 22) - 938 / 1.2) < 0.001, 'END world anchor stays left of fixed HUD panels');
assert(getPrimaryHotkeyLabel(true) === 'Start Game', 'menu legend describes the current primary action');
assert(getPrimaryHotkeyLabel(false) === 'Start Wave', 'gameplay legend describes the current primary action');
assert(getHotkeyBarVisibility(false, 'playing') === 'visible', 'gameplay keeps the shortcut legend visible');
assert(getHotkeyBarVisibility(false, 'paused') === 'obscured', 'pause subordinates the shortcut legend');
assert(getHotkeyBarVisibility(false, 'game_over') === 'obscured', 'defeat subordinates the shortcut legend');
assert(getHotkeyBarVisibility(false, 'victory') === 'obscured', 'victory subordinates the shortcut legend');
assert(getHotkeyBarVisibility(true, 'victory') === 'visible', 'menu restores the shortcut legend');

// When the named HUD regions and interactive siblings are compared
const interactiveCardsOverlap = towerCards.some(card => rectsOverlap(card, startWaveButton));

// Then the release geometry is complete, contained, and non-overlapping
assert(canvas.width === 1280 && canvas.height === 720, 'release canvas is 1280x720');
assert(!rectsOverlap(topBar, towerBar), 'top and tower bars do not overlap');
assert(!rectsOverlap(towerPanel, wavePreview), 'tower and wave panels do not overlap');
assert(isContainedBy(waveProgress, topBar), 'wave progress fits entirely inside the top bar');
assert(!rectsOverlap(waveProgress, towerPanel), 'wave progress does not overlap the selected-tower panel');
assert(towerCards.length === 6, 'layout contains six tower cards');
assert(towerCards.every(card => isContainedBy(card, towerBar)), 'tower cards fit the tower bar');
assert(isContainedBy(startWaveButton, towerBar), 'start-wave button fits the tower bar');
assert(!interactiveCardsOverlap, 'tower cards do not overlap the start-wave button');
assert(towerCards[5]?.x + towerCards[5].width === 944, 'sixth card ends at x=944');
assert(startWaveButton.x - (towerCards[5]?.x + towerCards[5].width) === 8, 'sixth card has an eight-pixel action gap');

const reservedHudCases = [
  { rect: topBar, expected: 'top_bar' },
  { rect: towerPanel, expected: 'tower_panel' },
  { rect: wavePreview, expected: 'wave_preview' },
  { rect: towerBar, expected: 'tower_bar' },
] as const;

for (const { rect, expected } of reservedHudCases) {
  assert(
    getReleaseHudRegionAtPosition(rect.x + rect.width / 2, rect.y + rect.height / 2) === expected,
    `${expected} consumes its noninteractive interior`,
  );
}
assert(
  getReleaseHudRegionAtPosition(playfield.x + 100, playfield.y + 100) === null,
  'playfield remains available to world input',
);

// Given callers receive the shared release geometry
const originalCanvasWidth = canvas.width;
const originalFirstCardX = towerCards[0]?.x;
const originalCardCount = towerCards.length;

// When mutation is attempted through runtime JavaScript operations
const canvasMutationSucceeded = Reflect.set(canvas, 'width', 1);
const firstCardMutationSucceeded = Reflect.set(towerCards[0] ?? {}, 'x', 1);
const collectionMutationSucceeded = Reflect.set(towerCards, 'length', 0);

// Then nested rectangles and the collection remain immutable
assert(!canvasMutationSucceeded, 'canvas rectangle rejects runtime mutation');
assert(!firstCardMutationSucceeded, 'tower-card rectangles reject runtime mutation');
assert(!collectionMutationSucceeded, 'tower-card collection rejects runtime mutation');
assert(canvas.width === originalCanvasWidth, 'canvas rectangle is immutable at runtime');
assert(towerCards[0]?.x === originalFirstCardX, 'tower-card rectangles are immutable at runtime');
assert(towerCards.length === originalCardCount, 'tower-card collection is immutable at runtime');

// Given the fixed pause controls and selected-tower Growth label
const { pausePanel, pauseSettings, towerGrowthLabel } = RELEASE_HUD_LAYOUT;
const pauseControls = [
  pauseSettings.musicVolumeBar,
  pauseSettings.soundVolumeBar,
  pauseSettings.muteButton,
  ...pauseSettings.speedButtons,
];

// When their containment and sibling geometry is evaluated
const pauseControlOverlap = pauseControls.some((control, index) => (
  pauseControls.slice(index + 1).some(sibling => rectsOverlap(control, sibling))
));

// Then every rectangle is contained and interactive siblings remain separate
assert(isContainedBy(pausePanel, canvas), 'pause panel fits the release canvas');
assert(pauseControls.every(control => isContainedBy(control, pausePanel)), 'pause controls fit the pause panel');
assert(!pauseControlOverlap, 'pause controls do not overlap');
assert(isContainedBy(towerGrowthLabel, towerPanel), 'Growth label fits the selected-tower panel');

// Given inclusive pointer boundaries for every pause setting
const pauseHitCases = [
  { rect: pauseSettings.musicVolumeBar, expected: 'music_volume' },
  { rect: pauseSettings.soundVolumeBar, expected: 'sound_volume' },
  { rect: pauseSettings.muteButton, expected: 'mute' },
  { rect: pauseSettings.speedButtons[0], expected: 'speed_normal' },
  { rect: pauseSettings.speedButtons[1], expected: 'speed_fast' },
  { rect: pauseSettings.speedButtons[2], expected: 'speed_faster' },
] as const;

// When top-left, bottom-right, and outside points are routed
for (const { rect, expected } of pauseHitCases) {
  assert(getPauseSettingsControlAtPosition(rect.x, rect.y) === expected, `${expected} includes its top-left boundary`);
  assert(
    getPauseSettingsControlAtPosition(rect.x + rect.width, rect.y + rect.height) === expected,
    `${expected} includes its bottom-right boundary`,
  );
}

// Then points outside the settings controls remain unhandled
assert(getPauseSettingsControlAtPosition(pausePanel.x, pausePanel.y) === null, 'empty pause panel space is not a setting');

// Given nested pause geometry exposed to runtime callers
const originalVolumeX = pauseSettings.musicVolumeBar.x;
const originalSoundVolumeX = pauseSettings.soundVolumeBar.x;
const originalSpeedCount = pauseSettings.speedButtons.length;

// When nested mutation is attempted
const volumeMutationSucceeded = Reflect.set(pauseSettings.musicVolumeBar, 'x', 1);
const soundVolumeMutationSucceeded = Reflect.set(pauseSettings.soundVolumeBar, 'x', 1);
const speedCollectionMutationSucceeded = Reflect.set(pauseSettings.speedButtons, 'length', 0);

// Then pause rectangles and collections remain immutable
assert(!volumeMutationSucceeded, 'pause setting rectangles reject runtime mutation');
assert(!soundVolumeMutationSucceeded, 'sound setting rectangle rejects runtime mutation');
assert(!speedCollectionMutationSucceeded, 'pause speed collection rejects runtime mutation');
assert(pauseSettings.musicVolumeBar.x === originalVolumeX, 'pause music rectangle remains unchanged');
assert(pauseSettings.soundVolumeBar.x === originalSoundVolumeX, 'pause sound rectangle remains unchanged');
assert(pauseSettings.speedButtons.length === originalSpeedCount, 'pause speed collection remains unchanged');

const shellHtml = readFileSync(resolve(__dirname, '../../public/index.html'), 'utf8');
assert(
  /body\s*\{[^}]*overflow:\s*hidden;/s.test(shellHtml),
  '1280x720 browser shell prevents scrollbars from clipping the fixed canvas',
);
assert(
  /#gameCanvas\s*\{[^}]*width:\s*1280px;[^}]*height:\s*720px;/s.test(shellHtml),
  'browser shell fixes the canvas surface to exactly 1280x720',
);
assert(
  /#gameCanvas\s*\{[^}]*outline:\s*2px solid #333;[^}]*outline-offset:\s*-2px;/s.test(shellHtml)
    && !/#gameCanvas\s*\{[^}]*border:/s.test(shellHtml),
  'canvas frame does not reduce the 1280x720 interaction surface',
);
assert(
  /#hotkeyBar\s*\{[^}]*top:\s*8px;[^}]*left:\s*310px;[^}]*right:\s*232px;/s.test(shellHtml)
    && !/#hotkeyBar\s*\{[^}]*bottom:\s*-40px;/s.test(shellHtml),
  'persistent hotkey legend stays inside the open top-center viewport',
);
assert(
  /#hotkeyBar\.is-obscured\s*\{[^}]*opacity:\s*0\.12;/s.test(shellHtml),
  'modal and terminal states can visually subordinate the shortcut legend',
);
assert(
  /<span id="primaryActionLabel">Start Game<\/span>/.test(shellHtml),
  'browser shell starts with a context-correct primary action label',
);
assert(
  /<canvas[^>]*role="application"[^>]*aria-label="Mycelium TD game"[^>]*tabindex="0"/s.test(shellHtml),
  'interactive Canvas exposes an accessible name and keyboard focus target',
);

console.log('release HUD layout tests passed');

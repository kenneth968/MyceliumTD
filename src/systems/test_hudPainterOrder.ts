import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  paintOnboardingReach,
  type OnboardingReachPainter,
} from './onboardingRender';
import { RELEASE_HUD_LAYOUT } from './releaseHudLayout';

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
}

// Given the concrete Canvas HUD compositor
const mainSource = readFileSync(join(__dirname, '..', 'main.ts'), 'utf8');
const drawHudStart = mainSource.indexOf('private drawHUD(renderData: GameFrameRenderData): void');
const drawHudEnd = mainSource.indexOf('private isWaveButtonVisible()', drawHudStart);
const drawHudSource = mainSource.slice(drawHudStart, drawHudEnd);
const drawWavePreviewStart = mainSource.indexOf('private drawWavePreview(', drawHudStart);
const drawWavePreviewEnd = mainSource.indexOf('private drawTraitShape(', drawWavePreviewStart);
const drawWavePreviewSource = mainSource.slice(drawWavePreviewStart, drawWavePreviewEnd);
const drawOnboardingStart = mainSource.indexOf('private drawOnboarding(', drawHudStart);
const drawOnboardingEnd = mainSource.indexOf('private drawWavePreview(', drawOnboardingStart);
const drawOnboardingSource = mainSource.slice(drawOnboardingStart, drawOnboardingEnd);
const renderStart = mainSource.indexOf('private render(renderData: GameFrameRenderData): void');
const renderEnd = mainSource.indexOf('private drawPlacementPreview(', renderStart);
const renderSource = mainSource.slice(renderStart, renderEnd);
const painterCalls = [
  'this.drawWaveAnnouncement',
  'this.drawWaveProgress',
  'this.drawTowerInfoPanel',
  'this.drawLivesMoney',
  'this.drawEnemyCount',
  'this.drawTowerPurchase',
  'this.drawWavePreview',
  'this.drawStartWaveButton',
  'this.drawOnboarding',
  'this.drawMapSelection',
  'this.drawPauseMenu',
  'this.drawGameOverVictory',
] as const;

// When painter call positions are read in contractual order
const painterPositions = painterCalls.map(call => drawHudSource.indexOf(call));

// Then every painter exists and blocking overlays remain the final layers
assert(drawHudStart >= 0 && drawHudEnd > drawHudStart, 'drawHUD compositor is discoverable');
assert(painterPositions.every(position => position >= 0), 'every contractual HUD painter is present');
assert(
  painterPositions.every((position, index) => index === 0 || position > painterPositions[index - 1]),
  'wave preview paints after tower purchase and before Start Wave and blocking overlays',
);
assert(painterCalls[painterCalls.length - 1] === 'this.drawGameOverVictory', 'terminal overlay remains last');
assert(
  drawWavePreviewSource.includes('RELEASE_HUD_LAYOUT.wavePreview'),
  'wave preview drawing uses the shared release HUD rectangle',
);
assert(drawWavePreviewSource.includes('this.ctx.clip()'), 'wave preview drawing clips content to its rectangle');
assert(
  drawWavePreviewSource.includes('BUILD PHASE'),
  'intermission wave preview has an explicit phase cue',
);
assert(
  renderSource.indexOf('paintEnvironmentPathLabels') > renderSource.indexOf('paintCombatEffects'),
  'path endpoint labels paint after combat effects so they remain readable',
);
assert(
  renderSource.indexOf('paintEnvironmentPathLabels') > renderSource.indexOf('this.drawTowers'),
  'path endpoint labels paint after towers so valid placements cannot obscure them',
);
assert(
  drawOnboardingSource.includes('this.renderer.getCamera().zoom'),
  'world-space onboarding reach scales with the active camera zoom',
);
assert(
  drawOnboardingSource.includes('projectOnboardingReach'),
  'concrete onboarding painting consumes the focused pure reach projection',
);

// Given a recording Canvas context and a reach crossing HUD boundaries
const operations: string[] = [];
const painter = {
  strokeStyle: '',
  fillStyle: '',
  lineWidth: 0,
  font: '',
  textAlign: 'start',
  textBaseline: 'alphabetic',
  save: () => operations.push('save'),
  restore: () => operations.push('restore'),
  setLineDash: () => operations.push('dash'),
  beginPath: () => operations.push('begin'),
  rect: (x: number, y: number, width: number, height: number) => {
    operations.push(`rect:${x},${y},${width},${height}`);
  },
  clip: () => operations.push('clip'),
  arc: () => operations.push('arc'),
  stroke: () => operations.push('stroke'),
  fillText: () => operations.push('label'),
} satisfies OnboardingReachPainter;

// When the focused reach painter draws it
paintOnboardingReach(
  painter,
  {
    center: { x: 864, y: 216 },
    radius: 192,
    labelPosition: { x: 864, y: 418 },
  },
  {
    center: { x: 720, y: 180 },
    radius: 160,
    label: 'Reach',
    shape: 'circle',
    lineStyle: 'dashed',
    color: '#4ADE80',
  },
  RELEASE_HUD_LAYOUT.playfield,
);

// Then clipping wraps only the ring and is restored before its label
const clipPosition = operations.indexOf('clip');
const arcPosition = operations.indexOf('arc');
const clippedRestorePosition = operations.indexOf('restore');
const labelPosition = operations.indexOf('label');
assert(
  operations.includes('rect:0,56,960,544'),
  'reach painter clips to the shared playfield rectangle',
);
assert(clipPosition < arcPosition, 'reach painter clips before drawing the ring');
assert(arcPosition < clippedRestorePosition, 'reach painter restores after drawing the ring');
assert(clippedRestorePosition < labelPosition, 'reach label draws after clip restoration');

console.log('HUD painter order tests passed');

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

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
  drawOnboardingSource.includes('this.renderer.getCamera().zoom'),
  'world-space onboarding reach scales with the active camera zoom',
);
assert(
  drawOnboardingSource.includes('projectOnboardingReach'),
  'concrete onboarding painting consumes the focused pure reach projection',
);

console.log('HUD painter order tests passed');

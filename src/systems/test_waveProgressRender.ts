import {
  WaveProgressState,
  WaveProgressBar,
  WaveProgressRenderData,
  WaveProgressAnimator,
  createWaveProgressAnimator,
  showWaveProgress,
  hideWaveProgress,
  isWaveProgressVisible,
  updateWaveProgress,
  getWaveProgressBarRenderData,
  getWaveProgressRenderData,
  isWaveProgressActive,
  isWaveProgressPaused,
  isWaveProgressComplete,
  resetWaveProgressAnimator,
  getWaveProgressStateLabel,
  getWaveProgressBarColors,
  getWaveProgressPosition,
  getWaveProgressSize,
} from './waveProgressRender';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`Assertion failed: ${message} (expected ${expectedStr}, got ${actualStr})`);
  }
}

let passed = 0;
let failed = 0;

function runTests() {
  console.log('Running waveProgressRender tests...\n');

  try { createWaveProgressAnimatorTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { showWaveProgressTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { hideWaveProgressTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { isWaveProgressVisibleTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { updateWaveProgressTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getWaveProgressBarRenderDataTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getWaveProgressRenderDataTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { isWaveProgressActiveTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { isWaveProgressPausedTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { isWaveProgressCompleteTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { resetWaveProgressAnimatorTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getWaveProgressStateLabelTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getWaveProgressBarColorsTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getWaveProgressPositionTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getWaveProgressSizeTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { WaveProgressStateEnumTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

function createWaveProgressAnimatorTests() {
  console.log('Testing createWaveProgressAnimator...');

  const animator = createWaveProgressAnimator();
  assertEqual(animator.state, 'idle', 'initial state is idle');
  assertEqual(animator.startTime, 0, 'startTime');
  assertEqual(animator.elapsed, 0, 'elapsed');
  assertEqual(animator.progress, 0, 'progress');

  passed++;
}

function showWaveProgressTests() {
  console.log('Testing showWaveProgress...');

  const animator = createWaveProgressAnimator();
  showWaveProgress(animator, 1000);

  assertEqual(animator.state, 'active', 'state is active');
  assertEqual(animator.startTime, 1000, 'startTime');
  assertEqual(animator.elapsed, 0, 'elapsed reset');
  assertEqual(animator.progress, 0, 'progress reset');

  passed++;
}

function hideWaveProgressTests() {
  console.log('Testing hideWaveProgress...');

  const animator = createWaveProgressAnimator();
  animator.state = 'active';
  hideWaveProgress(animator, 2000);

  assertEqual(animator.state, 'hidden', 'state is hidden');

  passed++;
}

function isWaveProgressVisibleTests() {
  console.log('Testing isWaveProgressVisible...');

  const animator = createWaveProgressAnimator();
  animator.state = 'hidden';
  assertEqual(isWaveProgressVisible(animator), false, 'hidden is not visible');

  animator.state = 'active';
  assertEqual(isWaveProgressVisible(animator), true, 'active is visible');

  animator.state = 'paused';
  assertEqual(isWaveProgressVisible(animator), true, 'paused is visible');

  passed++;
}

function updateWaveProgressTests() {
  console.log('Testing updateWaveProgress...');

  const animator = createWaveProgressAnimator();
  animator.state = 'hidden';
  updateWaveProgress(animator, 100, 1000);
  assertEqual(animator.elapsed, 0, 'no update when hidden');

  animator.state = 'active';
  updateWaveProgress(animator, 100, 1000);
  assertEqual(animator.elapsed, 100, 'elapsed updated');

  updateWaveProgress(animator, 500, 1500);
  assertEqual(animator.progress, 1, 'progress capped at 1');

  passed++;
}

function getWaveProgressBarRenderDataTests() {
  console.log('Testing getWaveProgressBarRenderData...');

  const bar = getWaveProgressBarRenderData({ x: 100, y: 200 }, 0.5, 1);
  assertEqual(bar.position.x, 100, 'x position');
  assertEqual(bar.position.y, 200, 'y position');
  assertEqual(bar.size.width, 160, 'width');
  assertEqual(bar.size.height, 12, 'height');
  assertEqual(bar.progress, 0.5, 'progress');
  assertEqual(bar.fillColor, '#4CAF50', 'fillColor');
  assertEqual(bar.backgroundColor, 'rgba(50, 50, 50, 0.8)', 'backgroundColor');
  assertEqual(bar.borderColor, '#666666', 'borderColor');
  assertEqual(bar.borderWidth, 1, 'borderWidth');
  assertEqual(bar.opacity, 1, 'opacity');

  const barNeg = getWaveProgressBarRenderData({ x: 100, y: 200 }, -0.5, 1);
  assertEqual(barNeg.progress, 0, 'progress clamped to 0');

  const barOver = getWaveProgressBarRenderData({ x: 100, y: 200 }, 1.5, 1);
  assertEqual(barOver.progress, 1, 'progress clamped to 1');

  passed++;
}

function getWaveProgressRenderDataTests() {
  console.log('Testing getWaveProgressRenderData...');

  let animator = createWaveProgressAnimator();
  animator.state = 'hidden';
  let data = getWaveProgressRenderData(animator, {
    currentWave: 3,
    totalWaves: 10,
    enemiesTotal: 20,
    enemiesDefeated: 10,
    enemiesRemaining: 10,
  });
  assertEqual(data.state, WaveProgressState.Hidden, 'hidden state');
  assertEqual(data.isVisible, false, 'is not visible');

  animator.state = 'active';
  data = getWaveProgressRenderData(animator, {
    currentWave: 3,
    totalWaves: 10,
    enemiesTotal: 20,
    enemiesDefeated: 10,
    enemiesRemaining: 10,
  });
  assertEqual(data.state, WaveProgressState.Active, 'active state');
  assertEqual(data.isVisible, true, 'is visible');
  assertEqual(data.currentWave, 3, 'currentWave');
  assertEqual(data.totalWaves, 10, 'totalWaves');
  assertEqual(data.enemiesTotal, 20, 'enemiesTotal');
  assertEqual(data.enemiesDefeated, 10, 'enemiesDefeated');
  assertEqual(data.enemiesRemaining, 10, 'enemiesRemaining');
  assertEqual(data.waveText, 'Wave 3/10', 'waveText');
  assertEqual(data.progressText, '10/20', 'progressText');
  assertEqual(data.progress, 0.5, 'progress');
  assertEqual(data.isFastForward, false, 'isFastForward default');

  animator.state = 'paused';
  data = getWaveProgressRenderData(animator);
  assertEqual(data.state, WaveProgressState.Paused, 'paused state');

  data = getWaveProgressRenderData(animator, { isFastForward: true });
  assertEqual(data.isFastForward, true, 'isFastForward');

  data = getWaveProgressRenderData(animator, {
    enemiesTotal: 0,
    enemiesDefeated: 0,
    enemiesRemaining: 10,
  });
  assertEqual(data.progressText, '10 remaining', 'progressText with remaining');

  const bar = data.bar;
  assert(bar !== undefined, 'bar exists');
  assertEqual(bar.progress, 0, 'bar progress when no enemies');

  passed++;
}

function isWaveProgressActiveTests() {
  console.log('Testing isWaveProgressActive...');

  const animator = createWaveProgressAnimator();
  animator.state = 'active';
  assertEqual(isWaveProgressActive(animator), true, 'active is active');

  animator.state = 'paused';
  assertEqual(isWaveProgressActive(animator), false, 'paused is not active');

  passed++;
}

function isWaveProgressPausedTests() {
  console.log('Testing isWaveProgressPaused...');

  const animator = createWaveProgressAnimator();
  animator.state = 'paused';
  assertEqual(isWaveProgressPaused(animator), true, 'paused is paused');

  animator.state = 'active';
  assertEqual(isWaveProgressPaused(animator), false, 'active is not paused');

  passed++;
}

function isWaveProgressCompleteTests() {
  console.log('Testing isWaveProgressComplete...');

  const animator = createWaveProgressAnimator();
  animator.state = 'complete';
  assertEqual(isWaveProgressComplete(animator), true, 'complete is complete');

  animator.state = 'active';
  assertEqual(isWaveProgressComplete(animator), false, 'active is not complete');

  passed++;
}

function resetWaveProgressAnimatorTests() {
  console.log('Testing resetWaveProgressAnimator...');

  const animator = createWaveProgressAnimator();
  animator.state = 'active';
  animator.elapsed = 100;
  animator.progress = 0.5;
  resetWaveProgressAnimator(animator);

  assertEqual(animator.state, 'idle', 'state reset to idle');
  assertEqual(animator.elapsed, 0, 'elapsed reset');
  assertEqual(animator.progress, 0, 'progress reset');

  passed++;
}

function getWaveProgressStateLabelTests() {
  console.log('Testing getWaveProgressStateLabel...');

  assertEqual(getWaveProgressStateLabel(WaveProgressState.Hidden), '', 'Hidden label');
  assertEqual(getWaveProgressStateLabel(WaveProgressState.Idle), 'Ready', 'Idle label');
  assertEqual(getWaveProgressStateLabel(WaveProgressState.Active), 'In Progress', 'Active label');
  assertEqual(getWaveProgressStateLabel(WaveProgressState.Paused), 'Paused', 'Paused label');
  assertEqual(getWaveProgressStateLabel(WaveProgressState.Complete), 'Wave Complete', 'Complete label');
  assertEqual(getWaveProgressStateLabel(WaveProgressState.GameOver), 'Game Over', 'GameOver label');
  assertEqual(getWaveProgressStateLabel(WaveProgressState.Victory), 'Victory!', 'Victory label');

  passed++;
}

function getWaveProgressBarColorsTests() {
  console.log('Testing getWaveProgressBarColors...');

  let colors = getWaveProgressBarColors(false);
  assertEqual(colors.fill, '#4CAF50', 'normal fill');
  assertEqual(colors.border, '#666666', 'normal border');

  colors = getWaveProgressBarColors(true);
  assertEqual(colors.fill, '#FF5722', 'fast forward fill');
  assertEqual(colors.border, '#FF5722', 'fast forward border');

  passed++;
}

function getWaveProgressPositionTests() {
  console.log('Testing getWaveProgressPosition...');

  const pos = getWaveProgressPosition();
  assertEqual(pos.x, 400, 'x');
  assertEqual(pos.y, 40, 'y');

  passed++;
}

function getWaveProgressSizeTests() {
  console.log('Testing getWaveProgressSize...');

  const size = getWaveProgressSize();
  assertEqual(size.width, 200, 'width');
  assertEqual(size.height, 60, 'height');

  passed++;
}

function WaveProgressStateEnumTests() {
  console.log('Testing WaveProgressState enum...');

  assertEqual(WaveProgressState.Hidden, 'hidden', 'Hidden');
  assertEqual(WaveProgressState.Idle, 'idle', 'Idle');
  assertEqual(WaveProgressState.Active, 'active', 'Active');
  assertEqual(WaveProgressState.Paused, 'paused', 'Paused');
  assertEqual(WaveProgressState.Complete, 'complete', 'Complete');
  assertEqual(WaveProgressState.GameOver, 'game_over', 'GameOver');
  assertEqual(WaveProgressState.Victory, 'victory', 'Victory');

  passed++;
}

runTests();

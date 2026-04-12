import { GameRunner, createGameRunner, GameState } from './gameRunner';
import { 
  WaveProgressAnimator, 
  WaveProgressState,
  createWaveProgressAnimator,
  showWaveProgress,
  hideWaveProgress,
  updateWaveProgress,
  getWaveProgressRenderData,
  getWaveProgressBarColors,
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
  console.log('Testing WaveProgress Integration with GameRunner...\n');

  try { getWaveProgressAnimatorTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getWaveProgressRenderDataTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { waveStartShowsProgressTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { waveProgressAnimationUpdateTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { pauseChangesWaveProgressStateTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { resumeChangesWaveProgressStateTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { waveProgressResetTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { waveProgressGameOverTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { waveProgressVictoryTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { waveProgressBarColorsTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { waveProgressRenderDataStructureTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { waveProgressWithGameStatsTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

function getWaveProgressAnimatorTests() {
  console.log('Testing getWaveProgressAnimator...');

  const game = createGameRunner();
  const animator = game.getWaveProgressAnimator();

  assert(animator !== null, 'animator is not null');
  assert(animator !== undefined, 'animator is not undefined');
  assertEqual(animator.state, 'idle', 'initial state is idle');
  assertEqual(animator.elapsed, 0, 'elapsed starts at 0');
  assertEqual(animator.progress, 0, 'progress starts at 0');

  game.reset();
  passed++;
}

function getWaveProgressRenderDataTests() {
  console.log('Testing getWaveProgressRenderData...');

  const game = createGameRunner();

  const renderData = game.getWaveProgressRenderData();
  assert(renderData !== null, 'render data is not null');
  assertEqual(renderData.state, WaveProgressState.Idle, 'state is idle initially');
  assertEqual(renderData.isVisible, true, 'wave progress is visible in idle');
  assertEqual(renderData.currentWave, 0, 'current wave is 0 before any wave starts');
  assertEqual(renderData.totalWaves, 10, 'total waves is 10');
  assertEqual(renderData.bar.progress, 0, 'bar progress is 0');
  assertEqual(renderData.waveText, 'Wave 0/10', 'wave text is correct before any wave starts');

  game.reset();
  passed++;
}

function waveStartShowsProgressTests() {
  console.log('Testing wave start shows progress...');

  const game = createGameRunner();
  game.start();

  const animator = game.getWaveProgressAnimator();
  assertEqual(animator.state, 'idle', 'animator idle before wave start');

  game.startWave(0);

  assertEqual(animator.state, 'active', 'animator state is active after wave start');

  const renderData = game.getWaveProgressRenderData();
  assertEqual(renderData.state, WaveProgressState.Active, 'render data state is active');
  assertEqual(renderData.isVisible, true, 'wave progress is visible');

  game.reset();
  passed++;
}

function waveProgressAnimationUpdateTests() {
  console.log('Testing wave progress animation updates...');

  const game = createGameRunner();
  game.start();

  game.startWave(0);

  const renderData1 = game.getWaveProgressRenderData();
  assert(renderData1.elapsed >= 0, 'elapsed is valid');

  game.update(100);
  game.update(100);

  const renderData2 = game.getWaveProgressRenderData();
  assert(renderData2.elapsed >= renderData1.elapsed, 'elapsed increases over time');

  game.reset();
  passed++;
}

function pauseChangesWaveProgressStateTests() {
  console.log('Testing pause changes wave progress state...');

  const game = createGameRunner();
  game.start();
  game.startWave(0);

  const animator1 = game.getWaveProgressAnimator();
  assertEqual(animator1.state, 'active', 'state is active before pause');

  game.pause();

  assertEqual(animator1.state, 'paused', 'state is paused after pause');
  assertEqual(game.getState(), GameState.Paused, 'game state is paused');

  const renderData = game.getWaveProgressRenderData();
  assertEqual(renderData.state, WaveProgressState.Paused, 'render data state is paused');

  game.reset();
  passed++;
}

function resumeChangesWaveProgressStateTests() {
  console.log('Testing resume changes wave progress state...');

  const game = createGameRunner();
  game.start();
  game.startWave(0);
  game.pause();

  const animator = game.getWaveProgressAnimator();
  assertEqual(animator.state, 'paused', 'state is paused before resume');

  game.resume();

  assertEqual(animator.state, 'active', 'state is active after resume');
  assertEqual(game.getState(), GameState.Playing, 'game state is playing');

  game.reset();
  passed++;
}

function waveProgressResetTests() {
  console.log('Testing wave progress reset...');

  const game = createGameRunner();
  game.start();
  game.startWave(0);

  const animator1 = game.getWaveProgressAnimator();
  assertEqual(animator1.state, 'active', 'state is active before reset');

  game.reset();

  const animator2 = game.getWaveProgressAnimator();
  assertEqual(animator2.state, 'idle', 'state is idle after reset');
  assertEqual(animator2.elapsed, 0, 'elapsed is 0 after reset');
  assertEqual(animator2.progress, 0, 'progress is 0 after reset');

  game.reset();
  passed++;
}

function waveProgressGameOverTests() {
  console.log('Testing wave progress game over state...');

  const game = createGameRunner();
  game.start();

  const animator = game.getWaveProgressAnimator();
  showWaveProgress(animator, 1000);
  assertEqual(animator.state, 'active', 'state is active initially');

  animator.state = 'game_over';

  const renderData = game.getWaveProgressRenderData();
  assertEqual(renderData.state, WaveProgressState.GameOver, 'render data state is game over');
  assertEqual(renderData.isVisible, true, 'wave progress is visible in game over');

  game.reset();
  passed++;
}

function waveProgressVictoryTests() {
  console.log('Testing wave progress victory state...');

  const game = createGameRunner();
  game.start();

  const animator = game.getWaveProgressAnimator();
  showWaveProgress(animator, 1000);
  assertEqual(animator.state, 'active', 'state is active initially');

  animator.state = 'victory';

  const renderData = game.getWaveProgressRenderData();
  assertEqual(renderData.state, WaveProgressState.Victory, 'render data state is victory');
  assertEqual(renderData.isVisible, true, 'wave progress is visible in victory');

  game.reset();
  passed++;
}

function waveProgressBarColorsTests() {
  console.log('Testing wave progress bar colors...');

  const normalColors = getWaveProgressBarColors(false);
  assertEqual(normalColors.fill, '#4CAF50', 'normal fill color is green');
  assertEqual(normalColors.border, '#666666', 'normal border color is gray');

  const fastForwardColors = getWaveProgressBarColors(true);
  assertEqual(fastForwardColors.fill, '#FF5722', 'fast forward fill color is orange');
  assertEqual(fastForwardColors.border, '#FF5722', 'fast forward border color is orange');

  passed++;
}

function waveProgressRenderDataStructureTests() {
  console.log('Testing wave progress render data structure...');

  const game = createGameRunner();

  const renderData = game.getWaveProgressRenderData();

  assert(renderData.position !== null, 'position exists');
  assertEqual(renderData.size.width, 200, 'width is 200');
  assertEqual(renderData.size.height, 60, 'height is 60');
  assertEqual(renderData.enemiesTotal, 0, 'enemies total is 0');
  assertEqual(renderData.enemiesDefeated, 0, 'enemies defeated is 0');
  assert(renderData.bar !== null, 'bar exists');
  assertEqual(renderData.bar.position.x, renderData.position.x, 'bar x position matches');
  assertEqual(renderData.bar.size.width, 160, 'bar width is 160');
  assertEqual(renderData.bar.size.height, 12, 'bar height is 12');

  game.reset();
  passed++;
}

function waveProgressWithGameStatsTests() {
  console.log('Testing wave progress with game stats...');

  const game = createGameRunner();

  const stats = game.getGameStats();
  assertEqual(stats.wave, 0, 'wave from stats is 0 before any wave starts');
  assertEqual(stats.totalWaves, 10, 'total waves from stats is 10');

  const renderData = game.getWaveProgressRenderData();
  assertEqual(renderData.currentWave, stats.wave, 'current wave matches stats');
  assertEqual(renderData.totalWaves, stats.totalWaves, 'total waves matches stats');

  game.reset();
  passed++;
}

runTests();
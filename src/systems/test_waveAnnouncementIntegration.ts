import { GameRunner, createGameRunner, GameState } from './gameRunner';
import { WaveAnnouncementAnimator, WaveAnnouncementState, createWaveAnnouncementAnimator, startWaveAnnouncement, triggerWaveCompletion, updateWaveAnnouncement, getWaveUIAnnouncementRenderData } from './waveAnnouncementRender';

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

function assertApproxEqual(actual: number, expected: number, epsilon: number, message: string) {
  if (Math.abs(actual - expected) > epsilon) {
    throw new Error(`Assertion failed: ${message} (expected ~${expected}, got ${actual})`);
  }
}

let passed = 0;
let failed = 0;

function runTests() {
  console.log('Running WaveAnnouncement Integration tests...\n');

  try { getWaveAnnouncementAnimatorTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { waveAnnouncementRenderDataTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { startWaveTriggersAnnouncementTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { waveCompletionTriggersCompletionTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { announcementAnimationUpdateTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { waveAnnouncementResetTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { waveAnnouncementGameStateTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { multiWaveAnnouncementTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

function getWaveAnnouncementAnimatorTests() {
  console.log('Testing getWaveAnnouncementAnimator...');

  const game = createGameRunner();
  const animator = game.getWaveAnnouncementAnimator();

  assert(animator !== null, 'animator is not null');
  assert(animator !== undefined, 'animator is not undefined');
  assertEqual(animator.state, 'hidden', 'initial state is hidden');
  assertEqual(animator.waveIndex, 0, 'wave index starts at 0');
  assertEqual(animator.waveName, '', 'wave name starts empty');

  game.reset();
  passed++;
}

function waveAnnouncementRenderDataTests() {
  console.log('Testing getWaveAnnouncementRenderData...');

  const game = createGameRunner();

  const renderData = game.getWaveAnnouncementRenderData();
  assert(renderData !== null, 'render data is not null');
  assertEqual(renderData.isAnyVisible, false, 'nothing visible initially');
  assertEqual(renderData.announcement.isVisible, false, 'announcement not visible initially');
  assertEqual(renderData.completion.isVisible, false, 'completion not visible initially');
  assertEqual(renderData.announcement.state, WaveAnnouncementState.Hidden, 'announcement state is hidden');
  assertEqual(renderData.completion.progress, 0, 'completion progress is 0');

  game.reset();
  passed++;
}

function startWaveTriggersAnnouncementTests() {
  console.log('Testing wave start triggers announcement...');

  const game = createGameRunner();
  game.start();

  const animator = game.getWaveAnnouncementAnimator();
  assertEqual(animator.state, 'hidden', 'animator hidden before wave start');

  game.startWave(0);

  assertEqual(animator.state, 'announcing', 'animator state is announcing after wave start');
  assertEqual(animator.waveIndex, 0, 'wave index set correctly');

  game.reset();
  passed++;
}

function waveCompletionTriggersCompletionTests() {
  console.log('Testing wave completion triggers completion announcement...');

  const game = createGameRunner();
  game.start();

  const animator = game.getWaveAnnouncementAnimator();

  startWaveAnnouncement(animator, 2, 'Test Wave', 1000);
  triggerWaveCompletion(animator, 200, 5000);

  assertEqual(animator.state, 'completing', 'animator state is completing');
  assertEqual(animator.bonusAmount, 200, 'bonus amount set correctly');

  game.reset();
  passed++;
}

function announcementAnimationUpdateTests() {
  console.log('Testing announcement animation updates correctly...');

  const game = createGameRunner();

  const renderData1 = game.getWaveAnnouncementRenderData();
  assertEqual(renderData1.isAnyVisible, false, 'nothing visible at start');

  game.start();

  game.startWave(0);

  const renderData2 = game.getWaveAnnouncementRenderData();
  assertEqual(renderData2.isAnyVisible, true, 'announcement visible after wave start');
  assertEqual(renderData2.announcement.waveNumber, 0, 'wave number correct');

  game.update(100);
  game.update(100);

  const renderData3 = game.getWaveAnnouncementRenderData();
  assert(renderData3.announcement.opacity >= 0, 'opacity is valid');

  game.reset();
  passed++;
}

function waveAnnouncementResetTests() {
  console.log('Testing wave announcement reset on game reset...');

  const game = createGameRunner();
  game.start();

  const animator1 = game.getWaveAnnouncementAnimator();
  startWaveAnnouncement(animator1, 3, 'Test Wave', 1000);

  game.reset();

  const animator2 = game.getWaveAnnouncementAnimator();
  assertEqual(animator2.state, 'hidden', 'animator reset to hidden');
  assertEqual(animator2.waveIndex, 0, 'wave index reset to 0');
  assertEqual(animator2.waveName, '', 'wave name reset to empty');

  passed++;
}

function waveAnnouncementGameStateTests() {
  console.log('Testing wave announcement with game state...');

  const game = createGameRunner();

  const animator = game.getWaveAnnouncementAnimator();
  assertEqual(animator.state, 'hidden', 'hidden when game not started');

  game.start();
  game.startWave(0);

  assertEqual(animator.state, 'announcing', 'announcing when wave starts in playing state');

  game.pause();
  assertEqual(game.getState(), GameState.Paused, 'game is paused');

  game.resume();
  assertEqual(game.getState(), GameState.Playing, 'game is playing again');

  game.reset();
  passed++;
}

function multiWaveAnnouncementTests() {
  console.log('Testing announcements for multiple waves...');

  const game = createGameRunner();
  game.start();

  const animator = game.getWaveAnnouncementAnimator();

  game.startWave(0);
  const wave1Index = animator.waveIndex;

  game.reset();
  game.start();
  game.startWave(1);

  assert(animator.waveIndex >= 0, 'wave index is valid');

  game.reset();
  passed++;
}

runTests();
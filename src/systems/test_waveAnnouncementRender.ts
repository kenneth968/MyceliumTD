import {
  WaveAnnouncementState,
  WaveAnnouncementRenderData,
  WaveCompleteRenderData,
  WaveUIAnnouncementRenderData,
  getWaveAnnouncementState,
  getWaveCompleteData,
  WaveAnnouncementAnimator,
  createWaveAnnouncementAnimator,
  startWaveAnnouncement,
  triggerWaveCompletion,
  updateWaveAnnouncement,
  getAnimatedWaveAnnouncement,
  getAnimatedWaveComplete,
  getWaveUIAnnouncementRenderData,
  isWaveAnnouncementActive,
  isWaveCompletionShowing,
  hideWaveAnnouncement,
  getWaveAnnouncementPosition,
  getWaveCompletePosition,
} from './waveAnnouncementRender';

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
  console.log('Running waveAnnouncementRender tests...\n');

  try { getWaveAnnouncementStateTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getWaveCompleteDataTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { createWaveAnnouncementAnimatorTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { startWaveAnnouncementTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { triggerWaveCompletionTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { updateWaveAnnouncementTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getAnimatedWaveAnnouncementTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getAnimatedWaveCompleteTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getWaveUIAnnouncementRenderDataTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { isWaveAnnouncementActiveTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { isWaveCompletionShowingTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { hideWaveAnnouncementTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getWaveAnnouncementPositionTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }
  try { getWaveCompletePositionTests(); } catch (e: any) { console.error('FAIL:', e.message); failed++; }

  console.log(`\nResults: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    process.exit(1);
  }
}

function getWaveAnnouncementStateTests() {
  console.log('Testing getWaveAnnouncementState...');

  const hidden = getWaveAnnouncementState(1, 'Red Dawn', 'hidden');
  assertEqual(hidden.state, WaveAnnouncementState.Hidden, 'hidden state');
  assertEqual(hidden.isVisible, false, 'hidden is not visible');
  assertEqual(hidden.opacity, 0, 'hidden opacity is 0');

  const incoming = getWaveAnnouncementState(1, 'Red Dawn', 'announcing');
  assertEqual(incoming.state, WaveAnnouncementState.Incoming, 'incoming state');
  assertEqual(incoming.isVisible, true, 'incoming is visible');
  assertEqual(incoming.waveNumber, 1, 'wave number correct');
  assertEqual(incoming.waveName, 'Red Dawn', 'wave name correct');
  assertEqual(incoming.position.x, 400, 'x position');
  assertEqual(incoming.position.y, 200, 'y position');

  const active = getWaveAnnouncementState(5, 'Wasp Wave', 'active');
  assertEqual(active.state, WaveAnnouncementState.Active, 'active state');
  assertEqual(active.isVisible, true, 'active is visible');
  assertEqual(active.waveNumber, 5, 'wave number correct');

  const completing = getWaveAnnouncementState(3, 'Caterpillar Crawl', 'completing');
  assertEqual(completing.state, WaveAnnouncementState.Complete, 'completing state');

  passed++;
}

function getWaveCompleteDataTests() {
  console.log('Testing getWaveCompleteData...');

  const complete = getWaveCompleteData(1, 'Red Dawn', 100);
  assertEqual(complete.waveNumber, 1, 'wave number');
  assertEqual(complete.waveName, 'Red Dawn', 'wave name');
  assertEqual(complete.bonusAmount, 100, 'bonus amount');
  assertEqual(complete.position.x, 400, 'x position');
  assertEqual(complete.position.y, 250, 'y position');
  assertEqual(complete.bonusText, 'Wave Complete!', 'bonus text');
  assertEqual(complete.isVisible, true, 'is visible');

  passed++;
}

function createWaveAnnouncementAnimatorTests() {
  console.log('Testing createWaveAnnouncementAnimator...');

  const animator = createWaveAnnouncementAnimator();
  assertEqual(animator.state, 'hidden', 'initial state is hidden');
  assertEqual(animator.waveIndex, 0, 'wave index');
  assertEqual(animator.waveName, '', 'wave name');
  assertEqual(animator.startTime, 0, 'start time');
  assertEqual(animator.announcementElapsed, 0, 'announcement elapsed');
  assertEqual(animator.completionElapsed, 0, 'completion elapsed');
  assertEqual(animator.announcementProgress, 0, 'announcement progress');
  assertEqual(animator.completionProgress, 0, 'completion progress');
  assertEqual(animator.bonusAmount, 0, 'bonus amount');

  passed++;
}

function startWaveAnnouncementTests() {
  console.log('Testing startWaveAnnouncement...');

  const animator = createWaveAnnouncementAnimator();
  startWaveAnnouncement(animator, 3, 'Caterpillar Crawl', 1000);

  assertEqual(animator.state, 'announcing', 'state is announcing');
  assertEqual(animator.waveIndex, 3, 'wave index');
  assertEqual(animator.waveName, 'Caterpillar Crawl', 'wave name');
  assertEqual(animator.startTime, 1000, 'start time');
  assertEqual(animator.announcementElapsed, 0, 'announcement elapsed reset');
  assertEqual(animator.completionElapsed, 0, 'completion elapsed reset');

  passed++;
}

function triggerWaveCompletionTests() {
  console.log('Testing triggerWaveCompletion...');

  const animator = createWaveAnnouncementAnimator();
  
  triggerWaveCompletion(animator, 150, 2000);
  assertEqual(animator.state, 'hidden', 'cannot trigger when hidden');

  startWaveAnnouncement(animator, 2, 'Beetle Surge', 1000);
  triggerWaveCompletion(animator, 200, 3000);

  assertEqual(animator.state, 'completing', 'state is completing');
  assertEqual(animator.bonusAmount, 200, 'bonus amount');
  assertEqual(animator.startTime, 3000, 'start time updated');
  assertEqual(animator.completionElapsed, 0, 'completion elapsed reset');

  passed++;
}

function updateWaveAnnouncementTests() {
  console.log('Testing updateWaveAnnouncement...');

  const animator = createWaveAnnouncementAnimator();
  
  updateWaveAnnouncement(animator, 100, 100);
  assertEqual(animator.state, 'hidden', 'no change when hidden');

  startWaveAnnouncement(animator, 1, 'Red Dawn', 0);
  updateWaveAnnouncement(animator, 500, 500);
  
  assertEqual(animator.announcementElapsed, 500, 'elapsed time updated');
  assert(animator.announcementProgress > 0, 'progress increased');

  passed++;
}

function getAnimatedWaveAnnouncementTests() {
  console.log('Testing getAnimatedWaveAnnouncement...');

  const animator = createWaveAnnouncementAnimator();
  const data = getAnimatedWaveAnnouncement(animator);
  
  assertEqual(data.isVisible, false, 'hidden animator gives invisible announcement');

  startWaveAnnouncement(animator, 1, 'Red Dawn', 0);
  
  const atStart = getAnimatedWaveAnnouncement(animator);
  assertEqual(atStart.state, WaveAnnouncementState.Incoming, 'state is incoming');

  updateWaveAnnouncement(animator, 250, 250);
  const midFadeIn = getAnimatedWaveAnnouncement(animator);
  assert(midFadeIn.opacity > 0, 'opacity > 0 during fade in');
  assert(midFadeIn.scale > 0.5, 'scale > 0.5 during fade in');

  updateWaveAnnouncement(animator, 250, 500);
  const afterFadeIn = getAnimatedWaveAnnouncement(animator);
  assertApproxEqual(afterFadeIn.opacity, 1, 0.1, 'opacity = 1 after fade in');
  assertApproxEqual(afterFadeIn.scale, 1, 0.1, 'scale = 1 after fade in');

  passed++;
}

function getAnimatedWaveCompleteTests() {
  console.log('Testing getAnimatedWaveComplete...');

  const animator = createWaveAnnouncementAnimator();
  const data = getAnimatedWaveComplete(animator);
  
  assertEqual(data.isVisible, false, 'hidden animator gives invisible completion');

  startWaveAnnouncement(animator, 1, 'Red Dawn', 0);
  triggerWaveCompletion(animator, 150, 3500);
  
  updateWaveAnnouncement(animator, 100, 3600);
  const visible = getAnimatedWaveComplete(animator);
  assertEqual(visible.isVisible, true, 'completion visible');
  assertEqual(visible.bonusAmount, 150, 'bonus amount preserved');
  assertEqual(visible.waveNumber, 1, 'wave number preserved');

  passed++;
}

function getWaveUIAnnouncementRenderDataTests() {
  console.log('Testing getWaveUIAnnouncementRenderData...');

  const animator = createWaveAnnouncementAnimator();
  
  let data = getWaveUIAnnouncementRenderData(animator);
  assertEqual(data.isAnyVisible, false, 'nothing visible when hidden');

  startWaveAnnouncement(animator, 5, 'Wasp Wave', 0);
  
  data = getWaveUIAnnouncementRenderData(animator);
  assertEqual(data.isAnyVisible, true, 'announcement visible');
  assertEqual(data.announcement.waveNumber, 5, 'wave number in announcement');
  assertEqual(data.completion.isVisible, false, 'completion not visible yet');

  passed++;
}

function isWaveAnnouncementActiveTests() {
  console.log('Testing isWaveAnnouncementActive...');

  const animator = createWaveAnnouncementAnimator();
  assertEqual(isWaveAnnouncementActive(animator), false, 'hidden is not active');

  startWaveAnnouncement(animator, 1, 'Red Dawn', 0);
  assertEqual(isWaveAnnouncementActive(animator), true, 'announcing is active');

  updateWaveAnnouncement(animator, 3500, 3500);
  assertEqual(isWaveAnnouncementActive(animator), false, 'completed is not active');

  passed++;
}

function isWaveCompletionShowingTests() {
  console.log('Testing isWaveCompletionShowing...');

  const animator = createWaveAnnouncementAnimator();
  assertEqual(isWaveCompletionShowing(animator), false, 'hidden is not showing');

  startWaveAnnouncement(animator, 1, 'Red Dawn', 0);
  assertEqual(isWaveCompletionShowing(animator), false, 'announcing is not showing');

  triggerWaveCompletion(animator, 100, 100);
  assertEqual(isWaveCompletionShowing(animator), true, 'completing is showing');

  passed++;
}

function hideWaveAnnouncementTests() {
  console.log('Testing hideWaveAnnouncement...');

  const animator = createWaveAnnouncementAnimator();
  
  startWaveAnnouncement(animator, 1, 'Red Dawn', 0);
  updateWaveAnnouncement(animator, 1000, 1000);
  
  hideWaveAnnouncement(animator);
  
  assertEqual(animator.state, 'hidden', 'state is hidden');
  assertEqual(isWaveAnnouncementActive(animator), false, 'is no longer active');

  passed++;
}

function getWaveAnnouncementPositionTests() {
  console.log('Testing getWaveAnnouncementPosition...');

  const pos = getWaveAnnouncementPosition(1, 10);
  assertEqual(pos.x, 400, 'x position');
  assertEqual(pos.y, 200, 'y position');

  const pos2 = getWaveAnnouncementPosition(5, 10);
  assertEqual(pos2.x, 400, 'x position same');
  assertEqual(pos2.y, 200, 'y position same');

  passed++;
}

function getWaveCompletePositionTests() {
  console.log('Testing getWaveCompletePosition...');

  const pos = getWaveCompletePosition(1, 10);
  assertEqual(pos.x, 400, 'x position');
  assertEqual(pos.y, 250, 'y position');

  passed++;
}

runTests();

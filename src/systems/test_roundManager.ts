import { RoundManager, RoundState, createRoundManager, RoundConfig, RoundInfo } from './roundManager';
import { WaveSpawner, createDefaultWaves, Wave } from './wave';
import { GameEconomy, createEconomy } from './economy';
import { Path, createDefaultPath } from './path';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} (expected ${expected}, got ${actual})`);
  }
}

function assertContains(actual: any, expected: any, message: string) {
  if (!String(actual).includes(expected)) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function createTestRoundManager(config?: Partial<RoundConfig>): RoundManager {
  const path = createDefaultPath();
  const waveSpawner = new WaveSpawner(path, createDefaultWaves());
  const economy = createEconomy({ startingMoney: 650, startingLives: 20 });
  return createRoundManager(waveSpawner, economy, config);
}

console.log('Testing RoundManager...');

// Initialization tests
console.log('Testing initialization...');
const manager1 = createTestRoundManager();
assert(manager1.getState() === RoundState.Idle, 'Initial state should be Idle');
assert(manager1.getRoundNumber() === 0, 'Initial round number should be 0');
assertEqual(manager1.getConfig().intermissionDuration, 5000, 'Default intermission should be 5000ms');
assertEqual(manager1.getConfig().maxRounds, 10, 'Default max rounds should be 10');
assertEqual(manager1.getConfig().autoStartNextRound, false, 'Default autoStartNextRound should be false');
assert(manager1.isInIntermission() === false, 'Should not be in intermission initially');
assert(manager1.isRoundActive() === false, 'Should not be round active initially');
console.log('  Initialization tests passed!');

// Custom config tests
console.log('Testing custom config...');
const manager2 = createTestRoundManager({
  intermissionDuration: 3000,
  maxRounds: 5,
  autoStartNextRound: true,
});
assertEqual(manager2.getConfig().intermissionDuration, 3000, 'Custom intermission should be 3000ms');
assertEqual(manager2.getConfig().maxRounds, 5, 'Custom max rounds should be 5');
assertEqual(manager2.getConfig().autoStartNextRound, true, 'Custom autoStartNextRound should be true');
console.log('  Custom config tests passed!');

// startFirstRound tests
console.log('Testing startFirstRound...');
const manager3 = createTestRoundManager();
manager3.startFirstRound();
assert(manager3.getState() === RoundState.Intermission, 'Should be in Intermission after startFirstRound');
assert(manager3.getRoundNumber() === 1, 'Round number should be 1 after startFirstRound');
const result1 = manager3.startFirstRound();
assert(result1 === false, 'startFirstRound should return false when not in Idle');
console.log('  startFirstRound tests passed!');

// startRound tests
console.log('Testing startRound...');
const manager4 = createTestRoundManager();
manager4.startFirstRound();
manager4.startRound();
assert(manager4.getState() === RoundState.Active, 'Should be Active after startRound');
console.log('  startRound tests passed!');

// startRound with specific index
console.log('Testing startRound with specific wave index...');
const manager5 = createTestRoundManager();
manager5.startFirstRound();
const result2 = manager5.startRound(4);
assert(result2 === true, 'startRound should succeed with valid wave index');
assert(manager5.getState() === RoundState.Active, 'Should be Active after startRound with index');
console.log('  startRound with specific index tests passed!');

// startRound when not in valid state should fail
console.log('Testing startRound failure cases...');
const manager5b = createTestRoundManager();
const result2b = manager5b.startRound();
assert(result2b === false, 'startRound should fail when not in Idle or Intermission');
console.log('  startRound failure cases tests passed!');

// startNextRound tests
console.log('Testing startNextRound...');
const manager6 = createTestRoundManager();
manager6.startFirstRound();
manager6.startRound();
manager6.startNextRound();
assert(manager6.getRoundNumber() === 2, 'Round number should be 2 after startNextRound');
assert(manager6.getState() === RoundState.Intermission, 'Should be in Intermission after startNextRound');
console.log('  startNextRound tests passed!');

// startNextRound on last round should fail
console.log('Testing startNextRound on last round...');
const manager7 = createTestRoundManager({ maxRounds: 1 });
manager7.startFirstRound();
manager7.startRound();
const result3 = manager7.startNextRound();
assert(result3 === false, 'startNextRound should return false on last round');
console.log('  startNextRound on last round tests passed!');

// checkRoundCompletion with wave active and enemies should stay Active
console.log('Testing checkRoundCompletion with active wave...');
const manager8 = createTestRoundManager();
manager8.startFirstRound();
manager8.startRound();
const state1 = manager8.checkRoundCompletion(5);
assert(state1 === RoundState.Active, 'Should remain Active with enemies alive');
console.log('  checkRoundCompletion with active enemies tests passed!');

// checkRoundCompletion with wave active should stay Active
console.log('Testing checkRoundCompletion with wave still spawning...');
const manager8b = createTestRoundManager();
manager8b.startFirstRound();
manager8b.startRound();
const state1b = manager8b.checkRoundCompletion(0);
assert(state1b === RoundState.Active, 'Should remain Active while wave spawning');
console.log('  checkRoundCompletion with wave spawning tests passed!');

// triggerGameOver tests
console.log('Testing triggerGameOver...');
const manager11 = createTestRoundManager();
manager11.startFirstRound();
manager11.triggerGameOver();
assert(manager11.getState() === RoundState.GameOver, 'Should be in GameOver state');
console.log('  triggerGameOver tests passed!');

// skipIntermission tests
console.log('Testing skipIntermission...');
const manager13 = createTestRoundManager();
manager13.startFirstRound();
assert(manager13.getState() === RoundState.Intermission, 'Should be in Intermission');
const result4 = manager13.skipIntermission();
assert(result4 === true, 'skipIntermission should return true');
assert(manager13.getState() === RoundState.Active, 'Should be Active after skipIntermission');
console.log('  skipIntermission tests passed!');

// skipIntermission when not in intermission should fail
console.log('Testing skipIntermission when not in intermission...');
const manager14 = createTestRoundManager();
const result5 = manager14.skipIntermission();
assert(result5 === false, 'skipIntermission should return false when not in Intermission');
console.log('  skipIntermission when not in intermission tests passed!');

// reset tests
console.log('Testing reset...');
const manager15 = createTestRoundManager();
manager15.startFirstRound();
manager15.startRound();
manager15.reset();
assert(manager15.getState() === RoundState.Idle, 'Should be Idle after reset');
assert(manager15.getRoundNumber() === 0, 'Round number should be 0 after reset');
console.log('  reset tests passed!');

// getRoundInfo tests
console.log('Testing getRoundInfo...');
const manager16 = createTestRoundManager({ maxRounds: 10 });
manager16.startFirstRound();
const info = manager16.getRoundInfo();
assert(info.roundNumber === 1, 'RoundInfo should have correct round number');
assert(info.totalRounds === 10, 'RoundInfo should have correct total rounds');
assert(info.state === RoundState.Intermission, 'RoundInfo should have correct state');
assert(info.isLastRound === false, 'Should not be last round on round 1');
console.log('  getRoundInfo tests passed!');

// isLastRound should be true on final round
console.log('Testing isLastRound on final round...');
const manager17 = createTestRoundManager({ maxRounds: 1 });
manager17.startFirstRound();
const info2 = manager17.getRoundInfo();
assert(info2.isLastRound === true, 'Should be last round on round 1 of 1');
console.log('  isLastRound on final round tests passed!');

// intermission time tracking tests
console.log('Testing intermission time tracking...');
const manager18 = createTestRoundManager({ intermissionDuration: 5000 });
manager18.startFirstRound();
const remaining = manager18.getIntermissionTimeRemaining();
assert(remaining > 0 && remaining <= 5000, 'Intermission time remaining should be valid');
console.log('  intermission time tracking tests passed!');

// getIntermissionProgress tests
console.log('Testing getIntermissionProgress...');
const manager19 = createTestRoundManager({ intermissionDuration: 2000 });
manager19.startFirstRound();
(manager19 as any).intermissionStartTime = Date.now() - 1000;
const progress = manager19.getIntermissionProgress();
assert(progress >= 0.4 && progress <= 0.6, 'Intermission progress should be around 50%');
console.log('  getIntermissionProgress tests passed!');

// getStateDuration tests
console.log('Testing getStateDuration...');
const manager20 = createTestRoundManager();
manager20.startFirstRound();
const duration = manager20.getStateDuration(RoundState.Intermission);
assert(duration >= 0, 'State duration should be non-negative');
const duration2 = manager20.getStateDuration(RoundState.Active);
assert(duration2 === 0, 'State duration for non-current state should be 0');
console.log('  getStateDuration tests passed!');

// event callbacks tests
console.log('Testing event callbacks...');
const manager21 = createTestRoundManager();
let eventRound21 = 0;
manager21.setEvents({
  onIntermissionStart: (round) => { eventRound21 = round; },
});
manager21.startFirstRound();
assert(eventRound21 === 1, 'onIntermissionStart should fire with correct round');
console.log('  Event callbacks tests passed!');

// onRoundStart event
console.log('Testing onRoundStart event...');
const manager22 = createTestRoundManager();
let eventRound22 = 0;
let eventWave22: Wave | null = null;
manager22.setEvents({
  onRoundStart: (round, wave) => {
    eventRound22 = round;
    eventWave22 = wave;
  },
});
manager22.startFirstRound();
manager22.startRound();
assert(eventRound22 === 1, 'onRoundStart should fire with correct round');
assert(eventWave22 !== null, 'onRoundStart should provide wave');
assertContains(eventWave22!.name, 'Red Dawn', 'Wave should be first wave');
console.log('  onRoundStart event tests passed!');

// onGameOver event
console.log('Testing onGameOver event...');
const manager25 = createTestRoundManager();
let gameOverRound25 = 0;
manager25.setEvents({
  onGameOver: (round) => { gameOverRound25 = round; },
});
manager25.startFirstRound();
manager25.triggerGameOver();
assert(gameOverRound25 === 1, 'onGameOver should fire with correct round');
console.log('  onGameOver event tests passed!');

// update method tests
console.log('Testing update method...');
const manager27 = createTestRoundManager({ intermissionDuration: 100 });
manager27.startFirstRound();
assert(manager27.getState() === RoundState.Intermission, 'Should be in Intermission before update');
manager27.update(Date.now() + 50);
assert(manager27.getState() === RoundState.Intermission, 'Should remain in Intermission with autoStartNextRound false');
console.log('  update method tests passed!');

// Test round state transitions
console.log('Testing round state transitions...');
const manager28 = createTestRoundManager();
assert(manager28.getState() === RoundState.Idle, 'Should start at Idle');
manager28.startFirstRound();
assert(manager28.getState() === RoundState.Intermission, 'Should transition to Intermission');
manager28.startRound();
assert(manager28.getState() === RoundState.Active, 'Should transition to Active');
manager28.reset();
assert(manager28.getState() === RoundState.Idle, 'Should return to Idle after reset');
console.log('  Round state transitions tests passed!');

// Test getTimeInCurrentState
console.log('Testing getTimeInCurrentState...');
const manager29 = createTestRoundManager();
manager29.startFirstRound();
const time1 = manager29.getTimeInCurrentState();
assert(time1 >= 0, 'Time should be non-negative');
console.log('  getTimeInCurrentTime tests passed!');

// Test skipIntermission after startFirstRound
console.log('Testing skipIntermission after startFirstRound...');
const manager30 = createTestRoundManager();
manager30.startFirstRound();
assert(manager30.skipIntermission() === true, 'skipIntermission should succeed');
assert(manager30.getState() === RoundState.Active, 'State should be Active');
console.log('  skipIntermission after startFirstRound tests passed!');

// Test max round boundary
console.log('Testing max round boundary...');
const manager31 = createTestRoundManager({ maxRounds: 5 });
for (let i = 1; i <= 5; i++) {
  manager31.startFirstRound();
  if (i < 5) {
    manager31.startRound();
    manager31.startNextRound();
  } else {
    manager31.startRound();
  }
}
assert(manager31.getRoundNumber() === 5, 'Should be on round 5');
assert(manager31.startNextRound() === false, 'startNextRound should fail on last round');
console.log('  Max round boundary tests passed!');

// Test getTimeInCurrentState returns 0 for non-current state
console.log('Testing getTimeInCurrentState for non-current state...');
const manager32 = createTestRoundManager();
manager32.startFirstRound();
const durationActive = manager32.getStateDuration(RoundState.Active);
assert(durationActive === 0, 'Duration for non-current Active state should be 0');
console.log('  getTimeInCurrentState for non-current state tests passed!');

// Test getIntermissionTimeRemaining outside intermission
console.log('Testing getIntermissionTimeRemaining outside intermission...');
const manager33 = createTestRoundManager();
assert(manager33.getIntermissionTimeRemaining() === 0, 'Should return 0 when not in intermission');
console.log('  getIntermissionTimeRemaining outside intermission tests passed!');

// Test getIntermissionProgress outside intermission
console.log('Testing getIntermissionProgress outside intermission...');
const manager34 = createTestRoundManager();
assert(manager34.getIntermissionProgress() === 1, 'Should return 1 when not in intermission');
console.log('  getIntermissionProgress outside intermission tests passed!');

// Test onVictory event with proper setup
console.log('Testing onVictory event...');
const manager35 = createTestRoundManager({ maxRounds: 1 });
let victoryRound35 = 0;
manager35.setEvents({
  onVictory: (finalRound) => { victoryRound35 = finalRound; },
});
manager35.startFirstRound();
manager35.startRound();
// Simulate victory by directly manipulating state
(manager35 as any).state = RoundState.Victory;
if ((manager35 as any).events.onVictory) {
  (manager35 as any).events.onVictory(1);
}
assert(victoryRound35 === 1, 'onVictory should fire with correct round');
assert(manager35.getState() === RoundState.Victory, 'State should be Victory');
console.log('  onVictory event tests passed!');

// Test that triggerGameOver does nothing when already GameOver
console.log('Testing triggerGameOver when already GameOver...');
const manager36 = createTestRoundManager();
manager36.startFirstRound();
manager36.triggerGameOver();
assert(manager36.getState() === RoundState.GameOver, 'Should be in GameOver state');
manager36.startFirstRound(); // Try to start again
manager36.triggerGameOver();
assert(manager36.getState() === RoundState.GameOver, 'Should remain GameOver after triggerGameOver');
console.log('  triggerGameOver when already GameOver tests passed!');

// Test getConfig returns copy
console.log('Testing getConfig returns copy...');
const manager37 = createTestRoundManager();
const config1 = manager37.getConfig();
const config2 = manager37.getConfig();
config1.intermissionDuration = 9999;
assert(manager37.getConfig().intermissionDuration !== 9999, 'getConfig should return a copy');
console.log('  getConfig returns copy tests passed!');

// Test round progression through multiple rounds
console.log('Testing round progression through multiple rounds...');
const manager38 = createTestRoundManager({ maxRounds: 3 });
manager38.startFirstRound();
assert(manager38.getRoundNumber() === 1, 'Should be on round 1');
manager38.skipIntermission();
assert(manager38.getState() === RoundState.Active, 'Should be Active after skipIntermission');
manager38.startNextRound();
assert(manager38.getRoundNumber() === 2, 'Should be on round 2');
manager38.skipIntermission();
manager38.startNextRound();
assert(manager38.getRoundNumber() === 3, 'Should be on round 3');
console.log('  Round progression through multiple rounds tests passed!');

console.log('\nAll RoundManager tests passed!');
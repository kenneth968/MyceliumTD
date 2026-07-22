import { GameState } from './gameRunner';
import { GameAudioDirector, getMusicTrackForWave, type AudioManagerPort, type SoundEffectsPort } from './gameAudioDirector';
import { MusicTrack } from './audioManager';
import { SoundCue } from './soundCues';
import type { GameEvent } from './gameEvents';
import { createOnboardingState } from './onboarding';
import { drainGameEventsForPresentation } from './onboardingIntegration';
import { EnemyType } from './wave';

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`FAIL: ${message}`); }
function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) throw new Error(`FAIL: ${message} (expected ${String(expected)}, got ${String(actual)})`);
}

assertEqual(getMusicTrackForWave(-2), null, 'invalid wave index has no gameplay track');
assertEqual(getMusicTrackForWave(-1), MusicTrack.Chantarelle, 'initial build phase uses the opening track');
for (let wave = 0; wave < 5; wave += 1) assertEqual(getMusicTrackForWave(wave), MusicTrack.Chantarelle, `wave ${wave + 1}`);
for (let wave = 5; wave < 9; wave += 1) assertEqual(getMusicTrackForWave(wave), MusicTrack.LionsMane1, `wave ${wave + 1}`);
assertEqual(getMusicTrackForWave(9), MusicTrack.LionsMane2, 'wave 10');

class FakeMusic implements AudioManagerPort {
  readonly calls: string[] = [];
  acceptsPlay = true;
  private currentTrack: MusicTrack | null = null;
  play(track: MusicTrack): void {
    this.calls.push(`play:${track}`);
    if (this.acceptsPlay) this.currentTrack = track;
  }
  pause(): void { this.calls.push('pause'); }
  resume(): void { this.calls.push('resume'); }
  stop(): void { this.calls.push('stop'); this.currentTrack = null; }
  getCurrentTrack(): MusicTrack | null { return this.currentTrack; }
}
class FakeEffects implements SoundEffectsPort {
  readonly cues: string[] = [];
  pauseCalls = 0;
  resumeCalls = 0;
  stopCalls = 0;
  play(cue: string): void { this.cues.push(cue); }
  pause(): void { this.pauseCalls += 1; }
  resume(): void { this.resumeCalls += 1; }
  stop(): void { this.stopCalls += 1; }
}

function enterMenu(director: GameAudioDirector): void {
  if (!('enterMenu' in director) || typeof director.enterMenu !== 'function') {
    throw new Error('FAIL: director exposes a dedicated menu lifecycle route');
  }
  director.enterMenu();
}

const music = new FakeMusic();
const effects = new FakeEffects();
const director = new GameAudioDirector(music, effects);
director.update([], GameState.Playing, -1);
director.update([], GameState.Playing, 0);
director.update([], GameState.Playing, 4);
director.update([], GameState.Playing, 5);
director.update([], GameState.Playing, 8);
director.update([], GameState.Playing, 9);
assertEqual(music.calls.join(','), 'play:chantarelle,play:lions_mane_1,play:lions_mane_2', 'director changes music only at exact bands');
director.update([], GameState.Paused, 9);
director.update([], GameState.Paused, 9);
director.update([], GameState.Playing, 9);
assertEqual(music.calls.slice(-2).join(','), 'pause,resume', 'pause and resume current track once');
assertEqual(effects.pauseCalls, 1, 'pause reaches effects');
assertEqual(effects.resumeCalls, 1, 'resume reaches effects');

const idleMusic = new FakeMusic();
const idleEffects = new FakeEffects();
const idleDirector = new GameAudioDirector(idleMusic, idleEffects);
idleDirector.update([], GameState.Playing, 0);
idleDirector.update([], GameState.Paused, 0);
idleDirector.update([], GameState.Idle, -1);
assertEqual(idleMusic.calls.includes('resume'), false, 'paused-to-idle never resumes music');
assertEqual(idleEffects.resumeCalls, 0, 'paused-to-idle never resumes active effects');
assertEqual(idleMusic.calls.at(-1), 'stop', 'paused-to-idle stops music');
assertEqual(idleEffects.stopCalls, 1, 'paused-to-idle retires every active effect');

const victory: GameEvent = { type: 'victory', timestamp: 0, waveNumber: 10 };
director.update([victory], GameState.Victory, 9);
assertEqual(effects.cues.at(-1), SoundCue.Victory, 'terminal cue routes before stop');
assertEqual(music.calls.at(-1), 'stop', 'victory stops gameplay music');
director.update([], GameState.Victory, 9);
assertEqual(music.calls.filter(call => call === 'stop').length, 1, 'terminal state stops once');

const victoryEffects = new FakeEffects();
const victoryDirector = new GameAudioDirector(new FakeMusic(), victoryEffects);
const waveCompleted: GameEvent = {
  type: 'wave_completed',
  timestamp: 0,
  waveNumber: 10,
  completion: 1,
  perfect: 1,
  total: 1,
};
victoryDirector.update([waveCompleted, victory], GameState.Victory, 9);
assertEqual(victoryEffects.cues.join(','), SoundCue.Victory, 'victory suppresses nonterminal cues from the same batch');

const leaked: GameEvent = {
  type: 'enemy_leaked',
  timestamp: 0,
  position: { x: 0, y: 0 },
  enemyId: 1,
  enemyType: EnemyType.DartWasp,
  waveNumber: 10,
};
const defeat: GameEvent = { type: 'defeat', timestamp: 0, waveNumber: 10 };
const defeatEffects = new FakeEffects();
const defeatDirector = new GameAudioDirector(new FakeMusic(), defeatEffects);
defeatDirector.update([leaked, defeat], GameState.GameOver, 9);
assertEqual(defeatEffects.cues.join(','), SoundCue.Defeat, 'defeat suppresses nonterminal cues from the same batch');
const menuMusic = new FakeMusic();
const menuEffects = new FakeEffects();
const menuDirector = new GameAudioDirector(menuMusic, menuEffects);
menuDirector.update([], GameState.Playing, 0);
enterMenu(menuDirector);
assertEqual(menuMusic.calls.at(-1), 'stop', 'menu transition stops gameplay music');
assertEqual(menuEffects.stopCalls, 1, 'playing-to-menu retires every active effect');

const pausedMenuMusic = new FakeMusic();
const pausedMenuEffects = new FakeEffects();
const pausedMenuDirector = new GameAudioDirector(pausedMenuMusic, pausedMenuEffects);
pausedMenuDirector.update([], GameState.Playing, 0);
pausedMenuDirector.update([], GameState.Paused, 0);
enterMenu(pausedMenuDirector);
assertEqual(pausedMenuMusic.calls.at(-1), 'stop', 'paused-to-menu stops music without resuming it');
assertEqual(pausedMenuMusic.calls.includes('resume'), false, 'paused-to-menu never resumes music');
assertEqual(pausedMenuEffects.resumeCalls, 0, 'paused-to-menu never resumes active effects');
assertEqual(pausedMenuEffects.stopCalls, 1, 'paused-to-menu retires every active effect');

// Given a music port that rejects the desired track once
const recoveryMusic = new FakeMusic();
recoveryMusic.acceptsPlay = false;
const recoveryDirector = new GameAudioDirector(recoveryMusic, new FakeEffects());
recoveryDirector.update([], GameState.Playing, 0);

// When the next normal update reaches an available music port
recoveryMusic.acceptsPlay = true;
recoveryDirector.update([], GameState.Playing, 0);

// Then the desired track is requested again and becomes current
assertEqual(recoveryMusic.calls.join(','), 'play:chantarelle,play:chantarelle', 'normal update retries rejected music');
assertEqual(recoveryMusic.getCurrentTrack(), MusicTrack.Chantarelle, 'successful normal-update retry becomes current');

let drainCount = 0;
let combatBatch: readonly GameEvent[] | null = null;
let audioBatch: readonly GameEvent[] | null = null;
const exactBatch = Object.freeze([victory]);
const drained = drainGameEventsForPresentation(
  createOnboardingState(false),
  () => { drainCount += 1; return exactBatch; },
  {
    combat: events => { combatBatch = events; },
    audio: events => { audioBatch = events; },
  },
);
assertEqual(drainCount, 1, 'simulation events drain exactly once');
assert(drained.events === exactBatch, 'onboarding receives exact batch identity');
assert(combatBatch === exactBatch, 'combat receives exact batch identity');
assert(audioBatch === exactBatch, 'audio receives exact batch identity');
console.log('game audio director tests passed');

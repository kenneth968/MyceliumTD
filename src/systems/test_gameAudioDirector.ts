import { GameState } from './gameRunner';
import { GameAudioDirector, getMusicTrackForWave, type AudioManagerPort, type SoundEffectsPort } from './gameAudioDirector';
import { MusicTrack } from './audioManager';
import { SoundCue } from './soundCues';
import type { GameEvent } from './gameEvents';
import { createOnboardingState } from './onboarding';
import { drainGameEventsForPresentation } from './onboardingIntegration';

function assert(condition: boolean, message: string): void { if (!condition) throw new Error(`FAIL: ${message}`); }
function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) throw new Error(`FAIL: ${message} (expected ${String(expected)}, got ${String(actual)})`);
}

assertEqual(getMusicTrackForWave(-1), null, 'menu has no gameplay track');
for (let wave = 0; wave < 5; wave += 1) assertEqual(getMusicTrackForWave(wave), MusicTrack.Chantarelle, `wave ${wave + 1}`);
for (let wave = 5; wave < 9; wave += 1) assertEqual(getMusicTrackForWave(wave), MusicTrack.LionsMane1, `wave ${wave + 1}`);
assertEqual(getMusicTrackForWave(9), MusicTrack.LionsMane2, 'wave 10');

class FakeMusic implements AudioManagerPort {
  readonly calls: string[] = [];
  play(track: string): void { this.calls.push(`play:${track}`); }
  pause(): void { this.calls.push('pause'); }
  resume(): void { this.calls.push('resume'); }
  stop(): void { this.calls.push('stop'); }
}
class FakeEffects implements SoundEffectsPort {
  readonly cues: string[] = [];
  pauseCalls = 0;
  resumeCalls = 0;
  play(cue: string): void { this.cues.push(cue); }
  pause(): void { this.pauseCalls += 1; }
  resume(): void { this.resumeCalls += 1; }
}

const music = new FakeMusic();
const effects = new FakeEffects();
const director = new GameAudioDirector(music, effects);
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

const victory: GameEvent = { type: 'victory', timestamp: 0, waveNumber: 10 };
director.update([victory], GameState.Victory, 9);
assertEqual(effects.cues.at(-1), SoundCue.Victory, 'terminal cue routes before stop');
assertEqual(music.calls.at(-1), 'stop', 'victory stops gameplay music');
director.update([], GameState.Victory, 9);
assertEqual(music.calls.filter(call => call === 'stop').length, 1, 'terminal state stops once');
const menuMusic = new FakeMusic();
const menuDirector = new GameAudioDirector(menuMusic, new FakeEffects());
menuDirector.update([], GameState.Playing, 0);
menuDirector.update([], GameState.Idle, -1);
assertEqual(menuMusic.calls.at(-1), 'stop', 'menu transition stops gameplay music');

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

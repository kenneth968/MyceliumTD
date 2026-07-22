import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { EvolutionEffect, EvolutionPath } from '../content/evolutionDefinitions';
import { TowerType } from '../entities/tower';
import { EnemyTrait } from '../entities/enemy';
import { EnemyType } from './wave';
import { SOUND_ASSET_URLS, SoundCue, getSoundCuesForEvent } from './soundCues';
import { SoundEffects, type SoundAssetVoice, type SoundFallback } from './soundEffects';
import {
  SOUND_PROFILES,
  SynthAudioRuntime,
  SynthSoundFallback,
  type AudioContextLifecycle,
  type ScheduledTone,
} from './synthSoundFallback';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`FAIL: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) throw new Error(`FAIL: ${message} (expected ${String(expected)}, got ${String(actual)})`);
}

const eventCases = [
  [{ type: 'tower_placed', timestamp: 0, position: { x: 0, y: 0 }, towerId: 1, towerType: TowerType.Sporecap }, SoundCue.Place],
  [{ type: 'network_connection_created', timestamp: 0, position: { x: 0, y: 0 }, towerId: 1, sourceTowerId: null }, SoundCue.NetworkBloom],
  [{ type: 'tower_matured', timestamp: 0, towerId: 1, towerType: TowerType.Sporecap }, SoundCue.Mature],
  [{ type: 'tower_evolved', timestamp: 0, towerId: 1, towerType: TowerType.Sporecap, path: EvolutionPath.Predator, effect: EvolutionEffect.NeedleVolley }, SoundCue.Evolve],
  [{ type: 'layer_broken', timestamp: 0, position: { x: 0, y: 0 }, enemyId: 1, enemyType: EnemyType.ShellBeetle, layersBroken: 1 }, SoundCue.LayerBreak],
  [{ type: 'trait_broken', timestamp: 0, position: { x: 0, y: 0 }, enemyId: 1, trait: EnemyTrait.Metal }, SoundCue.TraitBreak],
  [{ type: 'seeded_payload_detonated', timestamp: 0, position: { x: 0, y: 0 }, sourceTowerId: 1, targetEnemyId: 2 }, SoundCue.SeedDetonate],
  [{ type: 'enemy_leaked', timestamp: 0, position: { x: 0, y: 0 }, enemyId: 1, enemyType: EnemyType.DartWasp, waveNumber: 1 }, SoundCue.Leak],
  [{ type: 'wave_completed', timestamp: 0, waveNumber: 1, completion: 1, perfect: 1, total: 1 }, SoundCue.WaveComplete],
  [{ type: 'victory', timestamp: 0, waveNumber: 10 }, SoundCue.Victory],
  [{ type: 'defeat', timestamp: 0, waveNumber: 10 }, SoundCue.Defeat],
] as const;

for (const [event, cue] of eventCases) assertEqual(getSoundCuesForEvent(event).join(','), cue, `${event.type} maps to ${cue}`);
assertEqual(getSoundCuesForEvent({ type: 'wave_started', timestamp: 0, waveNumber: 1 }).length, 0, 'non-critical event stays silent');
assertEqual(Object.keys(SOUND_ASSET_URLS).length, Object.keys(SoundCue).length, 'every cue has an asset URL');
assertEqual(new Set(Object.values(SOUND_ASSET_URLS)).size, Object.keys(SoundCue).length, 'cue URLs are unique');
for (const url of Object.values(SOUND_ASSET_URLS)) {
  assert(url.startsWith('./assets/sfx/') && url.endsWith('.mp3'), 'runtime cues use public-relative packaged MP3 files');
  const browserPath = new URL(url, 'http://localhost:8080/public/index.html').pathname;
  assert(browserPath.startsWith('/public/assets/sfx/'), 'runtime cue resolves beneath the served public page');
  assert(existsSync(join(process.cwd(), browserPath.slice(1))), `runtime cue exists at ${browserPath}`);
}

class FakeVoice implements SoundAssetVoice {
  readonly clones: FakeVoice[] = [];
  preloadCalls = 0;
  playCalls = 0;
  resetCalls = 0;
  pauseCalls = 0;
  volume = -1;
  rejectPlay = false;
  private errorListener: (() => void) | null = null;
  private endedListener: (() => void) | null = null;
  setVolume(value: number): void { this.volume = value; }
  reset(): void { this.resetCalls += 1; }
  play(): Promise<void> { this.playCalls += 1; return this.rejectPlay ? Promise.reject(new Error('rejected')) : Promise.resolve(); }
  pause(): void { this.pauseCalls += 1; }
  clone(): SoundAssetVoice { const clone = new FakeVoice(); clone.rejectPlay = this.rejectPlay; this.clones.push(clone); return clone; }
  preload(): void { this.preloadCalls += 1; }
  onError(listener: () => void): () => void {
    this.errorListener = listener;
    return () => { if (this.errorListener === listener) this.errorListener = null; };
  }
  onEnded(listener: () => void): () => void {
    this.endedListener = listener;
    return () => { if (this.endedListener === listener) this.endedListener = null; };
  }
  failLoad(): void { this.errorListener?.(); }
  finish(): void { this.endedListener?.(); }
}

class FakeFallback implements SoundFallback {
  readonly cues: string[] = [];
  volume = -1;
  unlockCalls = 0;
  pauseCalls = 0;
  resumeCalls = 0;
  stopCalls = 0;
  setVolume(value: number): void { this.volume = value; }
  unlock(): void { this.unlockCalls += 1; }
  pause(): void { this.pauseCalls += 1; }
  resume(): void { this.resumeCalls += 1; }
  stop(): void { this.stopCalls += 1; }
  play(cue: string): void { this.cues.push(cue); }
}

async function runPlaybackTests(): Promise<void> {
  const prototypes = new Map<string, FakeVoice>();
  const fallback = new FakeFallback();
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...messages: readonly unknown[]): void => { warnings.push(messages.join(' ')); };
  try {
    const effects = new SoundEffects({ volume: 0.5 }, url => {
      const voice = new FakeVoice();
      prototypes.set(url, voice);
      return voice;
    }, fallback);
    assertEqual(prototypes.size, 11, 'all assets have prototypes');
    assert([...prototypes.values()].every(voice => voice.preloadCalls === 1), 'all assets preload once');
    effects.setVolume(0.75);
    effects.unlock();
    effects.play(SoundCue.Place);
    effects.play(SoundCue.Place);
    const place = prototypes.get(SOUND_ASSET_URLS[SoundCue.Place]);
    assertEqual(place?.clones.length, 2, 'concurrent playback uses distinct clones');
    assert(place?.clones[0] !== place?.clones[1], 'clone identities are distinct');
    assertEqual(place?.clones[0]?.volume, 0.75, 'volume reaches clone');
    assertEqual(fallback.volume, 0.75, 'volume reaches fallback');
    assertEqual(fallback.unlockCalls, 1, 'unlock reaches fallback');
    const firstPlaceClone = place?.clones[0];
    const secondPlaceClone = place?.clones[1];
    effects.setVolume(0.25);
    assertEqual(firstPlaceClone?.volume, 0.25, 'live volume reaches first active clone');
    assertEqual(secondPlaceClone?.volume, 0.25, 'live volume reaches concurrent active clone');
    effects.pause();
    assertEqual(firstPlaceClone?.pauseCalls, 1, 'pause reaches active asset voices');
    assertEqual(fallback.pauseCalls, 1, 'pause reaches synthesis context');
    effects.resume();
    await Promise.resolve();
    assertEqual(firstPlaceClone?.playCalls, 2, 'resume restarts active asset voices');
    assertEqual(fallback.resumeCalls, 1, 'resume reaches synthesis context');
    effects.stop();
    assertEqual(firstPlaceClone?.pauseCalls, 2, 'stop pauses active asset voices');
    assertEqual(fallback.stopCalls, 1, 'stop retires synthesized fallback voices');
    firstPlaceClone?.finish();
    secondPlaceClone?.finish();
    effects.pause();
    effects.resume();
    await Promise.resolve();
    assertEqual(firstPlaceClone?.playCalls, 2, 'ended voice is removed before later resume');

    const trait = prototypes.get(SOUND_ASSET_URLS[SoundCue.TraitBreak]);
    effects.play(SoundCue.TraitBreak);
    const failedActive = trait?.clones[0];
    await Promise.resolve();
    failedActive?.failLoad();
    failedActive?.failLoad();
    failedActive?.finish();
    assertEqual(fallback.cues.filter(cue => cue === SoundCue.TraitBreak).length, 1, 'post-start media error falls back once');
    effects.pause();
    effects.resume();
    await Promise.resolve();
    assertEqual(failedActive?.playCalls, 1, 'failed active voice is removed before resume');
    const mature = prototypes.get(SOUND_ASSET_URLS[SoundCue.Mature]);
    mature?.failLoad();
    mature?.failLoad();
    effects.play(SoundCue.Mature);
    assertEqual(warnings.length, 2, 'load failures warn once per affected cue');
    assertEqual(fallback.cues.at(-1), SoundCue.Mature, 'load failure uses matching fallback');
    const evolve = prototypes.get(SOUND_ASSET_URLS[SoundCue.Evolve]);
    if (evolve) evolve.rejectPlay = true;
    effects.play(SoundCue.Evolve);
    await Promise.resolve();
    await Promise.resolve();
    assertEqual(fallback.cues.at(-1), SoundCue.Evolve, 'rejected play uses matching fallback');
    effects.play(SoundCue.Evolve);
    assertEqual(warnings.length, 3, 'rejected play warns once for its cue');
  } finally {
    console.warn = originalWarn;
  }
}

class FakeContextLifecycle implements AudioContextLifecycle {
  state: AudioContextState = 'suspended';
  currentTime = 4;
  resumeCalls = 0;
  suspendCalls = 0;
  rejectResume = false;
  rejectSuspend = false;
  resume(): Promise<void> {
    this.resumeCalls += 1;
    if (this.rejectResume) return Promise.reject(new Error('resume failed'));
    this.state = 'running';
    return Promise.resolve();
  }
  suspend(): Promise<void> {
    this.suspendCalls += 1;
    if (this.rejectSuspend) return Promise.reject(new Error('suspend failed'));
    this.state = 'suspended';
    return Promise.resolve();
  }
}

class FakeScheduledTone implements ScheduledTone {
  scheduleCalls = 0;
  cleanupCalls = 0;
  throwOnSchedule = false;
  schedule(): void {
    this.scheduleCalls += 1;
    if (this.throwOnSchedule) throw new Error('node scheduling failed');
  }
  cleanup(): void { this.cleanupCalls += 1; }
}

async function runSynthLifecycleTests(): Promise<void> {
  const warnings: string[] = [];
  const originalWarn = console.warn;
  console.warn = (...messages: readonly unknown[]): void => { warnings.push(messages.join(' ')); };
  try {
    const constructorFailure = new SynthSoundFallback(0.5, () => { throw new Error('context failed'); });
    constructorFailure.unlock();
    constructorFailure.unlock();
    assertEqual(warnings.length, 1, 'throwing context construction warns once without escaping');

    const lifecycle = new FakeContextLifecycle();
    const tone = new FakeScheduledTone();
    const runtime = new SynthAudioRuntime(lifecycle, () => tone);
    const fallback = new SynthSoundFallback(0.5, () => runtime);
    fallback.unlock();
    await Promise.resolve();
    assertEqual(lifecycle.resumeCalls, 1, 'unlock resumes the owned synthesis context');
    fallback.pause();
    await Promise.resolve();
    assertEqual(lifecycle.suspendCalls, 1, 'pause suspends the owned synthesis context');
    fallback.resume();
    await Promise.resolve();
    assertEqual(lifecycle.resumeCalls, 2, 'resume restarts the same synthesis context');

    fallback.play(SoundCue.Place);
    fallback.stop();
    assertEqual(tone.cleanupCalls, 1, 'stop cleans every active synthesized voice');

    tone.throwOnSchedule = true;
    fallback.play(SoundCue.Place);
    fallback.play(SoundCue.Place);
    assertEqual(tone.cleanupCalls, 3, 'every partial node scheduling failure is cleaned up');
    assertEqual(warnings.length, 2, 'node failures warn once at fallback scope without escaping');

    for (const node of ['oscillator', 'gain']) {
      const factoryFailure = new SynthAudioRuntime(lifecycle, () => { throw new Error(`${node} failed`); });
      const nodeFallback = new SynthSoundFallback(0.5, () => factoryFailure);
      nodeFallback.play(SoundCue.Place);
    }
    assertEqual(warnings.length, 4, 'oscillator and gain construction failures warn without escaping');

    const rejectedLifecycle = new FakeContextLifecycle();
    rejectedLifecycle.rejectResume = true;
    const lifecycleFallback = new SynthSoundFallback(
      0.5,
      () => new SynthAudioRuntime(rejectedLifecycle, () => new FakeScheduledTone()),
    );
    lifecycleFallback.unlock();
    await Promise.resolve();
    assertEqual(warnings.length, 5, 'rejected context resume warns without escaping');
    rejectedLifecycle.state = 'running';
    rejectedLifecycle.rejectSuspend = true;
    lifecycleFallback.pause();
    await Promise.resolve();
    assertEqual(warnings.length, 5, 'rejected context lifecycle warns once at fallback scope');
  } finally {
    console.warn = originalWarn;
  }
}

for (const profile of Object.values(SOUND_PROFILES).flat()) {
  assert(profile.durationMs + profile.delayMs < 500, 'fallback profile finishes under 500 ms');
  assert(profile.gain <= 0.18, 'fallback profile gain is bounded');
}
const network = SOUND_PROFILES[SoundCue.NetworkBloom];
assertEqual(network.length, 2, 'network fallback has two notes');
assertEqual(network[1]?.startHz / (network[0]?.startHz ?? 1), 1.5, 'network fallback starts a perfect fifth apart');
async function runTests(): Promise<void> {
  await runPlaybackTests();
  await runSynthLifecycleTests();
  console.log('sound effects tests passed');
}

void runTests();

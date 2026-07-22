import {
  AudioFailureRegistry,
  AudioManager,
  MusicTrack,
  resolveMusicTrackUrl,
} from './audioManager';
import { BrowserGameAudio } from './gameAudioDirector';
import { GameState } from './gameRunner';

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) throw new Error(`FAIL: ${message}`);
}

assertEqual(
  resolveMusicTrackUrl('./assets/music', MusicTrack.Chantarelle),
  './assets/music/the-chantarelle.mp3',
  'packaged URL'
);

const failures = new AudioFailureRegistry();
assertEqual(failures.record(MusicTrack.Chantarelle), true, 'first failure is reported');
assertEqual(failures.record(MusicTrack.Chantarelle), false, 'duplicate failure is suppressed');

// Given independently configured music and sound channels
const volumeManager = new AudioManager({ musicVolume: 0.25, soundVolume: 0.75 });

// When each channel is changed
volumeManager.setMusicVolume(0.6);
volumeManager.setSoundVolume(0.35);

// Then each channel preserves its own clamped value
assertEqual(volumeManager.getMusicVolume(), 0.6, 'music volume changes independently');
assertEqual(volumeManager.getSoundVolume(), 0.35, 'sound volume changes independently');
volumeManager.setMusicVolume(2);
volumeManager.setSoundVolume(-1);
assertEqual(volumeManager.getMusicVolume(), 1, 'music volume clamps to one');
assertEqual(volumeManager.getSoundVolume(), 0, 'sound volume clamps to zero');

class FakeAudio {
  static readonly instances: FakeAudio[] = [];

  readonly src: string;
  loop = false;
  volume = 1;
  preload = '';
  currentTime = 0;
  playCalls = 0;
  pauseCalls = 0;
  rejectNextPlay = false;
  private readonly listeners = new Map<string, Array<() => void>>();

  constructor(src: string) {
    this.src = src;
    FakeAudio.instances.push(this);
  }

  addEventListener(type: string, listener: EventListenerOrEventListenerObject): void {
    const callback = typeof listener === 'function'
      ? () => listener(new Event(type))
      : () => listener.handleEvent(new Event(type));
    const callbacks = this.listeners.get(type) ?? [];
    callbacks.push(callback);
    this.listeners.set(type, callbacks);
  }

  play(): Promise<void> {
    this.playCalls++;
    if (this.rejectNextPlay) {
      this.rejectNextPlay = false;
      return Promise.reject(new Error('play rejected'));
    }
    return Promise.resolve();
  }

  pause(): void {
    this.pauseCalls++;
  }

  getListenerCount(type: string): number {
    return this.listeners.get(type)?.length ?? 0;
  }

  dispatch(type: string): void {
    for (const callback of this.listeners.get(type) ?? []) {
      callback();
    }
  }
}

class FakeAudioParam {
  values: number[] = [];

  setValueAtTime(value: number): void {
    this.values.push(value);
  }

  exponentialRampToValueAtTime(value: number): void {
    this.values.push(value);
  }
}

class FakeOscillator {
  type: OscillatorType = 'sine';
  frequency = { value: 0 };
  startCalls = 0;
  stopCalls = 0;

  connect(): void {}
  start(): void { this.startCalls++; }
  stop(): void { this.stopCalls++; }
}

class FakeGain {
  gain = new FakeAudioParam();
  connect(): void {}
}

class FakeAudioContext {
  static readonly instances: FakeAudioContext[] = [];
  currentTime = 10;
  destination = {};
  state: AudioContextState = 'suspended';
  resumeCalls = 0;
  suspendCalls = 0;
  oscillator = new FakeOscillator();
  gain = new FakeGain();

  constructor() {
    FakeAudioContext.instances.push(this);
  }

  createOscillator(): FakeOscillator { return this.oscillator; }
  createGain(): FakeGain { return this.gain; }
  resume(): Promise<void> {
    this.resumeCalls++;
    this.state = 'running';
    return Promise.resolve();
  }
  suspend(): Promise<void> {
    this.suspendCalls++;
    this.state = 'suspended';
    return Promise.resolve();
  }
}

function restoreGlobal(
  name: 'Audio' | 'AudioContext' | 'window',
  descriptor: PropertyDescriptor | undefined
): void {
  if (descriptor) {
    Object.defineProperty(globalThis, name, descriptor);
  } else {
    Reflect.deleteProperty(globalThis, name);
  }
}

function getFakeAudio(filename: string): FakeAudio {
  const audio = FakeAudio.instances.find((candidate) => candidate.src.endsWith(filename));
  if (!audio) throw new Error(`FAIL: missing fake audio for ${filename}`);
  return audio;
}

async function runAudioIntegrationTest(): Promise<void> {
  const originalAudio = Object.getOwnPropertyDescriptor(globalThis, 'Audio');
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalAudioContext = Object.getOwnPropertyDescriptor(globalThis, 'AudioContext');
  const originalWarn = console.warn;
  const warnings: string[] = [];

  try {
    FakeAudio.instances.length = 0;
    FakeAudioContext.instances.length = 0;
    Object.defineProperty(globalThis, 'Audio', {
      configurable: true,
      value: FakeAudio,
    });
    Object.defineProperty(globalThis, 'AudioContext', {
      configurable: true,
      value: FakeAudioContext,
    });
    Object.defineProperty(globalThis, 'window', {
      configurable: true,
      value: { setInterval: (): number => 1 },
    });
    console.warn = (...messages: unknown[]): void => {
      warnings.push(messages.join(' '));
    };

    const manager = new AudioManager();
    manager.init();

    assertEqual(FakeAudio.instances.length, 3, 'init creates all three audio elements');
    for (const audio of FakeAudio.instances) {
      assertEqual(audio.getListenerCount('error'), 1, `one error listener for ${audio.src}`);
    }

    const chantarelle = getFakeAudio('the-chantarelle.mp3');
    const lionsMane1 = getFakeAudio('the-lions-mane-1.mp3');
    chantarelle.dispatch('error');
    chantarelle.dispatch('error');
    lionsMane1.dispatch('error');
    lionsMane1.dispatch('error');

    assertEqual(warnings.length, 2, 'duplicate warnings are suppressed per track');
    assertEqual(warnings[0], 'Music unavailable: chantarelle', 'first track warning');
    assertEqual(warnings[1], 'Music unavailable: lions_mane_1', 'second track warning');

    manager.playNormalTrack();
    assertEqual(chantarelle.playCalls, 1, 'normal track starts');
    manager.pause();
    assertEqual(chantarelle.pauseCalls, 1, 'normal track pauses');
    manager.playNormalTrack();
    assertEqual(chantarelle.playCalls, 2, 'same track resumes after pause');

    // Given a trusted music request whose browser play attempt is rejected once
    manager.stop();
    chantarelle.rejectNextPlay = true;
    const callsBeforeRecovery = chantarelle.playCalls;

    // When the failed promise settles and a later trusted unlock retries the request
    manager.playNormalTrack();
    await Promise.resolve();
    await Promise.resolve();
    assertEqual(manager.getCurrentTrack(), null, 'rejected play is not cached as the current track');
    manager.ensureInitialized();
    await Promise.resolve();

    // Then the second attempt succeeds and becomes current
    assertEqual(chantarelle.playCalls, callsBeforeRecovery + 2, 'trusted unlock retries rejected music');
    assertEqual(manager.getCurrentTrack(), MusicTrack.Chantarelle, 'successful retry becomes current');

    manager.ensureInitialized();
    assertEqual(FakeAudioContext.instances.length, 0, 'music initialization does not create a legacy sound context');
    manager.setSoundVolume(0.5);
    const playedCue = manager.processGameEvents([{
      type: 'network_connection_created',
      timestamp: 1,
      position: { x: 10, y: 20 },
      towerId: 2,
      sourceTowerId: 1,
    }]);
    const soundContext = FakeAudioContext.instances[0];
    assertEqual(soundContext?.resumeCalls, 1, 'legacy cue lazily resumes its compatibility context');
    assertEqual(playedCue, true, 'network event plays a sound-channel cue');
    assertEqual(soundContext?.oscillator.startCalls, 1, 'sound cue starts an oscillator');
    assertEqual(soundContext?.oscillator.stopCalls, 1, 'sound cue schedules oscillator stop');
    assertEqual(soundContext?.gain.gain.values[0], 0.04, 'sound cue gain follows sound volume');
    manager.setSoundVolume(0);
    assertEqual(manager.processGameEvents([{ type: 'wave_started', timestamp: 2, waveNumber: 1 }]), false, 'zero sound volume suppresses cues');

    const contextsBeforeFacade = FakeAudioContext.instances.length;
    const browserAudio = new BrowserGameAudio(new AudioManager());
    browserAudio.unlock();
    browserAudio.unlock();
    assertEqual(FakeAudioContext.instances.length, contextsBeforeFacade + 1, 'browser facade owns one semantic sound context');
    const semanticContext = FakeAudioContext.instances.at(-1);
    assertEqual(semanticContext?.resumeCalls, 1, 'repeated unlock reuses the semantic sound context');
    browserAudio.director.update([], GameState.Paused, -1);
    assertEqual(semanticContext?.suspendCalls, 1, 'pause suspends the semantic sound context');
    browserAudio.director.update([], GameState.Playing, 0);
    assertEqual(semanticContext?.resumeCalls, 2, 'resume restarts the semantic sound context');
  } finally {
    console.warn = originalWarn;
    restoreGlobal('Audio', originalAudio);
    restoreGlobal('AudioContext', originalAudioContext);
    restoreGlobal('window', originalWindow);
  }
}

void runAudioIntegrationTest().then(() => console.log('audio manager tests passed'));

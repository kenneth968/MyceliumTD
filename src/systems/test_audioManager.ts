import {
  AudioFailureRegistry,
  AudioManager,
  MusicTrack,
  resolveMusicTrackUrl,
} from './audioManager';

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

function restoreGlobal(
  name: 'Audio' | 'window',
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

function runAudioIntegrationTest(): void {
  const originalAudio = Object.getOwnPropertyDescriptor(globalThis, 'Audio');
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const originalWarn = console.warn;
  const warnings: string[] = [];

  try {
    FakeAudio.instances.length = 0;
    Object.defineProperty(globalThis, 'Audio', {
      configurable: true,
      value: FakeAudio,
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
  } finally {
    console.warn = originalWarn;
    restoreGlobal('Audio', originalAudio);
    restoreGlobal('window', originalWindow);
  }
}

runAudioIntegrationTest();

console.log('audio manager tests passed');

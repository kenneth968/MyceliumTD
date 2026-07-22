import { SoundCue, type SoundCue as SoundCueValue } from './soundCues';

export interface ToneProfile {
  readonly oscillator: OscillatorType;
  readonly startHz: number;
  readonly endHz: number;
  readonly durationMs: number;
  readonly gain: number;
  readonly delayMs: number;
}

export const SOUND_PROFILES = Object.freeze({
  [SoundCue.Place]: [{ oscillator: 'sine', startHz: 180, endHz: 240, durationMs: 90, gain: 0.08, delayMs: 0 }],
  [SoundCue.NetworkBloom]: [
    { oscillator: 'sine', startHz: 260, endHz: 330, durationMs: 180, gain: 0.07, delayMs: 0 },
    { oscillator: 'sine', startHz: 390, endHz: 520, durationMs: 220, gain: 0.06, delayMs: 120 },
  ],
  [SoundCue.Mature]: [{ oscillator: 'triangle', startHz: 180, endHz: 310, durationMs: 240, gain: 0.09, delayMs: 0 }],
  [SoundCue.Evolve]: [{ oscillator: 'sine', startHz: 220, endHz: 660, durationMs: 420, gain: 0.11, delayMs: 0 }],
  [SoundCue.LayerBreak]: [{ oscillator: 'square', startHz: 150, endHz: 90, durationMs: 70, gain: 0.07, delayMs: 0 }],
  [SoundCue.TraitBreak]: [{ oscillator: 'sawtooth', startHz: 320, endHz: 120, durationMs: 120, gain: 0.06, delayMs: 0 }],
  [SoundCue.SeedDetonate]: [{ oscillator: 'triangle', startHz: 120, endHz: 55, durationMs: 210, gain: 0.13, delayMs: 0 }],
  [SoundCue.Leak]: [{ oscillator: 'sawtooth', startHz: 190, endHz: 80, durationMs: 300, gain: 0.10, delayMs: 0 }],
  [SoundCue.WaveComplete]: [{ oscillator: 'sine', startHz: 330, endHz: 495, durationMs: 260, gain: 0.09, delayMs: 0 }],
  [SoundCue.Victory]: [{ oscillator: 'triangle', startHz: 330, endHz: 880, durationMs: 480, gain: 0.12, delayMs: 0 }],
  [SoundCue.Defeat]: [{ oscillator: 'sine', startHz: 220, endHz: 70, durationMs: 480, gain: 0.12, delayMs: 0 }],
} satisfies Record<SoundCueValue, readonly ToneProfile[]>);

export interface SoundFallback {
  setVolume(value: number): void;
  unlock(): void;
  pause(): void;
  resume(): void;
  stop(): void;
  play(cue: SoundCueValue): void;
}

export interface AudioContextLifecycle {
  readonly state: AudioContextState;
  readonly currentTime: number;
  resume(): Promise<void>;
  suspend(): Promise<void>;
}

export interface ScheduledTone {
  schedule(tone: ToneProfile, volume: number, now: number, onEnded: () => void): void;
  cleanup(): void;
}

type ScheduledToneFactory = () => ScheduledTone;

export class SynthAudioRuntime {
  private readonly active = new Set<ScheduledTone>();

  constructor(
    private readonly lifecycle: AudioContextLifecycle,
    private readonly createTone: ScheduledToneFactory,
  ) {}

  get state(): AudioContextState { return this.lifecycle.state; }
  get currentTime(): number { return this.lifecycle.currentTime; }
  resume(): Promise<void> { return this.lifecycle.resume(); }
  suspend(): Promise<void> { return this.lifecycle.suspend(); }

  playTone(tone: ToneProfile, volume: number, now: number): void {
    const scheduled = this.createTone();
    let active = true;
    const retire = (): void => {
      if (!active) return;
      active = false;
      this.active.delete(scheduled);
      scheduled.cleanup();
    };
    this.active.add(scheduled);
    try {
      scheduled.schedule(tone, volume, now, retire);
    } catch (error) {
      try { retire(); } catch {}
      throw error;
    }
  }

  stopAll(): void {
    for (const scheduled of [...this.active]) {
      this.active.delete(scheduled);
      scheduled.cleanup();
    }
  }
}

type SoundRuntime = Pick<
  SynthAudioRuntime,
  'state' | 'currentTime' | 'resume' | 'suspend' | 'playTone' | 'stopAll'
>;
type AudioRuntimeFactory = () => SoundRuntime | null;

class BrowserScheduledTone implements ScheduledTone {
  private cleaned = false;

  constructor(
    private readonly oscillator: OscillatorNode,
    private readonly gain: GainNode,
    private readonly destination: AudioDestinationNode,
  ) {}

  schedule(tone: ToneProfile, volume: number, now: number, onEnded: () => void): void {
    const start = now + tone.delayMs / 1000;
    const end = start + tone.durationMs / 1000;
    this.oscillator.type = tone.oscillator;
    this.oscillator.frequency.setValueAtTime(tone.startHz, start);
    this.oscillator.frequency.exponentialRampToValueAtTime(tone.endHz, end);
    this.gain.gain.setValueAtTime(0.0001, start);
    this.gain.gain.exponentialRampToValueAtTime(tone.gain * volume, start + 0.015);
    this.gain.gain.exponentialRampToValueAtTime(0.0001, end);
    this.oscillator.connect(this.gain);
    this.gain.connect(this.destination);
    this.oscillator.addEventListener('ended', onEnded, { once: true });
    this.oscillator.start(start);
    this.oscillator.stop(end);
  }

  cleanup(): void {
    if (this.cleaned) return;
    this.cleaned = true;
    try { this.oscillator.stop(); } catch {}
    try { this.oscillator.disconnect(); } catch {}
    try { this.gain.disconnect(); } catch {}
  }
}

function createScheduledTone(context: AudioContext): ScheduledTone {
  const oscillator = context.createOscillator();
  try {
    return new BrowserScheduledTone(oscillator, context.createGain(), context.destination);
  } catch (error) {
    try { oscillator.disconnect(); } catch {}
    throw error;
  }
}

function createBrowserAudioRuntime(): SoundRuntime | null {
  const AudioContextConstructor = globalThis.AudioContext;
  if (typeof AudioContextConstructor !== 'function') return null;
  const context = new AudioContextConstructor();
  return new SynthAudioRuntime(context, () => createScheduledTone(context));
}

/** Lazily unlocked Web Audio fallback; owns its AudioContext for the session. */
export class SynthSoundFallback implements SoundFallback {
  private runtime: SoundRuntime | null = null;
  private volume: number;
  private warned = false;

  constructor(volume = 0.5, private readonly createRuntime: AudioRuntimeFactory = createBrowserAudioRuntime) {
    this.volume = volume;
  }

  setVolume(value: number): void { this.volume = Math.max(0, Math.min(1, value)); }

  unlock(): void {
    try {
      this.runtime ??= this.createRuntime();
      if (this.runtime?.state === 'suspended') {
        void this.runtime.resume().catch(error => this.warnOnce(error));
      }
    } catch (error) {
      this.warnOnce(error);
    }
  }

  pause(): void {
    try {
      if (this.runtime?.state === 'running') {
        void this.runtime.suspend().catch(error => this.warnOnce(error));
      }
    } catch (error) {
      this.warnOnce(error);
    }
  }

  resume(): void {
    try {
      if (this.runtime?.state === 'suspended') {
        void this.runtime.resume().catch(error => this.warnOnce(error));
      }
    } catch (error) {
      this.warnOnce(error);
    }
  }

  stop(): void {
    try {
      this.runtime?.stopAll();
    } catch (error) {
      this.warnOnce(error);
    }
  }

  play(cue: SoundCueValue): void {
    if (this.volume === 0) return;
    try {
      this.unlock();
      if (this.runtime === null) return;
      const now = this.runtime.currentTime;
      for (const tone of SOUND_PROFILES[cue]) this.runtime.playTone(tone, this.volume, now);
    } catch (error) {
      this.warnOnce(error);
    }
  }

  private warnOnce(error: unknown): void {
    if (this.warned) return;
    this.warned = true;
    console.warn('Sound effects are unavailable; continuing silently.', error);
  }
}

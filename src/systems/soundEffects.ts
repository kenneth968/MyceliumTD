import { SOUND_ASSET_URLS, SoundCue, type SoundCue as SoundCueValue } from './soundCues';
import { createHtmlAudioVoice, type SoundAssetFactory, type SoundAssetVoice } from './soundAssetVoice';
import { SynthSoundFallback, type SoundFallback } from './synthSoundFallback';

export type { SoundAssetFactory, SoundAssetVoice } from './soundAssetVoice';
export type { SoundFallback } from './synthSoundFallback';

export interface SoundEffectsConfig { readonly volume: number }
type ActiveVoice = Readonly<{
  cue: SoundCueValue;
  retire: () => boolean;
}>;

/** Asset-first semantic SFX channel with cue-local failure isolation and polyphony. */
export class SoundEffects {
  private readonly prototypes = new Map<SoundCueValue, SoundAssetVoice>();
  private readonly failed = new Set<SoundCueValue>();
  private readonly warned = new Set<SoundCueValue>();
  private readonly active = new Map<SoundAssetVoice, ActiveVoice>();
  private volume: number;
  private paused = false;

  constructor(
    config: SoundEffectsConfig = { volume: 0.7 },
    createVoice: SoundAssetFactory = createHtmlAudioVoice,
    private readonly fallback: SoundFallback = new SynthSoundFallback(config.volume),
  ) {
    this.volume = Math.max(0, Math.min(1, config.volume));
    for (const cue of Object.values(SoundCue)) {
      const voice = createVoice(SOUND_ASSET_URLS[cue]);
      voice.onError(() => this.markFailed(cue));
      voice.preload();
      this.prototypes.set(cue, voice);
    }
  }

  /** Sets the session sound-channel volume, clamped to the inclusive 0..1 range. */
  setVolume(value: number): void {
    this.volume = Math.max(0, Math.min(1, value));
    this.fallback.setVolume(this.volume);
    for (const [voice, ownership] of [...this.active]) {
      try {
        voice.setVolume(this.volume);
      } catch (error) {
        this.retireFailedVoice(ownership, error, false);
      }
    }
  }

  getVolume(): number { return this.volume; }
  /** Unlocks Web Audio synchronously from a trusted user input handler. */
  unlock(): void { this.fallback.unlock(); }
  pause(): void {
    this.paused = true;
    this.fallback.pause();
    for (const [voice, ownership] of [...this.active]) {
      try {
        voice.pause();
      } catch (error) {
        this.retireFailedVoice(ownership, error, false);
      }
    }
  }
  resume(): void {
    this.paused = false;
    this.fallback.resume();
    for (const [voice, ownership] of this.active) {
      this.startVoice(voice, ownership);
    }
  }

  /** Starts an independent voice for the cue or its matching synthesis profile. */
  play(cue: SoundCueValue): void {
    if (this.volume === 0 || this.paused) return;
    const prototype = this.failed.has(cue) ? undefined : this.prototypes.get(cue);
    if (prototype === undefined) {
      this.fallback.play(cue);
      return;
    }
    let ownership: ActiveVoice | null = null;
    try {
      const voice = prototype.clone();
      ownership = this.createOwnership(voice, cue);
      this.active.set(voice, ownership);
      voice.setVolume(this.volume);
      voice.reset();
      this.startVoice(voice, ownership);
    } catch (error) {
      ownership?.retire();
      this.markFailed(cue, error);
      this.fallback.play(cue);
    }
  }

  private createOwnership(voice: SoundAssetVoice, cue: SoundCueValue): ActiveVoice {
    let settled = false;
    let removeError = (): void => {};
    let removeEnded = (): void => {};
    const retire = (): boolean => {
      if (settled) return false;
      settled = true;
      removeError();
      removeEnded();
      this.active.delete(voice);
      return true;
    };
    const ownership = Object.freeze({ cue, retire });
    removeError = voice.onError(() => this.retireFailedVoice(ownership, 'media error', true));
    try {
      removeEnded = voice.onEnded(() => retire());
    } catch (error) {
      removeError();
      throw error;
    }
    return ownership;
  }

  private startVoice(voice: SoundAssetVoice, ownership: ActiveVoice): void {
    try {
      void voice.play().catch(error => this.retireFailedVoice(ownership, error, true));
    } catch (error) {
      this.retireFailedVoice(ownership, error, true);
    }
  }

  private retireFailedVoice(ownership: ActiveVoice, error: unknown, playFallback: boolean): void {
    if (!ownership.retire()) return;
    this.markFailed(ownership.cue, error);
    if (playFallback) this.fallback.play(ownership.cue);
  }

  private markFailed(cue: SoundCueValue, error?: unknown): void {
    this.failed.add(cue);
    if (this.warned.has(cue)) return;
    this.warned.add(cue);
    console.warn(`Sound asset unavailable: ${SOUND_ASSET_URLS[cue]}; using synthesis fallback.`, error ?? 'load error');
  }
}

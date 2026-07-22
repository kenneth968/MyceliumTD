import type { GameEvent } from './gameEvents';

export const MusicTrack = Object.freeze({
  Chantarelle: 'chantarelle',
  LionsMane1: 'lions_mane_1',
  LionsMane2: 'lions_mane_2',
} as const);

export type MusicTrack = typeof MusicTrack[keyof typeof MusicTrack];

export interface AudioManagerConfig {
  readonly musicVolume: number;
  readonly soundVolume: number;
  readonly crossfadeDuration: number;
  readonly basePath: string;
}

const DEFAULT_CONFIG = Object.freeze({
  musicVolume: 0.4,
  soundVolume: 0.7,
  crossfadeDuration: 2000,
  basePath: './assets/music',
} satisfies AudioManagerConfig);

const TRACK_FILES = Object.freeze({
  [MusicTrack.Chantarelle]: 'the-chantarelle.mp3',
  [MusicTrack.LionsMane1]: 'the-lions-mane-1.mp3',
  [MusicTrack.LionsMane2]: 'the-lions-mane-2.mp3',
} satisfies Record<MusicTrack, string>);

export function resolveMusicTrackUrl(basePath: string, track: MusicTrack): string {
  return `${basePath.replace(/\/$/, '')}/${TRACK_FILES[track]}`;
}

export class AudioFailureRegistry {
  private readonly failed = new Set<MusicTrack>();
  record(track: MusicTrack): boolean {
    if (this.failed.has(track)) return false;
    this.failed.add(track);
    return true;
  }
}

/** Owns preloaded gameplay music elements, crossfades, and session volume values. */
export class AudioManager {
  private readonly audioElements = new Map<MusicTrack, HTMLAudioElement>();
  private readonly failures = new AudioFailureRegistry();
  private currentTrack: MusicTrack | null = null;
  private fadingTrack: MusicTrack | null = null;
  private crossfadeInterval: number | null = null;
  private initialized = false;
  private muted = false;
  private playbackPaused = false;
  private pendingTrack: MusicTrack | null = null;
  private musicVolume: number;
  private soundVolume: number;
  private readonly crossfadeDuration: number;
  private readonly basePath: string;
  private soundContext: AudioContext | null = null;
  private soundWarned = false;

  constructor(config: Partial<AudioManagerConfig> = {}) {
    const resolved = { ...DEFAULT_CONFIG, ...config };
    this.musicVolume = resolved.musicVolume;
    this.soundVolume = resolved.soundVolume;
    this.crossfadeDuration = resolved.crossfadeDuration;
    this.basePath = resolved.basePath;
  }

  init(): void {
    if (this.initialized) return;
    this.initialized = true;
    for (const track of Object.values(MusicTrack)) {
      const audio = new Audio(resolveMusicTrackUrl(this.basePath, track));
      audio.addEventListener('error', () => {
        if (this.failures.record(track)) console.warn(`Music unavailable: ${track}`);
      });
      audio.loop = true;
      audio.volume = 0;
      audio.preload = 'auto';
      this.audioElements.set(track, audio);
    }
  }

  ensureInitialized(): void {
    if (!this.initialized) this.init();
    const pending = this.pendingTrack;
    this.pendingTrack = null;
    if (pending !== null) this.play(pending);
  }

  play(track: MusicTrack): void {
    if (!this.initialized) {
      this.pendingTrack = track;
      return;
    }
    if (this.currentTrack === track && this.fadingTrack === null) {
      const current = this.audioElements.get(track);
      if (current !== undefined && this.playbackPaused) this.startPlayback(track, current);
      return;
    }
    const incoming = this.audioElements.get(track);
    if (incoming === undefined) return;
    this.clearCrossfade();
    this.stopStaleFade();
    const outgoing = this.getTrackAudio(this.currentTrack);
    this.fadingTrack = this.currentTrack;
    this.currentTrack = track;
    this.pendingTrack = null;
    this.playbackPaused = false;
    incoming.currentTime = 0;
    incoming.volume = 0;
    this.startPlayback(track, incoming);
    this.beginCrossfade(incoming, outgoing);
  }

  playNormalTrack(): void { this.play(MusicTrack.Chantarelle); }
  playBossTrack(): void { this.play(MusicTrack.LionsMane1); }

  stop(): void {
    this.clearCrossfade();
    for (const audio of this.getActiveAudios()) this.stopAudio(audio);
    this.currentTrack = null;
    this.fadingTrack = null;
    this.pendingTrack = null;
    this.playbackPaused = false;
  }

  pause(): void {
    this.playbackPaused = true;
    for (const audio of this.getActiveAudios()) audio.pause();
  }
  resume(): void {
    this.playbackPaused = false;
    for (const audio of this.getActiveAudios()) {
      const track = this.getTrackForAudio(audio);
      if (track !== null) this.startPlayback(track, audio);
    }
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    for (const audio of this.getActiveAudios()) audio.volume = this.muted ? 0 : this.musicVolume;
    return this.muted;
  }

  isMuted(): boolean { return this.muted; }
  setVolume(value: number): void { this.setMusicVolume(value); }
  getVolume(): number { return this.getMusicVolume(); }

  setMusicVolume(value: number): void {
    this.musicVolume = Math.max(0, Math.min(1, value));
    if (!this.muted) for (const audio of this.getActiveAudios()) audio.volume = this.musicVolume;
  }
  getMusicVolume(): number { return this.musicVolume; }
  setSoundVolume(value: number): void { this.soundVolume = Math.max(0, Math.min(1, value)); }
  getSoundVolume(): number { return this.soundVolume; }
  getCurrentTrack(): MusicTrack | null { return this.currentTrack; }

  processGameEvents(events: readonly GameEvent[]): boolean {
    const hasConnection = events.some(event => event.type === 'network_connection_created');
    const hasPlacement = events.some(event => event.type === 'tower_placed');
    const hasWave = events.some(event => event.type === 'wave_started');
    if (!hasConnection && !hasPlacement && !hasWave) return false;
    if (this.soundVolume <= 0) return false;
    try {
      const context = this.getSoundContext();
      if (context === null) return false;
      if (context.state === 'suspended') void context.resume().catch(error => this.warnSoundFailure(error));
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = hasWave ? 'triangle' : 'sine';
      oscillator.frequency.value = hasConnection ? 660 : hasPlacement ? 520 : 420;
      gain.gain.setValueAtTime(this.soundVolume * 0.08, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.12);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.12);
      return true;
    } catch (error) {
      this.warnSoundFailure(error);
      return false;
    }
  }

  private beginCrossfade(incoming: HTMLAudioElement, outgoing: HTMLAudioElement | null): void {
    const target = this.muted ? 0 : this.musicVolume;
    if (outgoing === null || this.crossfadeDuration <= 0) {
      incoming.volume = target;
      if (outgoing !== null) this.stopAudio(outgoing);
      this.fadingTrack = null;
      return;
    }
    let step = 0;
    const steps = 30;
    this.crossfadeInterval = window.setInterval(() => {
      step += 1;
      const progress = step / steps;
      incoming.volume = progress * target;
      outgoing.volume = (1 - progress) * target;
      if (step < steps) return;
      this.clearCrossfade();
      this.stopAudio(outgoing);
      this.fadingTrack = null;
      incoming.volume = target;
    }, this.crossfadeDuration / steps);
  }

  private getTrackAudio(track: MusicTrack | null): HTMLAudioElement | null {
    return track === null ? null : this.audioElements.get(track) ?? null;
  }
  private getActiveAudios(): readonly HTMLAudioElement[] {
    const active = [this.getTrackAudio(this.currentTrack), this.getTrackAudio(this.fadingTrack)];
    return [...new Set(active.filter((audio): audio is HTMLAudioElement => audio !== null))];
  }
  private stopAudio(audio: HTMLAudioElement): void { audio.pause(); audio.currentTime = 0; audio.volume = 0; }
  private clearCrossfade(): void {
    if (this.crossfadeInterval === null) return;
    clearInterval(this.crossfadeInterval);
    this.crossfadeInterval = null;
  }
  private stopStaleFade(): void {
    if (this.fadingTrack === null || this.fadingTrack === this.currentTrack) return;
    const stale = this.getTrackAudio(this.fadingTrack);
    if (stale !== null) this.stopAudio(stale);
    this.fadingTrack = null;
  }
  private startPlayback(track: MusicTrack, audio: HTMLAudioElement): void {
    void audio.play().catch(error => this.handlePlayFailure(track, audio, error));
  }
  private handlePlayFailure(track: MusicTrack, audio: HTMLAudioElement, error: unknown): void {
    this.warnPlayFailure(track, error);
    if (this.getTrackAudio(this.currentTrack) !== audio) return;
    this.clearCrossfade();
    this.stopAudio(audio);
    this.currentTrack = null;
    this.fadingTrack = null;
    this.pendingTrack = track;
    this.playbackPaused = false;
  }
  private getTrackForAudio(audio: HTMLAudioElement): MusicTrack | null {
    for (const [track, candidate] of this.audioElements) {
      if (candidate === audio) return track;
    }
    return null;
  }
  private warnPlayFailure(track: MusicTrack | null, error: unknown): void {
    if (track !== null && this.failures.record(track)) console.warn(`Music unavailable: ${track}`, error);
  }
  private getSoundContext(): AudioContext | null {
    if (this.soundContext !== null) return this.soundContext;
    const AudioContextConstructor = globalThis.AudioContext;
    if (typeof AudioContextConstructor !== 'function') return null;
    this.soundContext = new AudioContextConstructor();
    return this.soundContext;
  }
  private warnSoundFailure(error: unknown): void {
    if (this.soundWarned) return;
    this.soundWarned = true;
    console.warn('Sound effects are unavailable; continuing silently.', error);
  }
}

export function isBossWave(waveIndex: number, totalWaves: number): boolean {
  return totalWaves <= 10 ? waveIndex >= 7 : waveIndex >= Math.floor(totalWaves * 0.7);
}

export function createAudioManager(config?: Partial<AudioManagerConfig>): AudioManager {
  return new AudioManager(config);
}

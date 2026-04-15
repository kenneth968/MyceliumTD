/**
 * Audio Manager for Mycelium TD
 * Handles background music with crossfading between normal and boss tracks.
 *
 * Tracks:
 *   - The Chantarelle: Normal gameplay
 *   - The Lions Mane 1: Boss / high-energy (variant A)
 *   - The Lions Mane 2: Boss / high-energy (variant B)
 */

export enum MusicTrack {
  Chantarelle = 'chantarelle',
  LionsMane1 = 'lions_mane_1',
  LionsMane2 = 'lions_mane_2',
}

export interface AudioManagerConfig {
  musicVolume: number;       // 0-1
  crossfadeDuration: number; // ms
  basePath: string;          // path to music files
}

const DEFAULT_CONFIG: AudioManagerConfig = {
  musicVolume: 0.4,
  crossfadeDuration: 2000,
  basePath: 'assets/music',
};

const TRACK_FILES: Record<MusicTrack, string> = {
  [MusicTrack.Chantarelle]: 'the-chantarelle.mp3',
  [MusicTrack.LionsMane1]: 'the-lions-mane-1.mp3',
  [MusicTrack.LionsMane2]: 'the-lions-mane-2.mp3',
};

export class AudioManager {
  private config: AudioManagerConfig;
  private audioElements: Map<MusicTrack, HTMLAudioElement> = new Map();
  private currentTrack: MusicTrack | null = null;
  private fadingTrack: MusicTrack | null = null;
  private crossfadeInterval: number | null = null;
  private muted: boolean = false;
  private initialized: boolean = false;
  private pendingTrack: MusicTrack | null = null;

  constructor(config: Partial<AudioManagerConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Preload all music tracks. Call once after first user interaction
   * (browsers require a user gesture before playing audio).
   */
  init(): void {
    if (this.initialized) return;
    this.initialized = true;

    for (const track of Object.values(MusicTrack)) {
      const audio = new Audio(`${this.config.basePath}/${TRACK_FILES[track]}`);
      audio.loop = true;
      audio.volume = 0;
      audio.preload = 'auto';
      this.audioElements.set(track, audio);
    }
  }

  private getTrackAudio(track: MusicTrack | null): HTMLAudioElement | null {
    if (!track) {
      return null;
    }
    return this.audioElements.get(track) ?? null;
  }

  private clearCrossfade(): void {
    if (this.crossfadeInterval !== null) {
      clearInterval(this.crossfadeInterval);
      this.crossfadeInterval = null;
    }
  }

  private getActiveAudios(): HTMLAudioElement[] {
    const tracks = [this.currentTrack, this.fadingTrack].filter(
      (track): track is MusicTrack => track !== null
    );
    return Array.from(
      new Set(
        tracks
          .map((track) => this.getTrackAudio(track))
          .filter((audio): audio is HTMLAudioElement => audio !== null)
      )
    );
  }

  private stopAudio(audio: HTMLAudioElement): void {
    audio.pause();
    audio.currentTime = 0;
    audio.volume = 0;
  }

  /** Start or crossfade to a track */
  play(track: MusicTrack): void {
    if (!this.initialized) {
      this.pendingTrack = track;
      return;
    }

    if (this.currentTrack === track && this.fadingTrack === null) return;

    const newAudio = this.audioElements.get(track);
    if (!newAudio) return;

    this.clearCrossfade();
    if (this.fadingTrack && this.fadingTrack !== this.currentTrack) {
      const staleAudio = this.getTrackAudio(this.fadingTrack);
      if (staleAudio) {
        this.stopAudio(staleAudio);
      }
    }
    this.fadingTrack = null;

    if (this.currentTrack === track) {
      newAudio.volume = this.muted ? 0 : this.config.musicVolume;
      return;
    }

    const oldTrack = this.currentTrack;
    const oldAudio = this.getTrackAudio(oldTrack);

    this.currentTrack = track;
    this.fadingTrack = oldTrack;

    // Start the new track
    newAudio.currentTime = 0;
    newAudio.volume = 0;
    newAudio.play().catch(() => {
      // Autoplay blocked — will retry on next user gesture
    });

    const targetVolume = this.muted ? 0 : this.config.musicVolume;
    const steps = 30;
    const stepTime = this.config.crossfadeDuration / steps;
    let step = 0;

    this.crossfadeInterval = window.setInterval(() => {
      step++;
      const progress = step / steps;
      // Ease in/out curve
      const ease = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      newAudio.volume = ease * targetVolume;
      if (oldAudio) {
        oldAudio.volume = (1 - ease) * targetVolume;
      }

      if (step >= steps) {
        if (this.crossfadeInterval !== null) {
          this.clearCrossfade();
        }
        if (oldAudio) {
          this.stopAudio(oldAudio);
        }
        this.fadingTrack = null;
        newAudio.volume = targetVolume;
      }
    }, stepTime);
  }

  /** Pick a random Lions Mane variant */
  playBossTrack(): void {
    const variant = Math.random() < 0.5 ? MusicTrack.LionsMane1 : MusicTrack.LionsMane2;
    this.play(variant);
  }

  /** Play the normal gameplay track */
  playNormalTrack(): void {
    this.play(MusicTrack.Chantarelle);
  }

  /** Stop all active music immediately */
  stop(): void {
    this.clearCrossfade();
    for (const audio of this.getActiveAudios()) {
      this.stopAudio(audio);
    }
    this.currentTrack = null;
    this.fadingTrack = null;
  }

  /** Pause current music (for game pause) */
  pause(): void {
    for (const audio of this.getActiveAudios()) {
      audio.pause();
    }
  }

  /** Resume current music */
  resume(): void {
    for (const audio of this.getActiveAudios()) {
      audio.play().catch(() => {});
    }
  }

  /** Toggle mute */
  toggleMute(): boolean {
    this.muted = !this.muted;
    for (const audio of this.getActiveAudios()) {
      audio.volume = this.muted ? 0 : this.config.musicVolume;
    }
    return this.muted;
  }

  isMuted(): boolean {
    return this.muted;
  }

  setVolume(volume: number): void {
    this.config.musicVolume = Math.max(0, Math.min(1, volume));
    if (!this.muted) {
      for (const audio of this.getActiveAudios()) {
        audio.volume = this.config.musicVolume;
      }
    }
  }

  getVolume(): number {
    return this.config.musicVolume;
  }

  getCurrentTrack(): MusicTrack | null {
    return this.currentTrack;
  }

  /** Call after first user interaction to initialize and play any pending track */
  ensureInitialized(): void {
    if (!this.initialized) {
      this.init();
      if (this.pendingTrack) {
        this.play(this.pendingTrack);
        this.pendingTrack = null;
      }
    }
  }
}

/** Determine if a wave is a "boss" wave that should trigger intense music */
export function isBossWave(waveIndex: number, totalWaves: number): boolean {
  // Last 3 waves are boss/intense, or any wave with boss enemies
  // Wave indices: 7=Armored Assault, 8=Rainbow Rush, 9=Snail Siege (0-indexed)
  if (totalWaves <= 10) {
    return waveIndex >= 7;
  }
  // For maps with more waves, last 30% are intense
  return waveIndex >= Math.floor(totalWaves * 0.7);
}

export function createAudioManager(config?: Partial<AudioManagerConfig>): AudioManager {
  return new AudioManager(config);
}

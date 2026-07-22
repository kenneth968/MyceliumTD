import { AudioManager, MusicTrack, createAudioManager, type MusicTrack as MusicTrackValue } from './audioManager';
import { GameState } from './gameRunner';
import type { GameEvent } from './gameEvents';
import { SoundCue, getSoundCuesForEvent, type SoundCue as SoundCueValue } from './soundCues';
import { SoundEffects } from './soundEffects';

export interface AudioManagerPort {
  play(track: MusicTrackValue): void;
  pause(): void;
  resume(): void;
  stop(): void;
  getCurrentTrack(): MusicTrackValue | null;
}

export interface SoundEffectsPort {
  play(cue: SoundCueValue): void;
  pause(): void;
  resume(): void;
  stop(): void;
}

/** Resolves a zero-based wave index to the exact presentation-plan music band. */
export function getMusicTrackForWave(waveIndex: number): MusicTrackValue | null {
  if (waveIndex < -1) return null;
  if (waveIndex <= 4) return MusicTrack.Chantarelle;
  if (waveIndex <= 8) return MusicTrack.LionsMane1;
  return MusicTrack.LionsMane2;
}

export class GameAudioDirector {
  private previousState: GameState = GameState.Idle;
  private terminalStopped = false;

  constructor(
    private readonly music: AudioManagerPort,
    private readonly effects: SoundEffectsPort,
  ) {}

  /** Applies one frame; `waveIndex` is zero-based and terminal cues route before music stops. */
  update(events: readonly GameEvent[], gameState: GameState, waveIndex: number): void {
    const terminalEvent = events.find(event => event.type === 'victory' || event.type === 'defeat');
    const audibleEvents = terminalEvent === undefined ? events : [terminalEvent];
    for (const event of audibleEvents) {
      for (const cue of getSoundCuesForEvent(event)) this.effects.play(cue);
    }
    if (gameState === GameState.Idle) {
      if (this.previousState !== GameState.Idle || !this.terminalStopped) {
        this.music.stop();
        this.effects.stop();
      }
      this.terminalStopped = true;
      this.previousState = gameState;
      return;
    }
    if (gameState === GameState.Paused) {
      if (this.previousState !== GameState.Paused) {
        this.music.pause();
        this.effects.pause();
      }
      this.previousState = gameState;
      return;
    }
    if (this.previousState === GameState.Paused) {
      this.music.resume();
      this.effects.resume();
    }
    if (gameState === GameState.Victory || gameState === GameState.GameOver) {
      if (!this.terminalStopped) this.music.stop();
      this.terminalStopped = true;
      this.previousState = gameState;
      return;
    }
    this.terminalStopped = false;
    const nextTrack = getMusicTrackForWave(waveIndex);
    if (nextTrack !== null && nextTrack !== this.music.getCurrentTrack()) this.music.play(nextTrack);
    this.previousState = gameState;
  }

  enterMenu(): void {
    this.music.stop();
    this.effects.stop();
    this.terminalStopped = true;
    this.previousState = GameState.Idle;
  }
}

/** Browser-session facade that keeps music and sound preferences independent. */
export class BrowserGameAudio {
  readonly director: GameAudioDirector;
  private readonly effects: SoundEffects;

  constructor(private readonly music: AudioManager = createAudioManager()) {
    this.effects = new SoundEffects({ volume: music.getSoundVolume() });
    this.director = new GameAudioDirector(music, this.effects);
  }

  unlock(): void { this.music.ensureInitialized(); this.effects.unlock(); }
  setMusicVolume(value: number): void { this.music.setMusicVolume(value); }
  getMusicVolume(): number { return this.music.getMusicVolume(); }
  setSoundVolume(value: number): void { this.music.setSoundVolume(value); this.effects.setVolume(value); }
  getSoundVolume(): number { return this.effects.getVolume(); }
  toggleMute(): boolean { return this.music.toggleMute(); }
  isMuted(): boolean { return this.music.isMuted(); }
  enterMenu(): void { this.director.enterMenu(); }
}

export function createGameAudioDirector(): BrowserGameAudio {
  return new BrowserGameAudio();
}

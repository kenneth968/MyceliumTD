/** Cloneable playback boundary used to preserve overlapping cue polyphony. */
export interface SoundAssetVoice {
  setVolume(value: number): void;
  reset(): void;
  play(): Promise<void>;
  pause(): void;
  clone(): SoundAssetVoice;
  preload(): void;
  onError(listener: () => void): () => void;
  onEnded(listener: () => void): () => void;
}

export class HtmlAudioVoice implements SoundAssetVoice {
  constructor(private readonly audio: HTMLAudioElement) {}

  setVolume(value: number): void { this.audio.volume = value; }
  reset(): void { this.audio.currentTime = 0; }
  play(): Promise<void> { return this.audio.play(); }
  pause(): void { this.audio.pause(); }
  clone(): SoundAssetVoice {
    const clone = new Audio(this.audio.currentSrc || this.audio.src);
    clone.preload = 'auto';
    return new HtmlAudioVoice(clone);
  }
  preload(): void {
    this.audio.preload = 'auto';
  }
  onError(listener: () => void): () => void {
    this.audio.addEventListener('error', listener, { once: true });
    return () => this.audio.removeEventListener('error', listener);
  }
  onEnded(listener: () => void): () => void {
    this.audio.addEventListener('ended', listener, { once: true });
    return () => this.audio.removeEventListener('ended', listener);
  }
}

export type SoundAssetFactory = (url: string) => SoundAssetVoice;

export function createHtmlAudioVoice(url: string): SoundAssetVoice {
  return new HtmlAudioVoice(new Audio(url));
}

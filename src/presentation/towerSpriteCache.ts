/** Lifecycle state for one cached atlas URL. */
export type TowerSpriteLoadState = 'loading' | 'ready' | 'error';

/** Adapter used to start and observe one image request. */
export interface TowerSpriteLoadHandle {
  readonly source: CanvasImageSource | null;
  start(
    url: string,
    onLoad: () => void,
    onError: () => void,
  ): void;
}

/** Creates an image-load adapter, injectable for deterministic tests. */
export type TowerSpriteLoadHandleFactory = () => TowerSpriteLoadHandle;

interface TowerSpriteCacheEntry {
  readonly handle: TowerSpriteLoadHandle;
  state: TowerSpriteLoadState;
}

function createBrowserImageHandle(): TowerSpriteLoadHandle {
  const image = new Image();
  return {
    source: image,
    start(url, onLoad, onError) {
      image.onload = onLoad;
      image.onerror = onError;
      image.src = url;
    },
  };
}

/** Lazily loads each atlas URL once and exposes ready images to painters. */
export class TowerSpriteImageCache {
  private readonly entries = new Map<string, TowerSpriteCacheEntry>();
  private readonly warnedUrls = new Set<string>();

  /** Creates a cache with optional load and warning adapters. */
  constructor(
    private readonly createHandle: TowerSpriteLoadHandleFactory = createBrowserImageHandle,
    private readonly warn: (message: string) => void = message => console.warn(message),
  ) {}

  /** Returns a ready image or null while loading or after failure. */
  get(url: string): CanvasImageSource | null {
    const existing = this.entries.get(url);
    if (existing) {
      return existing.state === 'ready' ? existing.handle.source : null;
    }

    const handle = this.createHandle();
    const entry: TowerSpriteCacheEntry = { handle, state: 'loading' };
    this.entries.set(url, entry);
    handle.start(
      url,
      () => {
        entry.state = 'ready';
      },
      () => {
        entry.state = 'error';
        if (!this.warnedUrls.has(url)) {
          this.warnedUrls.add(url);
          this.warn(`Tower sprite atlas failed to load: ${url}`);
        }
      },
    );
    return null;
  }

  /** Returns the current lifecycle state for a requested URL. */
  getState(url: string): TowerSpriteLoadState | null {
    return this.entries.get(url)?.state ?? null;
  }

  /** Returns the number of unique atlas URLs requested by this cache. */
  getEntryCount(): number {
    return this.entries.size;
  }
}

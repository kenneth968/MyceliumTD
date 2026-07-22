export interface Rect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

interface Point {
  readonly x: number;
  readonly y: number;
}

export type PauseSettingsControl =
  | 'music_volume'
  | 'sound_volume'
  | 'mute'
  | 'speed_normal'
  | 'speed_fast'
  | 'speed_faster';

export type ReleaseHudRegion = 'top_bar' | 'tower_panel' | 'wave_preview' | 'tower_bar';

function freezeRect(rect: Rect): Rect {
  return Object.freeze(rect);
}

const towerCards: readonly Rect[] = Object.freeze(
  Array.from({ length: 6 }, (_, index) => freezeRect({
    x: 16 + index * 156,
    y: 616,
    width: 148,
    height: 88,
  })),
);

const pauseSpeedButtons = Object.freeze([
  freezeRect({ x: 700, y: 530, width: 40, height: 28 }),
  freezeRect({ x: 744, y: 530, width: 40, height: 28 }),
  freezeRect({ x: 788, y: 530, width: 40, height: 28 }),
] as const);

const pauseSettings = Object.freeze({
  musicVolumeBar: freezeRect({ x: 620, y: 466, width: 112, height: 20 }),
  soundVolumeBar: freezeRect({ x: 620, y: 498, width: 112, height: 20 }),
  muteButton: freezeRect({ x: 540, y: 530, width: 90, height: 28 }),
  speedButtons: pauseSpeedButtons,
});

export const RELEASE_HUD_LAYOUT = Object.freeze({
  canvas: freezeRect({ x: 0, y: 0, width: 1280, height: 720 }),
  topBar: freezeRect({ x: 0, y: 0, width: 1280, height: 56 }),
  waveProgress: freezeRect({ x: 1056, y: 8, width: 208, height: 40 }),
  playfield: freezeRect({ x: 0, y: 56, width: 960, height: 544 }),
  towerPanel: freezeRect({ x: 968, y: 72, width: 296, height: 360 }),
  wavePreview: freezeRect({ x: 968, y: 440, width: 296, height: 160 }),
  towerBar: freezeRect({ x: 0, y: 608, width: 1280, height: 112 }),
  startWaveButton: freezeRect({ x: 952, y: 624, width: 312, height: 72 }),
  pausePanel: freezeRect({ x: 440, y: 150, width: 400, height: 420 }),
  pauseSettings,
  towerGrowthLabel: freezeRect({ x: 1137, y: 204, width: 112, height: 16 }),
  towerCards,
});

const RELEASE_CAMERA_ZOOM = 1.2;

export const RELEASE_CAMERA = Object.freeze({
  x: 400 + (RELEASE_HUD_LAYOUT.canvas.width - RELEASE_HUD_LAYOUT.playfield.width) / (2 * RELEASE_CAMERA_ZOOM),
  y: 300,
  zoom: RELEASE_CAMERA_ZOOM,
});

export const RELEASE_WORLD_PLAYFIELD = freezeRect({
  x: (RELEASE_HUD_LAYOUT.playfield.x - RELEASE_HUD_LAYOUT.canvas.width / 2) / RELEASE_CAMERA.zoom
    + RELEASE_CAMERA.x,
  y: (RELEASE_HUD_LAYOUT.playfield.y - RELEASE_HUD_LAYOUT.canvas.height / 2) / RELEASE_CAMERA.zoom
    + RELEASE_CAMERA.y,
  width: RELEASE_HUD_LAYOUT.playfield.width / RELEASE_CAMERA.zoom,
  height: RELEASE_HUD_LAYOUT.playfield.height / RELEASE_CAMERA.zoom,
});

export function rectsOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.width
    && a.x + a.width > b.x
    && a.y < b.y + b.height
    && a.y + a.height > b.y;
}

function rectContainsPoint(rect: Rect, point: Point): boolean {
  return point.x >= rect.x
    && point.x <= rect.x + rect.width
    && point.y >= rect.y
    && point.y <= rect.y + rect.height;
}

export function getReleaseHudRegionAtPosition(x: number, y: number): ReleaseHudRegion | null {
  const point = { x, y };
  if (rectContainsPoint(RELEASE_HUD_LAYOUT.topBar, point)) return 'top_bar';
  if (rectContainsPoint(RELEASE_HUD_LAYOUT.towerPanel, point)) return 'tower_panel';
  if (rectContainsPoint(RELEASE_HUD_LAYOUT.wavePreview, point)) return 'wave_preview';
  if (rectContainsPoint(RELEASE_HUD_LAYOUT.towerBar, point)) return 'tower_bar';
  return null;
}

export function clampPlayfieldLabelX(x: number, halfWidth: number): number {
  const { playfield } = RELEASE_HUD_LAYOUT;
  return Math.max(
    playfield.x + halfWidth,
    Math.min(playfield.x + playfield.width - halfWidth, x),
  );
}

export function clampReleaseWorldLabelX(x: number, halfWidth: number): number {
  const screenX = (x - RELEASE_CAMERA.x) * RELEASE_CAMERA.zoom + RELEASE_HUD_LAYOUT.canvas.width / 2;
  const clampedScreenX = clampPlayfieldLabelX(screenX, halfWidth);
  return (clampedScreenX - RELEASE_HUD_LAYOUT.canvas.width / 2) / RELEASE_CAMERA.zoom + RELEASE_CAMERA.x;
}

export function getPrimaryHotkeyLabel(isMenuVisible: boolean): 'Start Game' | 'Start Wave' {
  return isMenuVisible ? 'Start Game' : 'Start Wave';
}

export type HotkeyBarVisibility = 'visible' | 'obscured';

export function getHotkeyBarVisibility(
  isMenuVisible: boolean,
  gameState: 'idle' | 'playing' | 'paused' | 'game_over' | 'victory',
): HotkeyBarVisibility {
  if (isMenuVisible) return 'visible';
  return gameState === 'paused' || gameState === 'game_over' || gameState === 'victory'
    ? 'obscured'
    : 'visible';
}

export function getPauseSettingsControlAtPosition(x: number, y: number): PauseSettingsControl | null {
  const point = { x, y };
  const { musicVolumeBar, soundVolumeBar, muteButton, speedButtons } = RELEASE_HUD_LAYOUT.pauseSettings;
  if (rectContainsPoint(musicVolumeBar, point)) return 'music_volume';
  if (rectContainsPoint(soundVolumeBar, point)) return 'sound_volume';
  if (rectContainsPoint(muteButton, point)) return 'mute';
  if (rectContainsPoint(speedButtons[0], point)) return 'speed_normal';
  if (rectContainsPoint(speedButtons[1], point)) return 'speed_fast';
  if (rectContainsPoint(speedButtons[2], point)) return 'speed_faster';
  return null;
}

import type { Vec2 } from '../utils/vec2';
import {
  OnboardingStep,
  getOnboardingPrompt,
  type OnboardingState,
} from './onboarding';
import { MYCELIUM_NETWORK_REACH } from './myceliumNetworkConfig';
import { RELEASE_HUD_LAYOUT, type Rect } from './releaseHudLayout';

export type OnboardingHighlight = Readonly<{
  rect: Rect;
  label: string;
  shape: 'rectangle';
  lineStyle: 'solid';
  color: string;
}>;

export type OnboardingReach = Readonly<{
  center: Readonly<Vec2>;
  radius: number;
  label: string;
  shape: 'circle';
  lineStyle: 'dashed';
  color: string;
}>;

export type OnboardingButton = Readonly<{
  rect: Rect;
  label: string;
  hotkey: string;
}>;

export type OnboardingCompletionNotice = Readonly<{
  rect: Rect;
  label: string;
}>;

export type OnboardingRenderData = Readonly<{
  isVisible: boolean;
  entryProgress: number;
  prompt: string | null;
  promptRect: Rect | null;
  promptPulsing: boolean;
  highlights: readonly OnboardingHighlight[];
  reach: OnboardingReach | null;
  skipButton: OnboardingButton | null;
  replayButton: OnboardingButton | null;
}>;

export type OnboardingRenderContext = Readonly<{
  state: OnboardingState;
  kernelPosition: Readonly<Vec2>;
  firstTowerPosition: Readonly<Vec2> | null;
  promptPulsing: boolean;
  entryProgress?: number;
}>;

export type OnboardingReachProjection = Readonly<{
  center: Readonly<Vec2>;
  radius: number;
  labelPosition: Readonly<Vec2>;
}>;

export type OnboardingReachProjectionInput = Readonly<{
  reach: OnboardingReach;
  worldToScreen: (point: Readonly<Vec2>) => Readonly<Vec2>;
  zoom: number;
  visibleBounds: Rect;
  blockedRects: readonly Rect[];
  labelSize: Readonly<Vec2>;
}>;

export interface OnboardingReachPainter {
  strokeStyle: CanvasRenderingContext2D['strokeStyle'];
  fillStyle: CanvasRenderingContext2D['fillStyle'];
  lineWidth: number;
  font: string;
  textAlign: CanvasTextAlign;
  textBaseline: CanvasTextBaseline;
  save(): void;
  restore(): void;
  setLineDash(segments: number[]): void;
  beginPath(): void;
  rect(x: number, y: number, width: number, height: number): void;
  clip(): void;
  arc(x: number, y: number, radius: number, startAngle: number, endAngle: number): void;
  stroke(): void;
  fillText(text: string, x: number, y: number): void;
}

function freezeRect(rect: Rect): Rect {
  return Object.freeze(rect);
}

export const ONBOARDING_LAYOUT = Object.freeze({
  prompt: freezeRect({ x: 288, y: 64, width: 656, height: 64 }),
  skipButton: freezeRect({ x: 848, y: 74, width: 80, height: 44 }),
  replayButton: freezeRect({ x: 520, y: 548, width: 240, height: 48 }),
  completionNotice: freezeRect({ x: 352, y: 72, width: 576, height: 44 }),
});

const COMPLETION_NOTICE = Object.freeze({
  rect: ONBOARDING_LAYOUT.completionNotice,
  label: 'Connection created — tutorial complete',
});

const COMPLETION_NOTICE_DURATION_MS = 2200;
const ONBOARDING_ENTRANCE_DURATION_MS = 300;

const SKIP_BUTTON = Object.freeze({
  rect: ONBOARDING_LAYOUT.skipButton,
  label: 'Skip',
  hotkey: 'S',
});

const REPLAY_BUTTON = Object.freeze({
  rect: ONBOARDING_LAYOUT.replayButton,
  label: 'Replay Tutorial',
  hotkey: 'R',
});

export function getOnboardingRenderData(
  context: OnboardingRenderContext,
): OnboardingRenderData {
  const prompt = getOnboardingPrompt(context.state);
  const active = prompt !== null;
  return Object.freeze({
    isVisible: active,
    entryProgress: active ? clamp(context.entryProgress ?? 1, 0, 1) : 1,
    prompt,
    promptRect: active ? ONBOARDING_LAYOUT.prompt : null,
    promptPulsing: active && context.promptPulsing,
    highlights: getHighlights(context.state.step),
    reach: getReach(context),
    skipButton: active ? SKIP_BUTTON : null,
    replayButton: context.state.enabled && context.state.step === OnboardingStep.Complete
      ? REPLAY_BUTTON
      : null,
  });
}

export function getOnboardingEntranceProgress(startedAtMs: number | null, nowMs: number): number {
  if (startedAtMs === null) return 1;
  const linearProgress = clamp(
    (nowMs - startedAtMs) / ONBOARDING_ENTRANCE_DURATION_MS,
    0,
    1,
  );
  return 1 - Math.pow(1 - linearProgress, 3);
}

export function projectOnboardingReach(
  input: OnboardingReachProjectionInput,
): OnboardingReachProjection {
  const center = Object.freeze({ ...input.worldToScreen(input.reach.center) });
  const radius = input.reach.radius * input.zoom;
  const halfLabelWidth = input.labelSize.x / 2;
  const halfLabelHeight = input.labelSize.y / 2;
  const labelX = clamp(
    center.x,
    input.visibleBounds.x + halfLabelWidth,
    input.visibleBounds.x + input.visibleBounds.width - halfLabelWidth,
  );
  const labelCandidates = [
    { x: labelX, y: center.y - radius - 10 },
    { x: labelX, y: center.y + radius + 10 },
  ];
  const labelPosition = labelCandidates.find(candidate =>
    isLabelVisible(candidate, input.labelSize, input.visibleBounds, input.blockedRects)
  ) ?? {
    x: labelX,
    y: clamp(
      labelCandidates[1].y,
      input.visibleBounds.y + halfLabelHeight,
      input.visibleBounds.y + input.visibleBounds.height - halfLabelHeight,
    ),
  };

  return Object.freeze({
    center,
    radius,
    labelPosition: Object.freeze(labelPosition),
  });
}

export function getOnboardingCompletionNotice(
  completedAtMs: number | null,
  nowMs: number,
): OnboardingCompletionNotice | null {
  if (completedAtMs === null || nowMs - completedAtMs >= COMPLETION_NOTICE_DURATION_MS) {
    return null;
  }
  return COMPLETION_NOTICE;
}

export function paintOnboardingReach(
  context: OnboardingReachPainter,
  projection: OnboardingReachProjection,
  reach: OnboardingReach,
  clipRect: Rect,
): void {
  context.setLineDash([9, 7]);
  context.strokeStyle = reach.color;
  context.lineWidth = 3;
  context.save();
  context.beginPath();
  context.rect(clipRect.x, clipRect.y, clipRect.width, clipRect.height);
  context.clip();
  context.beginPath();
  context.arc(
    projection.center.x,
    projection.center.y,
    projection.radius,
    0,
    Math.PI * 2,
  );
  context.stroke();
  context.restore();
  context.setLineDash([]);
  context.fillStyle = '#FFFFFF';
  context.font = 'bold 12px sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(reach.label, projection.labelPosition.x, projection.labelPosition.y);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function isLabelVisible(
  center: Readonly<Vec2>,
  size: Readonly<Vec2>,
  visibleBounds: Rect,
  blockedRects: readonly Rect[],
): boolean {
  const labelRect = {
    x: center.x - size.x / 2,
    y: center.y - size.y / 2,
    width: size.x,
    height: size.y,
  };
  return containsRect(visibleBounds, labelRect)
    && blockedRects.every(blockedRect => !rectsOverlap(labelRect, blockedRect));
}

function containsRect(container: Rect, contained: Rect): boolean {
  return contained.x >= container.x
    && contained.y >= container.y
    && contained.x + contained.width <= container.x + container.width
    && contained.y + contained.height <= container.y + container.height;
}

function rectsOverlap(first: Rect, second: Rect): boolean {
  return first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y;
}

function getHighlights(step: OnboardingStep): readonly OnboardingHighlight[] {
  switch (step) {
    case OnboardingStep.PlaceSporecap:
      return freezeHighlights([
        createHighlight(RELEASE_HUD_LAYOUT.towerCards[5], 'Sporecap card', '#C084FC'),
      ]);
    case OnboardingStep.StartFirstWave:
      return freezeHighlights([
        createHighlight(RELEASE_HUD_LAYOUT.startWaveButton, 'Start Wave', '#4ADE80'),
      ]);
    case OnboardingStep.ReviewThreat:
      return freezeHighlights([
        createHighlight(RELEASE_HUD_LAYOUT.wavePreview, 'Wave 2 preview', '#FFD700'),
      ]);
    case OnboardingStep.CreateConnection:
      return freezeHighlights(
        RELEASE_HUD_LAYOUT.towerCards
          .slice(0, 5)
          .map(rect => createHighlight(rect, 'Connection tower card', '#4ADE80')),
      );
    case OnboardingStep.Disabled:
    case OnboardingStep.ObserveFirstWave:
    case OnboardingStep.Complete:
      return Object.freeze([]);
    default:
      step satisfies never;
      return Object.freeze([]);
  }
}

function getReach(context: OnboardingRenderContext): OnboardingReach | null {
  switch (context.state.step) {
    case OnboardingStep.PlaceSporecap:
      return createReach(
        context.kernelPosition,
        MYCELIUM_NETWORK_REACH.kernel,
        'Kernel connection reach',
      );
    case OnboardingStep.CreateConnection:
      return context.firstTowerPosition === null
        ? null
        : createReach(
            context.firstTowerPosition,
            MYCELIUM_NETWORK_REACH.tower,
            'First tower relay reach',
          );
    case OnboardingStep.Disabled:
    case OnboardingStep.StartFirstWave:
    case OnboardingStep.ObserveFirstWave:
    case OnboardingStep.ReviewThreat:
    case OnboardingStep.Complete:
      return null;
    default:
      context.state.step satisfies never;
      return null;
  }
}

function createHighlight(rect: Rect, label: string, color: string): OnboardingHighlight {
  return Object.freeze({ rect, label, shape: 'rectangle', lineStyle: 'solid', color });
}

function freezeHighlights(
  highlights: readonly OnboardingHighlight[],
): readonly OnboardingHighlight[] {
  return Object.freeze(highlights);
}

function createReach(center: Readonly<Vec2>, radius: number, label: string): OnboardingReach {
  return Object.freeze({
    center: Object.freeze({ ...center }),
    radius,
    label,
    shape: 'circle',
    lineStyle: 'dashed',
    color: '#4ADE80',
  });
}

import type { Vec2 } from '../utils/vec2';
import { clampReleaseWorldLabelX } from '../systems/releaseHudLayout';
import { VISUAL_THEME } from './visualTheme';

export interface EnvironmentPathSource {
  getPoints(): readonly Vec2[];
}

export interface EnvironmentPathSegment {
  readonly from: Readonly<Vec2>;
  readonly to: Readonly<Vec2>;
  readonly width: number;
}

export interface EnvironmentRoot {
  readonly from: Readonly<Vec2>;
  readonly to: Readonly<Vec2>;
  readonly width: number;
  readonly opacity: number;
}

export interface EnvironmentPatch {
  readonly position: Readonly<Vec2>;
  readonly radius: number;
  readonly opacity: number;
}

export interface EnvironmentKernel {
  readonly position: Readonly<Vec2>;
  readonly radius: number;
  readonly pulse: number;
}

export interface EnvironmentEntrance {
  readonly position: Readonly<Vec2>;
  readonly direction: Readonly<Vec2>;
}

export interface EnvironmentPathLabel {
  readonly text: 'START' | 'END';
  readonly position: Readonly<Vec2>;
  readonly color: string;
}

export interface EnvironmentRenderData {
  readonly background: string;
  readonly pathSegments: readonly EnvironmentPathSegment[];
  readonly roots: readonly EnvironmentRoot[];
  readonly mossPatches: readonly EnvironmentPatch[];
  readonly spores: readonly EnvironmentPatch[];
  readonly pathLabels: readonly EnvironmentPathLabel[];
  readonly entrance: EnvironmentEntrance;
  readonly kernel: EnvironmentKernel;
}

function seededUnit(seed: number): number {
  const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return value - Math.floor(value);
}

function getPathSegments(points: readonly Vec2[]): EnvironmentPathSegment[] {
  const segments: EnvironmentPathSegment[] = [];
  for (let index = 0; index < points.length - 1; index += 1) {
    segments.push({
      from: { ...points[index] },
      to: { ...points[index + 1] },
      width: VISUAL_THEME.pathWidth,
    });
  }
  return segments;
}

function getRoots(segments: readonly EnvironmentPathSegment[]): EnvironmentRoot[] {
  const roots: EnvironmentRoot[] = [];
  for (let index = 0; index < segments.length; index += 3) {
    const segment = segments[index];
    const dx = segment.to.x - segment.from.x;
    const dy = segment.to.y - segment.from.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    const midpoint = {
      x: (segment.from.x + segment.to.x) / 2,
      y: (segment.from.y + segment.to.y) / 2,
    };
    const perpendicular = { x: -dy / length, y: dx / length };

    for (const side of [-1, 1] as const) {
      const seed = index * 17 + side * 31;
      const reach = 34 + seededUnit(seed) * 34;
      const along = (seededUnit(seed + 7) - 0.5) * 26;
      roots.push({
        from: midpoint,
        to: {
          x: midpoint.x + perpendicular.x * reach * side + (dx / length) * along,
          y: midpoint.y + perpendicular.y * reach * side + (dy / length) * along,
        },
        width: 1 + seededUnit(seed + 13) * 1.5,
        opacity: 0.12 + seededUnit(seed + 19) * 0.16,
      });
    }
  }
  return roots;
}

function getMossPatches(segments: readonly EnvironmentPathSegment[]): EnvironmentPatch[] {
  return segments
    .filter((_, index) => index % 4 === 1)
    .map((segment, index) => {
      const seed = index * 23 + 5;
      const dx = segment.to.x - segment.from.x;
      const dy = segment.to.y - segment.from.y;
      const length = Math.max(1, Math.hypot(dx, dy));
      const side = index % 2 === 0 ? 1 : -1;
      const offset = 44 + seededUnit(seed) * 40;
      return {
        position: {
          x: (segment.from.x + segment.to.x) / 2 + (-dy / length) * offset * side,
          y: (segment.from.y + segment.to.y) / 2 + (dx / length) * offset * side,
        },
        radius: 12 + seededUnit(seed + 1) * 20,
        opacity: 0.08 + seededUnit(seed + 2) * 0.1,
      };
    });
}

function getSpores(timestamp: number): EnvironmentPatch[] {
  const count = Math.min(30, VISUAL_THEME.maxAmbientSpores);
  const seconds = timestamp / 1000;
  return Array.from({ length: count }, (_, index) => {
    const xSeed = seededUnit(index * 41 + 3);
    const ySeed = seededUnit(index * 41 + 11);
    const phase = seededUnit(index * 41 + 29) * Math.PI * 2;
    return {
      position: {
        x: 24 + xSeed * 912 + Math.sin(seconds * 0.35 + phase) * 5,
        y: 70 + ySeed * 500 + Math.cos(seconds * 0.25 + phase) * 4,
      },
      radius: 0.8 + seededUnit(index * 41 + 17) * 1.8,
      opacity: 0.12 + seededUnit(index * 41 + 23) * 0.22,
    };
  });
}

function getPathLabels(
  segments: readonly EnvironmentPathSegment[],
): readonly EnvironmentPathLabel[] {
  const first = segments[0];
  const last = segments[segments.length - 1];
  if (first === undefined || last === undefined) return [];

  return [
    {
      text: 'START',
      position: {
        x: clampReleaseWorldLabelX(first.from.x, 28),
        y: first.from.y - 20,
      },
      color: VISUAL_THEME.mycelium,
    },
    {
      text: 'END',
      position: {
        x: clampReleaseWorldLabelX(last.to.x, 22),
        y: last.to.y - 20,
      },
      color: VISUAL_THEME.danger,
    },
  ];
}

export function getEnvironmentRenderData(
  pathSource: EnvironmentPathSource,
  kernelPosition: Readonly<Vec2>,
  timestamp: number,
): EnvironmentRenderData {
  const pathSegments = getPathSegments(pathSource.getPoints());
  const firstSegment = pathSegments[0];
  const entrancePosition = firstSegment?.from ?? kernelPosition;
  const entranceDirection = firstSegment === undefined
    ? { x: 1, y: 0 }
    : {
        x: firstSegment.to.x - firstSegment.from.x,
        y: firstSegment.to.y - firstSegment.from.y,
      };

  return {
    background: VISUAL_THEME.background,
    pathSegments,
    roots: getRoots(pathSegments),
    mossPatches: getMossPatches(pathSegments),
    spores: getSpores(timestamp),
    pathLabels: getPathLabels(pathSegments),
    entrance: {
      position: { ...entrancePosition },
      direction: entranceDirection,
    },
    kernel: {
      position: { ...kernelPosition },
      radius: 32,
      pulse: 0.96 + Math.sin(timestamp / 700) * 0.04,
    },
  };
}

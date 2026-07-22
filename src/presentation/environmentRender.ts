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

export interface EnvironmentSpore {
  readonly origin: Readonly<Vec2>;
  readonly phase: number;
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
  readonly spores: readonly EnvironmentSpore[];
  readonly animationTimestamp: number;
  readonly pathLabels: readonly EnvironmentPathLabel[];
  readonly entrance: EnvironmentEntrance;
  readonly kernel: EnvironmentKernel;
}

interface StaticEnvironmentRenderData {
  readonly pathSegments: readonly EnvironmentPathSegment[];
  readonly roots: readonly EnvironmentRoot[];
  readonly mossPatches: readonly EnvironmentPatch[];
  readonly pathLabels: readonly EnvironmentPathLabel[];
  readonly entrance: EnvironmentEntrance | undefined;
}

interface EnvironmentGeometryCache {
  readonly pathSource: EnvironmentPathSource;
  readonly data: StaticEnvironmentRenderData;
}
let geometryCache: EnvironmentGeometryCache | undefined;

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

function getSpores(): readonly EnvironmentSpore[] {
  const count = Math.min(30, VISUAL_THEME.maxAmbientSpores);
  return Object.freeze(Array.from({ length: count }, (_, index) => {
    const phase = seededUnit(index * 41 + 29) * Math.PI * 2;
    return Object.freeze({
      origin: Object.freeze({
        x: 24 + seededUnit(index * 41 + 3) * 912,
        y: 70 + seededUnit(index * 41 + 11) * 500,
      }),
      phase,
      radius: 0.8 + seededUnit(index * 41 + 17) * 1.8,
      opacity: 0.12 + seededUnit(index * 41 + 23) * 0.22,
    });
  }));
}
const AMBIENT_SPORES = getSpores();

export function getEnvironmentSporeX(spore: EnvironmentSpore, timestamp: number): number {
  return spore.origin.x + Math.sin(timestamp / 1000 * 0.35 + spore.phase) * 5;
}

export function getEnvironmentSporeY(spore: EnvironmentSpore, timestamp: number): number {
  return spore.origin.y + Math.cos(timestamp / 1000 * 0.25 + spore.phase) * 4;
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
        y: first.from.y - 34,
      },
      color: VISUAL_THEME.mycelium,
    },
    {
      text: 'END',
      position: {
        x: clampReleaseWorldLabelX(last.to.x, 22),
        y: last.to.y - 44,
      },
      color: VISUAL_THEME.danger,
    },
  ];
}

function getStaticEnvironmentRenderData(
  pathSource: EnvironmentPathSource,
): StaticEnvironmentRenderData {
  if (geometryCache?.pathSource === pathSource) return geometryCache.data;

  const pathSegments = getPathSegments(pathSource.getPoints());
  const firstSegment = pathSegments[0];
  const data: StaticEnvironmentRenderData = {
    pathSegments,
    roots: getRoots(pathSegments),
    mossPatches: getMossPatches(pathSegments),
    pathLabels: getPathLabels(pathSegments),
    entrance: firstSegment === undefined
      ? undefined
      : {
          position: firstSegment.from,
          direction: {
            x: firstSegment.to.x - firstSegment.from.x,
            y: firstSegment.to.y - firstSegment.from.y,
          },
        },
  };
  geometryCache = { pathSource, data };
  return data;
}

export function getEnvironmentRenderData(
  pathSource: EnvironmentPathSource,
  kernelPosition: Readonly<Vec2>,
  timestamp: number,
): EnvironmentRenderData {
  const staticData = getStaticEnvironmentRenderData(pathSource);

  return {
    background: VISUAL_THEME.background,
    pathSegments: staticData.pathSegments,
    roots: staticData.roots,
    mossPatches: staticData.mossPatches,
    spores: AMBIENT_SPORES,
    animationTimestamp: timestamp,
    pathLabels: staticData.pathLabels,
    entrance: staticData.entrance ?? {
      position: { ...kernelPosition },
      direction: { x: 1, y: 0 },
    },
    kernel: {
      position: { ...kernelPosition },
      radius: 32,
      pulse: 0.96 + Math.sin(timestamp / 700) * 0.04,
    },
  };
}

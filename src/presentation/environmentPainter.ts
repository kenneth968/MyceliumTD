import type { EnvironmentRenderData } from './environmentRender';
import { VISUAL_THEME } from './visualTheme';

export const ENVIRONMENT_LAYER_ORDER = Object.freeze([
  'background',
  'roots_moss',
  'path_edge',
  'path_fill',
  'mycelium',
  'landmarks',
] as const);

export interface EnvironmentViewport {
  readonly width: number;
  readonly height: number;
}

interface PathPaintStyle {
  readonly color: string;
  readonly widthOffset: number;
}

const PATH_EDGE_STYLE = Object.freeze({
  color: VISUAL_THEME.pathEdge,
  widthOffset: 12,
});

const PATH_FILL_STYLE = Object.freeze({
  color: VISUAL_THEME.pathBase,
  widthOffset: 0,
});

function paintBackground(
  ctx: CanvasRenderingContext2D,
  data: EnvironmentRenderData,
  viewport: EnvironmentViewport,
): void {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = data.background;
  ctx.fillRect(0, 0, viewport.width, viewport.height);
  ctx.restore();
}

function paintRootsAndMoss(ctx: CanvasRenderingContext2D, data: EnvironmentRenderData): void {
  for (const patch of data.mossPatches) {
    ctx.save();
    ctx.globalAlpha = patch.opacity;
    ctx.fillStyle = VISUAL_THEME.moss;
    ctx.beginPath();
    ctx.ellipse(
      patch.position.x,
      patch.position.y,
      patch.radius * 1.45,
      patch.radius,
      patch.position.x * 0.013,
      0,
      Math.PI * 2,
    );
    ctx.fill();
    ctx.restore();
  }

  for (const root of data.roots) {
    ctx.save();
    ctx.globalAlpha = root.opacity;
    ctx.strokeStyle = VISUAL_THEME.myceliumDormant;
    ctx.lineWidth = root.width;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(root.from.x, root.from.y);
    ctx.lineTo(root.to.x, root.to.y);
    ctx.stroke();
    ctx.restore();
  }

  for (const spore of data.spores) {
    ctx.save();
    ctx.globalAlpha = spore.opacity;
    ctx.fillStyle = VISUAL_THEME.mycelium;
    ctx.beginPath();
    ctx.arc(spore.position.x, spore.position.y, spore.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function paintPath(
  ctx: CanvasRenderingContext2D,
  data: EnvironmentRenderData,
  style: PathPaintStyle,
): void {
  ctx.strokeStyle = style.color;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const segment of data.pathSegments) {
    ctx.lineWidth = segment.width + style.widthOffset;
    ctx.beginPath();
    ctx.moveTo(segment.from.x, segment.from.y);
    ctx.lineTo(segment.to.x, segment.to.y);
    ctx.stroke();
  }
}

function paintMycelium(ctx: CanvasRenderingContext2D, data: EnvironmentRenderData): void {
  ctx.save();
  ctx.globalAlpha = 0.28;
  ctx.strokeStyle = VISUAL_THEME.mycelium;
  ctx.lineWidth = 1.5;
  ctx.lineCap = 'round';
  ctx.setLineDash([2, 14]);
  for (const segment of data.pathSegments) {
    ctx.beginPath();
    ctx.moveTo(segment.from.x, segment.from.y);
    ctx.lineTo(segment.to.x, segment.to.y);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.restore();
}

function paintEntrance(ctx: CanvasRenderingContext2D, data: EnvironmentRenderData): void {
  const { position, direction } = data.entrance;
  const angle = Math.atan2(direction.y, direction.x);

  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.rotate(angle);
  ctx.fillStyle = VISUAL_THEME.backgroundLift;
  ctx.strokeStyle = VISUAL_THEME.pathEdge;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(0, 0, 24, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.strokeStyle = VISUAL_THEME.mycelium;
  ctx.lineWidth = 2;
  for (const offset of [-8, 6] as const) {
    ctx.beginPath();
    ctx.moveTo(offset - 5, -7);
    ctx.lineTo(offset + 2, 0);
    ctx.lineTo(offset - 5, 7);
    ctx.stroke();
  }
  ctx.restore();
}

function paintKernel(ctx: CanvasRenderingContext2D, data: EnvironmentRenderData): void {
  const { position, radius, pulse } = data.kernel;
  ctx.save();
  ctx.translate(position.x, position.y);
  ctx.shadowColor = VISUAL_THEME.mycelium;
  ctx.shadowBlur = 16 * pulse;

  ctx.fillStyle = VISUAL_THEME.backgroundLift;
  ctx.strokeStyle = VISUAL_THEME.kernelMachine;
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.arc(0, 0, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = VISUAL_THEME.kernelCore;
  ctx.strokeStyle = VISUAL_THEME.mycelium;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.52 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = VISUAL_THEME.kernelMachine;
  ctx.lineWidth = 3;
  for (let index = 0; index < 4; index += 1) {
    const angle = index * Math.PI / 2;
    ctx.beginPath();
    ctx.moveTo(Math.cos(angle) * (radius + 2), Math.sin(angle) * (radius + 2));
    ctx.lineTo(Math.cos(angle) * (radius + 10), Math.sin(angle) * (radius + 10));
    ctx.stroke();
  }
  ctx.restore();
}

function assertNever(value: never): never {
  throw new Error(`Unsupported environment layer: ${String(value)}`);
}

export function paintEnvironment(
  ctx: CanvasRenderingContext2D,
  data: EnvironmentRenderData,
  viewport: EnvironmentViewport,
): void {
  for (const layer of ENVIRONMENT_LAYER_ORDER) {
    switch (layer) {
      case 'background':
        paintBackground(ctx, data, viewport);
        break;
      case 'roots_moss':
        paintRootsAndMoss(ctx, data);
        break;
      case 'path_edge':
        paintPath(ctx, data, PATH_EDGE_STYLE);
        break;
      case 'path_fill':
        paintPath(ctx, data, PATH_FILL_STYLE);
        break;
      case 'mycelium':
        paintMycelium(ctx, data);
        break;
      case 'landmarks':
        paintEntrance(ctx, data);
        paintKernel(ctx, data);
        break;
      default:
        assertNever(layer);
    }
  }
}

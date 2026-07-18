import { Vec2, vec2 } from '../utils/vec2';

export interface PathPoint {
  position: Vec2;
  segmentIndex: number;
  t: number;
}

export interface OrganicPathOptions {
  cornerRadius?: number;
  samplesPerCorner?: number;
}

export class Path {
  private points: Vec2[];
  private segmentLengths: number[];
  private totalLength: number;

  constructor(points: Vec2[]) {
    this.points = points;
    this.segmentLengths = [];
    this.totalLength = 0;
    this.computeLengths();
  }

  private computeLengths(): void {
    this.segmentLengths = [];
    this.totalLength = 0;
    for (let i = 0; i < this.points.length - 1; i++) {
      const dx = this.points[i + 1].x - this.points[i].x;
      const dy = this.points[i + 1].y - this.points[i].y;
      const len = Math.sqrt(dx * dx + dy * dy);
      this.segmentLengths.push(len);
      this.totalLength += len;
    }
  }

  getPointAtDistance(distance: number): PathPoint {
    distance = Math.max(0, Math.min(distance, this.totalLength));
    let accumulated = 0;
    for (let i = 0; i < this.segmentLengths.length; i++) {
      if (accumulated + this.segmentLengths[i] >= distance) {
        const t = (distance - accumulated) / this.segmentLengths[i];
        const p1 = this.points[i];
        const p2 = this.points[i + 1];
        return {
          position: {
            x: p1.x + (p2.x - p1.x) * t,
            y: p1.y + (p2.y - p1.y) * t,
          },
          segmentIndex: i,
          t,
        };
      }
      accumulated += this.segmentLengths[i];
    }
    return {
      position: this.points[this.points.length - 1],
      segmentIndex: this.points.length - 2,
      t: 1,
    };
  }

  getPointAtRatio(ratio: number): PathPoint {
    return this.getPointAtDistance(ratio * this.totalLength);
  }

  getTotalLength(): number {
    return this.totalLength;
  }

  getPoints(): Vec2[] {
    return this.points;
  }

  static fromArray(arr: number[]): Path {
    const points: Vec2[] = [];
    for (let i = 0; i < arr.length; i += 2) {
      points.push(vec2(arr[i], arr[i + 1]));
    }
    return new Path(points);
  }
}

export function createDefaultPath(): Path {
  return createOrganicPathFromWaypoints([
    { x: 0, y: 300 },
    { x: 200, y: 300 },
    { x: 200, y: 100 },
    { x: 400, y: 100 },
    { x: 400, y: 500 },
    { x: 600, y: 500 },
    { x: 600, y: 300 },
    { x: 800, y: 300 },
  ]);
}

export function createOrganicPathFromWaypoints(
  waypoints: Vec2[],
  options: OrganicPathOptions = {}
): Path {
  if (waypoints.length < 3) {
    return new Path(waypoints.map(point => ({ ...point })));
  }

  const cornerRadius = options.cornerRadius ?? 48;
  const samplesPerCorner = Math.max(2, Math.floor(options.samplesPerCorner ?? 5));
  const points: Vec2[] = [{ ...waypoints[0] }];

  for (let i = 1; i < waypoints.length - 1; i++) {
    const previous = waypoints[i - 1];
    const corner = waypoints[i];
    const next = waypoints[i + 1];

    const incomingLength = distance(previous, corner);
    const outgoingLength = distance(corner, next);
    const radius = Math.min(cornerRadius, incomingLength / 2, outgoingLength / 2);

    if (radius <= 0 || incomingLength === 0 || outgoingLength === 0) {
      pushPoint(points, corner);
      continue;
    }

    const incoming = {
      x: (corner.x - previous.x) / incomingLength,
      y: (corner.y - previous.y) / incomingLength,
    };
    const outgoing = {
      x: (next.x - corner.x) / outgoingLength,
      y: (next.y - corner.y) / outgoingLength,
    };

    const curveStart = {
      x: corner.x - incoming.x * radius,
      y: corner.y - incoming.y * radius,
    };
    const curveEnd = {
      x: corner.x + outgoing.x * radius,
      y: corner.y + outgoing.y * radius,
    };

    pushPoint(points, curveStart);
    for (let sample = 1; sample <= samplesPerCorner; sample++) {
      const t = sample / samplesPerCorner;
      pushPoint(points, quadraticBezier(curveStart, corner, curveEnd, t));
    }
  }

  pushPoint(points, waypoints[waypoints.length - 1]);
  return new Path(points);
}

function distance(a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function quadraticBezier(start: Vec2, control: Vec2, end: Vec2, t: number): Vec2 {
  const inverse = 1 - t;
  return {
    x: inverse * inverse * start.x + 2 * inverse * t * control.x + t * t * end.x,
    y: inverse * inverse * start.y + 2 * inverse * t * control.y + t * t * end.y,
  };
}

function pushPoint(points: Vec2[], point: Vec2): void {
  const last = points[points.length - 1];
  if (!last || Math.abs(last.x - point.x) > 0.001 || Math.abs(last.y - point.y) > 0.001) {
    points.push({ ...point });
  }
}

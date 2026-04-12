import { Vec2, vec2 } from '../utils/vec2';

export interface PathPoint {
  position: Vec2;
  segmentIndex: number;
  t: number;
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
  return Path.fromArray([
    0, 300,
    200, 300,
    200, 100,
    400, 100,
    400, 500,
    600, 500,
    600, 300,
    800, 300,
  ]);
}
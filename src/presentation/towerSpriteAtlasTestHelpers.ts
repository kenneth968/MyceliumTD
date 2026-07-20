import { inflateSync } from 'node:zlib';
import { CELL_SIZE } from './towerSpriteAtlas';

export interface DecodedRgba {
  readonly width: number;
  readonly height: number;
  readonly values: Uint8Array;
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message}; expected ${String(expected)}, got ${String(actual)}`);
  }
}

function paethPredictor(left: number, above: number, upperLeft: number): number {
  const estimate = left + above - upperLeft;
  const leftDistance = Math.abs(estimate - left);
  const aboveDistance = Math.abs(estimate - above);
  const upperLeftDistance = Math.abs(estimate - upperLeft);
  if (leftDistance <= aboveDistance && leftDistance <= upperLeftDistance) return left;
  if (aboveDistance <= upperLeftDistance) return above;
  return upperLeft;
}

export function decodeRgba(png: Buffer): DecodedRgba {
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  assertEqual(png[24], 8, 'PNG uses eight-bit channels');
  assertEqual(png[25], 6, 'PNG uses RGBA colour type');
  const idatChunks: Buffer[] = [];
  let offset = 8;
  while (offset < png.length) {
    const length = png.readUInt32BE(offset);
    const type = png.toString('ascii', offset + 4, offset + 8);
    if (type === 'IDAT') {
      idatChunks.push(png.subarray(offset + 8, offset + 8 + length));
    }
    offset += length + 12;
    if (type === 'IEND') break;
  }

  const bytesPerPixel = 4;
  const rowSize = width * bytesPerPixel;
  const encoded = inflateSync(Buffer.concat(idatChunks));
  const decoded = new Uint8Array(width * height * bytesPerPixel);
  let sourceOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = encoded[sourceOffset];
    sourceOffset += 1;
    const rowOffset = y * rowSize;
    for (let x = 0; x < rowSize; x += 1) {
      const raw = encoded[sourceOffset + x];
      const left = x >= bytesPerPixel ? decoded[rowOffset + x - bytesPerPixel] : 0;
      const above = y > 0 ? decoded[rowOffset - rowSize + x] : 0;
      const upperLeft = y > 0 && x >= bytesPerPixel
        ? decoded[rowOffset - rowSize + x - bytesPerPixel]
        : 0;
      let prediction = 0;
      if (filter === 1) prediction = left;
      else if (filter === 2) prediction = above;
      else if (filter === 3) prediction = Math.floor((left + above) / 2);
      else if (filter === 4) prediction = paethPredictor(left, above, upperLeft);
      else assertEqual(filter, 0, 'PNG uses a supported row filter');
      decoded[rowOffset + x] = (raw + prediction) & 0xff;
    }
    sourceOffset += rowSize;
  }
  return { width, height, values: decoded };
}

export function getCellMask(image: DecodedRgba, cellIndex: number): Set<number> {
  const startX = (cellIndex % 4) * CELL_SIZE;
  const startY = Math.floor(cellIndex / 4) * CELL_SIZE;
  const mask = new Set<number>();
  let minX = CELL_SIZE;
  let minY = CELL_SIZE;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < CELL_SIZE; y += 1) {
    for (let x = 0; x < CELL_SIZE; x += 1) {
      const alphaOffset = ((startY + y) * image.width + startX + x) * 4 + 3;
      if (image.values[alphaOffset] <= 20) continue;
      mask.add(y * CELL_SIZE + x);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    }
  }
  assert(mask.size > 2_000, `cell ${cellIndex + 1} has a readable occupied sprite`);
  assert(minX >= 18 && minY >= 18 && maxX <= 237 && maxY <= 221, `cell ${cellIndex + 1} stays inside its safe area`);
  return mask;
}

export function countSignificantRegions(mask: Set<number>): number {
  const remaining = new Set(mask);
  let significantRegions = 0;
  while (remaining.size > 0) {
    const first = remaining.values().next();
    if (first.done) break;
    const pending = [first.value];
    remaining.delete(first.value);
    let regionSize = 0;
    while (pending.length > 0) {
      const pixel = pending.pop();
      if (pixel === undefined) continue;
      regionSize += 1;
      const x = pixel % CELL_SIZE;
      const y = Math.floor(pixel / CELL_SIZE);
      for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
          const neighbourX = x + offsetX;
          const neighbourY = y + offsetY;
          if (
            (offsetX === 0 && offsetY === 0)
            || neighbourX < 0
            || neighbourX >= CELL_SIZE
            || neighbourY < 0
            || neighbourY >= CELL_SIZE
          ) continue;
          const neighbour = neighbourY * CELL_SIZE + neighbourX;
          if (remaining.delete(neighbour)) pending.push(neighbour);
        }
      }
    }
    if (regionSize > 100) significantRegions += 1;
  }
  return significantRegions;
}

export function getVisibleCellHash(image: DecodedRgba, cellIndex: number): number {
  const startX = (cellIndex % 4) * CELL_SIZE;
  const startY = Math.floor(cellIndex / 4) * CELL_SIZE;
  let hash = 0x811c9dc5;
  for (let y = 0; y < CELL_SIZE; y += 1) {
    for (let x = 0; x < CELL_SIZE; x += 1) {
      const offset = ((startY + y) * image.width + startX + x) * 4;
      if (image.values[offset + 3] <= 20) continue;
      hash = Math.imul(hash ^ x, 0x01000193);
      hash = Math.imul(hash ^ y, 0x01000193);
      for (let channel = 0; channel < 4; channel += 1) {
        hash = Math.imul(hash ^ image.values[offset + channel], 0x01000193);
      }
    }
  }
  return hash >>> 0;
}

export function intersectionOverUnion(firstMask: Set<number>, secondMask: Set<number>): number {
  let intersection = 0;
  for (const pixel of firstMask) {
    if (secondMask.has(pixel)) intersection += 1;
  }
  return intersection / (firstMask.size + secondMask.size - intersection);
}

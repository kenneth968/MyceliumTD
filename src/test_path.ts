import { Path, createDefaultPath, createOrganicPathFromWaypoints } from './systems/path';
import { vec2Distance } from './utils/vec2';

const path = createDefaultPath();
console.log('Path created with', path.getPoints().length, 'points');
console.log('Total length:', path.getTotalLength());

const pt1 = path.getPointAtRatio(0);
console.log('Start point:', pt1.position);

const pt2 = path.getPointAtRatio(0.5);
console.log('Mid point:', pt2.position);

const pt3 = path.getPointAtRatio(1);
console.log('End point:', pt3.position);

const dist = vec2Distance(pt1.position, pt3.position);
console.log('Straight-line distance start to end:', dist);
console.log('Path length:', path.getTotalLength());
console.log('Path sanity check:', path.getTotalLength() > dist ? 'PASS' : 'FAIL');

const ptQuarter = path.getPointAtDistance(path.getTotalLength() * 0.25);
console.log('25% point:', ptQuarter.position);

const ptThreeQuarter = path.getPointAtDistance(path.getTotalLength() * 0.75);
console.log('75% point:', ptThreeQuarter.position);

const organic = createOrganicPathFromWaypoints([
  { x: 0, y: 300 },
  { x: 200, y: 300 },
  { x: 200, y: 100 },
  { x: 400, y: 100 },
], { samplesPerCorner: 6, cornerRadius: 60 });
const organicPoints = organic.getPoints();
if (organicPoints.length <= 4) {
  throw new Error('Organic path should add sampled curve points between waypoints');
}
if (organicPoints[0].x !== 0 || organicPoints[0].y !== 300) {
  throw new Error('Organic path should preserve start point');
}
const lastOrganicPoint = organicPoints[organicPoints.length - 1];
if (lastOrganicPoint.x !== 400 || lastOrganicPoint.y !== 100) {
  throw new Error('Organic path should preserve end point');
}
const hasDiagonalSample = organicPoints.some((point, index) => {
  if (index === 0) return false;
  const previous = organicPoints[index - 1];
  return point.x !== previous.x && point.y !== previous.y;
});
if (!hasDiagonalSample) {
  throw new Error('Organic path should contain non-orthogonal sampled curve segments');
}
console.log('Organic path points:', organicPoints.length);

console.log('\n--- All tests passed ---');

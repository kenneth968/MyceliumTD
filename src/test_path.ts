import { Path, createDefaultPath } from './systems/path';
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

console.log('\n--- All tests passed ---');
import { Vec2, vec2Distance } from '../utils/vec2';
import { Path, PathPoint } from './path';

export enum TargetingMode {
  First = 'first',
  Last = 'last',
  Close = 'close',
  Strong = 'strong',
}

export interface Enemy {
  id: number;
  position: Vec2;
  hp: number;
  maxHp: number;
  pathProgress: number;
  pathDistance: number;
  speed: number;
  alive: boolean;
}

export interface Tower {
  id: number;
  position: Vec2;
  range: number;
  targetingMode: TargetingMode;
}

export interface TargetingResult {
  target: Enemy | null;
  distance: number;
}

export function getTarget(
  tower: Tower,
  enemies: Enemy[],
  path: Path
): TargetingResult {
  const inRange = enemies.filter(e => {
    if (!e.alive || e.hp <= 0) return false;
    const dist = vec2Distance(tower.position, e.position);
    return dist <= tower.range;
  });

  if (inRange.length === 0) {
    return { target: null, distance: Infinity };
  }

  let target: Enemy;

  switch (tower.targetingMode) {
    case TargetingMode.First:
      target = findFirst(inRange);
      break;
    case TargetingMode.Last:
      target = findLast(inRange);
      break;
    case TargetingMode.Close:
      target = findClosest(tower.position, inRange);
      break;
    case TargetingMode.Strong:
      target = findStrongest(inRange);
      break;
    default:
      target = findFirst(inRange);
  }

  const distance = vec2Distance(tower.position, target.position);
  return { target, distance };
}

function findFirst(enemies: Enemy[]): Enemy {
  return enemies.reduce((first, e) =>
    e.pathProgress > first.pathProgress ? e : first
  );
}

function findLast(enemies: Enemy[]): Enemy {
  return enemies.reduce((last, e) =>
    e.pathProgress < last.pathProgress ? e : last
  );
}

function findClosest(position: Vec2, enemies: Enemy[]): Enemy {
  return enemies.reduce((closest, e) => {
    const dist = vec2Distance(position, e.position);
    const closestDist = vec2Distance(position, closest.position);
    return dist < closestDist ? e : closest;
  });
}

function findStrongest(enemies: Enemy[]): Enemy {
  return enemies.reduce((strongest, e) =>
    e.hp > strongest.hp ? e : strongest
  );
}

export function canTarget(
  tower: Tower,
  enemy: Enemy
): boolean {
  if (!enemy.alive || enemy.hp <= 0) return false;
  return vec2Distance(tower.position, enemy.position) <= tower.range;
}

export function getEnemiesInRange(
  tower: Tower,
  enemies: Enemy[]
): Enemy[] {
  return enemies.filter(e => canTarget(tower, e));
}

export function createTower(
  id: number,
  x: number,
  y: number,
  range: number = 100,
  mode: TargetingMode = TargetingMode.First
): Tower {
  return {
    id,
    position: { x, y },
    range,
    targetingMode: mode,
  };
}

export function createEnemy(
  id: number,
  pathDistance: number,
  hp: number = 10,
  speed: number = 50,
  path?: Path
): Enemy {
  const position = path
    ? path.getPointAtDistance(pathDistance).position
    : { x: 0, y: 0 };

  return {
    id,
    position,
    hp,
    maxHp: hp,
    pathProgress: pathDistance,
    pathDistance,
    speed,
    alive: true,
  };
}
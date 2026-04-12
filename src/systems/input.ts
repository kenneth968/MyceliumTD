import { Path } from './path';
import { TowerType, TOWER_STATS } from '../entities/tower';
import { PlacedTower } from './gameRunner';
import { vec2Distance, Vec2 } from '../utils/vec2';
import { TargetingMode } from './targeting';
import { TargetingModeButton, getTargetingModeButtons, getTargetingModeAtPosition, getSellButtonAtPosition } from './placementPreview';

export enum PlacementMode {
  None = 'none',
  Placing = 'placing',
  Selecting = 'selecting',
}

export interface PlacementValidation {
  canPlace: boolean;
  reason?: string;
}

export interface RangePreview {
  position: Vec2;
  radius: number;
  isValid: boolean;
}

export interface PathPreview {
  segments: PathSegmentPreview[];
  totalPathLength: number;
  coveredLength: number;
}

export interface PathSegmentPreview {
  start: Vec2;
  end: Vec2;
  startDistance: number;
  endDistance: number;
  isCovered: boolean;
}

export interface TowerPlacerConfig {
  path: Path;
  placedTowers: PlacedTower[];
  minDistanceFromPath?: number;
  minDistanceFromTower?: number;
}

export class TowerPlacer {
  private mode: PlacementMode;
  private selectedTowerType: TowerType | null;
  private placementPosition: Vec2 | null;
  private config: TowerPlacerConfig;
  private minDistanceFromPath: number;
  private minDistanceFromTower: number;
  private selectedTargetingMode: TargetingMode;
  private selectedTowerId: number | null;

  constructor(config: TowerPlacerConfig) {
    this.config = config;
    this.mode = PlacementMode.None;
    this.selectedTowerType = null;
    this.placementPosition = null;
    this.minDistanceFromPath = config.minDistanceFromPath ?? 30;
    this.minDistanceFromTower = config.minDistanceFromTower ?? 40;
    this.selectedTargetingMode = TargetingMode.First;
    this.selectedTowerId = null;
  }

  getMode(): PlacementMode {
    return this.mode;
  }

  getSelectedTowerType(): TowerType | null {
    return this.selectedTowerType;
  }

  getPlacementPosition(): Vec2 | null {
    return this.placementPosition;
  }

  startPlacement(towerType: TowerType): boolean {
    if (this.mode !== PlacementMode.None) {
      return false;
    }
    this.selectedTowerType = towerType;
    this.mode = PlacementMode.Placing;
    this.placementPosition = null;
    this.selectedTargetingMode = TargetingMode.First;
    return true;
  }

  cancelPlacement(): void {
    this.mode = PlacementMode.None;
    this.selectedTowerType = null;
    this.placementPosition = null;
    this.selectedTargetingMode = TargetingMode.First;
  }

  updatePlacementPosition(x: number, y: number): void {
    if (this.mode !== PlacementMode.Placing) {
      return;
    }
    this.placementPosition = { x, y };
  }

  confirmPlacement(): TowerType | null {
    if (this.mode !== PlacementMode.Placing || !this.placementPosition || !this.selectedTowerType) {
      this.cancelPlacement();
      return null;
    }

    const validation = this.validatePlacement(this.placementPosition.x, this.placementPosition.y, this.selectedTowerType);
    if (!validation.canPlace) {
      return null;
    }

    const towerType = this.selectedTowerType;
    this.cancelPlacement();
    return towerType;
  }

  validatePlacement(x: number, y: number, towerType: TowerType): PlacementValidation {
    const cost = TOWER_STATS[towerType].cost;
    if (cost <= 0) {
      return { canPlace: false, reason: 'Invalid tower type' };
    }

    const tooCloseToPath = this.isTooCloseToPath(x, y, towerType);
    if (tooCloseToPath) {
      return { canPlace: false, reason: 'Too close to path' };
    }

    const tooCloseToTower = this.isTooCloseToTower(x, y);
    if (tooCloseToTower) {
      return { canPlace: false, reason: 'Too close to another tower' };
    }

    const range = TOWER_STATS[towerType].range;
    if (this.blocksPath(x, y, range)) {
      return { canPlace: false, reason: 'Tower would block the path' };
    }

    return { canPlace: true };
  }

  private isTooCloseToPath(x: number, y: number, towerType: TowerType): boolean {
    const range = TOWER_STATS[towerType].range;
    const checkDistance = Math.max(range * 0.3, this.minDistanceFromPath);

    for (let d = 0; d <= this.config.path.getTotalLength(); d += 10) {
      const point = this.config.path.getPointAtDistance(d);
      const dist = vec2Distance({ x, y }, point.position);
      if (dist < checkDistance) {
        return true;
      }
    }
    return false;
  }

  private isTooCloseToTower(x: number, y: number): boolean {
    for (const placed of this.config.placedTowers) {
      const dist = vec2Distance({ x, y }, { x: placed.x, y: placed.y });
      if (dist < this.minDistanceFromTower) {
        return true;
      }
    }
    return false;
  }

  private blocksPath(x: number, y: number, range: number): boolean {
    const pathPoints = this.config.path.getPoints();
    for (let i = 0; i < pathPoints.length - 1; i++) {
      const p1 = pathPoints[i];
      const p2 = pathPoints[i + 1];
      const dist = this.pointToSegmentDistance(x, y, p1.x, p1.y, p2.x, p2.y);
      if (dist < range * 0.5) {
        return true;
      }
    }
    return false;
  }

  private pointToSegmentDistance(px: number, py: number, x1: number, y1: number, x2: number, y2: number): number {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSq = dx * dx + dy * dy;

    if (lengthSq === 0) {
      return vec2Distance({ x: px, y: py }, { x: x1, y: y1 });
    }

    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;

    return vec2Distance({ x: px, y: py }, { x: closestX, y: closestY });
  }

  selectTower(towerId: number): boolean {
    if (this.mode !== PlacementMode.None) {
      return false;
    }
    const found = this.config.placedTowers.some(pt => pt.tower.id === towerId);
    if (found) {
      this.mode = PlacementMode.Selecting;
      this.selectedTowerId = towerId;
      return true;
    }
    return false;
  }

  deselectTower(): void {
    if (this.mode === PlacementMode.Selecting) {
      this.mode = PlacementMode.None;
      this.selectedTowerId = null;
    }
  }

  getSelectedTowerId(): number | null {
    return this.selectedTowerId;
  }

  isSelecting(): boolean {
    return this.mode === PlacementMode.Selecting;
  }

  isPlacing(): boolean {
    return this.mode === PlacementMode.Placing;
  }

  getRangeForSelectedTower(): number | null {
    if (this.selectedTowerType) {
      return TOWER_STATS[this.selectedTowerType].range;
    }
    return null;
  }

  getSelectedTargetingMode(): TargetingMode {
    return this.selectedTargetingMode;
  }

  setTargetingMode(mode: TargetingMode): void {
    if (this.mode === PlacementMode.Placing) {
      this.selectedTargetingMode = mode;
    }
  }

  getTargetingModeButtons(): TargetingModeButton[] {
    if (this.mode !== PlacementMode.Placing || !this.placementPosition) {
      return [];
    }
    return getTargetingModeButtons(this.selectedTargetingMode, this.placementPosition);
  }

  selectTargetingModeAtPosition(x: number, y: number): boolean {
    if (this.mode !== PlacementMode.Placing || !this.placementPosition) {
      return false;
    }
    const buttons = getTargetingModeButtons(this.selectedTargetingMode, this.placementPosition);
    const mode = getTargetingModeAtPosition(buttons, x, y);
    if (mode !== null) {
      this.selectedTargetingMode = mode;
      return true;
    }
    return false;
  }

  getSelectedTowerPosition(): Vec2 | null {
    if (this.mode !== PlacementMode.Selecting || this.selectedTowerId === null) {
      return null;
    }
    const placed = this.config.placedTowers.find(pt => pt.tower.id === this.selectedTowerId);
    if (placed) {
      return { x: placed.x, y: placed.y };
    }
    return null;
  }

  getSellButtonForSelectedTower(): { position: Vec2; size: { width: number; height: number } } | null {
    if (this.mode !== PlacementMode.Selecting) {
      return null;
    }
    const position = this.getSelectedTowerPosition();
    if (!position) {
      return null;
    }
    const buttonPos = {
      x: position.x + 40,
      y: position.y - 60,
    };
    return {
      position: buttonPos,
      size: { width: 80, height: 36 },
    };
  }

  isSellButtonAtPosition(x: number, y: number): boolean {
    const button = this.getSellButtonForSelectedTower();
    if (!button) {
      return false;
    }
    return (
      x >= button.position.x &&
      x <= button.position.x + button.size.width &&
      y >= button.position.y &&
      y <= button.position.y + button.size.height
    );
  }

  getRangePreview(): RangePreview | null {
    if (this.mode !== PlacementMode.Placing || !this.selectedTowerType || !this.placementPosition) {
      return null;
    }

    const range = TOWER_STATS[this.selectedTowerType].range;
    const validation = this.validatePlacement(
      this.placementPosition.x,
      this.placementPosition.y,
      this.selectedTowerType
    );

    return {
      position: { ...this.placementPosition },
      radius: range,
      isValid: validation.canPlace,
    };
  }

  getPathPreview(): PathPreview | null {
    if (this.mode !== PlacementMode.Placing || !this.selectedTowerType || !this.placementPosition) {
      return null;
    }

    const range = TOWER_STATS[this.selectedTowerType].range;
    const { x: px, y: py } = this.placementPosition;
    const pathPoints = this.config.path.getPoints();
    const segments: PathSegmentPreview[] = [];
    let coveredLength = 0;
    let accumulatedDistance = 0;

    for (let i = 0; i < pathPoints.length - 1; i++) {
      const p1 = pathPoints[i];
      const p2 = pathPoints[i + 1];
      const dx = p2.x - p1.x;
      const dy = p2.y - p1.y;
      const segLen = Math.sqrt(dx * dx + dy * dy);
      const endDistance = accumulatedDistance + segLen;

      const distToCenter = this.pointToSegmentDistance(px, py, p1.x, p1.y, p2.x, p2.y);
      const isCovered = distToCenter <= range;

      if (isCovered) {
        coveredLength += segLen;
      }

      segments.push({
        start: { ...p1 },
        end: { ...p2 },
        startDistance: accumulatedDistance,
        endDistance,
        isCovered,
      });

      accumulatedDistance = endDistance;
    }

    return {
      segments,
      totalPathLength: this.config.path.getTotalLength(),
      coveredLength,
    };
  }
}

export function createTowerPlacer(config: TowerPlacerConfig): TowerPlacer {
  return new TowerPlacer(config);
}
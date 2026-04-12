import { Vec2 } from '../utils/vec2';
import { Path, PathPoint } from './path';
import { TowerType } from '../entities/tower';

export enum MapDifficulty {
  Easy = 'easy',
  Medium = 'medium',
  Hard = 'hard',
  Expert = 'expert',
}

export enum MapTheme {
  Forest = 'forest',
  Cave = 'cave',
  Garden = 'garden',
  Swamp = 'swamp',
  Mountain = 'mountain',
}

export interface MapConfig {
  id: string;
  name: string;
  difficulty: MapDifficulty;
  theme: MapTheme;
  pathPoints: number[];
  startingMoneyModifier: number;
  startingLivesModifier: number;
  maxWaves: number;
  availableTowers: TowerType[];
  unlockRequirement?: string;
}

export interface MapInfo {
  id: string;
  name: string;
  difficulty: MapDifficulty;
  theme: MapTheme;
  path: Path;
  pathPoints: Vec2[];
  totalLength: number;
  startingMoneyModifier: number;
  startingLivesModifier: number;
  maxWaves: number;
  availableTowers: TowerType[];
  unlockRequirement?: string;
  getPointAtDistance(distance: number): PathPoint;
  getPointAtRatio(ratio: number): PathPoint;
  getTotalLength(): number;
  getPoints(): Vec2[];
}

function createMapPath(pathPoints: number[]): Path {
  const points: Vec2[] = [];
  for (let i = 0; i < pathPoints.length; i += 2) {
    points.push({ x: pathPoints[i], y: pathPoints[i + 1] });
  }
  return new Path(points);
}

function createMapInfo(config: MapConfig): MapInfo {
  const path = createMapPath(config.pathPoints);
  const pathPoints: Vec2[] = [];
  for (let i = 0; i < config.pathPoints.length; i += 2) {
    pathPoints.push({ x: config.pathPoints[i], y: config.pathPoints[i + 1] });
  }

  return {
    id: config.id,
    name: config.name,
    difficulty: config.difficulty,
    theme: config.theme,
    path,
    pathPoints,
    totalLength: path.getTotalLength(),
    startingMoneyModifier: config.startingMoneyModifier,
    startingLivesModifier: config.startingLivesModifier,
    maxWaves: config.maxWaves,
    availableTowers: config.availableTowers,
    unlockRequirement: config.unlockRequirement,
    getPointAtDistance(distance: number): PathPoint {
      return path.getPointAtDistance(distance);
    },
    getPointAtRatio(ratio: number): PathPoint {
      return path.getPointAtRatio(ratio);
    },
    getTotalLength(): number {
      return path.getTotalLength();
    },
    getPoints(): Vec2[] {
      return path.getPoints();
    },
  };
}

export const MAP_CONFIGS: MapConfig[] = [
  {
    id: 'garden_path',
    name: 'Garden Path',
    difficulty: MapDifficulty.Easy,
    theme: MapTheme.Garden,
    pathPoints: [
      0, 300,
      200, 300,
      200, 100,
      400, 100,
      400, 500,
      600, 500,
      600, 300,
      800, 300,
    ],
    startingMoneyModifier: 1.0,
    startingLivesModifier: 1.0,
    maxWaves: 10,
    availableTowers: [TowerType.PuffballFungus, TowerType.OrchidTrap, TowerType.BioluminescentShroom],
  },
  {
    id: 'forest_loop',
    name: 'Forest Loop',
    difficulty: MapDifficulty.Easy,
    theme: MapTheme.Forest,
    pathPoints: [
      0, 200,
      150, 200,
      150, 400,
      300, 400,
      300, 150,
      450, 150,
      450, 450,
      600, 450,
      600, 250,
      800, 250,
    ],
    startingMoneyModifier: 1.0,
    startingLivesModifier: 1.0,
    maxWaves: 10,
    availableTowers: [TowerType.PuffballFungus, TowerType.OrchidTrap, TowerType.BioluminescentShroom, TowerType.StinkhornLine],
  },
  {
    id: 'cave蜿蜒',
    name: 'Cave蜿蜒',
    difficulty: MapDifficulty.Medium,
    theme: MapTheme.Cave,
    pathPoints: [
      0, 600,
      100, 600,
      100, 400,
      250, 400,
      250, 200,
      400, 200,
      400, 500,
      550, 500,
      550, 300,
      700, 300,
      700, 100,
      900, 100,
    ],
    startingMoneyModifier: 0.9,
    startingLivesModifier: 0.8,
    maxWaves: 15,
    availableTowers: [TowerType.PuffballFungus, TowerType.OrchidTrap, TowerType.BioluminescentShroom, TowerType.StinkhornLine, TowerType.VenusFlytower],
  },
  {
    id: 'swamp_cross',
    name: 'Swamp Cross',
    difficulty: MapDifficulty.Medium,
    theme: MapTheme.Swamp,
    pathPoints: [
      0, 360,
      200, 360,
      200, 150,
      400, 150,
      400, 360,
      600, 360,
      600, 550,
      800, 550,
      800, 360,
      1000, 360,
    ],
    startingMoneyModifier: 0.85,
    startingLivesModifier: 0.8,
    maxWaves: 15,
    availableTowers: [TowerType.PuffballFungus, TowerType.OrchidTrap, TowerType.BioluminescentShroom, TowerType.StinkhornLine, TowerType.VenusFlytower],
  },
  {
    id: 'mountain_spire',
    name: 'Mountain Spire',
    difficulty: MapDifficulty.Hard,
    theme: MapTheme.Mountain,
    pathPoints: [
      0, 500,
      150, 500,
      150, 300,
      300, 300,
      300, 100,
      500, 100,
      500, 400,
      700, 400,
      700, 200,
      900, 200,
      900, 600,
      1100, 600,
    ],
    startingMoneyModifier: 0.8,
    startingLivesModifier: 0.7,
    maxWaves: 20,
    availableTowers: [TowerType.PuffballFungus, TowerType.OrchidTrap, TowerType.BioluminescentShroom, TowerType.StinkhornLine, TowerType.VenusFlytower],
  },
  {
    id: 'expert_zigzag',
    name: 'Expert Zigzag',
    difficulty: MapDifficulty.Expert,
    theme: MapTheme.Mountain,
    pathPoints: [
      0, 600,
      100, 600,
      100, 100,
      300, 100,
      300, 500,
      500, 500,
      500, 150,
      700, 150,
      700, 550,
      900, 550,
      900, 300,
      1100, 300,
    ],
    startingMoneyModifier: 0.75,
    startingLivesModifier: 0.6,
    maxWaves: 25,
    availableTowers: [TowerType.PuffballFungus, TowerType.OrchidTrap, TowerType.BioluminescentShroom, TowerType.StinkhornLine, TowerType.VenusFlytower],
  },
];

export const MAPS: MapInfo[] = MAP_CONFIGS.map(createMapInfo);

export function getMapById(id: string): MapInfo | undefined {
  return MAPS.find(m => m.id === id);
}

export function getMapsByDifficulty(difficulty: MapDifficulty): MapInfo[] {
  return MAPS.filter(m => m.difficulty === difficulty);
}

export function getMapsByTheme(theme: MapTheme): MapInfo[] {
  return MAPS.filter(m => m.theme === theme);
}

export function getAvailableMaps(): MapInfo[] {
  return MAPS.filter(m => !m.unlockRequirement);
}

export function getMapDifficultyLabel(difficulty: MapDifficulty): string {
  switch (difficulty) {
    case MapDifficulty.Easy: return 'Easy';
    case MapDifficulty.Medium: return 'Medium';
    case MapDifficulty.Hard: return 'Hard';
    case MapDifficulty.Expert: return 'Expert';
  }
}

export function getMapThemeLabel(theme: MapTheme): string {
  switch (theme) {
    case MapTheme.Forest: return 'Forest';
    case MapTheme.Cave: return 'Cave';
    case MapTheme.Garden: return 'Garden';
    case MapTheme.Swamp: return 'Swamp';
    case MapTheme.Mountain: return 'Mountain';
  }
}

export function getMapThemeColor(theme: MapTheme): string {
  switch (theme) {
    case MapTheme.Forest: return '#228B22';
    case MapTheme.Cave: return '#4A4A4A';
    case MapTheme.Garden: return '#90EE90';
    case MapTheme.Swamp: return '#556B2F';
    case MapTheme.Mountain: return '#8B4513';
  }
}

export function getDifficultyColor(difficulty: MapDifficulty): string {
  switch (difficulty) {
    case MapDifficulty.Easy: return '#32CD32';
    case MapDifficulty.Medium: return '#FFD700';
    case MapDifficulty.Hard: return '#FF8C00';
    case MapDifficulty.Expert: return '#DC143C';
  }
}

export interface LevelSelectButton {
  mapId: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  isHovered: boolean;
  isLocked: boolean;
}

export interface LevelSelectRenderData {
  maps: LevelSelectMapData[];
  selectedMapId: string | null;
  hoveredMapId: string | null;
  buttons: LevelSelectButton[];
}

export interface LevelSelectMapData {
  id: string;
  name: string;
  difficulty: MapDifficulty;
  difficultyLabel: string;
  difficultyColor: string;
  theme: MapTheme;
  themeLabel: string;
  themeColor: string;
  pathPoints: Vec2[];
  startingMoneyModifier: number;
  startingLivesModifier: number;
  maxWaves: number;
  availableTowerCount: number;
  isLocked: boolean;
  isUnlocked: boolean;
}

export function getLevelSelectRenderData(
  selectedMapId: string | null,
  hoveredMapId: string | null,
  viewportWidth: number,
  viewportHeight: number
): LevelSelectRenderData {
  const MAP_CARD_WIDTH = 200;
  const MAP_CARD_HEIGHT = 250;
  const MAP_CARD_SPACING = 30;
  const MAPS_PER_ROW = Math.floor((viewportWidth - 60) / (MAP_CARD_WIDTH + MAP_CARD_SPACING));
  const START_X = (viewportWidth - (MAPS_PER_ROW * (MAP_CARD_WIDTH + MAP_CARD_SPACING) - MAP_CARD_SPACING)) / 2;
  const START_Y = 80;

  const buttons: LevelSelectButton[] = [];

  const mapDataList: LevelSelectMapData[] = MAPS.map((map, index) => {
    const row = Math.floor(index / MAPS_PER_ROW);
    const col = index % MAPS_PER_ROW;
    const x = START_X + col * (MAP_CARD_WIDTH + MAP_CARD_SPACING);
    const y = START_Y + row * (MAP_CARD_HEIGHT + MAP_CARD_SPACING);

    buttons.push({
      mapId: map.id,
      position: { x, y },
      size: { width: MAP_CARD_WIDTH, height: MAP_CARD_HEIGHT },
      isHovered: hoveredMapId === map.id,
      isLocked: !!map.unlockRequirement,
    });

    return {
      id: map.id,
      name: map.name,
      difficulty: map.difficulty,
      difficultyLabel: getMapDifficultyLabel(map.difficulty),
      difficultyColor: getDifficultyColor(map.difficulty),
      theme: map.theme,
      themeLabel: getMapThemeLabel(map.theme),
      themeColor: getMapThemeColor(map.theme),
      pathPoints: map.pathPoints,
      startingMoneyModifier: map.startingMoneyModifier,
      startingLivesModifier: map.startingLivesModifier,
      maxWaves: map.maxWaves,
      availableTowerCount: map.availableTowers.length,
      isLocked: !!map.unlockRequirement,
      isUnlocked: !map.unlockRequirement,
    };
  });

  return {
    maps: mapDataList,
    selectedMapId,
    hoveredMapId,
    buttons,
  };
}

export function getMapAtPosition(
  x: number,
  y: number,
  renderData: LevelSelectRenderData
): string | null {
  for (const button of renderData.buttons) {
    if (
      x >= button.position.x &&
      x <= button.position.x + button.size.width &&
      y >= button.position.y &&
      y <= button.position.y + button.size.height
    ) {
      return button.mapId;
    }
  }
  return null;
}

export interface GameMapSelectionState {
  selectedMapId: string | null;
  hoveredMapId: string | null;
  isSelecting: boolean;
}

export function createDefaultMapSelectionState(): GameMapSelectionState {
  return {
    selectedMapId: null,
    hoveredMapId: null,
    isSelecting: false,
  };
}
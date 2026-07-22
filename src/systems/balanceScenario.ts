import { EvolutionPath, TowerStage } from '../content/evolutionDefinitions';
import { EnemyTrait, EnemyType } from '../content/enemyDefinitions';
import { TowerType } from '../entities/tower';
import type { Vec2 } from '../utils/vec2';
import { GameRunner, GameState } from './gameRunner';
import { RELEASE_MAP_ID } from './releaseScope';

export type ScheduledBalanceCommand =
  | Readonly<{ beforeWave: number; kind: 'place'; towerType: TowerType; position: Readonly<Vec2> }>
  | Readonly<{ beforeWave: number; kind: 'mature'; towerIndex: number }>
  | Readonly<{ beforeWave: number; kind: 'evolve'; towerIndex: number; path: EvolutionPath }>;

export interface BalanceScenario {
  readonly id: string;
  readonly decisionMillisecondsPerWave: number;
  readonly commands: readonly ScheduledBalanceCommand[];
}

export interface BalanceResult {
  readonly scenarioId: string;
  readonly terminalState: 'victory' | 'defeat';
  readonly waveReached: number;
  readonly kernelIntegrity: number;
  readonly nutrientsRemaining: number;
  readonly nutrientsSpent: number;
  readonly nutrientsEarned: number;
  readonly minimumNutrientsAfterCommand: number;
  readonly towerCount: number;
  readonly towerTypes: readonly TowerType[];
  readonly matureTowerCount: number;
  readonly evolvedTowerCount: number;
  readonly defeatedEnemyTypes: readonly EnemyType[];
  readonly leakedEnemyCount: number;
  readonly purchasedTowerAfterLeak: boolean;
  /** Swarm enemies with SwarmLinked suppressed or observed linked, controlled, then unlinked. */
  readonly separatedSwarmEnemyCount: number;
  readonly revealedEnemyCount: number;
  readonly bossTraits: readonly EnemyTrait[];
  readonly bossMaximumPathDistance: number;
  readonly bossDefeated: boolean;
  readonly simulatedCombatMilliseconds: number;
  readonly estimatedRunMilliseconds: number;
}

const FIXED_STEP_MS = 50;
const MAX_SIMULATION_MS = 40 * 60 * 1000;
const SIMULATION_EPOCH_MS = 1_000_000;

export const RELEASE_BALANCE_SCENARIOS = Object.freeze({
  precisionNetwork: {
    id: 'precision-network',
    decisionMillisecondsPerWave: 75_000,
    commands: [
      { beforeWave: 1, kind: 'place', towerType: TowerType.Sporecap, position: { x: 680, y: 220 } },
      { beforeWave: 1, kind: 'place', towerType: TowerType.ThornSniper, position: { x: 555, y: 245 } },
      { beforeWave: 3, kind: 'place', towerType: TowerType.LumenOracle, position: { x: 440, y: 220 } },
      { beforeWave: 4, kind: 'mature', towerIndex: 0 },
      { beforeWave: 5, kind: 'mature', towerIndex: 1 },
      { beforeWave: 6, kind: 'evolve', towerIndex: 0, path: EvolutionPath.Predator },
      { beforeWave: 6, kind: 'place', towerType: TowerType.Sporecap, position: { x: 300, y: 220 } },
      { beforeWave: 7, kind: 'mature', towerIndex: 2 },
      { beforeWave: 8, kind: 'evolve', towerIndex: 1, path: EvolutionPath.Specialist },
      { beforeWave: 8, kind: 'place', towerType: TowerType.ThornSniper, position: { x: 640, y: 190 } },
      { beforeWave: 9, kind: 'evolve', towerIndex: 2, path: EvolutionPath.Symbiote },
      { beforeWave: 9, kind: 'place', towerType: TowerType.LumenOracle, position: { x: 500, y: 205 } },
      { beforeWave: 10, kind: 'mature', towerIndex: 4 },
    ],
  },
  controlNetwork: {
    id: 'control-network',
    decisionMillisecondsPerWave: 75_000,
    commands: [
      { beforeWave: 1, kind: 'place', towerType: TowerType.Slimefungus, position: { x: 510, y: 350 } },
      { beforeWave: 2, kind: 'place', towerType: TowerType.Puffball, position: { x: 555, y: 390 } },
      { beforeWave: 3, kind: 'place', towerType: TowerType.BulbShooter, position: { x: 440, y: 385 } },
      { beforeWave: 4, kind: 'mature', towerIndex: 0 },
      { beforeWave: 5, kind: 'mature', towerIndex: 1 },
      { beforeWave: 6, kind: 'evolve', towerIndex: 1, path: EvolutionPath.Specialist },
      { beforeWave: 6, kind: 'place', towerType: TowerType.Slimefungus, position: { x: 680, y: 385 } },
      { beforeWave: 7, kind: 'place', towerType: TowerType.LumenOracle, position: { x: 520, y: 460 } },
      { beforeWave: 7, kind: 'mature', towerIndex: 2 },
      { beforeWave: 8, kind: 'evolve', towerIndex: 0, path: EvolutionPath.Symbiote },
      { beforeWave: 8, kind: 'place', towerType: TowerType.Puffball, position: { x: 640, y: 415 } },
      { beforeWave: 9, kind: 'evolve', towerIndex: 2, path: EvolutionPath.Predator },
      { beforeWave: 9, kind: 'place', towerType: TowerType.BulbShooter, position: { x: 500, y: 400 } },
    ],
  },
  noBuild: { id: 'no-build', decisionMillisecondsPerWave: 75_000, commands: [] },
  singleTower: {
    id: 'single-tower',
    decisionMillisecondsPerWave: 75_000,
    commands: [
      { beforeWave: 1, kind: 'place', towerType: TowerType.Sporecap, position: { x: 430, y: 245 } },
      { beforeWave: 3, kind: 'mature', towerIndex: 0 },
      { beforeWave: 5, kind: 'evolve', towerIndex: 0, path: EvolutionPath.Predator },
    ],
  },
} satisfies Record<string, BalanceScenario>);

class BalanceScenarioError extends Error {
  constructor(
    readonly scenarioId: string,
    readonly detail: string,
  ) {
    super(`Balance scenario ${scenarioId}: ${detail}`);
    this.name = 'BalanceScenarioError';
  }
}

function assertNever(value: never): never {
  throw new BalanceScenarioError('unknown', `unsupported value ${String(value)}`);
}

function getScheduledTowerId(
  game: GameRunner,
  scenario: BalanceScenario,
  command: Extract<ScheduledBalanceCommand, { kind: 'mature' | 'evolve' }>,
): number {
  const tower = game.getPlacedTowers()[command.towerIndex]?.tower;
  if (tower === undefined) {
    throw new BalanceScenarioError(
      scenario.id,
      `wave ${command.beforeWave} ${command.kind} references tower ${command.towerIndex}`,
    );
  }
  return tower.id;
}

function applyCommand(
  game: GameRunner,
  scenario: BalanceScenario,
  command: ScheduledBalanceCommand,
): void {
  switch (command.kind) {
    case 'place': {
      const placement = game.canPlaceTower(command.towerType, command.position.x, command.position.y);
      if (!placement.canPlace) {
        throw new BalanceScenarioError(
          scenario.id,
          `wave ${command.beforeWave} placement failed: ${placement.reason ?? 'invalid position'}`,
        );
      }
      if (game.placeTower(command.towerType, command.position.x, command.position.y) === null) {
        throw new BalanceScenarioError(scenario.id, `wave ${command.beforeWave} placement failed after validation`);
      }
      return;
    }
    case 'mature': {
      const result = game.matureTower(getScheduledTowerId(game, scenario, command));
      if (!result.success) {
        throw new BalanceScenarioError(
          scenario.id,
          `wave ${command.beforeWave} maturation failed: ${result.reason ?? 'unknown reason'}`,
        );
      }
      return;
    }
    case 'evolve': {
      const result = game.evolveTower(getScheduledTowerId(game, scenario, command), command.path);
      if (!result.success) {
        throw new BalanceScenarioError(
          scenario.id,
          `wave ${command.beforeWave} evolution failed: ${result.reason ?? 'unknown reason'}`,
        );
      }
      return;
    }
    default:
      return assertNever(command);
  }
}

function getTerminalState(state: GameState): 'victory' | 'defeat' {
  switch (state) {
    case GameState.Victory:
      return 'victory';
    case GameState.GameOver:
      return 'defeat';
    case GameState.Idle:
    case GameState.Playing:
    case GameState.Paused:
      throw new BalanceScenarioError('unknown', `simulation stopped in non-terminal state ${state}`);
    default:
      return assertNever(state);
  }
}

export function runBalanceScenario(scenario: BalanceScenario): BalanceResult {
  const game = new GameRunner({ mapId: RELEASE_MAP_ID });
  if (game.getCurrentMap()?.id !== RELEASE_MAP_ID) {
    throw new BalanceScenarioError(scenario.id, `release map ${RELEASE_MAP_ID} is unavailable`);
  }

  let simulatedMilliseconds = 0;
  let reachedIntermissions = 0;
  let waveNumber = 1;
  const defeatedEnemyTypes = new Set<EnemyType>();
  const swarmEnemyIds = new Set<number>();
  const linkedSwarmEnemyIds = new Set<number>();
  const controlledSwarmEnemyIds = new Set<number>();
  const separatedSwarmEnemyIds = new Set<number>();
  const defeatedEnemyIds = new Set<number>();
  let leakedEnemyCount = 0;
  let purchasedTowerAfterLeak = false;
  let revealedEnemyCount = 0;
  let bossId: number | null = null;
  let bossTraits: readonly EnemyTrait[] = [];
  let bossMaximumPathDistance = 0;
  let minimumNutrientsAfterCommand = Number.POSITIVE_INFINITY;

  while (!game.isTerminal() && simulatedMilliseconds < MAX_SIMULATION_MS) {
    for (const command of scenario.commands) {
      if (command.beforeWave === waveNumber) {
        applyCommand(game, scenario, command);
        minimumNutrientsAfterCommand = Math.min(minimumNutrientsAfterCommand, game.getEconomy().getMoney());
        if (command.kind === 'place' && leakedEnemyCount > 0) purchasedTowerAfterLeak = true;
      }
    }
    if (!game.startWave()) {
      throw new BalanceScenarioError(scenario.id, `wave ${waveNumber} failed to start`);
    }

    while (!game.isTerminal() && simulatedMilliseconds < MAX_SIMULATION_MS) {
      game.update(SIMULATION_EPOCH_MS + simulatedMilliseconds);
      simulatedMilliseconds += FIXED_STEP_MS;
      for (const enemy of game.getActiveEnemies()) {
        if (enemy.enemyType === EnemyType.SwarmWasp) {
          swarmEnemyIds.add(enemy.id);
          if (enemy.swarmLinkedActive) linkedSwarmEnemyIds.add(enemy.id);
          else if (
            linkedSwarmEnemyIds.has(enemy.id) &&
            controlledSwarmEnemyIds.has(enemy.id)
          ) {
            separatedSwarmEnemyIds.add(enemy.id);
          }
        }
        if (enemy.isBoss) {
          bossId = enemy.id;
          bossTraits = [...enemy.traits];
          bossMaximumPathDistance = Math.max(bossMaximumPathDistance, enemy.pathDistance);
        }
      }
      for (const event of game.drainEvents()) {
        if (event.type === 'death') {
          defeatedEnemyIds.add(event.enemyId);
          if (event.enemyType !== undefined) defeatedEnemyTypes.add(event.enemyType);
        }
        if (
          event.type === 'enemy_slowed' &&
          swarmEnemyIds.has(event.enemyId)
        ) {
          controlledSwarmEnemyIds.add(event.enemyId);
        }
        if (
          event.type === 'trait_suppressed' &&
          event.trait === EnemyTrait.SwarmLinked
        ) {
          controlledSwarmEnemyIds.add(event.enemyId);
          separatedSwarmEnemyIds.add(event.enemyId);
        }
        if (event.type === 'enemy_revealed') revealedEnemyCount += 1;
        if (event.type === 'enemy_leaked') {
          leakedEnemyCount += 1;
        }
      }
      if (game.isIntermission()) {
        reachedIntermissions += 1;
        waveNumber += 1;
        break;
      }
    }
  }

  if (!game.isTerminal()) {
    throw new BalanceScenarioError(
      scenario.id,
      `timed out after ${simulatedMilliseconds} simulated milliseconds at wave ${waveNumber}`,
    );
  }

  const stats = game.getGameStats();
  const economy = game.getEconomy();
  const towers = game.getPlacedTowers();
  const matureTowerCount = towers.filter(({ tower }) => tower.growth.stage === TowerStage.Mature).length;
  const evolvedTowerCount = towers.filter(({ tower }) => tower.growth.stage === TowerStage.Evolved).length;

  return {
    scenarioId: scenario.id,
    terminalState: getTerminalState(stats.state),
    waveReached: stats.wave,
    kernelIntegrity: economy.getLives(),
    nutrientsRemaining: economy.getMoney(),
    nutrientsSpent: economy.getTotalSpent(),
    nutrientsEarned: economy.getTotalEarned(),
    minimumNutrientsAfterCommand: Number.isFinite(minimumNutrientsAfterCommand)
      ? minimumNutrientsAfterCommand
      : economy.getMoney(),
    towerCount: towers.length,
    towerTypes: towers.map(({ tower }) => tower.towerType),
    matureTowerCount,
    evolvedTowerCount,
    defeatedEnemyTypes: [...defeatedEnemyTypes],
    leakedEnemyCount,
    purchasedTowerAfterLeak,
    separatedSwarmEnemyCount: separatedSwarmEnemyIds.size,
    revealedEnemyCount,
    bossTraits,
    bossMaximumPathDistance,
    bossDefeated: bossId !== null && defeatedEnemyIds.has(bossId),
    simulatedCombatMilliseconds: simulatedMilliseconds,
    estimatedRunMilliseconds: simulatedMilliseconds
      + reachedIntermissions * scenario.decisionMillisecondsPerWave,
  };
}

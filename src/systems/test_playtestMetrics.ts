import assert from 'node:assert/strict';
import { EvolutionEffect, EvolutionPath } from '../content/evolutionDefinitions';
import { TowerType } from '../entities/tower';
import type { GameEvent } from './gameEvents';
import {
  PlaytestMetrics,
  PlaytestMetricsCoordinator,
  PlaytestMetricsLifecycle,
  exposePlaytestSummaryInDevelopment,
  isPlaytestSummaryDevelopmentEnabled,
  type PlaytestSummaryHost,
} from './playtestMetrics';
import { EnemyType } from './wave';

// Given a run whose first metric-bearing event starts at one second
const metrics = new PlaytestMetrics('session-01');
const runEvents: readonly GameEvent[] = [
  { type: 'hit', timestamp: 100, position: { x: 10, y: 10 } },
  { type: 'wave_started', waveNumber: 1, timestamp: 1000 },
  {
    type: 'tower_placed',
    towerId: 1,
    towerType: TowerType.Sporecap,
    position: { x: 100, y: 100 },
    timestamp: 1500,
  },
  {
    type: 'network_connection_created',
    towerId: 1,
    sourceTowerId: null,
    position: { x: 100, y: 100 },
    timestamp: 2000,
  },
  {
    type: 'tower_evolved',
    towerId: 1,
    towerType: TowerType.Sporecap,
    path: EvolutionPath.Predator,
    effect: EvolutionEffect.NeedleVolley,
    timestamp: 2500,
  },
  {
    type: 'enemy_leaked',
    enemyId: 1,
    enemyType: EnemyType.ScoutBeetle,
    waveNumber: 1,
    position: { x: 800, y: 300 },
    timestamp: 3000,
  },
  { type: 'defeat', waveNumber: 4, timestamp: 200000 },
];

// When the exact semantic batch is reduced
for (const event of runEvents) metrics.accept(event);

// Then counts, terminal outcome, and duration use only metric-bearing events
assert.deepEqual(metrics.snapshot(), {
  sessionId: 'session-01',
  outcome: 'defeat',
  waveReached: 4,
  durationSeconds: 199,
  towerPlacements: 1,
  connectionsCreated: 1,
  evolutionsChosen: 1,
  enemiesLeaked: 1,
  restartRequested: false,
});

// Given an in-progress summary
const unchangedBefore = metrics.snapshot();

// When an unrelated presentation event arrives after the terminal event
metrics.accept({ type: 'area_hit', timestamp: 900000, position: { x: 20, y: 20 } });

// Then the summary and its duration remain semantically unchanged
assert.deepEqual(metrics.snapshot(), unchangedBefore);

// Given a terminal run summary
// When Restart is requested
metrics.markRestartRequested();

// Then the completed run records the retry intent
assert.equal(metrics.snapshot().restartRequested, true);

// Given a marked terminal run
// When a new session resets the accumulator
metrics.reset('session-02');

// Then every per-run field returns to its initial value
assert.deepEqual(metrics.snapshot(), {
  sessionId: 'session-02',
  outcome: 'in_progress',
  waveReached: 0,
  durationSeconds: 0,
  towerPlacements: 0,
  connectionsCreated: 0,
  evolutionsChosen: 0,
  enemiesLeaked: 0,
  restartRequested: false,
});

// Given a summary with one started wave
metrics.accept({ type: 'wave_started', waveNumber: 2, timestamp: 5000 });

// When it is serialized for local download
const serialized = metrics.toJson();

// Then the JSON contains the public snapshot and no wrapper or transport metadata
assert.deepEqual(JSON.parse(serialized), metrics.snapshot());

// Given a terminal run that the player chooses to retry
const lifecycle = new PlaytestMetricsLifecycle('terminal-session');
lifecycle.accept({ type: 'wave_started', waveNumber: 1, timestamp: 1000 });
lifecycle.accept({ type: 'victory', waveNumber: 10, timestamp: 101000 });

// When the lifecycle starts the restarted run
lifecycle.restartRun('restarted-session');

// Then the new accumulator is fresh and the completed export retains retry intent
assert.deepEqual(lifecycle.exportSnapshot(), {
  currentRun: {
    sessionId: 'restarted-session',
    outcome: 'in_progress',
    waveReached: 0,
    durationSeconds: 0,
    towerPlacements: 0,
    connectionsCreated: 0,
    evolutionsChosen: 0,
    enemiesLeaked: 0,
    restartRequested: false,
  },
  lastCompletedRun: {
    sessionId: 'terminal-session',
    outcome: 'victory',
    waveReached: 10,
    durationSeconds: 100,
    towerPlacements: 0,
    connectionsCreated: 0,
    evolutionsChosen: 0,
    enemiesLeaked: 0,
    restartRequested: true,
  },
});
assert.deepEqual(JSON.parse(lifecycle.toJson()), lifecycle.exportSnapshot());

// Given a headless shell coordinator with deterministic run IDs
const runIds = ['initial-run', 'nonterminal-restart', 'terminal-restart'];
let nextRunIdIndex = 0;
const coordinator = new PlaytestMetricsCoordinator(
  new PlaytestMetricsLifecycle('pre-run'),
  () => runIds[nextRunIdIndex++] ?? 'unexpected-run',
);

// When the shell starts its initial release run
coordinator.startRun();

// Then the exported lifecycle contains one fresh current run
assert.equal(coordinator.exportSnapshot().currentRun.sessionId, 'initial-run');
assert.equal(coordinator.exportSnapshot().lastCompletedRun, null);

// Given an in-progress run with one accepted event
coordinator.acceptBatch([{ type: 'wave_started', waveNumber: 1, timestamp: 1000 }]);

// When a nonterminal restart resets that run
coordinator.restartRun(false);

// Then the new run is fresh and no incomplete run is exported as completed
assert.equal(coordinator.exportSnapshot().currentRun.sessionId, 'nonterminal-restart');
assert.equal(coordinator.exportSnapshot().currentRun.waveReached, 0);
assert.equal(coordinator.exportSnapshot().lastCompletedRun, null);

// Given the restarted run reaches a terminal outcome
coordinator.acceptBatch([
  { type: 'wave_started', waveNumber: 1, timestamp: 2000 },
  { type: 'victory', waveNumber: 10, timestamp: 102000 },
]);

// When terminal Restart starts the next run
coordinator.restartRun(true);

// Then the labeled JSON keeps the marked terminal run beside a fresh accumulator
assert.equal(coordinator.exportSnapshot().currentRun.sessionId, 'terminal-restart');
assert.equal(coordinator.exportSnapshot().currentRun.outcome, 'in_progress');
assert.equal(coordinator.exportSnapshot().lastCompletedRun?.sessionId, 'nonterminal-restart');
assert.equal(coordinator.exportSnapshot().lastCompletedRun?.restartRequested, true);
assert.deepEqual(JSON.parse(coordinator.toJson()), coordinator.exportSnapshot());

// Given one exact semantic batch for a fresh run
class RecordingPlaytestMetricsLifecycle extends PlaytestMetricsLifecycle {
  readonly acceptedEvents: GameEvent[] = [];

  override accept(event: GameEvent): void {
    this.acceptedEvents.push(event);
    super.accept(event);
  }
}

const recordingLifecycle = new RecordingPlaytestMetricsLifecycle('batch-run');
const batchCoordinator = new PlaytestMetricsCoordinator(
  recordingLifecycle,
  () => 'unused-run',
);
const exactSemanticBatch: readonly GameEvent[] = [
  {
    type: 'tower_placed',
    towerId: 10,
    towerType: TowerType.Sporecap,
    position: { x: 100, y: 100 },
    timestamp: 1000,
  },
  {
    type: 'network_connection_created',
    towerId: 10,
    sourceTowerId: null,
    position: { x: 100, y: 100 },
    timestamp: 2000,
  },
  { type: 'wave_started', waveNumber: 1, timestamp: 3000 },
];

// When the production batch-consumption seam accepts it once
batchCoordinator.acceptBatch(exactSemanticBatch);

// Then each semantic event contributes exactly once to the exported state
assert.equal(batchCoordinator.exportSnapshot().currentRun.towerPlacements, 1);
assert.equal(batchCoordinator.exportSnapshot().currentRun.connectionsCreated, 1);
assert.equal(batchCoordinator.exportSnapshot().currentRun.waveReached, 1);
assert.equal(recordingLifecycle.acceptedEvents.length, exactSemanticBatch.length);
for (let index = 0; index < exactSemanticBatch.length; index += 1) {
  assert.equal(recordingLifecycle.acceptedEvents[index], exactSemanticBatch[index]);
}

// Given local and production browser locations
const explicitLocalGate = { hostname: 'localhost', search: '?playtestSummary=1' };
const implicitLocalGate = { hostname: '127.0.0.1', search: '' };
const productionGate = { hostname: 'play.mycelium.example', search: '?playtestSummary=1' };

// When the development exposure policy is evaluated
const explicitLocalEnabled = isPlaytestSummaryDevelopmentEnabled(explicitLocalGate);
const implicitLocalEnabled = isPlaytestSummaryDevelopmentEnabled(implicitLocalGate);
const productionEnabled = isPlaytestSummaryDevelopmentEnabled(productionGate);

// Then exposure requires both an explicit opt-in and a local development host
assert.equal(explicitLocalEnabled, true);
assert.equal(implicitLocalEnabled, false);
assert.equal(productionEnabled, false);

// Given browser-like hosts on explicit development and production locations
const enabledHost: PlaytestSummaryHost = { location: explicitLocalGate };
const disabledHost: PlaytestSummaryHost = { location: productionGate };
const incompleteHost: PlaytestSummaryHost = {};

// When the local summary hook is installed
exposePlaytestSummaryInDevelopment(enabledHost, () => lifecycle.toJson());
exposePlaytestSummaryInDevelopment(disabledHost, () => lifecycle.toJson());
exposePlaytestSummaryInDevelopment(incompleteHost, () => lifecycle.toJson());

// Then only the explicitly enabled development host exposes the offline JSON function
assert.equal(enabledHost.myceliumPlaytestSummary?.(), lifecycle.toJson());
assert.equal(disabledHost.myceliumPlaytestSummary, undefined);
assert.equal(incompleteHost.myceliumPlaytestSummary, undefined);

console.log('playtest metrics tests passed');

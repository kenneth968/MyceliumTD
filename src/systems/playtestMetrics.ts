import type { GameEvent } from './gameEvents';

export type PlaytestRunSummary = Readonly<{
  sessionId: string;
  outcome: 'in_progress' | 'victory' | 'defeat';
  waveReached: number;
  durationSeconds: number;
  towerPlacements: number;
  connectionsCreated: number;
  evolutionsChosen: number;
  enemiesLeaked: number;
  restartRequested: boolean;
}>;

export type PlaytestMetricsExport = Readonly<{
  currentRun: PlaytestRunSummary;
  lastCompletedRun: PlaytestRunSummary | null;
}>;

type DevelopmentLocation = Readonly<{
  hostname: string;
  search: string;
}>;

export type PlaytestSummaryHost = {
  readonly location?: DevelopmentLocation;
  myceliumPlaytestSummary?: () => string;
};

export class PlaytestMetrics {
  private sessionId: string;
  private outcome: PlaytestRunSummary['outcome'];
  private waveReached: number;
  private towerPlacements: number;
  private connectionsCreated: number;
  private evolutionsChosen: number;
  private enemiesLeaked: number;
  private restartRequested: boolean;
  private startedAt: number | null;
  private lastEventAt: number | null;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.outcome = 'in_progress';
    this.waveReached = 0;
    this.towerPlacements = 0;
    this.connectionsCreated = 0;
    this.evolutionsChosen = 0;
    this.enemiesLeaked = 0;
    this.restartRequested = false;
    this.startedAt = null;
    this.lastEventAt = null;
  }

  accept(event: GameEvent): void {
    switch (event.type) {
      case 'wave_started':
        this.recordTimestamp(event.timestamp);
        this.waveReached = Math.max(this.waveReached, event.waveNumber);
        return;
      case 'tower_placed':
        this.recordTimestamp(event.timestamp);
        this.towerPlacements += 1;
        return;
      case 'network_connection_created':
        this.recordTimestamp(event.timestamp);
        this.connectionsCreated += 1;
        return;
      case 'tower_evolved':
        this.recordTimestamp(event.timestamp);
        this.evolutionsChosen += 1;
        return;
      case 'enemy_leaked':
        this.recordTimestamp(event.timestamp);
        this.waveReached = Math.max(this.waveReached, event.waveNumber);
        this.enemiesLeaked += 1;
        return;
      case 'victory':
        this.recordTimestamp(event.timestamp);
        this.waveReached = Math.max(this.waveReached, event.waveNumber);
        this.outcome = 'victory';
        return;
      case 'defeat':
        this.recordTimestamp(event.timestamp);
        this.waveReached = Math.max(this.waveReached, event.waveNumber);
        this.outcome = 'defeat';
        return;
      case 'hit':
      case 'area_hit':
      case 'death':
      case 'tower_matured':
      case 'layer_broken':
      case 'enemy_marked':
      case 'enemy_slowed':
      case 'enemy_revealed':
      case 'trait_suppressed':
      case 'network_triggered':
      case 'trait_broken':
      case 'seeded_payload_detonated':
      case 'wave_completed':
        return;
      default:
        event satisfies never;
    }
  }

  markRestartRequested(): void {
    this.restartRequested = true;
  }

  snapshot(): PlaytestRunSummary {
    const durationSeconds = this.startedAt === null || this.lastEventAt === null
      ? 0
      : Math.max(0, Math.floor((this.lastEventAt - this.startedAt) / 1000));
    return Object.freeze({
      sessionId: this.sessionId,
      outcome: this.outcome,
      waveReached: this.waveReached,
      durationSeconds,
      towerPlacements: this.towerPlacements,
      connectionsCreated: this.connectionsCreated,
      evolutionsChosen: this.evolutionsChosen,
      enemiesLeaked: this.enemiesLeaked,
      restartRequested: this.restartRequested,
    });
  }

  toJson(): string {
    return JSON.stringify(this.snapshot(), null, 2);
  }

  reset(sessionId: string): void {
    this.sessionId = sessionId;
    this.outcome = 'in_progress';
    this.waveReached = 0;
    this.towerPlacements = 0;
    this.connectionsCreated = 0;
    this.evolutionsChosen = 0;
    this.enemiesLeaked = 0;
    this.restartRequested = false;
    this.startedAt = null;
    this.lastEventAt = null;
  }

  private recordTimestamp(timestamp: number): void {
    if (this.startedAt === null) this.startedAt = timestamp;
    this.lastEventAt = Math.max(this.lastEventAt ?? timestamp, timestamp);
  }
}

export class PlaytestMetricsLifecycle {
  private currentRun: PlaytestMetrics;
  private lastCompletedRun: PlaytestRunSummary | null = null;

  constructor(sessionId: string) {
    this.currentRun = new PlaytestMetrics(sessionId);
  }

  accept(event: GameEvent): void {
    this.currentRun.accept(event);
  }

  startRun(sessionId: string): void {
    const currentSummary = this.currentRun.snapshot();
    if (currentSummary.outcome !== 'in_progress') {
      this.lastCompletedRun = currentSummary;
    }
    this.currentRun = new PlaytestMetrics(sessionId);
  }

  restartRun(sessionId: string): void {
    this.currentRun.markRestartRequested();
    this.lastCompletedRun = this.currentRun.snapshot();
    this.currentRun = new PlaytestMetrics(sessionId);
  }

  exportSnapshot(): PlaytestMetricsExport {
    return Object.freeze({
      currentRun: this.currentRun.snapshot(),
      lastCompletedRun: this.lastCompletedRun,
    });
  }

  toJson(): string {
    return JSON.stringify(this.exportSnapshot(), null, 2);
  }
}

export function isPlaytestSummaryDevelopmentEnabled(location: DevelopmentLocation): boolean {
  const isLocalHost = location.hostname === 'localhost'
    || location.hostname === '127.0.0.1'
    || location.hostname === '[::1]';
  return isLocalHost && new URLSearchParams(location.search).get('playtestSummary') === '1';
}

export function exposePlaytestSummaryInDevelopment(
  host: PlaytestSummaryHost,
  getSummary: () => string,
): void {
  if (host.location !== undefined && isPlaytestSummaryDevelopmentEnabled(host.location)) {
    host.myceliumPlaytestSummary = getSummary;
  }
}

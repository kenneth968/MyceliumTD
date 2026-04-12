import { WaveSpawner, Wave } from './wave';
import { GameEconomy } from './economy';

export enum RoundState {
  Idle = 'idle',
  Intermission = 'intermission',
  Active = 'active',
  RoundEnd = 'round_end',
  GameOver = 'game_over',
  Victory = 'victory',
}

export interface RoundConfig {
  intermissionDuration: number;
  maxRounds: number;
  autoStartNextRound: boolean;
}

export const DEFAULT_ROUND_CONFIG: RoundConfig = {
  intermissionDuration: 5000,
  maxRounds: 10,
  autoStartNextRound: false,
};

export interface RoundInfo {
  roundNumber: number;
  totalRounds: number;
  state: RoundState;
  waveIndex: number;
  timeInState: number;
  isLastRound: boolean;
}

export interface RoundManagerEvents {
  onRoundStart?: (roundNumber: number, wave: Wave) => void;
  onRoundEnd?: (roundNumber: number, bonus: number) => void;
  onIntermissionStart?: (roundNumber: number) => void;
  onVictory?: (finalRound: number) => void;
  onGameOver?: (roundReached: number) => void;
}

export class RoundManager {
  private state: RoundState;
  private roundNumber: number;
  private config: RoundConfig;
  private waveSpawner: WaveSpawner;
  private economy: GameEconomy;
  private stateStartTime: number;
  private intermissionStartTime: number;
  private pendingWaveIndex: number | null;
  private events: RoundManagerEvents;
  private maxWaveIndex: number;

  constructor(
    waveSpawner: WaveSpawner,
    economy: GameEconomy,
    config: Partial<RoundConfig> = {}
  ) {
    this.config = { ...DEFAULT_ROUND_CONFIG, ...config };
    this.waveSpawner = waveSpawner;
    this.economy = economy;
    this.state = RoundState.Idle;
    this.roundNumber = 0;
    this.stateStartTime = 0;
    this.intermissionStartTime = 0;
    this.pendingWaveIndex = null;
    this.events = {};
    this.maxWaveIndex = this.config.maxRounds - 1;
  }

  setEvents(events: RoundManagerEvents): void {
    this.events = events;
  }

  getState(): RoundState {
    return this.state;
  }

  getRoundNumber(): number {
    return this.roundNumber;
  }

  getRoundInfo(): RoundInfo {
    return {
      roundNumber: this.roundNumber,
      totalRounds: this.config.maxRounds,
      state: this.state,
      waveIndex: this.waveSpawner.getCurrentWaveIndex(),
      timeInState: Date.now() - this.stateStartTime,
      isLastRound: this.roundNumber >= this.config.maxRounds,
    };
  }

  getConfig(): RoundConfig {
    return { ...this.config };
  }

  isInIntermission(): boolean {
    return this.state === RoundState.Intermission;
  }

  isRoundActive(): boolean {
    return this.state === RoundState.Active;
  }

  getIntermissionTimeRemaining(): number {
    if (this.state !== RoundState.Intermission) {
      return 0;
    }
    const elapsed = Date.now() - this.intermissionStartTime;
    return Math.max(0, this.config.intermissionDuration - elapsed);
  }

  getIntermissionProgress(): number {
    if (this.state !== RoundState.Intermission) {
      return 1;
    }
    const elapsed = Date.now() - this.intermissionStartTime;
    return Math.min(1, elapsed / this.config.intermissionDuration);
  }

  startFirstRound(): boolean {
    if (this.state !== RoundState.Idle) {
      return false;
    }
    this.roundNumber = 1;
    this.startIntermission();
    return true;
  }

  startRound(roundIndex?: number): boolean {
    if (this.state !== RoundState.Intermission && this.state !== RoundState.Idle) {
      return false;
    }

    let targetWaveIndex: number;
    if (roundIndex !== undefined) {
      targetWaveIndex = roundIndex;
    } else if (this.pendingWaveIndex !== null) {
      targetWaveIndex = this.pendingWaveIndex;
    } else {
      targetWaveIndex = this.roundNumber - 1;
    }

    if (targetWaveIndex < 0 || targetWaveIndex >= this.config.maxRounds) {
      return false;
    }

    const started = this.waveSpawner.startWave(targetWaveIndex);
    if (started) {
      this.state = RoundState.Active;
      this.stateStartTime = Date.now();
      this.pendingWaveIndex = null;
      
      const wave = this.waveSpawner.getCurrentWave();
      if (wave && this.events.onRoundStart) {
        this.events.onRoundStart(this.roundNumber, wave);
      }
    }
    return started;
  }

  startNextRound(): boolean {
    if (this.roundNumber >= this.config.maxRounds) {
      return false;
    }
    this.roundNumber++;
    this.pendingWaveIndex = this.roundNumber - 1;
    this.startIntermission();
    return true;
  }

  private startIntermission(): void {
    this.state = RoundState.Intermission;
    this.stateStartTime = Date.now();
    this.intermissionStartTime = Date.now();
    
    if (this.events.onIntermissionStart) {
      this.events.onIntermissionStart(this.roundNumber);
    }
  }

  private endRound(bonus: number): void {
    this.state = RoundState.RoundEnd;
    this.stateStartTime = Date.now();
    
    if (this.events.onRoundEnd) {
      this.events.onRoundEnd(this.roundNumber, bonus);
    }
  }

  checkRoundCompletion(activeEnemiesCount: number): RoundState {
    if (this.state === RoundState.GameOver || this.state === RoundState.Victory) {
      return this.state;
    }

    if (this.state !== RoundState.Active) {
      return this.state;
    }

    if (this.waveSpawner.isWaveActive()) {
      return this.state;
    }

    if (activeEnemiesCount > 0) {
      return this.state;
    }

    if (this.waveSpawner.getRemainingInCurrentGroup() > 0 || this.waveSpawner.getRemainingGroups() > 0) {
      return this.state;
    }

    const bonus = this.economy.addRoundBonus();
    this.endRound(bonus);

    if (this.roundNumber >= this.config.maxRounds) {
      this.state = RoundState.Victory;
      if (this.events.onVictory) {
        this.events.onVictory(this.roundNumber);
      }
    } else if (this.config.autoStartNextRound) {
      this.startNextRound();
    } else {
      this.startIntermission();
    }

    return this.state;
  }

  triggerGameOver(): void {
    if (this.state === RoundState.GameOver || this.state === RoundState.Victory) {
      return;
    }
    this.state = RoundState.GameOver;
    this.stateStartTime = Date.now();
    
    if (this.events.onGameOver) {
      this.events.onGameOver(this.roundNumber);
    }
  }

  skipIntermission(): boolean {
    if (this.state !== RoundState.Intermission) {
      return false;
    }
    return this.startRound();
  }

  update(currentTime: number): void {
    if (this.state === RoundState.Intermission && !this.config.autoStartNextRound) {
      const elapsed = currentTime - this.intermissionStartTime;
      if (elapsed >= this.config.intermissionDuration) {
        this.startRound();
      }
    }
  }

  reset(): void {
    this.state = RoundState.Idle;
    this.roundNumber = 0;
    this.stateStartTime = 0;
    this.intermissionStartTime = 0;
    this.pendingWaveIndex = null;
  }

  getTimeInCurrentState(): number {
    return Date.now() - this.stateStartTime;
  }

  getStateDuration(state: RoundState): number {
    if (this.state !== state) {
      return 0;
    }
    return this.getTimeInCurrentState();
  }
}

export function createRoundManager(
  waveSpawner: WaveSpawner,
  economy: GameEconomy,
  config?: Partial<RoundConfig>
): RoundManager {
  return new RoundManager(waveSpawner, economy, config);
}

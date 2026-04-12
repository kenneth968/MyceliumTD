import { GameRunner, GameState } from './gameRunner';

export enum WaveControlState {
  Waiting = 'waiting',
  Ready = 'ready',
  Active = 'active',
  Paused = 'paused',
  Complete = 'complete',
  GameOver = 'game_over',
  Victory = 'victory',
}

export interface WaveControlConfig {
  gameRunner: GameRunner;
  autoStartNextWave?: boolean;
}

export interface WaveUIState {
  controlState: WaveControlState;
  currentWave: number;
  totalWaves: number;
  isPaused: boolean;
  canStartWave: boolean;
  canPause: boolean;
  canResume: boolean;
  canFastForward: boolean;
  isFastForward: boolean;
  enemiesRemaining: number;
}

export class WaveControls {
  private gameRunner: GameRunner;
  private isFastForward: boolean;

  constructor(gameRunner: GameRunner) {
    this.gameRunner = gameRunner;
    this.isFastForward = false;
  }

  getWaveUIState(): WaveUIState {
    const runnerState = this.gameRunner.getState();
    const stats = this.gameRunner.getGameStats();
    const waveActive = this.gameRunner.isWaveActive();
    const currentWave = this.gameRunner.getCurrentWave();

    let controlState: WaveControlState;

    switch (runnerState) {
      case GameState.GameOver:
        controlState = WaveControlState.GameOver;
        break;
      case GameState.Victory:
        controlState = WaveControlState.Victory;
        break;
      case GameState.Paused:
        controlState = WaveControlState.Paused;
        break;
      case GameState.Idle:
        controlState = WaveControlState.Waiting;
        break;
      case GameState.Playing:
        if (waveActive) {
          controlState = WaveControlState.Active;
        } else if (currentWave) {
          controlState = WaveControlState.Complete;
        } else {
          controlState = WaveControlState.Ready;
        }
        break;
      default:
        controlState = WaveControlState.Waiting;
    }

    return {
      controlState,
      currentWave: stats.wave,
      totalWaves: stats.totalWaves,
      isPaused: runnerState === GameState.Paused,
      canStartWave: runnerState === GameState.Idle || runnerState === GameState.Playing && !waveActive,
      canPause: runnerState === GameState.Playing && waveActive,
      canResume: runnerState === GameState.Paused,
      canFastForward: runnerState === GameState.Playing,
      isFastForward: this.isFastForward,
      enemiesRemaining: this.gameRunner.getRemainingEnemies(),
    };
  }

  startWave(waveIndex?: number): { success: boolean; message: string } {
    const state = this.getWaveUIState();

    if (state.controlState === WaveControlState.GameOver || state.controlState === WaveControlState.Victory) {
      return { success: false, message: 'Game has ended' };
    }

    if (state.controlState === WaveControlState.Active) {
      return { success: false, message: 'Wave already in progress' };
    }

    if (this.gameRunner.startWave(waveIndex)) {
      const waveNum = waveIndex !== undefined ? waveIndex + 1 : state.currentWave + 1;
      return { success: true, message: `Wave ${waveNum} started` };
    }

    return { success: false, message: 'Failed to start wave' };
  }

  pauseGame(): { success: boolean; message: string } {
    const state = this.getWaveUIState();

    if (!state.canPause) {
      return { success: false, message: 'Cannot pause' };
    }

    if (this.gameRunner.pause()) {
      return { success: true, message: 'Game paused' };
    }

    return { success: false, message: 'Failed to pause' };
  }

  resumeGame(): { success: boolean; message: string } {
    const state = this.getWaveUIState();

    if (!state.canResume) {
      return { success: false, message: 'Cannot resume' };
    }

    if (this.gameRunner.resume()) {
      return { success: true, message: 'Game resumed' };
    }

    return { success: false, message: 'Failed to resume' };
  }

  togglePause(): { success: boolean; message: string } {
    const state = this.getWaveUIState();

    if (state.isPaused) {
      return this.resumeGame();
    } else {
      return this.pauseGame();
    }
  }

  startNextWave(): { success: boolean; message: string } {
    return this.startWave();
  }

  setFastForward(enabled: boolean): void {
    this.isFastForward = enabled;
  }

  toggleFastForward(): boolean {
    this.isFastForward = !this.isFastForward;
    return this.isFastForward;
  }

  getIsFastForward(): boolean {
    return this.isFastForward;
  }

  getGameRunner(): GameRunner {
    return this.gameRunner;
  }

  isWaveComplete(): boolean {
    return this.getWaveUIState().controlState === WaveControlState.Complete;
  }

  isGameEnded(): boolean {
    const state = this.getWaveUIState().controlState;
    return state === WaveControlState.GameOver || state === WaveControlState.Victory;
  }

  canStartNextWave(): boolean {
    const state = this.getWaveUIState();
    return state.canStartWave && !this.isGameEnded();
  }
}

export function createWaveControls(gameRunner: GameRunner): WaveControls {
  return new WaveControls(gameRunner);
}
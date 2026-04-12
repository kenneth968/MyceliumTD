import { GameRunner, GameState } from './gameRunner';
import { GameRenderer, GameFrameRenderData, createGameRenderer } from './gameRenderer';

const g = (typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : global) as any;
if (typeof g.requestAnimationFrame !== 'function') {
  g.requestAnimationFrame = (cb: (time: number) => void) => setTimeout(() => cb(Date.now()), 16) as any;
}
if (typeof g.cancelAnimationFrame !== 'function') {
  g.cancelAnimationFrame = (id: number) => clearTimeout(id);
}

const requestAnimationFrame = g.requestAnimationFrame.bind(g);
const cancelAnimationFrame = g.cancelAnimationFrame.bind(g);

export type GameLoopCallback = (renderData: GameFrameRenderData) => void;
export type GameEventCallback = (event: GameEvent) => void;

export interface GameEvent {
  type: GameEventType;
  timestamp: number;
  data?: unknown;
}

export enum GameEventType {
  Tick = 'tick',
  Render = 'render',
  StateChange = 'state_change',
  TowerPlaced = 'tower_placed',
  TowerSold = 'tower_sold',
  TowerUpgraded = 'tower_upgraded',
  WaveStarted = 'wave_started',
  WaveCompleted = 'wave_completed',
  EnemyKilled = 'enemy_killed',
  GameOver = 'game_over',
  Victory = 'victory',
}

export interface GameLoopConfig {
  targetFPS?: number;
  fixedDeltaTime?: number;
  enableVSync?: boolean;
}

export const DEFAULT_GAME_LOOP_CONFIG: Required<GameLoopConfig> = {
  targetFPS: 60,
  fixedDeltaTime: 1000 / 60,
  enableVSync: true,
};

export interface GameLoopStats {
  fps: number;
  frameCount: number;
  totalTime: number;
  deltaTime: number;
  renderTime: number;
  updateTime: number;
}

export class GameLoop {
  private game: GameRunner;
  private renderer: GameRenderer;
  private config: Required<GameLoopConfig>;
  
  private isRunning: boolean;
  private isPaused: boolean;
  private animationFrameId: number | null;
  
  private lastFrameTime: number;
  private lastRenderTime: number;
  private accumulatedTime: number;
  
  private frameCount: number;
  private fpsUpdateInterval: number;
  private lastFPSUpdate: number;
  private currentFPS: number;
  private frameTimeBuffer: number[];
  
  private onRender: GameLoopCallback | null;
  private onEvent: GameEventCallback | null;
  
  private stateHistory: Array<{ state: GameState; timestamp: number }>;

  constructor(
    game: GameRunner,
    renderer?: GameRenderer,
    config: GameLoopConfig = {}
  ) {
    this.game = game;
    this.renderer = renderer ?? createGameRenderer();
    this.config = { ...DEFAULT_GAME_LOOP_CONFIG, ...config };
    
    this.isRunning = false;
    this.isPaused = false;
    this.animationFrameId = null;
    
    this.lastFrameTime = 0;
    this.lastRenderTime = 0;
    this.accumulatedTime = 0;
    
    this.frameCount = 0;
    this.fpsUpdateInterval = 500;
    this.lastFPSUpdate = 0;
    this.currentFPS = 0;
    this.frameTimeBuffer = [];
    
    this.onRender = null;
    this.onEvent = null;
    
    this.stateHistory = [];
  }

  start(): void {
    if (this.isRunning) {
      return;
    }
    
    this.isRunning = true;
    this.isPaused = false;
    this.lastFrameTime = performance.now();
    this.lastFPSUpdate = this.lastFrameTime;
    
    this.game.start();
    this.recordStateChange(this.game.getState());
    
    this.animationFrameId = requestAnimationFrame(this.loop.bind(this));
  }

  stop(): void {
    if (!this.isRunning) {
      return;
    }
    
    this.isRunning = false;
    
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  pause(): void {
    if (!this.isRunning || this.isPaused) {
      return;
    }
    
    this.isPaused = true;
    this.game.pause();
    this.recordStateChange(GameState.Paused);
  }

  resume(): void {
    if (!this.isRunning || !this.isPaused) {
      return;
    }
    
    this.isPaused = false;
    this.game.resume();
    this.recordStateChange(this.game.getState());
    this.lastFrameTime = performance.now();
  }

  togglePause(): void {
    if (this.isPaused) {
      this.resume();
    } else {
      this.pause();
    }
  }

  isActive(): boolean {
    return this.isRunning;
  }

  isPausedState(): boolean {
    return this.isPaused;
  }

  getFPS(): number {
    return this.currentFPS;
  }

  getStats(): GameLoopStats {
    return {
      fps: this.currentFPS,
      frameCount: this.frameCount,
      totalTime: this.accumulatedTime,
      deltaTime: this.config.fixedDeltaTime,
      renderTime: 0,
      updateTime: 0,
    };
  }

  setRenderCallback(callback: GameLoopCallback): void {
    this.onRender = callback;
  }

  setEventCallback(callback: GameEventCallback): void {
    this.onEvent = callback;
  }

  getGame(): GameRunner {
    return this.game;
  }

  getRenderer(): GameRenderer {
    return this.renderer;
  }

  private loop(currentTime: number): void {
    if (!this.isRunning) {
      return;
    }

    this.animationFrameId = requestAnimationFrame(this.loop.bind(this));

    if (this.isPaused) {
      this.lastFrameTime = currentTime;
      return;
    }

    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    
    this.accumulatedTime += deltaTime;
    this.frameCount++;

    this.updateFPS(currentTime, deltaTime);

    this.game.update(currentTime);

    const renderData = this.renderer.render(this.game, currentTime);

    if (this.onRender) {
      this.onRender(renderData);
    }

    this.emitEvent({
      type: GameEventType.Render,
      timestamp: currentTime,
      data: renderData,
    });

    this.lastRenderTime = currentTime;
  }

  private updateFPS(currentTime: number, frameTime: number): void {
    this.frameTimeBuffer.push(frameTime);
    
    if (currentTime - this.lastFPSUpdate >= this.fpsUpdateInterval) {
      if (this.frameTimeBuffer.length > 0) {
        const avgFrameTime = this.frameTimeBuffer.reduce((a, b) => a + b, 0) / this.frameTimeBuffer.length;
        this.currentFPS = Math.round(1000 / avgFrameTime);
      }
      
      this.frameTimeBuffer = [];
      this.lastFPSUpdate = currentTime;
    }
  }

  private recordStateChange(newState: GameState): void {
    const lastState = this.stateHistory.length > 0 
      ? this.stateHistory[this.stateHistory.length - 1].state 
      : null;
    
    if (lastState !== newState) {
      this.stateHistory.push({
        state: newState,
        timestamp: performance.now(),
      });
      
      this.emitEvent({
        type: GameEventType.StateChange,
        timestamp: performance.now(),
        data: { previousState: lastState, newState },
      });
    }
  }

  private emitEvent(event: GameEvent): void {
    if (this.onEvent) {
      this.onEvent(event);
    }
  }

  getStateHistory(): Array<{ state: GameState; timestamp: number }> {
    return [...this.stateHistory];
  }

  getGameState(): GameState {
    return this.game.getState();
  }
}

export function createGameLoop(
  game: GameRunner,
  renderer?: GameRenderer,
  config?: GameLoopConfig
): GameLoop {
  return new GameLoop(game, renderer, config);
}

export function createTestGameLoop(): GameLoop {
  const game = new GameRunner();
  const renderer = createGameRenderer();
  return new GameLoop(game, renderer);
}
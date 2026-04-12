import { GameRunner, GameState, GameSpeed, createGameRunner } from './gameRunner';
import { TowerType } from '../entities/tower';
import { TargetingMode } from './targeting';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

function assertEqual(actual: any, expected: any, message: string) {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${message} (expected ${expected}, got ${actual})`);
  }
}

console.log('Testing Game Speed Controls...');

const game = createGameRunner();
assert(game.getState() === GameState.Idle, 'Initial state should be Idle');
assertEqual(game.getGameSpeed(), GameSpeed.Normal, 'Initial speed should be Normal (1x)');
assertEqual(game.getGameSpeedMultiplier(), 1, 'Initial speed multiplier should be 1');

game.start();
assert(game.getState() === GameState.Playing, 'After start, state should be Playing');

assertEqual(game.getGameSpeed(), GameSpeed.Normal, 'Speed should still be Normal after start');

game.setGameSpeed(GameSpeed.Fast);
assertEqual(game.getGameSpeed(), GameSpeed.Fast, 'Speed should be Fast (2x) after setGameSpeed');
assertEqual(game.getGameSpeedMultiplier(), 2, 'Speed multiplier should be 2');

game.setGameSpeed(GameSpeed.Faster);
assertEqual(game.getGameSpeed(), GameSpeed.Faster, 'Speed should be Faster (3x) after setGameSpeed');
assertEqual(game.getGameSpeedMultiplier(), 3, 'Speed multiplier should be 3');

game.setGameSpeed(GameSpeed.Normal);
assertEqual(game.getGameSpeed(), GameSpeed.Normal, 'Speed should be Normal after reset');
assertEqual(game.getGameSpeedMultiplier(), 1, 'Speed multiplier should be 1 after reset');

game.reset();
assertEqual(game.getGameSpeed(), GameSpeed.Normal, 'Speed should reset to Normal after game reset');

game.start();

const tower = game.placeTower(TowerType.PuffballFungus, 100, 100, TargetingMode.First);
assert(tower !== null, 'Should place tower');

game.startWave(0);
assert(game.isWaveActive() === true, 'Wave should be active');

game.pause();
game.setGameSpeed(GameSpeed.Fast);
assertEqual(game.getGameSpeed(), GameSpeed.Fast, 'Speed can be changed while paused');

game.resume();
assertEqual(game.getGameSpeed(), GameSpeed.Fast, 'Speed should persist after resume');

game.reset();
assertEqual(game.getGameSpeed(), GameSpeed.Normal, 'Speed should reset after game reset');

const game2 = createGameRunner();
game2.start();
game2.setGameSpeed(GameSpeed.Faster);

const stats = game2.getGameStats();
assertEqual(stats.state, GameState.Playing, 'Game stats should show Playing state');

game2.pause();
assertEqual(game2.getGameSpeed(), GameSpeed.Faster, 'Speed preserved across pause');

game2.reset();
assertEqual(game2.getGameSpeed(), GameSpeed.Normal, 'Reset should restore normal speed');

console.log('All Game Speed tests passed!');
import { GameRunner, GameState, PlacementState } from './gameRunner';
import { TowerType } from '../entities/tower';
import { processHotkey, findHotkeyAction, HotkeyAction, canSelectTower, canCancel, canPause } from './hotkeys';

function describe(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`✓ ${name}`);
  } catch (e: any) {
    console.error(`✗ ${name}`);
    console.error(`  ${e.message}`);
  }
}

function expect(actual: any): any {
  return {
    toBe(expected: any): void {
      if (actual !== expected) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toEqual(expected: any): void {
      if (JSON.stringify(actual) !== JSON.stringify(expected)) {
        throw new Error(`Expected ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
      }
    },
    toBeTruthy(): void {
      if (!actual) {
        throw new Error(`Expected truthy but got ${actual}`);
      }
    },
    toBeFalsy(): void {
      if (actual) {
        throw new Error(`Expected falsy but got ${actual}`);
      }
    },
    toBeNull(): void {
      if (actual !== null) {
        throw new Error(`Expected null but got ${actual}`);
      }
    },
    toContain(expected: any): void {
      if (!actual.includes(expected)) {
        throw new Error(`Expected array to contain ${expected}`);
      }
    },
    toBeGreaterThan(expected: any): void {
      if (actual <= expected) {
        throw new Error(`Expected ${actual} to be greater than ${expected}`);
      }
    },
    toBeLessThanOrEqual(expected: any): void {
      if (actual > expected) {
        throw new Error(`Expected ${actual} to be less than or equal to ${expected}`);
      }
    },
    not: {
      toBe(expected: any): void {
        if (actual === expected) {
          throw new Error(`Expected NOT ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
        }
      },
      toEqual(expected: any): void {
        if (JSON.stringify(actual) === JSON.stringify(expected)) {
          throw new Error(`Expected NOT ${JSON.stringify(expected)} but got ${JSON.stringify(actual)}`);
        }
      },
      toBeTruthy(): void {
        if (!actual) {
          throw new Error(`Expected falsy to be truthy`);
        }
      },
    },
  };
}

console.log('=== hotkeys integration with GameRunner Tests ===\n');

let passed = 0;
let failed = 0;

function test(name: string, fn: () => void): void {
  try {
    fn();
    passed++;
    console.log(`  ✓ ${name}`);
  } catch (e: any) {
    failed++;
    console.error(`  ✗ ${name}`);
    console.error(`    ${e.message}`);
  }
}

describe('Hotkey handler with GameRunner state', () => {
  test('processHotkey allows tower selection when idle', () => {
    const result = processHotkey('1', { placementState: PlacementState.None, gameState: 'idle' });
    expect(result?.action).toEqual(HotkeyAction.SelectTower1);
    expect(result?.handled).toBeTruthy();
  });

  test('processHotkey blocks tower selection when placing', () => {
    const result = processHotkey('1', { placementState: PlacementState.Placing, gameState: 'playing' });
    expect(result?.handled).toBeFalsy();
  });

  test('processHotkey blocks tower selection when selecting', () => {
    const result = processHotkey('1', { placementState: PlacementState.Selecting, gameState: 'playing' });
    expect(result?.handled).toBeFalsy();
  });

  test('processHotkey allows cancel when placing', () => {
    const result = processHotkey('Escape', { placementState: PlacementState.Placing, gameState: 'playing' });
    expect(result?.action).toEqual(HotkeyAction.Cancel);
    expect(result?.handled).toBeTruthy();
  });

  test('processHotkey allows cancel when selecting', () => {
    const result = processHotkey('Escape', { placementState: PlacementState.Selecting, gameState: 'playing' });
    expect(result?.action).toEqual(HotkeyAction.Cancel);
    expect(result?.handled).toBeTruthy();
  });

  test('processHotkey blocks cancel when idle', () => {
    const result = processHotkey('Escape', { placementState: PlacementState.None, gameState: 'playing' });
    expect(result?.handled).toBeFalsy();
  });
});

describe('GameRunner integration', () => {
  test('GameRunner starts in idle state', () => {
    const game = new GameRunner();
    expect(game.getState()).toEqual(GameState.Idle);
  });

  test('GameRunner start changes state to playing', () => {
    const game = new GameRunner();
    game.start();
    expect(game.getState()).toEqual(GameState.Playing);
  });

  test('GameRunner pause changes state to paused', () => {
    const game = new GameRunner();
    game.start();
    game.pause();
    expect(game.getState()).toEqual(GameState.Paused);
  });

  test('GameRunner resume changes state back to playing', () => {
    const game = new GameRunner();
    game.start();
    game.pause();
    game.resume();
    expect(game.getState()).toEqual(GameState.Playing);
  });

  test('GameRunner placement state starts as None', () => {
    const game = new GameRunner();
    expect(game.getPlacementState()).toEqual(PlacementState.None);
  });

  test('GameRunner startTowerPlacement changes placement state to Placing', () => {
    const game = new GameRunner();
    game.startTowerPlacement(TowerType.PuffballFungus);
    expect(game.getPlacementState()).toEqual(PlacementState.Placing);
  });

  test('GameRunner cancelPlacement resets placement state to None', () => {
    const game = new GameRunner();
    game.startTowerPlacement(TowerType.PuffballFungus);
    game.cancelPlacement();
    expect(game.getPlacementState()).toEqual(PlacementState.None);
  });

  test('GameRunner can select tower when not placing', () => {
    const game = new GameRunner();
    expect(game.startTowerPlacement(TowerType.PuffballFungus)).toBeTruthy();
  });

  test('GameRunner cannot start placement when already placing', () => {
    const game = new GameRunner();
    game.startTowerPlacement(TowerType.PuffballFungus);
    expect(game.startTowerPlacement(TowerType.OrchidTrap)).toBeFalsy();
  });

  test('GameRunner selectTower changes state to Selecting', () => {
    const game = new GameRunner();
    game.start();
    const tower = game.placeTower(TowerType.PuffballFungus, 100, 100);
    if (tower) {
      game.selectTower(tower.id);
      expect(game.getPlacementState()).toEqual(PlacementState.Selecting);
    }
  });

  test('GameRunner deselectTower resets state to None', () => {
    const game = new GameRunner();
    game.start();
    const tower = game.placeTower(TowerType.PuffballFungus, 100, 100);
    if (tower) {
      game.selectTower(tower.id);
      game.deselectTower();
      expect(game.getPlacementState()).toEqual(PlacementState.None);
    }
  });

  test('GameRunner handles all 5 tower types for hotkeys', () => {
    const game = new GameRunner();
    const towerTypes = [
      TowerType.PuffballFungus,
      TowerType.OrchidTrap,
      TowerType.VenusFlytower,
      TowerType.BioluminescentShroom,
      TowerType.StinkhornLine,
    ];
    for (const tt of towerTypes) {
      expect(game.startTowerPlacement(tt)).toBeTruthy();
      game.cancelPlacement();
    }
  });
});

describe('GameRunner + Hotkey integration scenarios', () => {
  test('pressing 1 then 2 replaces tower selection', () => {
    const game = new GameRunner();
    game.start();
    game.startTowerPlacement(TowerType.PuffballFungus);
    expect(game.getSelectedTowerType()).toEqual(TowerType.PuffballFungus);
    
    game.cancelPlacement();
    game.startTowerPlacement(TowerType.OrchidTrap);
    expect(game.getSelectedTowerType()).toEqual(TowerType.OrchidTrap);
  });

  test('Escape cancels active placement', () => {
    const game = new GameRunner();
    game.start();
    game.startTowerPlacement(TowerType.PuffballFungus);
    expect(game.getPlacementState()).toEqual(PlacementState.Placing);
    
    const cancelResult = processHotkey('Escape', { 
      placementState: game.getPlacementState() as any, 
      gameState: game.getState() as any 
    });
    
    if (cancelResult?.handled) {
      game.cancelPlacement();
    }
    
    expect(game.getPlacementState()).toEqual(PlacementState.None);
  });

  test('can place tower after cancel and reselect', () => {
    const game = new GameRunner();
    game.start();
    
    game.startTowerPlacement(TowerType.PuffballFungus);
    game.cancelPlacement();
    
    game.startTowerPlacement(TowerType.OrchidTrap);
    game.updatePlacementPosition(200, 200);
    const tower = game.confirmPlacement();
    
    expect(tower !== null).toBeTruthy();
    expect(game.getPlacementState()).toEqual(PlacementState.None);
  });

  test('selecting tower then pressing Escape deselects', () => {
    const game = new GameRunner();
    game.start();
    const tower = game.placeTower(TowerType.PuffballFungus, 100, 100);
    
    if (tower) {
      game.selectTower(tower.id);
      expect(game.getPlacementState()).toEqual(PlacementState.Selecting);
      
      const cancelResult = processHotkey('Escape', { 
        placementState: game.getPlacementState() as any, 
        gameState: game.getState() as any 
      });
      
      if (cancelResult?.handled) {
        game.deselectTower();
      }
      
      expect(game.getPlacementState()).toEqual(PlacementState.None);
    }
  });
});

describe('Space bar pause/resume hotkey', () => {
  test('Space key is recognized as pause hotkey', () => {
    const result = findHotkeyAction('Space');
    expect(result?.action).toEqual(HotkeyAction.Pause);
    expect(result?.handled).toBeTruthy();
  });

  test('Space key with space character is recognized as pause hotkey', () => {
    const result = findHotkeyAction(' ');
    expect(result?.action).toEqual(HotkeyAction.Pause);
    expect(result?.handled).toBeTruthy();
  });

  test('processHotkey allows pause when game is playing', () => {
    const result = processHotkey('Space', { placementState: PlacementState.None, gameState: 'playing' });
    expect(result?.action).toEqual(HotkeyAction.Pause);
    expect(result?.handled).toBeTruthy();
  });

  test('processHotkey allows pause when game is paused', () => {
    const result = processHotkey('Space', { placementState: PlacementState.None, gameState: 'paused' });
    expect(result?.action).toEqual(HotkeyAction.Pause);
    expect(result?.handled).toBeTruthy();
  });

  test('processHotkey blocks pause when game is idle', () => {
    const result = processHotkey('Space', { placementState: PlacementState.None, gameState: 'idle' });
    expect(result?.handled).toBeFalsy();
  });

  test('processHotkey blocks pause when game is game_over', () => {
    const result = processHotkey('Space', { placementState: PlacementState.None, gameState: 'game_over' });
    expect(result?.handled).toBeFalsy();
  });

  test('Space bar toggles pause/resume via GameRunner', () => {
    const game = new GameRunner();
    game.start();
    expect(game.getState()).toEqual(GameState.Playing);
    
    const pauseResult = processHotkey('Space', { 
      placementState: game.getPlacementState() as any, 
      gameState: game.getState() as any 
    });
    
    if (pauseResult?.handled) {
      game.pause();
    }
    expect(game.getState()).toEqual(GameState.Paused);
    
    const resumeResult = processHotkey('Space', { 
      placementState: game.getPlacementState() as any, 
      gameState: game.getState() as any 
    });
    
    if (resumeResult?.handled) {
      game.resume();
    }
    expect(game.getState()).toEqual(GameState.Playing);
  });

  test('Space bar pauses even during tower placement (user can think while paused)', () => {
    const game = new GameRunner();
    game.start();
    game.startTowerPlacement(TowerType.PuffballFungus);
    expect(game.getPlacementState()).toEqual(PlacementState.Placing);
    
    const pauseResult = processHotkey('Space', { 
      placementState: game.getPlacementState() as any, 
      gameState: game.getState() as any 
    });
    
    expect(pauseResult?.handled).toBeTruthy();
    if (pauseResult?.handled) {
      game.pause();
    }
    expect(game.getState()).toEqual(GameState.Paused);
  });

  test('Space bar pauses even during tower selection', () => {
    const game = new GameRunner();
    game.start();
    const tower = game.placeTower(TowerType.PuffballFungus, 100, 100);
    
    if (tower) {
      game.selectTower(tower.id);
      expect(game.getPlacementState()).toEqual(PlacementState.Selecting);
      
      const pauseResult = processHotkey('Space', { 
        placementState: game.getPlacementState() as any, 
        gameState: game.getState() as any 
      });
      
      expect(pauseResult?.handled).toBeTruthy();
      if (pauseResult?.handled) {
        game.pause();
      }
      expect(game.getState()).toEqual(GameState.Paused);
    }
  });
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}

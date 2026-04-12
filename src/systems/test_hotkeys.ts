import {
  HotkeyAction,
  HotkeyMapping,
  HOTKEY_MAPPINGS,
  HotkeyResult,
  getTowerTypeForHotkey,
  findHotkeyAction,
  normalizeKey,
  shouldHandleHotkey,
  canSelectTower,
  canCancel,
  canPause,
  processHotkey,
  isTowerHotkey,
  isCancelHotkey,
  isPauseHotkey,
  getHotkeyLabel,
  getHotkeyDescription,
} from './hotkeys';
import { PlacementState } from './gameRunner';
import { TowerType } from '../entities/tower';

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

console.log('=== hotkeys.ts Tests ===\n');

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

describe('HOTKEY_MAPPINGS', () => {
  test('should have 14 hotkey mappings (5 towers + 2 cancel + 2 pause + 3 speed + 2 map)', () => {
    expect(HOTKEY_MAPPINGS.length).toBe(14);
  });

  test('should have tower hotkeys for keys 1-5', () => {
    const towerMappings = HOTKEY_MAPPINGS.filter(m => m.towerType !== undefined);
    expect(towerMappings.length).toBe(5);
  });

  test('should have cancel mappings for Escape', () => {
    const cancelMappings = HOTKEY_MAPPINGS.filter(m => m.action === HotkeyAction.Cancel);
    expect(cancelMappings.length).toBe(2);
  });

  test('should map key 1 to PuffballFungus', () => {
    const mapping = HOTKEY_MAPPINGS.find(m => m.key === '1');
    expect(mapping?.towerType).toEqual(TowerType.PuffballFungus);
  });

  test('should map key 2 to OrchidTrap', () => {
    const mapping = HOTKEY_MAPPINGS.find(m => m.key === '2');
    expect(mapping?.towerType).toEqual(TowerType.OrchidTrap);
  });

  test('should map key 3 to VenusFlytower', () => {
    const mapping = HOTKEY_MAPPINGS.find(m => m.key === '3');
    expect(mapping?.towerType).toEqual(TowerType.VenusFlytower);
  });

  test('should map key 4 to BioluminescentShroom', () => {
    const mapping = HOTKEY_MAPPINGS.find(m => m.key === '4');
    expect(mapping?.towerType).toEqual(TowerType.BioluminescentShroom);
  });

  test('should map key 5 to StinkhornLine', () => {
    const mapping = HOTKEY_MAPPINGS.find(m => m.key === '5');
    expect(mapping?.towerType).toEqual(TowerType.StinkhornLine);
  });
});

describe('getTowerTypeForHotkey', () => {
  test('should return PuffballFungus for SelectTower1', () => {
    expect(getTowerTypeForHotkey(HotkeyAction.SelectTower1)).toEqual(TowerType.PuffballFungus);
  });

  test('should return OrchidTrap for SelectTower2', () => {
    expect(getTowerTypeForHotkey(HotkeyAction.SelectTower2)).toEqual(TowerType.OrchidTrap);
  });

  test('should return VenusFlytower for SelectTower3', () => {
    expect(getTowerTypeForHotkey(HotkeyAction.SelectTower3)).toEqual(TowerType.VenusFlytower);
  });

  test('should return BioluminescentShroom for SelectTower4', () => {
    expect(getTowerTypeForHotkey(HotkeyAction.SelectTower4)).toEqual(TowerType.BioluminescentShroom);
  });

  test('should return StinkhornLine for SelectTower5', () => {
    expect(getTowerTypeForHotkey(HotkeyAction.SelectTower5)).toEqual(TowerType.StinkhornLine);
  });

  test('should return undefined for Cancel', () => {
    const result = getTowerTypeForHotkey(HotkeyAction.Cancel);
    expect(result === undefined).toBeTruthy();
  });

  test('should return undefined for Pause', () => {
    const result = getTowerTypeForHotkey(HotkeyAction.Pause);
    expect(result === undefined).toBeTruthy();
  });
});

describe('findHotkeyAction', () => {
  test('should find SelectTower1 for key "1"', () => {
    const result = findHotkeyAction('1');
    expect(result?.action).toEqual(HotkeyAction.SelectTower1);
    expect(result?.towerType).toEqual(TowerType.PuffballFungus);
  });

  test('should find SelectTower2 for key "2"', () => {
    const result = findHotkeyAction('2');
    expect(result?.action).toEqual(HotkeyAction.SelectTower2);
  });

  test('should find SelectTower3 for key "3"', () => {
    const result = findHotkeyAction('3');
    expect(result?.action).toEqual(HotkeyAction.SelectTower3);
  });

  test('should find SelectTower4 for key "4"', () => {
    const result = findHotkeyAction('4');
    expect(result?.action).toEqual(HotkeyAction.SelectTower4);
  });

  test('should find SelectTower5 for key "5"', () => {
    const result = findHotkeyAction('5');
    expect(result?.action).toEqual(HotkeyAction.SelectTower5);
  });

  test('should find Cancel for key "Escape"', () => {
    const result = findHotkeyAction('Escape');
    expect(result?.action).toEqual(HotkeyAction.Cancel);
  });

  test('should find Cancel for key "Esc"', () => {
    const result = findHotkeyAction('Esc');
    expect(result?.action).toEqual(HotkeyAction.Cancel);
  });

  test('should be case insensitive for letters', () => {
    const result = findHotkeyAction('ESCAPE');
    expect(result?.action).toEqual(HotkeyAction.Cancel);
  });

  test('should return null for unknown key', () => {
    const result = findHotkeyAction('F12');
    expect(result).toBeNull();
  });

  test('should return null for tab key', () => {
    const result = findHotkeyAction('Tab');
    expect(result).toBeNull();
  });

  test('should always return handled: true for found mappings', () => {
    const result = findHotkeyAction('1');
    expect(result?.handled).toBeTruthy();
  });
});

describe('normalizeKey', () => {
  test('should lowercase uppercase letters', () => {
    expect(normalizeKey('ESCAPE')).toBe('escape');
  });

  test('should return lowercase as-is', () => {
    expect(normalizeKey('escape')).toBe('escape');
  });

  test('should handle mixed case', () => {
    expect(normalizeKey('EsCaPe')).toBe('escape');
  });
});

describe('canSelectTower', () => {
  test('should return true when placementState is None', () => {
    expect(canSelectTower({ placementState: PlacementState.None, gameState: 'playing' })).toBeTruthy();
  });

  test('should return false when placementState is Placing', () => {
    expect(canSelectTower({ placementState: PlacementState.Placing, gameState: 'playing' })).toBeFalsy();
  });

  test('should return false when placementState is Selecting', () => {
    expect(canSelectTower({ placementState: PlacementState.Selecting, gameState: 'playing' })).toBeFalsy();
  });
});

describe('canCancel', () => {
  test('should return true when placementState is Placing', () => {
    expect(canCancel({ placementState: PlacementState.Placing, gameState: 'playing' })).toBeTruthy();
  });

  test('should return true when placementState is Selecting', () => {
    expect(canCancel({ placementState: PlacementState.Selecting, gameState: 'playing' })).toBeTruthy();
  });

  test('should return false when placementState is None', () => {
    expect(canCancel({ placementState: PlacementState.None, gameState: 'playing' })).toBeFalsy();
  });
});

describe('canPause', () => {
  test('should return true when gameState is playing', () => {
    expect(canPause({ placementState: PlacementState.None, gameState: 'playing' })).toBeTruthy();
  });

  test('should return true when gameState is paused', () => {
    expect(canPause({ placementState: PlacementState.None, gameState: 'paused' })).toBeTruthy();
  });

  test('should return false when gameState is idle', () => {
    expect(canPause({ placementState: PlacementState.None, gameState: 'idle' })).toBeFalsy();
  });

  test('should return false when gameState is game_over', () => {
    expect(canPause({ placementState: PlacementState.None, gameState: 'game_over' })).toBeFalsy();
  });
});

describe('processHotkey', () => {
  test('should return tower selection when can select tower', () => {
    const result = processHotkey('1', { placementState: PlacementState.None, gameState: 'playing' });
    expect(result?.action).toEqual(HotkeyAction.SelectTower1);
    expect(result?.handled).toBeTruthy();
  });

  test('should return handled: false when cannot select tower', () => {
    const result = processHotkey('1', { placementState: PlacementState.Placing, gameState: 'playing' });
    expect(result?.handled).toBeFalsy();
  });

  test('should return cancel when can cancel', () => {
    const result = processHotkey('Escape', { placementState: PlacementState.Placing, gameState: 'playing' });
    expect(result?.action).toEqual(HotkeyAction.Cancel);
    expect(result?.handled).toBeTruthy();
  });

  test('should return handled: false when cannot cancel', () => {
    const result = processHotkey('Escape', { placementState: PlacementState.None, gameState: 'playing' });
    expect(result?.handled).toBeFalsy();
  });

  test('should return null for unknown key', () => {
    const result = processHotkey('F12', { placementState: PlacementState.None, gameState: 'playing' });
    expect(result).toBeNull();
  });
});

describe('isTowerHotkey', () => {
  test('should return true for SelectTower1', () => {
    expect(isTowerHotkey(HotkeyAction.SelectTower1)).toBeTruthy();
  });

  test('should return true for SelectTower2', () => {
    expect(isTowerHotkey(HotkeyAction.SelectTower2)).toBeTruthy();
  });

  test('should return true for SelectTower3', () => {
    expect(isTowerHotkey(HotkeyAction.SelectTower3)).toBeTruthy();
  });

  test('should return true for SelectTower4', () => {
    expect(isTowerHotkey(HotkeyAction.SelectTower4)).toBeTruthy();
  });

  test('should return true for SelectTower5', () => {
    expect(isTowerHotkey(HotkeyAction.SelectTower5)).toBeTruthy();
  });

  test('should return false for Cancel', () => {
    expect(isTowerHotkey(HotkeyAction.Cancel)).toBeFalsy();
  });

  test('should return false for Pause', () => {
    expect(isTowerHotkey(HotkeyAction.Pause)).toBeFalsy();
  });
});

describe('isCancelHotkey', () => {
  test('should return true for Cancel', () => {
    expect(isCancelHotkey(HotkeyAction.Cancel)).toBeTruthy();
  });

  test('should return false for SelectTower1', () => {
    expect(isCancelHotkey(HotkeyAction.SelectTower1)).toBeFalsy();
  });

  test('should return false for Pause', () => {
    expect(isCancelHotkey(HotkeyAction.Pause)).toBeFalsy();
  });
});

describe('isPauseHotkey', () => {
  test('should return true for Pause', () => {
    expect(isPauseHotkey(HotkeyAction.Pause)).toBeTruthy();
  });

  test('should return false for SelectTower1', () => {
    expect(isPauseHotkey(HotkeyAction.SelectTower1)).toBeFalsy();
  });

  test('should return false for Cancel', () => {
    expect(isPauseHotkey(HotkeyAction.Cancel)).toBeFalsy();
  });
});

describe('getHotkeyLabel', () => {
  test('should return "1" for SelectTower1', () => {
    expect(getHotkeyLabel(HotkeyAction.SelectTower1)).toBe('1');
  });

  test('should return "2" for SelectTower2', () => {
    expect(getHotkeyLabel(HotkeyAction.SelectTower2)).toBe('2');
  });

  test('should return "3" for SelectTower3', () => {
    expect(getHotkeyLabel(HotkeyAction.SelectTower3)).toBe('3');
  });

  test('should return "4" for SelectTower4', () => {
    expect(getHotkeyLabel(HotkeyAction.SelectTower4)).toBe('4');
  });

  test('should return "5" for SelectTower5', () => {
    expect(getHotkeyLabel(HotkeyAction.SelectTower5)).toBe('5');
  });

  test('should return "Esc" for Cancel', () => {
    expect(getHotkeyLabel(HotkeyAction.Cancel)).toBe('Esc');
  });

  test('should return "Space" for Pause', () => {
    expect(getHotkeyLabel(HotkeyAction.Pause)).toBe('Space');
  });
});

describe('getHotkeyDescription', () => {
  test('should return correct description for SelectTower1', () => {
    expect(getHotkeyDescription(HotkeyAction.SelectTower1)).toBe('Select Puffball Fungus');
  });

  test('should return correct description for SelectTower2', () => {
    expect(getHotkeyDescription(HotkeyAction.SelectTower2)).toBe('Select Orchid Trap');
  });

  test('should return correct description for SelectTower3', () => {
    expect(getHotkeyDescription(HotkeyAction.SelectTower3)).toBe('Select Venus Flytower');
  });

  test('should return correct description for SelectTower4', () => {
    expect(getHotkeyDescription(HotkeyAction.SelectTower4)).toBe('Select Bioluminescent Shroom');
  });

  test('should return correct description for SelectTower5', () => {
    expect(getHotkeyDescription(HotkeyAction.SelectTower5)).toBe('Select Stinkhorn Line');
  });

  test('should return "Cancel" for Cancel', () => {
    expect(getHotkeyDescription(HotkeyAction.Cancel)).toBe('Cancel');
  });

  test('should return "Pause/Resume" for Pause', () => {
    expect(getHotkeyDescription(HotkeyAction.Pause)).toBe('Pause/Resume');
  });
});

console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
if (failed > 0) {
  process.exit(1);
}

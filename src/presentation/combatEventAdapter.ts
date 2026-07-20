import type { GameEvent } from '../systems/gameEvents';
import type { Vec2 } from '../utils/vec2';
import type { CombatEffectKind } from './combatEffectModel';

/** A tower position view borrowed only while an event batch is processed. */
export type CombatEffectTowerPosition = Readonly<{
  id: number;
  position: Readonly<Vec2>;
}>;

/** Reusable world lookup state; callers retain ownership of the tower array. */
export type CombatEffectContextBuffer = {
  towerPositions: readonly CombatEffectTowerPosition[];
  kernelX: number;
  kernelY: number;
};

/** Semantic output tags written into caller-owned command storage. */
export type CombatEffectCommandKind = CombatEffectKind | 'network_triggered';

/** Mutable scratch storage reused across events; values are valid until the next write. */
export type CombatEffectCommandBuffer = {
  kind: CombatEffectCommandKind | null;
  x: number;
  y: number;
  intensity: number;
  seed: number;
  fromId: number | null;
  toId: number;
};

/** Allocates one command buffer for repeated allocation-free adapter writes. */
export function createCombatEffectCommandBuffer(): CombatEffectCommandBuffer {
  return { kind: null, x: 0, y: 0, intensity: 0, seed: 0, fromId: null, toId: -1 };
}

/** Allocates one mutable context buffer whose borrowed references may be replaced between batches. */
export function createCombatEffectContextBuffer(): CombatEffectContextBuffer {
  return { towerPositions: [], kernelX: 0, kernelY: 0 };
}

function prepareImpact(
  command: CombatEffectCommandBuffer,
  kind: CombatEffectKind,
  position: Readonly<Vec2>,
): CombatEffectKind {
  command.kind = kind;
  command.x = position.x;
  command.y = position.y;
  command.fromId = null;
  command.toId = -1;
  return kind;
}

function findTowerPosition(
  towerPositions: readonly CombatEffectTowerPosition[],
  towerId: number,
): Readonly<Vec2> | undefined {
  for (const tower of towerPositions) {
    if (tower.id === towerId) return tower.position;
  }
  return undefined;
}

function assertNever(value: never): never {
  throw new RangeError(`Unhandled game event: ${String(value)}`);
}

/**
 * Writes one semantic command without allocation.
 * The returned tag and all buffer fields remain valid until the next call using that buffer.
 */
export function writeCombatEffectCommand(
  event: GameEvent,
  context: CombatEffectContextBuffer,
  command: CombatEffectCommandBuffer,
): CombatEffectCommandKind | null {
  command.kind = null;
  switch (event.type) {
    case 'layer_broken':
      command.intensity = 5 + event.layersBroken * 3;
      command.seed = event.timestamp + event.enemyId;
      return prepareImpact(command, 'layer_broken', event.position);
    case 'enemy_marked':
    case 'enemy_slowed':
    case 'enemy_revealed':
      command.intensity = 6;
      command.seed = event.timestamp + event.enemyId;
      return prepareImpact(command, event.type, event.position);
    case 'trait_suppressed':
      command.intensity = 4;
      command.seed = event.timestamp + event.enemyId;
      return prepareImpact(command, 'trait_suppressed', event.position);
    case 'network_triggered':
      command.kind = 'network_triggered';
      command.fromId = event.sourceTowerId;
      command.toId = event.targetTowerId;
      return command.kind;
    case 'seeded_payload_detonated':
      command.intensity = 8;
      command.seed = event.timestamp + event.targetEnemyId;
      return prepareImpact(command, 'seeded_detonated', event.position);
    case 'tower_evolved': {
      const position = findTowerPosition(context.towerPositions, event.towerId);
      if (position === undefined) return null;
      command.intensity = 10;
      command.seed = event.timestamp + event.towerId;
      return prepareImpact(command, 'tower_evolved', position);
    }
    case 'enemy_leaked':
      command.intensity = 0;
      command.seed = event.timestamp + event.enemyId;
      command.kind = 'kernel_damaged';
      command.x = context.kernelX;
      command.y = context.kernelY;
      command.fromId = null;
      command.toId = -1;
      return command.kind;
    case 'death':
      command.intensity = 12;
      command.seed = event.timestamp;
      return prepareImpact(command, 'enemy_defeated', event.position);
    case 'area_hit':
      command.intensity = 12;
      command.seed = event.timestamp;
      return prepareImpact(command, 'area_impact', event.position);
    case 'hit':
      if (event.effectType === 'slow' || event.effectType === 'reveal_camo') return null;
      command.intensity = event.effectType === 'instakill' ? 9 : event.effectType === 'poison' ? 5 : 3;
      command.seed = event.timestamp;
      return prepareImpact(
        command,
        event.effectType === 'poison'
          ? 'enemy_poisoned'
          : event.effectType === 'instakill'
            ? 'enemy_executed'
            : 'enemy_struck',
        event.position,
      );
    case 'network_connection_created':
      command.kind = 'network_triggered';
      command.fromId = event.sourceTowerId;
      command.toId = event.towerId;
      return command.kind;
    case 'trait_broken':
    case 'tower_placed':
    case 'tower_matured':
    case 'wave_started':
    case 'wave_completed':
    case 'victory':
    case 'defeat':
      return null;
    default:
      return assertNever(event);
  }
}

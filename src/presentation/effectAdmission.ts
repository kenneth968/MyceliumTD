import type { CombatEffectCommandKind } from './combatEventAdapter';
import {
  EffectPriority,
  selectEffectAdmissionIndex,
  type EffectPriority as EffectPriorityValue,
} from '../systems/performanceBudget';

type MutableEffectAdmissionSlot = {
  active: boolean;
  priority: EffectPriorityValue;
  admissionSequence: number;
};

export function getEffectPriority(kind: CombatEffectCommandKind | null): EffectPriorityValue {
  switch (kind) {
    case 'network_triggered':
      return EffectPriority.Standard;
    case 'layer_broken':
    case 'tower_evolved':
    case 'kernel_damaged':
      return EffectPriority.CombatCritical;
    case null:
    case 'enemy_marked':
    case 'enemy_slowed':
    case 'trait_suppressed':
    case 'enemy_revealed':
    case 'seeded_detonated':
    case 'enemy_defeated':
    case 'area_impact':
    case 'enemy_poisoned':
    case 'enemy_struck':
    case 'enemy_executed':
      return EffectPriority.Standard;
    default:
      kind satisfies never;
      return EffectPriority.Standard;
  }
}

export class EffectAdmissionCursor {
  private sequence = 0;

  admit<T extends MutableEffectAdmissionSlot>(
    slots: readonly T[],
    priority: EffectPriorityValue,
  ): T | null {
    const index = selectEffectAdmissionIndex(slots, priority);
    if (index === null) return null;
    const slot = slots[index];
    this.mark(slot, priority);
    return slot;
  }

  refresh(slot: MutableEffectAdmissionSlot): void {
    this.mark(slot, slot.priority);
  }

  reset(): void {
    this.sequence = 0;
  }

  private mark(slot: MutableEffectAdmissionSlot, priority: EffectPriorityValue): void {
    this.sequence++;
    slot.priority = priority;
    slot.admissionSequence = this.sequence;
  }
}

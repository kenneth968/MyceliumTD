import { TowerType } from '../entities/tower';
import type { Vec2 } from '../utils/vec2';
import type { GameEvent } from './gameEvents';
import {
  OnboardingEvent,
  OnboardingStep,
  reduceOnboarding,
  type OnboardingState,
} from './onboarding';

export type OnboardingIntegrationResult = Readonly<{
  state: OnboardingState;
  completionBloom: Readonly<Vec2> | null;
}>;

export type DrainedOnboardingEvents = OnboardingIntegrationResult & Readonly<{
  events: readonly GameEvent[];
}>;

type EventDrain = () => readonly GameEvent[];
type EventConsumer = (events: readonly GameEvent[]) => void;

export function applyGameEventsToOnboarding(
  state: OnboardingState,
  events: readonly GameEvent[],
): OnboardingState {
  return integrateGameEventsWithOnboarding(state, events).state;
}

export function integrateGameEventsWithOnboarding(
  state: OnboardingState,
  events: readonly GameEvent[],
): OnboardingIntegrationResult {
  const event = findRelevantEvent(state, events);
  if (event === null) return Object.freeze({ state, completionBloom: null });

  const nextState = reduceOnboarding(state, { type: event.onboardingType });
  const completionBloom = event.position === null
    ? null
    : Object.freeze({ ...event.position });
  return Object.freeze({ state: nextState, completionBloom });
}

export function drainGameEventsForOnboarding(
  state: OnboardingState,
  drainEvents: EventDrain,
  consumeEvents: EventConsumer,
): DrainedOnboardingEvents {
  const events = drainEvents();
  consumeEvents(events);
  return Object.freeze({
    ...integrateGameEventsWithOnboarding(state, events),
    events,
  });
}

export function isNewOnboardingCompletion(
  previous: OnboardingState,
  next: OnboardingState,
): boolean {
  return previous.step !== OnboardingStep.Complete && next.step === OnboardingStep.Complete;
}

type RelevantEvent = Readonly<{
  onboardingType: OnboardingEvent;
  position: Readonly<Vec2> | null;
}>;

function findRelevantEvent(
  state: OnboardingState,
  events: readonly GameEvent[],
): RelevantEvent | null {
  switch (state.step) {
    case OnboardingStep.PlaceSporecap: {
      const placed = events.find(
        event => event.type === 'tower_placed' && event.towerType === TowerType.Sporecap,
      );
      return placed === undefined
        ? null
        : { onboardingType: OnboardingEvent.SporecapPlaced, position: null };
    }
    case OnboardingStep.StartFirstWave: {
      const completed = events.some(
        event => event.type === 'wave_completed' && event.waveNumber === 1,
      );
      return completed
        ? { onboardingType: OnboardingEvent.FirstWaveCompleted, position: null }
        : null;
    }
    case OnboardingStep.CreateConnection: {
      const connection = events.find(event => event.type === 'network_connection_created');
      return connection === undefined
        ? null
        : {
            onboardingType: OnboardingEvent.UsefulConnectionCreated,
            position: connection.position,
          };
    }
    case OnboardingStep.Disabled:
    case OnboardingStep.ReviewThreat:
    case OnboardingStep.Complete:
      return null;
    default:
      state.step satisfies never;
      return null;
  }
}

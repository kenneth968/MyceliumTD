import { TowerType } from '../entities/tower';
import { vec2Distance, type Vec2 } from '../utils/vec2';
import type { GameEvent } from './gameEvents';
import {
  OnboardingEvent,
  OnboardingStep,
  reduceOnboarding,
  type OnboardingState,
} from './onboarding';
import { MYCELIUM_NETWORK_REACH } from './myceliumNetworkConfig';

export type OnboardingIntegrationResult = Readonly<{
  state: OnboardingState;
  completionBloom: Readonly<Vec2> | null;
  completionCause: 'connection' | null;
}>;

export type DrainedOnboardingEvents = OnboardingIntegrationResult & Readonly<{
  events: readonly GameEvent[];
}>;

type EventDrain = () => readonly GameEvent[];
type EventConsumer = (events: readonly GameEvent[]) => void;
type PresentationConsumers = Readonly<{
  combat: EventConsumer;
  audio: EventConsumer;
  metrics: EventConsumer;
}>;

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
  if (event === null) {
    return Object.freeze({ state, completionBloom: null, completionCause: null });
  }

  const nextState = reduceOnboarding(state, {
    type: event.onboardingType,
    towerId: event.towerId ?? undefined,
    towerPosition: event.towerPosition ?? undefined,
  });
  const completionBloom = event.position === null
    ? null
    : Object.freeze({ ...event.position });
  const completionCause = event.onboardingType === OnboardingEvent.UsefulConnectionCreated
    ? 'connection'
    : null;
  return Object.freeze({ state: nextState, completionBloom, completionCause });
}

export function drainGameEventsForOnboarding(
  state: OnboardingState,
  drainEvents: EventDrain,
  consumeEvents: EventConsumer,
): DrainedOnboardingEvents {
  const events = drainEvents();
  consumeEvents(events);
  return createDrainedResult(state, events);
}

/** Drains once and shares the exact readonly batch with combat, audio, and onboarding. */
export function drainGameEventsForPresentation(
  state: OnboardingState,
  drainEvents: EventDrain,
  consumers: PresentationConsumers,
): DrainedOnboardingEvents {
  const events = drainEvents();
  consumers.combat(events);
  consumers.audio(events);
  consumers.metrics(events);
  return createDrainedResult(state, events);
}

function createDrainedResult(
  state: OnboardingState,
  events: readonly GameEvent[],
): DrainedOnboardingEvents {
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
  towerId?: number;
  towerPosition?: Readonly<Vec2>;
}>;

function findRelevantEvent(
  state: OnboardingState,
  events: readonly GameEvent[],
): RelevantEvent | null {
  switch (state.step) {
    case OnboardingStep.PlaceSporecap: {
      const placed = events.find((
        event,
      ): event is Extract<GameEvent, { type: 'tower_placed' }> =>
        event.type === 'tower_placed'
          && event.towerType === TowerType.Sporecap
          && events.some(connection => (
            connection.type === 'network_connection_created'
              && connection.towerId === event.towerId
          )),
      );
      return placed === undefined
        ? null
        : {
            onboardingType: OnboardingEvent.SporecapPlaced,
            position: null,
            towerId: placed.towerId,
            towerPosition: placed.position,
          };
    }
    case OnboardingStep.StartFirstWave: {
      const started = events.some(
        event => event.type === 'wave_started' && event.waveNumber === 1,
      );
      return started
        ? { onboardingType: OnboardingEvent.FirstWaveStarted, position: null }
        : null;
    }
    case OnboardingStep.ObserveFirstWave: {
      const completed = events.some(
        event => event.type === 'wave_completed' && event.waveNumber === 1,
      );
      return completed
        ? { onboardingType: OnboardingEvent.FirstWaveCompleted, position: null }
        : null;
    }
    case OnboardingStep.CreateConnection: {
      const firstTowerPosition = state.firstTowerPosition;
      const connection = events.find((
        event,
      ): event is Extract<GameEvent, { type: 'network_connection_created' }> =>
        event.type === 'network_connection_created'
          && (
            event.sourceTowerId === state.firstTowerId
            || (
              event.sourceTowerId === null
              && firstTowerPosition !== null
              && events.some(placed => (
                placed.type === 'tower_placed'
                && placed.towerId === event.towerId
                && vec2Distance(firstTowerPosition, placed.position)
                  <= MYCELIUM_NETWORK_REACH.tower
              ))
            )
          ),
      );
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

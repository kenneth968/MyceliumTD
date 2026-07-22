import { strict as assert } from 'assert';
import { VISUAL_THEME } from '../presentation/visualTheme';
import {
  PERFORMANCE_OVERLAY_LAYOUT,
  createPerformanceOverlayRows,
} from '../presentation/performanceBudgetOverlayPainter';
import { RELEASE_HUD_LAYOUT } from './releaseHudLayout';
import {
  EffectPriority,
  PerformanceBudgetMonitor,
  RELEASE_PERFORMANCE_BUDGET,
  createPerformanceOverlayData,
  evaluatePerformanceBudget,
  exposePerformanceBudgetInDevelopment,
  isPerformanceBudgetDevelopmentEnabled,
  selectEffectAdmissionIndex,
  shouldTogglePerformanceOverlay,
  type PerformanceBudgetHost,
} from './performanceBudget';

// Given ten seconds of frames near 60 FPS
const healthyFrameDurations = Array.from({ length: 600 }, () => 16.67);

// When the release performance budget evaluates the window
const healthyReport = evaluatePerformanceBudget(healthyFrameDurations);

// Then the average clears the release threshold
assert.equal(healthyReport.passes, true);
assert(healthyReport.averageFps >= RELEASE_PERFORMANCE_BUDGET.minimumAverageFps);

// Given a frame window with more than two seconds continuously below 45 FPS
const sustainedDropFrameDurations = [
  ...Array.from({ length: 120 }, () => 16.67),
  ...Array.from({ length: 180 }, () => 25),
];

// When the same budget evaluates the dropped window
const sustainedDropReport = evaluatePerformanceBudget(sustainedDropFrameDurations);

// Then the sustained drop fails the release gate
assert.equal(sustainedDropReport.passes, false);
assert.equal(sustainedDropReport.hasSustainedDrop, true);

// Given a sub-two-second drop followed by one healthy frame
const interruptedDropFrameDurations = [
  ...Array.from({ length: 79 }, () => 25),
  16.67,
];

// When the drop detector evaluates the sequence
const interruptedDropReport = evaluatePerformanceBudget(interruptedDropFrameDurations);

// Then it does not report a sustained drop
assert.equal(interruptedDropReport.hasSustainedDrop, false);

// Given an old slow interval outside the trailing ten-second window
const expiredDropFrameDurations = [
  ...Array.from({ length: 80 }, () => 25),
  ...Array.from({ length: 599 }, () => 16.67),
];

// When the release window evaluates only its newest frames
const expiredDropReport = evaluatePerformanceBudget(expiredDropFrameDurations);

// Then the expired drop does not fail the current window
assert.equal(expiredDropReport.hasSustainedDrop, false);
assert.equal(expiredDropReport.passes, true);

// Given the release budget constants
const releaseBudget = RELEASE_PERFORMANCE_BUDGET;

// When their effect caps are inspected
const releaseCaps = [releaseBudget.maximumParticles, releaseBudget.maximumTransientEffects];

// Then they exactly reuse the visual-theme caps
assert.deepEqual(releaseCaps, [VISUAL_THEME.maxParticles, VISUAL_THEME.maxTransientEffects]);

// Given a deterministic monitor receiving active, paused, and hidden frames
const monitor = new PerformanceBudgetMonitor();

// When timestamps cross ignored lifecycle states
monitor.recordFrame({ timestampMilliseconds: 0, paused: false, hidden: false, activeParticles: 4, activeTransientEffects: 2 });
monitor.recordFrame({ timestampMilliseconds: 16.67, paused: false, hidden: false, activeParticles: 8, activeTransientEffects: 3 });
monitor.recordFrame({ timestampMilliseconds: 1_000, paused: true, hidden: false, activeParticles: 160, activeTransientEffects: 64 });
monitor.recordFrame({ timestampMilliseconds: 2_000, paused: false, hidden: false, activeParticles: 10, activeTransientEffects: 5 });
monitor.recordFrame({ timestampMilliseconds: 3_000, paused: false, hidden: true, activeParticles: 150, activeTransientEffects: 60 });
monitor.recordFrame({ timestampMilliseconds: 4_000, paused: false, hidden: false, activeParticles: 12, activeTransientEffects: 6 });
monitor.recordFrame({ timestampMilliseconds: 4_016.67, paused: false, hidden: false, activeParticles: 14, activeTransientEffects: 7 });
const monitoredReport = monitor.getReport();

// Then only the two eligible deltas contribute and hidden/paused peaks are ignored
assert.equal(monitoredReport.sampleCount, 2);
assert(monitoredReport.currentFps > 59 && monitoredReport.currentFps < 61);
assert(monitoredReport.averageFps > 59 && monitoredReport.averageFps < 61);
assert.equal(monitoredReport.activeParticles, 14);
assert.equal(monitoredReport.activeTransientEffects, 7);
assert.equal(monitoredReport.peakParticles, 14);
assert.equal(monitoredReport.peakTransientEffects, 7);

// Given the performance overlay key chord
const overlayChord = { key: 'F3', shiftKey: true };

// When toggle eligibility is evaluated
const toggleDecisions = [
  shouldTogglePerformanceOverlay(overlayChord, true),
  shouldTogglePerformanceOverlay({ key: 'F3', shiftKey: false }, true),
  shouldTogglePerformanceOverlay(overlayChord, false),
];

// Then only Shift+F3 in an enabled development session toggles it
assert.deepEqual(toggleDecisions, [true, false, false]);

// Given local, missing-query, and remote development locations
const enabledLocation = { hostname: 'localhost', search: '?performanceBudget=1' };
const missingQueryLocation = { hostname: 'localhost', search: '' };
const remoteLocation = { hostname: 'example.com', search: '?performanceBudget=1' };

// When the explicit development gate evaluates each location
const gateDecisions = [
  isPerformanceBudgetDevelopmentEnabled(enabledLocation),
  isPerformanceBudgetDevelopmentEnabled(missingQueryLocation),
  isPerformanceBudgetDevelopmentEnabled(remoteLocation),
  isPerformanceBudgetDevelopmentEnabled(undefined),
];

// Then only the opted-in localhost is enabled
assert.deepEqual(gateDecisions, [true, false, false, false]);

// Given hosts inside and outside the explicit development gate
const enabledHost: PerformanceBudgetHost = { location: enabledLocation };
const missingQueryHost: PerformanceBudgetHost = { location: missingQueryLocation };
const remoteHost: PerformanceBudgetHost = { location: remoteLocation };
const missingLocationHost: PerformanceBudgetHost = {};

// When read-only snapshot access is conditionally exposed
exposePerformanceBudgetInDevelopment(enabledHost, () => monitoredReport);
exposePerformanceBudgetInDevelopment(missingQueryHost, () => monitoredReport);
exposePerformanceBudgetInDevelopment(remoteHost, () => monitoredReport);
exposePerformanceBudgetInDevelopment(missingLocationHost, () => monitoredReport);

// Then only the opted-in local host receives the snapshot reader
assert.deepEqual(enabledHost.myceliumPerformanceBudget?.(), monitoredReport);
assert.equal(missingQueryHost.myceliumPerformanceBudget, undefined);
assert.equal(remoteHost.myceliumPerformanceBudget, undefined);
assert.equal(missingLocationHost.myceliumPerformanceBudget, undefined);

// Given a current report for the Canvas development overlay
const overlayData = createPerformanceOverlayData(monitoredReport);

// When the painter receives that data
const interceptsPointerInput = overlayData.interceptsPointerInput;

// Then the overlay explicitly remains outside gameplay hit testing
assert.equal(interceptsPointerInput, false);

// Given a full pool with one ambient and one standard effect
const admissionSlots = [
  { active: true, priority: EffectPriority.Ambient, admissionSequence: 2 },
  { active: true, priority: EffectPriority.Standard, admissionSequence: 1 },
];

// When a combat-critical effect requests admission
const criticalAdmissionIndex = selectEffectAdmissionIndex(admissionSlots, EffectPriority.CombatCritical);

// Then it replaces the least-important ambient slot
assert.equal(criticalAdmissionIndex, 0);

// Given a full pool containing only combat-critical effects
const protectedSlots = [
  { active: true, priority: EffectPriority.CombatCritical, admissionSequence: 1 },
  { active: true, priority: EffectPriority.CombatCritical, admissionSequence: 2 },
];

// When an ambient effect requests admission
const ambientAdmissionIndex = selectEffectAdmissionIndex(protectedSlots, EffectPriority.Ambient);

// Then the ambient effect is skipped
assert.equal(ambientAdmissionIndex, null);

// Given the five-row development overlay model
const overlayRows = createPerformanceOverlayRows(overlayData);

// When its fixed Canvas footprint is compared with the release HUD
const overlayLayout = PERFORMANCE_OVERLAY_LAYOUT;

// Then it stays within the existing right-side tower-panel region
assert.equal(overlayRows.length, 5);
assert.equal(overlayLayout.x, RELEASE_HUD_LAYOUT.towerPanel.x);
assert.equal(overlayLayout.y, RELEASE_HUD_LAYOUT.towerPanel.y);
assert(overlayLayout.width <= RELEASE_HUD_LAYOUT.towerPanel.width);
assert(overlayLayout.height <= RELEASE_HUD_LAYOUT.towerPanel.height);

console.log('Performance budget tests passed');

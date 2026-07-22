# MyceliumTD Interface Design System

This document extracts the interface language already present in MyceliumTD and sets the contract for the one-map release. It is a preservation and consolidation guide, not a visual redesign.

## 1. Atmosphere & Identity

MyceliumTD is a dark, bioluminescent garden defense game. The interface should feel grown into the battlefield: near-black fungal surfaces, luminous mycelium green, lilac network energy, warm nutrient gold, and restrained organic motion.

The release surface is a fixed `1280 × 720` HTML5 Canvas. Narrow viewports may crop or scroll and are diagnostic only. All required HUD, modal, onboarding, and interaction states must remain readable and non-overlapping at the contractual canvas size.

Preserve these qualities:

- gameplay remains the visual focus;
- panels are compact, translucent, and high contrast;
- selection, network, threat, and lock states never rely on color alone;
- animation communicates state and direction without obscuring input targets;
- player-facing copy uses game terms, never internal identifiers.

## 2. Color

Use the existing palette semantically. New interface code should import or define named tokens close to the focused renderer instead of adding anonymous color literals throughout `main.ts`.

The Garden Path release environment uses the following canonical world tokens. These values supersede the older representative Canvas/path colors when rendering the battlefield, while existing UI tokens remain valid for untouched surfaces.

| Garden Path role | Value | Use |
| --- | --- | --- |
| Living dark | `#07130F` | Primary battlefield ground |
| Lifted dark | `#0D2119` | Subtle terrain depth and moss bed |
| Path body | `#3A322C` | Organic route fill |
| Path edge | `#74604E` | Wider route rim and entrance landmark |
| Moss | `#2F6B45` | Restrained terrain patches |
| Active mycelium | `#6FFFC1` | Network roots, direction, and connected state |
| Dormant mycelium | `#315E4B` | Background root structure |
| Kernel core | `#D8FFF1` | Brightest battlefield focal point |
| Kernel machine | `#6B7C89` | Structural Kernel shell |
| Warning | `#FFB84D` | Escalating but non-terminal threat |
| Danger | `#FF6B6B` | Leaks, invalid state, and terminal threat |
| Garden text | `#F1FFF8` | Essential world labels |
| Garden muted text | `#A6C7B5` | Supporting world labels |

| Role | Representative value | Use |
| --- | --- | --- |
| Canvas | `#0f0f1a` | Battlefield background |
| Deep surface | `#0a0a14` | Menus and modal foundations |
| Page surface | `#1a1a2e` | Browser surround |
| Primary text | `#ffffff` | Essential labels and values |
| Secondary text | `#b8c7d9` | Descriptions and metadata |
| Muted text | `#888888` | Inactive supporting information only |
| Nutrient gold | `#ffd700` | Currency, emphasis, selection, headings |
| Mycelium green | `#4ade80` | Connection, primary action, positive state |
| Affordable green | `#4caf50` | Available purchases and confirmations |
| Network lilac | `#9b59b6` | Sporecap and relay identity |
| Danger red | `#f87171` | Leaks, invalid placement, destructive state |

State colors must be paired with words, icons, outlines, line styles, or silhouettes. Threat traits require both shape and color. Disabled text must retain readable contrast against its surface.

Inherited debt: the current code contains near-duplicate reds/greens, mismatched purchase/in-world tower colors, and hard-coded palette values across renderers. Consolidate only when a touched slice needs it; do not broaden UX work into a full palette migration.

## 3. Typography

Canvas text uses the system sans-serif stack and should remain crisp, direct, and compact. The browser surround uses Segoe UI/Tahoma; Canvas uses `sans-serif` today. No new web font is required.

| Size | Role |
| --- | --- |
| 64px bold | Menu or terminal title |
| 40–48px bold | Pause and wave announcement |
| 24–36px | Major modal information |
| 18px | HUD value, panel title, primary menu action |
| 14–16px | Control label and primary body copy |
| 10–13px | Card metadata, hotkeys, hints |

Use sentence case for instructions and concise title case for named game objects. Tutorial messages are one sentence. Avoid truncating names, costs, hotkeys, or lock reasons; tactical descriptions may be shortened only when the complete meaning remains apparent.

Inherited debt: there are no typography tokens, formal line-height rules, or fallback measurement strategy. New layout tests should protect important copy from clipping.

## 4. Spacing & Layout

Use a 4px base cadence, favoring `8`, `12`, `16`, `20`, `24`, `32`, and `40` for gaps and padding. Existing exceptions may remain when behavior is already locked.

The release HUD owns one immutable geometry source for the fixed Canvas. The intended regions are:

- top bar: `x 0, y 0, w 1280, h 56`;
- playfield: `x 0, y 56, w 960, h 544`;
- selected-tower panel: `x 968, y 72, w 296, h 360`;
- wave preview: `x 968, y 440, w 296, h 160`;
- tower bar container: `x 0, y 608, w 1280, h 112`;
- six tower cards: `x 16 + 156 × index, y 616, w 148, h 88`;
- start-wave action: `x 952, y 624, w 312, h 72`.

Containment overlap is permitted: cards and the start-wave action live inside the tower-bar region. Interactive siblings must never overlap. Render geometry and hit-test geometry must come from the same layout contract.

## 5. Components

The existing typed `*Render.ts` and render-data modules are the repository's reusable semantic component layer: they define presentation data, geometry, style, visibility, and animation state. Focused `*Painter.ts` modules are the approved extraction path for concrete Canvas drawing of a bounded visual responsibility; `main.ts` coordinates those painters in the required layer order while retaining lifecycle and input orchestration. New work must keep geometry and state in the semantic layer, avoid duplicating them in painters or input code, and progressively extract concrete drawing from `main.ts`.

Current component map:

| Component module | Current variants and states |
| --- | --- |
| `livesMoneyDisplayRender.ts` | Hidden/visible/fading lives and nutrient readout |
| `waveProgressRender.ts` | Wave progress, count, and transition visibility |
| `enemyCountDisplayRender.ts` | Active enemy count with visibility/fade state |
| `towerPurchaseRender.ts` | Six affordable, unaffordable, and selected tower cards |
| `towerInfoPanel.ts` | Seedling/Mature/Evolved identity; action enabled, disabled, selected, connection-required, insufficient-nutrients, and complete states |
| `placementPreview.ts` | Valid/invalid ghost, connection proposal, range, and targeting default/selected |
| `pauseMenuRender.ts` | Hidden, entering, visible, exiting; button enabled/disabled/hover intent |
| `gameOverVictoryRender.ts` | Hidden, defeat, victory; modeled restart/quit actions |
| `waveAnnouncementRender.ts` | Hidden, incoming, active, complete, outgoing |
| `mapSelectionRender.ts` | Hidden, entering, visible, exiting, hovered, locked, selected; release-disabled |
| `towerRender.ts` | Growth stage, selection, firing, targeting, and generic special-effect presentation |
| `enemyRender.ts` | Enemy identity, trait/status overlays, damage/death animation data |
| `projectileRender.ts` | Projectile/evolution profile and impact presentation |
| `healthBarRender.ts` | Health fractions, damage state, trait/status markers, and visibility |
| `heroRender.ts` | Hero identity, selection, movement/combat state, ability/readiness presentation |

Required interface primitives and states:

- HUD readout: hidden, entering, visible, exiting;
- action button: default, hovered/focused, pressed, disabled, hidden;
- purchase card: affordable, unaffordable, selected;
- selected-tower card: enabled, disabled, selected, connection-required, insufficient-nutrients, evolution-complete;
- targeting control: default, selected;
- tutorial banner: hidden or one active contextual step, dismissible, replayable;
- pause modal: hidden, entering, visible, exiting;
- terminal modal: hidden, defeat, victory, with explicit restart and quit actions;
- wave preview: intermission summary with enemy counts, trait symbols/labels, and nutrient reward.

Modal and tutorial overlays consume pointer and keyboard input before world actions. Terminal and pause surfaces render after the base HUD so later layers cannot cover them.

## 6. Motion & Interaction

Motion conventions:

- HUD fades: about 150ms;
- pause/modal transitions: about 200–500ms;
- announcements: short entrance, readable hold, short exit;
- ambient pulses: subtle sine motion for spores, networks, fields, and selected units;
- use elapsed time rather than frame-count increments for new animation;
- do not animate input geometry;
- honor reduced-motion preferences when a browser preference bridge is introduced.

Ambient and transient effects are intentionally capped: no more than 48 ambient spores, 24 particles for one impact, 160 total particles, or 64 simultaneous transient effects. Active network lines use a 3px base stroke and the Garden Path uses a 34px path body. Effects may clarify state or impact, but may not compete with unit silhouettes.

Interaction conventions:

- render and hit-test geometry share one typed layout source;
- hover/focus/selected/disabled states remain visually distinct;
- modal and tutorial input precedes world input;
- tutorial progress consumes confirmed simulation events, not raw clicks.

Inherited debt: several modeled scale/rotation values are not applied, menu motion is frame-rate-dependent, and no reduced-motion path exists. These are explicit follow-up items, not a reason to expand the onboarding slice.

## 7. Depth & Surface

Use painter order deliberately: battlefield layers first, then HUD, then blocking overlays. Depth comes from translucent surfaces, bright rims, wider glow under-strokes, concentric rings, and restrained `shadowBlur`.

The Garden Path environment order is `background → roots/moss → path edge → path fill → mycelium → fields → towers/enemies → projectiles/effects → HUD`. The Kernel is the world focal point and receives the brightest value. Root structure and mycelium remain beneath gameplay units. Visual priority is always `silhouette readability → gameplay-state communication → impact → atmosphere`.

The world-to-overlay order is path, fields, payloads, network, placement, towers, enemies, projectiles, particles, health, selection, HUD, then blocking modals. Terminal and pause surfaces render after the base HUD so later layers cannot cover them.

Panels use near-black translucent fills with a tonal border; selection and priority actions receive a brighter rim or glow. Avoid large opaque cards that detach the UI from the battlefield. Shadows and glows must not reduce label contrast or expand hit regions.

Inherited debt: the current terminal layer is drawn before later HUD elements, and concrete Canvas drawing remains partially concentrated in the oversized `main.ts`.

## 8. Accessibility Constraints & Accepted Debt

Every important state needs at least two cues. Examples: connection uses text plus link/halo; invalid placement uses label plus outline; traits use shape plus color plus a readable name; selected/locked cards use border, fill, and text.

Keyboard and pointer routes must share the same modal precedence. Keep the persistent hotkey legend and add discoverable tutorial skip/replay controls. Minimum primary targets should approach 44px where the fixed layout permits it; the start-wave action and cards exceed that threshold.

Canvas accessibility debt is inherited: the Canvas lacks fallback content, an accessible name, focusability, focus indication, and a semantic DOM mirror. New UI copy must nevertheless remain plain-language, high-contrast, and fully represented in render data so a future DOM mirror is possible.

Accepted debt for this slice also includes distributed raw colors, mismatched purchase/in-world tower colors, oversized `main.ts`/`gameRunner.ts`, missing reduced-motion support, and modeled render states that concrete drawing ignores. New responsibilities must be extracted into focused modules; broad remediation is outside this slice.

### Verification contract

All UI changes require logic/layout tests, TypeScript checks, a production build, and fresh browser observation at the fixed Canvas size. Capture and independently review these eight states on the same build:

1. Main menu.
2. Contextual onboarding.
3. Intermission with wave preview.
4. Active combat.
5. Tower selection and evolution.
6. Pause.
7. Defeat.
8. Victory.

The stop condition is no critical or important functional/fidelity finding, no interactive overlap, no internal enum value in player-facing copy, and no gameplay input leaking through a blocking surface. Narrow captures are diagnostic and do not replace the fixed-size baseline.

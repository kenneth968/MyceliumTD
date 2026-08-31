# Playable vertical-slice gate

This is the working definition of a playable MyceliumTD vertical slice. It is
the scope gate for [the report-derived backlog](https://github.com/kenneth968/MyceliumTD/issues/22).

## Required before calling the slice playable

- One selected map is polished into a complete encounter, with its intended
  beats and presentation ([#6](https://github.com/kenneth968/MyceliumTD/issues/6)).
- The map is playable through all ten waves, with threat pacing and actionable
  player hints ([#20](https://github.com/kenneth968/MyceliumTD/issues/20)).
- Players can read lives, resources, wave state, and useful counter guidance
  while making tower decisions ([#2](https://github.com/kenneth968/MyceliumTD/issues/2)).
- A clear progression objective is present, including a medal or mastery goal
  ([#3](https://github.com/kenneth968/MyceliumTD/issues/3)).
- A fresh checkout can build, serve, and play in a browser using the documented
  local path, with no missing audio assets ([#9](https://github.com/kenneth968/MyceliumTD/issues/9),
  [#10](https://github.com/kenneth968/MyceliumTD/issues/10)).
- The supported build, typecheck, and fast-test gate passes in CI
  ([#11](https://github.com/kenneth968/MyceliumTD/issues/11)).

Placeholder visuals are allowed when they do not prevent players from reading
the map, threats, tower actions, or game state.

## Explicitly deferred

- Multiplayer
- Modding API
- Deep metaprogression
- Full save/load UX beyond the decision tracked in [#15](https://github.com/kenneth968/MyceliumTD/issues/15)
- Hero system ([#18](https://github.com/kenneth968/MyceliumTD/issues/18))
- AI/ML-driven agents

## PR gate

Each vertical-slice PR must name the requirement above that it advances and
include focused test or manual-play evidence. Work outside this definition is
deferred unless the slice scope is deliberately changed here first.

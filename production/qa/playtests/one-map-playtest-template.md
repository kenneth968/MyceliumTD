# Mycelium TD Blind Playtest — Session __

- Build identifier:
- Date and device:
- Tester has not received gameplay instruction: Yes / No
- Observer may fix technical setup but may not explain controls, towers, traits, or strategy.
- Tester ID:
- Session start/end time:
- Input method:

## Before the Session

- Serve the exact release-candidate build and record its commit and `public/bundle.js` SHA-256 above.
- Enable the local playtest summary only; do not enable or explain development diagnostics to the tester.
- Start at the main menu with no prior run state.
- Record observation rather than interpretation or coaching.

## Observation

- Reached Wave 3 without help: Yes / No
- Wave reached and outcome:
- Created a connected network by Wave 3: Yes / No
- Without prompting, explained a connection benefit or combination by Wave 3: Yes / No
- Verbatim unsolicited connection explanation and game moment/wave:
- Started another run voluntarily: Yes / No
- Moments of visible confusion:
- Cause of loss stated by tester:

## Ask after the run

1. What did connecting towers do?
2. Why did the last dangerous enemy get through?
3. Which tower or Evolution choice felt most meaningful?
4. Was any control, label, effect, or sound misleading?
5. What would make you start another run?

## Verbatim Answers

1.
2.
3.
4.
5.

## Raw Summary

- Save this completed report as `YYYY-MM-DD-session-NN.md`.
- Save the unedited `myceliumPlaytestSummary()` result beside it as `YYYY-MM-DD-session-NN.json` using the identical filename stem.
- Completed report filename:
- Raw JSON filename with matching stem:
- Observer notes that cannot be inferred from the JSON:

## Findings

| Finding | Classification | Repeated in another session? | Status | Resolution or issue link |
| --- | --- | --- | --- | --- |
|  | Blocker / Polish / Post-release | Yes / No | Open / Resolved |  |

Classification rules:

- **Blocker:** crash, stuck state, missing required asset, misleading control, unreadable critical state, impossible or trivial run.
- **Polish:** weak impact, confusing but recoverable copy, minor visual overlap, non-critical audio imbalance.
- **Post-release:** preference or feature request outside the approved one-map scope.

If the same issue appears twice, do not run the next session until it is filed as a release blocker or explicitly prioritized polish defect. Keep its status open until the resolution or accepted disposition is linked above.

## Five-Session Release Scoring

The evidence pack passes only when all of these are true across five genuinely blind sessions:

- At least four testers reach Wave 3 without instruction.
- At least four can explain by Wave 3 that connection enables network benefits or combinations.
- Every tester can name a plausible cause of their loss, or a winning tester can name their closest danger.
- At least three voluntarily begin another run after victory or defeat.
- No repeated critical control, readability, audio, or crash issue remains open.

## Session Disposition

- Counts toward the five-session release sample: Yes / No
- Every attempted session must retain its paired Markdown and JSON records, including invalidated sessions.
- A session may be excluded only for a technical invalidation identified before the tester's outcome is known, such as the wrong build, broken capture, or unusable device/input setup. Tester performance, feedback, confusion, or outcome may never be an exclusion reason.
- Pre-outcome technical invalidation reason, if any:
- Time the invalidation was identified:
- Observer:
- Date completed:

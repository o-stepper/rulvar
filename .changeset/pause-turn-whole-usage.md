---
'@rulvar/anthropic': minor
'@rulvar/evals': minor
---

A legitimate pause_turn survives the engine end to end, and an invalid continuation cap refuses typed before the first wire (RV1003 + RV1004, PR II of the fourteenth plan)

The fourteenth comparison experiment drove the real Anthropic adapter through the real engine and a legitimate two-segment `pause_turn` killed the run: every segment's `message_start` emitted its own usage mid-stream (5 then 6), the terminal finish carried only the LAST segment's counts, and the engine's midstream-versus-finish invariant read 11 > 6, losing the paid segments from the money. The same experiment fed `pauseTurnMaxContinuations: NaN` and the cap silently disarmed (`continuations > NaN` is always false), turning every further continuation into unplanned paid traffic.

- The terminal finish now speaks for the WHOLE logical turn (RV1003): the adapter accumulates each absorbed segment's normalized usage (`sumUsage`, cache counts and the TTL split included) and the finish carries the sum, so the invariant confirms the per-segment mid-stream reports, the per-call record and the invoice price every paid segment, and the quota window still settles at true wire units. Mid-stream events stay per-segment deltas; a single-segment turn stays byte-identical. `TurnMapping` gains the segment's own `usage`.
- `pauseTurnMaxContinuations` must be a nonnegative safe integer (RV1004): any other present value (NaN, Infinity, negatives, fractions, strings) refuses with a typed `ConfigError` before the first wire, instead of silently disarming the continuation bound.
- `runFaultInjection` (`@rulvar/evals`) grows the seventeenth scenario, `pause-turn-real-adapter`: the two-segment absorption through the REAL adapter and engine must settle `ok` at usage 11/2 with both wire ids on the invoice row and the quota window at 2, and the NaN cap must refuse before any wire. Reverting either fix reports `matched: false` in the kit.

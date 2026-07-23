[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / CriticalPath

# Interface: CriticalPath

Defined in: [packages/core/src/l0/telemetry-reduce.ts:202](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L202)

The critical-path summary of one run (RV-211): the plan's post-fan-in
gate ("synthesis takes at most 40% of wall time with four settled
workers") computed as a pure fold over the same vocabulary, no
heuristics beyond the role tags. Post-fan-in is the interval from the
LAST settled non-coordination agent (any span whose primary role is
neither 'orchestrate' nor 'synthesize') to run:end; the synthesis wall
is the summed span wall of 'synthesize' spans. Wall numbers are LIVE
fidelity: a replayed stream re-stamps emission times, so its intervals
are degenerate, exactly like phase durations. Absent pieces (no
run:end, no worker spans) leave the corresponding fields undefined
rather than guessed at.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-postfaninms"></a> `postFanInMs?` | `number` | Last non-coordination agent:end to run:end; absent without both. | [packages/core/src/l0/telemetry-reduce.ts:206](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L206) |
| <a id="property-postfaninshare"></a> `postFanInShare?` | `number` | postFanInMs / runWallMs when both are defined and the wall is > 0. | [packages/core/src/l0/telemetry-reduce.ts:210](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L210) |
| <a id="property-runwallms"></a> `runWallMs?` | `number` | run:start to run:end; absent while the run is open. | [packages/core/src/l0/telemetry-reduce.ts:204](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L204) |
| <a id="property-synthesisms"></a> `synthesisMs` | `number` | Summed wall of completed 'synthesize' spans (0 when none). | [packages/core/src/l0/telemetry-reduce.ts:208](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L208) |
| <a id="property-synthesisshare"></a> `synthesisShare?` | `number` | synthesisMs / runWallMs under the same conditions. | [packages/core/src/l0/telemetry-reduce.ts:212](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L212) |
| <a id="property-workerspans"></a> `workerSpans` | `number` | Settled non-coordination agent spans that anchored the fan-in. | [packages/core/src/l0/telemetry-reduce.ts:214](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L214) |

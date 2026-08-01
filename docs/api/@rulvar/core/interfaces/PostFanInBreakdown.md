[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PostFanInBreakdown

# Interface: PostFanInBreakdown

Defined in: [packages/core/src/l0/telemetry-reduce.ts:270](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L270)

Where the post-fan-in interval actually went (RV710): the eleventh
comparison experiment measured 45.5 percent of wall sitting after
fan-in with zero synthesis share and nothing to name it. The
decomposition is a pure fold over the SAME vocabulary, no new event
types: model activations and tool executions of coordination spans
(spans whose agent:start role is 'orchestrate') are reconstructed
from their end events' (ts, durationMs) and clipped to the
[last worker settle, run:end] window, and completed 'synthesize'
spans are clipped the same way. The coordinator's draft and repair
thinking lands in the model bucket; child-result pagination and the
finish exchanges (host validators run inside the finish tool's
measured window) land in the tool buckets under their own names; the
residue is what no recorded interval covers: scheduling gaps,
journal writes, park-to-wake latency. Live fidelity only, exactly
like the wall numbers around it: a replayed stream re-stamps
emission times and carries durationMs 0, so its decomposition is
degenerate. Buckets are clipped SUMS (two concurrent coordination
spans, or duration-clock skew against emission stamps, can
overlap-count); coveredMs is the exact interval union, so residueMs
is never understated by an overlap. End events whose span never
started in the stream (a consumer attached mid-stream) cannot be
attributed and are skipped, never guessed at.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-coordinationmodelms"></a> `coordinationModelMs` | `number` | Model activations of coordination spans inside the window. | [packages/core/src/l0/telemetry-reduce.ts:272](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L272) |
| <a id="property-coordinationmodelmsbyphase"></a> `coordinationModelMsByPhase` | `Record`\&lt;`string`, `number`\&gt; | The same bucket keyed by the activation's OWN invocation role ('orchestrate' for the coordinator's drafting and repair turns, 'summarize' for a compaction pass, 'extract' for a schema pass), so a tail spent compacting is distinguishable from a tail spent drafting (RV1211). A zero-duration activation inside the window still registers its role. The values sum to `coordinationModelMs` exactly. | [packages/core/src/l0/telemetry-reduce.ts:282](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L282) |
| <a id="property-coordinationmodelonlyms"></a> `coordinationModelOnlyMs` | `number` | Coordination activation wall with the tool executions NESTED inside it removed: the coordinator's own model time, exactly (RV1211). `coordinationModelMs` is activation wall, and a tool the activation called runs inside that wall, so the two buckets overlap by construction and reading the first as "thinking time" overstates it. This is the exact set difference of the two clipped unions, never a subtraction of sums, so overlapping activations cannot drive it negative. The sixteenth comparison experiment's 222.6-second tail is the number this field exists to split. | [packages/core/src/l0/telemetry-reduce.ts:294](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L294) |
| <a id="property-coordinationtoolcallsbyname"></a> `coordinationToolCallsByName` | `Record`\&lt;`string`, `number`\&gt; | How many executions of each tool the window holds (RV1211), under the same touch-the-window rule as the milliseconds beside it. A coordinator that calls one tool per turn reads its tail's turn profile straight off this record; the milliseconds alone cannot separate one slow pagination from twenty fast ones. | [packages/core/src/l0/telemetry-reduce.ts:310](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L310) |
| <a id="property-coordinationtoolms"></a> `coordinationToolMs` | `number` | Tool executions of coordination spans inside the window, summed. | [packages/core/src/l0/telemetry-reduce.ts:296](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L296) |
| <a id="property-coordinationtoolmsbyname"></a> `coordinationToolMsByName` | `Record`\&lt;`string`, `number`\&gt; | The same tool time keyed by tool name. A zero-duration execution inside the window still registers its name: sub-millisecond tools round to 0 on the wall clock but did run here. | [packages/core/src/l0/telemetry-reduce.ts:302](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L302) |
| <a id="property-coveredms"></a> `coveredMs` | `number` | Union length of every covered interval above. | [packages/core/src/l0/telemetry-reduce.ts:314](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L314) |
| <a id="property-residuems"></a> `residueMs` | `number` | postFanInMs minus coveredMs, floored at zero. | [packages/core/src/l0/telemetry-reduce.ts:316](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L316) |
| <a id="property-residueshare"></a> `residueShare?` | `number` | residueMs / postFanInMs when the window is longer than zero. | [packages/core/src/l0/telemetry-reduce.ts:318](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L318) |
| <a id="property-synthesisms"></a> `synthesisMs` | `number` | Completed 'synthesize' span wall clipped to the window. | [packages/core/src/l0/telemetry-reduce.ts:312](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L312) |

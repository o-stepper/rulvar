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
| <a id="property-coordinationtoolms"></a> `coordinationToolMs` | `number` | Tool executions of coordination spans inside the window, summed. | [packages/core/src/l0/telemetry-reduce.ts:274](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L274) |
| <a id="property-coordinationtoolmsbyname"></a> `coordinationToolMsByName` | `Record`\&lt;`string`, `number`\&gt; | The same tool time keyed by tool name. A zero-duration execution inside the window still registers its name: sub-millisecond tools round to 0 on the wall clock but did run here. | [packages/core/src/l0/telemetry-reduce.ts:280](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L280) |
| <a id="property-coveredms"></a> `coveredMs` | `number` | Union length of every covered interval above. | [packages/core/src/l0/telemetry-reduce.ts:284](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L284) |
| <a id="property-residuems"></a> `residueMs` | `number` | postFanInMs minus coveredMs, floored at zero. | [packages/core/src/l0/telemetry-reduce.ts:286](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L286) |
| <a id="property-residueshare"></a> `residueShare?` | `number` | residueMs / postFanInMs when the window is longer than zero. | [packages/core/src/l0/telemetry-reduce.ts:288](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L288) |
| <a id="property-synthesisms"></a> `synthesisMs` | `number` | Completed 'synthesize' span wall clipped to the window. | [packages/core/src/l0/telemetry-reduce.ts:282](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/l0/telemetry-reduce.ts#L282) |

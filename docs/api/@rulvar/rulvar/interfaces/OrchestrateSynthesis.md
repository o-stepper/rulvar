[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / OrchestrateSynthesis

# Interface: OrchestrateSynthesis

Defined in: `packages/core/dist/index.d.ts`

The synthesis invocation's own knobs (RV-211). Everything else about
the invocation is deterministic: the prompt derives from the journaled
draft and the settled child digest, the toolset is the single finish
tool (a distinct toolsetHash, exactly like the reserved cap
finalizer), the invocation journals as an ordinary agent entry (a
resume replays it with zero paid calls), and its telemetry is a full
agent span with role 'synthesize' phase pairs, so
`CostReport.byRole.synthesize` and `reduceCriticalPath` attribute it
without heuristics. Failure posture: with finishValidation configured
a failed synthesis fails the run typed (the validated path is
mandatory); without validators the run falls back to the coordination
draft under a journaled 'orchestrator_synthesis_fallback' decision and
a warn log, never silently.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-effort"></a> `effort?` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) | Canonical effort of the synthesize invocation. | `packages/core/dist/index.d.ts` |
| <a id="property-estcost"></a> `estCost?` | `number` | Admission estimate for the synthesize invocation, like AgentOpts.estCost: under a tight orchestrator cap the default reserve (full maxOutputTokens pricing) can refuse the dispatch; an explicit estimate is the host speaking. | `packages/core/dist/index.d.ts` |
| <a id="property-instructions"></a> `instructions?` | `string` | Extra deterministic instruction lines appended to the synthesis prompt. | `packages/core/dist/index.d.ts` |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md) | UsageLimits of the synthesize invocation; default { maxTurns: 4 }. | `packages/core/dist/index.d.ts` |
| <a id="property-model"></a> `model?` | [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md) | Model override for the synthesize invocation; the routing key and chain apply otherwise. | `packages/core/dist/index.d.ts` |

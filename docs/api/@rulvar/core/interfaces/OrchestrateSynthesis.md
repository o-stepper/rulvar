[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OrchestrateSynthesis

# Interface: OrchestrateSynthesis

Defined in: [packages/core/src/orchestrator/orchestrate.ts:298](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L298)

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
| <a id="property-dedupeclaims"></a> `dedupeClaims?` | `boolean` | Deduplicate repeated claim lines across children BEFORE any model call (RV-211 remainder; default false, and the prompt stays byte identical when unset). In 'single' mode the digest entering the synthesis prompt keeps only the FIRST occurrence of every repeated line and a REPEATED CLAIMS index (each claim with its reporters) rides the prompt beside it. In 'incremental' mode the deterministic reconciliation dedupes the note texts the same way and the envelope carries the `repeatedClaims` index. Matching is whitespace-collapsed exact line equality: nothing fuzzy ever merges two distinct claims. | [packages/core/src/orchestrator/orchestrate.ts:347](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L347) |
| <a id="property-effort"></a> `effort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | Canonical effort of the synthesize invocation. | [packages/core/src/orchestrator/orchestrate.ts:302](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L302) |
| <a id="property-estcost"></a> `estCost?` | `number` | Admission estimate for the synthesize invocation, like AgentOpts.estCost: under a tight orchestrator cap the default reserve (full maxOutputTokens pricing) can refuse the dispatch; an explicit estimate is the host speaking. In 'incremental' mode the estimate applies to EACH note invocation. | [packages/core/src/orchestrator/orchestrate.ts:314](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L314) |
| <a id="property-instructions"></a> `instructions?` | `string` | Extra deterministic instruction lines appended to the synthesis prompt. | [packages/core/src/orchestrator/orchestrate.ts:306](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L306) |
| <a id="property-limits"></a> `limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | UsageLimits of the synthesize invocation; default { maxTurns: 4 }. | [packages/core/src/orchestrator/orchestrate.ts:304](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L304) |
| <a id="property-mode"></a> `mode?` | `"single"` \| `"incremental"` | The synthesis shape (RV-211 remainder). Default 'single': one post-fan-in synthesize invocation composes the final result from the draft and the whole settled digest. 'incremental': every settled child triggers ONE bounded synthesize-role NOTE invocation as soon as it settles (concurrent with the still-running fan-out, which is what moves synthesis wall time off the post-fan-in critical path), and the FINAL result is a DETERMINISTIC reconciliation, never another model call: an [IncrementalSynthesisResult](/api/@rulvar/core/interfaces/IncrementalSynthesisResult.md) envelope composed from the draft and the notes in spawn order. The tradeoffs are explicit: notes are paid DURING the run, so an acceptance rejection can no longer guarantee "a rejected run never paid for synthesis"; and because the reconciliation has no model-composed finish, `finishValidation` cannot bind it: configuring both is a ConfigError at intake. A note that dies falls back to the child's raw digest summary under a journaled per-child 'orchestrator_synthesis_note_fallback' decision and a warn log. Cap paths are unchanged: a capped run settles through the reserved finalizer and never reconciles. | [packages/core/src/orchestrator/orchestrate.ts:335](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L335) |
| <a id="property-model"></a> `model?` | [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md) | Model override for the synthesize invocation; the routing key and chain apply otherwise. | [packages/core/src/orchestrator/orchestrate.ts:300](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L300) |
| <a id="property-notelimits"></a> `noteLimits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | UsageLimits of ONE incremental note invocation; default { maxTurns: 2 }. Ignored in 'single' mode. | [packages/core/src/orchestrator/orchestrate.ts:352](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L352) |

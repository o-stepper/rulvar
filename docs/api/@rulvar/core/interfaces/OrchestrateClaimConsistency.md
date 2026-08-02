[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OrchestrateClaimConsistency

# Interface: OrchestrateClaimConsistency

Defined in: [packages/core/src/orchestrator/orchestrate.ts:700](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L700)

The claim-consistency pass's knobs (RV1501/RV1502). The pairing half
is a PURE fold ([pairDraftClaims](/api/@rulvar/core/functions/pairDraftClaims.md)) over the accepted draft and
the same settled pool the contradiction pass judges, so it costs
nothing and journals nothing. The judge half is ONE bounded
structured-output invocation under role 'synthesize' (the routing
key picks its model unless `judge.model` overrides), dispatched only
when the fold produced at least one pair; its verdict is an ordinary
journaled agent entry, so a resumed run replays it with zero paid
calls and the derived findings are byte identical.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-judge"></a> `judge?` | \{ `effort?`: [`Effort`](/api/@rulvar/core/type-aliases/Effort.md); `estCost?`: `number`; `limits?`: [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md); `model?`: [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md); \} | The judge invocation's own knobs; the routing chain applies otherwise. | [packages/core/src/orchestrator/orchestrate.ts:719](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L719) |
| `judge.effort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | Canonical effort of the judge invocation. | [packages/core/src/orchestrator/orchestrate.ts:723](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L723) |
| `judge.estCost?` | `number` | Admission estimate for the judge invocation, like AgentOpts.estCost. | [packages/core/src/orchestrator/orchestrate.ts:727](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L727) |
| `judge.limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | UsageLimits of the judge invocation; default { maxTurns: 3 }. | [packages/core/src/orchestrator/orchestrate.ts:725](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L725) |
| `judge.model?` | [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md) | Model override for the judge invocation. | [packages/core/src/orchestrator/orchestrate.ts:721](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L721) |
| <a id="property-max"></a> `max?` | `number` | Bound on judged pairs; default [DEFAULT\_MAX\_CLAIM\_PAIRS](/api/@rulvar/core/variables/DEFAULT_MAX_CLAIM_PAIRS.md). | [packages/core/src/orchestrator/orchestrate.ts:732](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L732) |
| <a id="property-maxexcerptchars"></a> `maxExcerptChars?` | `number` | Bound on each excerpt; default [DEFAULT\_MAX\_PAIR\_EXCERPT\_CHARS](/api/@rulvar/core/variables/DEFAULT_MAX_PAIR_EXCERPT_CHARS.md). | [packages/core/src/orchestrator/orchestrate.ts:736](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L736) |
| <a id="property-maxpoolperpair"></a> `maxPoolPerPair?` | `number` | Bound on each pair's pool readings; default [DEFAULT\_MAX\_POOL\_PER\_PAIR](/api/@rulvar/core/variables/DEFAULT_MAX_POOL_PER_PAIR.md). | [packages/core/src/orchestrator/orchestrate.ts:734](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L734) |
| <a id="property-onfound"></a> `onFound?` | `"report"` \| `"carry"` \| `"fail"` | What a judged contradiction does. 'report' (the default) puts the findings on the acceptance envelope and in an info log, and changes nothing else. 'carry' additionally names them in the 'single' synthesis prompt with the instruction to resolve each explicitly (a ConfigError without that synthesis, the contradictions precedent), and non-empty findings block the `skipWhenDraftValid` gate: a draft contradicting its own pool never earns the skip. 'fail' fails the run typed with `data.source` 'orchestrator_claim_consistency' BEFORE any synthesis dispatch; the judge itself has already been paid, which is the honest minimum for a semantic verdict. A judge that does not settle ok is named on the meta (`judgeFailed`) and fails the run only under 'fail': a gate armed to stop the run must not pass silently when its judge dies. | [packages/core/src/orchestrator/orchestrate.ts:717](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L717) |
| <a id="property-pattern"></a> `pattern?` | `string` | Overrides [DEFAULT\_ANCHOR\_PATTERN](/api/@rulvar/core/variables/DEFAULT_ANCHOR_PATTERN.md) for both sides; fail-closed at intake. | [packages/core/src/orchestrator/orchestrate.ts:730](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L730) |

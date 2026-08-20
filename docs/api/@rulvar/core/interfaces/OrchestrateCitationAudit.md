[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OrchestrateCitationAudit

# Interface: OrchestrateCitationAudit

Defined in: [packages/core/src/orchestrator/orchestrate.ts:954](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L954)

The citation entailment audit's knobs (RV4004). The sample derives
from the audited document's own hash (replay-stable, no clock, no
randomness; a repaired candidate re-samples afresh), the excerpts
come from a resolver the host froze before the run (PURE, exactly
the [citedValueValidator](/api/@rulvar/core/functions/citedValueValidator.md) contract: a live-filesystem resolver
would make verdicts depend on when they ran), and the judge is a
paid, journaled invocation like the claim judge. A sampled citation
whose FIRST cited line does not resolve is unsupported mechanically,
with no judge needed for that row: a citation nothing resolves is
not provenance.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-judge"></a> `judge?` | \{ `effort?`: [`Effort`](/api/@rulvar/core/type-aliases/Effort.md); `estCost?`: `number`; `limits?`: [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md); `model?`: [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md); \} | The judge invocation's knobs, exactly the claim judge's shape. | [packages/core/src/orchestrator/orchestrate.ts:966](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L966) |
| `judge.effort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | - | [packages/core/src/orchestrator/orchestrate.ts:968](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L968) |
| `judge.estCost?` | `number` | Admission estimate for the judge invocation, like AgentOpts.estCost. | [packages/core/src/orchestrator/orchestrate.ts:972](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L972) |
| `judge.limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | UsageLimits of the judge invocation; default { maxTurns: 3 }. | [packages/core/src/orchestrator/orchestrate.ts:970](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L970) |
| `judge.model?` | [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md) | - | [packages/core/src/orchestrator/orchestrate.ts:967](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L967) |
| <a id="property-maxsampled"></a> `maxSampled?` | `number` | The hard whole-document ceiling; default 24, the judge's own budget. | [packages/core/src/orchestrator/orchestrate.ts:962](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L962) |
| <a id="property-onfound"></a> `onFound?` | `"repair"` \| `"report"` \| `"fail"` | What a non-supported verdict does. 'report' (the default) stamps the meta and the findings on the envelope and changes nothing else. 'fail' fails the run typed (`data.source` 'orchestrator_citation_audit') when any sampled citation judges UNSUPPORTED (partial verdicts report either way: a half-carried claim is a finding, not a stop). 'repair' rides the RV3307 bounded round mechanics: the unsupported rows ride one more composition, the repaired document is re-audited (a fresh sample from its new hash), a configured claim pass past the draft rejudges the rewritten document, and unsupported rows that survive fail the run typed. One round exactly, shared (RV4202): arming BOTH this 'repair' and `claimConsistency.onFound: 'repair'` grants the same ONE bounded round, which then fires after the first audit pass carrying both defect lists (the judged claim contradictions and the unsupported citations, plus the uncovered sentences when `coverageRepair` is armed), and BOTH judges re-rule on the repaired document's new hash before survivors of either class fail the run typed. The budget never grows past one extra composition. | [packages/core/src/orchestrator/orchestrate.ts:995](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L995) |
| <a id="property-pattern"></a> `pattern?` | `string` | Overrides [DEFAULT\_CITATION\_PATTERN](/api/@rulvar/core/variables/DEFAULT_CITATION_PATTERN.md); must expose `path:line[-end]`. | [packages/core/src/orchestrator/orchestrate.ts:958](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L958) |
| <a id="property-resolve"></a> `resolve` | (`target`) => `string` \| `undefined` | The host's pure snapshot reader, exactly citedValueValidator's. | [packages/core/src/orchestrator/orchestrate.ts:956](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L956) |
| <a id="property-samplepersection"></a> `samplePerSection?` | `number` | Sampled citing sentences per H2 section; default 2, the judge's own method. | [packages/core/src/orchestrator/orchestrate.ts:960](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L960) |
| <a id="property-window"></a> `window?` | `number` | Lines after the cited line an excerpt may carry; default 3. | [packages/core/src/orchestrator/orchestrate.ts:964](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L964) |

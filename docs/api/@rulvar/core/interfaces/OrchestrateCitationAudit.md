[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / OrchestrateCitationAudit

# Interface: OrchestrateCitationAudit

Defined in: [packages/core/src/orchestrator/orchestrate.ts:988](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L988)

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
| <a id="property-judge"></a> `judge?` | \{ `effort?`: [`Effort`](/api/@rulvar/core/type-aliases/Effort.md); `estCost?`: `number`; `limits?`: [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md); `model?`: [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md); \} | The judge invocation's knobs, exactly the claim judge's shape. | [packages/core/src/orchestrator/orchestrate.ts:1016](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1016) |
| `judge.effort?` | [`Effort`](/api/@rulvar/core/type-aliases/Effort.md) | - | [packages/core/src/orchestrator/orchestrate.ts:1018](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1018) |
| `judge.estCost?` | `number` | Admission estimate for the judge invocation, like AgentOpts.estCost. | [packages/core/src/orchestrator/orchestrate.ts:1022](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1022) |
| `judge.limits?` | [`UsageLimits`](/api/@rulvar/core/interfaces/UsageLimits.md) | UsageLimits of the judge invocation; default { maxTurns: 3 }. | [packages/core/src/orchestrator/orchestrate.ts:1020](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1020) |
| `judge.model?` | [`ModelSpec`](/api/@rulvar/core/type-aliases/ModelSpec.md) | - | [packages/core/src/orchestrator/orchestrate.ts:1017](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1017) |
| <a id="property-maxsampled"></a> `maxSampled?` | `number` | The hard whole-document ceiling; default 24, the judge's own budget. | [packages/core/src/orchestrator/orchestrate.ts:996](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L996) |
| <a id="property-onfound"></a> `onFound?` | `"repair"` \| `"report"` \| `"fail"` | What a non-supported verdict does. 'report' (the default) stamps the meta and the findings on the envelope and changes nothing else. 'fail' fails the run typed (`data.source` 'orchestrator_citation_audit') when any sampled citation judges UNSUPPORTED (partial verdicts report either way: a half-carried claim is a finding, not a stop). 'repair' rides the RV3307 bounded round mechanics: the unsupported rows ride one more composition, the repaired document is re-audited (a fresh sample from its new hash), a configured claim pass past the draft rejudges the rewritten document, and unsupported rows that survive fail the run typed. One round exactly, shared (RV4202): arming BOTH this 'repair' and `claimConsistency.onFound: 'repair'` grants the same ONE bounded round, which then fires after the first audit pass carrying both defect lists (the judged claim contradictions and the unsupported citations, plus the uncovered sentences when `coverageRepair` is armed), and BOTH judges re-rule on the repaired document's new hash before survivors of either class fail the run typed. The budget never grows past one extra composition. | [packages/core/src/orchestrator/orchestrate.ts:1045](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1045) |
| <a id="property-pattern"></a> `pattern?` | `string` | Overrides [DEFAULT\_CITATION\_PATTERN](/api/@rulvar/core/variables/DEFAULT_CITATION_PATTERN.md); must expose `path:line[-end]`. | [packages/core/src/orchestrator/orchestrate.ts:992](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L992) |
| <a id="property-resolve"></a> `resolve` | (`target`) => `string` \| `undefined` | The host's pure snapshot reader, exactly citedValueValidator's. | [packages/core/src/orchestrator/orchestrate.ts:990](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L990) |
| <a id="property-resolver"></a> `resolver?` | `1` \| `2` | The resolver generation (RV4208). Default 1, the fixed downward window above, byte identical for every existing config. Declaring 2 excerpts the bounded LOGICAL UNIT the cited line belongs to (heading section, list item, table row with its header, code comment plus declaration, paragraph; `citationUnitExcerptOf`) and audits EVERY anchor of a compound sentence as its own row against its nearest claim clause, with the unit type and a truncation flag on the row and `resolverVersion: 2` on the meta. The sixth comparison experiment's confirmed false negatives were window artifacts: a section heading whose support lives below the fixed window, and only a sentence's first anchor ever sampled. Opt-in because the sample derives from the audited document's hash and v2 changes which rows exist and what the judge reads. | [packages/core/src/orchestrator/orchestrate.ts:1014](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L1014) |
| <a id="property-samplepersection"></a> `samplePerSection?` | `number` | Sampled citing sentences per H2 section; default 2, the judge's own method. | [packages/core/src/orchestrator/orchestrate.ts:994](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L994) |
| <a id="property-window"></a> `window?` | `number` | Lines after the cited line an excerpt may carry; default 3. | [packages/core/src/orchestrator/orchestrate.ts:998](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/orchestrate.ts#L998) |

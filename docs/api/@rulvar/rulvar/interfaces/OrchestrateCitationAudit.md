[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / OrchestrateCitationAudit

# Interface: OrchestrateCitationAudit

Defined in: `packages/core/dist/index.d.ts`

The citation entailment audit's knobs (RV4004). The sample derives
from the audited document's own hash (replay-stable, no clock, no
randomness; a repaired candidate re-samples afresh), the excerpts
come from a resolver the host froze before the run (PURE, exactly
the [citedValueValidator](/api/@rulvar/rulvar/functions/citedValueValidator.md) contract: a live-filesystem resolver
would make verdicts depend on when they ran), and the judge is a
paid, journaled invocation like the claim judge. A sampled citation
whose FIRST cited line does not resolve is unsupported mechanically,
with no judge needed for that row: a citation nothing resolves is
not provenance.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-judge"></a> `judge?` | \{ `effort?`: [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md); `estCost?`: `number`; `limits?`: [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md); `model?`: [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md); \} | The judge invocation's knobs, exactly the claim judge's shape. | `packages/core/dist/index.d.ts` |
| `judge.effort?` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) | - | `packages/core/dist/index.d.ts` |
| `judge.estCost?` | `number` | - | `packages/core/dist/index.d.ts` |
| `judge.limits?` | [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md) | - | `packages/core/dist/index.d.ts` |
| `judge.model?` | [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-maxsampled"></a> `maxSampled?` | `number` | The hard whole-document ceiling; default 24, the judge's own budget. | `packages/core/dist/index.d.ts` |
| <a id="property-onfound"></a> `onFound?` | `"report"` \| `"fail"` \| `"repair"` | What a non-supported verdict does. 'report' (the default) stamps the meta and the findings on the envelope and changes nothing else. 'fail' fails the run typed (`data.source` 'orchestrator_citation_audit') when any sampled citation judges UNSUPPORTED (partial verdicts report either way: a half-carried claim is a finding, not a stop). 'repair' rides the RV3307 bounded round mechanics: the unsupported rows ride one more composition, the repaired document is re-audited (a fresh sample from its new hash), a configured claim pass past the draft rejudges the rewritten document, and unsupported rows that survive fail the run typed. One round exactly; arming BOTH this 'repair' and `claimConsistency.onFound: 'repair'` is a ConfigError, because the run grants one bounded repair round and two consumers of it would pay two extra compositions. | `packages/core/dist/index.d.ts` |
| <a id="property-pattern"></a> `pattern?` | `string` | Overrides [DEFAULT\_CITATION\_PATTERN](/api/@rulvar/rulvar/variables/DEFAULT_CITATION_PATTERN.md); must expose `path:line[-end]`. | `packages/core/dist/index.d.ts` |
| <a id="property-resolve"></a> `resolve` | (`target`) => `string` \| `undefined` | The host's pure snapshot reader, exactly citedValueValidator's. | `packages/core/dist/index.d.ts` |
| <a id="property-samplepersection"></a> `samplePerSection?` | `number` | Sampled citing sentences per H2 section; default 2, the judge's own method. | `packages/core/dist/index.d.ts` |
| <a id="property-window"></a> `window?` | `number` | Lines after the cited line an excerpt may carry; default 3. | `packages/core/dist/index.d.ts` |

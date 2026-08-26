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
| <a id="property-auditscope"></a> `auditScope?` | `"sample"` \| `"all"` | What the audit judges (RV4407): 'sample' (default) keeps the deterministic stratified sample byte for byte; 'all' judges EVERY anchor row of the document, a census instead of a sample. Requires resolver 2; one judge invocation still carries all rows, so the cost scales through the prompt and `judge.estCost` should be sized for the whole document. | `packages/core/dist/index.d.ts` |
| <a id="property-judge"></a> `judge?` | \{ `effort?`: [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md); `estCost?`: `number`; `limits?`: [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md); `model?`: [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md); \} | The judge invocation's knobs, exactly the claim judge's shape. | `packages/core/dist/index.d.ts` |
| `judge.effort?` | [`Effort`](/api/@rulvar/rulvar/type-aliases/Effort.md) | - | `packages/core/dist/index.d.ts` |
| `judge.estCost?` | `number` | - | `packages/core/dist/index.d.ts` |
| `judge.limits?` | [`UsageLimits`](/api/@rulvar/rulvar/interfaces/UsageLimits.md) | - | `packages/core/dist/index.d.ts` |
| `judge.model?` | [`ModelSpec`](/api/@rulvar/rulvar/type-aliases/ModelSpec.md) | - | `packages/core/dist/index.d.ts` |
| <a id="property-judgeoutputcapguard"></a> `judgeOutputCapGuard?` | `"fail"` \| `"warn"` | What an output cap too small for the verdict bijection does (RV4706, the census reruns of the seventh and eighth comparison experiments): a census carries the whole document's rows in ONE judge dispatch, and the { row, verdict, reason } bijection over them must fit `judge.limits.maxOutputTokensPerTurn` or the reply truncates mid-array; both census rejudges overflowed the seventh experiment's 9000-token cap and raised it to 32000 by hand. When the cap is DECLARED and sits below the floor estimate ([CITATION\_VERDICT\_EST\_TOKENS\_PER\_ROW](/api/@rulvar/rulvar/variables/CITATION_VERDICT_EST_TOKENS_PER_ROW.md) per judged row plus [CITATION\_VERDICT\_EST\_BASE\_TOKENS](/api/@rulvar/rulvar/variables/CITATION_VERDICT_EST_BASE_TOKENS.md)), 'fail' (the default) refuses typed BEFORE the provider call, naming both numbers; 'warn' logs the same numbers and dispatches anyway. An undeclared cap keeps every byte: the estimator cannot judge a resolution it does not see. | `packages/core/dist/index.d.ts` |
| <a id="property-maxsampled"></a> `maxSampled?` | `number` | The hard whole-document ceiling; default 24, the judge's own budget. | `packages/core/dist/index.d.ts` |
| <a id="property-onfound"></a> `onFound?` | `"report"` \| `"fail"` \| `"repair"` | What a non-supported verdict does. 'report' (the default) stamps the meta and the findings on the envelope and changes nothing else. 'fail' fails the run typed (`data.source` 'orchestrator_citation_audit') when any sampled citation judges UNSUPPORTED (partial verdicts report either way: a half-carried claim is a finding, not a stop). 'repair' rides the RV3307 bounded round mechanics: the unsupported rows ride one more composition, the repaired document is re-audited (a fresh sample from its new hash), a configured claim pass past the draft rejudges the rewritten document, and unsupported rows that survive fail the run typed. One round exactly, shared (RV4202): arming BOTH this 'repair' and `claimConsistency.onFound: 'repair'` grants the same ONE bounded round, which then fires after the first audit pass carrying both defect lists (the judged claim contradictions and the unsupported citations, plus the uncovered sentences when `coverageRepair` is armed), and BOTH judges re-rule on the repaired document's new hash before survivors of either class fail the run typed. The budget never grows past one extra composition. | `packages/core/dist/index.d.ts` |
| <a id="property-pattern"></a> `pattern?` | `string` | Overrides [DEFAULT\_CITATION\_PATTERN](/api/@rulvar/rulvar/variables/DEFAULT_CITATION_PATTERN.md); must expose `path:line[-end]`. | `packages/core/dist/index.d.ts` |
| <a id="property-resolve"></a> `resolve` | (`target`) => `string` \| `undefined` | The host's pure snapshot reader, exactly citedValueValidator's. | `packages/core/dist/index.d.ts` |
| <a id="property-resolver"></a> `resolver?` | `2` \| `1` | The resolver generation (RV4208). Default 1, the fixed downward window above, byte identical for every existing config. Declaring 2 excerpts the bounded LOGICAL UNIT the cited line belongs to (heading section, list item, table row with its header, code comment plus declaration, paragraph; `citationUnitExcerptOf`) and audits EVERY anchor of a compound sentence as its own row against its nearest claim clause, with the unit type and a truncation flag on the row and `resolverVersion: 2` on the meta. The sixth comparison experiment's confirmed false negatives were window artifacts: a section heading whose support lives below the fixed window, and only a sentence's first anchor ever sampled. Opt-in because the sample derives from the audited document's hash and v2 changes which rows exist and what the judge reads. | `packages/core/dist/index.d.ts` |
| <a id="property-samplepersection"></a> `samplePerSection?` | `number` | Sampled citing sentences per H2 section; default 2, the judge's own method. | `packages/core/dist/index.d.ts` |
| <a id="property-window"></a> `window?` | `number` | Lines after the cited line an excerpt may carry; default 3. | `packages/core/dist/index.d.ts` |

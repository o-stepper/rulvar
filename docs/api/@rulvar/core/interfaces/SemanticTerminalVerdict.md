[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SemanticTerminalVerdict

# Interface: SemanticTerminalVerdict

Defined in: [packages/core/src/orchestrator/semantic-verdict.ts:18](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/semantic-verdict.ts#L18)

The one-word semantic verdict plus the facts it was folded from.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-contradictions"></a> `contradictions` | `number` | Judged claim contradictions standing at settle. | [packages/core/src/orchestrator/semantic-verdict.ts:44](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/semantic-verdict.ts#L44) |
| <a id="property-coverage"></a> `coverage?` | `string` | The final claim-coverage grade, verbatim from the meta. | [packages/core/src/orchestrator/semantic-verdict.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/semantic-verdict.ts#L42) |
| <a id="property-finalhash"></a> `finalHash?` | `string` | The judged document's hash: the claim judgedHash, else the audit auditedHash. | [packages/core/src/orchestrator/semantic-verdict.ts:40](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/semantic-verdict.ts#L40) |
| <a id="property-judgefailures"></a> `judgeFailures` | `string`[] | Why nothing usable judged the document, when 'not-judged': stable codes ('claim-judge-failed', 'claim-judge-declined', 'citation-judge-failed', 'citation-judge-declined', 'draft-rewritten-unjudged', and the RV4402 trust codes 'claim-meta-unjudged' / 'citation-meta-unjudged' for a meta with no evidence anything judged, 'claim-meta-malformed' / 'citation-meta-malformed' for counters that are not counts). Empty on every other verdict. | [packages/core/src/orchestrator/semantic-verdict.ts:63](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/semantic-verdict.ts#L63) |
| <a id="property-partialcitations"></a> `partialCitations` | `number` | Sampled citations judged partial at settle: findings, not stops. | [packages/core/src/orchestrator/semantic-verdict.ts:48](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/semantic-verdict.ts#L48) |
| <a id="property-semanticrepairrounds"></a> `semanticRepairRounds` | `number` | Bounded semantic repair rounds the run actually dispatched. | [packages/core/src/orchestrator/semantic-verdict.ts:50](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/semantic-verdict.ts#L50) |
| <a id="property-unsupportedcitations"></a> `unsupportedCitations` | `number` | Sampled citations judged UNSUPPORTED at settle. | [packages/core/src/orchestrator/semantic-verdict.ts:46](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/semantic-verdict.ts#L46) |
| <a id="property-verdict"></a> `verdict` | `"partial"` \| `"vacuous"` \| `"clean"` \| `"findings"` \| `"waived"` \| `"not-judged"` | The verdict, in refusal precedence order: - 'not-judged': semantic machinery was configured and nothing usable judged the shipped document (a failed or declined judge, a draft-stage verdict the synthesis then rewrote, a meta carrying no evidence anything judged, or a meta whose counters are malformed, RV4402); - 'findings': a judge ruled and defects stand (contradictions or unsupported sampled citations); - 'waived': acceptance was licensed by a standing exception, not by coverage; - 'partial': coverage graded below 'full' ('partial', 'critical-uncovered', or the RV4404 'coverage-capped', whose cause is the configured pair ceiling) with no waiver standing; - 'vacuous': the document cited nothing, so the configured pass verified nothing; - 'clean': every configured judge ruled on the shipped document and found nothing. | [packages/core/src/orchestrator/semantic-verdict.ts:38](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/semantic-verdict.ts#L38) |
| <a id="property-waiver"></a> `waiver?` | \{ `coverage`: `string`; `expiresAt?`: `string`; `principal`: `string`; `reason`: `string`; \} | The standing exception that licensed acceptance, when one did. | [packages/core/src/orchestrator/semantic-verdict.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/semantic-verdict.ts#L52) |
| `waiver.coverage` | `string` | - | [packages/core/src/orchestrator/semantic-verdict.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/semantic-verdict.ts#L52) |
| `waiver.expiresAt?` | `string` | - | [packages/core/src/orchestrator/semantic-verdict.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/semantic-verdict.ts#L52) |
| `waiver.principal` | `string` | - | [packages/core/src/orchestrator/semantic-verdict.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/semantic-verdict.ts#L52) |
| `waiver.reason` | `string` | - | [packages/core/src/orchestrator/semantic-verdict.ts:52](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/semantic-verdict.ts#L52) |

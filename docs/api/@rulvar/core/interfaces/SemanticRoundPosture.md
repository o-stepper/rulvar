[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / SemanticRoundPosture

# Interface: SemanticRoundPosture

Defined in: [packages/core/src/orchestrator/admission.ts:314](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L314)

The declared semantic posture the round arithmetic reads (RV4304):
the SAME four declarations the acceptance tail already took, named
as one shape so money and wires derive from one arming function.

## Extended by

- [`AcceptanceTailSpec`](/api/@rulvar/core/interfaces/AcceptanceTailSpec.md)
- [`WireCapacitySpec`](/api/@rulvar/core/interfaces/WireCapacitySpec.md)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-citationonfound"></a> `citationOnFound?` | `"repair"` \| `"report"` \| `"fail"` | Mirrors OrchestrateCitationAudit.onFound; 'repair' arms the audit's round. | [packages/core/src/orchestrator/admission.ts:320](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L320) |
| <a id="property-claimconfigured"></a> `claimConfigured?` | `boolean` | True when a claim-consistency pass is declared. | [packages/core/src/orchestrator/admission.ts:322](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L322) |
| <a id="property-claimonfound"></a> `claimOnFound?` | `"repair"` \| `"report"` \| `"carry"` \| `"fail"` | Mirrors OrchestrateClaimConsistency.onFound; absent reads 'report'. | [packages/core/src/orchestrator/admission.ts:318](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L318) |
| <a id="property-claimstage"></a> `claimStage?` | `"draft"` \| `"final"` \| `"both"` | Mirrors OrchestrateClaimConsistency.stage; absent reads 'draft'. | [packages/core/src/orchestrator/admission.ts:316](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/admission.ts#L316) |

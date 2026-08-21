[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / SemanticRoundPosture

# Interface: SemanticRoundPosture

Defined in: `packages/core/dist/index.d.ts`

The declared semantic posture the round arithmetic reads (RV4304):
the SAME four declarations the acceptance tail already took, named
as one shape so money and wires derive from one arming function.

## Extended by

- [`AcceptanceTailSpec`](/api/@rulvar/rulvar/interfaces/AcceptanceTailSpec.md)
- [`WireCapacitySpec`](/api/@rulvar/rulvar/interfaces/WireCapacitySpec.md)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-citationonfound"></a> `citationOnFound?` | `"report"` \| `"fail"` \| `"repair"` | Mirrors OrchestrateCitationAudit.onFound; 'repair' arms the audit's round. | `packages/core/dist/index.d.ts` |
| <a id="property-claimconfigured"></a> `claimConfigured?` | `boolean` | True when a claim-consistency pass is declared. | `packages/core/dist/index.d.ts` |
| <a id="property-claimonfound"></a> `claimOnFound?` | `"report"` \| `"carry"` \| `"fail"` \| `"repair"` | Mirrors OrchestrateClaimConsistency.onFound; absent reads 'report'. | `packages/core/dist/index.d.ts` |
| <a id="property-claimstage"></a> `claimStage?` | `"draft"` \| `"final"` \| `"both"` | Mirrors OrchestrateClaimConsistency.stage; absent reads 'draft'. | `packages/core/dist/index.d.ts` |

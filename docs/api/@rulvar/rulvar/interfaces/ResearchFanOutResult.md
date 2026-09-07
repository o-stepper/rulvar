[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ResearchFanOutResult

# Interface: ResearchFanOutResult

Defined in: `packages/core/dist/index.d.ts`

What [researchFanOut](/api/@rulvar/rulvar/functions/researchFanOut.md) returns: the profile, the evidence accessor, the acceptance.

## Extends

- [`ResearchAgentProfileResult`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileResult.md)

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-acceptance"></a> `acceptance` | [`OrchestrateAcceptance`](/api/@rulvar/rulvar/interfaces/OrchestrateAcceptance.md) | The acceptance that pairs with the profile; pass it as `orchestrate` acceptance. | - | `packages/core/dist/index.d.ts` |
| <a id="property-evidence"></a> `evidence` | () => [`ResearchEvidenceEntry`](/api/@rulvar/rulvar/interfaces/ResearchEvidenceEntry.md)[] | The research kit's host-side evidence snapshot. One kit instance backs the profile, so children spawned from the SAME registered profile pool their verified evidence here (and see each other's entries through list_evidence); construct one template per fan-out run, or per child, when isolation matters. | [`ResearchAgentProfileResult`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileResult.md).[`evidence`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileResult.md#property-evidence) | `packages/core/dist/index.d.ts` |
| <a id="property-profile"></a> `profile` | [`AgentProfile`](/api/@rulvar/rulvar/interfaces/AgentProfile.md) | - | [`ResearchAgentProfileResult`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileResult.md).[`profile`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileResult.md#property-profile) | `packages/core/dist/index.d.ts` |

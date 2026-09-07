[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResearchFanOutResult

# Interface: ResearchFanOutResult

Defined in: [packages/core/src/engine/profile-templates.ts:222](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/profile-templates.ts#L222)

What [researchFanOut](/api/@rulvar/core/functions/researchFanOut.md) returns: the profile, the evidence accessor, the acceptance.

## Extends

- [`ResearchAgentProfileResult`](/api/@rulvar/core/interfaces/ResearchAgentProfileResult.md)

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-acceptance"></a> `acceptance` | [`OrchestrateAcceptance`](/api/@rulvar/core/interfaces/OrchestrateAcceptance.md) | The acceptance that pairs with the profile; pass it as `orchestrate` acceptance. | - | [packages/core/src/engine/profile-templates.ts:224](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/profile-templates.ts#L224) |
| <a id="property-evidence"></a> `evidence` | () => [`ResearchEvidenceEntry`](/api/@rulvar/core/interfaces/ResearchEvidenceEntry.md)[] | The research kit's host-side evidence snapshot. One kit instance backs the profile, so children spawned from the SAME registered profile pool their verified evidence here (and see each other's entries through list_evidence); construct one template per fan-out run, or per child, when isolation matters. | [`ResearchAgentProfileResult`](/api/@rulvar/core/interfaces/ResearchAgentProfileResult.md).[`evidence`](/api/@rulvar/core/interfaces/ResearchAgentProfileResult.md#property-evidence) | [packages/core/src/engine/profile-templates.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/profile-templates.ts#L114) |
| <a id="property-profile"></a> `profile` | [`AgentProfile`](/api/@rulvar/core/interfaces/AgentProfile.md) | - | [`ResearchAgentProfileResult`](/api/@rulvar/core/interfaces/ResearchAgentProfileResult.md).[`profile`](/api/@rulvar/core/interfaces/ResearchAgentProfileResult.md#property-profile) | [packages/core/src/engine/profile-templates.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/profile-templates.ts#L106) |

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ResearchAgentProfileResult

# Interface: ResearchAgentProfileResult

Defined in: `packages/core/dist/index.d.ts`

What [researchAgentProfile](/api/@rulvar/rulvar/functions/researchAgentProfile.md) returns: the profile plus the evidence accessor.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-evidence"></a> `evidence` | () => [`ResearchEvidenceEntry`](/api/@rulvar/rulvar/interfaces/ResearchEvidenceEntry.md)[] | The research kit's host-side evidence snapshot. One kit instance backs the profile, so children spawned from the SAME registered profile pool their verified evidence here (and see each other's entries through list_evidence); construct one template per fan-out run, or per child, when isolation matters. | `packages/core/dist/index.d.ts` |
| <a id="property-profile"></a> `profile` | [`AgentProfile`](/api/@rulvar/rulvar/interfaces/AgentProfile.md) | - | `packages/core/dist/index.d.ts` |

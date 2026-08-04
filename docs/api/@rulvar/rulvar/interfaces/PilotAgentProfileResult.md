[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / PilotAgentProfileResult

# Interface: PilotAgentProfileResult

Defined in: `packages/core/dist/index.d.ts`

What [pilotAgentProfile](/api/@rulvar/rulvar/functions/pilotAgentProfile.md) returns: the pinned profile plus its accessors.

## Extends

- [`ResearchAgentProfileResult`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileResult.md)

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-attestation"></a> `attestation` | [`ToolsetAttestation`](/api/@rulvar/rulvar/interfaces/ToolsetAttestation.md) | The toolset pin the profile enforces at every spawn (RV1514): the hash of the EXACT resolved toolset the factory built, per-tool hashes included, so a drifted registration refuses typed before any provider call. Returned so the host can persist or audit it. | - | `packages/core/dist/index.d.ts` |
| <a id="property-evidence"></a> `evidence` | () => [`ResearchEvidenceEntry`](/api/@rulvar/rulvar/interfaces/ResearchEvidenceEntry.md)[] | The research kit's host-side evidence snapshot. One kit instance backs the profile, so children spawned from the SAME registered profile pool their verified evidence here (and see each other's entries through list_evidence); construct one template per fan-out run, or per child, when isolation matters. | [`ResearchAgentProfileResult`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileResult.md).[`evidence`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileResult.md#property-evidence) | `packages/core/dist/index.d.ts` |
| <a id="property-profile"></a> `profile` | [`AgentProfile`](/api/@rulvar/rulvar/interfaces/AgentProfile.md) | - | [`ResearchAgentProfileResult`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileResult.md).[`profile`](/api/@rulvar/rulvar/interfaces/ResearchAgentProfileResult.md#property-profile) | `packages/core/dist/index.d.ts` |

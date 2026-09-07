[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / PilotAgentProfileResult

# Interface: PilotAgentProfileResult

Defined in: [packages/core/src/engine/profile-templates.ts:293](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/profile-templates.ts#L293)

What [pilotAgentProfile](/api/@rulvar/core/functions/pilotAgentProfile.md) returns: the pinned profile plus its accessors.

## Extends

- [`ResearchAgentProfileResult`](/api/@rulvar/core/interfaces/ResearchAgentProfileResult.md)

## Properties

| Property | Type | Description | Inherited from | Defined in |
| ------ | ------ | ------ | ------ | ------ |
| <a id="property-attestation"></a> `attestation` | [`ToolsetAttestation`](/api/@rulvar/core/interfaces/ToolsetAttestation.md) | The toolset pin the profile enforces at every spawn (RV1514): the hash of the EXACT resolved toolset the factory built, per-tool hashes included, so a drifted registration refuses typed before any provider call. Returned so the host can persist or audit it. | - | [packages/core/src/engine/profile-templates.ts:300](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/profile-templates.ts#L300) |
| <a id="property-evidence"></a> `evidence` | () => [`ResearchEvidenceEntry`](/api/@rulvar/core/interfaces/ResearchEvidenceEntry.md)[] | The research kit's host-side evidence snapshot. One kit instance backs the profile, so children spawned from the SAME registered profile pool their verified evidence here (and see each other's entries through list_evidence); construct one template per fan-out run, or per child, when isolation matters. | [`ResearchAgentProfileResult`](/api/@rulvar/core/interfaces/ResearchAgentProfileResult.md).[`evidence`](/api/@rulvar/core/interfaces/ResearchAgentProfileResult.md#property-evidence) | [packages/core/src/engine/profile-templates.ts:114](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/profile-templates.ts#L114) |
| <a id="property-profile"></a> `profile` | [`AgentProfile`](/api/@rulvar/core/interfaces/AgentProfile.md) | - | [`ResearchAgentProfileResult`](/api/@rulvar/core/interfaces/ResearchAgentProfileResult.md).[`profile`](/api/@rulvar/core/interfaces/ResearchAgentProfileResult.md#property-profile) | [packages/core/src/engine/profile-templates.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/profile-templates.ts#L106) |

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ResearchAgentProfileResult

# Interface: ResearchAgentProfileResult

Defined in: [packages/core/src/engine/profile-templates.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/profile-templates.ts#L103)

What [researchAgentProfile](/api/@rulvar/core/functions/researchAgentProfile.md) returns: the profile plus the evidence accessor.

## Extended by

- [`PilotAgentProfileResult`](/api/@rulvar/core/interfaces/PilotAgentProfileResult.md)

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-evidence"></a> `evidence` | () => [`ResearchEvidenceEntry`](/api/@rulvar/core/interfaces/ResearchEvidenceEntry.md)[] | The research kit's host-side evidence snapshot. One kit instance backs the profile, so children spawned from the SAME registered profile pool their verified evidence here (and see each other's entries through list_evidence); construct one template per fan-out run, or per child, when isolation matters. | [packages/core/src/engine/profile-templates.ts:112](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/profile-templates.ts#L112) |
| <a id="property-profile"></a> `profile` | [`AgentProfile`](/api/@rulvar/core/interfaces/AgentProfile.md) | - | [packages/core/src/engine/profile-templates.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/engine/profile-templates.ts#L104) |

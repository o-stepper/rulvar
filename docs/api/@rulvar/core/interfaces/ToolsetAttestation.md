[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / ToolsetAttestation

# Interface: ToolsetAttestation

Defined in: [packages/core/src/tools/toolset-hash.ts:124](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/toolset-hash.ts#L124)

A recorded toolset pin (RV1514): the aggregate toolsetHash a spawn
must resolve to, plus optional per-tool contract hashes that turn a
mismatch refusal into a named diff (changed / missing / unexpected).
Record one with [attestToolset](/api/@rulvar/core/functions/attestToolset.md); declare it as
`AgentProfile.toolsetAttestation`. Provider-side drift of an imported
tool's description or schema re-keys new spawns silently by design;
an attested profile turns exactly that drift into a typed refusal at
spawn time, before any provider call.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-authority"></a> `authority?` | `Record`\&lt;`string`, [`ToolAuthority`](/api/@rulvar/core/interfaces/ToolAuthority.md)\&gt; | Per-tool authority records; enables the field-naming diff (RV1802). | [packages/core/src/tools/toolset-hash.ts:137](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/toolset-hash.ts#L137) |
| <a id="property-authorityhash"></a> `authorityHash?` | `string` | The expected aggregate authority hash (RV1802). Absent on a legacy contract-only pin, which keeps its documented posture: authority drift (risk, needsApproval, executor, executorSpec) passes it silently; re-record with [attestToolset](/api/@rulvar/core/functions/attestToolset.md) to upgrade. | [packages/core/src/tools/toolset-hash.ts:135](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/toolset-hash.ts#L135) |
| <a id="property-hash"></a> `hash` | `string` | The expected aggregate toolsetHash (64 lowercase hex chars). | [packages/core/src/tools/toolset-hash.ts:126](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/toolset-hash.ts#L126) |
| <a id="property-tools"></a> `tools?` | `Record`\&lt;`string`, `string`\&gt; | Per-tool contract hashes by tool name; enables the named diff. | [packages/core/src/tools/toolset-hash.ts:128](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/tools/toolset-hash.ts#L128) |

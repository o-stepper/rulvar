[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Artifact

# Interface: Artifact

Defined in: [packages/core/src/runtime/agent-loop.ts:68](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L68)

Artifact: the normative shape of AgentResult.artifacts entries.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-data"></a> `data?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | Inline JSON content for small values. | [packages/core/src/runtime/agent-loop.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L80) |
| <a id="property-files"></a> `files?` | `string`[] | Changed-file list (kind 'patch': worktree collect()). | [packages/core/src/runtime/agent-loop.ts:76](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L76) |
| <a id="property-id"></a> `id` | `string` | Stable within the result. | [packages/core/src/runtime/agent-loop.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L70) |
| <a id="property-kind"></a> `kind` | `"text"` \| `"file"` \| `"patch"` \| `"json"` | Closed in v1. | [packages/core/src/runtime/agent-loop.ts:72](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L72) |
| <a id="property-label"></a> `label?` | `string` | Telemetry only. | [packages/core/src/runtime/agent-loop.ts:74](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L74) |
| <a id="property-ref"></a> `ref?` | `string` | TranscriptStore blob ref for offloaded content. | [packages/core/src/runtime/agent-loop.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L78) |

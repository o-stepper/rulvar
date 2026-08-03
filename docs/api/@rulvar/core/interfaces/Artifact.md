[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Artifact

# Interface: Artifact

Defined in: [packages/core/src/runtime/agent-loop.ts:94](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L94)

Artifact: the normative shape of AgentResult.artifacts entries.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-data"></a> `data?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | Inline JSON content for small values. | [packages/core/src/runtime/agent-loop.ts:106](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L106) |
| <a id="property-files"></a> `files?` | `string`[] | Changed-file list (kind 'patch': worktree collect()). | [packages/core/src/runtime/agent-loop.ts:102](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L102) |
| <a id="property-id"></a> `id` | `string` | Stable within the result. | [packages/core/src/runtime/agent-loop.ts:96](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L96) |
| <a id="property-kind"></a> `kind` | `"text"` \| `"file"` \| `"patch"` \| `"json"` | Closed in v1. | [packages/core/src/runtime/agent-loop.ts:98](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L98) |
| <a id="property-label"></a> `label?` | `string` | Telemetry only. | [packages/core/src/runtime/agent-loop.ts:100](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L100) |
| <a id="property-ref"></a> `ref?` | `string` | TranscriptStore blob ref for offloaded content. | [packages/core/src/runtime/agent-loop.ts:104](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L104) |

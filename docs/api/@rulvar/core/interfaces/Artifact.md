[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Artifact

# Interface: Artifact

Defined in: [packages/core/src/runtime/agent-loop.ts:93](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L93)

Artifact: the normative shape of AgentResult.artifacts entries.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-data"></a> `data?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | Inline JSON content for small values. | [packages/core/src/runtime/agent-loop.ts:105](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L105) |
| <a id="property-files"></a> `files?` | `string`[] | Changed-file list (kind 'patch': worktree collect()). | [packages/core/src/runtime/agent-loop.ts:101](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L101) |
| <a id="property-id"></a> `id` | `string` | Stable within the result. | [packages/core/src/runtime/agent-loop.ts:95](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L95) |
| <a id="property-kind"></a> `kind` | `"text"` \| `"file"` \| `"patch"` \| `"json"` | Closed in v1. | [packages/core/src/runtime/agent-loop.ts:97](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L97) |
| <a id="property-label"></a> `label?` | `string` | Telemetry only. | [packages/core/src/runtime/agent-loop.ts:99](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L99) |
| <a id="property-ref"></a> `ref?` | `string` | TranscriptStore blob ref for offloaded content. | [packages/core/src/runtime/agent-loop.ts:103](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L103) |

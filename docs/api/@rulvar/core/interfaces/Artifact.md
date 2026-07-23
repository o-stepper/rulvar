[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Artifact

# Interface: Artifact

Defined in: [packages/core/src/runtime/agent-loop.ts:78](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L78)

Artifact: the normative shape of AgentResult.artifacts entries.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-data"></a> `data?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | Inline JSON content for small values. | [packages/core/src/runtime/agent-loop.ts:90](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L90) |
| <a id="property-files"></a> `files?` | `string`[] | Changed-file list (kind 'patch': worktree collect()). | [packages/core/src/runtime/agent-loop.ts:86](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L86) |
| <a id="property-id"></a> `id` | `string` | Stable within the result. | [packages/core/src/runtime/agent-loop.ts:80](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L80) |
| <a id="property-kind"></a> `kind` | `"text"` \| `"file"` \| `"patch"` \| `"json"` | Closed in v1. | [packages/core/src/runtime/agent-loop.ts:82](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L82) |
| <a id="property-label"></a> `label?` | `string` | Telemetry only. | [packages/core/src/runtime/agent-loop.ts:84](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L84) |
| <a id="property-ref"></a> `ref?` | `string` | TranscriptStore blob ref for offloaded content. | [packages/core/src/runtime/agent-loop.ts:88](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L88) |

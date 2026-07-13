[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Artifact

# Interface: Artifact

Defined in: [packages/core/src/runtime/agent-loop.ts:67](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L67)

Artifact: the normative shape of AgentResult.artifacts entries.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-data"></a> `data?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | Inline JSON content for small values. | [packages/core/src/runtime/agent-loop.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L79) |
| <a id="property-files"></a> `files?` | `string`[] | Changed-file list (kind 'patch': worktree collect()). | [packages/core/src/runtime/agent-loop.ts:75](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L75) |
| <a id="property-id"></a> `id` | `string` | Stable within the result. | [packages/core/src/runtime/agent-loop.ts:69](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L69) |
| <a id="property-kind"></a> `kind` | `"text"` \| `"file"` \| `"patch"` \| `"json"` | Closed in v1. | [packages/core/src/runtime/agent-loop.ts:71](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L71) |
| <a id="property-label"></a> `label?` | `string` | Telemetry only. | [packages/core/src/runtime/agent-loop.ts:73](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L73) |
| <a id="property-ref"></a> `ref?` | `string` | TranscriptStore blob ref for offloaded content. | [packages/core/src/runtime/agent-loop.ts:77](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L77) |

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / Artifact

# Interface: Artifact

Defined in: [packages/core/src/runtime/agent-loop.ts:79](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L79)

Artifact: the normative shape of AgentResult.artifacts entries.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-data"></a> `data?` | [`Json`](/api/@rulvar/core/type-aliases/Json.md) | Inline JSON content for small values. | [packages/core/src/runtime/agent-loop.ts:91](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L91) |
| <a id="property-files"></a> `files?` | `string`[] | Changed-file list (kind 'patch': worktree collect()). | [packages/core/src/runtime/agent-loop.ts:87](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L87) |
| <a id="property-id"></a> `id` | `string` | Stable within the result. | [packages/core/src/runtime/agent-loop.ts:81](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L81) |
| <a id="property-kind"></a> `kind` | `"text"` \| `"file"` \| `"patch"` \| `"json"` | Closed in v1. | [packages/core/src/runtime/agent-loop.ts:83](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L83) |
| <a id="property-label"></a> `label?` | `string` | Telemetry only. | [packages/core/src/runtime/agent-loop.ts:85](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L85) |
| <a id="property-ref"></a> `ref?` | `string` | TranscriptStore blob ref for offloaded content. | [packages/core/src/runtime/agent-loop.ts:89](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/agent-loop.ts#L89) |

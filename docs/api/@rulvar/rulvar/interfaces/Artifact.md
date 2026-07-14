[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / Artifact

# Interface: Artifact

Defined in: `packages/core/dist/index.d.ts`

Artifact: the normative shape of AgentResult.artifacts entries.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-data"></a> `data?` | [`Json`](/api/@rulvar/rulvar/type-aliases/Json.md) | Inline JSON content for small values. | `packages/core/dist/index.d.ts` |
| <a id="property-files"></a> `files?` | `string`[] | Changed-file list (kind 'patch': worktree collect()). | `packages/core/dist/index.d.ts` |
| <a id="property-id"></a> `id` | `string` | Stable within the result. | `packages/core/dist/index.d.ts` |
| <a id="property-kind"></a> `kind` | `"file"` \| `"patch"` \| `"json"` \| `"text"` | Closed in v1. | `packages/core/dist/index.d.ts` |
| <a id="property-label"></a> `label?` | `string` | Telemetry only. | `packages/core/dist/index.d.ts` |
| <a id="property-ref"></a> `ref?` | `string` | TranscriptStore blob ref for offloaded content. | `packages/core/dist/index.d.ts` |

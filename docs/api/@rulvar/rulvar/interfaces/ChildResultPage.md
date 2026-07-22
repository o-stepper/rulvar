[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / ChildResultPage

# Interface: ChildResultPage

Defined in: `packages/core/dist/index.d.ts`

One page of a settled child's FULL output, returned by the opt-in
`get_child_result` tool. The digest is a wake signal truncated to 400
characters; this is the whole evidence, paged so a large result can be
read without overflowing the orchestrator's context in one call
(v1.40.0 improvement plan, the narrow RV-201 slice). The content is a
deterministic serialization of the child's `output` (the raw string
when the output IS a string, else its JCS-independent `JSON.stringify`)
for a settled ok child, or the child's `errorMessage` otherwise, so the
orchestrator can read WHY a child failed as readily as what it
produced. Everything here is a pure read of already durable journal
state, so a resume reproduces it with no new spend.

## Properties

| Property | Type | Description | Defined in |
| ------ | ------ | ------ | ------ |
| <a id="property-artifacts"></a> `artifacts` | \{ `id`: `string`; `kind`: `string`; `label?`: `string`; \}[] | The child's artifacts, id and kind, so the model knows what `read_child_artifact` can fetch. | `packages/core/dist/index.d.ts` |
| <a id="property-content"></a> `content` | `string` | The page: `content.length` is at most the requested (clamped) maxChars. | `packages/core/dist/index.d.ts` |
| <a id="property-handle"></a> `handle` | `number` | - | `packages/core/dist/index.d.ts` |
| <a id="property-hasmore"></a> `hasMore` | `boolean` | True when more characters remain past this page; call again with a higher offset. | `packages/core/dist/index.d.ts` |
| <a id="property-offset"></a> `offset` | `number` | The character offset this page starts at, counted from zero. | `packages/core/dist/index.d.ts` |
| <a id="property-status"></a> `status` | `string` | - | `packages/core/dist/index.d.ts` |
| <a id="property-totalchars"></a> `totalChars` | `number` | Length of the whole serialized result, in characters. | `packages/core/dist/index.d.ts` |

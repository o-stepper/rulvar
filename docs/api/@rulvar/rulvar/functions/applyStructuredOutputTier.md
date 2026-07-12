[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / applyStructuredOutputTier

# Function: applyStructuredOutputTier()

```ts
function applyStructuredOutputTier(
   req, 
   tier, 
   schema): ChatRequest;
```

Defined in: `packages/core/dist/index.d.ts`

Applies the selected tier to an outgoing request. Native rides
ChatRequest.schema; forced-tool synthesizes a single emit_result tool
with toolChoice pinned to it; prompt injects the schema into the last
user message.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `req` | [`ChatRequest`](/api/@rulvar/rulvar/interfaces/ChatRequest.md) |
| `tier` | [`StructuredOutputTier`](/api/@rulvar/rulvar/type-aliases/StructuredOutputTier.md) |
| `schema` | [`JsonSchema`](/api/@rulvar/rulvar/type-aliases/JsonSchema.md) |

## Returns

[`ChatRequest`](/api/@rulvar/rulvar/interfaces/ChatRequest.md)

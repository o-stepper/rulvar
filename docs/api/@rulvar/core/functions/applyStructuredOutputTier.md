[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / applyStructuredOutputTier

# Function: applyStructuredOutputTier()

```ts
function applyStructuredOutputTier(
   req, 
   tier, 
   schema): ChatRequest;
```

Defined in: [packages/core/src/runtime/structured-output.ts:21](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/structured-output.ts#L21)

Applies the selected tier to an outgoing request. Native rides
ChatRequest.schema; forced-tool synthesizes a single emit_result tool
with toolChoice pinned to it; prompt injects the schema into the last
user message.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `req` | [`ChatRequest`](/api/@rulvar/core/interfaces/ChatRequest.md) |
| `tier` | [`StructuredOutputTier`](/api/@rulvar/core/type-aliases/StructuredOutputTier.md) |
| `schema` | [`JsonSchema`](/api/@rulvar/core/type-aliases/JsonSchema.md) |

## Returns

[`ChatRequest`](/api/@rulvar/core/interfaces/ChatRequest.md)

[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / canRideLoopTurn

# Function: canRideLoopTurn()

```ts
function canRideLoopTurn(tier, toolsAvailable): boolean;
```

Defined in: `packages/core/dist/index.d.ts`

True when the given structured-output tier can ride the last loop turn.
`native` and `prompt` coexist with tool availability; `forced-tool`
pins toolChoice to the synthesized emit_result contract and therefore
cannot ride while the agent's tools must remain available. For an
agent with no tools every tier rides (the M1 behavior, unchanged).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `tier` | [`StructuredOutputTier`](/api/@rulvar/rulvar/type-aliases/StructuredOutputTier.md) |
| `toolsAvailable` | `boolean` |

## Returns

`boolean`

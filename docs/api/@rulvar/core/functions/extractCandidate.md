[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / extractCandidate

# Function: extractCandidate()

```ts
function extractCandidate(turn, tier): 
  | {
  raw: unknown;
}
  | undefined;
```

Defined in: [packages/core/src/runtime/structured-output.ts:70](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/runtime/structured-output.ts#L70)

Extracts the structured-output candidate from a collected turn per tier.
Returns `undefined` when the turn carries no candidate (for example the
model answered prose without the forced tool call).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `turn` | [`CollectedTurn`](/api/@rulvar/core/interfaces/CollectedTurn.md) |
| `tier` | [`StructuredOutputTier`](/api/@rulvar/core/type-aliases/StructuredOutputTier.md) |

## Returns

  \| \{
  `raw`: `unknown`;
\}
  \| `undefined`

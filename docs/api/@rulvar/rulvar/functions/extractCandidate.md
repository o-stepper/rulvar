[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / extractCandidate

# Function: extractCandidate()

```ts
function extractCandidate(turn, tier): 
  | {
  raw: unknown;
}
  | undefined;
```

Defined in: `packages/core/dist/index.d.ts`

Extracts the structured-output candidate from a collected turn per tier.
Returns `undefined` when the turn carries no candidate (for example the
model answered prose without the forced tool call).

## Parameters

| Parameter | Type |
| ------ | ------ |
| `turn` | [`CollectedTurn`](/api/@rulvar/rulvar/interfaces/CollectedTurn.md) |
| `tier` | [`StructuredOutputTier`](/api/@rulvar/rulvar/type-aliases/StructuredOutputTier.md) |

## Returns

  \| \{
  `raw`: `unknown`;
\}
  \| `undefined`

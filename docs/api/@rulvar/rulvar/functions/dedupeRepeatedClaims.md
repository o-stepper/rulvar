[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / dedupeRepeatedClaims

# Function: dedupeRepeatedClaims()

```ts
function dedupeRepeatedClaims(rows): DedupedClaims;
```

Defined in: `packages/core/dist/index.d.ts`

Removes later occurrences of repeated claim lines across the rows and
indexes each repeated claim with its reporters. Deterministic: output
depends only on the input order and bytes.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `rows` | \{ `nodeId`: `string`; `text`: `string`; \}[] |

## Returns

[`DedupedClaims`](/api/@rulvar/rulvar/interfaces/DedupedClaims.md)

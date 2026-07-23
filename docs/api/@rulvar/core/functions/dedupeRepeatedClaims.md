[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / dedupeRepeatedClaims

# Function: dedupeRepeatedClaims()

```ts
function dedupeRepeatedClaims(rows): DedupedClaims;
```

Defined in: [packages/core/src/orchestrator/claims.ts:42](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/claims.ts#L42)

Removes later occurrences of repeated claim lines across the rows and
indexes each repeated claim with its reporters. Deterministic: output
depends only on the input order and bytes.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `rows` | \{ `nodeId`: `string`; `text`: `string`; \}[] |

## Returns

[`DedupedClaims`](/api/@rulvar/core/interfaces/DedupedClaims.md)

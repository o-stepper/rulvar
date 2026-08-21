[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / canonicalClaimMap

# Function: canonicalClaimMap()

```ts
function canonicalClaimMap(rows): ClaimMapRow[];
```

Defined in: `packages/core/dist/index.d.ts`

The canonical form of an accepted map (RV4305): rows sorted by id
(a stable, content-independent order), serialized by the JCS recipe
every other canonical byte surface in this codebase uses. The
journal decision records this form, and the hash names it.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `rows` | readonly [`ClaimMapRow`](/api/@rulvar/rulvar/interfaces/ClaimMapRow.md)[] |

## Returns

[`ClaimMapRow`](/api/@rulvar/rulvar/interfaces/ClaimMapRow.md)[]

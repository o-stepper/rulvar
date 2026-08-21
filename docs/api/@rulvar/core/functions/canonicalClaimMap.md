[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / canonicalClaimMap

# Function: canonicalClaimMap()

```ts
function canonicalClaimMap(rows): ClaimMapRow[];
```

Defined in: [packages/core/src/orchestrator/claim-map.ts:264](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/claim-map.ts#L264)

The canonical form of an accepted map (RV4305): rows sorted by id
(a stable, content-independent order), serialized by the JCS recipe
every other canonical byte surface in this codebase uses. The
journal decision records this form, and the hash names it.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `rows` | readonly [`ClaimMapRow`](/api/@rulvar/core/interfaces/ClaimMapRow.md)[] |

## Returns

[`ClaimMapRow`](/api/@rulvar/core/interfaces/ClaimMapRow.md)[]

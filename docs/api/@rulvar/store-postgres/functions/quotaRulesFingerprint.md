[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/store-postgres](/api/@rulvar/store-postgres/index.md) / quotaRulesFingerprint

# Function: quotaRulesFingerprint()

```ts
function quotaRulesFingerprint(rules): string;
```

Defined in: [packages/store-postgres/src/quota.ts:152](https://github.com/o-stepper/rulvar/blob/main/packages/store-postgres/src/quota.ts#L152)

The canonical fingerprint of one rule SET (RV506): sha256 hex over
the sorted canonical rule keys. Order-insensitive on purpose,
matching bucket semantics (equal rules land on the same bucket
regardless of array position), so reordering a config never reads as
a rules change. Exported so a deployment can precompute the value it
expects a schema to have recorded.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `rules` | readonly [`QuotaRule`](/api/@rulvar/rulvar/interfaces/QuotaRule.md)[] |

## Returns

`string`

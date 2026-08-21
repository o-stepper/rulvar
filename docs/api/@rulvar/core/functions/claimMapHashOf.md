[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / claimMapHashOf

# Function: claimMapHashOf()

```ts
function claimMapHashOf(rows): string;
```

Defined in: [packages/core/src/orchestrator/claim-map.ts:269](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/orchestrator/claim-map.ts#L269)

sha256 over the JCS bytes of the canonical map.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `rows` | readonly [`ClaimMapRow`](/api/@rulvar/core/interfaces/ClaimMapRow.md)[] |

## Returns

`string`

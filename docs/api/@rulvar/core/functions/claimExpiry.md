[**Rulvar API reference**](../../../index.md)

***

[Rulvar API reference](/api/index.md) / [@rulvar/core](/api/@rulvar/core/index.md) / claimExpiry

# Function: claimExpiry()

```ts
function claimExpiry(
   claimClass, 
   polarity, 
   observedAt): string;
```

Defined in: [packages/core/src/knowledge/decay.ts:27](https://github.com/o-stepper/rulvar/blob/main/packages/core/src/knowledge/decay.ts#L27)

The asymmetric TTL applied to an observedAt ISO date.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `claimClass` | [`ClaimClass`](/api/@rulvar/core/type-aliases/ClaimClass.md) |
| `polarity` | `"strength"` \| `"weakness"` |
| `observedAt` | `string` |

## Returns

`string`

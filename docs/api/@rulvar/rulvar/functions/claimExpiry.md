[**rulvar API reference**](../../../index.md)

***

[rulvar API reference](/api/index.md) / [@rulvar/rulvar](/api/@rulvar/rulvar/index.md) / claimExpiry

# Function: claimExpiry()

```ts
function claimExpiry(
   claimClass, 
   polarity, 
   observedAt): string;
```

Defined in: [packages/core/dist/index.d.ts](https://github.com/o-stepper/rulvar/blob/main/../../core/dist/index.d.ts)

The docs/05 TTL applied to an observedAt ISO date.

## Parameters

| Parameter | Type |
| ------ | ------ |
| `claimClass` | [`ClaimClass`](/api/@rulvar/rulvar/type-aliases/ClaimClass.md) |
| `polarity` | `"strength"` \| `"weakness"` |
| `observedAt` | `string` |

## Returns

`string`
